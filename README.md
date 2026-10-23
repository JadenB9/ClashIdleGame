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
  confirmations). Survive 15 waves and **Ascend** for crowns instead: the
  kingdom restarts and crowns buy permanent perks (production, tower
  damage, XP, starting gold). Gems, crowns, perks and achievements stay.
- **More to build.** 18 original structures plus the Frost Spire (slows
  raiders), Gem Quarry and four decorations (oak, garden, fountain, hero
  statue) that add a little production each. The map is a 72x72 grid:
  buildings are 3x3 tiles, the Town Hall and Clan Castle 4x4, walls 1x1, and
  everything can sit side by side. Walls connect to each other, can be painted
  by dragging. The **row tool** (E) picks a whole row or column with one
  click (or a dragged stretch or box): press Move, or drag any picked one, to
  carry the group, or press Delete to remove it. **Walls only** (G) fades
  everything else while you place, move or pick, and the **grid** (D) shows
  open ground in green and taken ground in red. Arrow keys nudge a building or group one tile. A mortar has a
  dead zone beside it, and selected buildings show their real footprint. Cannons and mortars hit ground only, Air Defense hits flyers only.
  The Town Hall allows 50 more walls per level than before (75 at level 1).
- **Smarter raiders.** The first raids hit a bit harder (up to +40% health, +25% damage, one extra raider) and ease back to normal by wave 15. Ground raiders path around walls with a flow field and
  only chew through when walking is much worse. Barbarians, Archers, Giants,
  Wall Breakers (blow holes in walls), Hog Riders (leap walls), Wizards,
  Balloons, Witches (raise skeleton minions) and the P.E.K.K.A join the
  goblins, wolves, orcs, trolls, ogres, bats and dragons, and the Stone
  Golem boss comes every tenth wave. The raid card previews the next wave.
- **Public scoreboard.** Menu → Scoreboard (B) lists every player who joined with
  a name: best level, lifetime XP, furthest wave, crowns, kills, gold and more.
  Figures are sent by the browser to api.j4den.com every couple of minutes;
  "Remove me" deletes your row.
- **Rest and repair.** **Rest** (Z) holds raids back so you never have to
  defend non-stop, but collectors only run at half speed while you rest.
  **Repair** (K) mends everything for gems, or you feed gold into a repair
  fund that pays for the whole job the moment it covers the damage.
  Upgrading a building also heals it fully, and buildings slowly mend themselves (0.4% of their health a second) once nothing has hit them for six seconds.
- **Clear from the first minute.** A goal card walks a new player through
  eight steps (tap a coin bubble, upgrade, build a cannon, survive a raid,
  pick a boon, the Upgrade tab, quests, the long-term goal), pointing at what
  to press. A hint banner says what the next tap will do while you place or
  aim something, a few one-time tips cover storage, night, flyers and
  damage, and `?` / the help button opens a one-screen How to play.
- **Coin bubbles.** Mines and wells fill a bubble every few seconds. Tap it
  for a bonus; tap several in a row for a combo. Collect All grabs every
  ready one (no combo) and Auto-collect pays 80%.
- **Raid spoils.** After every wave pick one of three boons (stronger
  towers, more income, tougher walls, treasure, repairs…). Stacking ones
  last for the reign.
- **Things to do.** Three rotating quests for gems, achievements, a Treasure
  Goblin that runs across the map (click it), War Cry, Lightning, Freeze,
  gem Boost, 1x/2x/3x game speed, and a Relaxed / Normal / Hard setting.
- **Alive map.** Rain comes and goes, birds cross the sky, hurt buildings
  smoke and then burn, maxed buildings shine, and every upgrade tier adds a
  metal trim to the plinth plus extra crystals, coils or barrels. Stepping
  up to a new look fires a light pillar, shock rings and a flash, and the
  upper tiers glow on the ground. Walls have six distinct looks: wood,
  stone, riveted iron, obsidian crystal, gilded marble and molten basalt.
- **Saves.** `localStorage`, versioned (v8) with a backup slot, corrupt-save
  recovery and export / import. The tab pauses when hidden; time away
  pays half rate for up to 4 hours. Old saves are upscaled onto the finer grid when they load.
- **Themes.** Light and dark follow the site's `localStorage.theme`. Number
  format, sound, level tags and upgrade arrows are in Menu.
- **Co-op over PeerJS** with a relay status, partner minimap and gifts.
- **Phones.** Pinch to zoom, one-finger pan, panels become a bottom sheet.

Keyboard: Space collect, U upgrade, P pause, X speed, V camera, W War Cry,
L lightning, F freeze, A auto-collect, R rally, Z rest, K repair, E row tool, Del delete, arrows nudge, M mute, T theme, 1–5 panels,
+/− zoom, 0 home, Esc cancel, ? or H how to play.

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
- `public/js/ui.js`: panels, selection card, dialogs, goal card, boon picker
- `public/js/features.js`: first-run goals, tips, boons, freeze, weather, birds, damage effects
- `public/js/net.js`: co-op and save / load
- `public/css/style.css`: the HUD (dark tokens on `:root`, light on
  `:root[data-theme="light"]`)
- `server.js`: static file server
