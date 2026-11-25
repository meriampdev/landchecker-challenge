import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { changeWatch } from "./api";
import { watchKey } from "./queries";
import { navigate } from "../../shared/navigation";

export function ResumeSave({
  id,
  destination,
}: {
  id: number | null;
  destination: string;
}) {
  const auth = useAuth();
  const client = useQueryClient();
  const started = useRef(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!auth.user || started.current) return;
    started.current = true;
    const userId = auth.user.id;
    void (async () => {
      try {
        // PUT ensures membership, even if already saved; never replay a toggle.
        if (id) await auth.mutate((token) => changeWatch(id, false, token));
        await client.invalidateQueries({ queryKey: watchKey(userId) });
        navigate(destination, true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth, client, id, destination, attempt]);
  return error ? (
    <div role="alert">
      {error}{" "}
      <button
        onClick={() => {
          started.current = false;
          setError("");
          setAttempt(attempt + 1);
        }}
      >
        Retry saving
      </button>
      <button onClick={() => navigate(destination, true)}>
        Continue without saving
      </button>
    </div>
  ) : (
    <p role="status">{id ? "Saving your home…" : "Returning to your page…"}</p>
  );
}
