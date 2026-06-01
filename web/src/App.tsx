import { useEffect, useState, type ReactElement } from "react";

import { getHello } from "./api";
import { Button } from "./components/atoms";

/**
 * Phase 1 shell — proves the frontend builds and can reach the Rust API.
 * Real pages and the Atomic Design component library land in Phase 6.
 */
export default function App(): ReactElement {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    getHello()
      .then((m) => {
        setMessage(m);
      })
      .catch(() => {
        setMessage("(backend not reachable yet)");
      });
  }, []);

  return (
    <main>
      <h1>Sports Social</h1>
      <p>{message || "loading…"}</p>
      <Button
        onClick={() => {
          window.location.reload();
        }}
      >
        Refresh
      </Button>
    </main>
  );
}
