# NCFA audio assets

The game uses the exact uploaded path casing: `public/Audio/`.

## Runtime rules

- Voice clips and stadium ambience are MP3.
- Starter gun, recall gun and final-lap bell currently use the uploaded MP3 files too.
- The browser reads each clip's real metadata duration when it loads.
- Speech is serialized through one queue, so PA, commentators and officials do not talk over one another.
- Starter sequences await the official clip's `ended` event before advancing.
- The gun cannot fire while an official instruction, `On your marks`, or `Set` clip is still playing.
- Random silent holds are inserted after the spoken commands so starter timing varies from race to race.
- Finish cinematics last at least three seconds and remain on the cinematic camera longer when finish commentary is still playing.
- Missing optional commentary files fail gracefully instead of stopping the race.

## Uploaded directories

- `public/Audio/pa/female/`
- `public/Audio/commentary/female/`
- `public/Audio/commentary/male/`
- `public/Audio/officials/`
- `public/Audio/sfx/`

One uploaded PA result clip is intentionally mapped by its existing filename:

`public/Audio/pa/female/Official results have been posted.mp3`

The game code matches that name exactly, so it does not need to be renamed.
