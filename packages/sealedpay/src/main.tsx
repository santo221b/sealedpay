import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { App } from "./App";
import { enforceSessionEpoch, watchSessionEpoch } from "./lib/sessionEpoch";

// Stale-state gate BEFORE anything renders: browsers carrying state from an
// older release are signed out onto a clean slate (see lib/sessionEpoch.ts).
enforceSessionEpoch();
watchSessionEpoch();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
