# PRD: My life could be more fun, give me a side quest

**Status:** Draft
**Author:** Dawson Par (dawpar7@gmail.com)
**Date:** 2026-05-07
**Intended implementer:** Claude Code session
**Repo:** `/Users/dawsonpar/dp/mylifecouldbemorefungivemeasidequest`

---

## 1. Summary

A browser-based side-quest randomizer where quests are represented as a pack
of cards and the user controls every interaction with hand gestures via the
MacBook webcam. The app is the bio-link surface for the @dp.mp4 Side Quest
content pillar (see `~/dp/notes/mindboard/dpmp4/side-quest-pillar.md`) and an
open-source artifact that anyone can clone and run with their own quests.
Filmability is a first-class concern: the app must read clearly when shot
vertical 9:16 by a phone aimed at the laptop.

## 2. Context (Concise)

- **Product:** Hand-gesture-driven side-quest card-pack experience, single-page web app.
- **Users / ICP:**
  1. Primary: Dawson, on camera, filming Side Quest reels for @dp.mp4.
  2. Secondary: open-source clones (any platform with a webcam-equipped browser) who add their own quests.
- **Stage:** Greenfield. v1 / MVP.
- **Constraints:**
  - No backend, no API keys at runtime, no telemetry, no analytics.
  - All processing on-device. Webcam frames must never leave the browser.
  - Pre-launch reel ships week of 2026-05-11. Bio-link cutover from Set Optics happens after the Set Optics code-release reel (target week of 2026-05-11). The deployed v1 must exist by 2026-05-15 to make the launch reel slot.
  - London trip 2026-05-25 to 2026-05-31. Anything not shipped before then ships from London or after.
- **Non-goals:**
  - Mobile or phone use. Desktop browser only.
  - AI evidence review for quest completion.
  - XP, leaderboard, ranking, social, multi-user.
  - Backend of any kind, including a hosted moderation pipeline for community quests.
  - Account sync across devices.

## 3. Core Loop and Flows (Logical)

### Primary on-camera loop (six states)

| # | State | Visual behavior |
|---|---|---|
| 1 | Idle | N cards laying flat in a row at the bottom of frame |
| 2 | Wake | Cards rise up and gather into a circular cluster center-frame |
| 3 | Spin | Cluster rotates. Direction tracks the user's gesture (cw or ccw). Spin speed loosely tracks gesture speed |
| 4 | Select | Spin halts, one card rises to front, others drop and fade out. Lone card sits center with a "ready to cut" cue |
| 5 | Open pack | Cut gesture slices the top horizontally. An inner card slides out and lands face-up with the quest face revealed automatically |
| 6 | Accept or Reject | User commits via gesture. Accept and reject paths run divergent animations, both end at state 1 |

Default `N = 7` cards in state 1. Tunable via config. `N` must equal the number of cards visible during state 3 spin.

### Accept path (state 6 → 1)

- Green-themed flourish on the revealed card.
- Random message sampled from `messages.json` shown as overlay (e.g. "side quest accepted", "good luck out there").
- Quest is appended to localStorage `acceptedQuests[]` with `acceptedAt` and `completedAt: null`.
- Card animates off-screen, scene resets to state 1.

### Reject path (state 6 → 1)

