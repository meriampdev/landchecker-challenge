import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../shared/http";
import * as api from "./api";
import type { User } from "./types";
type Auth = {
  user: User | null;
  ready: boolean;
  error: string;
  generation: number;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    confirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  mutate: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
  refresh: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [generation, setGeneration] = useState(0);
  const token = useRef(""),
    epoch = useRef(0);
  function clear() {
    epoch.current++;
    setGeneration(epoch.current);
    setUser(null);
    void client.cancelQueries({ queryKey: ["watchlist"] });
    client.removeQueries({ queryKey: ["watchlist"] });
  }
  async function refresh() {
    const current = epoch.current;
    try {
      const result = await api.me();
      if (current === epoch.current) setUser(result.user);
    } catch (e) {
      if (current !== epoch.current) return;
      if (e instanceof ApiError && e.status === 401) clear();
      else throw e;
    }
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        token.current = (await api.csrf()).csrf_token;
        if (active) await refresh();
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function mutate<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const current = epoch.current;
    try {
      const result = await fn(token.current);
      if (current !== epoch.current)
        throw new Error("Session changed. Please retry.");
      return result;
    } catch (e) {
      if (current === epoch.current && e instanceof ApiError) {
        if (e.status === 401) clear();
        if (e.status === 403) token.current = (await api.csrf()).csrf_token;
      }
      throw e;
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        ready,
        error,
        generation,
        refresh,
        mutate,
        login: async (email, password) => {
          const result = await mutate((t) => api.login(email, password, t));
          clear();
          token.current = result.csrf_token;
          setUser(result.user);
          setError("");
        },
        register: async (email, password, confirmation) => {
          const result = await mutate((t) =>
            api.register(email, password, confirmation, t),
          );
          clear();
          token.current = result.csrf_token;
          setUser(result.user);
          setError("");
        },
        logout: async () => {
          const result = await mutate(api.logout);
          clear();
          token.current = result.csrf_token;
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error("AuthProvider required");
  return auth;
}
