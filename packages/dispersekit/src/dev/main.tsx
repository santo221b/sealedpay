import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import "../styles.css";
import { DisperseWidget } from "../DisperseWidget";
import { StatesGallery } from "./StatesGallery";
import { TestBench } from "./TestBench";

const TABS = { widget: "Widget", states: "States", bench: "Test bench" } as const;

/** Widget playground: the real component front and center, a fixture gallery
 * of every state, and the Phase C test bench as a manual integration harness. */
function Playground() {
  const [tab, setTab] = useState<keyof typeof TABS>("widget");
  return (
    <div className="min-h-screen bg-[#f6efe6]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-bold text-neutral-800">DisperseKit playground</h1>
          <div className="flex gap-1 rounded-full bg-white p-1 text-xs shadow-sm">
            {(Object.keys(TABS) as (keyof typeof TABS)[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 font-medium ${tab === t ? "bg-orange-500 text-white" : "text-neutral-500"}`}
              >
                {TABS[t]}
              </button>
            ))}
          </div>
        </div>
        {tab === "widget" && (
          <div className="flex justify-center">
            <DisperseWidget onDispersed={(r) => console.log("onDispersed", r)} />
          </div>
        )}
        {tab === "states" && <StatesGallery />}
        {tab === "bench" && <TestBench />}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);
