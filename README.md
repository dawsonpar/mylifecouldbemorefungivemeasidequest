# my life could be more fun, give me a side quest

A browser-based side-quest randomizer where quests are a pack of cards
and you control everything with hand gestures via your laptop's webcam.
Wave both hands open to wake the pack, rotate one hand to spin, pinch to
select, peace-sign-slice to cut the pack open, thumbs up to accept, thumbs
down to reject (the card crumples into a ball, then a basketball-shot flick
lobs it at a trash can with an 80/20 hit rate).

Built with React Three Fiber, Three.js, and MediaPipe HandLandmarker. No
backend. Webcam frames never leave your browser.

## Run it

```bash
pnpm install
pnpm dev
# open http://127.0.0.1:5173 and grant camera access
```

The first run fetches the MediaPipe Hand Landmarker model (~6 MB) from
the official Google CDN once and caches it. After that, no network calls
at runtime.

## Add your own quests

Two ways:

1. **Edit a JSON file directly.** The deployed app loads `quests.json` if
   it exists, falling back to `quests.example.json` (the public sample
   pool committed to the repo). Drop a `quests.json` next to
   `quests.example.json` in `public/` to override:

   ```json
   [
     {
       "id": "my-quest-1",
       "title": "Walk somewhere new",
       "description": "Pick a street you have never walked. Walk it end to end.",
       "requirements": "30 minutes minimum. Bring no headphones."
     }
   ]
   ```

   `quests.json` is gitignored so your private pool never gets committed.

2. **Use the in-app admin panel.** Click the gear icon in the bottom-right
   corner (or visit `?admin=1`). The panel has a form to add quests, an
   export button to download your local additions as JSON, and a force-
   next-quest dropdown for editorial control during filming.

## Gestures

Currently only valid in the phase listed.

| Gesture | Phase | Description |
|---|---|---|
| **Both hands, all 10 fingers open** | idle | Wakes the pack |
| **Rotate one hand, fingers toward camera** | wake / spin | Cards spin in your rotation direction |
| **Thumb-and-index distance** | spin | Spread = faster, close = slower |
| **Pinch (thumb-tip touches index-tip)** | spin | Selects a card |
| **Peace sign + horizontal slash** | select | Cuts the pack open |
| **Thumbs up** | openPack | Accepts the quest |
| **Thumbs down** | openPack | Rejects (crumples the card) |
| **Closed fist, then snap open + upward** | reject | Throws the ball at the trash can |

Tuning lives in `src/gestures/detector.ts` under `TUNING`. If a gesture is
firing too easily or too rarely, that file is the one-stop edit.

## Dev keys

If you want to walk the loop without using your hands:

```
w wake · s spin cw · a spin ccw · ± speed · enter select
c cut · y accept · n reject · t throw · r reset · h hall of frame
```

## URL flags

- `?admin=1` opens the admin panel and pins the icon tray visible.
- `?debug=1` overlays MediaPipe's 21 landmarks on the webcam so you can
  see what the tracker sees. Use this when tuning gestures.

## Privacy

- Webcam frames stay in your browser. Nothing is uploaded.
- The MediaPipe model is fetched from `storage.googleapis.com` and the
  WASM runtime from `cdn.jsdelivr.net` on first run. Both cache after.
- No analytics, no telemetry, no third-party tracking scripts.
- Your accepted, rejected, and locally-added quests live in `localStorage`,
  scoped to your browser only.

## Tech stack

- React 18, TypeScript, Vite
- Three.js r184, React Three Fiber, drei, postprocessing
- MediaPipe HandLandmarker (`@mediapipe/tasks-vision`)
- Zustand (state), Tailwind CSS v4 (HUD)

## License

MIT. See LICENSE.

## Inspiration

This is the wheel-app for the @dp.mp4 Side Quest content pillar,
reimagined as a card-pack interaction. Three reference reels shaped it:

- the **interaction model** (a Korean creator's chord trainer where the
  webcam fills the laptop and hand poses drive translucent UI overlays)
- the **concept** (`mylifeisboringandiwanttodoasidequestbutdontknowwhattodo.com`,
  a side-quest generator with photo-based completion and a leaderboard;
  we kept the generator and dropped the gamification)
- the **visual language** (Pokemon TCG digital pack-rip animations from
  the Triumph Collectibles app)
