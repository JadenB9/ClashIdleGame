/* ============================================================
   Kingdom of Ember — Clash Idle
   Game core: state, economy, combat, camera, input and rendering.
   DOM panels live in ui.js, co-op and saving in net.js, all the
   art in art-*.js and the numbers in data.js.
   ============================================================ */
(function (K) {
    'use strict';
    const { CFG, VIEWS, BLD, ENEMY, waveTable, PERKS, QUEST_KINDS, ACHS, DIFFICULTY, BOONS, scaledCost, levelCap, countCap, thForCount, thForLevel } = K.data;
    const U = K.util;
    const SPEEDS = [1, 2, 3, 5];
    const { rand, randi, clamp, fmt, safeNum, compact, alive, tierOf, tierCount, resColor } = U;
    const S = CFG.tileDiv;                  // tiles per old building tile (3): ranges, speeds and radii in data.js are written in the old unit
    const A = K.art;
    const TAU = Math.PI * 2;

    // ---------- AUDIO (procedural WebAudio) ----------
    class Sound {
        constructor() { this.ctx = null; this.enabled = true; this.muted = false; this.gain = null; this._last = {}; }
        ensure() {
            if (!this.enabled) return;
            if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
            try {
                const Ctor = window.AudioContext || window['webkitAudioContext'];
                this.ctx = new Ctor();
                this.gain = this.ctx.createGain();
                this.gain.gain.value = 0.16;
                this.gain.connect(this.ctx.destination);
                const len = this.ctx.sampleRate * 0.5;
                this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
                const d = this.noiseBuf.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            } catch (e) { this.enabled = false; }
        }
        // don't let a dozen towers firing at once turn into a wall of noise
        gate(name, ms) {
            const now = performance.now();
            if (now - (this._last[name] || 0) < ms) return false;
            this._last[name] = now;
            return true;
        }
        beep(freq, dur = 0.1, type = 'sine', vol = 1, slide = 0) {
            if (!this.enabled || this.muted) return;
            this.ensure();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const o = this.ctx.createOscillator(), g = this.ctx.createGain();
            o.type = type; o.frequency.setValueAtTime(freq, t);
            if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(this.gain);
            o.start(t); o.stop(t + dur);
        }
        noise(dur = 0.2, vol = 0.5, freq = 800, q = 0.7) {
            if (!this.enabled || this.muted) return;
            this.ensure();
            if (!this.ctx || !this.noiseBuf) return;
            const t = this.ctx.currentTime;
            const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
            const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            s.connect(f); f.connect(g); g.connect(this.gain);
            s.start(t); s.stop(t + dur);
        }
        click()  { this.beep(660, 0.05, 'triangle', 0.35, 1.3); }
        coin()   { if (!this.gate('coin', 60)) return; this.beep(988, 0.07, 'triangle', 0.4); setTimeout(() => this.beep(1319, 0.1, 'triangle', 0.3), 45); }
        build()  { this.noise(0.12, 0.5, 500); this.beep(196, 0.16, 'sawtooth', 0.3, 1.5); setTimeout(() => this.beep(392, 0.18, 'triangle', 0.35), 110); }
        upgrade(){ [523, 659, 784].forEach((f, i) => setTimeout(() => this.beep(f, 0.12, 'triangle', 0.45), i * 80)); }
        shoot()  { if (this.gate('shoot', 70)) this.beep(240, 0.06, 'square', 0.14, 0.5); }
        bow()    { if (this.gate('bow', 90)) { this.beep(900, 0.05, 'triangle', 0.12, 0.6); } }
        boom()   { if (this.gate('boom', 90)) { this.noise(0.35, 0.7, 380, 1); this.beep(90, 0.3, 'sine', 0.5, 0.4); } }
        zap()    { if (this.gate('zap', 60)) { this.beep(1400, 0.07, 'sawtooth', 0.14, 0.4); } }
        hit()    { if (this.gate('hit', 50)) this.noise(0.07, 0.3, 900); }
        die()    { if (this.gate('die', 60)) this.beep(140, 0.18, 'square', 0.22, 0.4); }
        wave()   { this.beep(196, 0.5, 'sawtooth', 0.45, 0.8); setTimeout(() => this.beep(147, 0.6, 'sawtooth', 0.4, 0.8), 260); }
        levelup(){ [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.16, 'triangle', 0.5), i * 90)); }
        spell()  { this.noise(0.5, 0.8, 2500); [220, 440, 880].forEach((f, i) => setTimeout(() => this.beep(f, 0.14, 'square', 0.4), i * 40)); }
        combo()  { if (this.gate('combo', 80)) this.beep(1200, 0.05, 'triangle', 0.3); }
        error()  { this.beep(160, 0.14, 'square', 0.3, 0.7); }
    }

    // seconds between blows; anything not listed swings every 1.1s
    const ATTACK_CD = { golem: 1.6, pekka: 1.7, giant: 1.4, wizard: 1.9, witch: 1.6, balloon: 2.0, archer: 1.2, hogrider: 0.9, minion: 0.9 };
    const GROUND_ONLY = new Set(['cannon', 'mortar']);
    const AIR_ONLY = new Set(['airdef']);
    const MARGIN = 5 * S;                   // free tiles around the grid that raiders may walk on
    const COST_WALL = 6 * S, COST_BLDG = 12;   // walking cost per tile: chewing through a wall, or through a building
    const TIER_COL = ['#c98a52', '#d5dde6', '#ffd34a', '#ff6fb1', '#9af0ff', '#ff9a4a'];
    const TIER_GLOW = [null, null, '#ffd86a', '#ff6a8a', '#ffd86a', '#ff8a3a'];   // ground aura for the upper looks
    const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

    // ---------- MAIN GAME ----------
    class Game {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.audio = new Sound();
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.tnow = 0;

            this.res = { gold: 500, elixir: 150, dark: 0, gems: 5 };
            this.gemAcc = 0;
            this.rates = { gold: 0, elixir: 0, dark: 0, gems: 0 };
            this.capBonus = 0; this.goldMult = 1; this.xpMult = 1; this.rallyHeal = 0.2; this.waveGems = 1; this.prosperity = 0;
            this.player = { level: 1, xp: 0, name: 'Chief' };
            this.buildings = [];
            this.enemies = [];
            this.projectiles = [];
            this.beams = [];
            this.particles = [];
            this.popups = [];
            this.stats = { built: 0, kills: 0, upgrades: 0, clicks: 0, goldEarned: 0, spells: 0, maxCombo: 0, playTime: 0, wavesCleared: 0, goblins: 0, bosses: 0, boons: 0, freezes: 0, collects: 0 };
            this.achievements = {};
            this.dayTime = 0.25; this.dayCount = 1;
            this.wave = { number: 0, timer: 120, active: false, spawnLeft: 0, spawnCd: 0, queue: [], next: [] };

            // ascension and quests
            this.crowns = 0; this.crownsEver = 0; this.ascensions = 0;
            this.perks = {}; for (const k in PERKS) this.perks[k] = 0;
            this.quests = [];

            this.boons = {};                          // wave boons picked this reign
            this.tut = { step: 0, done: false };      // first-run goals
            this.tipsSeen = {};
            this.opened = {};                         // panels the player has looked at (tutorial)
            this.weather = { rain: 0, target: 0, timer: rand(150, 300) };
            this.settings = { view: 'balanced', xray: true, autoUpgrade: 'off', levelTags: 'always', hints: true, raidStart: 'auto', difficulty: 'normal' };
            this.speed = 1;
            this.repairFund = 0;                       // gold set aside; repairs everything once it covers the damage
            this.selectMode = false; this.selectDrag = null; this.selectShape = 'line'; this.selectAdd = false;
            this.group = [];                           // buildings picked with the row tool
            this.gmove = null;                         // a group being carried: { grab } while dragging, { follow: true } after the Move button

            this.cam = { x: 0, y: 0, zoom: 1 };
            this.input = { x: 0, y: 0, down: false, drag: false, downX: 0, downY: 0, lastX: 0, lastY: 0, downTarget: null, touch: false, paint: false, lastPaint: null, lastTapT: 0, lastTapB: null };
            this.hoverTile = null; this.hoverBuilding = null;
            this.selected = null;
            this.buildMode = null; this.moveMode = null; this.spellMode = false;
            this.paused = false; this.autoCollect = false; this._autoCollectAcc = 0; this._autoUpAcc = 0;
            this.boost = { mult: 1, timeLeft: 0 };
            this.combo = { count: 0, time: 0, mult: 1 };
            this.warCry = { active: false, timeLeft: 0, cooldown: 0 };
            this.flash = 0; this.shake = 0; this.rallyCd = 0; this.reignCrowns = 1; this.pendingBoon = false;
            this.goblin = null; this.goblinTimer = rand(70, 110);

            this.occ = new Array(CFG.gridW * CFG.gridH).fill(null);
            this.occDirty = true; this.gridVer = 0; this._flow = new Map();
            this._draws = []; this._scn = []; this._order = [];
            this._lightQ = [];

            this.coop = {
                peer: null, conn: null, code: '', partnerCode: '', connected: false, partnerState: null, syncInterval: null,
                pendingInvite: null, relay: 'connecting', relayText: '', reconnectTimer: null, reconnectTries: 0, lastStateAt: 0,
            };
            this.lastTime = 0; this.alertTimer = 0;
        }

        init() {
            try {
                if (window.location.search.indexOf('reset=1') >= 0) {
                    for (const k of ['', '.bak', '.corrupt']) localStorage.removeItem(CFG.saveKey + k);
                    window.history.replaceState({}, '', window.location.pathname);
                }
            } catch (e) { /* ignore */ }

            this.cacheEls();
            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.bindInput();
            this.loadSave();
            A.setView(this.settings.view);
            this.ensureWorld();
            this.fillQuests();
            this.buildMenu();
            this.bindUI();
            this.initTheme();
            if (!this.hadSave) this.cam.zoom = this.homeZoom();
            this.centerCamera();
            this.wave.next = this.buildQueue(this.wave.number + 1);
            this.wave.nextSides = (this._loadedSides && this._loadedSides.length) ? this._loadedSides : this.pickSides(this.wave.number + 1);
            this._loadedSides = null;

            this.lastTime = performance.now();
            this._started = true;
            requestAnimationFrame((t) => this.loop(t));
            setInterval(() => this.save(), CFG.autoSaveMs);
            window.addEventListener('pagehide', () => {
                this.save();
                if (this.coop.connected) this.disconnectCoop();
            });
            this.initCoop();

            const welcome = document.getElementById('welcome');
            const start = document.getElementById('welcomeStart');
            start.addEventListener('click', () => { welcome.classList.add('hidden'); this.audio.ensure(); this.audio.click(); this.welcomeOpen = false; this.paused = false; this.lastTime = performance.now(); this.syncToggles(); });
            if (this.hadSave) welcome.classList.add('hidden');
            else { start.focus({ preventScroll: true }); this.welcomeOpen = true; this.paused = true; }
            this.updateUI();
            this.refreshSelection();
        }

        // ---------- view / canvas ----------
        resize() {
            const r = this.canvas.parentElement.getBoundingClientRect();
            const w = Math.floor(r.width * this.dpr), h = Math.floor(r.height * this.dpr);
            // assigning width/height wipes the canvas, so only do it when the size really changed
            if (w === this.canvas.width && h === this.canvas.height && r.width === this.vw && r.height === this.vh) return;
            this.canvas.width = w;
            this.canvas.height = h;
            this.canvas.style.width = r.width + 'px';
            this.canvas.style.height = r.height + 'px';
            this.vw = r.width; this.vh = r.height;
            // until the player moves the map themselves, keep the village centred as the window settles
            if (!this._camMoved && this.bounds) this.centerCamera(); else this.clampCamera();
            // a resize observer fires after the frame's draw and before it is shown: repaint now so the wiped canvas is never on screen
            if (this.bounds && this._started) this.render();
        }

        ensureWorld() {
            if (A.worldDirty || !A.world.ready) {
                A.world.build();
                const N = A.iso(0, 0), E = A.iso(CFG.gridW, 0), S = A.iso(CFG.gridW, CFG.gridH), W = A.iso(0, CFG.gridH);
                this.bounds = { minX: W.x - 460, maxX: E.x + 460, minY: N.y - 380, maxY: S.y + 380 };
            }
        }

        changeView(name) {
            if (!VIEWS[name] || name === this.settings.view) return;
            // keep whatever tile is in the middle of the screen in the middle
            const c = this.screenToTile(this.vw / 2, this.vh / 2);
            this.settings.view = name;
            A.setView(name);
            for (const b of this.buildings) b._sp = null;
            this.ensureWorld();
            const w = this.worldIso(c.tfx, c.tfy);
            this.cam.x = this.vw / 2 - w.x * this.cam.zoom;
            this.cam.y = this.vh / 2 - w.y * this.cam.zoom;
            this.clampCamera();
            this.save();
            this.syncSettingsUI();
        }

        // phones need to see more of the map than a desktop does
        homeZoom() { return CFG.homeZoom * (this.vw < 600 ? 0.62 : this.vw < 900 ? 0.8 : 1); }
        centerCamera() {
            const mid = this.worldIso(CFG.gridW / 2, CFG.gridH / 2);
            this.cam.x = this.vw / 2 - mid.x * this.cam.zoom;
            this.cam.y = this.vh / 2 - mid.y * this.cam.zoom - (this.vw < 600 ? -90 : 20);
            this.clampCamera();
        }

        clampCamera() {
            if (!this.bounds) return;
            const z = this.cam.zoom, b = this.bounds;
            const minX = this.vw - b.maxX * z, maxX = -b.minX * z;
            const minY = this.vh - b.maxY * z, maxY = -b.minY * z;
            this.cam.x = minX <= maxX ? clamp(this.cam.x, minX, maxX) : (minX + maxX) / 2;
            this.cam.y = minY <= maxY ? clamp(this.cam.y, minY, maxY) : (minY + maxY) / 2;
        }

        zoomBy(factor, ax, ay) {
            this._camMoved = true;
            const nz = clamp(this.cam.zoom * factor, CFG.zoomMin, CFG.zoomMax);
            const wx = (ax - this.cam.x) / this.cam.zoom, wy = (ay - this.cam.y) / this.cam.zoom;
            this.cam.zoom = nz;
            this.cam.x = ax - wx * nz; this.cam.y = ay - wy * nz;
            this.clampCamera();
        }

        worldIso(tx, ty) { return { x: (tx - ty) * CFG.tileW / 2, y: (tx + ty) * CFG.tileH / 2 }; }
        screenToWorld(sx, sy) { return { x: (sx - this.cam.x) / this.cam.zoom, y: (sy - this.cam.y) / this.cam.zoom }; }
        screenToTile(sx, sy) {
            const w = this.screenToWorld(sx, sy);
            const tx = w.x / CFG.tileW + w.y / CFG.tileH, ty = -w.x / CFG.tileW + w.y / CFG.tileH;
            return { tx: Math.floor(tx), ty: Math.floor(ty), tfx: tx, tfy: ty };
        }
        // centre of a building's footprint on the ground, in world units
        centerOf(b) { const s = BLD[b.type].size; return this.worldIso(b.tx + s / 2, b.ty + s / 2); }

        // ---------- grid ----------
        rebuildOcc() {
            if (!this.occDirty) return;
            this.occDirty = false;
            this.occ.fill(null);
            for (const b of this.buildings) {
                const s = BLD[b.type].size;
                for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
                    const x = b.tx + dx, y = b.ty + dy;
                    if (x >= 0 && y >= 0 && x < CFG.gridW && y < CFG.gridH) this.occ[y * CFG.gridW + x] = b;
                }
            }
            // walls connect to wall neighbours
            for (const b of this.buildings) {
                if (b.type !== 'wall') continue;
                const w = (x, y) => { const o = this.cell(x, y); return o && o.type === 'wall' ? 1 : 0; };
                b.wmask = w(b.tx + 1, b.ty) | (w(b.tx, b.ty + 1) << 1) | (w(b.tx - 1, b.ty) << 2) | (w(b.tx, b.ty - 1) << 3);
            }
            this.gridVer++;
            this._flow.clear();
        }
        cell(x, y) { return (x >= 0 && y >= 0 && x < CFG.gridW && y < CFG.gridH) ? this.occ[y * CFG.gridW + x] : null; }
        touchGrid() { this.occDirty = true; this.rebuildOcc(); }
        buildingAt(tx, ty) { if (this.occDirty) this.rebuildOcc(); return this.cell(tx, ty); }
        canPlace(type, tx, ty, ignore = null, ignore2 = null) {
            const size = BLD[type].size;
            if (this.occDirty) this.rebuildOcc();
            for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
                const x = tx + dx, y = ty + dy;
                if (x < 0 || y < 0 || x >= CFG.gridW || y >= CFG.gridH) return false;
                const o = this.cell(x, y);
                if (o && o !== ignore && o !== ignore2) return false;
            }
            return true;
        }
        canBuildHere(type, tx, ty, ignore = null, ignore2 = null) { return this.canPlace(type, tx, ty, ignore, ignore2); }
        // the one other building a footprint would land on, if there is exactly one (the swap partner)
        swapPartner(mb, tx, ty) {
            if (this.occDirty) this.rebuildOcc();
            let other = null;
            const size = BLD[mb.type].size;
            for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
                const o = this.cell(tx + dx, ty + dy);
                if (o && o !== mb) { if (other && other !== o) return null; other = o; }
            }
            if (!other || BLD[other.type].cat === 'core') return null;
            return other;
        }
        // can a and b trade places? each goes to the other's corner, and both new footprints must fit and not overlap
        canSwap(a, b) {
            const sa = BLD[a.type].size, sb = BLD[b.type].size;
            if (!this.canPlace(a.type, b.tx, b.ty, a, b) || !this.canPlace(b.type, a.tx, a.ty, a, b)) return false;
            return b.tx + sa <= a.tx || a.tx + sb <= b.tx || b.ty + sa <= a.ty || a.ty + sb <= b.ty;
        }
        swapBuildings(a, b) {
            if (!this.canSwap(a, b)) return false;
            [a.tx, b.tx] = [b.tx, a.tx]; [a.ty, b.ty] = [b.ty, a.ty];
            this.touchGrid();
            this.audio.build();
            for (const x of [a, b]) {
                const p = this.centerOf(x);
                for (let i = 0; i < 8; i++) this.particles.push({ x: p.x + rand(-10, 10), y: p.y + rand(-4, 6), vx: rand(-30, 30), vy: rand(-50, -15), life: 0.5, max: 0.5, color: '#d8c8a0', size: rand(2, 4), kind: 'dust' });
            }
            return true;
        }
        buildCost(type) { return scaledCost(type, this.countOf(type)); }
        countOf(type) { let n = 0; for (const b of this.buildings) if (b.type === type) n++; return n; }
        decorCount() { let n = 0; for (const b of this.buildings) if (BLD[b.type].decor) n++; return n; }
        // ---- Town Hall limits ----
        thLevel() { const th = this.buildings.find(b => b.type === 'townhall'); return th ? th.level : 1; }
        levelCapOf(type) { return levelCap(type, this.thLevel()); }
        countCapOf(type) { return countCap(type, this.thLevel()); }
        maxedOut(type) { return this.countOf(type) >= this.countCapOf(type); }
        // why another one is not allowed, in words
        limitText(type) {
            const def = BLD[type], cap = this.countCapOf(type), next = thForCount(type, cap + 1);
            if (!next) return cap === 1 ? `You can only have one ${def.name}` : `You already have the most ${def.name}s allowed (${cap})`;
            return `Town Hall ${this.thLevel()} allows ${cap} ${def.name}${cap > 1 ? 's' : ''}. Upgrade the Town Hall to level ${next} for more.`;
        }
        // is this building held back by the Town Hall (not by its own max level)?
        thCapped(b) { return b.type !== 'townhall' && b.level < BLD[b.type].maxLevel && b.level >= this.levelCapOf(b.type); }
        capText(b) { const n = thForLevel(b.type, b.level + 1); return n ? `Upgrade the Town Hall to level ${n} to go higher` : 'Already max level'; }

        // ---------- hit testing ----------
        spriteOf(b) {
            const tier = tierOf(b.type, b.level);
            const variant = b.type === 'wall' ? (b.wmask || 0) : 0;
            const key = A.spriteVersion + '|' + tier + '|' + variant;
            if (!b._sp || b._spKey !== key) { b._sp = A.getSprite(b.type, tier, variant); b._spKey = key; }
            return b._sp;
        }
        buildingsFrontToBack() {
            const list = this.buildings.slice();
            list.sort((a, b) => (b.tx + b.ty + BLD[b.type].size) - (a.tx + a.ty + BLD[a.type].size));
            return list;
        }
        // Which building is under this screen point? The art you can see wins, front-most first;
        // a generous halo catches thin parts, and the footprint always counts.
        buildingAtScreen(sx, sy) {
            const w = this.screenToWorld(sx, sy);
            const padPx = this.input.touch ? 12 : 4;
            const pad = padPx / this.cam.zoom;
            const list = this.buildingsFrontToBack();
            for (const pass of [0, 1]) {
                for (const b of list) {
                    const sp = this.spriteOf(b);
                    A.maskOf(sp);
                    const c = this.centerOf(b);
                    const dx = w.x - c.x, dy = w.y - c.y;
                    const bb = sp.bbox, pp = pass ? pad * 2.5 + 4 : pad;
                    if (dx < bb.x0 - pp || dx > bb.x1 + pp || dy < bb.y0 - pp || dy > bb.y1 + pp) continue;
                    if (A.hitSprite(sp, dx, dy, pass ? pp : Math.min(pp, 3))) return b;
                }
                if (pass === 0) {
                    const t = this.screenToTile(sx, sy);
                    const o = this.buildingAt(t.tx, t.ty);
                    if (o) return o;
                }
            }
            return null;
        }
        // The little green upgrade arrow floating above a building
        arrowRect(b) {
            const sp = this.spriteOf(b); A.maskOf(sp);
            const c = this.centerOf(b);
            return { x: c.x, y: c.y + sp.bbox.y0 - 12, r: 9 };
        }
        arrowAtScreen(sx, sy) {
            if (!this.settings.hints) return null;
            const w = this.screenToWorld(sx, sy);
            for (const b of this.buildings) {
                if (!this.upgradeReady(b)) continue;
                const r = this.arrowRect(b);
                const pad = (this.input.touch ? 8 : 3) / this.cam.zoom;
                if (Math.hypot(w.x - r.x, w.y - r.y) <= r.r + pad) return b;
            }
            return null;
        }
        // The coin bubble floating over a mine or well that is ready to tap
        bubbleRect(b) {
            const sp = this.spriteOf(b); A.maskOf(sp);
            const c = this.centerOf(b);
            return { x: c.x - 18, y: c.y + sp.bbox.y0 - 2, r: 9 };
        }
        bubbleAtScreen(sx, sy) {
            const w = this.screenToWorld(sx, sy);
            for (const b of this.buildings) {
                if (!this.bubbleShown(b)) continue;
                const r = this.bubbleRect(b);
                if (Math.hypot(w.x - r.x, w.y - r.y) <= r.r + (this.input.touch ? 9 : 4) / this.cam.zoom) return b;
            }
            return null;
        }
        upgradeReady(b) {
            const def = BLD[b.type];
            return b.level < def.maxLevel && !this.thCapped(b) && !!def.upgradeCost && this.canAfford(this.upgradeCostOf(b));
        }

        // ---------- input ----------
        bindInput() {
            const c = this.canvas;
            const DRAG = 7;
            const getPos = (e) => {
                const r = c.getBoundingClientRect();
                const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
                return { x: (e.clientX ?? (t && t.clientX) ?? 0) - r.left, y: (e.clientY ?? (t && t.clientY) ?? 0) - r.top };
            };
            const goblinAt = (x, y) => {
                if (!this.goblin) return false;
                const w = this.screenToWorld(x, y), g = this.goblin;
                return Math.hypot(w.x - g.x, w.y - (g.y - 14)) <= (this.input.touch ? 34 : 24);
            };
            // walk every tile between the last sample and this one so a quick drag never leaves gaps
            const paintAt = (x, y) => {
                const t = this.screenToTile(x, y);
                const L = this.input.lastPaint;
                if (L && L.tx === t.tx && L.ty === t.ty) return;
                this.input.lastPaint = { tx: t.tx, ty: t.ty };
                if (!this.buildMode) return;
                for (const p of this.lineTiles(L || t, t)) {
                    if (!this.buildMode) return;
                    if (L && p.tx === L.tx && p.ty === L.ty) continue;
                    if (!this.canBuildHere(this.buildMode, p.tx, p.ty)) continue;
                    if (!this.canAfford(this.buildCost(this.buildMode))) { if (!this.input.paintWarned) { this.input.paintWarned = true; this.audio.error(); this.toast('Not enough resources to keep painting', 'warn'); } return; }
                    this.placeBuilding(this.buildMode, p.tx, p.ty, true);
                }
            };

            const onDown = (e, touch) => {
                if (e.button !== undefined && e.button !== 0) return;
                const p = getPos(e);
                const I = this.input;
                I.touch = !!touch; I.paintWarned = false;
                I.down = true; I.drag = false; I.dragMove = false; I.paint = false; I.sel = false; I.gdrag = false; I.gfollow = false; I.lastPaint = null;
                I.downX = I.lastX = I.x = p.x; I.downY = I.lastY = I.y = p.y;
                I.shift = !!e.shiftKey;
                this.audio.ensure();
                I.downTarget = null;
                if (this.gmove && this.gmove.follow) { I.gfollow = true; this.updateHover(); return; }      // the carried group lands where you let go
                if (this.selectMode) {
                    const t = this.screenToTile(p.x, p.y), o = this.buildingAt(t.tx, t.ty);
                    // grabbing a picked building carries the whole group
                    if (o && this.group.includes(o)) { this.gmove = { grab: { tx: t.tx, ty: t.ty } }; I.gdrag = true; this.updateHover(); return; }
                    I.sel = true;
                    this.selectDrag = { a: { tx: t.tx, ty: t.ty }, b: { tx: t.tx, ty: t.ty }, box: !!e.shiftKey, add: !!(e.ctrlKey || e.metaKey) || this.selectAdd };
                    this.updateHover(); return;
                }
                if (this.buildMode && BLD[this.buildMode].drag) { I.paint = true; this.updateHover(); paintAt(p.x, p.y); return; }
                if (this.buildMode || this.spellMode || this.moveMode) return;
                if (goblinAt(p.x, p.y)) { I.downTarget = 'goblin'; return; }
                const bb = this.bubbleAtScreen(p.x, p.y);
                if (bb) { I.downTarget = 'bubble'; I.downBuilding = bb; return; }
                const ab = this.arrowAtScreen(p.x, p.y);
                if (ab) { I.downTarget = 'arrow'; I.downBuilding = ab; return; }
                I.downBuilding = this.buildingAtScreen(p.x, p.y);
                I.downTarget = I.downBuilding ? 'building' : null;
            };
            const onMove = (e) => {
                const p = getPos(e);
                const I = this.input;
                I.x = p.x; I.y = p.y;
                if (I.down) {
                    const dist = Math.hypot(p.x - I.downX, p.y - I.downY);
                    if (I.paint) { this.updateHover(); paintAt(p.x, p.y); return; }
                    if (I.gdrag || I.gfollow) { this.updateHover(); return; }
                    if (I.sel && this.selectDrag) { const t = this.screenToTile(p.x, p.y); this.selectDrag.b = { tx: t.tx, ty: t.ty }; this.updateHover(); return; }
                    if (!I.drag && dist > DRAG) {
                        I.drag = true;
                        // Dragging the building you already selected picks it up; anything else pans
                        if (I.downTarget === 'building' && I.downBuilding === this.selected && !this.buildMode && !this.spellMode && !this.moveMode && BLD[this.selected.type].cat !== 'core') {
                            I.dragMove = true; this.moveMode = this.selected; this.updateCanvasCursor();
                        }
                    }
                    if (I.drag && !I.dragMove) {
                        this.cam.x += p.x - I.lastX; this.cam.y += p.y - I.lastY; this._camMoved = true; this.clampCamera();
                    }
                    I.lastX = p.x; I.lastY = p.y;
                }
                this.updateHover();
            };
            const onUp = () => {
                const I = this.input;
                if (I.down) {
                    if (I.paint) { /* tiles were placed as the finger moved */ }
                    else if (I.sel) this.commitSelect();
                    else if (I.gdrag || I.gfollow) this.commitGroupMove();
                    else if (I.dragMove) this.commitMove();
                    else if (!I.drag) this.handleTap(I.x, I.y, I.shift);
                }
                I.down = false; I.drag = false; I.dragMove = false; I.paint = false; I.sel = false; I.gdrag = false; I.gfollow = false; I.downBuilding = null; I.downTarget = null;
            };

            c.addEventListener('mousedown', (e) => onDown(e, false));
            c.addEventListener('mousemove', onMove);
            window.addEventListener('mousemove', (e) => { if (this.input.down && this.input.drag) onMove(e); });
            window.addEventListener('mouseup', onUp);
            c.addEventListener('mouseleave', () => { this.hoverTile = null; this.hoverBuilding = null; this.rebuildHoverTip(); });

            let pinch = 0;
            const tinfo = (e) => {
                const r = c.getBoundingClientRect(), [a, b] = e.touches;
                return { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top };
            };
            c.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (e.touches.length === 2) {
                    if (this.input.dragMove) { this.moveMode = null; this.updateCanvasCursor(); }
                    this.input.down = this.input.drag = this.input.dragMove = this.input.paint = this.input.sel = this.input.gdrag = this.input.gfollow = false; this.selectDrag = null; if (this.gmove && !this.gmove.follow) this.gmove = null;
                    pinch = tinfo(e).dist; return;
                }
                if (e.touches.length === 1) onDown(e, true);
            }, { passive: false });
            c.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (e.touches.length === 2 && pinch > 0) { const t = tinfo(e); this.zoomBy(t.dist / pinch, t.x, t.y); pinch = t.dist; return; }
                onMove(e);
            }, { passive: false });
            c.addEventListener('touchend', (e) => { e.preventDefault(); if (e.touches.length < 2) pinch = 0; onUp(); }, { passive: false });
            c.addEventListener('touchcancel', () => { pinch = 0; this.input.down = false; onUp(); });

            c.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (this.buildMode || this.moveMode || this.spellMode || this.selectMode) { this.cancelModes(); return; }
                const r = c.getBoundingClientRect();
                const b = this.buildingAtScreen(e.clientX - r.left, e.clientY - r.top);
                if (b) this.selectBuilding(b);
            });
            c.addEventListener('wheel', (e) => {
                e.preventDefault();
                const r = c.getBoundingClientRect();
                this.zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
            }, { passive: false });

            window.addEventListener('keydown', (e) => this.onKey(e));
        }

        cancelModes() {
            this.setBuildMode(null); this.moveMode = null; this.spellMode = false; this.selectMode = false; this.selectDrag = null; this.group = []; this.gmove = null;
            this.updateGroupBar();
            this.updateCanvasCursor();
        }

        onKey(e) {
            const tag = e.target && e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const dialogOpen = document.getElementById('modal').classList.contains('open') || document.querySelector('.confirm-dialog.open');
            if (dialogOpen && e.key !== 'Escape') return;
            if (this.welcomeOpen) return;
            const k = e.key;
            if (e.repeat && 'frwulp xekz'.includes(k.toLowerCase()) && k !== 'Escape') return;
            if (k === 'Escape') {
                if (this.gmove) { this.gmove = null; this.input.gdrag = this.input.gfollow = false; this.toast('Move cancelled', 'warn'); this.updateGroupBar(); }
                else if (this.group.length) { this.group = []; this.updateGroupBar(); }
                else if (this.buildMode || this.moveMode || this.spellMode || this.selectMode) this.cancelModes();
                else if (document.getElementById('modal').classList.contains('open')) this.closeModal();
                else if (this.selected) this.deselect();
                else this.closePanel();
                return;
            }
            if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); this.deleteSelection(); return; }
            if (k.startsWith('Arrow')) { e.preventDefault(); this.nudgeSelection(({ ArrowUp: [-1, -1], ArrowDown: [1, 1], ArrowLeft: [-1, 1], ArrowRight: [1, -1] })[k]); return; }
            if (k === ' ' && tag !== 'BUTTON') { e.preventDefault(); this.collectAll(); }
            else if (k === '+' || k === '=') this.zoomBy(1.15, this.vw / 2, this.vh / 2);
            else if (k === '-' || k === '_') this.zoomBy(1 / 1.15, this.vw / 2, this.vh / 2);
            else if (k === '0') { this.cam.zoom = this.homeZoom(); this.centerCamera(); }
            else if (k === 'w' || k === 'W') this.activateWarCry();
            else if (k === 'l' || k === 'L') this.beginSpell();
            else if (k === 'f' || k === 'F') this.castFreeze();
            else if (k === 'p' || k === 'P') this.togglePause();
            else if (k === 'a' || k === 'A') this.toggleAutoCollect();
            else if (k === 'r' || k === 'R') this.rally();
            else if (k === 'm' || k === 'M') this.toggleSound();
            else if (k === 't' || k === 'T') this.setTheme(this.isLight() ? 'dark' : 'light');
            else if (k === 'u' || k === 'U') { if (this.selected) this.upgradeBuilding(this.selected); else this.upgradeCheapest(); }
            else if (k === 'x' || k === 'X') this.cycleSpeed();
            else if (k === 'n' || k === 'N') this.callRaid();
            else if (k === 'z' || k === 'Z') this.toggleRest();
            else if (k === 'k' || k === 'K') this.openRepair();
            else if (k === 'e' || k === 'E') this.toggleSelect();
            else if (k === 'v' || k === 'V') { const n = Object.keys(VIEWS); this.changeView(n[(n.indexOf(this.settings.view) + 1) % n.length]); }
            else if (k === '?' || k === 'h' || k === 'H') this.showHelp();
            else if (k >= '1' && k <= '5') this.openPanel(['build', 'upgrade', 'kingdom', 'coop', 'menu'][k - 1]);
        }

        updateHover() {
            const I = this.input;
            const t = this.screenToTile(I.x, I.y);
            this.hoverTile = (t.tx >= 0 && t.tx < CFG.gridW && t.ty >= 0 && t.ty < CFG.gridH) ? { tx: t.tx, ty: t.ty } : null;
            const prev = this.hoverBuilding;
            // while carrying something, hovering buildings only gets in the way
            this.hoverBuilding = (this.buildMode || this.spellMode || this.selectMode || I.touch && !I.down) ? null : (this.moveMode && I.dragMove ? null : this.buildingAtScreen(I.x, I.y));
            if (prev !== this.hoverBuilding || (this.hoverBuilding && this._hoverLevel !== this.hoverBuilding.level)) this.rebuildHoverTip();
            this.positionHoverTip();
            this.updateCanvasCursor();
        }

        handleTap(sx, sy, shift = false) {
            this.audio.ensure();
            const I = this.input;
            const t = this.screenToTile(sx, sy);

            if (this.spellMode) {
                if (this.res.gems < CFG.spellCost.gems) { this.toast('Not enough gems', 'warn'); this.spellMode = false; this.updateCanvasCursor(); return; }
                this.res.gems -= CFG.spellCost.gems;
                this.castLightning(t.tfx, t.tfy);
                this.spellMode = false; this.updateCanvasCursor(); this.updateUI();
                return;
            }
            if (this.buildMode) {
                if (this.canBuildHere(this.buildMode, t.tx, t.ty)) this.placeBuilding(this.buildMode, t.tx, t.ty);
                else { this.audio.error(); this.toast('Something is in the way', 'warn'); }
                return;
            }
            if (this.moveMode) { this.commitMove({ tx: t.tx, ty: t.ty }); return; }

            if (I.downTarget === 'goblin') { this.catchGoblin(); return; }
            if (I.downBuilding && !this.buildings.includes(I.downBuilding)) { I.downBuilding = null; I.downTarget = null; }
            if (I.downTarget === 'bubble' && I.downBuilding) { this.collectFrom(I.downBuilding); return; }
            if (I.downTarget === 'arrow' && I.downBuilding) { this.upgradeBuilding(I.downBuilding); return; }

            const b = I.downBuilding || this.buildingAtScreen(sx, sy);
            if (b) {
                const now = performance.now();
                const dbl = I.lastTapB === b && now - I.lastTapT < 340;
                I.lastTapB = b; I.lastTapT = now;
                if (shift || dbl) { this.selectBuilding(b, true); this.upgradeBuilding(b); return; }
                this.selectBuilding(b);
                if (this.bubbleReady(b)) this.collectFrom(b);
                return;
            }
            this.deselect();
        }

        selectBuilding(b, quiet = false) {
            if (this.panel && this.isNarrow && this.isNarrow()) this.closePanel();
            this.selected = b;
            if (this.vw < 600) {
                const c = this.centerOf(b), sy = this.cam.y + c.y * this.cam.zoom;
                if (sy > this.vh * 0.42) { this.cam.y += this.vh * 0.3 - sy; this._camMoved = true; this.clampCamera(); }
            }
            this.selPulse = 1;
            if (!quiet) this.audio.click();
            this.refreshSelection();
        }
        deselect() {
            if (!this.selected) return;
            this.selected = null;
            this.refreshSelection();
        }

        // ---------- building ops ----------
        placeBuilding(type, tx, ty, quiet = false) {
            const def = BLD[type];
            if (this.maxedOut(type)) {
                this.audio.error(); this.toast(this.limitText(type), 'warn');
                this.setBuildMode(null); return false;
            }
            const cost = this.buildCost(type);
            if (!this.canAfford(cost)) { this.audio.error(); this.toast('Not enough resources', 'warn'); return false; }
            this.spend(cost);
            const hp0 = this.hpFor(type, 1);
            const b = { id: Math.random().toString(36).slice(2, 9), type, tx, ty, level: 1, hp: hp0, maxHp: hp0, lastShot: 0, build: 0 };
            this.buildings.push(b);
            this.touchGrid();
            this.stats.built++;
            this.gainXp(def.decor ? 4 : (type === 'wall' ? 1 : 10));
            if (!quiet) this.audio.build(); else if (this.audio.gate('buildq', 90)) this.audio.build();
            const p = this.centerOf(b);
            const dustN = type === 'wall' ? 3 : 12, dustW = type === 'wall' ? 6 : 18;
            for (let i = 0; i < dustN; i++) this.particles.push({ x: p.x + rand(-dustW, dustW), y: p.y + rand(-4, 8), vx: rand(-30, 30), vy: rand(-45, -12), life: 0.8, max: 0.8, color: '#d8c8a8', size: rand(3, 6), kind: 'dust' });
            const singleton = this.maxedOut(type);
            if (singleton || !this.canAfford(this.buildCost(type))) {
                this.setBuildMode(null);
                if (!singleton) this.toast(`${def.name} built. Not enough for another.`, 'success');
                else this.toast(`${def.name} built! That is the most the Town Hall allows for now.`, 'success');
            } else {
                if (!quiet) this.toast(`${def.name} built!`, 'success');
                this.buildMenu();
            }
            this.recomputeRates(); this.updateUI(); this.checkAchievements();
            return true;
        }

        upgradeBuilding(b, quiet = false) {
            const def = BLD[b.type];
            if (!def.upgradeCost || b.level >= def.maxLevel) { if (!quiet) this.toast('Already max level', 'warn'); return false; }
            if (this.thCapped(b)) { if (!quiet) { this.audio.error(); this.toast(this.capText(b), 'warn'); } return false; }
            const cost = this.upgradeCostOf(b);
            if (!this.canAfford(cost)) { this.audio.error(); if (!quiet) this.toast('Not enough resources', 'warn'); return false; }
            this.spend(cost);
            const oldTier = tierOf(b.type, b.level);
            b.level++;
            b.maxHp = this.hpFor(b.type, b.level);
            b.hp = b.maxHp;                      // an upgrade is also a full repair
            b.upg = 1;
            this.stats.upgrades++;
            this.gainXp(12);
            if (!quiet) this.audio.upgrade(); else if (this.audio.gate('upq', 120)) this.audio.upgrade();
            const evolved = tierOf(b.type, b.level) !== oldTier;
            if (evolved) b.evolve = 1;
            const p = this.centerOf(b);
            const wall = b.type === 'wall';
            // a bulk upgrade of hundreds of walls must not bury the screen in sparks
            const room = this.particles.length < (quiet ? 140 : 300);
            if (room && !(quiet && wall && !evolved)) {
                const n = wall ? 6 : 18;
                for (let i = 0; i < n; i++) {
                    const a = i / n * TAU;
                    this.particles.push({ x: p.x, y: p.y - 10, vx: Math.cos(a) * 70, vy: Math.sin(a) * 40 - 40, life: 0.8, max: 0.8, color: i % 2 ? '#ffe066' : '#ffffff', size: rand(2, 4), kind: 'spark' });
                }
                this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#ffe066', size: wall ? 14 : 30, kind: 'ring' });
            }
            if (!(quiet && wall) && this.popups.length < 40) this.floatText(`Level ${b.level}`, p.x, p.y - (wall ? 30 : 56), '#ffe066');
            if (!quiet) this.toast(`${def.name} is now level ${b.level}`, 'success');
            // new tiers change the look: make it an event
            if (evolved) this.evolveFx(b, p, quiet);
            this.recomputeRates(); this.updateUI(); this.checkAchievements();
            if (b === this.selected || b.type === 'townhall') this.refreshSelection();
            if (b.type === 'townhall') { this.toast(`Town Hall ${b.level}: more buildings and higher levels unlocked`, 'success'); this.buildMenu(true); }
            if (this.modalBuilding === b) this.openBuildingModal(b);
            return true;
        }
        // A building steps up to its next look: light pillar, shock rings, a burst in the new tier's colour
        evolveFx(b, p, quiet) {
            const tier = tierOf(b.type, b.level), col = TIER_COL[tier - 1] || '#ffe066', wall = b.type === 'wall';
            if (this.popups.length < 40) this.floatText(wall && quiet ? '' : 'NEW LOOK', p.x, p.y - (wall ? 44 : 78), '#9af0ff');
            if (quiet && wall) return;
            const n = wall ? 14 : 40;
            for (let i = 0; i < n && this.particles.length < 380; i++) {
                const a = rand(0, TAU), sp = rand(60, 260);
                this.particles.push({ x: p.x, y: p.y - 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - rand(80, 200), life: rand(0.7, 1.4), max: 1.4, color: i % 3 ? col : '#ffffff', size: rand(2, 5), kind: i % 4 === 0 ? 'coin' : 'spark' });
            }
            this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.9, max: 0.9, color: col, size: wall ? 30 : 74, kind: 'ring' });
            this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#ffffff', size: wall ? 18 : 44, kind: 'ring' });
            if (!wall) { this.shake = Math.max(this.shake, 3.5); this.flash = Math.max(this.flash, 0.16); this.flashTint = '255,236,170'; }
            this.audio.levelup();
        }
        // Keep upgrading one building until it runs out of money or levels
        upgradeMax(b) {
            if (this.thCapped(b)) { this.audio.error(); this.toast(this.capText(b), 'warn'); return; }
            let n = 0;
            while (n < 60 && this.upgradeBuilding(b, true)) n++;
            if (n) this.toast(`${BLD[b.type].name} upgraded ${n} level${n > 1 ? 's' : ''}`, 'success');
            else this.toast('Not enough resources', 'warn');
        }
        // lower sorts first. Walls last; the Town Hall jumps the queue once storage is nearly full
        upgradePriority(b) {
            let v = this.upgradeCostScore(b);
            if (b.type === 'wall') v += 1e12;
            if (b.type === 'townhall' && this.res.gold >= this.cap() * 0.85) v *= 0.02;
            return v;
        }
        // what an upgrade will really cost: gold first, or the alternative (walls: elixir) when only that is affordable
        upgradeCostOf(b) {
            const def = BLD[b.type], c = def.upgradeCost(b.level);
            if (def.upgradeAlt && !this.canAfford(c)) { const a = def.upgradeAlt(b.level); if (this.canAfford(a)) return a; }
            return c;
        }
        upgradeCostScore(b) { const c = BLD[b.type].upgradeCost(b.level); return (c.gold || 0) + (c.elixir || 0) * 1.3 + (c.dark || 0) * 60; }
        upgradeCandidates(cat = 'all') {
            return this.buildings.filter(b => {
                const def = BLD[b.type];
                if (!def.upgradeCost || b.level >= def.maxLevel || this.thCapped(b)) return false;
                if (cat === 'economy') return def.cat === 'economy' || def.cat === 'core';
                if (cat === 'defense') return def.cat === 'defense';
                return true;
            // walls are cheap and numerous: they only get upgraded once nothing else is affordable
            }).sort((a, b) => this.upgradePriority(a) - this.upgradePriority(b));
        }
        upgradeCheapest(cat = 'all', quiet = false) {
            for (const b of this.upgradeCandidates(cat)) {
                if (this.canAfford(this.upgradeCostOf(b))) { return this.upgradeBuilding(b, quiet); }
            }
            if (!quiet) this.toast('Nothing affordable to upgrade yet', 'warn');
            return false;
        }
        // ---- upgrade the weakest: an upgrade heals fully, so spend on whatever is closest to dying, at a fair price ----
        // "fair" = no single upgrade costs more than weakSpendFrac of what you currently hold of each resource it needs
        priceIsFair(cost) {
            for (const k in cost) { if (k === 'gems') return false; if (cost[k] > (this.res[k] || 0) * CFG.weakSpendFrac) return false; }
            return true;
        }
        weakCandidates(maxFrac = 0.9) {
            return this.buildings.filter(b => {
                const d = BLD[b.type];
                return !d.decor && d.upgradeCost && b.level < d.maxLevel && !this.thCapped(b) && b.hp < b.maxHp * maxFrac;
            }).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        }
        weakUpgradable(maxFrac = 0.9) { return this.weakCandidates(maxFrac).filter(b => { const c = this.upgradeCostOf(b); return this.canAfford(c) && this.priceIsFair(c); }); }
        upgradeWeakest(quiet = false, limit = 60, maxFrac = 0.9) {
            let n = 0;
            for (const b of this.weakCandidates(maxFrac)) {
                if (n >= limit) break;
                const c = this.upgradeCostOf(b);
                if (!this.canAfford(c) || !this.priceIsFair(c)) continue;      // too dear for now: skip it, try the next weakest
                if (this.upgradeBuilding(b, true)) n++;
            }
            if (!quiet) {
                if (n) { this.toast(`Upgraded and healed ${n} building${n > 1 ? 's' : ''}, weakest first`, 'success'); this.audio.upgrade(); }
                else this.toast(this.weakCandidates(maxFrac).length ? 'The damaged ones cost too much for now. Try Repair, or wait for more gold.' : 'Nothing is badly damaged', 'warn');
            }
            return n;
        }
        upgradeAll(cat = 'all') {
            let n = 0;
            while (n < 80 && this.upgradeCheapest(cat, true)) n++;
            if (n) { this.toast(`Upgraded ${n} time${n > 1 ? 's' : ''}`, 'success'); this.audio.upgrade(); }
            else this.toast('Nothing affordable to upgrade yet', 'warn');
        }

        hpFor(type, level) { return Math.floor(BLD[type].baseHP * Math.pow(1.18, level - 1) * (1 + 0.2 * this.boon('masonry'))); }
        // after a health boon: new maximums, keeping each building's share of health
        refreshMaxHp() { for (const b of this.buildings) { const f = b.hp / b.maxHp; b.maxHp = this.hpFor(b.type, b.level); b.hp = b.maxHp * f; } }

        refundOf(b) { const r = {}, def = BLD[b.type]; for (const k in def.baseCost) r[k] = Math.floor(def.baseCost[k] * 0.5); return r; }
        sellBuilding(b) {
            const def = BLD[b.type];
            if (def.cat === 'core') return {};
            const refund = this.refundOf(b);
            for (const k in refund) this.addRes(k, refund[k]);
            this.removeBuilding(b);
            this.audio.coin();
            this.updateUI();
            return refund;
        }

        // Remove a batch of buildings with one grid rebuild (the row tool)
        removeMany(list) {
            const gone = new Set(list);
            this.buildings = this.buildings.filter(x => !gone.has(x));
            this.group = this.group.filter(x => !gone.has(x)); this.updateGroupBar();
            this.touchGrid();
            for (const e of this.enemies) if (gone.has(e.target)) e.target = null;
            if (gone.has(this.hoverBuilding)) { this.hoverBuilding = null; this.rebuildHoverTip(); }
            if (gone.has(this.selected)) { this.selected = null; this.refreshSelection(); }
            if (this.input.downBuilding && gone.has(this.input.downBuilding)) { this.input.downBuilding = null; this.input.downTarget = null; }
            if (this.modalBuilding && gone.has(this.modalBuilding)) this.closeModal();
            this.recomputeRates();
        }
        removeBuilding(b) {
            this.buildings = this.buildings.filter(x => x !== b);
            if (this.group.includes(b)) { this.group = this.group.filter(x => x !== b); this.updateGroupBar(); }
            this.touchGrid();
            for (const e of this.enemies) if (e.target === b) e.target = null;
            if (this.input.downBuilding === b) { this.input.downBuilding = null; this.input.downTarget = null; }
            if (this.hoverBuilding === b) { this.hoverBuilding = null; this.rebuildHoverTip(); }
            if (this.selected === b) { this.selected = null; this.refreshSelection(); }
            if (this.moveMode === b) { this.moveMode = null; this.updateCanvasCursor(); }
            if (this.modalBuilding === b) this.closeModal();
            this.recomputeRates();
        }

        startMove(b) {
            this.setBuildMode(null);
            this.moveMode = b; this.spellMode = false;
            this.updateCanvasCursor();
            this.toast('Tap an empty tile to move it there', 'warn');
        }
        commitMove(t = this.hoverTile) {
            const mb = this.moveMode;
            if (!mb) { this.updateCanvasCursor(); return; }
            this.moveMode = null;
            if (!t || t.tx < 0 || t.ty < 0 || t.tx >= CFG.gridW || t.ty >= CFG.gridH) { this.toast('Drop it on the grass', 'warn'); this.updateCanvasCursor(); return; }
            if (this.canBuildHere(mb.type, t.tx, t.ty, mb)) {
                mb.tx = t.tx; mb.ty = t.ty;
                this.touchGrid();
                this.audio.build();
                const p = this.centerOf(mb);
                for (let i = 0; i < 8; i++) this.particles.push({ x: p.x + rand(-10, 10), y: p.y + rand(-4, 6), vx: rand(-30, 30), vy: rand(-50, -15), life: 0.5, max: 0.5, color: '#d8c8a0', size: rand(2, 4), kind: 'dust' });
                this.refreshSelection();
            } else {
                const other = this.canPlace(mb.type, t.tx, t.ty, mb) ? null : this.swapPartner(mb, t.tx, t.ty);
                if (other && this.swapBuildings(mb, other)) { this.toast(`${BLD[mb.type].name} and ${BLD[other.type].name} swapped places`, 'success'); this.refreshSelection(); }
                else { this.audio.error(); this.toast(other ? 'No room to swap those two' : 'Cannot place it there', 'warn'); }
            }
            this.updateCanvasCursor();
        }

        // ---------- resources ----------
        canAfford(cost) { for (const k in cost) if ((this.res[k] || 0) < cost[k]) return false; return true; }
        spend(cost) { for (const k in cost) this.res[k] -= cost[k]; }
        cap() {
            const th = this.buildings.find(b => b.type === 'townhall');
            return (th ? BLD.townhall.provides(th.level).cap : 3000) + this.capBonus;
        }
        capFor(k) { return k === 'gems' ? Infinity : (k === 'dark' ? this.cap() * CFG.darkCapFrac : this.cap()); }
        addRes(k, amt) {
            const before = this.res[k] || 0;
            this.res[k] = Math.max(before, Math.min(this.capFor(k), before + amt));
            return this.res[k] - before;
        }
        resSymbol(k) { return U.resSymbol(k); }
        resColor(k) { return resColor(k); }

        boon(id) { return this.boons[id] || 0; }
        diff() { return DIFFICULTY[this.settings.difficulty] || DIFFICULTY.normal; }
        prodMult() { return (1 + 0.1 * this.perks.treasury) * (1 + this.prosperity); }
        towerMult() { return (1 + 0.08 * this.perks.steel) * (1 + 0.12 * this.boon('steel')) * (this.warCry.active ? 1.5 : 1); }

        recomputeRates() {
            const r = { gold: 0, elixir: 0, dark: 0, gems: 0 };
            this.capBonus = 0; this.goldMult = 1; this.xpMult = 1 + 0.1 * this.perks.study + 0.2 * this.boon('scholar'); this.rallyHeal = 0.2; this.waveGems = 1;
            let pros = 0;
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (def.production) { const p = def.production(b.level); for (const k in p) r[k] = (r[k] || 0) + p[k]; }
                if (def.provides && b.type !== 'townhall') {
                    const p = def.provides(b.level);
                    if (p.cap) this.capBonus += p.cap;
                    if (p.goldMult) this.goldMult += p.goldMult;
                    if (p.xpMult) this.xpMult += p.xpMult;
                    if (p.rallyMult) this.rallyHeal += p.rallyMult;
                    if (p.waveGems) this.waveGems = Math.max(this.waveGems, 1 + p.waveGems);
                    if (p.prosperity) pros += p.prosperity;
                }
            }
            this.prosperity = Math.min(CFG.prosperityCap, pros);
            const pm = this.prodMult();
            r.gold *= this.goldMult * pm * (1 + 0.15 * this.boon('rush'));
            r.elixir *= pm * (1 + 0.15 * this.boon('brew'));
            r.dark *= pm * (1 + 0.15 * this.boon('brew'));
            this.rates = r;
        }

        isNight() { return this.dayTime < 0.2 || this.dayTime > 0.8; }
        // 0 in daylight, 1 in deep night, smooth through dawn and dusk
        nightAmount() {
            const t = this.dayTime;
            if (t < 0.17 || t > 0.86) return 1;
            if (t < 0.31) return 1 - (t - 0.17) / 0.14;
            if (t > 0.72) return (t - 0.72) / 0.14;
            return 0;
        }
        // Resting (raids held back, nothing attacking): collectors tick over at half the raid-time rate
        resting() { return !this.wave.active && this.settings.raidStart === 'manual'; }
        restMult() { return this.resting() ? CFG.restRate : 1; }
        rateMult() { return this.boost.mult * (this.isNight() ? 1.25 : 1) * this.restMult(); }
        toggleRest() {
            if (this.wave.active) { this.audio.error(); this.toast('You cannot rest in the middle of a raid', 'warn'); return; }
            this.toggleRaidMode();
        }

        // ---------- combat ----------
        buildQueue(n) {
            const table = waveTable(n);
            const total = n === 1 ? 5 : n === 2 ? 7 : Math.min(4 + n * 2 + (n <= 8 ? 1 : 0), 60);
            const sum = table.reduce((s, e) => s + e.w, 0);
            const q = [];
            for (let i = 0; i < total; i++) {
                let r = Math.random() * sum, kind = table[0].kind;
                for (const e of table) { r -= e.w; if (r <= 0) { kind = e.kind; break; } }
                q.push(kind);
            }
            if (n % 10 === 0) { q.length = Math.max(4, Math.floor(total * 0.6)); q.unshift('golem'); if (n >= 20 && n % 20 === 0) q.unshift('pekka'); }
            return q;
        }

        // call the next raid now (also works with the countdown running)
        callRaid() {
            if (this.wave.active || this.gameOverShown || this.welcomeOpen || this.boonOpen || this.paused) return;
            this.audio.click();
            this.startWave();
        }
        toggleRaidMode() {
            this.settings.raidStart = this.settings.raidStart === 'manual' ? 'auto' : 'manual';
            this.syncToggles(); this.updateUI(); this.save();
            this.toast(this.settings.raidStart === 'manual' ? `Resting: no raids until you call one. Collectors work at ${Math.round(CFG.restRate * 100)}% while you rest.` : 'Raids start on their own when the timer ends', 'success');
        }
        startWave() {
            this.wave.number++;
            this.wave.active = true;
            this.wave.queue = (this.wave.next && this.wave.next.length) ? this.wave.next.slice() : this.buildQueue(this.wave.number);
            this.wave.total = this.wave.queue.length;
            this.wave.spawnLeft = this.wave.queue.length;
            this.wave.spawnCd = 0.8;
            this.wave.sides = (this.wave.nextSides && this.wave.nextSides.length) ? this.wave.nextSides : this.pickSides(this.wave.number);
            this.wave.nextSides = this.pickSides(this.wave.number + 1);
            this.wave.next = this.buildQueue(this.wave.number + 1);
            this.audio.wave();
            if (!this.tipsSeen.sides) { this.tipsSeen.sides = true; setTimeout(() => this.toast('Red arrows show which side the raid comes from. Put towers and walls there.', 'tip'), 1500); }
            const boss = this.wave.queue.includes('golem');
            this.toast(boss ? `Wave ${this.wave.number}: a Stone Golem approaches!` : `Wave ${this.wave.number}: ${this.wave.total} raiders incoming`, 'warn');
            this.showAlert(boss ? `BOSS WAVE ${this.wave.number}` : `WAVE ${this.wave.number}`, 3, boss);
        }

        // 'at' puts a summoned minion where its witch stands instead of on the map edge
        spawnEnemy(kind, at = null) {
            const T = ENEMY[kind];
            const sides = (this.wave.sides && this.wave.sides.length) ? this.wave.sides : [0, 1, 2, 3];
            const edge = sides[randi(0, sides.length)];
            const OUT = 2 * S;
            let tx, ty;
            if (at) { tx = at.tx - 0.5 + rand(-1, 1); ty = at.ty - 0.5 + rand(-1, 1); }
            else if (edge === 0) { tx = randi(0, CFG.gridW); ty = -OUT; }
            else if (edge === 1) { tx = CFG.gridW + OUT - 1; ty = randi(0, CFG.gridH); }
            else if (edge === 2) { tx = randi(0, CFG.gridW); ty = CFG.gridH + OUT - 1; }
            else                 { tx = -OUT; ty = randi(0, CFG.gridH); }
            const wv = this.wave.number;
            const early = Math.max(0, 1 - (wv - 1) / CFG.earlyWaves);          // 1 on wave 1, 0 from wave 15: the opening raids bite a little harder
            const hpScale = (1 + wv * 0.12 + wv * wv * 0.004) * (1 + CFG.earlyHp * early);      // gentle early, steeper once defenses snowball
            const dmgScale = (1 + wv * 0.03 + Math.max(0, wv - 10) * 0.02) * (1 + CFG.earlyDmg * early);
            const p = this.worldIso(tx + 0.5, ty + 0.5);
            const d = this.diff();
            this.enemies.push({
                kind, flying: !!T.flying, boss: !!T.boss, size: T.size, tx: tx + 0.5, ty: ty + 0.5, x: p.x, y: p.y, air: 0,
                hp: T.hp * hpScale * d.hp, maxHp: T.hp * hpScale * d.hp, dmg: T.dmg * dmgScale * d.dmg, spd: T.spd * S,
                ranged: !!T.reach, jump: !!T.jump, bomb: (T.bomb || 0) * S, splash: (T.splash || 0) * S,
                reach: T.reach ? T.reach * S : (T.flying ? 1.5 : (T.boss ? 1.8 : 1.05)),
                reward: { gold: T.gold, xp: T.xp }, target: null, attackCd: rand(0, 0.6), walk: rand(0, 6), wobble: rand(0, 6), dir: 1,
                off: { x: rand(-0.3, 0.3), y: rand(-0.3, 0.3) }, slow: 0, slowAmt: 0, hit: 0, atkAnim: 0, retarget: 0, summonCd: rand(2, 4),
            });
        }

        pickTarget(e) {
            const T = ENEMY[e.kind], pref = T.prefers;
            let best = null, bestD = Infinity;
            if (pref === 'wall') {           // Wall Breakers run for the nearest wall; with none left they behave like anyone else
                for (const b of this.buildings) {
                    if (b.type !== 'wall' || b.hp <= 0) continue;
                    const d = Math.hypot(b.tx + 0.5 - e.tx, b.ty + 0.5 - e.ty);
                    if (d < bestD) { bestD = d; best = b; }
                }
                if (best) return best;
            }
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (def.decor || b.hp <= 0 || b.type === 'wall') continue;
                const s = def.size, cx = b.tx + s / 2, cy = b.ty + s / 2;
                let d = Math.hypot(cx - e.tx, cy - e.ty);
                if (pref === 'economy' && (def.cat === 'economy' || def.cat === 'core')) d *= 0.55;
                else if (pref === 'defense' && def.defense) d *= 0.55;
                else if (pref === 'core' && b.type === 'townhall') d *= 0.3;
                else if (b.type === 'townhall') d *= 0.9;
                if (d < bestD) { bestD = d; best = b; }
            }
            return best;
        }

        // Distance in tiles from a point to the edge of a building's footprint
        distToBuilding(x, y, b) {
            const s = BLD[b.type].size;
            const dx = Math.max(b.tx - x, 0, x - (b.tx + s));
            const dy = Math.max(b.ty - y, 0, y - (b.ty + s));
            return Math.hypot(dx, dy);
        }

        // Walking cost of every tile (open ground 1, wall chewed through, building chewed through, decoration solid).
        // Hog Riders hop walls, so they get a copy where walls cost nothing extra. Rebuilt whenever the grid changes.
        costGrid(jump) {
            const key = jump ? '_costJ' : '_cost';
            if (this[key] && this[key].ver === this.gridVer) return this[key];
            const W = CFG.gridW + MARGIN * 2, H = CFG.gridH + MARGIN * 2;
            const g = new Uint8Array(W * H).fill(1);
            for (const b of this.buildings) {
                const def = BLD[b.type], s = def.size;
                const c = def.decor ? 255 : (b.type === 'wall' ? (jump ? 1 : COST_WALL) : COST_BLDG);
                for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
                    const x = b.tx + dx, y = b.ty + dy;
                    if (x >= 0 && y >= 0 && x < CFG.gridW && y < CFG.gridH) g[(y + MARGIN) * W + (x + MARGIN)] = c;
                }
            }
            return (this[key] = { ver: this.gridVer, g, W, H });
        }

        // Cheapest walking cost from every tile to a target (Dial's bucket queue: all costs are small whole numbers).
        flowFor(target, jump = false) {
            const key = target.id + (jump ? 'j' : '');
            let f = this._flow.get(key);
            if (f && f.ver === this.gridVer) return f;
            const { g: cost, W, H } = this.costGrid(jump);
            const dist = new Float32Array(W * H).fill(Infinity);
            const NB = 19, buckets = Array.from({ length: NB }, () => []);
            let pending = 0;
            const s = BLD[target.type].size;
            for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) { const i = (target.ty + dy + MARGIN) * W + (target.tx + dx + MARGIN); dist[i] = 0; buckets[0].push(i); pending++; }
            for (let cur = 0; pending > 0; cur++) {
                const bk = buckets[cur % NB];
                while (bk.length) {
                    const i = bk.pop(); pending--;
                    if (dist[i] !== cur) continue;
                    const x = i % W, y = (i / W) | 0;
                    if (x > 0) { const j = i - 1, c = cost[j]; if (c !== 255 && cur + c < dist[j]) { dist[j] = cur + c; buckets[(cur + c) % NB].push(j); pending++; } }
                    if (x < W - 1) { const j = i + 1, c = cost[j]; if (c !== 255 && cur + c < dist[j]) { dist[j] = cur + c; buckets[(cur + c) % NB].push(j); pending++; } }
                    if (y > 0) { const j = i - W, c = cost[j]; if (c !== 255 && cur + c < dist[j]) { dist[j] = cur + c; buckets[(cur + c) % NB].push(j); pending++; } }
                    if (y < H - 1) { const j = i + W, c = cost[j]; if (c !== 255 && cur + c < dist[j]) { dist[j] = cur + c; buckets[(cur + c) % NB].push(j); pending++; } }
                }
            }
            f = { ver: this.gridVer, dist, W, MARGIN };
            this._flow.set(key, f);
            return f;
        }
        // The neighbouring tile with the lowest remaining cost, or null if boxed in
        nextStep(f, tx, ty, jump = false) {
            const { dist, W } = f;
            const at = (x, y) => (x < -MARGIN || y < -MARGIN || x >= CFG.gridW + MARGIN || y >= CFG.gridH + MARGIN) ? Infinity : dist[(y + MARGIN) * W + (x + MARGIN)];
            const solid = (x, y) => { const o = this.cell(x, y); return !!o && !(jump && o.type === 'wall'); };
            let best = null, bestD = at(tx, ty);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = tx + dx, ny = ty + dy;
                let d = at(nx, ny);
                if (dx && dy) {
                    if (solid(tx + dx, ty) || solid(tx, ty + dy)) continue;      // no cutting corners through walls
                    d += 0.4;
                }
                if (d < bestD) { bestD = d; best = { tx: nx, ty: ny }; }
            }
            return best;
        }

        enemyTick(dt) {
            if (this.occDirty) this.rebuildOcc();
            for (const e of this.enemies) {
                if (e.hp <= 0) continue;
                e.wobble += dt * 8;
                if (e.hit > 0) e.hit = Math.max(0, e.hit - dt * 4);
                if (e.atkAnim > 0) e.atkAnim = Math.max(0, e.atkAnim - dt * 3.5);
                if (e.slow > 0) e.slow -= dt;
                const spd = e.spd * (e.slow > 0 ? 1 - e.slowAmt : 1) * (1 - 0.08 * this.boon('chill'));
                e.retarget -= dt;
                if (!e.target || e.target.hp <= 0 || e.retarget <= 0) {
                    const t = this.pickTarget(e);
                    if (t !== e.target) e.target = t;
                    e.retarget = 2.5;
                }
                // a Witch keeps raising skeletons while she walks (never more than a handful at once)
                const T = ENEMY[e.kind];
                if (T.summons && this.wave.active) {
                    e.summonCd -= dt;
                    if (e.summonCd <= 0) {
                        e.summonCd = 7;
                        let alive = 0; for (const o of this.enemies) if (o.kind === T.summons && o.hp > 0) alive++;
                        if (alive < 8) for (let i = 0; i < 2; i++) this.spawnEnemy(T.summons, { tx: e.tx, ty: e.ty });
                        for (let i = 0; i < 6; i++) this.particles.push({ x: e.x, y: e.y - 6, vx: rand(-40, 40), vy: -rand(40, 110), life: 0.6, max: 0.6, color: '#b070ff', size: rand(2, 4), kind: 'spark' });
                    }
                }
                const tgt = e.target;
                let moveX = 0, moveY = 0, attack = null;
                if (!tgt) {
                    const dx = CFG.gridW / 2 - e.tx, dy = CFG.gridH / 2 - e.ty, d = Math.hypot(dx, dy) || 1;
                    moveX = dx / d; moveY = dy / d;
                } else {
                    const dB = this.distToBuilding(e.tx, e.ty, tgt);
                    const s = BLD[tgt.type].size;
                    if (dB <= e.reach) attack = tgt;
                    else if (e.flying) {
                        const dx = tgt.tx + s / 2 - e.tx, dy = tgt.ty + s / 2 - e.ty, d = Math.hypot(dx, dy) || 1;
                        moveX = dx / d; moveY = dy / d;
                    } else {
                        const f = this.flowFor(tgt, e.jump);
                        const step = this.nextStep(f, Math.floor(e.tx), Math.floor(e.ty), e.jump);
                        if (!step) {
                            const dx = tgt.tx + s / 2 - e.tx, dy = tgt.ty + s / 2 - e.ty, d = Math.hypot(dx, dy) || 1;
                            moveX = dx / d; moveY = dy / d;
                        } else {
                            const blocker = this.cell(step.tx, step.ty);
                            const cx = step.tx + 0.5 + e.off.x, cy = step.ty + 0.5 + e.off.y;
                            const dx = cx - e.tx, dy = cy - e.ty, d = Math.hypot(dx, dy) || 1;
                            const hops = blocker && e.jump && blocker.type === 'wall';       // a Hog Rider simply leaps the wall
                            if (blocker && blocker !== tgt && !hops && this.distToBuilding(e.tx, e.ty, blocker) < 0.9) attack = blocker;
                            else { moveX = dx / d; moveY = dy / d; }
                        }
                    }
                }
                if (attack) {
                    e.attackCd -= dt * (e.slow > 0 ? 1 - e.slowAmt * 0.7 : 1);
                    const s = BLD[attack.type].size;
                    const ddx = (attack.tx + s / 2) - e.tx, ddy = (attack.ty + s / 2) - e.ty;
                    e.dir = (ddx - ddy) >= 0 ? 1 : -1;
                    if (e.attackCd <= 0) {
                        e.attackCd = ATTACK_CD[e.kind] || 1.1;
                        e.atkAnim = 1;
                        this.enemyStrike(e, attack);
                    }
                } else {
                    e.tx += moveX * spd * dt; e.ty += moveY * spd * dt;
                    if (moveX - moveY) e.dir = (moveX - moveY) >= 0 ? 1 : -1;
                    e.walk += dt * spd / S * 5.2;
                }
            }
            // gentle separation so a wave doesn't collapse into one pixel
            const list = this.enemies, R2 = (0.35 * S) * (0.35 * S);
            for (let i = 0; i < list.length; i++) {
                const a = list[i]; if (a.hp <= 0 || a.flying) continue;
                for (let j = i + 1; j < list.length; j++) {
                    const b = list[j]; if (b.hp <= 0 || b.flying) continue;
                    const dx = a.tx - b.tx, dy = a.ty - b.ty, d2 = dx * dx + dy * dy;
                    if (d2 < R2 && d2 > 1e-6) { const d = Math.sqrt(d2), push = (0.35 * S - d) * 0.5 * Math.min(1, dt * 14); a.tx += dx / d * push; a.ty += dy / d * push; b.tx -= dx / d * push; b.ty -= dy / d * push; }
                }
            }
            for (const e of list) {
                const p = this.worldIso(e.tx, e.ty);
                e.x = p.x;
                if (e.flying) { e.air = 40 + Math.sin(e.wobble * 0.5) * 5; e.y = p.y - e.air; } else e.y = p.y;
            }
            compact(this.enemies, e => e.hp > 0);
        }

        enemyStrike(e, b) {
            if (e.bomb) { this.wallBreakerBlast(e); return; }
            if (e.ranged) {      // ranged: throw, shoot or cast something
                const from = { x: e.x, y: e.y - 14 }, c = this.centerOf(b);
                const type = ({ skeleton: 'bone', archer: 'earrow', wizard: 'fireorb', witch: 'darkorb' })[e.kind] || 'bone';
                this.projectiles.push({ type, x: from.x, y: from.y, sx: from.x, sy: from.y, tx: c.x, ty: c.y - 14, t: 0, dur: type === 'earrow' ? 0.3 : 0.45, arc: type === 'earrow' ? 10 : 26, building: b, dmg: e.dmg, splash: e.splash });
                this.audio.bow();
                return;
            }
            this.damageBuilding(b, e.dmg, e);
            if (e.splash) this.splashBuildings(b, e.dmg * 0.5, e.splash, e);       // balloons drop bombs that spill onto neighbours
        }
        // damage everything standing near a building, not just the one that was hit
        splashBuildings(centre, dmg, radius, e) {
            const s0 = BLD[centre.type].size, cx = centre.tx + s0 / 2, cy = centre.ty + s0 / 2;
            for (const o of this.buildings.slice()) {
                if (o === centre || o.hp <= 0 || BLD[o.type].decor) continue;
                if (this.distToBuilding(cx, cy, o) <= radius) this.damageBuilding(o, dmg, e);
            }
        }
        // A Wall Breaker runs up, drops its barrel and is gone; walls take the worst of it
        wallBreakerBlast(e) {
            const p = { x: e.x, y: e.y };
            for (let i = 0; i < 26; i++) this.particles.push({ x: p.x + rand(-6, 6), y: p.y - rand(0, 12), vx: rand(-170, 170), vy: rand(-220, -30), life: 0.9, max: 0.9, color: i % 3 === 0 ? '#ffe070' : (i % 3 === 1 ? '#ff7a35' : '#4a4048'), size: rand(3, 6), kind: 'p' });
            this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#ffb050', size: 40, kind: 'ring' });
            this.shake = Math.max(this.shake, 3); this.audio.boom();
            for (const b of this.buildings.slice()) {
                if (b.hp <= 0 || BLD[b.type].decor) continue;
                if (this.distToBuilding(e.tx, e.ty, b) <= e.bomb) this.damageBuilding(b, b.type === 'wall' ? e.dmg : e.dmg * 0.3, e);
            }
            e.hp = 0; e.dead = true;        // spent: no loot, not a kill
        }

        damageBuilding(b, dmg, e) {
            if (BLD[b.type].decor || b.hp <= 0) return;
            b.hp -= dmg;
            b.hurt = 0.25; b.lastHit = this.tnow;
            const c = this.centerOf(b);
            if (this.popups.length < 28 && (b.type !== 'wall' || Math.random() < 0.35)) this.popups.push({ x: c.x + rand(-8, 8), y: c.y - (b.type === 'wall' ? 18 : 30), text: `-${Math.floor(dmg)}`, color: '#ff6a5a', life: 0.9, max: 0.9, size: 13 });
            this.audio.hit();
            if (this.particles.length < 300) for (let i = 0; i < 4; i++) this.particles.push({ x: c.x + rand(-10, 10), y: c.y - rand(8, 24), vx: rand(-60, 60), vy: rand(-70, -10), life: 0.45, max: 0.45, color: '#d8c8a8', size: rand(2, 3.5), kind: 'dust' });
            if (e && e.kind === 'golem') { this.shake = Math.max(this.shake, 4); }
            if (b.hp <= 0) this.destroyBuilding(b);
        }

        destroyBuilding(b) {
            const def = BLD[b.type];
            const p = this.centerOf(b);
            const wall = b.type === 'wall';
            for (let i = 0; i < (wall ? 8 : 34); i++) this.particles.push({ x: p.x + rand(-14, 14), y: p.y - rand(0, 20), vx: rand(-150, 150), vy: rand(-210, -40), life: 1.1, max: 1.1, color: i % 3 === 0 ? '#ff7a35' : (i % 3 === 1 ? '#8a6a44' : '#4a4048'), size: rand(3, 7) * (wall ? 0.7 : 1), kind: 'p' });
            if (!wall) for (let i = 0; i < 6; i++) this.particles.push({ x: p.x + rand(-12, 12), y: p.y - rand(4, 18), vx: rand(-12, 12), vy: rand(-40, -18), life: rand(1.4, 2.4), max: 2.4, color: 'rgba(60,56,64,', size: rand(6, 11), kind: 'smoke' });
            if (!wall) this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#ffb050', size: 46, kind: 'ring' });
            this.shake = Math.max(this.shake, wall ? 1.2 : 5);
            this.removeBuilding(b);
            if (!wall || this.audio.gate('wallboom', 140)) this.audio.boom();
            if (!wall) this.toast(`${def.name} destroyed!`, 'error');
            if (b.type === 'townhall') this.gameOver();
        }

        // ---------- towers ----------
        defenseTick(dt) {
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (!def.defense) continue;
                if (b.rec > 0) b.rec = Math.max(0, b.rec - dt * 5);
                if (b.fl > 0) b.fl = Math.max(0, b.fl - dt * 6);
                if (b.hurt > 0) b.hurt -= dt;
                b.lastShot -= dt;
                const d = def.defense(b.level);
                const c = { x: b.tx + def.size / 2, y: b.ty + def.size / 2 };
                let target = null, best = Infinity;
                for (const e of this.enemies) {
                    if (e.hp <= 0) continue;
                    if (e.flying && GROUND_ONLY.has(b.type)) continue;
                    if (!e.flying && AIR_ONLY.has(b.type)) continue;
                    const dd = Math.hypot(e.tx - c.x, e.ty - c.y);
                    if (d.minRange && dd < d.minRange * S) continue;          // a mortar cannot hit what is right beside it
                    if (dd <= d.range * S && dd < best) { best = dd; target = e; }
                }
                b.hasT = !!target;
                if (target) {
                    // swing the barrel / bow round toward the target
                    const mc = this.centerOf(b);
                    const ang = Math.atan2(target.y - 14 - (mc.y - 40), target.x - mc.x);
                    let diff = ang - (b.aim ?? 0.5);
                    while (diff > Math.PI) diff -= TAU; while (diff < -Math.PI) diff += TAU;
                    b.aim = (b.aim ?? 0.5) + diff * Math.min(1, dt * 12);
                    if (b.lastShot <= 0) { b.lastShot = d.cd / (1 + 0.1 * this.boon('haste')); this.fireAt(b, target, d); }
                }
            }
        }

        fireAt(b, target, d) {
            const def = BLD[b.type];
            const sp = this.spriteOf(b);
            const m = sp.anchors.find(a => a.name === 'mount');
            const c = this.centerOf(b);
            const mx = c.x + (m ? m.x : 0), my = c.y + (m ? m.y : -30);
            const dmg = d.dmg * this.towerMult();
            b.rec = 1; b.fl = 1;
            const tgtp = { x: target.x, y: target.y - (target.flying ? 0 : 12) };
            const type = b.type;
            if (type === 'tesla' || type === 'inferno') {
                // instant hit: a beam or a bolt that jumps to nearby raiders
                this.beams.push({ type, x0: mx, y0: my, x1: tgtp.x, y1: tgtp.y, life: type === 'inferno' ? 0.12 : 0.16, max: type === 'inferno' ? 0.12 : 0.16, seed: Math.random() * 99 });
                this.hitEnemy(target, dmg);
                if (type === 'tesla') {
                    let prev = target, n = 0;
                    for (const e of this.enemies) {
                        if (n >= 2 || e === target || e.hp <= 0) continue;
                        if (Math.hypot(e.tx - prev.tx, e.ty - prev.ty) < 1.8 * S) {
                            this.beams.push({ type, x0: prev.x, y0: prev.y - 12, x1: e.x, y1: e.y - 12, life: 0.16, max: 0.16, seed: Math.random() * 99 });
                            this.hitEnemy(e, dmg * 0.6); prev = e; n++;
                        }
                    }
                    this.audio.zap();
                } else if (this.audio.gate('inf', 160)) this.audio.beep(180, 0.1, 'sawtooth', 0.12, 0.6);
                return;
            }
            const spec = ({
                cannon:     { dur: 0.32, arc: 24, sound: 'shoot' },
                mortar:     { dur: 0.9, arc: 90, sound: 'boom' },
                archer:     { dur: 0.26, arc: 14, sound: 'bow' },
                xbow:       { dur: 0.2, arc: 6, sound: 'bow' },
                airdef:     { dur: 0.5, arc: 18, sound: 'shoot' },
                wizard:     { dur: 0.34, arc: 8, sound: 'zap' },
                frost:      { dur: 0.3, arc: 6, sound: 'zap' },
                clancastle: { dur: 0.4, arc: 16, sound: 'shoot' },
            })[type] || { dur: 0.3, arc: 10, sound: 'shoot' };
            this.projectiles.push({
                type, x: mx, y: my, sx: mx, sy: my, target, t: 0, dur: Math.max(0.12, spec.dur * (0.6 + Math.hypot(tgtp.x - mx, tgtp.y - my) / 520)),
                arc: spec.arc, dmg, splash: (d.splash || 0) * S, slow: d.slow || 0, tx: tgtp.x, ty: tgtp.y, trail: [],
            });
            this.audio[spec.sound]();
            // muzzle puff for the big guns
            if (type === 'cannon' || type === 'mortar') {
                this.particles.push({ x: mx + Math.cos(b.aim || 0) * 14, y: my + Math.sin(b.aim || 0) * 8, vx: rand(-10, 10), vy: rand(-26, -10), life: 0.8, max: 0.8, color: 'rgba(210,210,215,', size: rand(5, 8), kind: 'smoke' });
            }
        }

        projectileTick(dt) {
            for (const p of this.projectiles) {
                p.t += dt / (p.dur || 0.3);
                if (p.building) {                     // an enemy's thrown bone
                    const k = Math.min(1, p.t);
                    p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * p.arc;
                    if (p.t >= 1) {
                        p.dead = true;
                        if (p.building.hp > 0) {
                            this.damageBuilding(p.building, p.dmg);
                            if (p.splash) { this.splashBuildings(p.building, p.dmg * 0.5, p.splash); this.particles.push({ x: p.x, y: p.y + 4, vx: 0, vy: 0, life: 0.4, max: 0.4, color: p.type === 'darkorb' ? '#b070ff' : '#ff9a4a', size: p.splash / S * 24, kind: 'ring' }); }
                        }
                    }
                    continue;
                }
                const tg = p.target;
                if (tg && tg.hp > 0) { p.tx = tg.x; p.ty = tg.y - (tg.flying ? 0 : 12); }
                const k = Math.min(1, p.t);
                p.x = p.sx + (p.tx - p.sx) * k;
                p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * p.arc;
                if (p.trail) { p.trail.push(p.x, p.y); if (p.trail.length > 16) p.trail.splice(0, 2); }
                if (p.t >= 1) { p.dead = true; this.projectileImpact(p); }
            }
            compact(this.projectiles, p => !p.dead);
            for (const b of this.beams) b.life -= dt;
            compact(this.beams, b => b.life > 0);
        }

        projectileImpact(p) {
            const tg = p.target;
            if (p.splash > 0) {
                const cx = tg && tg.hp > 0 ? tg.tx : null;
                const ex = tg ? tg.tx : 0, ey = tg ? tg.ty : 0;
                for (const e of this.enemies) {
                    if (e.hp <= 0) continue;
                    const dd = Math.hypot(e.tx - ex, e.ty - ey);
                    if (dd <= p.splash) this.hitEnemy(e, e === tg ? p.dmg : p.dmg * 0.55);
                }
                if (cx === null && tg) { /* the target died on the way; the shell still bursts */ }
                this.particles.push({ x: p.x, y: p.y + 6, vx: 0, vy: 0, life: 0.45, max: 0.45, color: p.type === 'wizard' ? '#7ad8ff' : '#ffb050', size: p.splash / S * 24, kind: 'ring' });
                if (p.type === 'mortar') { this.shake = Math.max(this.shake, 2.4); this.audio.boom(); }
            } else if (tg && tg.hp > 0) {
                this.hitEnemy(tg, p.dmg);
                if (p.slow) { tg.slowAmt = Math.max(tg.slow > 0 ? tg.slowAmt : 0, p.slow); tg.slow = Math.max(tg.slow, 1.8); }
            }
            const col = ({ wizard: '#7ad8ff', frost: '#bff0ff', airdef: '#ffb050', mortar: '#ffb050', cannon: '#ffcf70' })[p.type] || '#ffe3a1';
            for (let i = 0; i < (p.splash ? 10 : 5); i++) {
                const a = rand(0, TAU), s = rand(30, 120);
                this.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rand(0.25, 0.5), max: 0.5, color: col, size: rand(2, 4), kind: p.type === 'frost' ? 'shard' : 'spark' });
            }
        }

        hitEnemy(e, dmg) {
            if (e.hp <= 0) return;
            e.hp -= dmg;
            e.hit = 1;
            this.popups.push({ x: e.x + rand(-6, 6), y: e.y - e.size * 2.2, text: `${Math.floor(dmg)}`, color: '#ffd9a0', life: 0.7, max: 0.7, size: 12 });
            if (e.hp <= 0) this.killEnemy(e);
        }

        killEnemy(e) {
            if (e.dead) return;
            e.dead = true;
            if (!ENEMY[e.kind].summoned) this.stats.kills++;
            if (e.boss) { this.stats.bosses++; this.res.gems += 5; this.floatText('+5 gems', e.x, e.y - 50, '#5cd8ff'); this.shake = Math.max(this.shake, 8); this.showAlert('GOLEM DEFEATED', 2.5); }
            const loot = Math.round(e.reward.gold * (1 + 0.25 * this.boon('loot')) * this.diff().loot);
            this.stats.goldEarned += this.addRes('gold', loot);
            this.gainXp(e.reward.xp);
            if (Math.random() < 0.03) { this.res.gems += 1; this.floatText('+1 gem', e.x, e.y - 40, '#5cd8ff'); }
            this.audio.die();
            for (let i = 0; i < (e.boss ? 40 : 12); i++) this.particles.push({ x: e.x, y: e.y - e.size, vx: rand(-130, 130), vy: rand(-170, -20), life: 0.8, max: 0.8, color: i % 2 ? '#ff7a35' : '#ffc857', size: rand(2.5, 5.5), kind: 'p' });
            this.particles.push({ x: e.x, y: e.y - e.size * 0.6, vx: 0, vy: -20, life: 0.9, max: 0.9, color: 'rgba(230,230,235,', size: e.size * 0.9, kind: 'smoke' });
            // a coin spills out
            this.particles.push({ x: e.x, y: e.y - e.size, vx: rand(-30, 30), vy: -rand(110, 150), life: 0.9, max: 0.9, color: '#ffd34a', size: 4, kind: 'coin' });
            this.floatText(`+${loot}`, e.x, e.y - e.size * 2.6, '#ffc857');
            this.checkAchievements();
        }

        // ---------- xp / level ----------
        gainXp(amt) {
            this.player.xp += amt * this.xpMult;
            let leveled = false;
            while (this.player.xp >= CFG.xpToLevel(this.player.level)) {
                this.player.xp -= CFG.xpToLevel(this.player.level);
                this.player.level++;
                leveled = true;
            }
            if (leveled) {
                this.audio.levelup();
                this.toast(`Level up! You are level ${this.player.level}`, 'success');
                this.res.gems += 1;
                this.showAlert(`LEVEL ${this.player.level}`, 2.5);
                const unlocked = Object.values(BLD).filter(d => d.unlockLevel === this.player.level).map(d => d.name);
                if (unlocked.length) setTimeout(() => this.toast(`Unlocked: ${unlocked.join(', ')}`, 'success'), 700);
                this.buildMenu(true);
                this.checkAchievements();
            }
        }

        // ---------- clicks, spells, abilities ----------
        // ---- tap-to-collect bubbles ----
        // Every mine and well fills a bubble over a few seconds. Tapping it pays a burst on top
        // of the steady income. Tapping several quickly builds a combo; Collect All is the
        // lazy version (no combo) and Auto-collect pays a bit less again.
        bubbleSec() { return CFG.bubbleSec / (1 + 0.2 * this.boon('bubble')); }
        bubbleReady(b) { return BLD[b.type].clickBonus && (b.charge ?? 0) >= this.bubbleSec(); }
        // A ready bubble only floats there for a few seconds, then hides. The coins stay waiting:
        // Collect, a tap on the building, or Auto-collect still pick them up. With Auto on you never see one.
        bubbleShown(b) { return this.bubbleReady(b) && !this.autoCollect && (b.shown ?? 1) > 0; }
        readyCount() { let n = 0; for (const b of this.buildings) if (this.bubbleReady(b)) n++; return n; }

        collectFrom(b, opt = {}) {
            const def = BLD[b.type];
            if (!def.clickBonus) return false;
            if (!this.bubbleReady(b)) {
                if (!opt.quiet) {
                    const p = this.centerOf(b);
                    this.floatText('Recharging…', p.x, p.y - 48, '#b8c4e8');
                    this.audio.error();
                }
                return false;
            }
            b.charge = 0; b.shown = undefined;
            const mult = opt.mult ?? 1;
            if (!opt.noCombo) {
                if (this.combo.time > 0) this.combo.count++; else this.combo.count = 1;
                this.combo.time = CFG.comboWindow;
                this.combo.mult = this.combo.count >= 10 ? 3 : this.combo.count >= 6 ? 2 : this.combo.count >= 3 ? 1.5 : 1;
                if (this.combo.count > this.stats.maxCombo) this.stats.maxCombo = this.combo.count;
            }
            const cm = opt.noCombo ? 1 : this.combo.mult;
            const p = this.centerOf(b);
            const bonus = def.clickBonus(b.level);
            let i = 0, firstKey = null;
            for (const [k, v] of Object.entries(bonus)) {
                const m = this.boost.mult * cm * mult * (k === 'gold' ? this.goldMult : 1) * this.prodMult();
                const amt = Math.floor(v * m);
                const got = this.addRes(k, amt);
                if (k === 'gold') this.stats.goldEarned += got;
                this.floatText(got === 0 ? 'FULL' : `+${fmt(amt)}`, p.x, p.y - 48 - i * 14, got === 0 ? '#ff9a6b' : this.resColor(k));
                if (!opt.quiet) for (let n = 0; n < 4; n++) this.particles.push({ x: p.x + rand(-8, 8), y: p.y - 24, vx: rand(-40, 40), vy: -rand(90, 150), life: 0.9, max: 0.9, color: this.resColor(k), size: 4, kind: 'coin' });
                firstKey = firstKey || k; i++;
            }
            if (!opt.noCombo && this.combo.count >= 3) { this.floatText(`COMBO x${this.combo.mult}`, p.x, p.y - 76, '#ffc857'); this.audio.combo(); }
            if (!opt.noCombo) this.stats.clicks++;
            this.stats.collects++;
            b.pop = 1;
            if (!opt.quiet) this.audio.coin();
            if (!opt.quiet) { this.pulseRes(firstKey); this.updateUI(); this.checkAchievements(); }
            return true;
        }

        collectAll(quiet = false, mult = 1) {
            let n = 0;
            for (const b of this.buildings) if (this.bubbleReady(b) && this.collectFrom(b, { noCombo: true, quiet: true, mult })) n++;
            if (n) {
                this.audio.coin(); this.pulseRes('gold');
                if (!quiet) this.toast(`Collected from ${n} building${n > 1 ? 's' : ''}`, 'success');
                this.checkAchievements();
            } else if (!quiet) {
                const full = this.res.gold >= this.cap() * 0.98;
                this.toast(full ? 'Storage is full. Upgrade the Town Hall or build a Vault.' : 'Nothing is ready yet. Wait for the coin bubbles.', 'warn');
            }
            this.updateUI();
        }

        beginSpell() {
            if (this.res.gems < CFG.spellCost.gems) { this.audio.error(); this.toast('A lightning strike costs 1 gem', 'warn'); return; }
            this.setBuildMode(null); this.moveMode = null; this.spellMode = true;
            this.updateCanvasCursor();
            this.toast('Tap the map to call down lightning', 'warn');
        }

        castLightning(tfx, tfy) {
            this.stats.spells++;
            this.flash = 0.55; this.shake = Math.max(this.shake, 6);
            this.audio.spell();
            const dmg = CFG.spellBaseDmg + this.player.level * 80;
            const c = this.worldIso(tfx, tfy);
            for (let i = 0; i < 50; i++) {
                const a = Math.random() * TAU, sp = rand(80, 400);
                this.particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 60, life: rand(0.4, 1.0), max: 1.0, color: i % 2 ? '#a6ecff' : '#ffffff', size: rand(2, 5), kind: 'spark' });
            }
            this.beams.push({ type: 'bolt', x0: c.x + rand(-30, 30), y0: c.y - 420, x1: c.x, y1: c.y, life: 0.3, max: 0.3, seed: Math.random() * 99 });
            this.particles.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#a6ecff', size: CFG.spellRadius * 30, kind: 'ring' });
            let hits = 0;
            for (const e of this.enemies) {
                if (e.hp <= 0) continue;
                if (Math.hypot(e.tx - tfx, e.ty - tfy) <= CFG.spellRadius * S) { this.hitEnemy(e, dmg); hits++; }
            }
            this.toast(hits ? `Lightning struck ${hits} raider${hits > 1 ? 's' : ''}` : 'Lightning struck nothing', hits ? 'success' : 'warn');
            this.checkAchievements();
        }

        rally() {
            if (this.rallyCd > 0) { this.audio.error(); this.toast(`Rally is recharging (${Math.ceil(this.rallyCd)}s)`, 'warn'); return; }
            this.rallyCd = 25;
            let healed = 0;
            for (const b of this.buildings) {
                if (BLD[b.type].decor) continue;
                b.lastShot = 0;
                const heal = Math.min(b.maxHp - b.hp, b.maxHp * this.rallyHeal);
                if (heal > 0) { b.hp += heal; healed++; const p = this.centerOf(b); this.particles.push({ x: p.x, y: p.y - 20, vx: 0, vy: -30, life: 0.8, max: 0.8, color: '#7adf6a', size: 5, kind: 'spark' }); }
            }
            this.audio.upgrade();
            this.toast(`Rally! ${healed} building${healed === 1 ? '' : 's'} repaired (+${Math.round(this.rallyHeal * 100)}%)`, 'success');
        }

        activateBoost() {
            if (this.res.gems < CFG.boostCost) { this.audio.error(); this.toast(`A boost costs ${CFG.boostCost} gems`, 'warn'); return; }
            this.res.gems -= CFG.boostCost;
            this.boost.mult = 2; this.boost.timeLeft = 60;
            this.audio.levelup();
            this.toast('Production doubled for 60 seconds', 'success');
            this.updateUI();
        }

        activateWarCry() {
            if (this.warCry.active) { this.toast('War Cry is already ringing out', 'warn'); return; }
            if (this.warCry.cooldown > 0) { this.audio.error(); this.toast(`War Cry is recharging (${Math.ceil(this.warCry.cooldown)}s)`, 'warn'); return; }
            if (!this.wave.active && !this.enemies.length) { this.audio.error(); this.toast('Save War Cry for a raid. It only lasts 15 seconds.', 'warn'); return; }
            this.warCry.active = true; this.warCry.timeLeft = 15; this.warCry.cooldown = 90;
            this.audio.spell();
            this.toast('War Cry! Towers hit 50% harder for 15s', 'success');
            this.showAlert('WAR CRY', 2);
        }

        togglePause() {
            if (this.gameOverShown) return;
            this.paused = !this.paused;
            if (!this.paused) this.lastTime = performance.now();
            this.syncToggles();
            this.toast(this.paused ? 'Paused' : 'Resumed', 'warn');
        }
        cycleSpeed() {
            this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
            this.syncToggles();
            this.toast(`Game speed x${this.speed}`, 'success');
        }

        // ---------- treasure goblin ----------
        spawnGoblin() {
            const side = randi(0, 4);
            const g = CFG.gridW, m = 2 * S, o = 3 * S, v = 1.9 * S;
            let a, b;
            if (side === 0) { a = [rand(m, g - m), -o]; b = [rand(m, g - m), g + o]; }
            else if (side === 1) { a = [g + o, rand(m, g - m)]; b = [-o, rand(m, g - m)]; }
            else if (side === 2) { a = [rand(m, g - m), g + o]; b = [rand(m, g - m), -o]; }
            else { a = [-o, rand(m, g - m)]; b = [g + o, rand(m, g - m)]; }
            const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
            this.goblin = { tx: a[0], ty: a[1], vx: dx / d * v, vy: dy / d * v, x: 0, y: 0, dir: 1, ph: 0, left: d / v + 1, gone: false };
            this.showAlert('A TREASURE GOBLIN!', 2.2);
            if (!this.tipsSeen.goblin) { this.tipsSeen.goblin = true; this.toast('Tap the Treasure Goblin before it escapes: gold and gems!', 'tip'); }
            this.audio.beep(1568, 0.12, 'triangle', 0.3); setTimeout(() => this.audio.beep(2093, 0.16, 'triangle', 0.3), 120);
        }
        goblinTick(dt) {
            const gb = this.goblin;
            if (!gb) {
                if (this.wave.active) return;
                this.goblinTimer -= dt;
                if (this.goblinTimer <= 0) { this.spawnGoblin(); this.goblinTimer = rand(130, 230); }
                return;
            }
            gb.tx += gb.vx * dt; gb.ty += gb.vy * dt; gb.left -= dt; gb.ph += dt * 9;
            gb.dir = (gb.vx - gb.vy) >= 0 ? 1 : -1;
            const p = this.worldIso(gb.tx, gb.ty);
            gb.x = p.x; gb.y = p.y - Math.abs(Math.sin(gb.ph)) * 4;
            if (Math.random() < dt * 14) this.particles.push({ x: gb.x + rand(-6, 6), y: gb.y - rand(6, 26), vx: rand(-14, 14), vy: rand(-30, -8), life: 0.7, max: 0.7, color: '#ffe066', size: rand(1.5, 3), kind: 'spark' });
            if (gb.left <= 0) { this.goblin = null; this.toast('The Treasure Goblin got away', 'warn'); }
        }
        catchGoblin() {
            const gb = this.goblin; if (!gb) return;
            const gold = Math.max(600, Math.floor((this.rates.gold + this.rates.elixir) * 60 * this.rateMult()));
            const got = this.addRes('gold', gold);
            this.stats.goldEarned += got;
            this.stats.goblins++;
            const gems = 1 + (Math.random() < 0.3 ? 1 : 0);
            this.res.gems += gems;
            for (let i = 0; i < 40; i++) this.particles.push({ x: gb.x, y: gb.y - 14, vx: rand(-140, 140), vy: -rand(80, 240), life: 1.1, max: 1.1, color: i % 4 ? '#ffd34a' : '#5cd8ff', size: rand(3, 5), kind: 'coin' });
            this.floatText(got > 0 ? `+${fmt(got)}` : 'STORAGE FULL', gb.x, gb.y - 40, '#ffc857');
            this.floatText(`+${gems} gem${gems > 1 ? 's' : ''}`, gb.x, gb.y - 60, '#5cd8ff');
            this.audio.coin(); this.audio.levelup();
            this.goblin = null;
            this.toast('Caught the Treasure Goblin!', 'success');
            this.updateUI(); this.checkAchievements();
        }

        // ---------- quests ----------
        questKind(q) { return QUEST_KINDS.find(k => k.id === q.kind); }
        newQuest(excluding) {
            const lv = this.player.level;
            const pool = QUEST_KINDS.filter(k => !excluding.includes(k.id));
            const kind = pool[randi(0, pool.length)];
            let target = Math.max(kind.min, Math.round(kind.base + kind.per * lv));
            if (kind.big) target = Math.round(target / 100) * 100;
            else if (target > 20) target = Math.round(target / 5) * 5;
            return { kind: kind.id, target, start: this.stats[kind.stat] || 0, gems: 2 + Math.min(4, Math.floor(lv / 5)), done: false };
        }
        fillQuests() {
            while (this.quests.length < 3) this.quests.push(this.newQuest(this.quests.map(q => q.kind)));
        }
        questProgress(q) { return Math.max(0, (this.stats[this.questKind(q).stat] || 0) - q.start); }
        checkQuests() {
            let any = false;
            for (const q of this.quests) {
                if (!q.done && this.questProgress(q) >= q.target) { q.done = true; any = true; this.toast(`Quest done: ${this.questKind(q).text(q.target)}`, 'success'); this.audio.levelup(); }
            }
            if (any) this.updateUI();
        }
        claimQuest(i) {
            const q = this.quests[i];
            if (!q || !q.done) return;
            this.res.gems += q.gems;
            this.gainXp(40);
            this.floatText(`+${q.gems} gems`, this.vw / 2, 0, '#5cd8ff');
            this.audio.coin();
            this.toast(`Quest reward: ${q.gems} gems`, 'success');
            this.quests[i] = this.newQuest(this.quests.filter((_, j) => j !== i).map(x => x.kind));
            this.updateUI();
        }

        // ---------- ascension ----------
        // waves you have actually beaten (the wave in progress does not count yet)
        wavesSurvived() { return Math.max(0, this.wave.active ? this.wave.number - 1 : this.wave.number); }
        ascendGain() {
            const w = this.wavesSurvived();
            return Math.max(0, Math.floor((w / 3 + this.player.level / 4 + this.stats.upgrades / 60) * Math.min(this.reignCrowns, this.diff().crowns)));
        }
        canAscend() { return this.wavesSurvived() >= CFG.ascendMinWave; }
        perkRank(k) { return this.perks[k] || 0; }
        buyPerk(k) {
            const P = PERKS[k], r = this.perkRank(k), cost = K.data.perkCost(r);
            if (r >= P.max) return;
            if (this.crowns < cost) { this.audio.error(); this.toast('Not enough crowns', 'warn'); return; }
            this.crowns -= cost; this.perks[k] = r + 1;
            this.audio.upgrade();
            this.recomputeRates(); this.updateUI(); this.save();
        }
        // skipGain: a fallen kingdom below the ascension threshold starts a new reign with no crowns,
        // but keeps everything permanent
        ascend(skipGain = false) {
            clearTimeout(this._boonTimer);
            this.cancelModes();
            this.combo = { count: 0, time: 0, mult: 1 };
            const gain = skipGain ? 0 : this.ascendGain();
            this.crowns += gain; this.crownsEver += gain; if (!skipGain) this.ascensions++;
            // a fresh reign: kingdom, wave and level restart; crowns, perks, achievements and lifetime stats stay
            this.res = { gold: 500 + 500 * this.perks.headstart, elixir: 150, dark: 0, gems: this.res.gems + (skipGain ? 0 : 2) };
            this.reignCrowns = this.diff().crowns; this.pendingBoon = false;
            this.player.level = 1; this.player.xp = 0;
            this.buildings = []; this.enemies = []; this.projectiles = []; this.beams = []; this.goblin = null;
            this.boons = {};
            this.wave = { number: 0, timer: 120, active: false, spawnLeft: 0, spawnCd: 0, queue: [], next: [] };
            this.dayTime = 0.25; this.dayCount = 1;
            this.boost = { mult: 1, timeLeft: 0 }; this.warCry = { active: false, timeLeft: 0, cooldown: 0 };
            this.selected = null; this.hoverBuilding = null; this.gameOverShown = false; this.paused = false;
            this.quests = []; this.fillQuests();
            this.placeInitial();
            this.wave.next = this.buildQueue(1); this.wave.nextSides = this.pickSides(1);
            this.checkAchievements();
            this.buildMenu(true); this.refreshSelection(); this.updateUI();
            this.centerCamera();
            this.showAlert(`REIGN ${this.ascensions + 1} BEGINS`, 3.5);
            this.toast(skipGain ? 'A new reign begins. Crowns and perks are safe.' : `Ascended! +${gain} crown${gain === 1 ? '' : 's'}`, 'success');
            this.audio.levelup();
            this.closeModal(); this.closePanel();
            this.save();
        }

        // ---------- achievements ----------
        checkAchievements() {
            for (const a of ACHS) {
                if (this.achievements[a.id]) continue;
                if (a.check(this)) {
                    this.achievements[a.id] = true;
                    this.res.gems += 3;
                    this.toast(`Achievement: ${a.name}  +3 gems`, 'success');
                    this.audio.levelup();
                }
            }
            this.checkQuests();
        }

        // ---------- game over ----------
        gameOver() {
            if (this.gameOverShown) return;
            this.showAlert('KINGDOM FALLEN', 4);
            if (this.wave.active) this.wave.number = Math.max(0, this.wave.number - 1);    // the raid that broke you is not survived
            this.wave.active = false; this.wave.spawnLeft = 0; this.wave.timer = CFG.waveBaseSec;
            this.enemies = []; this.projectiles = [];
            this.gameOverShown = true; this.paused = true;
            setTimeout(() => {
                this.showConfirm({
                    title: 'Kingdom Fallen', icon: 'skull',
                    body: `Your Town Hall fell on <b>Day ${this.dayCount}</b>, <b>Wave ${this.wave.number}</b>.<br><br>${this.canAscend() ? `You can still <b>Ascend</b> from the menu to keep the ${this.ascendGain()} crowns you earned.<br><br>` : ''}Raise a new banner and rebuild?`,
                    yesText: 'Rebuild', noText: 'Not yet', danger: true,
                    onYes: () => this.ascend(!this.canAscend()),
                    onNo: () => {
                        this.wave.timer = 60; this.gameOverShown = false; this.paused = false;
                        this.toast('60 seconds of peace. Rebuild your Town Hall.', 'warn');
                        this.buildCat = 'core'; this.openPanel('build');
                    },
                });
            }, 1800);
        }

        // ---------- main loop ----------
        loop(ts) {
            let elapsed = (ts - this.lastTime) / 1000;
            this.lastTime = ts;
            if (!this.paused && elapsed > 0) {
                if (elapsed > CFG.catchUpMaxSec) { this.applyOfflineEarnings(elapsed - CFG.catchUpMaxSec); elapsed = CFG.catchUpMaxSec; }
                elapsed *= this.speed;
                while (elapsed > 0) { const dt = Math.min(elapsed, 0.1); this.update(dt); elapsed -= dt; }
            } else this.tnow += Math.max(0, Math.min(elapsed, 0.1)) * 0;
            this.render();
            requestAnimationFrame((t) => this.loop(t));
        }

        update(dt) {
            this.tnow += dt;
            this.stats.playTime += dt;
            this.dayTime += dt / CFG.dayLengthSec;
            if (this.dayTime >= 1) { this.dayTime -= 1; this.dayCount++; }
            if (this.occDirty) this.rebuildOcc();

            const rm = this.rateMult();
            this.stats.goldEarned += this.addRes('gold', this.rates.gold * dt * rm);
            this.addRes('elixir', this.rates.elixir * dt * rm);
            this.addRes('dark', this.rates.dark * dt * rm);
            if (this.rates.gems > 0) { this.gemAcc += this.rates.gems * dt * this.boost.mult * this.restMult(); if (this.gemAcc >= 1) { const n = Math.floor(this.gemAcc); this.gemAcc -= n; this.res.gems += n; this.toast(`The Gem Quarry found ${n} gem${n > 1 ? 's' : ''}`, 'success'); } }

            if (this.boost.timeLeft > 0) { this.boost.timeLeft -= dt; if (this.boost.timeLeft <= 0) { this.boost.mult = 1; this.toast('Boost ended', 'warn'); } }
            if (this.warCry.active) { this.warCry.timeLeft -= dt; if (this.warCry.timeLeft <= 0) { this.warCry.active = false; this.toast('War Cry ended', 'warn'); } }
            if (this.warCry.cooldown > 0) this.warCry.cooldown -= dt;
            if (this.rallyCd > 0) this.rallyCd -= dt;
            if (this.combo.time > 0) { this.combo.time -= dt; if (this.combo.time <= 0) { this.combo.count = 0; this.combo.mult = 1; } }

            for (const b of this.buildings) {
                if (b.build < 1) b.build = Math.min(1, (b.build ?? 1) + dt * 2.2);
                if (b.upg > 0) b.upg = Math.max(0, b.upg - dt * 2.2);
                if (b.evolve > 0) b.evolve = Math.max(0, b.evolve - dt * 0.75);
                if (b.pop > 0) b.pop = Math.max(0, b.pop - dt * 5);
                if (b.hurt > 0) b.hurt -= dt;
                // slow self-repair, but only once the building has been left alone for a few seconds
                if (b.hp < b.maxHp && b.hp > 0 && this.tnow - (b.lastHit ?? -99) > CFG.regenDelaySec && !BLD[b.type].decor) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * CFG.regenPerSec * dt);
                if (BLD[b.type].clickBonus && b.build >= 1) {
                    const sec = this.bubbleSec();
                    b.charge = Math.min(sec, (b.charge ?? rand(0, sec)) + dt * (this.boost.timeLeft > 0 ? 1.5 : 1) * this.restMult());
                    if (b.charge >= sec) {
                        // the first goal needs the bubble to stay put until it has been tapped
                        const hold = this.tutCurrent && this.tutCurrent() && this.tutCurrent().id === 'tap';
                        if (b.shown === undefined) b.shown = CFG.bubbleShowSec; else if (b.shown > 0 && !hold) b.shown -= dt;
                    } else b.shown = undefined;
                }
            }

            if (this.wave.active) {
                if (this.wave.spawnLeft > 0) {
                    this.wave.spawnCd -= dt;
                    if (this.wave.spawnCd <= 0) { this.spawnEnemy(this.wave.queue[this.wave.total - this.wave.spawnLeft] || 'goblin'); this.wave.spawnLeft--; this.wave.spawnCd = rand(0.6, 1.2); }
                }
                // a raider stuck outside tower range must not hold the next wave hostage forever
                if (this.wave.spawnLeft <= 0 && this.enemies.length > 0) {
                    this.wave.stall = (this.wave.stall || 0) + dt;
                    if (this.wave.stall > 60) {
                        if (!this.wave.stallWarned) { this.wave.stallWarned = true; this.toast('The last raiders lose heart and flee', 'warn'); }
                        for (const e of this.enemies) if (e.hp > 0) { e.hp -= e.maxHp * 0.05 * dt; if (e.hp <= 0) this.killEnemy(e); }
                    }
                } else this.wave.stall = 0;
                if (this.wave.spawnLeft <= 0 && this.enemies.length === 0) {
                    this.wave.stall = 0; this.wave.stallWarned = false;
                    this.wave.active = false;
                    this.wave.timer = Math.max(CFG.waveMinSec, CFG.waveBaseSec - this.wave.number * 2);
                    this.stats.wavesCleared++;
                    const g = this.waveGems * (this.wave.number % 10 === 0 ? 3 : 1);
                    this.res.gems += g;
                    this.gainXp(25 + this.wave.number * 5);
                    this.toast(`Wave ${this.wave.number} cleared  +${g} gems`, 'success');
                    this.showAlert('WAVE CLEARED', 2);
                    this.checkAchievements();
                    this.pendingBoon = true;
                    clearTimeout(this._boonTimer);
                    this._boonTimer = setTimeout(() => this.offerPendingBoon(), 1100);
                }
            } else {
                // in manual mode the raid waits until the player calls it
                if (this.settings.raidStart !== 'manual') {
                    this.wave.timer -= dt;
                    if (this.wave.timer <= 0) this.startWave();
                }
            }

            this.defenseTick(dt);
            this.enemyTick(dt);
            this.projectileTick(dt);
            this.goblinTick(dt);
            this.updateWeather(dt);

            if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
            for (const p of this.particles) {
                p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.kind === 'smoke') p.vy *= 0.985; else if (p.kind !== 'ring') p.vy += 300 * dt;
                p.life -= dt;
            }
            compact(this.particles, alive);
            for (const p of this.popups) { p.y -= 38 * dt; p.life -= dt; }
            compact(this.popups, alive);

            if (this.alertTimer > 0) { this.alertTimer -= dt; if (this.alertTimer <= 0) this.hideAlert(); }
            if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 2); if (this.flash === 0) this.flashTint = null; }
            if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 18);
            if (this.selPulse > 0) this.selPulse = Math.max(0, this.selPulse - dt * 0.8);

            if (this.autoCollect) { this._autoCollectAcc += dt; if (this._autoCollectAcc >= 5) { this._autoCollectAcc = 0; this.collectAll(true, CFG.autoCollectRate); } }
            if (this.settings.autoUpgrade !== 'off') {
                this._autoUpAcc += dt;
                if (this._autoUpAcc >= 1.5) { this._autoUpAcc = 0; if (this.settings.autoUpgrade === 'weakest') this.upgradeWeakest(true, 2, 0.6); else this.upgradeCheapest(this.settings.autoUpgrade, true); }
            }

            this._uiAcc = (this._uiAcc || 0) + dt;
            if (this._uiAcc >= 0.1) { this._uiAcc = 0; this.updateUI(); }
            this._tipAcc = (this._tipAcc || 0) + dt;
            if (this._tipAcc >= 0.5) { this._tipAcc = 0; this.tutCheck(); this.tipCheck(); this.applyRepairFund(); }
        }

        // ---------- rendering ----------
        render() {
            const g = this.ctx;
            const t = this.tnow;
            g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            g.fillStyle = '#2f5a28';
            g.fillRect(0, 0, this.vw, this.vh);
            this.ensureWorld();
            const night = this.nightAmount();

            g.save();
            const sh = this.shake > 0 ? this.shake : 0;
            g.translate(this.cam.x + (sh ? rand(-sh, sh) : 0), this.cam.y + (sh ? rand(-sh, sh) : 0));
            g.scale(this.cam.zoom, this.cam.zoom);
            const vx0 = -this.cam.x / this.cam.zoom - 20, vy0 = -this.cam.y / this.cam.zoom - 20;
            const vx1 = (this.vw - this.cam.x) / this.cam.zoom + 20, vy1 = (this.vh - this.cam.y) / this.cam.zoom + 20;

            A.world.drawMeadow(g, vx0, vy0, vx1, vy1);
            A.world.drawIsland(g);
            const carrying = this.buildMode || this.moveMode || this.selectMode;
            if (carrying) this.drawGrid(g);
            this.drawSelect(g);
            if (this.buildMode && this.hoverTile) this.drawBuildGhost(g);
            if (this.moveMode && this.hoverTile) this.drawMoveGhost(g);
            if (this.spellMode && this.hoverTile) this.drawSpellGhost(g);
            this.drawRange(g);
            this.drawFootprint(g);

            // everything that stands on the map, sorted back to front
            const draws = this._draws; draws.length = 0;
            for (const b of this.buildings) { b._depth = b.tx + b.ty + BLD[b.type].size; draws.push(b); }
            for (const e of this.enemies) { e._depth = e.tx + e.ty + 0.4; draws.push(e); }
            if (this.goblin) { this.goblin._depth = this.goblin.tx + this.goblin.ty + 0.4; draws.push(this.goblin); }
            draws.sort((a, b) => a._depth - b._depth);
            const scn = A.world.sceneryIn(vx0, vy0, vx1, vy1, this._scn);

            // x-ray: buildings drawn in front of the one you're looking at turn see-through,
            // but only where they really cover its picture
            const focus = this.selected || this.hoverBuilding || (this.moveMode && this.moveMode);
            let frect = null;
            if (this.settings.xray && focus && this.buildings.includes(focus)) {
                const sp = this.spriteOf(focus); A.maskOf(sp);
                const c = this.centerOf(focus);
                const bb = sp.bbox, pts = [];
                for (let iy = 0; iy < 7; iy++) for (let ix = 0; ix < 7; ix++) {
                    const px = bb.x0 + (ix + 0.5) / 7 * (bb.x1 - bb.x0), py = bb.y0 + (iy + 0.5) / 7 * (bb.y1 - bb.y0);
                    if (A.hitSprite(sp, px, py, 0)) pts.push(c.x + px, c.y + py);
                }
                frect = { x0: c.x + bb.x0, y0: c.y + bb.y0, x1: c.x + bb.x1, y1: c.y + bb.y1, pts, depth: focus._depth ?? (focus.tx + focus.ty + BLD[focus.type].size) };
            }
            this._lightQ.length = 0;
            let si = 0;
            for (const d of draws) {
                while (si < scn.length && scn[si].depth <= d._depth) A.world.drawSceneryItem(g, scn[si++], t);
                if (d.kind) { A.drawEnemy(g, d, t); }
                else if (d === this.goblin) A.drawTreasureGoblin(g, d, t);
                else this.drawBuilding(g, d, t, frect);
            }
            while (si < scn.length) A.world.drawSceneryItem(g, scn[si++], t);
            for (const e of this.enemies) A.drawEnemyBar(g, e);

            this.drawBeams(g, t);
            for (const p of this.projectiles) this.drawProjectile(g, p);
            this.drawParticles(g);
            this.drawBadges(g, t);
            A.world.drawClouds(g, t, this.cam, this.vw, this.vh, 1 - night * 0.6);
            this.drawBirds(g, t, night);
            this.drawAmbient(g, t, night);
            this.drawPopups(g);
            g.restore();

            // time of day: multiply tint, then the glows on top of it
            if (night > 0.01 || this.dayTime < 0.34 || this.dayTime > 0.7) this.drawDayTint(g, night);
            if (night > 0.05 && this._lightQ.length) {
                g.save();
                g.translate(this.cam.x, this.cam.y); g.scale(this.cam.zoom, this.cam.zoom);
                for (const q of this._lightQ) A.drawLights(g, q.sp, q.x, q.y, night);
                g.restore();
            }
            // soft vignette
            if (!this._vig || this._vigW !== this.vw || this._vigH !== this.vh) {
                const gr = g.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.45, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.78);
                gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(8,12,20,0.38)');
                this._vig = gr; this._vigW = this.vw; this._vigH = this.vh;
            }
            g.fillStyle = this._vig; g.fillRect(0, 0, this.vw, this.vh);
            this.drawRaidSides(g);
            this.drawWeather(g);
            if (this.flash > 0) { g.fillStyle = `rgba(${this.flashTint || '255,255,255'},${this.flash})`; g.fillRect(0, 0, this.vw, this.vh); }
        }

        drawDayTint(g, night) {
            const t = this.dayTime;
            // white by day, warm at dawn and dusk, a cool blue at night
            const warm = Math.max(0, 1 - Math.abs(t - 0.25) / 0.09, 1 - Math.abs(t - 0.78) / 0.09);
            const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
            let c = mixc([255, 255, 255], [255, 206, 165], warm);
            c = mixc(c, [138, 152, 214], night);
            g.save();
            g.globalCompositeOperation = 'multiply';
            g.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
            g.fillRect(0, 0, this.vw, this.vh);
            g.restore();
        }

        // The build grid, shown whenever something is being placed or carried. It darkens the lawn a little, checkers the
        // 3x3 blocks so the building cells read at a glance, lays a dark underline beneath bright lines (so they show on light
        // and dark grass), makes every 3rd line heavy, and marks the ground that is already taken.
        drawGrid(g) {
            const gw = CFG.gridW, gh = CFG.gridH, z = this.cam.zoom, px = 1 / z;
            g.save();
            this.tilePoly(g, 0, 0, gw); g.fillStyle = 'rgba(6,22,10,0.14)'; g.fill();
            const fine = clamp((z - 0.8) / 1.2, 0, 1);              // the single-tile lines fade out when zoomed out; the 3x3 block lines always stay
            g.fillStyle = 'rgba(255,255,255,0.06)';
            g.beginPath();
            for (let by = 0; by < gh / S; by++) for (let bx = 0; bx < gw / S; bx++) {
                if ((bx + by) & 1) continue;
                const a = this.worldIso(bx * S, by * S), b = this.worldIso((bx + 1) * S, by * S), c = this.worldIso((bx + 1) * S, (by + 1) * S), d = this.worldIso(bx * S, (by + 1) * S);
                g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath();
            }
            g.fill();
            // what is already standing there
            const carried = new Set(this.gmove ? this.group : (this.moveMode ? [this.moveMode] : []));
            for (const b of this.buildings) {
                if (carried.has(b) || BLD[b.type].decor && false) continue;
                this.tilePoly(g, b.tx, b.ty, BLD[b.type].size);
                g.fillStyle = 'rgba(30,14,0,0.26)'; g.fill();
                g.strokeStyle = 'rgba(255,238,190,0.7)'; g.lineWidth = 1.4 * px; g.stroke();
            }
            // lines: dark underline first, then bright; every third is a building edge
            for (const major of [false, true]) {
                const path = () => {
                    g.beginPath();
                    for (let i = 0; i <= gw; i++) { if ((i % S === 0) !== major) continue; const a = this.worldIso(i, 0), b = this.worldIso(i, gh); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
                    for (let j = 0; j <= gh; j++) { if ((j % S === 0) !== major) continue; const a = this.worldIso(0, j), b = this.worldIso(gw, j); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
                };
                path(); g.strokeStyle = major ? 'rgba(0,0,0,0.42)' : `rgba(0,0,0,${0.08 + 0.12 * fine})`; g.lineWidth = (major ? 3.4 : 2.2) * px; g.stroke();
                path(); g.strokeStyle = major ? 'rgba(255,255,255,0.85)' : `rgba(255,255,255,${0.1 + 0.2 * fine})`; g.lineWidth = (major ? 1.8 : 0.8) * px; g.stroke();
            }
            g.restore();
        }
        // the footprint of something about to land: a tile-by-tile fill under the picture, then (after it) one strong outline
        ghostFill(g, tx, ty, size, tileOk, ok) {
            for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
                this.tilePoly(g, tx + dx, ty + dy);
                g.fillStyle = tileOk(tx + dx, ty + dy) ? ok : 'rgba(255,70,70,0.62)'; g.fill();
            }
        }
        ghostEdge(g, tx, ty, size, edge) {
            this.tilePoly(g, tx, ty, size);
            g.lineJoin = 'round';
            g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 6 / this.cam.zoom; g.stroke();
            g.strokeStyle = edge; g.lineWidth = 3.2 / this.cam.zoom; g.stroke();
        }

        // ---------- the row tool: pick buildings by dragging along a row, a column or a box ----------
        // The tiles under the drag. Along a row or column by default; Shift (or the Box button) drags a rectangle.
        selectTiles() {
            const s = this.selectDrag; if (!s) return [];
            const { a, b } = s, out = [];
            if (s.box || this.selectShape === 'box') {
                for (let y = Math.min(a.ty, b.ty); y <= Math.max(a.ty, b.ty); y++) for (let x = Math.min(a.tx, b.tx); x <= Math.max(a.tx, b.tx); x++) out.push({ tx: x, ty: y });
            } else if (Math.abs(b.tx - a.tx) >= Math.abs(b.ty - a.ty)) {
                for (let x = Math.min(a.tx, b.tx); x <= Math.max(a.tx, b.tx); x++) out.push({ tx: x, ty: a.ty });
            } else {
                for (let y = Math.min(a.ty, b.ty); y <= Math.max(a.ty, b.ty); y++) out.push({ tx: a.tx, ty: y });
            }
            return out.filter(t => t.tx >= 0 && t.ty >= 0 && t.tx < CFG.gridW && t.ty < CFG.gridH);
        }
        // every building the drag touches (the Town Hall stays put)
        pickInSel() {
            if (this.occDirty) this.rebuildOcc();
            const set = new Set();
            for (const t of this.selectTiles()) { const o = this.cell(t.tx, t.ty); if (o && BLD[o.type].cat !== 'core') set.add(o); }
            return [...set];
        }
        commitSelect() {
            const s = this.selectDrag, picks = this.pickInSel();
            this.selectDrag = null;
            if (s && s.add) { for (const b of picks) { const i = this.group.indexOf(b); if (i >= 0) this.group.splice(i, 1); else this.group.push(b); } }   // add mode toggles
            else this.group = picks;
            if (!this.group.length) this.toast('Nothing there. Drag along a row of walls or buildings.', 'warn');
            else this.audio.click();
            this.updateGroupBar();
        }
        toggleSelect(seed = null) {
            const on = !this.selectMode || !!seed;
            this.cancelModes();
            this.selectMode = on; this.selectDrag = null;
            if (on) {
                this.deselect();
                if (seed) this.group = [seed];
                this.toast('Row tool: drag along a row or column to pick it, then Move or Delete. Shift drags a box.', 'warn');
            }
            this.updateGroupBar(); this.updateCanvasCursor();
        }
        groupBox() {
            let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
            for (const b of this.group) { const s = BLD[b.type].size; x0 = Math.min(x0, b.tx); y0 = Math.min(y0, b.ty); x1 = Math.max(x1, b.tx + s); y1 = Math.max(y1, b.ty + s); }
            return { x0, y0, x1, y1 };
        }
        // where the carried group would sit relative to now: grabbed tile -> pointer, or its centre -> pointer
        gmoveOffset() {
            const h = this.hoverTile, m = this.gmove;
            if (!h || !m) return null;
            if (m.grab) return { dx: h.tx - m.grab.tx, dy: h.ty - m.grab.ty };
            const bx = this.groupBox();
            return { dx: h.tx - Math.round((bx.x0 + bx.x1) / 2), dy: h.ty - Math.round((bx.y0 + bx.y1) / 2) };
        }
        // can these buildings all shift by (dx,dy)? they may land on the spots they are leaving
        canShift(items, dx, dy) {
            if (this.occDirty) this.rebuildOcc();
            const mine = new Set(items);
            for (const b of items) {
                const s = BLD[b.type].size;
                for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
                    const tx = b.tx + dx + x, ty = b.ty + dy + y;
                    if (tx < 0 || ty < 0 || tx >= CFG.gridW || ty >= CFG.gridH) return false;
                    const o = this.cell(tx, ty);
                    if (o && !mine.has(o)) return false;
                }
            }
            return true;
        }
        shiftItems(items, dx, dy) {
            for (const b of items) { b.tx += dx; b.ty += dy; }
            this.touchGrid();
            this.audio.build();
            for (const b of items.slice(0, 8)) { const p = this.centerOf(b); for (let i = 0; i < 3 && this.particles.length < 300; i++) this.particles.push({ x: p.x + rand(-8, 8), y: p.y + rand(-3, 5), vx: rand(-30, 30), vy: rand(-45, -12), life: 0.5, max: 0.5, color: '#d8c8a0', size: rand(2, 4), kind: 'dust' }); }
        }
        startGroupMove() {
            if (!this.group.length) return;
            this.gmove = { follow: true };
            this.updateGroupBar();
            this.toast('Tap where it should go. Esc cancels. You can also just drag a picked building.', 'warn');
        }
        commitGroupMove() {
            const off = this.gmoveOffset(), items = this.group.slice();
            this.gmove = null; this.input.gdrag = this.input.gfollow = false;
            this.updateGroupBar();
            if (!off || !items.length || (!off.dx && !off.dy)) return;
            if (!this.canShift(items, off.dx, off.dy)) { this.audio.error(); this.toast('Something is in the way there', 'warn'); return; }
            this.shiftItems(items, off.dx, off.dy);
            this.toast(`Moved ${items.length} building${items.length === 1 ? '' : 's'}`, 'success');
        }
        // arrow keys nudge the picked group, or the selected building, one tile (diagonal on screen)
        nudgeSelection(d) {
            const items = this.group.length ? this.group : (this.selected && BLD[this.selected.type].cat !== 'core' ? [this.selected] : []);
            if (!d || !items.length) return;
            if (!this.canShift(items, d[0], d[1])) { this.audio.error(); return; }
            this.shiftItems(items, d[0], d[1]);
            if (items === this.group) this.updateGroupBar(); else this.refreshSelection();
        }
        // Delete / Backspace: the picked group, or the selected building
        deleteSelection() {
            if (this.group.length) { this.confirmDeleteGroup(); return; }
            const b = this.selected;
            if (b && BLD[b.type].cat !== 'core') this.confirmSell(b);
        }
        confirmDeleteGroup() {
            const items = this.group.slice(); if (!items.length) return;
            const refund = {};
            for (const b of items) for (const [k, v] of Object.entries(this.refundOf(b))) refund[k] = (refund[k] || 0) + v;
            const str = Object.entries(refund).map(([k, v]) => `${fmt(v)} ${this.resSymbol(k).toLowerCase()}`).join(', ') || 'nothing';
            const upg = items.filter(b => b.level > 1).length;
            const kinds = {}; for (const b of items) kinds[BLD[b.type].name] = (kinds[BLD[b.type].name] || 0) + 1;
            const what = Object.entries(kinds).map(([n, c]) => `${c} ${n}${c > 1 ? 's' : ''}`).join(', ');
            this.showConfirm({
                title: `Delete ${items.length} building${items.length === 1 ? '' : 's'}?`, icon: 'trash',
                body: `${what}.<br>You get back ${str}.${upg ? '<br><br><span class="warn-text">Upgrades are not refunded.</span>' : ''}`, yesText: 'Delete', noText: 'Keep them', danger: true,
                onYes: () => {
                    const live = items.filter(b => this.buildings.includes(b));
                    this.removeMany(live);
                    for (const b of live) for (const [k, v] of Object.entries(this.refundOf(b))) this.addRes(k, v);
                    this.audio.coin();
                    this.toast(`Deleted ${live.length} (+${str})`, 'success');
                    this.updateUI();
                },
            });
        }
        // 4-connected tiles from a to b: a quick drag still lays an unbroken wall, even on diagonals
        lineTiles(a, b) {
            const out = [], dx = b.tx - a.tx, dy = b.ty - a.ty, n = Math.max(Math.abs(dx), Math.abs(dy));
            let prev = null;
            for (let i = 0; i <= n; i++) {
                const k = n ? i / n : 0, p = { tx: Math.round(a.tx + dx * k), ty: Math.round(a.ty + dy * k) };
                if (prev && prev.tx !== p.tx && prev.ty !== p.ty) out.push({ tx: p.tx, ty: prev.ty });
                out.push(p); prev = p;
            }
            return out;
        }
        footprint(g, b, fill, stroke, w = 1.6) {
            const s = BLD[b.type].size;
            this.tilePoly(g, b.tx, b.ty, s);
            if (fill) { g.fillStyle = fill; g.fill(); }
            g.strokeStyle = stroke; g.lineWidth = w; g.stroke();
        }
        drawSelect(g) {
            const t = this.tnow;
            if (this.selectMode && this.hoverTile && !this.selectDrag && !this.gmove) { this.tilePoly(g, this.hoverTile.tx, this.hoverTile.ty); g.strokeStyle = 'rgba(255,225,120,0.95)'; g.lineWidth = 2; g.stroke(); }
            // the picked group, outlined in gold
            for (const b of this.group) this.footprint(g, b, `rgba(255,210,80,${0.2 + 0.08 * Math.sin(t * 6)})`, 'rgba(255,226,120,0.95)', 1.4);
            // the drag in progress
            if (this.selectDrag) {
                const tiles = this.selectTiles(), picks = new Set(this.pickInSel());
                for (const p of tiles) { this.tilePoly(g, p.tx, p.ty); g.fillStyle = 'rgba(255,230,140,0.16)'; g.fill(); }
                for (const b of picks) this.footprint(g, b, 'rgba(255,210,80,0.32)', 'rgba(255,240,170,0.95)', 1.6);
                const e = this.selectDrag.b, c = this.worldIso(e.tx + 0.5, e.ty + 0.5), n = picks.size;
                g.font = '700 15px "Lilita One", "Nunito", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
                const label = n ? `${n} picked` : 'nothing';
                g.lineWidth = 4; g.strokeStyle = 'rgba(20,12,4,0.9)'; g.strokeText(label, c.x, c.y - 28);
                g.fillStyle = n ? '#fff0b8' : '#c8c8d0'; g.fillText(label, c.x, c.y - 28);
            }
            // a group being carried: every piece shown where it would land, blue if it all fits
            if (this.gmove && this.group.length) {
                const off = this.gmoveOffset();
                if (off) {
                    const ok = this.canShift(this.group, off.dx, off.dy);
                    const fill = ok ? 'rgba(92,216,255,0.3)' : 'rgba(255,93,93,0.42)', edge = ok ? '#5cd8ff' : '#ff5d5d';
                    const moved = this.group.slice().sort((a, b) => (a.tx + a.ty) - (b.tx + b.ty));
                    for (const b of moved) { this.tilePoly(g, b.tx + off.dx, b.ty + off.dy, BLD[b.type].size); g.fillStyle = fill; g.fill(); g.strokeStyle = edge; g.lineWidth = 1.4; g.stroke(); }
                    if (moved.length <= 40) for (const b of moved) { const s = BLD[b.type].size, c = this.worldIso(b.tx + off.dx + s / 2, b.ty + off.dy + s / 2); A.drawSprite(g, this.spriteOf(b), c.x, c.y, ok ? 0.75 : 0.4, false); }
                    for (const b of moved) { this.tilePoly(g, b.tx + off.dx, b.ty + off.dy, BLD[b.type].size); g.strokeStyle = edge; g.lineWidth = 2.4 / this.cam.zoom; g.stroke(); }
                }
            }
        }

        // CoC-style: the tiles a selected or hovered building really covers
        drawFootprint(g) {
            if (this.buildMode || this.moveMode || this.selectMode) return;
            const b = this.selected || this.hoverBuilding;
            if (!b) return;
            this.footprint(g, b, this.selected ? 'rgba(255,230,120,0.18)' : 'rgba(255,255,255,0.1)', this.selected ? 'rgba(255,226,120,0.9)' : 'rgba(255,255,255,0.55)', 1.5);
        }

        tilePoly(g, tx, ty, size = 1) {
            const a = this.worldIso(tx, ty), b = this.worldIso(tx + size, ty), c = this.worldIso(tx + size, ty + size), d = this.worldIso(tx, ty + size);
            g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath();
        }

        drawBuildGhost(g) {
            const def = BLD[this.buildMode];
            const { tx, ty } = this.hoverTile;
            const placeable = this.canBuildHere(this.buildMode, tx, ty);
            const ok = placeable && this.canAfford(this.buildCost(this.buildMode));
            const inside = (x, y) => x >= 0 && y >= 0 && x < CFG.gridW && y < CFG.gridH && !this.cell(x, y);
            this.ghostFill(g, tx, ty, def.size, inside, ok ? 'rgba(107,255,149,0.42)' : 'rgba(255,190,90,0.4)');
            if (placeable) {
                const sp = A.getSprite(this.buildMode, 1, this.buildMode === 'wall' ? 0 : 0);
                const c = this.worldIso(tx + def.size / 2, ty + def.size / 2);
                A.drawSprite(g, sp, c.x, c.y, ok ? 0.72 : 0.4, false);
                const r = def.defense ? def.defense(1).range : 0;
                if (r) this.rangeRing(g, c.x, c.y, r, ok ? 'rgba(255,224,130,0.9)' : 'rgba(255,120,120,0.8)');
            }
            this.ghostEdge(g, tx, ty, def.size, ok ? '#7dffa0' : '#ff6a6a');
        }
        drawMoveGhost(g) {
            const m = this.moveMode, def = BLD[m.type];
            const { tx, ty } = this.hoverTile;
            const free = this.canBuildHere(m.type, tx, ty, m);
            const other = this.canPlace(m.type, tx, ty, m) ? null : this.swapPartner(m, tx, ty);
            const swap = !!other && this.canSwap(m, other);
            const ok = free || swap;
            const pulse = 0.5 + 0.5 * Math.sin(this.tnow * 6);
            const fill = swap ? `rgba(255,208,80,${0.25 + pulse * 0.2})` : ok ? `rgba(92,216,255,${0.25 + pulse * 0.2})` : 'rgba(255,93,93,0.45)';
            const edge = swap ? '#ffd050' : ok ? '#5cd8ff' : '#ff5d5d';
            this.ghostFill(g, tx, ty, def.size, () => ok, fill);
            if (swap) {
                // outline where the other building will end up
                this.tilePoly(g, m.tx, m.ty, BLD[other.type].size);
                g.strokeStyle = '#ffd050'; g.lineWidth = 2.5 / this.cam.zoom; g.setLineDash([6, 4]); g.stroke(); g.setLineDash([]);
            }
            if (free) {
                const sp = this.spriteOf(m);
                const c = this.worldIso(tx + def.size / 2, ty + def.size / 2);
                A.drawSprite(g, sp, c.x, c.y, 0.8, false);
                if (def.defense) this.rangeRing(g, c.x, c.y, def.defense(m.level).range, 'rgba(255,224,130,0.9)');
            }
            this.ghostEdge(g, tx, ty, def.size, edge);
        }
        drawSpellGhost(g) {
            const c = this.screenToTile(this.input.x, this.input.y);
            const w = this.worldIso(c.tfx, c.tfy);
            g.save(); g.strokeStyle = 'rgba(166,236,255,0.9)'; g.lineWidth = 2.5; g.setLineDash([8, 5]);
            g.beginPath(); g.ellipse(w.x, w.y, CFG.spellRadius * S * CFG.tileW / 2, CFG.spellRadius * S * CFG.tileH / 2, 0, 0, TAU); g.stroke();
            g.fillStyle = 'rgba(166,236,255,0.12)'; g.fill();
            g.restore();
        }
        rangeRing(g, x, y, range, col) {
            g.save();
            g.fillStyle = col.replace(/[\d.]+\)$/, '0.08)');
            g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([7, 6]);
            g.beginPath(); g.ellipse(x, y, range * S * CFG.tileW / 2, range * S * CFG.tileH / 2, 0, 0, TAU); g.fill(); g.stroke();
            g.restore();
        }
        drawRange(g) {
            const b = this.selected || this.hoverBuilding;
            if (!b || this.buildMode || this.moveMode) return;
            const def = BLD[b.type];
            if (!def.defense) return;
            const c = this.centerOf(b);
            const d = def.defense(b.level);
            this.rangeRing(g, c.x, c.y, d.range, 'rgba(255,224,130,0.85)');
            if (d.minRange) this.rangeRing(g, c.x, c.y, d.minRange, 'rgba(255,110,100,0.85)');      // the dead zone
        }

        drawBuilding(g, b, t, frect) {
            const def = BLD[b.type];
            const sp = this.spriteOf(b);
            A.maskOf(sp);
            const c = this.centerOf(b);
            const carriedAway = this.input.dragMove && this.moveMode === b;
            // x-ray fade toward 0.38 while something behind is the focus
            let target = 1;
            if (frect && b !== this.selected && b !== this.hoverBuilding && b._depth > frect.depth) {
                const x0 = c.x + sp.bbox.x0, y0 = c.y + sp.bbox.y0, x1 = c.x + sp.bbox.x1, y1 = c.y + sp.bbox.y1;
                if (x0 < frect.x1 && x1 > frect.x0 && y0 < frect.y1 && y1 > frect.y0) {
                    let hits = 0;
                    for (let i = 0; i < frect.pts.length && hits < 3; i += 2) if (A.hitSprite(sp, frect.pts[i] - c.x, frect.pts[i + 1] - c.y, 0)) hits++;
                    if (hits >= 3) target = 0.38;
                }
            }
            if (carriedAway) target = 0.15;
            else if (this.input.dragMove) target = Math.min(target, 0.45);
            b.fade = b.fade === undefined ? target : b.fade + (target - b.fade) * 0.25;
            const alpha = b.fade;

            const grow = b.build < 1 ? easeOutBack(Math.max(0, b.build)) : 1;
            const popS = b.pop > 0 ? 1 + 0.07 * Math.sin(b.pop * Math.PI) : 1;
            const upS = (b.upg > 0 ? 1 + 0.09 * Math.sin(b.upg * Math.PI) : 1) * (b.evolve > 0 ? 1 + 0.2 * Math.sin(Math.min(1, (1 - b.evolve) * 2.2) * Math.PI) * Math.min(1, b.evolve * 3) : 1);
            this.drawTierAura(g, b, def, sp, c, t, alpha);
            const sx = popS * upS, sy = grow * popS * upS;
            const sel = this.selected === b, hov = this.hoverBuilding === b;

            g.save();
            g.translate(c.x, c.y);
            if (sel || hov) {
                const pulse = sel ? 0.65 + 0.35 * Math.sin(this.tnow * 5) : 0.8;
                g.globalAlpha = pulse;
                g.scale(sx, sy);
                A.drawGlow(g, sp, 0, 0, sel ? '#ffd34a' : '#fff6c8', sel ? 2.4 : 2);
                g.globalAlpha = 1;
                g.scale(1 / sx, 1 / sy);
            }
            g.scale(sx, sy);
            if (b.hurt > 0) g.translate(rand(-1, 1), 0);
            A.drawSprite(g, sp, 0, 0, alpha);
            g.restore();

            if (b.evolve > 0) this.drawEvolve(g, b, def, sp, c, alpha);
            if (b.upg > 0) {       // upgrade flash
                g.save(); g.globalAlpha = b.upg * 0.55 * alpha; g.globalCompositeOperation = 'lighter';
                A.drawGlow(g, sp, c.x, c.y, '#ffe9a0', 0.5); g.restore();
            }
            g.save(); g.globalAlpha = alpha;
            A.drawAnchors(g, sp, c.x, c.y, t, b.tx * 7 + b.ty * 3);
            if (A.hasTurret(b.type) && sp.anchors.length) {
                const m = sp.anchors.find(a => a.name === 'mount');
                if (m) A.drawTurret(g, b.type, c.x + m.x, c.y + m.y, { ang: b.aim ?? 0.5, rec: b.rec || 0, fl: b.fl || 0, t, tier: tierOf(b.type, b.level), hasTarget: !!b.hasT });
            }
            g.restore();
            if (sp.lights.length) this._lightQ.push({ sp, x: c.x, y: c.y });
            if (alpha > 0.6) this.drawBuildingFx(g, b, sp, c, t);
        }

        // The upper looks glow on the ground: gold for tier 3, ruby for tier 4; walls get violet, gold and ember
        drawTierAura(g, b, def, sp, c, t, alpha) {
            const tier = tierOf(b.type, b.level);
            const col = b.type === 'wall' ? ['#000', '#000', '#000', '#a080ff', '#ffd86a', '#ff8a3a'][tier - 1] : TIER_GLOW[tier - 1];
            if (!col || col === '#000' || alpha < 0.5 || def.decor) return;
            const r = (b.type === 'wall' ? 0.55 : def.size * 0.62) * CFG.tileW, pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + b.tx * 0.9 + b.ty * 0.5);
            g.save(); g.globalCompositeOperation = 'lighter';
            g.globalAlpha = (b.type === 'wall' ? 0.1 : 0.22 + 0.1 * (tier - 3)) * pulse * alpha;
            g.drawImage(A.glowSprite(col), c.x - r * 1.15, c.y - r * 0.62, r * 2.3, r * 1.24);
            g.restore();
        }
        // The moment a building steps up to its next look: a pillar of light, shock rings and a white-hot flash
        drawEvolve(g, b, def, sp, c, alpha) {
            const k = b.evolve, tier = tierOf(b.type, b.level), col = TIER_COL[tier - 1] || '#ffe066';
            const wall = b.type === 'wall', h = wall ? 90 : 260, w = wall ? 18 : 46;
            g.save(); g.globalCompositeOperation = 'lighter';
            const gr = g.createLinearGradient(0, c.y, 0, c.y - h);
            gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.globalAlpha = Math.min(1, k * 1.4) * 0.55;
            g.fillStyle = gr; g.fillRect(c.x - w / 2 * (0.4 + k * 0.6), c.y - h, w * (0.4 + k * 0.6), h);
            g.globalAlpha = k * k * 0.85;
            A.drawGlow(g, sp, c.x, c.y, '#ffffff', 0.8);
            g.restore();
            for (const [rk, rc] of [[0, col], [0.22, '#ffffff']]) {
                const p = Math.max(0, (1 - k) - rk);
                if (p <= 0 || p > 0.6) continue;
                g.save(); g.globalAlpha = Math.max(0, 1 - p / 0.6) * 0.9; g.strokeStyle = rc; g.lineWidth = 3;
                g.beginPath(); g.ellipse(c.x, c.y, (wall ? 24 : def.size * CFG.tileW * 1.3) * (0.3 + p * 3), (wall ? 12 : def.size * CFG.tileH * 1.3) * (0.3 + p * 3), 0, 0, TAU); g.stroke(); g.restore();
            }
        }

        // level tags, hp bars and upgrade arrows, drawn above everything on the map
        drawBadges(g, t) {
            const zoom = this.cam.zoom;
            const tt = this._tt || {};
            // with lots of upgrades affordable, mark only the cheapest few so the map stays readable
            const arrowSet = new Set();
            if (this.settings.hints && zoom >= 0.8) {
                const cands = this.buildings.filter(b => b.type !== 'wall' && this.upgradeReady(b)).sort((a, b) => this.upgradeCostScore(a) - this.upgradeCostScore(b));
                for (let i = 0; i < Math.min(8, cands.length); i++) arrowSet.add(cands[i]);
            }
            const arrowOn = (b) => arrowSet.has(b) || ((b === this.selected || b === this.hoverBuilding) && this.settings.hints && this.upgradeReady(b));
            const small = zoom < 0.9;
            for (const b of this.buildings) {
                const def = BLD[b.type];
                const sp = this.spriteOf(b);
                const c = this.centerOf(b);
                const sel = this.selected === b, hov = this.hoverBuilding === b;
                // HP bar (above the upgrade arrow when there is one)
                if (b.hp < b.maxHp && !def.decor) {
                    const bw = Math.max(14, def.size * 12), bx = c.x - bw / 2, by = c.y + sp.bbox.y0 - (arrowOn(b) ? 40 : 22);
                    g.fillStyle = 'rgba(8,6,6,0.85)'; g.fillRect(bx - 1.5, by - 1.5, bw + 3, 7);
                    g.fillStyle = '#3a1010'; g.fillRect(bx, by, bw, 4);
                    const f = Math.max(0, b.hp / b.maxHp);
                    g.fillStyle = f > 0.5 ? '#7adf6a' : f > 0.25 ? '#ffc857' : '#ff5d5d';
                    g.fillRect(bx, by, bw * f, 4);
                    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(bx, by, bw * f, 1.4);
                }
                // level tag
                const calm = b.type === 'wall';      // long walls would drown the map in tags
                if (!def.decor && def.maxLevel > 1 && (sel || hov || (!calm && zoom >= 0.95 && this.settings.levelTags === 'always'))) {
                    const fh = CFG.tileH * def.size / 2;
                    const tx = c.x, ty = c.y + fh + 6;
                    const max = b.level >= def.maxLevel;
                    // the badge takes the colour of the building's look: bronze, silver, gold, ruby
                    const tcol = TIER_COL[tierOf(b.type, b.level) - 1];
                    const label = max ? 'MAX' : String(b.level);
                    g.font = '700 11px "Lilita One", "Nunito", sans-serif';
                    const w = Math.max(22, g.measureText(label).width + 14);
                    g.fillStyle = 'rgba(14,10,8,0.88)';
                    this.pill(g, tx - w / 2, ty - 8, w, 16, 8); g.fill();
                    g.strokeStyle = tcol; g.lineWidth = 1.8; g.stroke();
                    g.fillStyle = tcol; g.textAlign = 'center'; g.textBaseline = 'middle';
                    g.fillText(label, tx, ty + 0.5);
                }
                // upgrade arrow
                if (arrowOn(b) && !this.buildMode && !this.moveMode) {
                    const r = this.arrowRect(b);
                    const bob = Math.sin(t * 4 + b.tx) * 2.5;
                    g.save(); g.translate(r.x, r.y + bob);
                    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 12, 7, 2.4, 0, 0, TAU); g.fill();
                    const gr = g.createLinearGradient(0, -r.r, 0, r.r); gr.addColorStop(0, '#8cf07a'); gr.addColorStop(1, '#2ea03a');
                    g.fillStyle = gr; g.strokeStyle = '#0e3a14'; g.lineWidth = 1.6;
                    g.beginPath(); g.arc(0, 0, r.r, 0, TAU); g.fill(); g.stroke();
                    g.fillStyle = '#ffffff'; g.strokeStyle = '#0e3a14'; g.lineWidth = 0.9;
                    g.beginPath(); g.moveTo(0, -6.4); g.lineTo(6, 0.4); g.lineTo(2.4, 0.4); g.lineTo(2.4, 6); g.lineTo(-2.4, 6); g.lineTo(-2.4, 0.4); g.lineTo(-6, 0.4); g.closePath(); g.fill(); g.stroke();
                    g.restore();
                }
                // coin bubble (or a thin ring while it refills)
                if (def.clickBonus && b.build >= 1) {
                    const r = this.bubbleRect(b);
                    const ready = this.bubbleReady(b);
                    if (this.autoCollect) { /* auto-collect: nothing to look at */ }
                    else if (ready) {
                      if (this.bubbleShown(b)) {
                        const fade = Math.min(1, b.shown ?? 1, (CFG.bubbleShowSec - (b.shown ?? CFG.bubbleShowSec)) * 4 + 0.15);
                        const bob = Math.sin(t * 3.4 + b.tx * 1.7) * 1.8, pulse = (1 + 0.05 * Math.sin(t * 6 + b.ty)) * (0.7 + 0.3 * fade);
                        g.save(); g.globalAlpha = Math.max(0, fade);
                        const key = Object.keys(def.clickBonus(1))[0], col = this.resColor(key);
                        g.translate(r.x, r.y + bob); g.scale(pulse, pulse);
                        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 12, 5, 1.8, 0, 0, TAU); g.fill();
                        const gr = g.createRadialGradient(-4, -5, 1, 0, 0, r.r);
                        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(210,225,255,0.82)');
                        g.fillStyle = gr; g.strokeStyle = '#1a2240'; g.lineWidth = 1.5;
                        g.beginPath(); g.arc(0, 0, r.r, 0, TAU); g.fill(); g.stroke();
                        g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r.r - 2.6, 0, TAU); g.stroke();
                        if (key === 'gold') {
                            g.fillStyle = '#ffd34a'; g.strokeStyle = '#7a4a00'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 4.4, 0, TAU); g.fill(); g.stroke();
                            g.fillStyle = '#9a5c00'; g.font = '700 7px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 0.5);
                        } else {
                            g.fillStyle = col; g.strokeStyle = '#2a0a50'; g.lineWidth = 1.2;
                            g.beginPath(); g.moveTo(0, -5); g.quadraticCurveTo(5, 0.7, 0, 5); g.quadraticCurveTo(-5, 0.7, 0, -5); g.fill(); g.stroke();
                        }
                        g.restore();
                      }
                    } else if (b.charge !== undefined) {
                        const f = Math.min(1, b.charge / this.bubbleSec());
                        g.save(); g.translate(r.x, r.y);
                        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2.8; g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); g.stroke();
                        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.7; g.beginPath(); g.arc(0, 0, 4.5, -Math.PI / 2, -Math.PI / 2 + TAU * f); g.stroke();
                        g.restore();
                    }
                }
                // first-run goal marker
                if (tt.b === b) {
                    const pulse = (t * 1.4) % 1;
                    g.save();
                    g.strokeStyle = `rgba(255,236,120,${1 - pulse})`; g.lineWidth = 3;
                    g.beginPath(); g.ellipse(c.x, c.y + 6, 30 + pulse * 34, 15 + pulse * 17, 0, 0, TAU); g.stroke();
                    const tb = (this.tutCurrent() && this.tutCurrent().id === 'tap' && this.bubbleReady(b)) ? this.bubbleRect(b) : null;
                    const by = (tb ? tb.y - 34 : c.y + sp.bbox.y0 - 56) + Math.sin(t * 6) * 5;
                    const ax = tb ? tb.x : c.x;
                    g.fillStyle = '#fff6b0'; g.strokeStyle = '#6a4200'; g.lineWidth = 2;
                    g.beginPath(); g.moveTo(ax, by + 14); g.lineTo(ax - 11, by - 4); g.lineTo(ax - 4, by - 4); g.lineTo(ax - 4, by - 16); g.lineTo(ax + 4, by - 16); g.lineTo(ax + 4, by - 4); g.lineTo(ax + 11, by - 4); g.closePath(); g.fill(); g.stroke();
                    g.restore();
                }
                // selection marker: a bouncing chevron when something is selected
                if (sel && !this.moveMode) {
                    const bob = Math.sin(t * 5) * 3;
                    const y = c.y + sp.bbox.y0 - (this.upgradeReady(b) ? 44 : 20) + bob;
                    g.fillStyle = '#ffd34a'; g.strokeStyle = '#4a2c00'; g.lineWidth = 1.4;
                    g.beginPath(); g.moveTo(c.x, y + 7); g.lineTo(c.x - 7, y - 3); g.lineTo(c.x + 7, y - 3); g.closePath(); g.fill(); g.stroke();
                }
            }
        }
        pill(g, x, y, w, h, r) {
            g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
            g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
        }

        drawBeams(g, t) {
            for (const b of this.beams) {
                const k = b.life / b.max;
                g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
                if (b.type === 'inferno') {
                    g.strokeStyle = `rgba(255,110,40,${k})`; g.lineWidth = 7; g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1); g.stroke();
                    g.strokeStyle = `rgba(255,230,140,${k})`; g.lineWidth = 3; g.stroke();
                    g.strokeStyle = `rgba(255,255,255,${k})`; g.lineWidth = 1.2; g.stroke();
                } else {
                    const segs = 7;
                    const dx = b.x1 - b.x0, dy = b.y1 - b.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
                    const pts = [[b.x0, b.y0]];
                    for (let i = 1; i < segs; i++) {
                        const f = i / segs, off = (Math.sin(b.seed * 13 + i * 7.3 + t * 60) * (b.type === 'bolt' ? 14 : 7));
                        pts.push([b.x0 + dx * f + nx * off, b.y0 + dy * f + ny * off]);
                    }
                    pts.push([b.x1, b.y1]);
                    const col = b.type === 'bolt' ? '166,236,255' : '170,200,255';
                    for (const [w, a] of [[b.type === 'bolt' ? 9 : 5, 0.35], [b.type === 'bolt' ? 4 : 2.2, 0.9]]) {
                        g.strokeStyle = `rgba(${col},${a * k})`; g.lineWidth = w; g.beginPath();
                        pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
                    }
                    g.strokeStyle = `rgba(255,255,255,${k})`; g.lineWidth = 1; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
                }
                g.restore();
            }
        }

        drawProjectile(g, p) {
            const ang = Math.atan2(p.ty - p.sy, p.tx - p.sx);
            const x = p.x, y = p.y;
            // ground shadow follows high arcs
            if (p.arc > 30) { g.fillStyle = 'rgba(0,0,0,0.25)'; const k = Math.min(1, p.t); g.beginPath(); g.ellipse(p.sx + (p.tx - p.sx) * k, p.sy + (p.ty - p.sy) * k + 4, 5, 2, 0, 0, TAU); g.fill(); }
            if (p.trail && p.trail.length > 3) {
                const col = ({ airdef: '255,170,70', wizard: '110,210,255', frost: '190,240,255', mortar: '200,200,210', cannon: '200,200,210' })[p.type];
                if (col) {
                    for (let i = 0; i + 3 < p.trail.length; i += 2) {
                        g.strokeStyle = `rgba(${col},${i / p.trail.length * 0.6})`; g.lineWidth = (i / p.trail.length) * 4 + 0.5; g.lineCap = 'round';
                        g.beginPath(); g.moveTo(p.trail[i], p.trail[i + 1]); g.lineTo(p.trail[i + 2], p.trail[i + 3]); g.stroke();
                    }
                }
            }
            g.save(); g.translate(x, y);
            switch (p.type) {
                case 'cannon': case 'mortar': {
                    const r = p.type === 'mortar' ? 5 : 3.6;
                    const gr = g.createRadialGradient(-1, -1, 0.5, 0, 0, r); gr.addColorStop(0, '#8a8a96'); gr.addColorStop(1, '#14141a');
                    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
                    break;
                }
                case 'fireorb': case 'darkorb': {
                    const c1 = p.type === 'fireorb' ? ['#fff3c0', '#ff9a30', 'rgba(255,120,30,0)'] : ['#f0d8ff', '#a050e0', 'rgba(150,60,220,0)'];
                    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 9); gr.addColorStop(0, c1[0]); gr.addColorStop(0.45, c1[1]); gr.addColorStop(1, c1[2]);
                    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
                    break;
                }
                case 'archer': case 'xbow': case 'clancastle': case 'bone': case 'earrow': {
                    const a = (p.type === 'bone' || p.type === 'earrow') ? ang : Math.atan2(p.ty - p.y, p.tx - p.x) || ang;
                    g.rotate(a);
                    g.strokeStyle = p.type === 'bone' ? '#efe6cc' : '#d8c8a0'; g.lineWidth = p.type === 'xbow' ? 2.2 : 1.6; g.lineCap = 'round';
                    g.beginPath(); g.moveTo(-7, 0); g.lineTo(5, 0); g.stroke();
                    if (p.type !== 'bone') { g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(8, 0); g.lineTo(4, -1.8); g.lineTo(4, 1.8); g.fill(); g.strokeStyle = '#c04a3a'; g.lineWidth = 1; g.beginPath(); g.moveTo(-7, 0); g.lineTo(-9, -2); g.moveTo(-7, 0); g.lineTo(-9, 2); g.stroke(); }
                    break;
                }
                case 'wizard': {
                    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 10); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, '#6ad8ff'); gr.addColorStop(1, 'rgba(92,216,255,0)');
                    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
                    break;
                }
                case 'frost': {
                    g.rotate(this.tnow * 8); g.fillStyle = '#d8f6ff'; g.strokeStyle = '#3c8cc8'; g.lineWidth = 1;
                    g.beginPath(); g.moveTo(0, -6); g.lineTo(3, 0); g.lineTo(0, 6); g.lineTo(-3, 0); g.closePath(); g.fill(); g.stroke();
                    break;
                }
                case 'airdef': {
                    g.rotate(Math.atan2(p.ty - p.y, p.tx - p.x));
                    g.fillStyle = '#e4e8f0'; g.strokeStyle = '#2a2c34'; g.lineWidth = 0.9;
                    g.beginPath(); g.moveTo(8, 0); g.lineTo(2, -2.6); g.lineTo(-6, -2.6); g.lineTo(-6, 2.6); g.lineTo(2, 2.6); g.closePath(); g.fill(); g.stroke();
                    g.fillStyle = '#e04a3a'; g.beginPath(); g.moveTo(8, 0); g.lineTo(3, -2.4); g.lineTo(3, 2.4); g.fill();
                    g.fillStyle = '#ffcc66'; g.beginPath(); g.arc(-8, 0, 2.6 + Math.random(), 0, TAU); g.fill();
                    break;
                }
                default: g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill();
            }
            g.restore();
        }

        drawParticles(g) {
            for (const p of this.particles) {
                const k = Math.max(0, p.life / p.max);
                switch (p.kind) {
                    case 'smoke':
                        g.fillStyle = p.color + (k * 0.4).toFixed(3) + ')';
                        g.beginPath(); g.arc(p.x, p.y, p.size * (2 - k), 0, TAU); g.fill(); break;
                    case 'ring':
                        g.strokeStyle = p.color; g.globalAlpha = k; g.lineWidth = 2 + k * 3;
                        g.beginPath(); g.ellipse(p.x, p.y, p.size * (1.2 - k), p.size * (1.2 - k) * 0.55, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; break;
                    case 'coin':
                        g.globalAlpha = Math.min(1, k * 2);
                        g.fillStyle = p.color; g.strokeStyle = 'rgba(70,40,0,0.8)'; g.lineWidth = 0.9;
                        g.beginPath(); g.ellipse(p.x, p.y, p.size * Math.abs(Math.cos(p.life * 12)) + 0.8, p.size, 0, 0, TAU); g.fill(); g.stroke(); g.globalAlpha = 1; break;
                    case 'shard':
                        g.globalAlpha = k; g.fillStyle = p.color; g.save(); g.translate(p.x, p.y); g.rotate(p.life * 9);
                        g.beginPath(); g.moveTo(0, -p.size * 1.6); g.lineTo(p.size * 0.7, 0); g.lineTo(0, p.size * 1.6); g.lineTo(-p.size * 0.7, 0); g.closePath(); g.fill(); g.restore(); g.globalAlpha = 1; break;
                    case 'dust':
                        g.globalAlpha = k * 0.7; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (1.5 - k * 0.5), 0, TAU); g.fill(); g.globalAlpha = 1; break;
                    default:
                        g.globalAlpha = k; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, Math.max(0.5, p.size * k), 0, TAU); g.fill(); g.globalAlpha = 1;
                }
            }
        }

        drawPopups(g) {
            g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
            for (const p of this.popups) {
                const k = Math.min(1, p.life / p.max);
                const grow = p.size >= 14 ? 1 + Math.max(0, (p.life / p.max - 0.8)) * 1.5 : 1;
                g.globalAlpha = Math.min(1, k * 1.6);
                g.font = `${(p.size || 14) * grow}px "Lilita One", "Nunito", sans-serif`;
                g.strokeStyle = 'rgba(20,10,6,0.92)'; g.lineWidth = 4;
                g.strokeText(p.text, p.x, p.y);
                g.fillStyle = p.color; g.fillText(p.text, p.x, p.y);
            }
            g.globalAlpha = 1;
        }

        // fireflies at night, butterflies by day: deterministic, no state
        drawAmbient(g, t, night) {
            const c = this.worldIso(CFG.gridW / 2, CFG.gridH / 2);
            if (night > 0.2) {
                g.save(); g.globalCompositeOperation = 'lighter';
                for (let i = 0; i < 26; i++) {
                    const a = i * 2.399, r = 150 + (i * 37 % 520);
                    const x = c.x + Math.cos(a) * r * 1.4 + Math.sin(t * 0.5 + i) * 26, y = c.y + Math.sin(a) * r * 0.7 + Math.cos(t * 0.6 + i * 1.3) * 18;
                    const k = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
                    const spr = A.glowSprite('#d8ff7a');
                    g.globalAlpha = night * k * 0.9;
                    g.drawImage(spr, x - 7, y - 7, 14, 14);
                }
                g.restore();
            } else if (night < 0.05) {
                for (let i = 0; i < 6; i++) {
                    const a = i * 1.7 + t * 0.12, r = 120 + (i * 83 % 360);
                    const x = c.x + Math.cos(a) * r * 1.3, y = c.y + Math.sin(a * 1.3) * r * 0.6 - 14 + Math.sin(t * 3 + i) * 5;
                    const flap = Math.abs(Math.sin(t * 14 + i * 2));
                    g.fillStyle = ['#ffd24a', '#ff8aa8', '#9ad0ff', '#ffffff', '#ffb04a', '#c89aff'][i];
                    g.strokeStyle = 'rgba(30,20,20,0.6)'; g.lineWidth = 0.7;
                    g.beginPath(); g.ellipse(x - 2 * flap, y, 2.6 * flap + 0.4, 2, 0, 0, TAU); g.ellipse(x + 2 * flap, y, 2.6 * flap + 0.4, 2, 0, 0, TAU); g.fill(); g.stroke();
                }
            }
        }

        floatText(text, x, y, color) { this.popups.push({ x, y, text, color, life: 1.3, max: 1.3, size: 16 }); }
    }

    K.Game = Game;
})(window.KOE = window.KOE || {});
