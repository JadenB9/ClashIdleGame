# Kingdom of Ember (Clash Idle)

A browser idle / tower-defense game inspired by Clash of Clans. The whole game
lives in one vanilla-JS file (`public/js/game.js`, ~4,500 lines) rendered on a
canvas — no framework, no build step.

Play it at [j4den.com/clashidle](https://j4den.com/clashidle).

## What's in the game

- Isometric 24×24 village grid with drag-to-pan, zoom, and a build/move mode
- 18 building types: Town Hall, resource generators (gold mine, elixir well,
  dark drill), storages, and defenses — cannons, archer towers, mortars, air
  defense, wizard towers, teslas, X-bows, infernos — plus walls, lab, builder
  huts, army camps, and a clan castle
- Enemy raids arrive in timed waves; ground troops path around (or chew
  through) walls, and from wave 6 flying enemies skip them entirely
- Three resources (gold / elixir / dark elixir), XP levels, achievements, and
  a gem-powered lightning spell for emergencies
- Day/night cycle (3 real minutes per in-game day), procedural WebAudio sound
  effects, screen-shake and combo effects
- Saves to `localStorage` every 15 seconds and when you leave the page, with
  a versioned format and validation on load. The save before the current one
  is kept in a backup slot, so a damaged save is restored from it instead of
  starting over (the broken copy is set aside either way). Export / Import to
  a `.json` file
- Auto-pauses when the tab is hidden so raids don't happen while you're not
  looking; time away (tab closed or hidden) pays out at half rate for up to
  4 hours, within your storage caps, and a "Welcome back" summary shows what
  came in. A throttled tab (window covered, lid half shut) is simulated in
  0.1s steps on the next frame rather than running slow
- Light and dark themes with a sun/moon toggle in the top bar. The choice is
  the same `localStorage.theme` key the rest of j4den.com uses, so it carries
  across the site; nothing saved means follow the device. The map keeps its
  own day/night lighting in both
- Settings panel (Stats tab): sound, theme (System / Light / Dark), number
  format (12.5K, 12,500 or 1.25e4) and a keyboard shortcut list (`?`)
- Keyboard: Space collects, P pauses, W War Cry, L lightning, A auto-collect,
  R rally, M mute, T theme, 1–4 switch tabs, +/− zoom, 0 resets the view
- Co-op over PeerJS: the Co-op tab shows the relay state (ready, lost,
  reconnecting with backoff, unreachable), an unknown code says so at once,
  and everything a partner sends is clamped and truncated before it is drawn
- Works on phones: long-press a building for its menu, pinch to zoom

## Running it

```bash
npm install
npm start          # Express + Socket.IO on http://localhost:3000
```

`npm run dev` does the same with nodemon auto-reload.

The Node server mostly exists to serve the static files; there's a small
Socket.IO hook that rebroadcasts game-state updates to other connected
clients, but the game runs fine without it (the deployed version on
j4den.com is static files only).

## Deploying

Every push to `master` mirrors `public/` into my
[j4den](https://github.com/JadenB9/j4den) site repo via GitHub Actions, which
Cloudflare Pages then publishes at `j4den.com/clashidle`. Details in
[DEPLOY.md](DEPLOY.md).

## Layout

- `public/index.html` — page shell, HUD, resource bar, settings; carries a
  `<meta>` CSP (the one inline script, the theme pre-paint, is allowed by
  hash — recompute the sha256 if it changes)
- `public/js/game.js` — the entire game: config, building defs, waves, AI,
  rendering, audio, save/load, co-op
- `public/css/style.css` — HUD styling; the dark tokens live on `:root` and
  the light ones on `:root[data-theme="light"]`
- `server.js` — static file server + optional Socket.IO relay
