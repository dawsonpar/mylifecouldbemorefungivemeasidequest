import { useEffect } from "react";
import { Scene } from "./scene/Scene";
import { useAppStore } from "./state/store";

export default function App() {
  const init = useAppStore((s) => s.init);
  const phase = useAppStore((s) => s.phase);
  const poolLoaded = useAppStore((s) => s.poolLoaded);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Scene />
      <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
        {phase} {poolLoaded ? "" : "· loading"}
      </div>
    </div>
  );
}
