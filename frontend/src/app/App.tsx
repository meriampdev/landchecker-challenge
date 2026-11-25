import { useEffect, useState } from "react";
import { LoginForm, useAuth } from "../features/auth";
import { PropertyDetail } from "../features/properties/PropertyDetail";
import { PropertyList } from "../features/properties";
import { SaveButton, WatchlistPage, ResumeSave } from "../features/watchlist";
import {
  navigate,
  requireLogin,
  safeReturn,
  useRoute,
  useBrowseRoute,
} from "../shared/navigation";
import { LiveUpdates } from "./LiveUpdates";
export function App() {
  const auth = useAuth();
  const route = useRoute();
  const browseRoute = useBrowseRoute(route);
  const [path, search = ""] = route.split("?");
  const isAuthPage = path === "/login" || path === "/register";
  const detailMatch = /^\/properties\/([1-9][0-9]{0,14})$/.exec(path);
  const params = new URLSearchParams(search);
  const rawId = params.get("save") ?? "";
  const saveId = /^[1-9][0-9]{0,14}$/.test(rawId) ? Number(rawId) : null;
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (auth.ready && !auth.user && path === "/watchlist") requireLogin();
  }, [auth.ready, auth.user, path]);
  useEffect(() => {
    document.title = `${path === "/register" ? "Create account" : detailMatch ? "Listing details" : path === "/login" ? "Log in" : path === "/watchlist" ? "Watchlist" : "Explore homes"} · Landchecker`;
    document.getElementById("main")?.focus();
  }, [path]);
  async function logout() {
    setPending(true);
    setError("");
    try {
      await auth.logout();
      navigate(browseRoute);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a href={`#${browseRoute}`} className="brand">
          <span className="brand-mark" aria-hidden="true">
            ⌂
          </span>
          Landchecker<span className="brand-suffix"> / homes</span>
        </a>
        <nav aria-label="Main">
          <a
            href={`#${browseRoute}`}
            aria-current={path === "/browse" ? "page" : undefined}
          >
            Explore homes
          </a>
          <a
            href={auth.user ? "#/watchlist" : "#/login?returnTo=%2Fwatchlist"}
            aria-current={path === "/watchlist" ? "page" : undefined}
          >
            ♡ Watchlist
          </a>
          {auth.ready &&
            (auth.user ? (
              <button disabled={pending} onClick={() => void logout()}>
                {pending ? "Logging out…" : "Log out"}
              </button>
            ) : (
              <a
                className="login-link"
                href={`#/login?${new URLSearchParams({ returnTo: safeReturn(route) })}`}
              >
                Log in
              </a>
            ))}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {auth.error && (
          <p role="alert">
            {auth.error}{" "}
            <button onClick={() => window.location.reload()}>
              Retry connection
            </button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {!auth.ready && <p role="status">Checking session…</p>}
        {auth.user && (
          <>
            <p className="account">Signed in as {auth.user.email}</p>
            <LiveUpdates key={`${auth.user.id}-${auth.generation}`} />
          </>
        )}
        <div hidden={isAuthPage || path === "/watchlist" || !!detailMatch}>
          <PropertyList action={(p) => <SaveButton id={p.id} />} />
        </div>
        {detailMatch && (
          <PropertyDetail
            key={path}
            id={Number(detailMatch[1])}
            action={(p) => <SaveButton id={p.id} />}
          />
        )}
        {isAuthPage && (
          <section className="login-page">
            <div>
              <p className="eyebrow">YOUR NEXT CHAPTER</p>
              <h1>
                A place to
                <br />
                call <em>your own.</em>
              </h1>
              <p>
                Keep the homes you love close. Log in to build your personal
                shortlist and follow live property updates.
              </p>
            </div>
            <div>
              {!auth.user ? (
                <LoginForm key={path} createAccount={path === "/register"} />
              ) : (
                <ResumeSave
                  key={route}
                  id={saveId}
                  destination={safeReturn(params.get("returnTo"))}
                />
              )}
            </div>
          </section>
        )}
        {path === "/watchlist" && auth.user && <WatchlistPage />}
      </main>
      <footer>
        <a href={`#${browseRoute}`} className="brand">
          Landchecker
        </a>
        <p>Exceptional homes, thoughtfully found.</p>
        <span>Australian homes · Prices in AUD</span>
      </footer>
    </>
  );
}
