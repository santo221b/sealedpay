import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../styles.css";
import { TestBench } from "./TestBench";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TestBench />
  </StrictMode>,
);