- Thumbs-down fires the `reject` event; card crumples into a ball (vertex shader displacement or pre-baked animation, implementer's call).
- Trash can prop appears mid-animation as a one-shot.
- User's basketball-shot release fires the `throw` event; the crumpled ball arcs toward the trash can.
- **Hit probability: 80% lands in the can, 20% bounces off the rim and misses.** Coin-flipped with `Math.random()` at the moment `throw` fires. Pre-bake two end-state animations (in-the-can vs rim-bounce-and-miss) and select on the coin flip. Both end states return to phase 1 after the same beat duration.
- Trash can disappears, scene resets to state 1.
- Quest id added to localStorage `rejectedQuests[]` and is filtered from the spin pool for the rest of the session.

### No re-roll

Once at state 6 the user must commit. Reject means the quest is gone for this session. There is no "spin again" path inside one bit.

### Hall of Frame (secondary view)

A separate page accessed via toggle. Museum / art-gallery style: each accepted quest displayed as a framed piece. Completion status visible (e.g. unframed-and-spotlit vs framed-and-stamped-COMPLETED). Mark-completed is a click action, not a gesture (off-camera utility). Rejected quests are never shown.

### Dependencies

- `react`, `react-dom`
- `three` (r184)
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/postprocessing`
- `@mediapipe/tasks-vision`
- `zustand`
- `tailwindcss` (v4)
- `vite`, `typescript`

No runtime services. No external APIs.

## 4. Data Model (Logical)

### Quest

```ts
type Quest = {
  id: string;             // stable slug, e.g. "leather-1"
  title: string;          // required, on-card headline
  description: string;    // required, body copy on the card face
  requirements?: string;  // optional, surfaced as a separate block when present
};
```

### AcceptedQuest (localStorage)

```ts
type AcceptedQuest = {
  questId: string;
  acceptedAt: string;     // ISO timestamp
  completedAt: string | null;
};
```

### RejectedQuest (localStorage, session scope)

```ts
type RejectedQuest = {
  questId: string;
  rejectedAt: string;     // ISO timestamp
};
```

### Acceptance message

`messages.json` is a flat array of strings sampled at random per accept. Editable freely.

```json
["side quest accepted", "good luck out there", "the wheel has spoken"]
```

### Pool resolution order (runtime)

1. `quests.json` if present (gitignored, the user's real pool baked into the deployed bio-link build).
2. Else `quests.example.json` (committed sample pool).
3. localStorage additions merged on top of (1) or (2).

The hosted bio-link version ships with `quests.json` baked in. The repo only contains `quests.example.json`. Anyone cloning sees the example pool plus their own localStorage additions.

The narrative is "50 quests"; the implementation pool is whatever the user has curated. Storytelling and implementation are deliberately decoupled here.

## 5. Tech Stack and Architecture (Explicit)

- **Frontend:** React 18, TypeScript, Vite.
- **3D scene:** Three.js r184 via React Three Fiber, WebGPU renderer (production-ready since r171, fully supported in Safari 26 and current Chromium / Firefox).
- **Effects:** `@react-three/postprocessing` for bloom and chromatic aberration on reveal beats. Optional: `@react-three/drei` helpers for orthographic camera, plane geometry, useTexture.
- **Hand tracking:** `@mediapipe/tasks-vision` (HandLandmarker), running entirely in WebAssembly on-device. Targets 21 landmarks per hand, 25 to 30 fps.
- **State:** Zustand store, single source of truth for the state machine and persisted slices (accepted, rejected).
- **HUD overlay:** Tailwind v4. 2D layer above the WebGL canvas for quest title text on reveal, accept-message overlay, Hall of Frame, admin overlay.
- **Persistence:** localStorage only. No IndexedDB unless the implementer hits a quota issue.
- **Hosting:** Vercel. Static build, no server functions.

### Architecture sketch

```
Browser
├── <video> (hidden) ─ getUserMedia stream
│        │
│        ▼
│   MediaPipe HandLandmarker (WASM)
│        │ landmark stream @ 30fps
│        ▼
│   Gesture detector (state-machine-aware,
│   debounced, emits discrete events)
│        │ events
│        ▼
│   Zustand store (machine state + persisted slices)
│        │ subscriptions
│        ▼
├── R3F <Canvas> (WebGPU)
│   ├── Background plane (live <video> texture)
│   ├── Card meshes (cluster, spin, select, cut, reveal, crumple)
│   ├── Trash can prop (conditional)
│   └── Postprocessing (bloom, chroma)
└── Tailwind HUD
    ├── Quest text overlay
    ├── Accept message overlay
    ├── Hall of Frame route
    └── Admin overlay (gated by ?admin=1)
```

## 6. API / Interface Design (Explicit)

No HTTP API. Interfaces are internal module contracts.

### Gesture detector

```ts
type GestureEvent =
  | { kind: "wake" }
  | { kind: "spin"; direction: "cw" | "ccw"; speed: number }   // speed 0..1
  | { kind: "stopSelect" }
  | { kind: "cut" }
  | { kind: "accept" }
  | { kind: "reject" }                                          // fires crumple
  | { kind: "throw"; velocity: number };                        // fires ball arc

type GestureDetector = {
  start(stream: MediaStream): Promise<void>;
  stop(): void;
  onEvent(handler: (e: GestureEvent) => void): () => void;     // returns unsub
};
```

The detector is the only place that knows about MediaPipe landmarks. The
rest of the app sees `GestureEvent` only.

### Gesture vocabulary (TBD — slots to fill)

The gesture-to-action mapping is **deliberately not decided in this PRD**. It will be specified in a follow-up conversation, then this section will be replaced with a locked table and the detector will be implemented in milestone 8.

Until then, the implementing session MUST NOT invent gestures. The full set of slots that the next conversation must fill is below. Each slot needs: (a) the pose, (b) the trigger condition (held duration, threshold, motion), (c) the state-machine guard (which phase it is valid in), and (d) any debounce or refractory rules.

| Event slot | What it must do | State-machine guard |
|---|---|---|
| `wake` | Transition phase `idle` → `wake` (cards rise into the cluster). | Only valid in `idle`. |
| `spin` | Continuously update `spin.direction` (`cw` / `ccw`) and `spin.speed` (0..1) while held. | Only valid in `wake` and `spin`. |
| `stopSelect` | Discrete event that ends the spin and transitions `spin` → `select`. | Only valid in `spin`. |
| `cut` | Discrete event that opens the pack and transitions `select` → `openPack`. | Only valid in `select`. |
| `accept` | Discrete event for the green-flourish accept path. Transitions `openPack` → `accept` → `idle`. | Only valid in `openPack`. |
| `reject` | Discrete event that fires the crumple animation. Transitions `openPack` → `reject`. | Only valid in `openPack`. |
| `throw` | Discrete event with a `velocity` magnitude that fires the basketball-arc throw toward the trash can. Transitions `reject` → `throw` → `idle`. | Only valid in `reject` once crumple has finished, with a refractory window. |

Cross-cutting requirements the chosen vocabulary MUST satisfy:

- Each gesture is filmable. It has to read clearly in a vertical 9:16 phone capture of the laptop screen and not be visually ambiguous with adjacent gestures.
- Each gesture has a stability rule (held duration or hysteresis) so a single noisy frame does not fire it.
- The detector is state-aware: events are dropped when their guard does not match the current phase.
- Continuous events (`spin`) and discrete events (everything else) are clearly distinguished, so the store knows whether to update or transition.

Until the vocabulary is supplied, all gesture events MUST be triggerable from debug keyboard shortcuts only (see milestone 8). The rest of the architecture (state machine, store, scene, accept/reject paths) is independent of which gesture maps to which slot, and can be built end-to-end without the vocabulary being decided.

### Off-camera utilities (icons, not gestures)

Two icons sit in the bottom-right corner of the HUD, outside the 9:16 phone-crop safe area:

- **Hall of Frame icon** — toggles the museum view.
- **Admin / Override icon** — opens the admin overlay (add quest, export, clear-local, reset-session, **and a "force next quest" picker** which absorbs the console-override role).

Both are clickable, no gestures needed. The icon tray auto-hides when the mouse hasn't moved for 3 seconds (so it disappears during filming) and reappears on any mouse motion. `?admin=1` URL param remains as a developer convenience and unhides the tray.

### State store (Zustand, sketch)

```ts
type AppState = {
  phase: "idle" | "wake" | "spin" | "select" | "openPack" | "accept" | "reject" | "collection";
  spin: { direction: "cw" | "ccw"; speed: number };
  pool: Quest[];
  currentQuest: Quest | null;
  accepted: AcceptedQuest[];
  rejected: RejectedQuest[];
  // actions
  wake(): void;
  startSpin(direction: "cw" | "ccw", speed: number): void;
  updateSpin(direction: "cw" | "ccw", speed: number): void;
  stopAndSelect(): void;
  cut(): void;
  acceptCurrent(): void;
  rejectCurrent(): void;
  toggleCollection(): void;
  markCompleted(questId: string): void;
  consoleOverride(questId?: string): void;
};
```

### Pool loader

```ts
async function loadQuests(): Promise<Quest[]>;
// resolves quests.json -> quests.example.json -> []; merges localStorage additions
```

### Admin overlay (gated)

Activated by `?admin=1` URL flag. Renders a panel with:
- "Add quest" form (writes to localStorage layer)
- "Export my quests" button (downloads localStorage layer as JSON)
- "Clear local additions" button (with confirm)
- "Reset session" button (clears `rejectedQuests[]` only)

## 7. Build Plan (Explicit)

Ordered milestones. Each is a hand-off point at which the build can be paused and the result reviewed.

1. **Project scaffold.** Vite + React + TypeScript + Tailwind v4. Strict tsconfig. Project layout per section 11. ESLint and Prettier. `pnpm` if available, else `npm`. Acceptance: `pnpm dev` opens a blank page with Tailwind working.

2. **R3F canvas with webcam background.** `<Canvas>` mounted full-viewport, getUserMedia stream rendered as a video texture on a background plane sized to fill the camera frustum. Acceptance: live webcam visible behind the canvas with no chrome, no scrollbars.

3. **State store + state machine.** Zustand store with all phases per section 6, with action stubs that log transitions. No visuals yet. Acceptance: triggering actions from devtools advances `phase` correctly and rejects illegal transitions.

4. **Card meshes and idle/wake/spin states (no gestures).** Procedural card geometry with placeholder materials, the 7-card cluster, and animations for idle (flat row), wake (rise + gather), and spin (rotation with direction and speed). Driven from the state store. Trigger via debug hotkeys for now. Acceptance: keyboard shortcuts walk through phases 1→2→3 with believable animation timing.

5. **Select, cut, reveal.** Phase 3→4 selects one card, others drop and fade. Phase 4→5 plays the cut animation, reveals an inner card with the quest face (title, description, requirements). Quest face uses the HTML/CSS layer projected onto the card via `<Html>` from drei or a canvas texture. Acceptance: cycle through states 4 and 5 via debug keys, see the current quest text on the revealed card, including the optional requirements block when present.

6. **Accept and reject paths.** Green-flourish + random message overlay for accept, persists `AcceptedQuest`. Crumple + throw + trash-can prop for reject, persists `RejectedQuest` and removes the quest from the active session pool. Both paths reset to phase 1. Acceptance: each path produces the documented animation, message, and persistence side effect.

7. **MediaPipe HandLandmarker integration.** Wire `@mediapipe/tasks-vision` to the webcam stream. Visualize landmark dots on a debug overlay (toggle with `?debug=1`). Performance budget: at least 25 fps on a 2024 MacBook Pro. Acceptance: hand landmarks track the user's hand in real time on the debug overlay.

8. **Gesture vocabulary (blocked on follow-up conversation).** The vocabulary is intentionally TBD in this PRD (see section 6 and section 9). Until it is supplied, expose every gesture event slot as a debug keyboard shortcut and verify the full on-camera loop runs end-to-end via keyboard. Once the vocabulary is decided, implement the gesture detector to emit each `GestureEvent` from the supplied poses, tune thresholds against real filmed footage with the debug overlay on, and budget extra time for the most fragile slot (likely `throw`). Acceptance (post-vocabulary): each gesture produces the correct `GestureEvent` reliably under varied lighting; the on-camera loop runs end-to-end with no keyboard input.

9. **Hall of Frame route.** Toggle gesture or button switches into a museum-style gallery view. Each accepted quest is a framed piece. Click a frame to mark completed (toggleable). Rejected quests never shown. Acceptance: accept three quests, toggle into the gallery, mark one completed, refresh the page, state persists.

10. **Admin overlay.** `?admin=1` exposes the form for adding local quests, export, clear-local, reset-session. Acceptance: add a quest via the form, see it in the next spin pool, export it as JSON.

11. **Filmability pass.** Verify the entire loop framed inside a 9:16 phone-shot region of the laptop screen. Adjust card sizes, text sizes, and positions so nothing critical is in the cropped edges. Acceptance: a recorded vertical phone capture of the laptop running the full loop is legible without further edits.

12. **README and deploy.** README covering: what it is, how to run locally, how to add quests, the privacy claim (frames never leave the browser), and the open-source license choice (MIT recommended). Deploy to Vercel with the `quests.json` baked in. Acceptance: bio-link URL loads the production app and runs the full loop end-to-end on a fresh Mac with permission granted to camera.

## 8. Acceptance Criteria

- [ ] Loading the deployed URL on a fresh Mac, granting camera permission, walks Dawson through the full six-state loop using only hand gestures (no keyboard).
- [ ] Accept path persists the quest to `acceptedQuests[]` with timestamps and shows it in the Hall of Frame.
- [ ] Reject path crumples and throws into a trash can, removes the quest from the session pool, and the rejected quest is hidden from the Hall of Frame permanently.
- [ ] No re-roll path exists inside a single bit (state 6 always commits).
- [ ] Hall of Frame mark-completed click toggles `completedAt` and persists across reload.
- [ ] Webcam frames never leave the browser. No network calls except the initial app bundle load and the MediaPipe model fetch (both cacheable, both static).
- [ ] Admin / Override icon opens the admin panel with add, export, clear-local, reset-session, and force-next-quest controls.
- [ ] Icon tray auto-hides after 3 seconds of mouse inactivity and reappears on mouse motion.
- [ ] Throw event fires correctly after the crumple completes; 80% of throws land in the can, 20% bounce off the rim (verified across 20+ trials).
- [ ] Vertical 9:16 phone capture of the laptop screen reads cleanly: title, description, requirements, accept message, trash can, and the green flourish are all inside the safe area.
- [ ] App runs at sustained 25 fps minimum (hand tracking) and 60 fps (R3F render) on a 2024 MacBook Pro.
- [ ] `quests.json` is gitignored; `quests.example.json` is committed and loads as fallback.
- [ ] Run `pnpm dev` after fresh clone of a non-Dawson user produces a working app with the example pool.

## 9. Open Questions and Iteration Hooks (Adaptive)

### Locked

- Stack (R3F r184 + WebGPU + MediaPipe + Vite + Tailwind v4, Vercel host).
- Six-state machine and the visual behavior of each state.
- Card-as-pack metaphor (one selected card cuts open to reveal the inner quest card).
- Accept and reject paths and animations. Reject = crumple + throw with 80/20 hit probability.
- No re-rolls.
- Hall of Frame with click-to-complete.
- Admin / Override icon (auto-hiding) absorbs both quest management and force-next-quest.
- `quests.json` private, `quests.example.json` public.
- 7 cards default in idle and spin states.
- No backend, no API keys at runtime.
- The **set of gesture event slots** (`wake`, `spin`, `stopSelect`, `cut`, `accept`, `reject`, `throw`) and the state-machine guards on each. The actual poses that fire each slot are intentionally not yet decided (see Open / TBD).

### Open / TBD

- **Gesture-to-action vocabulary.** Section 6 lists the seven event slots that need a pose mapping plus the cross-cutting requirements (filmability, stability, state-aware guards, continuous vs discrete). To be decided in a follow-up conversation; this section and the section 6 table will be replaced with a locked vocabulary at that point. Until then, the detector emits events only via debug keyboard shortcuts.
- Card visual design: back pattern, glow palette, typography for quest title face. Treat as a design pass before milestone 5.
- Trash can styling: cartoon vs realistic. Recommendation: cartoon to match the playful crumple-and-throw beat.
- Hall of Frame layout: grid vs scrolling gallery vs single-card-at-a-time with arrows. Decide at milestone 9.
- Crumple animation technique: vertex shader displacement vs pre-baked Blender animation imported as glTF vs cloth physics. Implementer's call. Pre-baked likely cheapest.
- Throw-gesture velocity threshold tuning. Plan one tuning pass on actual filmed footage during milestone 8.

### Future (v2, explicitly out of scope now)

- Mobile or tablet support.
- Multiple accounts or device sync.
- "Stealing as a Setter" cross-pillar integration.
- Per-quest cover art baked into the card face.
- Sound design (the reels are usually voiceover-dubbed in post anyway).
- Multi-user "submit your quest to the host site" pipeline.

## 10. Risks, Tradeoffs, and Assumptions (Reflective)

### Why this architecture

- **Browser over native macOS.** The bio-link requirement essentially forces a web surface. Building native would require building twice (Mac for filming, web for bio link). Browser also keeps the open-source contribution model meaningful for non-Mac users. The hand-tracking quality gap (MediaPipe at 25 to 30 fps in WASM vs Apple Vision at 60+ fps native) is irrelevant for discrete-gesture input.
- **R3F over Babylon or Pixi.** Three.js R3F is the dominant choice for cinematic 3D web work in 2026. WebGPU production-ready since r171. Babylon is more enterprise-flavored without the visual ceiling. Pixi is 2D and would flatten the card-pack drama.
- **WebGPU over WebGL.** Particle-heavy reveal beats benefit from GPU-driven particle systems. WebGPU is fully supported by the user's target browsers (current Chrome / Safari 26 / Firefox).
- **No backend.** Removes hosting cost, removes moderation work, removes any "quests on someone else's server" trust ask, and lets the deployed and local versions be the same artifact.

### Most fragile assumptions

- **Hand-tracking reliability under filming lights.** Bright key lights and high contrast can confuse MediaPipe more than ambient lighting. Mitigation: prefer gestures based on hand-shape topology (open palm vs closed fist) rather than precise individual finger angles. Also: implement a simple "pose stability" debounce so a flicker doesn't fire an event.
- **WebGPU compatibility on whoever clones the repo.** Most modern browsers support it but not all. Mitigation: detect support at startup and either fall back to WebGL renderer (Three.js supports both with one swap) or show a "use Chrome 120+ or Safari 26+" banner.
- **MediaPipe model download time on first load.** The HandLandmarker model is a few MB. Mitigation: pre-fetch on app load, show a brief "warming up" splash if the user reaches the wake state before it is ready.
- **Discrete-gesture detection from continuous landmark streams is genuinely hard.** Plan to spend real time on the gesture-detector module (state-aware, debounced, hysteresis to prevent flicker between open and closed fist).
- **Time-to-launch.** Pre-launch reel target is week of 2026-05-11. The build plan above is realistic for a focused weekend plus weeknights. Cut milestones 9, 10, 11 if the launch is at risk; the on-camera loop is the only thing the launch reel needs.

### At 10x scale

Not applicable for the hosted version (it is a single-page bio-link, traffic peaks are bounded by Instagram). For the open-source repo, scale = number of forks, which is fine.

### Security / privacy notes

- Webcam stream stays in the browser. No upload, no analytics on the video.
- localStorage is per-origin and per-browser. No cross-device sync.
- No third-party scripts beyond the MediaPipe model fetch and the Vite bundle.
- README must say this loudly and clearly.

## 11. Implementation Notes for Claude Code

### Repo conventions

Follow `~/.claude/CLAUDE.md` (user-global). Key items: TypeScript over JavaScript on the frontend, kebab-case directory names, camelCase variables, no em-dashes anywhere (prose, code, commits), 500-line file cap, function under 30 lines, dependency injection over instantiation, conventional-commit-style messages with under-50-char titles.

### Expected file layout

```
mylifecouldbemorefungivemeasidequest/
├── docs/
│   └── prd.md                         # this file
├── public/
│   ├── messages.json                  # acceptance messages
│   └── quests.example.json            # public sample pool
├── quests.json                        # gitignored, real pool (only on Dawson's machine and on Vercel via build)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── scene/                         # R3F scene graph (Canvas, cards, trash can, postprocessing)
│   ├── gestures/                      # MediaPipe Hands integration + GestureDetector
│   ├── state/                         # Zustand store + state machine + selectors
│   ├── hud/                           # 2D Tailwind overlay (quest text, accept message)
│   ├── pages/
│   │   └── HallOfFrame.tsx
│   └── lib/                           # pool loader, persistence helpers, types
├── .analysis/                         # gitignored, downloaded reference reels + frames
├── .gitignore                         # must include quests.json and .analysis/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Test strategy

Light. This is a v1 content-asset app, not a production system. Cover only:

- Pool resolution order (unit test: fixtures for present/absent `quests.json`, present/absent `quests.example.json`, localStorage merging).
- State machine illegal-transition rejection (unit test).
- localStorage round-trips for accepted, rejected, completed (unit test).

No e2e tests. No visual regression. The acceptance test is "Dawson runs the loop on camera and it works."

### What the implementing session must NOT do

- Do **not** invent gestures. Section 9 lists the slots; the gesture vocabulary will be supplied in a follow-up conversation. Until then, leave the gesture detector emitting events only via debug keyboard shortcuts.
- Do **not** add a backend, no matter how trivial it seems. No serverless functions either.
- Do **not** add analytics, telemetry, or any third-party tracking script.
- Do **not** make calls to LLM APIs at runtime. The acceptance messages are a static array.
- Do **not** clutter the repo root with markdown notes. Use `docs/`.
- Do **not** commit `quests.json` or anything in `.analysis/`.
- Do **not** use em-dashes or en-dashes anywhere, including code comments and commit messages.

### Reference materials

- Pillar context and brand fit: `~/dp/notes/mindboard/dpmp4/side-quest-pillar.md`
- Month plan, deadlines, bio-link cutover timing: `~/dp/notes/mindboard/dpmp4/may-2026-content-plan.md`
- Voice and tone for any user-facing copy: `~/dp/notes/wiki/content-creation/pages/voice/dp-mp4-storytelling-voice.md`
- Reference reels and analysis frames: `.analysis/reel{1,2,3}/` (gitignored locally; do not re-download from Instagram during build)
