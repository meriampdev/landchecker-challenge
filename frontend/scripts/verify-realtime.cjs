// Runs against Compose through the same HTTP/WebSocket proxy as the browser.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const WebSocket = require("ws");
const base = process.env.APP_URL || "http://localhost:5173";
// Inspect labels because older Compose versions ignore the service filter on `ps -q`.
function findBackend() {
  const ids = execFileSync("docker", ["compose", "ps", "-q"], {
    encoding: "utf8",
  }).trim().split(/\s+/).filter(Boolean);
  return ids.find((id) =>
    execFileSync("docker", [
      "inspect", "--format",
      '{{ index .Config.Labels "com.docker.compose.service" }}', id,
    ], { encoding: "utf8" }).trim() === "backend"
  );
}
const backend = process.env.BACKEND_CONTAINER || findBackend();
assert(backend, "Start Compose before running this check");
const sockets = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(test, message) {
  const deadline = Date.now() + 15000;
  while (!test()) {
    if (Date.now() > deadline) throw new Error(message);
    await pause(40);
  }
}
function runner(code) {
  return execFileSync(
    "docker",
    ["exec", backend, "bin/rails", "runner", code],
    { encoding: "utf8", timeout: 60000 },
  ).trim();
}
function client() {
  return {
    cookie: "",
    token: "",
    async request(path, method = "GET", body) {
      const res = await fetch(`${base}/api/v1${path}`, {
        method,
        headers: {
          Cookie: this.cookie,
          Origin: base,
          "Content-Type": "application/json",
          "X-CSRF-Token": this.token,
        },
        body: body && JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      const cookie = res.headers
        .getSetCookie()
        .find((value) => value.startsWith("_landchecker_session="));
      if (cookie) this.cookie = cookie.split(";")[0];
      const data = res.status === 204 ? null : await res.json();
      assert(
        res.ok,
        `${method} ${path}: ${res.status} ${JSON.stringify(data)}`,
      );
      if (data?.csrf_token) this.token = data.csrf_token;
      return data;
    },
  };
}
async function login(email) {
  const user = client();
  await user.request("/csrf");
  await user.request("/session", "POST", {
    email,
    password: "DemoPassword123!",
  });
  return user;
}
function connect(user, params = {}) {
  const events = [];
  const ws = new WebSocket(
    base.replace("http", "ws") + "/cable",
    ["actioncable-v1-json"],
    {
      headers: { Cookie: user.cookie, Origin: base },
    },
  );
  sockets.push(ws);
  let confirmed = false,
    rejected = false,
    closed = false;
  ws.on("error", () => {
    rejected = true;
  });
  ws.on("close", () => {
    closed = true;
  });
  ws.on("message", (raw) => {
    const data = JSON.parse(raw);
    if (data.type === "welcome")
      ws.send(
        JSON.stringify({
          command: "subscribe",
          identifier: JSON.stringify({
            channel: "WatchlistChannel",
            ...params,
          }),
        }),
      );
    if (data.type === "confirm_subscription") confirmed = true;
    if (data.type === "reject_subscription") rejected = true;
    if (data.message?.type === "property.updated")
      events.push(data.message.property);
  });
  return {
    ws,
    events,
    get confirmed() {
      return confirmed;
    },
    get rejected() {
      return rejected;
    },
    get closed() {
      return closed;
    },
  };
}
(async () => {
  const alex = await login("alex@example.com"),
    sam = await login("sam@example.com");
  const property = (await alex.request("/properties")).properties[0];
  const id = property.id;
  const originalAlex = (await alex.request("/watchlist")).saved_ids.includes(
    id,
  );
  const originalSam = (await sam.request("/watchlist")).saved_ids.includes(id);
  try {
    await alex.request(`/watchlist/${id}`, "PUT");
    await sam.request(`/watchlist/${id}`, "PUT");
    const a = connect(alex),
      b = connect(sam),
      anonymous = connect(client()),
      forbidden = connect(alex, { user_id: 999 });
    await until(
      () => a.confirmed && b.confirmed,
      "Authenticated subscriptions not confirmed",
    );
    await until(
      () => anonymous.closed && forbidden.rejected,
      "Unauthorized connection/subscription accepted",
    );
    runner(
      `Property.find(${id}).update!(price_cents: ${property.price_cents + 100000}, status: 'under_offer')`,
    );
    await until(
      () => a.events.length === 1 && b.events.length === 1,
      "Separate-process PostgreSQL broadcast did not reach both users",
    );
    assert.equal(a.events[0].price_cents, property.price_cents + 100000);
    await sam.request(`/watchlist/${id}`, "DELETE");
    const a2 = connect(alex);
    await until(
      () => a2.confirmed,
      "Second authorized watch connection not confirmed",
    );
    a.ws.close();
    runner(
      `Property.find(${id}).update!(price_cents: ${property.price_cents + 200000}, status: 'sold')`,
    );
    await until(
      () => a2.events.length === 1,
      "Remaining authorized connection lost updates",
    );
    await pause(500);
    assert.equal(
      b.events.length,
      1,
      "Removed watcher received a subsequent update",
    );
    a2.ws.close();
    runner(
      `Property.find(${id}).update!(price_cents: ${property.price_cents + 300000})`,
    );
    const reconnected = connect(alex);
    await until(() => reconnected.confirmed, "Reconnect failed");
    const current = (await alex.request("/watchlist")).properties.find(
      (p) => p.id === id,
    );
    assert.equal(
      current.price_cents,
      property.price_cents + 300000,
      "Reconnect reconciliation failed",
    );
    await alex.request("/session", "DELETE");
    await until(
      () => reconnected.closed,
      "Logout did not close active cable connection",
    );
    const loggedOut = connect(alex);
    await until(() => loggedOut.closed, "Logged-out cookie accepted");
    const expiryCookie = runner(
      `request = ActionDispatch::Request.new(Rails.application.env_config.merge(Rack::MockRequest.env_for('http://localhost:5173'))); jar = ActionDispatch::Cookies::CookieJar.build(request, {}); key = Rails.application.config.session_options[:key]; jar.encrypted[key] = { value: { user_id: User.find_by!(email: 'sam@example.com').id, expires_at: 8.seconds.from_now.to_i } }; puts "#{key}=#{CGI.escape(jar[key])}"`,
    );
    const expiring = connect({ cookie: expiryCookie });
    await until(
      () => expiring.confirmed,
      "Short-lived authenticated session rejected",
    );
    await until(
      () => expiring.closed,
      "Expired session did not close active cable connection",
    );
    const expired = connect({ cookie: expiryCookie });
    await until(() => expired.closed, "Expired session reconnected");
    console.log(
      "PASS: two-user cross-process delivery, watch removal, remaining connection, anonymous/unauthorized rejection, disconnect/reconnect reconciliation logout and session expiry.",
    );
  } finally {
    sockets.forEach((ws) => ws.terminate());
    runner(
      `p = Property.find(${id}); p.update!(price_cents: ${property.price_cents}, status: '${property.status}'); u = User.find_by!(email: 'alex@example.com'); ${originalAlex ? "u.watchlist_entries.find_or_create_by!(property: p)" : "u.watchlist_entries.where(property: p).delete_all"}; u = User.find_by!(email: 'sam@example.com'); ${originalSam ? "u.watchlist_entries.find_or_create_by!(property: p)" : "u.watchlist_entries.where(property: p).delete_all"}`,
    );
  }
})().catch((error) => {
  sockets.forEach((ws) => ws.terminate());
  console.error(error);
  process.exitCode = 1;
});
