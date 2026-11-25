import { http } from "../../shared/http";
import type { User } from "./types";
export const csrf = () => http<{ csrf_token: string }>("/csrf");
export const me = () => http<{ user: User }>("/me");
export const login = (email: string, password: string, token: string) =>
  http<{ user: User; csrf_token: string }>("/session", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { "X-CSRF-Token": token },
  });
export const logout = (token: string) =>
  http<{ csrf_token: string }>("/session", {
    method: "DELETE",
    headers: { "X-CSRF-Token": token },
  });

export const register = (
  email: string,
  password: string,
  passwordConfirmation: string,
  token: string,
) =>
  http<{ user: User; csrf_token: string }>("/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
    headers: { "X-CSRF-Token": token },
  });
