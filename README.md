# Kingdom of Ember (Clash Idle)

A browser idle / tower-defense game inspired by Clash of Clans. Vanilla JS on a
canvas, no framework and no build step. All the art is drawn in code.

Play it at [j4den.com/clashidle](https://j4den.com/clashidle).

## What's in the game

- **A real-looking village.** Every building is painted once into a cached,
  outlined sprite with procedural stone, plank, plaster, shingle and iron
  textures. Buildings change look at four tiers as they level up, towers
  swing their barrels and bows toward targets, and the island sits on a
  cliff in an endless meadow with forests, lakes and drifting cloud shadows.
  Windows and braziers glow at night, with fireflies after dark.
- **A friendlier camera.** The default angle looks more from above than the
  old view so tall buildings hide less. Menu → Camera angle switches between
  Classic, Balanced and Overhead, and buildings in front of the one you
  select turn see-through (toggle in the menu).
- **Click the building, not the tile.** Hit testing uses the pixels of the
  art you see (front-most first, with a generous halo for touch), so tapping
  a roof, tower top or flag works. Double-click upgrades.
- **Upgrading is one tap.** Select a building for a card with the cost and
  the stat change, or tap the green arrow floating over anything you can
  afford. The Upgrade tab lists everything with its gain, has "upgrade
  cheapest" and "upgrade all you can", and an optional auto-upgrade
  (economy, defense or everything).
- **Reset and Ascension.** Menu → Reset everything wipes the save (two
  confirmations). Reach wave 10 and **Ascend** for crowns instead: the
  kingdom restarts and crowns buy permanent perks (production, tower
  damage, XP, starting gold).
- **More to build.** 18 original structures plus the Frost Spire (slows
  raiders), Gem Quarry and four decorations (oak, garden, fountain, hero
  statue) that add a little production each. Walls connect to each other
  and can be painted by dragging. Cannons and mortars hit ground only, Air
  Defense hits flyers only.
- **Smarter raiders.** Ground raiders path around walls with a flow field and
  only chew through when walking is much worse. Wolves, skeleton archers
  and the Stone Golem boss (every tenth wave) join the goblins, orcs,
  trolls, ogres, bats and dragons. The raid card previews the next wave.
- **Things to do.** Three rotating quests for gems, achievements, a Treasure
  Goblin that runs across the map (click it), combo clicks, War Cry,
  lightning, gem boost, 1x/2x/3x game speed.
- **Saves.** `localStorage`, versioned (v6) with a backup slot, corrupt-save
  recovery and export / import. The tab pauses when hidden; time away
  pays half rate for up to 4 hours. Old saves load unchanged.
- **Themes.** Light and dark follow the site's `localStorage.theme`. Number
  format, sound, level tags and upgrade arrows are in Menu.
- **Co-op over PeerJS** with a relay status, partner minimap and gifts.
- **Phones.** Pinch to zoom, one-finger pan, panels become a bottom sheet.

Keyboard: Space collect, U upgrade, P pause, X speed, V camera, W War Cry,
L lightning, A auto-collect, R rally, M mute, T theme, 1–5 panels, +/− zoom,
0 home, Esc cancel, ? list.

## Running it

```bash
npm install
npm start          # http://localhost:3000
```

The Node server only serves `public/`; the deployed game is static files.
`public/gallery.html` (dev only, not deployed) shows every building sprite at
every tier: `/gallery.html?only=cannon,wizard&tiers=1,4&z=2`.

## Deploying

Every push to `master` mirrors `public/` into my
[j4den](https://github.com/JadenB9/j4den) site repo via GitHub Actions, which
Cloudflare Pages publishes at `j4den.com/clashidle`. Details in
[DEPLOY.md](DEPLOY.md).

## Layout

- `public/index.html`: page shell, HUD, icon sprite. A `<meta>` CSP allows
  the one inline theme script by hash (recompute the sha256 if it changes)
  and forbids inline styles, so the JS sets sizes through the CSSOM.
- `public/js/data.js`: config, buildings, enemies, perks, quests
- `public/js/art-core.js`: textures, isometric box / cylinder / cone
  helpers, sprite cache with outline and hit mask
- `public/js/art-buildings-a.js`, `art-buildings-b.js`: one painter per building
- `public/js/art-world.js`: island, meadow, scenery, clouds
- `public/js/art-units.js`: raiders, turret parts, flags and fire
- `public/js/game.js`: state, combat, economy, input, rendering
- `public/js/ui.js`: panels, selection card, dialogs
- `public/js/net.js`: co-op and save / load
- `public/css/style.css`: the HUD (dark tokens on `:root`, light on
  `:root[data-theme="light"]`)
- `server.js`: static file server
