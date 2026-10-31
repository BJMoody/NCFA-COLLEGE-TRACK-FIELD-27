# Browser Game Architecture

## Runtime
The game runs as a browser application. The current vertical slice intentionally uses native ES modules and Three.js from a pinned CDN build so it can be served as static files with no build step.

## Layers

### Presentation
- `index.html` — screen structure and game HUD
- `styles.css` — broadcast-style UI, menus and responsive layouts

### 3D game runtime
- `src/game.js` — Three.js scene, track/stadium geometry, athlete rendering, camera, race simulation, input and results

### Deployment
- `.github/workflows/pages.yml` — publishes the static game from `main` to GitHub Pages
- `.nojekyll` — prevents Jekyll processing

## Planned modular split
As the project grows, `src/game.js` should be separated into:

- `src/core/Game.js` — state machine and update loop
- `src/render/Renderer.js` — WebGL/WebGPU renderer selection and postprocessing
- `src/world/Track.js` — track geometry and coordinate transforms
- `src/world/Stadium.js` — venue generation and assets
- `src/athletes/Athlete.js` — runtime athlete entity
- `src/athletes/Animation.js` — locomotion and event animations
- `src/racing/RaceEngine.js` — race timing, positioning and event rules
- `src/racing/FatigueModel.js` — energy systems and fatigue
- `src/racing/AI.js` — athlete tactical decisions
- `src/career/CareerState.js` — athlete career save data
- `src/career/Calendar.js` — classes, training, recovery and meets
- `src/dynasty/Program.js` — roster, recruiting and program management
- `src/data/` — schools, conferences, athletes, events and records
- `src/ui/` — menus and overlays
- `src/audio/` — crowd, PA and race audio

## Save model
The browser build should ultimately maintain a versioned save schema containing:

- created athlete identity and appearance
- career archetype and event specializations
- school and roster assignment
- ratings and development history
- PRs, SBs and records
- academic standing and eligibility
- coach trust and depth-chart status
- season calendar and results
- recruiting/transfer decisions
- dynasty program state when applicable

## Performance principles
- Cap device pixel ratio on high-density displays.
- Prefer instancing for crowds and repeated stadium assets.
- Stream large venue and character assets only when needed.
- Use quality presets for shadows, crowds and postprocessing.
- Keep simulation independent of frame rate.
- Adopt WebGPU progressively while retaining a WebGL fallback until browser coverage is sufficient.
