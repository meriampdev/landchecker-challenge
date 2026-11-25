import { useState, type FormEvent } from "react";
import { useAuth } from "../AuthProvider";
import styles from "./LoginForm.module.css";
export function LoginForm({
  createAccount = false,
}: {
  createAccount?: boolean;
}) {
  const auth = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      if (createAccount) await auth.register(email, password, confirmation);
      else await auth.login(email, password);
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <h2>
        {createAccount ? "Create your account" : "Log in to save properties"}
      </h2>
      <label>
        Email
        <input
          autoComplete="username"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          autoComplete={createAccount ? "new-password" : "current-password"}
          minLength={createAccount ? 8 : undefined}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {createAccount && (
        <label>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
      )}
      <button disabled={pending || !auth.ready}>
        {pending
          ? createAccount
            ? "Creating account…"
            : "Logging in…"
          : createAccount
            ? "Create account"
            : "Log in"}
      </button>
      <a
        href={`#/${createAccount ? "login" : "register"}${window.location.hash.includes("?") ? "?" + window.location.hash.split("?")[1] : ""}`}
      >
        {createAccount
          ? "Already have an account? Log in"
          : "Create an account"}
      </a>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
