import { Suspense, useEffect, useMemo, useState } from "react";
import { Scene } from "./scene/Scene";
import { CardPack } from "./scene/CardPack";
import { QuestReveal } from "./scene/QuestReveal";
import { AcceptFlourish } from "./scene/AcceptFlourish";
import { TrashCan } from "./scene/TrashCan";
import { CrumpleBall } from "./scene/CrumpleBall";
import { AcceptOverlay } from "./hud/AcceptOverlay";
import { IconTray } from "./hud/IconTray";
import { AdminPanel } from "./hud/AdminPanel";
import { HallOfFrame } from "./pages/HallOfFrame";
import { useAppStore } from "./state/store";
import { useKeyboardShortcuts } from "./dev/useKeyboardShortcuts";
import { useAutoAdvance } from "./scene/useAutoAdvance";

export default function App() {
  const init = useAppStore((s) => s.init);
  const phase = useAppStore((s) => s.phase);
  const poolLoaded = useAppStore((s) => s.poolLoaded);
  const spin = useAppStore((s) => s.spin);
  const throwHit = useAppStore((s) => s.throwHit);

  const [adminOpen, setAdminOpen] = useState(false);

  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const adminFlag = params.get("admin") === "1";
  const debugFlag = params.get("debug") === "1";

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (adminFlag) setAdminOpen(true);
  }, [adminFlag]);

  useKeyboardShortcuts();
  useAutoAdvance();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Scene debug={debugFlag}>
        <Suspense fallback={null}>
          <CardPack />
        </Suspense>
        <AcceptFlourish />
        <QuestReveal />
        <TrashCan />
        <CrumpleBall />
      </Scene>
      <AcceptOverlay />
      <HallOfFrame />
      <IconTray onOpenAdmin={() => setAdminOpen(true)} forceVisible={adminFlag} />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
      <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
        {phase}
        {phase === "spin" && (
          <span className="ml-2 text-neutral-500">
            {spin.direction} {spin.speed.toFixed(2)}
          </span>
        )}
        {phase === "throw" && throwHit !== null && (
          <span className="ml-2 text-neutral-500">{throwHit ? "hit" : "miss"}</span>
        )}
        {!poolLoaded && <span className="ml-2 text-neutral-500">loading</span>}
      </div>
      <DevHints />
    </div>
  );
}

function DevHints() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 max-w-md rounded bg-black/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-neutral-400">
      <div className="mb-1 uppercase tracking-widest text-neutral-500">dev keys</div>
      <div>w wake · s spin cw · a spin ccw · ± speed · enter select</div>
      <div>c cut · y accept · n reject · t throw · r reset · h hall</div>
      <div>⌘⇧P cycle sashiko pattern</div>
    </div>
  );
}
