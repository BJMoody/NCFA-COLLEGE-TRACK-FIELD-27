# NCFA College Track & Field 27

A browser-first 3D collegiate track & field career game. Open a URL, choose a career path, live the college-athlete routine, train, race, score points, qualify, and build a legacy.

> NCFA is a fictional governing body created for this game. This project is not affiliated with the NCAA, EA Sports, or any real collegiate athletic association.

## Play the current build

The game is a static browser application. For local development, serve the repository root with any static server instead of opening `index.html` directly from the filesystem.

Examples:

```bash
python3 -m http.server 8080
```

or

```bash
npx serve .
```

Then open the local URL shown by the server.

The `main` branch is configured for GitHub Pages deployment through `.github/workflows/pages.yml`.

## Current playable systems

- Broadcast-style title screen and game menu
- Career path selection: Sprints, Distance, Jumps, Throws, Combined Events
- College-athlete career hub
- 3D collegiate track stadium rendered with Three.js
- Playable men's 800m against seven AI athletes
- Keyboard pacing and race-effort controls
- Lane movement after the break
- Short surge mechanic
- Athlete stamina and fatigue model
- Drafting benefit when tucked behind another runner
- AI pacing phases and late-race kicks
- Basic collision/boxing behavior
- 400m split notification
- Live place, race clock, distance and effort HUD
- Chase camera and animated 3D runner models
- Official results screen with PR/SB detection
- Quick Meet and Championship race entry points

## Controls

| Input | Action |
| --- | --- |
| W / Up Arrow | Increase race effort |
| S / Down Arrow | Relax / reduce effort |
| A | Move outward |
| D | Move toward the rail |
| Space | Short surge |

## Game vision

### Career
Create an athlete, get recruited, attend classes, train, recover, earn coach trust, compete through indoor and outdoor seasons, enter the transfer portal, chase records, qualify for NCFA championships, and build a four-year legacy.

### Dynasty
Run an entire college program. Recruit athletes, manage scholarships, hire staff, build event groups, develop facilities, set meet schedules, score conference championships and chase national team titles.

### Event groups

- Sprint Career — 60m, 100m, 200m, 400m, hurdles and relays
- Distance Career — cross country, 800m, 1500m, mile, 3K, 5K and 10K
- Jumps Career — high jump, long jump, triple jump and pole vault
- Throws Career — shot put, discus, hammer, javelin and weight throw
- Combined Events — pentathlon, heptathlon and decathlon

## Technical direction

- Browser-first HTML/CSS/JavaScript
- Three.js for real-time 3D rendering
- WebGL today, with room to adopt WebGPU as browser support and project needs justify it
- Data-driven athlete, team, meet and career systems as the project expands
- GitHub Pages for zero-install playable builds

## Development order

1. Make track racing feel excellent.
2. Expand race types: 60m through 10K, hurdles, relays and cross country.
3. Add jumps and throws with event-specific control systems.
4. Build training, recovery, academics and calendar simulation.
5. Build recruiting, scholarships, team depth charts and transfer systems.
6. Build full meets, conference scoring and NCFA championship qualification.
7. Build Dynasty mode and long-term program simulation.
8. Add deeper presentation, commentary-style overlays, crowds, audio, customization and online competition.

## Status

The first browser vertical slice is now in development. The current build proves the core loop: enter the game, select a career or quick meet, load into a 3D track race, manage effort and position, finish, and receive official results.
