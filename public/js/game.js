/* ============================================================
   Kingdom of Ember — Clash Idle
   Single-file isometric tower-defense idle game
   ============================================================ */

(() => {
    'use strict';

    // ---------- CONFIG ----------
    const CFG = {
        gridW: 18,
        gridH: 18,
        tileW: 72,
        tileH: 36,
        zoomMin: 0.55,
        zoomMax: 2.4,
        saveKey: 'kingdomOfEmber.v3',
        autoSaveMs: 15000,
        dayLengthSec: 180,        // 3 minutes real-time = 1 in-game day
        waveBaseSec: 75,
        waveMinSec: 35,
        xpToLevel: (lv) => Math.floor(100 * Math.pow(1.4, lv - 1)),
        comboWindow: 1.3,
        spellCost: { gold: 0, gems: 1 },
        spellRadius: 1.8,
        spellBaseDmg: 180,
    };

    // ---------- BUILDING TYPES ----------
    const BLD = {
        townhall: {
            name: 'Town Hall',
            icon: '♔',
            size: 2,
            maxLevel: 12,
            unlockLevel: 1,
            baseCost: { gold: 0 },
            baseHP: 2500,
            color1: '#8b4b1c',
            color2: '#e29451',
            roof: '#c73535',
            desc: 'The heart of your kingdom. Upgrading unlocks new buildings and raises storage caps.',
            upgradeCost: (lv) => ({ gold: 1500 * Math.pow(2, lv - 1), elixir: 400 * Math.pow(1.8, lv - 1) }),
            provides: (lv) => ({ cap: 3000 + lv * 2500 }),
        },
        goldmine: {
            name: 'Gold Mine',
            icon: '◈',
            size: 1,
            maxLevel: 15,
            unlockLevel: 1,
            baseCost: { gold: 300 },
            baseHP: 500,
            color1: '#6a5227',
            color2: '#d9b34e',
            roof: '#a97a24',
            desc: 'Produces Gold passively. Tap to mine a burst bonus.',
            upgradeCost: (lv) => ({ gold: 400 * Math.pow(1.55, lv - 1) }),
            production: (lv) => ({ gold: 2 + lv * 1.8 }),
            clickBonus: (lv) => ({ gold: 15 + lv * 12 }),
        },
        elixirwell: {
            name: 'Elixir Well',
            icon: '❂',
            size: 1,
            maxLevel: 15,
            unlockLevel: 2,
            baseCost: { gold: 650 },
            baseHP: 500,
            color1: '#4a2464',
            color2: '#c471ed',
            roof: '#7e2fb0',
            desc: 'Magical Elixir wells up from the deep. Tap for a burst.',
            upgradeCost: (lv) => ({ gold: 600 * Math.pow(1.55, lv - 1), elixir: 80 * Math.pow(1.5, lv - 1) }),
            production: (lv) => ({ elixir: 1 + lv * 1.2 }),
            clickBonus: (lv) => ({ elixir: 10 + lv * 8 }),
        },
        darkdrill: {
            name: 'Dark Drill',
            icon: '✦',
            size: 1,
            maxLevel: 10,
            unlockLevel: 6,
            baseCost: { gold: 4500, elixir: 1200 },
            baseHP: 700,
            color1: '#1a0a2e',
            color2: '#6b2cc9',
            roof: '#3e1d66',
            desc: 'Extracts rare Dark Elixir — gateway to prestige progression.',
            upgradeCost: (lv) => ({ gold: 5000 * Math.pow(1.7, lv - 1), elixir: 1500 * Math.pow(1.6, lv - 1) }),
            production: (lv) => ({ dark: 0.2 + lv * 0.15 }),
            clickBonus: (lv) => ({ dark: 2 + lv * 1.5 }),
        },
        wall: {
            name: 'Wall',
            icon: '▭',
            size: 1,
            maxLevel: 10,
            unlockLevel: 2,
            baseCost: { gold: 180 },
            baseHP: 1800,
            color1: '#3c3c42',
            color2: '#7d7d88',
            roof: '#5a5a62',
            desc: 'Thick stone rampart. Absorbs damage to protect your core buildings.',
            upgradeCost: (lv) => ({ gold: 220 * Math.pow(1.55, lv - 1) }),
        },
        cannon: {
            name: 'Cannon',
            icon: '◉',
            size: 1,
            maxLevel: 14,
            unlockLevel: 1,
            baseCost: { gold: 450 },
            baseHP: 450,
            color1: '#2a2a2a',
            color2: '#666',
            roof: '#444',
            desc: 'Long-range single-target cannon. Core defensive tower.',
            upgradeCost: (lv) => ({ gold: 550 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 5, dmg: 25 + lv * 14, cd: 1.2, splash: 0 }),
        },
        archer: {
            name: 'Archer Tower',
            icon: '➳',
            size: 1,
            maxLevel: 14,
            unlockLevel: 3,
            baseCost: { gold: 1200 },
            baseHP: 380,
            color1: '#3d2817',
            color2: '#8b6b3d',
            roof: '#5a3c1f',
            desc: 'Fast-firing tower with long range and sustained damage.',
            upgradeCost: (lv) => ({ gold: 1400 * Math.pow(1.5, lv - 1), elixir: 200 * Math.pow(1.4, lv - 1) }),
            defense: (lv) => ({ range: 6, dmg: 12 + lv * 7, cd: 0.45, splash: 0 }),
        },
        mortar: {
            name: 'Mortar',
            icon: '◎',
            size: 1,
            maxLevel: 12,
            unlockLevel: 4,
            baseCost: { gold: 2200, elixir: 400 },
            baseHP: 420,
            color1: '#1f2030',
            color2: '#585b74',
            roof: '#313347',
            desc: 'Lobs massive splash shells. Devastates enemy clusters.',
            upgradeCost: (lv) => ({ gold: 2500 * Math.pow(1.55, lv - 1), elixir: 500 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 7, dmg: 60 + lv * 25, cd: 3.2, splash: 1.8 }),
        },
        airdef: {
            name: 'Air Defense',
            icon: '⇧',
            size: 1,
            maxLevel: 12,
            unlockLevel: 5,
            baseCost: { gold: 2800, elixir: 600 },
            baseHP: 500,
            color1: '#2a3d1c',
            color2: '#6ea04a',
            roof: '#3e5a24',
            desc: 'High-damage missile tower. Slow fire, enormous burst.',
            upgradeCost: (lv) => ({ gold: 3000 * Math.pow(1.55, lv - 1), elixir: 650 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 5.5, dmg: 95 + lv * 40, cd: 2.4, splash: 0 }),
        },
        wizard: {
            name: 'Wizard Tower',
            icon: '✺',
            size: 1,
            maxLevel: 12,
            unlockLevel: 6,
            baseCost: { gold: 3200, elixir: 900 },
            baseHP: 420,
            color1: '#1a3a5c',
            color2: '#5cd8ff',
            roof: '#2f7ec2',
            desc: 'Arcane splash damage tower. Beautiful and deadly.',
            upgradeCost: (lv) => ({ gold: 3500 * Math.pow(1.6, lv - 1), elixir: 1100 * Math.pow(1.55, lv - 1) }),
            defense: (lv) => ({ range: 4.5, dmg: 40 + lv * 20, cd: 1.8, splash: 1.2 }),
        },
        tesla: {
            name: 'Hidden Tesla',
            icon: '⚡',
            size: 1,
            maxLevel: 12,
            unlockLevel: 7,
            baseCost: { gold: 4200, elixir: 1400 },
            baseHP: 600,
            color1: '#20203a',
            color2: '#7aa6ff',
            roof: '#4a5a9c',
            desc: 'Chain-lightning tower. Very fast and strikes through steel.',
            upgradeCost: (lv) => ({ gold: 4500 * Math.pow(1.6, lv - 1), elixir: 1500 * Math.pow(1.55, lv - 1) }),
            defense: (lv) => ({ range: 5, dmg: 28 + lv * 16, cd: 0.55, splash: 0 }),
        },
        xbow: {
            name: 'X-Bow',
            icon: '⤭',
            size: 1,
            maxLevel: 10,
            unlockLevel: 8,
            baseCost: { gold: 6000, elixir: 2000 },
            baseHP: 520,
            color1: '#3a2614',
            color2: '#a67c4a',
            roof: '#5a3c1f',
            desc: 'Enormous crossbow with extreme range. Rains bolts from afar.',
            upgradeCost: (lv) => ({ gold: 6500 * Math.pow(1.6, lv - 1), elixir: 2200 * Math.pow(1.55, lv - 1) }),
            defense: (lv) => ({ range: 9, dmg: 22 + lv * 12, cd: 0.35, splash: 0 }),
        },
        inferno: {
            name: 'Inferno Tower',
            icon: '✶',
            size: 1,
            maxLevel: 10,
            unlockLevel: 9,
            baseCost: { gold: 8500, elixir: 3000, dark: 50 },
            baseHP: 680,
            color1: '#3a0c0c',
            color2: '#ff6b35',
            roof: '#8a1a10',
            desc: 'Shoots a beam of hellfire. Incinerates single targets with unrivaled DPS.',
            upgradeCost: (lv) => ({ gold: 9000 * Math.pow(1.65, lv - 1), elixir: 3300 * Math.pow(1.6, lv - 1), dark: 60 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 4.5, dmg: 55 + lv * 30, cd: 0.22, splash: 0 }),
        },
        storage: {
            name: 'Vault',
            icon: '▦',
            size: 1,
            maxLevel: 12,
            unlockLevel: 2,
            baseCost: { gold: 800 },
            baseHP: 900,
            color1: '#4a3520',
            color2: '#b08040',
            roof: '#705828',
            desc: 'Increases storage capacity for all resources.',
            upgradeCost: (lv) => ({ gold: 900 * Math.pow(1.6, lv - 1) }),
            provides: (lv) => ({ cap: 1500 * lv + 1500 }),
        },
        builderhut: {
            name: 'Builder Hut',
            icon: '⚒',
            size: 1,
            maxLevel: 8,
            unlockLevel: 2,
            baseCost: { gold: 1500 },
            baseHP: 400,
            color1: '#3c2616',
            color2: '#a0703c',
            roof: '#5a3c1f',
            desc: 'Each hut boosts all Gold Mine production by +10% per level.',
            upgradeCost: (lv) => ({ gold: 1800 * Math.pow(1.5, lv - 1) }),
            provides: (lv) => ({ goldMult: 0.1 * lv }),
        },
        lab: {
            name: 'Laboratory',
            icon: '⚗',
            size: 1,
            maxLevel: 10,
            unlockLevel: 4,
            baseCost: { gold: 2500, elixir: 500 },
            baseHP: 480,
            color1: '#1c3a2e',
            color2: '#4bb08e',
            roof: '#285c48',
            desc: 'Research XP gain is boosted per level (+15% per level).',
            upgradeCost: (lv) => ({ gold: 3000 * Math.pow(1.55, lv - 1), elixir: 600 * Math.pow(1.5, lv - 1) }),
            provides: (lv) => ({ xpMult: 0.15 * lv }),
        },
        clancastle: {
            name: 'Clan Castle',
            icon: '♖',
            size: 2,
            maxLevel: 10,
            unlockLevel: 5,
            baseCost: { gold: 5500, elixir: 1200 },
            baseHP: 1600,
            color1: '#4a4a5a',
            color2: '#b0b0c0',
            roof: '#2a3a5a',
            desc: 'Fortress that passively grants gems from completed waves (+1 gem/wave per level).',
            upgradeCost: (lv) => ({ gold: 6500 * Math.pow(1.6, lv - 1), elixir: 1500 * Math.pow(1.55, lv - 1) }),
            provides: (lv) => ({ waveGems: lv }),
            defense: (lv) => ({ range: 4, dmg: 30 + lv * 15, cd: 1.5, splash: 0.8 }),
        },
        armycamp: {
            name: 'Army Camp',
            icon: '⛺',
            size: 1,
            maxLevel: 8,
            unlockLevel: 3,
            baseCost: { gold: 1800, elixir: 300 },
            baseHP: 420,
            color1: '#3a2a18',
            color2: '#a58048',
            roof: '#62421c',
            desc: 'Houses troops. Rally Defenses heals 10% more per army camp level.',
            upgradeCost: (lv) => ({ gold: 2000 * Math.pow(1.5, lv - 1), elixir: 400 * Math.pow(1.45, lv - 1) }),
            provides: (lv) => ({ rallyMult: 0.1 * lv }),
        },
    };

    // ---------- ACHIEVEMENTS ----------
    const ACHS = [
        { id: 'first_build',  name: 'Groundbreaking',    desc: 'Place your first building',     icon: '⚒', check: (g) => g.stats.built >= 1 },
        { id: 'ten_builds',   name: 'Master Architect',  desc: 'Build 10 structures',           icon: '🏛', check: (g) => g.stats.built >= 10 },
        { id: 'twenty_builds',name: 'Urban Planner',     desc: 'Build 20 structures',           icon: '🏰', check: (g) => g.stats.built >= 20 },
        { id: 'first_kill',   name: 'First Blood',       desc: 'Defeat your first raider',      icon: '⚔', check: (g) => g.stats.kills >= 1 },
        { id: 'slayer',       name: 'Goblin Slayer',     desc: 'Defeat 50 raiders',             icon: '💀', check: (g) => g.stats.kills >= 50 },
        { id: 'warlord',      name: 'Warlord',           desc: 'Defeat 200 raiders',            icon: '☠', check: (g) => g.stats.kills >= 200 },
        { id: 'wave_5',       name: 'Wave Rider',        desc: 'Survive wave 5',                icon: '🌊', check: (g) => g.wave.number > 5 },
        { id: 'wave_10',      name: 'Unbreakable',       desc: 'Survive wave 10',               icon: '🛡', check: (g) => g.wave.number > 10 },
        { id: 'wave_20',      name: 'Iron Bastion',      desc: 'Survive wave 20',               icon: '🏛', check: (g) => g.wave.number > 20 },
        { id: 'level_5',      name: 'Rising Chief',      desc: 'Reach level 5',                 icon: '★', check: (g) => g.player.level >= 5 },
        { id: 'level_10',     name: 'Veteran Lord',      desc: 'Reach level 10',                icon: '✦', check: (g) => g.player.level >= 10 },
        { id: 'gold_rich',    name: 'Gilded',            desc: 'Amass 100,000 gold',            icon: '◈', check: (g) => g.res.gold >= 100000 },
        { id: 'darkelixir',   name: 'Touched by Shadow', desc: 'Collect your first Dark Elixir',icon: '✦', check: (g) => g.res.dark >= 1 },
        { id: 'combo_10',     name: 'Click Frenzy',      desc: 'Reach a 10x click combo',       icon: '✱', check: (g) => g.stats.maxCombo >= 10 },
        { id: 'spellcaster',  name: 'Lightning Mage',    desc: 'Cast your first spell',         icon: '⚡', check: (g) => g.stats.spells >= 1 },
    ];

    // ---------- UTILITIES ----------
    const rand = (a, b) => a + Math.random() * (b - a);
    const randi = (a, b) => Math.floor(rand(a, b));
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const fmt = (n) => {
        if (n < 1000) return Math.floor(n).toString();
        if (n < 1e6)  return (n / 1e3).toFixed(n < 1e4 ? 2 : 1) + 'K';
        if (n < 1e9)  return (n / 1e6).toFixed(2) + 'M';
        return (n / 1e9).toFixed(2) + 'B';
    };
    const fmtTime = (sec) => {
        sec = Math.max(0, Math.ceil(sec));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m + ':' + s.toString().padStart(2, '0');
    };
    const mixColor = (c1, c2, t) => {
        const p = (c) => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
        const [r1,g1,b1] = p(c1), [r2,g2,b2] = p(c2);
        const h = (v) => Math.round(v).toString(16).padStart(2,'0');
        return '#' + h(r1+(r2-r1)*t) + h(g1+(g2-g1)*t) + h(b1+(b2-b1)*t);
    };

    // ---------- AUDIO (procedural WebAudio) ----------
    class Audio {
        constructor() {
            this.ctx = null;
            this.enabled = true;
            this.gain = null;
        }
        ensure() {
            if (this.ctx) return;
            try {
                const Ctor = window.AudioContext || window['webkitAudioContext'];
                this.ctx = new Ctor();
                this.gain = this.ctx.createGain();
                this.gain.gain.value = 0.18;
                this.gain.connect(this.ctx.destination);
            } catch (e) { this.enabled = false; }
        }
        beep(freq, dur = 0.1, type = 'sine', vol = 1) {
            if (!this.enabled) return;
            this.ensure();
            if (!this.ctx) return;
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = type;
            o.frequency.value = freq;
            g.gain.value = vol;
            g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
            o.connect(g); g.connect(this.gain);
            o.start();
            o.stop(this.ctx.currentTime + dur);
        }
        click()  { this.beep(740, 0.07, 'square', 0.3); }
        coin()   { this.beep(880, 0.06, 'triangle', 0.4); setTimeout(() => this.beep(1320, 0.08, 'triangle', 0.3), 35); }
        build()  { this.beep(220, 0.12, 'sawtooth', 0.5); setTimeout(() => this.beep(440, 0.15, 'triangle', 0.4), 120); }
        upgrade(){ this.beep(523, 0.1, 'triangle', 0.5); setTimeout(() => this.beep(659, 0.1, 'triangle', 0.5), 90); setTimeout(() => this.beep(784, 0.18, 'triangle', 0.5), 180); }
        shoot()  { this.beep(180, 0.05, 'square', 0.2); }
        hit()    { this.beep(120, 0.08, 'sawtooth', 0.3); }
        die()    { this.beep(90, 0.2, 'sawtooth', 0.4); }
        wave()   { this.beep(260, 0.3, 'sawtooth', 0.6); setTimeout(() => this.beep(200, 0.3, 'sawtooth', 0.5), 180); }
        levelup(){ [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.14, 'triangle', 0.55), i * 90)); }
        spell()  { [220, 440, 880].forEach((f, i) => setTimeout(() => this.beep(f, 0.12, 'square', 0.5), i * 40)); }
        combo()  { this.beep(1200, 0.05, 'triangle', 0.35); }
        error()  { this.beep(180, 0.12, 'square', 0.3); }
    }

    // ---------- MAIN GAME ----------
    class Game {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.audio = new Audio();
            // Cap DPR at 1.5 — retina-quality but half the pixel work of 2x. Big perf win.
            this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            // Static ground layer cached on an offscreen canvas (invalidated on zoom / resize)
            this.groundCache = null;
            this.groundCacheZoom = 0;
            this.groundCacheW = 0;
            this.groundCacheH = 0;
            // Time accumulator (passed to draw loops for consistent animation)
            this.tnow = 0;

            // World state
            this.res = { gold: 500, elixir: 150, dark: 0, gems: 5 };
            this.rates = { gold: 0, elixir: 0, dark: 0 };
            this.capBonus = 0;
            this.goldMult = 1;
            this.xpMult = 1;
            this.rallyHeal = 0.2;
            this.waveGems = 1;
            this.player = { level: 1, xp: 0, name: 'Chief' };
            this.buildings = [];
            this.projectiles = [];
            this.enemies = [];
            this.particles = [];
            this.popups = [];
            this.stats = { built: 0, kills: 0, upgrades: 0, clicks: 0, goldEarned: 0, spells: 0, maxCombo: 0 };
            this.achievements = {};
            this.dayTime = 0.25;
            this.dayCount = 1;

            // Wave system
            this.wave = { number: 0, timer: 90, spawnLeft: 0, spawnCd: 0, active: false, enemiesToSpawn: 0 };

            // Camera with zoom
            this.cam = { x: 0, y: 0, zoom: 1 };
            this.input = {
                x: 0, y: 0,
                down: false, drag: false,
                downX: 0, downY: 0, lastX: 0, lastY: 0,
                downBuilding: null,  // building under press (if any) — suppresses pan
                downTime: 0,
                shift: false, right: false,
                // double-click state
                lastClickTime: 0, lastClickTx: -99, lastClickTy: -99,
            };
            this.hoverTile = null;
            this.hoverBuilding = null;

            // Modes
            this.buildMode = null;    // building type string or null
            this.moveMode = null;     // building being moved or null
            this.spellMode = false;   // lightning targeting?

            // Boost
            this.boost = { mult: 1, timeLeft: 0 };

            // Combo
            this.combo = { count: 0, time: 0, mult: 1 };

            // Flash effect (screen flash for spells)
            this.flash = 0;

            this.lastTime = 0;
            this.alertTimer = 0;

            try {
                this.socket = (typeof io !== 'undefined') ? io() : null;
            } catch (e) { this.socket = null; }
        }

        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.bindInput();
            this.loadSave();
            this.buildMenu();
            this.bindUI();
            this.centerCamera();

            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));

            setInterval(() => this.save(), CFG.autoSaveMs);

            const welcome = document.getElementById('welcome');
            document.getElementById('welcomeStart').addEventListener('click', () => {
                welcome.classList.add('hidden');
                this.audio.ensure();
                this.audio.click();
            });
            if (localStorage.getItem(CFG.saveKey)) welcome.classList.add('hidden');
        }

        // ---------- Canvas sizing ----------
        resize() {
            const r = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = Math.floor(r.width * this.dpr);
            this.canvas.height = Math.floor(r.height * this.dpr);
            this.canvas.style.width = r.width + 'px';
            this.canvas.style.height = r.height + 'px';
            this.vw = r.width;
            this.vh = r.height;
            // Invalidate gradients that depend on viewport height
            this._skyCache = null;
        }

        centerCamera() {
            // Place camera so the middle of the grid sits at the visible center
            const midWorld = this.worldIso(CFG.gridW / 2, CFG.gridH / 2);
            this.cam.x = this.vw / 2 - midWorld.x * this.cam.zoom;
            this.cam.y = this.vh / 2 - midWorld.y * this.cam.zoom - 60;
        }

        // ---------- Input ----------
        bindInput() {
            const c = this.canvas;
            const DRAG_THRESH = 7;       // pixels from downX/downY before a press becomes a drag

            const getPos = (e) => {
                const r = c.getBoundingClientRect();
                const x = (e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0) - r.left;
                const y = (e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0) - r.top;
                return { x, y };
            };

            const onDown = (e) => {
                const p = getPos(e);
                this.input.down = true;
                this.input.drag = false;
                this.input.downX = p.x;
                this.input.downY = p.y;
                this.input.lastX = p.x;
                this.input.lastY = p.y;
                this.input.x = p.x;
                this.input.y = p.y;
                this.input.downTime = performance.now();
                this.input.shift = !!(e.shiftKey);
                this.input.right = (e.button === 2);
                // Identify what's under the press — when a building is pressed we NEVER pan
                const t = this.screenToTile(p.x, p.y);
                this.input.downBuilding = this.buildingAt(t.tx, t.ty);
                this.audio.ensure();
            };

            const onMove = (e) => {
                const p = getPos(e);
                this.input.x = p.x;
                this.input.y = p.y;
                if (this.input.down) {
                    const totalDx = p.x - this.input.downX;
                    const totalDy = p.y - this.input.downY;
                    const dist = Math.hypot(totalDx, totalDy);

                    // Never pan if the press started on a building (so we can click buildings reliably).
                    // Never pan while in build/move/spell mode — that would be confusing.
                    const canPan = !this.input.downBuilding
                                && !this.buildMode
                                && !this.moveMode
                                && !this.spellMode;

                    if (canPan && dist > DRAG_THRESH) {
                        this.input.drag = true;
                    }
                    if (this.input.drag) {
                        this.cam.x += p.x - this.input.lastX;
                        this.cam.y += p.y - this.input.lastY;
                    }
                    this.input.lastX = p.x;
                    this.input.lastY = p.y;
                }
                this.updateHover();
            };

            const onUp = () => {
                if (this.input.down && !this.input.drag) {
                    this.handleTap(this.input.x, this.input.y, this.input.shift, this.input.right);
                }
                this.input.down = false;
                this.input.drag = false;
                this.input.downBuilding = null;
            };

            c.addEventListener('mousedown', onDown);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            c.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive: false });
            c.addEventListener('touchmove',  (e) => { e.preventDefault(); onMove(e); }, { passive: false });
            c.addEventListener('touchend',   (e) => { e.preventDefault(); onUp(); }, { passive: false });

            // Right click opens modal
            c.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const rect = c.getBoundingClientRect();
                const sx = e.clientX - rect.left;
                const sy = e.clientY - rect.top;
                const t = this.screenToTile(sx, sy);
                const b = this.buildingAt(t.tx, t.ty);
                if (b) this.openBuildingModal(b);
            });

            // Wheel zoom (trackpad + mouse)
            c.addEventListener('wheel', (e) => {
                e.preventDefault();
                const rect = c.getBoundingClientRect();
                const ax = e.clientX - rect.left;
                const ay = e.clientY - rect.top;
                // Trackpad pinch shows as wheel with ctrlKey=true; mouse wheel also works
                const factor = Math.exp(-e.deltaY * 0.0015);
                this.zoomBy(factor, ax, ay);
            }, { passive: false });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.setBuildMode(null);
                    this.moveMode = null;
                    this.spellMode = false;
                    this.updateCanvasCursor();
                    this.closeModal();
                }
                if (e.key === ' ')     { e.preventDefault(); this.collectAll(); }
                if (e.key === '+' || e.key === '=') this.zoomBy(1.15, this.vw/2, this.vh/2);
                if (e.key === '-' || e.key === '_') this.zoomBy(1/1.15, this.vw/2, this.vh/2);
                if (e.key === '0') { this.cam.zoom = 1; this.centerCamera(); }
                if (e.key === 'l' || e.key === 'L') {
                    if (this.res.gems >= CFG.spellCost.gems) {
                        this.spellMode = true;
                        this.setBuildMode(null);
                        this.moveMode = null;
                        this.updateCanvasCursor();
                        this.toast('⚡ Click a tile to strike', 'warn');
                    }
                }
            });
        }

        zoomBy(factor, ax, ay) {
            const newZoom = clamp(this.cam.zoom * factor, CFG.zoomMin, CFG.zoomMax);
            // Keep the world point under (ax, ay) fixed
            const wx = (ax - this.cam.x) / this.cam.zoom;
            const wy = (ay - this.cam.y) / this.cam.zoom;
            this.cam.zoom = newZoom;
            this.cam.x = ax - wx * newZoom;
            this.cam.y = ay - wy * newZoom;
        }

        // ---------- Iso helpers (world space) ----------
        // iso(tx, ty): returns WORLD coordinates (no camera). Top vertex of tile diamond.
        worldIso(tx, ty) {
            return {
                x: (tx - ty) * CFG.tileW / 2,
                y: (tx + ty) * CFG.tileH / 2,
            };
        }
        // screen (sx,sy) -> continuous (tx,ty) in tile-space (top vertex = 0,0)
        screenToTile(sx, sy) {
            const wx = (sx - this.cam.x) / this.cam.zoom;
            const wy = (sy - this.cam.y) / this.cam.zoom;
            const tx = wx / CFG.tileW + wy / CFG.tileH;
            const ty = -wx / CFG.tileW + wy / CFG.tileH;
            return { tx: Math.floor(tx), ty: Math.floor(ty), tfx: tx, tfy: ty };
        }

        updateHover() {
            const t = this.screenToTile(this.input.x, this.input.y);
            if (t.tx >= 0 && t.tx < CFG.gridW && t.ty >= 0 && t.ty < CFG.gridH) {
                this.hoverTile = { tx: t.tx, ty: t.ty };
            } else {
                this.hoverTile = null;
            }
            this.hoverBuilding = this.buildingAt(t.tx, t.ty);
            this.showHoverTip();
        }

        showHoverTip() {
            const tip = document.getElementById('hoverTip');
            if (this.hoverBuilding && !this.buildMode && !this.spellMode && !this.moveMode) {
                const b = this.hoverBuilding;
                const def = BLD[b.type];
                const parts = [`<strong>${def.name}</strong> <span style="color:#a7a08a">Lv ${b.level}</span>`];
                parts.push(`HP ${Math.ceil(b.hp)}/${b.maxHp}`);
                if (def.production) {
                    const p = def.production(b.level);
                    Object.entries(p).forEach(([k,v]) => parts.push(`+${v.toFixed(1)} ${k}/s`));
                }
                if (def.defense) {
                    const d = def.defense(b.level);
                    parts.push(`DMG ${d.dmg} · CD ${d.cd}s · Range ${d.range}`);
                }
                if (def.provides) {
                    const p = def.provides(b.level);
                    if (p.cap) parts.push(`+${p.cap} storage`);
                    if (p.goldMult) parts.push(`+${(p.goldMult*100).toFixed(0)}% gold`);
                    if (p.xpMult) parts.push(`+${(p.xpMult*100).toFixed(0)}% XP`);
                    if (p.rallyMult) parts.push(`+${(p.rallyMult*100).toFixed(0)}% rally heal`);
                    if (p.waveGems) parts.push(`+${p.waveGems} gem/wave`);
                }
                parts.push(`<span style="color:#6b6854">Right-click or Shift+Click to upgrade</span>`);
                tip.innerHTML = parts.join('<br>');
                tip.style.left = (this.input.x + 18) + 'px';
                tip.style.top = (this.input.y + 18) + 'px';
                tip.classList.add('visible');
            } else {
                tip.classList.remove('visible');
            }
        }

        handleTap(sx, sy, shift = false, right = false) {
            this.audio.ensure();
            const t = this.screenToTile(sx, sy);
            const tx = t.tx;
            const ty = t.ty;

            // Spell targeting
            if (this.spellMode) {
                if (this.res.gems < CFG.spellCost.gems) {
                    this.toast('Not enough gems', 'warn');
                    this.spellMode = false;
                    this.updateCanvasCursor();
                    return;
                }
                this.res.gems -= CFG.spellCost.gems;
                this.castLightning(tx + 0.5, ty + 0.5);
                this.spellMode = false;
                this.updateCanvasCursor();
                this.updateUI();
                return;
            }

            // Move mode: relocate selected building to empty tile
            if (this.moveMode) {
                const mb = this.moveMode;
                // Restore for can-place test excluding the building itself
                const originalTx = mb.tx, originalTy = mb.ty;
                mb.tx = -999; mb.ty = -999;
                const ok = this.canPlace(mb.type, tx, ty);
                mb.tx = originalTx; mb.ty = originalTy;
                if (ok) {
                    mb.tx = tx;
                    mb.ty = ty;
                    this.toast('Building moved', 'success');
                    this.audio.build();
                    this.moveMode = null;
                    this.updateCanvasCursor();
                } else {
                    this.audio.error();
                    this.toast('Invalid move location', 'warn');
                }
                return;
            }

            // Build mode placement
            if (this.buildMode) {
                if (this.canPlace(this.buildMode, tx, ty)) {
                    this.placeBuilding(this.buildMode, tx, ty);
                } else {
                    this.audio.error();
                    this.toast('Cannot build here', 'warn');
                }
                return;
            }

            // Click building
            const b = this.buildingAt(tx, ty);
            if (b) {
                // Shift+click or right-click: immediate upgrade modal
                if (shift || right) {
                    this.openBuildingModal(b);
                    return;
                }
                // Double-click detection → move mode
                const now = performance.now();
                const dt = now - this.input.lastClickTime;
                const sameTile = (this.input.lastClickTx === tx && this.input.lastClickTy === ty);
                if (dt < 320 && sameTile && b.type !== 'townhall') {
                    // Double click → select for move
                    this.input.lastClickTime = 0;
                    this.closeModal();
                    this.moveMode = b;
                    this.setBuildMode(null);
                    this.spellMode = false;
                    this.updateCanvasCursor();
                    this.toast('Double-click detected — click an empty tile to move', 'warn');
                    this.audio.click();
                    return;
                }
                this.input.lastClickTime = now;
                this.input.lastClickTx = tx;
                this.input.lastClickTy = ty;

                // Single click → open upgrade / action modal (for ALL buildings)
                this.openBuildingModal(b);
                return;
            } else {
                // Clicked empty terrain — clear last click state
                this.input.lastClickTime = 0;
            }
        }

        /** Apply a click-bonus collection burst to a building (from the modal's Collect button). */
        collectFrom(b) {
            const def = BLD[b.type];
            if (!def.clickBonus) return;
            // Combo
            if (this.combo.time > 0) this.combo.count++;
            else this.combo.count = 1;
            this.combo.time = CFG.comboWindow;
            this.combo.mult = this.combo.count >= 10 ? 3 : this.combo.count >= 6 ? 2 : this.combo.count >= 3 ? 1.5 : 1;
            if (this.combo.count > this.stats.maxCombo) this.stats.maxCombo = this.combo.count;

            const bonus = def.clickBonus(b.level);
            Object.entries(bonus).forEach(([k, v]) => {
                const mul = this.boost.mult * this.combo.mult * (k === 'gold' ? this.goldMult : 1);
                const amt = Math.floor(v * mul);
                this.res[k] = Math.min(this.cap(), (this.res[k] || 0) + amt);
                if (k === 'gold') this.stats.goldEarned += amt;
                const p = this.worldIso(b.tx + 0.5, b.ty + 0.5);
                this.floatText(`+${amt}`, p.x, p.y - 40, this.resColor(k));
            });
            if (this.combo.count >= 3) {
                const p = this.worldIso(b.tx + 0.5, b.ty + 0.5);
                this.floatText(`COMBO x${this.combo.mult}`, p.x, p.y - 62, '#ffc857');
                this.audio.combo();
            }
            this.stats.clicks++;
            this.audio.coin();
            this.pulseRes(Object.keys(bonus)[0]);
            this.updateUI();
            this.checkAchievements();
        }

        castLightning(tx, ty) {
            this.stats.spells++;
            this.flash = 0.45;
            this.audio.spell();
            const dmg = CFG.spellBaseDmg + this.player.level * 60;
            // Big burst of particles
            const center = this.worldIso(tx, ty);
            for (let i = 0; i < 40; i++) {
                const ang = Math.random() * Math.PI * 2;
                const sp = rand(60, 360);
                this.particles.push({
                    x: center.x, y: center.y,
                    vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60,
                    life: rand(0.4, 1.1), max: 1.1,
                    color: i % 2 ? '#a6ecff' : '#ffffff', size: rand(2, 5),
                });
            }
            // Lightning bolt jagged line from sky
            for (let j = 0; j < 4; j++) {
                this.particles.push({
                    x: center.x + rand(-20, 20), y: center.y - 300,
                    vx: rand(-10, 10), vy: 1200,
                    life: 0.12, max: 0.12,
                    color: '#ffffff', size: 4,
                });
            }
            // Damage enemies in radius
            for (const e of this.enemies) {
                if (e.hp <= 0) continue;
                const d = Math.hypot(e.tx - tx, e.ty - ty);
                if (d <= CFG.spellRadius) {
                    this.hitEnemy(e, dmg);
                }
            }
            this.toast('⚡ Lightning strike!', 'success');
            this.checkAchievements();
        }

        // ---------- Building ops ----------
        canPlace(type, tx, ty) {
            const def = BLD[type];
            const size = def.size;
            for (let dy = 0; dy < size; dy++) {
                for (let dx = 0; dx < size; dx++) {
                    const cx = tx + dx, cy = ty + dy;
                    if (cx < 0 || cy < 0 || cx >= CFG.gridW || cy >= CFG.gridH) return false;
                    if (this.buildingAt(cx, cy)) return false;
                }
            }
            return true;
        }

        buildingAt(tx, ty) {
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (tx >= b.tx && tx < b.tx + def.size && ty >= b.ty && ty < b.ty + def.size) return b;
            }
            return null;
        }

        placeBuilding(type, tx, ty) {
            const def = BLD[type];
            // Only one Town Hall allowed per kingdom
            if (type === 'townhall' && this.buildings.some(b => b.type === 'townhall')) {
                this.audio.error();
                this.toast('You already have a Town Hall', 'warn');
                this.setBuildMode(null);
                return;
            }
            if (!this.canAfford(def.baseCost)) {
                this.audio.error();
                this.toast('Not enough resources', 'warn');
                return;
            }
            this.spend(def.baseCost);
            const b = {
                id: Math.random().toString(36).slice(2, 9),
                type, tx, ty,
                level: 1,
                hp: def.baseHP,
                maxHp: def.baseHP,
                lastShot: 0,
                placedAt: Date.now(),
                animScale: 0,
            };
            this.buildings.push(b);
            this.stats.built++;
            this.gainXp(15);
            this.audio.build();
            this.toast(`${def.name} built!`, 'success');
            this.setBuildMode(null);
            this.recomputeRates();
            this.updateUI();
            this.checkAchievements();

            const p = this.worldIso(tx + def.size/2, ty + def.size/2);
            for (let i = 0; i < 14; i++) {
                this.particles.push({
                    x: p.x + rand(-20, 20), y: p.y + rand(-10, 5),
                    vx: rand(-40, 40), vy: rand(-90, -30),
                    life: 0.8, max: 0.8,
                    color: '#d4c0a0', size: rand(3, 6),
                });
            }
        }

        upgradeBuilding(b) {
            const def = BLD[b.type];
            if (b.level >= def.maxLevel) {
                this.toast('Already max level', 'warn');
                return;
            }
            const cost = def.upgradeCost(b.level);
            if (!this.canAfford(cost)) {
                this.audio.error();
                this.toast('Not enough resources', 'warn');
                return;
            }
            this.spend(cost);
            b.level++;
            const hpMul = 1.18;
            b.maxHp = Math.floor(def.baseHP * Math.pow(hpMul, b.level - 1));
            b.hp = b.maxHp;
            this.stats.upgrades++;
            this.gainXp(25);
            this.audio.upgrade();
            this.toast(`${def.name} → Lv ${b.level}`, 'success');
            this.recomputeRates();
            this.updateUI();
            this.checkAchievements();
            if (document.getElementById('modal').classList.contains('open')) {
                this.openBuildingModal(b);
            }
        }

        destroyBuilding(b) {
            const def = BLD[b.type];
            const p = this.worldIso(b.tx + def.size/2, b.ty + def.size/2);
            for (let i = 0; i < 30; i++) {
                this.particles.push({
                    x: p.x, y: p.y,
                    vx: rand(-150, 150), vy: rand(-200, -40),
                    life: 1.2, max: 1.2,
                    color: i % 2 ? '#ff6b35' : '#8a4a1d',
                    size: rand(3, 7),
                });
            }
            this.buildings = this.buildings.filter(x => x !== b);
            this.audio.die();
            this.toast(`${def.name} destroyed!`, 'error');
            this.recomputeRates();
            if (b.type === 'townhall') this.gameOver();
        }

        canAfford(cost) {
            for (const k in cost) if ((this.res[k] || 0) < cost[k]) return false;
            return true;
        }

        spend(cost) {
            for (const k in cost) this.res[k] -= cost[k];
        }

        cap() {
            const th = this.buildings.find(b => b.type === 'townhall');
            const thCap = th ? BLD.townhall.provides(th.level).cap : 3000;
            return thCap + this.capBonus;
        }

        recomputeRates() {
            const r = { gold: 0, elixir: 0, dark: 0 };
            this.capBonus = 0;
            this.goldMult = 1;
            this.xpMult = 1;
            this.rallyHeal = 0.2;
            this.waveGems = 1;
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (def.production) {
                    const p = def.production(b.level);
                    for (const k in p) r[k] = (r[k] || 0) + p[k];
                }
                if (def.provides && b.type !== 'townhall') {
                    const p = def.provides(b.level);
                    if (p.cap) this.capBonus += p.cap;
                    if (p.goldMult) this.goldMult += p.goldMult;
                    if (p.xpMult) this.xpMult += p.xpMult;
                    if (p.rallyMult) this.rallyHeal += p.rallyMult;
                    if (p.waveGems) this.waveGems = Math.max(this.waveGems, 1 + p.waveGems);
                }
            }
            r.gold *= this.goldMult;
            this.rates = r;
        }

        // ---------- Combat ----------
        startWave() {
            this.wave.number++;
            this.wave.active = true;
            this.wave.enemiesToSpawn = Math.min(4 + this.wave.number * 2, 48);
            this.wave.spawnLeft = this.wave.enemiesToSpawn;
            this.wave.spawnCd = 0.8;
            this.audio.wave();
            this.toast(`Wave ${this.wave.number} — ${this.wave.enemiesToSpawn} raiders incoming!`, 'warn');
            this.showAlert(`⚔ WAVE ${this.wave.number} INCOMING ⚔`, 3);
        }

        spawnEnemy() {
            const edge = randi(0, 4);
            let tx, ty;
            if (edge === 0)      { tx = randi(0, CFG.gridW); ty = -1; }
            else if (edge === 1) { tx = CFG.gridW; ty = randi(0, CFG.gridH); }
            else if (edge === 2) { tx = randi(0, CFG.gridW); ty = CFG.gridH; }
            else                 { tx = -1; ty = randi(0, CFG.gridH); }
            const tier = Math.min(Math.floor(this.wave.number / 4), 3);
            const types = [
                { kind: 'goblin', hp: 40, dmg: 8, spd: 1.4, gold: 18, xp: 3, color: '#6a8e3a', size: 10 },
                { kind: 'orc',    hp: 110, dmg: 16, spd: 1.1, gold: 40, xp: 6, color: '#8a3a3a', size: 14 },
                { kind: 'troll',  hp: 280, dmg: 32, spd: 0.8, gold: 85, xp: 12, color: '#6a2c8a', size: 18 },
                { kind: 'ogre',   hp: 620, dmg: 55, spd: 0.6, gold: 180, xp: 24, color: '#3a2c6a', size: 22 },
            ];
            const t = types[Math.min(tier, types.length - 1)];
            const hpScale = 1 + this.wave.number * 0.12;
            const sp = this.worldIso(tx + 0.5, ty + 0.5);
            this.enemies.push({
                kind: t.kind,
                tx: tx + 0.5, ty: ty + 0.5,
                x: sp.x, y: sp.y,
                hp: t.hp * hpScale, maxHp: t.hp * hpScale,
                dmg: t.dmg, spd: t.spd,
                reward: { gold: t.gold, xp: t.xp },
                color: t.color, size: t.size,
                target: null,
                attackCd: 0,
                wobble: Math.random() * Math.PI * 2,
            });
        }

        pickTarget(enemy) {
            // Goblins prefer resource buildings; others target walls first (aggro)
            let best = null;
            let bestD = Infinity;
            for (const b of this.buildings) {
                if (b.hp <= 0) continue;
                const def = BLD[b.type];
                const cx = b.tx + def.size / 2;
                const cy = b.ty + def.size / 2;
                const d = Math.hypot(cx - enemy.tx, cy - enemy.ty);
                // Lower = more preferred
                let prio = 1;
                if (b.type === 'townhall') prio = 0.4;
                if (b.type === 'wall')     prio = 0.8;
                if (def.production)        prio = 0.6;
                const score = d * prio;
                if (score < bestD) { bestD = score; best = b; }
            }
            return best;
        }

        defenseTick(dt) {
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (!def.defense) continue;
                b.lastShot -= dt;
                if (b.lastShot > 0) continue;
                const d = def.defense(b.level);
                const cx = b.tx + def.size / 2;
                const cy = b.ty + def.size / 2;
                let target = null, best = Infinity;
                for (const e of this.enemies) {
                    if (e.hp <= 0) continue;
                    const dd = Math.hypot(e.tx - cx, e.ty - cy);
                    if (dd <= d.range && dd < best) { best = dd; target = e; }
                }
                if (target) {
                    b.lastShot = d.cd;
                    this.fireProjectile(b, target, d);
                }
            }
        }

        fireProjectile(from, target, d) {
            const def = BLD[from.type];
            const sx = this.worldIso(from.tx + def.size / 2, from.ty + def.size / 2);
            this.projectiles.push({
                x: sx.x, y: sx.y - 25,
                target,
                dmg: d.dmg,
                splash: d.splash || 0,
                speed: 640,
                ttl: 2,
                type: from.type,
            });
            this.audio.shoot();
        }

        hitEnemy(e, dmg, splash = 0) {
            e.hp -= dmg;
            this.popups.push({ x: e.x, y: e.y - 20, text: `-${Math.floor(dmg)}`, color: '#ff9a6b', life: 0.8, max: 0.8 });
            for (let i = 0; i < 4; i++) {
                this.particles.push({
                    x: e.x, y: e.y,
                    vx: rand(-80, 80), vy: rand(-60, 60),
                    life: 0.4, max: 0.4, color: '#ff6b35', size: rand(2, 4),
                });
            }
            if (splash > 0) {
                for (const other of this.enemies) {
                    if (other === e || other.hp <= 0) continue;
                    const dd = Math.hypot(other.tx - e.tx, other.ty - e.ty);
                    if (dd <= splash) {
                        other.hp -= dmg * 0.5;
                        this.popups.push({ x: other.x, y: other.y - 20, text: `-${Math.floor(dmg * 0.5)}`, color: '#ff9a6b', life: 0.8, max: 0.8 });
                    }
                }
            }
            if (e.hp <= 0 && !e.dead) {
                e.dead = true;
                this.stats.kills++;
                this.res.gold = Math.min(this.cap(), this.res.gold + e.reward.gold);
                this.stats.goldEarned += e.reward.gold;
                this.gainXp(e.reward.xp);
                if (Math.random() < 0.05) {
                    this.res.gems += 1;
                    this.floatText('+1 ♦', e.x, e.y - 30, '#5cd8ff');
                }
                this.audio.die();
                for (let i = 0; i < 14; i++) {
                    this.particles.push({
                        x: e.x, y: e.y,
                        vx: rand(-140, 140), vy: rand(-180, -30),
                        life: 0.9, max: 0.9, color: i % 2 ? '#ff6b35' : '#ffc857', size: rand(3, 6),
                    });
                }
                this.floatText(`+${e.reward.gold}`, e.x, e.y - 20, '#ffc857');
                this.checkAchievements();
            }
        }

        enemyTick(dt) {
            for (const e of this.enemies) {
                if (e.hp <= 0) continue;
                if (!e.target || e.target.hp <= 0) e.target = this.pickTarget(e);
                e.wobble += dt * 8;

                if (!e.target) {
                    const cx = CFG.gridW / 2, cy = CFG.gridH / 2;
                    const dx = cx - e.tx, dy = cy - e.ty;
                    const d = Math.hypot(dx, dy) || 1;
                    e.tx += (dx / d) * e.spd * dt;
                    e.ty += (dy / d) * e.spd * dt;
                } else {
                    const def = BLD[e.target.type];
                    const tx = e.target.tx + def.size / 2;
                    const ty = e.target.ty + def.size / 2;
                    const dx = tx - e.tx, dy = ty - e.ty;
                    const d = Math.hypot(dx, dy);
                    if (d > 0.6) {
                        e.tx += (dx / d) * e.spd * dt;
                        e.ty += (dy / d) * e.spd * dt;
                    } else {
                        e.attackCd -= dt;
                        if (e.attackCd <= 0) {
                            e.attackCd = 1.2;
                            e.target.hp -= e.dmg;
                            this.popups.push({ x: e.x, y: e.y - 30, text: `-${e.dmg}`, color: '#ff5d5d', life: 0.9, max: 0.9 });
                            this.audio.hit();
                            if (e.target.hp <= 0) this.destroyBuilding(e.target);
                        }
                    }
                }
                const p = this.worldIso(e.tx, e.ty);
                e.x = p.x;
                e.y = p.y - 10;
            }
            this.enemies = this.enemies.filter(e => e.hp > 0);
        }

        projectileTick(dt) {
            for (const p of this.projectiles) {
                const dx = p.target.x - p.x;
                const dy = p.target.y - p.y;
                const d = Math.hypot(dx, dy);
                if (d < 8 || p.target.hp <= 0) {
                    if (p.target.hp > 0) this.hitEnemy(p.target, p.dmg, p.splash);
                    p.dead = true;
                    continue;
                }
                const mv = p.speed * dt;
                p.x += (dx / d) * mv;
                p.y += (dy / d) * mv;
                p.ttl -= dt;
                if (p.ttl <= 0) p.dead = true;
            }
            this.projectiles = this.projectiles.filter(p => !p.dead);
        }

        // ---------- XP / Level ----------
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
                this.toast(`Level up! Now Lv ${this.player.level}`, 'success');
                this.res.gems += 2;
                this.showAlert(`★ LEVEL ${this.player.level} ★`, 2.5);
                this.buildMenu();
                this.checkAchievements();
            }
        }

        // ---------- Main loop ----------
        loop(ts) {
            const dt = Math.min((ts - this.lastTime) / 1000, 0.1);
            this.lastTime = ts;
            this.update(dt);
            this.render();
            requestAnimationFrame((t) => this.loop(t));
        }

        update(dt) {
            this.tnow += dt;

            // Day cycle
            this.dayTime += dt / CFG.dayLengthSec;
            if (this.dayTime >= 1) { this.dayTime -= 1; this.dayCount++; }

            // Resources
            const mult = this.boost.mult;
            this.res.gold   = Math.min(this.cap(), this.res.gold   + this.rates.gold   * dt * mult);
            this.res.elixir = Math.min(this.cap(), this.res.elixir + this.rates.elixir * dt * mult);
            this.res.dark   = Math.min(this.cap() * 0.3, this.res.dark + this.rates.dark * dt * mult);
            this.stats.goldEarned += this.rates.gold * dt * mult;

            // Boost timer
            if (this.boost.timeLeft > 0) {
                this.boost.timeLeft -= dt;
                if (this.boost.timeLeft <= 0) {
                    this.boost.mult = 1;
                    this.toast('Boost expired', 'warn');
                }
            }

            // Combo decay
            if (this.combo.time > 0) {
                this.combo.time -= dt;
                if (this.combo.time <= 0) {
                    this.combo.count = 0;
                    this.combo.mult = 1;
                }
            }

            // Building bob anim
            for (const b of this.buildings) {
                if (b.animScale < 1) b.animScale = Math.min(1, b.animScale + dt * 3);
            }

            // Wave spawn
            if (this.wave.active) {
                if (this.wave.spawnLeft > 0) {
                    this.wave.spawnCd -= dt;
                    if (this.wave.spawnCd <= 0) {
                        this.spawnEnemy();
                        this.wave.spawnLeft--;
                        this.wave.spawnCd = rand(0.6, 1.2);
                    }
                }
                if (this.wave.spawnLeft <= 0 && this.enemies.length === 0) {
                    this.wave.active = false;
                    this.wave.timer = Math.max(CFG.waveMinSec, CFG.waveBaseSec - this.wave.number * 2);
                    this.res.gems += this.waveGems;
                    this.gainXp(25 + this.wave.number * 5);
                    this.toast(`Wave ${this.wave.number} cleared! +${this.waveGems} ♦`, 'success');
                    this.showAlert('✓ WAVE CLEARED', 2);
                }
            } else {
                this.wave.timer -= dt;
                if (this.wave.timer <= 0) this.startWave();
            }

            // Combat
            this.defenseTick(dt);
            this.enemyTick(dt);
            this.projectileTick(dt);

            // Particles (cap budget — performance)
            if (this.particles.length > 240) {
                // Drop oldest
                this.particles.splice(0, this.particles.length - 240);
            }
            for (const p of this.particles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 280 * dt;
                p.life -= dt;
            }
            this.particles = this.particles.filter(p => p.life > 0);

            // Popups
            for (const p of this.popups) {
                p.y -= 40 * dt;
                p.life -= dt;
            }
            this.popups = this.popups.filter(p => p.life > 0);

            // Alert timer
            if (this.alertTimer > 0) {
                this.alertTimer -= dt;
                if (this.alertTimer <= 0) {
                    document.getElementById('alertPanel').classList.remove('active');
                }
            }

            // Flash decay
            if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2);

            // UI tick (less frequent)
            this._uiAcc = (this._uiAcc || 0) + dt;
            if (this._uiAcc >= 0.1) { this._uiAcc = 0; this.updateUI(); }
        }

        // ---------- Render ----------
        render() {
            const ctx = this.ctx;
            ctx.save();
            ctx.scale(this.dpr, this.dpr);
            ctx.clearRect(0, 0, this.vw, this.vh);

            // Sky (screen space)
            this.drawSky(ctx);

            // World transform
            ctx.save();
            ctx.translate(this.cam.x, this.cam.y);
            ctx.scale(this.cam.zoom, this.cam.zoom);

            this.drawGround(ctx);
            if (this.buildMode && this.hoverTile) this.drawBuildGhost(ctx);
            if (this.moveMode && this.hoverTile) this.drawMoveGhost(ctx);
            if (this.spellMode && this.hoverTile) this.drawSpellGhost(ctx);

            // Defense range indicator for hovered defense building
            if (this.hoverBuilding && BLD[this.hoverBuilding.type].defense) {
                const b = this.hoverBuilding;
                const def = BLD[b.type];
                const d = def.defense(b.level);
                const c = this.worldIso(b.tx + def.size / 2, b.ty + def.size / 2);
                ctx.strokeStyle = 'rgba(255, 200, 87, 0.5)';
                ctx.lineWidth = 2 / this.cam.zoom;
                ctx.setLineDash([6 / this.cam.zoom, 6 / this.cam.zoom]);
                ctx.beginPath();
                ctx.ellipse(c.x, c.y + CFG.tileH / 2, d.range * CFG.tileW / 2, d.range * CFG.tileH / 2, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Depth-sorted draw list
            const draws = [];
            for (const b of this.buildings) {
                const def = BLD[b.type];
                draws.push({ depth: b.tx + b.ty + def.size, fn: () => this.drawBuilding(ctx, b) });
            }
            for (const e of this.enemies) {
                draws.push({ depth: e.tx + e.ty + 0.5, fn: () => this.drawEnemy(ctx, e) });
            }
            draws.sort((a, b) => a.depth - b.depth);
            for (const d of draws) d.fn();

            // Projectiles on top
            for (const p of this.projectiles) this.drawProjectile(ctx, p);

            // Particles
            for (const p of this.particles) {
                const lifeFrac = p.life / p.max;
                if (p.smoke) {
                    // Smoke: expands, fades
                    const a = Math.max(0, lifeFrac * 0.35);
                    ctx.fillStyle = p.color + a.toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (2 - lifeFrac), 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.globalAlpha = lifeFrac;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * lifeFrac, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;

            // Floating text popups
            for (const p of this.popups) {
                ctx.globalAlpha = Math.min(1, p.life / p.max);
                ctx.font = 'bold 14px Inter, sans-serif';
                ctx.fillStyle = p.color;
                ctx.strokeStyle = 'rgba(0,0,0,.85)';
                ctx.lineWidth = 3;
                ctx.textAlign = 'center';
                ctx.strokeText(p.text, p.x, p.y);
                ctx.fillText(p.text, p.x, p.y);
            }
            ctx.globalAlpha = 1;

            ctx.restore(); // pop world transform

            // Night vignette overlay in screen space
            this.drawNightOverlay(ctx);

            // Flash effect
            if (this.flash > 0) {
                ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
                ctx.fillRect(0, 0, this.vw, this.vh);
            }

            ctx.restore();
        }

        drawSky(ctx) {
            const t = this.dayTime;
            const colors = [
                { t: 0.00, top: '#020410', bot: '#0a0820' },
                { t: 0.22, top: '#1c2a50', bot: '#d2623a' },
                { t: 0.35, top: '#55a7d4', bot: '#d4c896' },
                { t: 0.50, top: '#62b8e0', bot: '#a9d3a3' },
                { t: 0.70, top: '#5c72a0', bot: '#c9986c' },
                { t: 0.82, top: '#3a254a', bot: '#a63a3a' },
                { t: 1.00, top: '#020410', bot: '#0a0820' },
            ];
            let a = colors[0], b = colors[colors.length - 1];
            for (let i = 0; i < colors.length - 1; i++) {
                if (t >= colors[i].t && t <= colors[i+1].t) { a = colors[i]; b = colors[i+1]; break; }
            }
            const f = (t - a.t) / (b.t - a.t || 1);
            const top = mixColor(a.top, b.top, f);
            const bot = mixColor(a.bot, b.bot, f);
            // Cache gradient — recompute only when colors change appreciably
            if (!this._skyCache || this._skyCache.top !== top || this._skyCache.bot !== bot || this._skyCache.h !== this.vh) {
                const g = ctx.createLinearGradient(0, 0, 0, this.vh);
                g.addColorStop(0, top);
                g.addColorStop(1, bot);
                this._skyCache = { top, bot, h: this.vh, grad: g };
            }
            ctx.fillStyle = this._skyCache.grad;
            ctx.fillRect(0, 0, this.vw, this.vh);

            // Sun / moon — cheap shape, big visual upgrade
            const dayPhase = Math.sin(Math.PI * t);
            if (dayPhase > 0.02) {
                const cx = this.vw * (t * 1.05 - 0.025);
                const cy = this.vh * (0.75 - dayPhase * 0.55);
                const isNight = t < 0.25 || t > 0.75;
                if (!isNight) {
                    ctx.save();
                    const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
                    gg.addColorStop(0, 'rgba(255, 230, 160, 0.9)');
                    gg.addColorStop(0.3, 'rgba(255, 180, 100, 0.5)');
                    gg.addColorStop(1, 'rgba(255, 120, 40, 0)');
                    ctx.fillStyle = gg;
                    ctx.fillRect(cx - 60, cy - 60, 120, 120);
                    ctx.fillStyle = '#ffe3a1';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.fillStyle = 'rgba(240, 240, 255, 0.9)';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                    ctx.fill();
                    // Crater pattern
                    ctx.fillStyle = 'rgba(180, 180, 210, 0.5)';
                    ctx.beginPath(); ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(cx + 3, cy + 2, 1.5, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            }

            // Distant mountains silhouette
            ctx.save();
            ctx.fillStyle = `rgba(${Math.floor((1 - f) * 20 + 5)}, ${Math.floor((1 - f) * 25 + 8)}, ${Math.floor((1 - f) * 50 + 20)}, 0.55)`;
            ctx.beginPath();
            ctx.moveTo(0, this.vh * 0.7);
            const peaks = 8;
            for (let i = 0; i <= peaks; i++) {
                const px = (this.vw / peaks) * i;
                const py = this.vh * (0.7 - (Math.sin(i * 1.7) * 0.5 + 0.5) * 0.12);
                ctx.lineTo(px, py);
            }
            ctx.lineTo(this.vw, this.vh);
            ctx.lineTo(0, this.vh);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        drawNightOverlay(ctx) {
            const t = this.dayTime;
            let darkness = 0;
            if (t < 0.2 || t > 0.82) darkness = 0.45;
            else if (t < 0.3) darkness = (0.3 - t) * 4.5;
            else if (t > 0.72) darkness = (t - 0.72) * 4.5;
            if (darkness > 0) {
                ctx.fillStyle = `rgba(5, 3, 20, ${darkness})`;
                ctx.fillRect(0, 0, this.vw, this.vh);
            }
        }

        drawGround(ctx) {
            // The ground map never changes — bake it to an offscreen canvas once and blit.
            this.ensureGroundCache();
            if (this.groundCache) {
                // Our cache is painted in world space starting at (cache.offsetX, cache.offsetY).
                ctx.drawImage(this.groundCache, this.groundCacheOffsetX, this.groundCacheOffsetY);
            }
            if (this.hoverTile) {
                this.drawTileAt(ctx, this.hoverTile.tx, this.hoverTile.ty, null, '#ffc85799', 2);
            }
        }

        ensureGroundCache() {
            if (this.groundCache) return;
            // World-space bounding box of the full grid
            const corners = [
                this.worldIso(0, 0),
                this.worldIso(CFG.gridW, 0),
                this.worldIso(CFG.gridW, CFG.gridH),
                this.worldIso(0, CFG.gridH),
            ];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of corners) {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            }
            const pad = 40;
            minX -= pad; minY -= pad; maxX += pad; maxY += pad + CFG.tileH;
            const w = Math.ceil(maxX - minX);
            const h = Math.ceil(maxY - minY);
            const cv = document.createElement('canvas');
            cv.width = w;
            cv.height = h;
            const gctx = cv.getContext('2d');
            // Shift world (0,0) to (offsetX, offsetY) within the cache
            gctx.translate(-minX, -minY);

            // Base terrain — painterly variation so tiles don't look algorithmic
            // Pseudo-random per-tile without runtime cost at frame time
            const hash = (x, y) => {
                let h = (x * 374761393 ^ y * 668265263) >>> 0;
                h = (h ^ (h >>> 13)) >>> 0;
                h = (h * 1274126177) >>> 0;
                return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
            };
            const palette = [
                '#2f4b28', '#35582e', '#2a4623', '#3c5f34',
                '#2d4a2a', '#3a5c30', '#28421f', '#40633a'
            ];
            for (let y = 0; y < CFG.gridH; y++) {
                for (let x = 0; x < CFG.gridW; x++) {
                    const r = hash(x, y);
                    const base = palette[Math.floor(r * palette.length)];
                    this.drawTileAt(gctx, x, y, base, 'rgba(0,0,0,0.22)', 1);
                    // Scatter cosmetic clutter for visual interest
                    const rr = hash(x + 97, y + 31);
                    const p = this.worldIso(x + 0.5, y + 0.5);
                    if (rr < 0.07) {
                        // Tiny flowers
                        gctx.fillStyle = rr < 0.035 ? '#f5d260' : '#e3a8ff';
                        gctx.beginPath();
                        gctx.arc(p.x + (rr - 0.035) * 40, p.y + CFG.tileH * 0.3, 1.6, 0, Math.PI * 2);
                        gctx.fill();
                    } else if (rr < 0.12) {
                        // Small stones
                        gctx.fillStyle = '#6a6a6c';
                        gctx.beginPath();
                        gctx.ellipse(p.x - 4, p.y + CFG.tileH * 0.35, 2.2, 1.2, 0, 0, Math.PI * 2);
                        gctx.fill();
                    } else if (rr < 0.16) {
                        // Grass tufts
                        gctx.strokeStyle = '#5a8a3a';
                        gctx.lineWidth = 1;
                        gctx.beginPath();
                        gctx.moveTo(p.x - 2, p.y + CFG.tileH * 0.4);
                        gctx.lineTo(p.x - 2, p.y + CFG.tileH * 0.4 - 3);
                        gctx.moveTo(p.x, p.y + CFG.tileH * 0.4);
                        gctx.lineTo(p.x, p.y + CFG.tileH * 0.4 - 4);
                        gctx.moveTo(p.x + 2, p.y + CFG.tileH * 0.4);
                        gctx.lineTo(p.x + 2, p.y + CFG.tileH * 0.4 - 3);
                        gctx.stroke();
                    }
                }
            }

            // Border outline around whole grid for a crafted map feel
            gctx.strokeStyle = 'rgba(0,0,0,0.55)';
            gctx.lineWidth = 3;
            gctx.beginPath();
            const p0 = this.worldIso(0, 0);
            const p1 = this.worldIso(CFG.gridW, 0);
            const p2 = this.worldIso(CFG.gridW, CFG.gridH);
            const p3 = this.worldIso(0, CFG.gridH);
            gctx.moveTo(p0.x, p0.y + CFG.tileH / 2);
            gctx.lineTo(p1.x, p1.y + CFG.tileH / 2);
            gctx.lineTo(p2.x, p2.y + CFG.tileH / 2);
            gctx.lineTo(p3.x, p3.y + CFG.tileH / 2);
            gctx.closePath();
            gctx.stroke();

            this.groundCache = cv;
            this.groundCacheOffsetX = minX;
            this.groundCacheOffsetY = minY;
        }

        // Draws the diamond for tile (tx, ty) in world coords
        drawTileAt(ctx, tx, ty, fill, stroke, lw = 1) {
            const p = this.worldIso(tx, ty);
            const w = CFG.tileW / 2;
            const h = CFG.tileH / 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + w, p.y + h);
            ctx.lineTo(p.x, p.y + h * 2);
            ctx.lineTo(p.x - w, p.y + h);
            ctx.closePath();
            if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
        }

        drawBuildGhost(ctx) {
            const def = BLD[this.buildMode];
            const { tx, ty } = this.hoverTile;
            const ok = this.canPlace(this.buildMode, tx, ty) && this.canAfford(def.baseCost);
            const color = ok ? '#6bff95' : '#ff5d5d';
            for (let dy = 0; dy < def.size; dy++) {
                for (let dx = 0; dx < def.size; dx++) {
                    this.drawTileAt(ctx, tx + dx, ty + dy, color + '33', color + 'cc', 2);
                }
            }
            if (ok) {
                ctx.globalAlpha = 0.65;
                this.drawBuilding(ctx, { tx, ty, type: this.buildMode, level: 1, hp: 100, maxHp: 100, animScale: 1, ghost: true });
                ctx.globalAlpha = 1;
            }
        }

        drawMoveGhost(ctx) {
            const def = BLD[this.moveMode.type];
            const { tx, ty } = this.hoverTile;
            // Temporarily hide the building so canPlace can see this tile as empty
            const origTx = this.moveMode.tx, origTy = this.moveMode.ty;
            this.moveMode.tx = -999; this.moveMode.ty = -999;
            const ok = this.canPlace(this.moveMode.type, tx, ty);
            this.moveMode.tx = origTx; this.moveMode.ty = origTy;
            const color = ok ? '#5cd8ff' : '#ff5d5d';
            for (let dy = 0; dy < def.size; dy++) {
                for (let dx = 0; dx < def.size; dx++) {
                    this.drawTileAt(ctx, tx + dx, ty + dy, color + '44', color + 'cc', 2);
                }
            }
        }

        drawSpellGhost(ctx) {
            const { tx, ty } = this.hoverTile;
            const c = this.worldIso(tx + 0.5, ty + 0.5);
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#a6ecff';
            ctx.lineWidth = 3 / this.cam.zoom;
            ctx.setLineDash([8 / this.cam.zoom, 4 / this.cam.zoom]);
            ctx.beginPath();
            ctx.ellipse(c.x, c.y + CFG.tileH / 2, CFG.spellRadius * CFG.tileW / 2, CFG.spellRadius * CFG.tileH / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        drawBuilding(ctx, b) {
            const def = BLD[b.type];
            const size = def.size;
            const scale = b.animScale ?? 1;
            // Per-building idle bob so the village doesn't feel static
            if (b._seed === undefined) b._seed = Math.random() * Math.PI * 2;
            const idleBob = Math.sin(this.tnow * 1.4 + b._seed) * 0.6;
            const centerP = this.worldIso(b.tx + size / 2, b.ty + size / 2);
            centerP.y += idleBob;
            const fw = CFG.tileW * size / 2;
            const fh = CFG.tileH * size / 2;

            // Walls are drawn short and flat
            const isWall = b.type === 'wall';

            // Layered shadow (softer inner + harder outer for depth)
            ctx.fillStyle = 'rgba(0,0,0,.22)';
            ctx.beginPath();
            ctx.ellipse(centerP.x, centerP.y + fh * 0.3, fw * 1.0, fh * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,.45)';
            ctx.beginPath();
            ctx.ellipse(centerP.x, centerP.y + fh * 0.25, fw * 0.8, fh * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            const h = this.buildHeight(b.type) * scale;

            // Right face
            ctx.fillStyle = def.color1;
            ctx.beginPath();
            ctx.moveTo(centerP.x, centerP.y + fh);
            ctx.lineTo(centerP.x + fw, centerP.y);
            ctx.lineTo(centerP.x + fw, centerP.y - h);
            ctx.lineTo(centerP.x, centerP.y + fh - h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.35)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Left face
            ctx.fillStyle = def.color2;
            ctx.beginPath();
            ctx.moveTo(centerP.x, centerP.y + fh);
            ctx.lineTo(centerP.x - fw, centerP.y);
            ctx.lineTo(centerP.x - fw, centerP.y - h);
            ctx.lineTo(centerP.x, centerP.y + fh - h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Top diamond
            ctx.fillStyle = def.roof;
            ctx.beginPath();
            ctx.moveTo(centerP.x, centerP.y - fh - h);
            ctx.lineTo(centerP.x + fw, centerP.y - h);
            ctx.lineTo(centerP.x, centerP.y + fh - h);
            ctx.lineTo(centerP.x - fw, centerP.y - h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Roof shine line (hand-painted highlight)
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(centerP.x - fw * 0.6, centerP.y - h - fh * 0.3);
            ctx.lineTo(centerP.x, centerP.y - fh - h + 2);
            ctx.stroke();

            // Shared wall decorations — plank/brick lines + windows that glow at night.
            // Skip for walls (their own detail) and ghosts (simpler preview).
            if (!isWall && !b.ghost) {
                this.drawBuildingBody(ctx, b, centerP, h, fw, fh);
            }

            // Type-specific details
            if (!isWall) this.drawBuildingDetail(ctx, b, centerP, h, fw, fh);
            else this.drawWallDetail(ctx, centerP, h, fw, fh);

            // Chimney smoke for buildings with clickBonus / production — rises continuously
            if (!b.ghost && (def.production || b.type === 'builderhut' || b.type === 'lab')) {
                this.spawnChimneyPuff(b, centerP, h, fw);
            }

            if (b.ghost) return;

            // Level badge
            ctx.fillStyle = 'rgba(0,0,0,.85)';
            ctx.beginPath();
            ctx.arc(centerP.x + fw * 0.45, centerP.y - h - fh * 0.15, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffc857';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#ffc857';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.level, centerP.x + fw * 0.45, centerP.y - h - fh * 0.15);

            // HP bar
            if (b.hp < b.maxHp) {
                const bw = fw * 1.5;
                const bh = 5;
                const bx = centerP.x - bw / 2;
                const by = centerP.y - fh - h - 18;
                ctx.fillStyle = 'rgba(0,0,0,.75)';
                ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
                ctx.fillStyle = '#3a1010';
                ctx.fillRect(bx, by, bw, bh);
                const pct = Math.max(0, b.hp / b.maxHp);
                const col = pct > 0.5 ? '#6bff95' : pct > 0.25 ? '#ffc857' : '#ff5d5d';
                ctx.fillStyle = col;
                ctx.fillRect(bx, by, bw * pct, bh);
            }

            // Move mode highlight
            if (this.moveMode === b) {
                ctx.strokeStyle = '#5cd8ff';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(centerP.x, centerP.y - h - fh);
                ctx.lineTo(centerP.x + fw, centerP.y - h);
                ctx.lineTo(centerP.x, centerP.y - h + fh);
                ctx.lineTo(centerP.x - fw, centerP.y - h);
                ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        buildHeight(type) {
            return ({
                townhall: 78, goldmine: 40, elixirwell: 42, darkdrill: 48,
                wall: 22,
                cannon: 38, archer: 58, mortar: 44, airdef: 58,
                wizard: 54, tesla: 52, xbow: 48, inferno: 62,
                storage: 46, builderhut: 36, lab: 46, clancastle: 72, armycamp: 40,
            })[type] || 40;
        }

        drawWallDetail(ctx, c, h, fw) {
            // Stone block lines
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            const topY = c.y - h;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(c.x - fw * 0.85, topY + i * 6 + 4);
                ctx.lineTo(c.x + fw * 0.85, topY + i * 6 + 4);
                ctx.stroke();
            }
            // Crenellations on top
            ctx.fillStyle = '#4a4a52';
            for (let i = -2; i <= 2; i++) {
                const bx = c.x + i * (fw / 3) - 3;
                ctx.fillRect(bx, c.y - h - 6, 6, 6);
            }
            // Moss tufts
            ctx.fillStyle = '#5a8a3a';
            ctx.beginPath();
            ctx.arc(c.x - fw * 0.55, topY + 10, 1.5, 0, Math.PI * 2);
            ctx.arc(c.x + fw * 0.5, topY + 14, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        /** Paints the visible wall faces with plank/brick lines + glowing windows. */
        drawBuildingBody(ctx, b, c, h, fw, fh) {
            // RIGHT FACE (runs from (c.x, c.y+fh) → (c.x+fw, c.y) with height h upward)
            // LEFT FACE  (runs from (c.x, c.y+fh) → (c.x-fw, c.y) with height h upward)
            // Stones/planks: horizontal lines at fractional heights
            ctx.save();
            // Plank lines on right face
            ctx.strokeStyle = 'rgba(0,0,0,0.28)';
            ctx.lineWidth = 1;
            for (let t = 0.25; t < 1; t += 0.32) {
                const y = -h * t;
                ctx.beginPath();
                ctx.moveTo(c.x + 2, c.y + fh - h * t - (fh * t));
                // Easier: draw along the face's top edge at fraction t down from top.
                ctx.moveTo(c.x, c.y + fh + y);
                ctx.lineTo(c.x + fw, c.y + y);
                ctx.moveTo(c.x, c.y + fh + y);
                ctx.lineTo(c.x - fw, c.y + y);
                ctx.stroke();
            }

            // Windows — warm glow at night, dim plank at day
            const isNight = this.dayTime < 0.25 || this.dayTime > 0.78;
            const winFill = isNight ? '#ffcc6a' : '#1a140a';
            const glow = isNight ? 'rgba(255, 204, 106, 0.45)' : 'rgba(0,0,0,0.2)';
            // How many windows based on building type / size
            const winSpec = {
                townhall:  [{ face: 'R', u: 0.28, v: 0.45, s: 1.6 }, { face: 'L', u: 0.28, v: 0.45, s: 1.6 }, { face: 'R', u: 0.55, v: 0.45, s: 1.3 }, { face: 'L', u: 0.55, v: 0.45, s: 1.3 }],
                archer:    [{ face: 'R', u: 0.35, v: 0.6,  s: 1.1 }, { face: 'L', u: 0.35, v: 0.6, s: 1.1 }],
                wizard:    [{ face: 'R', u: 0.3,  v: 0.55, s: 1.1 }, { face: 'L', u: 0.3,  v: 0.55, s: 1.1 }],
                storage:   [{ face: 'R', u: 0.4,  v: 0.5,  s: 1.2 }],
                lab:       [{ face: 'R', u: 0.35, v: 0.5,  s: 1.2 }],
                builderhut:[{ face: 'R', u: 0.4,  v: 0.5,  s: 1.1 }],
                clancastle:[{ face: 'R', u: 0.3,  v: 0.6,  s: 1.4 }, { face: 'L', u: 0.3, v: 0.6, s: 1.4 }, { face: 'R', u: 0.6, v: 0.6, s: 1.2 }, { face: 'L', u: 0.6, v: 0.6, s: 1.2 }],
                goldmine:  [{ face: 'R', u: 0.5,  v: 0.6,  s: 0.9 }],
                elixirwell:[{ face: 'R', u: 0.5,  v: 0.55, s: 0.9 }],
                darkdrill: [{ face: 'R', u: 0.5,  v: 0.6,  s: 0.9 }],
                tesla:     [{ face: 'R', u: 0.5,  v: 0.6,  s: 0.9 }],
                inferno:   [{ face: 'R', u: 0.5,  v: 0.55, s: 1.0 }],
                armycamp:  [{ face: 'R', u: 0.5,  v: 0.6,  s: 0.9 }],
                xbow:      [{ face: 'R', u: 0.5,  v: 0.6,  s: 0.9 }],
                airdef:    [{ face: 'R', u: 0.5,  v: 0.55, s: 0.9 }],
                mortar:    [{ face: 'R', u: 0.5,  v: 0.55, s: 0.9 }],
                cannon:    [{ face: 'R', u: 0.5,  v: 0.55, s: 0.9 }],
            };
            const spec = winSpec[b.type] || [];
            for (const w of spec) {
                // Compute window center on the given face
                // Right face parametric: from (c.x + fw, c.y) along to (c.x, c.y + fh), lifted by -h*v
                let wx, wy;
                if (w.face === 'R') {
                    wx = c.x + fw * (1 - w.u);
                    wy = c.y + fh * w.u - h * w.v;
                } else {
                    wx = c.x - fw * (1 - w.u);
                    wy = c.y + fh * w.u - h * w.v;
                }
                if (isNight) {
                    // Soft glow halo
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(wx, wy, 5 * w.s, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = winFill;
                ctx.fillRect(wx - 1.6 * w.s, wy - 2.4 * w.s, 3.2 * w.s, 4.8 * w.s);
                // Frame cross
                ctx.strokeStyle = 'rgba(0,0,0,0.7)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(wx - 1.6 * w.s, wy);
                ctx.lineTo(wx + 1.6 * w.s, wy);
                ctx.moveTo(wx, wy - 2.4 * w.s);
                ctx.lineTo(wx, wy + 2.4 * w.s);
                ctx.stroke();
            }
            ctx.restore();
        }

        /** Emits smoke puff particles from a chimney on top of the building, throttled per building. */
        spawnChimneyPuff(b, c, h, fw) {
            if (b._nextSmoke === undefined) b._nextSmoke = this.tnow + Math.random() * 2;
            if (this.tnow < b._nextSmoke) return;
            b._nextSmoke = this.tnow + rand(0.9, 1.6);
            // Cap particles for perf
            if (this.particles.length > 200) return;
            const cx = c.x + fw * 0.35;
            const cy = c.y - h - 6;
            this.particles.push({
                x: cx + rand(-2, 2),
                y: cy,
                vx: rand(-8, 14),
                vy: rand(-28, -18),
                life: rand(1.6, 2.6),
                max: 2.6,
                color: 'rgba(220,220,225,',
                size: rand(3, 5),
                smoke: true,
            });
        }

        drawBuildingDetail(ctx, b, c, h, fw, fh) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            switch (b.type) {
                case 'townhall': {
                    ctx.fillStyle = '#d4c0a0';
                    ctx.fillRect(c.x - 2, c.y - h - fh - 26, 3, 26);
                    ctx.fillStyle = '#c73535';
                    ctx.beginPath();
                    ctx.moveTo(c.x + 1, c.y - h - fh - 26);
                    ctx.lineTo(c.x + 24, c.y - h - fh - 21);
                    ctx.lineTo(c.x + 1, c.y - h - fh - 16);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#ffc857';
                    ctx.font = 'bold 26px Cinzel, serif';
                    ctx.fillText('♔', c.x, c.y - h * 0.4);
                    break;
                }
                case 'goldmine': {
                    for (let i = 0; i < 4; i++) {
                        ctx.fillStyle = i % 2 ? '#ffc857' : '#d49b20';
                        ctx.beginPath();
                        ctx.arc(c.x - 5 + i * 3, c.y - h - fh * 0.3 - i * 2, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.fillStyle = '#ffe3a1';
                    ctx.font = 'bold 14px Inter';
                    ctx.fillText('◈', c.x, c.y - h * 0.35);
                    break;
                }
                case 'elixirwell': {
                    ctx.fillStyle = '#e3a8ff';
                    ctx.beginPath();
                    ctx.ellipse(c.x, c.y - h - fh * 0.2, fw * 0.35, fh * 0.45, 0, 0, Math.PI * 2);
                    ctx.fill();
                    for (let i = 0; i < 3; i++) {
                        ctx.fillStyle = '#f5d5ff';
                        ctx.beginPath();
                        ctx.arc(c.x - 6 + i * 6 + Math.sin(Date.now()/300 + i)*2, c.y - h - fh * 0.3 - (i*2), 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                }
                case 'darkdrill': {
                    ctx.fillStyle = '#8a4de0';
                    ctx.font = 'bold 18px Inter';
                    ctx.fillText('✦', c.x, c.y - h * 0.35);
                    ctx.strokeStyle = '#3e1d66';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        ctx.moveTo(c.x - 5, c.y - h - fh * 0.2 - i * 3);
                        ctx.lineTo(c.x + 5, c.y - h - fh * 0.2 - i * 3);
                    }
                    ctx.stroke();
                    break;
                }
                case 'cannon': {
                    ctx.strokeStyle = '#1a1a1a';
                    ctx.lineWidth = 8;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(c.x - 8, c.y - h - fh * 0.15);
                    ctx.lineTo(c.x + 14, c.y - h - fh * 0.55);
                    ctx.stroke();
                    ctx.fillStyle = '#444';
                    ctx.beginPath();
                    ctx.arc(c.x - 8, c.y - h - fh * 0.15, 4, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'archer': {
                    ctx.fillStyle = '#e0c896';
                    ctx.fillRect(c.x - 2, c.y - h - fh * 0.5, 4, 10);
                    ctx.strokeStyle = '#8b6b3d';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(c.x + 6, c.y - h - fh * 0.45, 6, -Math.PI/2, Math.PI/2);
                    ctx.stroke();
                    ctx.fillStyle = '#5a3c1f';
                    for (let i = -2; i <= 2; i++) ctx.fillRect(c.x + i * 6 - 2, c.y - h - fh * 0.15, 4, 4);
                    break;
                }
                case 'mortar': {
                    // Thick short barrel pointing up
                    ctx.fillStyle = '#1a1c28';
                    ctx.beginPath();
                    ctx.ellipse(c.x, c.y - h - fh * 0.25, 10, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#0a0c16';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.fillStyle = '#3a3f55';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.4, 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'airdef': {
                    // Missile launcher with 3 tubes
                    for (let i = -1; i <= 1; i++) {
                        ctx.fillStyle = '#1a2610';
                        ctx.fillRect(c.x + i * 6 - 2, c.y - h - fh * 0.55, 4, 16);
                        ctx.fillStyle = '#89c055';
                        ctx.beginPath();
                        ctx.arc(c.x + i * 6, c.y - h - fh * 0.55, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                }
                case 'wizard': {
                    const t = Date.now() / 400;
                    const r = 8 + Math.sin(t) * 2;
                    const g = ctx.createRadialGradient(c.x, c.y - h - fh * 0.4, 0, c.x, c.y - h - fh * 0.4, r + 4);
                    g.addColorStop(0, '#a6ecff');
                    g.addColorStop(0.6, '#5cd8ff');
                    g.addColorStop(1, 'rgba(92,216,255,0)');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.4, r + 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'tesla': {
                    // Crackling lightning coil
                    const t = Date.now() / 120;
                    ctx.strokeStyle = '#a6c8ff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(c.x, c.y - h - fh * 0.55);
                    for (let i = 0; i < 4; i++) {
                        ctx.lineTo(c.x + Math.sin(t + i) * 5, c.y - h - fh * 0.55 + i * 4);
                    }
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.55, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'xbow': {
                    // Horizontal bow arm
                    ctx.strokeStyle = '#5a3c1f';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(c.x - 14, c.y - h - fh * 0.3);
                    ctx.lineTo(c.x + 14, c.y - h - fh * 0.3);
                    ctx.stroke();
                    // String
                    ctx.strokeStyle = '#d4c0a0';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(c.x - 14, c.y - h - fh * 0.3);
                    ctx.lineTo(c.x, c.y - h - fh * 0.15);
                    ctx.lineTo(c.x + 14, c.y - h - fh * 0.3);
                    ctx.stroke();
                    // Bolt
                    ctx.fillStyle = '#a9855a';
                    ctx.fillRect(c.x - 1, c.y - h - fh * 0.35, 2, 10);
                    break;
                }
                case 'inferno': {
                    // Glowing core
                    const t = Date.now() / 200;
                    const r = 7 + Math.sin(t) * 2;
                    const g = ctx.createRadialGradient(c.x, c.y - h - fh * 0.5, 0, c.x, c.y - h - fh * 0.5, r + 6);
                    g.addColorStop(0, '#ffee99');
                    g.addColorStop(0.3, '#ff6b35');
                    g.addColorStop(1, 'rgba(255,20,0,0)');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.5, r + 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'storage': {
                    ctx.strokeStyle = '#3a2814';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(c.x - fw * 0.4, c.y - h * 0.4);
                    ctx.lineTo(c.x + fw * 0.4, c.y - h * 0.4);
                    ctx.moveTo(c.x, c.y - h * 0.8);
                    ctx.lineTo(c.x, c.y - fh * 0.5);
                    ctx.stroke();
                    break;
                }
                case 'builderhut': {
                    // Hammer
                    ctx.fillStyle = '#8b6b3d';
                    ctx.fillRect(c.x - 1, c.y - h - fh * 0.6, 2, 18);
                    ctx.fillStyle = '#888';
                    ctx.fillRect(c.x - 6, c.y - h - fh * 0.65, 12, 6);
                    break;
                }
                case 'lab': {
                    // Flask
                    ctx.fillStyle = '#4bb08e';
                    ctx.beginPath();
                    ctx.moveTo(c.x - 5, c.y - h - fh * 0.55);
                    ctx.lineTo(c.x + 5, c.y - h - fh * 0.55);
                    ctx.lineTo(c.x + 8, c.y - h - fh * 0.25);
                    ctx.lineTo(c.x - 8, c.y - h - fh * 0.25);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(c.x - 3, c.y - h - fh * 0.65, 6, 4);
                    // Bubbles
                    const t = Date.now() / 200;
                    for (let i = 0; i < 3; i++) {
                        ctx.fillStyle = '#a8e5d0';
                        ctx.beginPath();
                        ctx.arc(c.x - 3 + i * 3, c.y - h - fh * 0.35 + Math.sin(t + i) * 2, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                }
                case 'clancastle': {
                    // Multiple flags
                    ctx.fillStyle = '#d4c0a0';
                    ctx.fillRect(c.x - 18, c.y - h - fh - 20, 2, 20);
                    ctx.fillRect(c.x + 16, c.y - h - fh - 20, 2, 20);
                    ctx.fillStyle = '#2a3a5a';
                    ctx.fillRect(c.x - 16, c.y - h - fh - 20, 10, 6);
                    ctx.fillRect(c.x + 18, c.y - h - fh - 20, 10, 6);
                    // Central crown
                    ctx.fillStyle = '#ffc857';
                    ctx.font = 'bold 24px Cinzel, serif';
                    ctx.fillText('♖', c.x, c.y - h * 0.4);
                    break;
                }
                case 'armycamp': {
                    // Tent triangle
                    ctx.fillStyle = '#a58048';
                    ctx.beginPath();
                    ctx.moveTo(c.x, c.y - h - fh * 0.6);
                    ctx.lineTo(c.x + 14, c.y - h - fh * 0.2);
                    ctx.lineTo(c.x - 14, c.y - h - fh * 0.2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#62421c';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#62421c';
                    ctx.beginPath();
                    ctx.moveTo(c.x - 3, c.y - h - fh * 0.2);
                    ctx.lineTo(c.x + 3, c.y - h - fh * 0.2);
                    ctx.lineTo(c.x, c.y - h - fh * 0.35);
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
            }
            ctx.restore();
        }

        drawEnemy(ctx, e) {
            const bob = Math.sin(e.wobble) * 3;
            ctx.fillStyle = 'rgba(0,0,0,.45)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.size + 4, e.size * 0.9, e.size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            const grad = ctx.createRadialGradient(e.x - e.size * 0.3, e.y - e.size * 0.3 + bob, 2, e.x, e.y + bob, e.size);
            grad.addColorStop(0, mixColor(e.color, '#ffffff', 0.3));
            grad.addColorStop(1, e.color);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(e.x, e.y + bob, e.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(e.x - e.size * 0.3, e.y - e.size * 0.2 + bob, 2.2, 0, Math.PI * 2);
            ctx.arc(e.x + e.size * 0.3, e.y - e.size * 0.2 + bob, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(e.x - e.size * 0.3, e.y - e.size * 0.2 + bob, 1.1, 0, Math.PI * 2);
            ctx.arc(e.x + e.size * 0.3, e.y - e.size * 0.2 + bob, 1.1, 0, Math.PI * 2);
            ctx.fill();

            const bw = e.size * 2.2;
            const bx = e.x - bw / 2;
            const by = e.y - e.size - 10 + bob;
            ctx.fillStyle = 'rgba(0,0,0,.7)';
            ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
            ctx.fillStyle = '#2a0a0a';
            ctx.fillRect(bx, by, bw, 3);
            ctx.fillStyle = '#ff5d5d';
            ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), 3);
        }

        drawProjectile(ctx, p) {
            if (p.type === 'cannon' || p.type === 'mortar') {
                ctx.fillStyle = p.type === 'mortar' ? '#444' : '#222';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.type === 'mortar' ? 5 : 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else if (p.type === 'archer' || p.type === 'xbow') {
                ctx.strokeStyle = '#e0c896';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const dx = p.target.x - p.x, dy = p.target.y - p.y;
                const d = Math.hypot(dx, dy) || 1;
                ctx.moveTo(p.x - dx / d * 8, p.y - dy / d * 8);
                ctx.lineTo(p.x + dx / d * 8, p.y + dy / d * 8);
                ctx.stroke();
            } else if (p.type === 'wizard') {
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
                g.addColorStop(0, '#fff');
                g.addColorStop(0.4, '#5cd8ff');
                g.addColorStop(1, 'rgba(92,216,255,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'tesla') {
                // Lightning bolt segment
                ctx.strokeStyle = '#a6c8ff';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                const dx = p.target.x - p.x, dy = p.target.y - p.y;
                const d = Math.hypot(dx, dy) || 1;
                const perpX = -dy / d * 3, perpY = dx / d * 3;
                const mx = (p.x + p.target.x) / 2 + perpX * (Math.random() - 0.5) * 4;
                const my = (p.y + p.target.y) / 2 + perpY * (Math.random() - 0.5) * 4;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mx, my);
                ctx.lineTo(p.target.x, p.target.y);
                ctx.stroke();
            } else if (p.type === 'inferno') {
                // Orange beam
                ctx.strokeStyle = '#ff8a3a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.target.x, p.target.y);
                ctx.stroke();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if (p.type === 'airdef') {
                // Missile
                ctx.fillStyle = '#89c055';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffcc66';
                ctx.beginPath();
                ctx.arc(p.x, p.y + 4, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'clancastle') {
                ctx.fillStyle = '#d4c0a0';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ---------- UI ----------
        buildMenu() {
            const menu = document.getElementById('buildMenu');
            menu.innerHTML = '';
            const hasTownHall = this.buildings.some(b => b.type === 'townhall');
            for (const [type, def] of Object.entries(BLD)) {
                // Hide Town Hall card if one already exists (only one allowed)
                if (type === 'townhall' && hasTownHall) continue;
                const locked = this.player.level < def.unlockLevel;
                const afford = this.canAfford(def.baseCost);
                const card = document.createElement('div');
                card.className = 'build-card' + (locked ? ' locked' : '') + (!afford && !locked ? ' cannot-afford' : '');
                const cost = Object.entries(def.baseCost).map(([k,v]) => `${fmt(v)} ${this.resSymbol(k)}`).join(' · ') || 'Free';
                card.innerHTML = `
                    <div class="build-icon">${def.icon}</div>
                    <div class="build-name">${def.name}</div>
                    ${locked
                        ? `<div class="build-lock">Unlocks Lv ${def.unlockLevel}</div>`
                        : `<div class="build-cost ${!afford ? 'red' : ''}">${cost}</div>`}
                `;
                card.addEventListener('click', () => {
                    if (locked) { this.audio.error(); this.toast(`Requires player level ${def.unlockLevel}`, 'warn'); return; }
                    if (!afford) { this.audio.error(); this.toast('Not enough resources', 'warn'); return; }
                    this.setBuildMode(type);
                });
                menu.appendChild(card);
            }
            if (this.buildMode) {
                const cards = menu.querySelectorAll('.build-card');
                const idx = Object.keys(BLD).indexOf(this.buildMode);
                if (cards[idx]) cards[idx].classList.add('selected');
            }
        }

        setBuildMode(type) {
            this.buildMode = type;
            this.moveMode = null;
            this.spellMode = false;
            this.updateCanvasCursor();
            document.getElementById('actCancel').style.display = type ? 'flex' : 'none';
            this.buildMenu();
        }

        updateCanvasCursor() {
            const c = document.getElementById('gameCanvas');
            c.classList.toggle('building', !!this.buildMode || !!this.moveMode || !!this.spellMode);
            document.getElementById('actCancel').style.display = (this.buildMode || this.moveMode || this.spellMode) ? 'flex' : 'none';
        }

        bindUI() {
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const name = tab.dataset.tab;
                    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === name));
                    this.audio.click();
                });
            });

            document.getElementById('actCollect').addEventListener('click', () => { this.audio.click(); this.collectAll(); });
            document.getElementById('actRally').addEventListener('click', () => { this.audio.click(); this.rally(); });
            document.getElementById('actBoost').addEventListener('click', () => { this.audio.click(); this.activateBoost(); });
            document.getElementById('actCancel').addEventListener('click', () => { this.audio.click(); this.setBuildMode(null); this.moveMode = null; this.spellMode = false; this.updateCanvasCursor(); });

            const spellBtn = document.getElementById('actSpell');
            if (spellBtn) spellBtn.addEventListener('click', () => {
                this.audio.click();
                if (this.res.gems < CFG.spellCost.gems) { this.toast('Need 1 ♦ gem', 'warn'); return; }
                this.spellMode = true;
                this.setBuildMode(null);
                this.moveMode = null;
                this.updateCanvasCursor();
                this.toast('⚡ Click a tile to strike', 'warn');
            });

            document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
            document.getElementById('modal').addEventListener('click', (e) => {
                if (e.target.id === 'modal') this.closeModal();
            });

            document.getElementById('btnSave').addEventListener('click', () => { this.save(); this.toast('Game saved', 'success'); this.audio.click(); });
            document.getElementById('btnExport').addEventListener('click', () => { this.exportSave(); });
            document.getElementById('btnReset').addEventListener('click', () => {
                if (confirm('Erase all progress and start over?')) {
                    localStorage.removeItem(CFG.saveKey);
                    location.reload();
                }
            });

            // Zoom controls
            const zIn  = document.getElementById('zoomIn');
            const zOut = document.getElementById('zoomOut');
            const zReset = document.getElementById('zoomReset');
            if (zIn)  zIn.addEventListener('click', () => { this.audio.click(); this.zoomBy(1.2, this.vw/2, this.vh/2); });
            if (zOut) zOut.addEventListener('click', () => { this.audio.click(); this.zoomBy(1/1.2, this.vw/2, this.vh/2); });
            if (zReset) zReset.addEventListener('click', () => { this.audio.click(); this.cam.zoom = 1; this.centerCamera(); });
        }

        collectAll() {
            let total = 0;
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (!def.clickBonus) continue;
                const bonus = def.clickBonus(b.level);
                for (const k in bonus) {
                    const amt = Math.floor(bonus[k] * this.boost.mult * 0.5);
                    this.res[k] = Math.min(this.cap(), (this.res[k] || 0) + amt);
                    if (k === 'gold') { this.stats.goldEarned += amt; total += amt; }
                    const p = this.worldIso(b.tx + 0.5, b.ty + 0.5);
                    this.floatText(`+${amt}`, p.x, p.y - 30, this.resColor(k));
                }
            }
            if (total > 0) {
                this.audio.coin();
                this.pulseRes('gold');
                this.toast(`Collected ${fmt(total)} gold`, 'success');
            } else {
                this.toast('Nothing to collect', 'warn');
            }
            this.updateUI();
        }

        rally() {
            let healed = 0;
            const healPct = this.rallyHeal;
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (def.defense) {
                    b.lastShot = 0;
                    const heal = Math.min(b.maxHp - b.hp, b.maxHp * healPct);
                    b.hp += heal;
                    if (heal > 0) healed++;
                }
            }
            this.audio.upgrade();
            this.toast(`Defenses rallied! (${healed} healed, +${(healPct*100).toFixed(0)}%)`, 'success');
        }

        activateBoost() {
            if (this.res.gems < 1) {
                this.audio.error();
                this.toast('Need 1 ♦ gem', 'warn');
                return;
            }
            this.res.gems -= 1;
            this.boost.mult = 2;
            this.boost.timeLeft = 60;
            this.audio.levelup();
            this.toast('2x boost for 60s!', 'success');
            this.updateUI();
        }

        openBuildingModal(b) {
            const def = BLD[b.type];
            const modal = document.getElementById('modal');
            const body = document.getElementById('modalBody');
            const stats = [];
            stats.push({ label: 'Level', value: `${b.level} / ${def.maxLevel}` });
            stats.push({ label: 'Health', value: `${Math.ceil(b.hp)}/${b.maxHp}` });
            if (def.production) {
                const p = def.production(b.level);
                for (const k in p) stats.push({ label: `${k[0].toUpperCase()+k.slice(1)} / sec`, value: `+${p[k].toFixed(2)}` });
            }
            if (def.defense) {
                const d = def.defense(b.level);
                stats.push({ label: 'Damage', value: d.dmg });
                stats.push({ label: 'Cooldown', value: d.cd + 's' });
                stats.push({ label: 'Range', value: d.range });
                if (d.splash) stats.push({ label: 'Splash', value: d.splash });
            }
            if (def.provides) {
                const p = def.provides(b.level);
                if (p.cap) stats.push({ label: 'Storage', value: `+${fmt(p.cap)}` });
                if (p.goldMult) stats.push({ label: 'Gold Mult', value: `+${(p.goldMult*100).toFixed(0)}%` });
                if (p.xpMult) stats.push({ label: 'XP Mult', value: `+${(p.xpMult*100).toFixed(0)}%` });
                if (p.rallyMult) stats.push({ label: 'Rally Heal', value: `+${(p.rallyMult*100).toFixed(0)}%` });
                if (p.waveGems) stats.push({ label: 'Wave Gems', value: `+${p.waveGems}` });
            }

            const canUp = b.level < def.maxLevel;
            const upCost = canUp ? def.upgradeCost(b.level) : null;
            const costStr = canUp ? Object.entries(upCost).map(([k,v]) => `${fmt(v)} ${this.resSymbol(k)}`).join(' · ') : '';
            const afford = canUp && this.canAfford(upCost);

            // Preview of the click-bonus burst (for resource buildings)
            let collectPreview = '';
            if (def.clickBonus) {
                const preview = def.clickBonus(b.level);
                collectPreview = Object.entries(preview)
                    .map(([k, v]) => `+${Math.floor(v)} ${this.resSymbol(k)}`)
                    .join(' · ');
            }

            body.innerHTML = `
                <h2>${def.icon} ${def.name}</h2>
                <div class="subtitle">${def.desc}</div>
                <div class="stat-grid">
                    ${stats.map(s => `
                        <div class="stat-box">
                            <div class="label">${s.label}</div>
                            <div class="value">${s.value}</div>
                        </div>
                    `).join('')}
                </div>
                ${def.clickBonus ? `
                    <div class="collect-block">
                        <div class="collect-label">Tap to Collect</div>
                        <div class="collect-preview">${collectPreview}</div>
                        <button class="btn collect" id="collectBtn">◉ Collect Burst</button>
                        <div class="hint" style="margin-top:6px">Keep clicking for combo multipliers</div>
                    </div>
                ` : ''}
                ${canUp ? `
                    <div class="upgrade-block">
                        <div class="upgrade-label">Next Level</div>
                        <div class="upgrade-cost">${costStr}</div>
                        <button class="btn primary" id="upgradeBtn" ${afford ? '' : 'disabled style="opacity:.5;cursor:not-allowed"'}>Upgrade →</button>
                    </div>
                ` : `<div class="upgrade-block"><div class="upgrade-label">Max level reached</div></div>`}
                <div class="modal-actions">
                    ${b.type !== 'townhall' ? `<button class="btn small" id="moveBtn">Move</button>` : ''}
                    ${b.type !== 'townhall' ? `<button class="btn small danger" id="sellBtn">Sell (50%)</button>` : ''}
                </div>
                <div class="modal-hint">
                    Single-click = this menu · Double-click = move · Right-click = quick menu
                </div>
            `;

            modal.classList.add('open');
            const upBtn = document.getElementById('upgradeBtn');
            if (upBtn) upBtn.addEventListener('click', () => this.upgradeBuilding(b));
            const collectBtn = document.getElementById('collectBtn');
            if (collectBtn) collectBtn.addEventListener('click', () => {
                this.collectFrom(b);
                // Refresh preview numbers (combo scales them) without full re-open
                const cp = document.querySelector('.collect-preview');
                if (cp && def.clickBonus) {
                    const pr = def.clickBonus(b.level);
                    cp.textContent = Object.entries(pr)
                        .map(([k, v]) => {
                            const mul = this.boost.mult * this.combo.mult * (k === 'gold' ? this.goldMult : 1);
                            return `+${Math.floor(v * mul)} ${this.resSymbol(k)}`;
                        }).join(' · ');
                }
            });
            const moveBtn = document.getElementById('moveBtn');
            if (moveBtn) moveBtn.addEventListener('click', () => {
                this.moveMode = b;
                this.setBuildMode(null);
                this.spellMode = false;
                this.updateCanvasCursor();
                this.closeModal();
                this.toast('Click an empty tile to move', 'warn');
            });
            const sellBtn = document.getElementById('sellBtn');
            if (sellBtn) sellBtn.addEventListener('click', () => {
                const refund = Math.floor((def.baseCost.gold || 0) * 0.5);
                this.res.gold += refund;
                this.buildings = this.buildings.filter(x => x !== b);
                this.recomputeRates();
                this.toast(`Sold for ${refund} gold`, 'success');
                this.audio.coin();
                this.closeModal();
                this.updateUI();
            });
        }

        closeModal() {
            document.getElementById('modal').classList.remove('open');
        }

        updateUI() {
            document.getElementById('val-gold').textContent   = fmt(this.res.gold);
            document.getElementById('val-elixir').textContent = fmt(this.res.elixir);
            document.getElementById('val-dark').textContent   = fmt(this.res.dark);
            document.getElementById('val-gems').textContent   = this.res.gems;

            const mult = this.boost.mult;
            document.getElementById('rate-gold').textContent   = `+${(this.rates.gold * mult).toFixed(1)}/s`;
            document.getElementById('rate-elixir').textContent = `+${(this.rates.elixir * mult).toFixed(1)}/s`;
            document.getElementById('rate-dark').textContent   = `+${(this.rates.dark * mult).toFixed(2)}/s`;

            document.getElementById('playerLevel').textContent = this.player.level;
            const xpNeeded = CFG.xpToLevel(this.player.level);
            document.getElementById('playerXp').textContent = `${Math.floor(this.player.xp)} / ${xpNeeded} XP`;
            const ring = document.getElementById('xpRing');
            const ringLen = 100.5;
            ring.style.strokeDashoffset = ringLen * (1 - this.player.xp / xpNeeded);

            const wt = document.getElementById('waveTimer');
            const wi = document.getElementById('waveInfo');
            if (this.wave.active) {
                wt.textContent = `${this.enemies.length} left`;
                wt.classList.add('danger');
                wi.textContent = `Wave ${this.wave.number} · In progress`;
            } else {
                wt.textContent = fmtTime(this.wave.timer);
                wt.classList.toggle('danger', this.wave.timer < 10);
                wi.textContent = `Wave ${this.wave.number + 1} · Goblins`;
            }

            const hours = Math.floor(this.dayTime * 24);
            const mins = Math.floor((this.dayTime * 24 - hours) * 60);
            document.getElementById('dayTime').textContent = `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`;
            document.getElementById('dayCount').textContent = `Day ${this.dayCount}`;
            const isNight = this.dayTime < 0.2 || this.dayTime > 0.8;
            document.getElementById('dayLabel').textContent = isNight ? 'Night' : 'Day';

            // Zoom indicator
            const zEl = document.getElementById('zoomVal');
            if (zEl) zEl.textContent = `${Math.round(this.cam.zoom * 100)}%`;

            // Combo indicator
            const cEl = document.getElementById('comboLabel');
            if (cEl) {
                if (this.combo.count >= 3) {
                    cEl.textContent = `COMBO x${this.combo.mult}`;
                    cEl.style.opacity = '1';
                } else {
                    cEl.style.opacity = '0';
                }
            }

            this.updateArmyTab();
            this.updateStatsTab();

            if (!this._menuAcc) this._menuAcc = 0;
            this._menuAcc++;
            if (this._menuAcc % 5 === 0) this.buildMenu();
        }

        updateArmyTab() {
            const army = document.getElementById('armyList');
            const defCount = {};
            let totalDps = 0;
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (def.defense) {
                    defCount[def.name] = (defCount[def.name] || 0) + 1;
                    const d = def.defense(b.level);
                    totalDps += d.dmg / d.cd;
                }
            }
            const rows = [
                { label: 'Buildings', val: this.buildings.length },
                { label: 'Total DPS', val: totalDps.toFixed(0) },
                ...Object.entries(defCount).map(([k,v]) => ({ label: k, val: v })),
            ];
            army.innerHTML = rows.map(r => `<div class="army-item"><span>${r.label}</span><span class="val">${r.val}</span></div>`).join('');

            const al = document.getElementById('achievementList');
            al.innerHTML = ACHS.map(a => `
                <div class="achievement ${this.achievements[a.id] ? 'done' : ''}">
                    <div class="achievement-icon">${a.icon}</div>
                    <div class="achievement-body">
                        <div class="achievement-name">${a.name}</div>
                        <div class="achievement-desc">${a.desc}</div>
                    </div>
                </div>
            `).join('');
        }

        updateStatsTab() {
            const el = document.getElementById('statList');
            const rows = [
                { label: 'Buildings Built', val: this.stats.built },
                { label: 'Upgrades', val: this.stats.upgrades },
                { label: 'Enemies Slain', val: this.stats.kills },
                { label: 'Click Bonuses', val: this.stats.clicks },
                { label: 'Max Combo', val: 'x' + this.stats.maxCombo },
                { label: 'Spells Cast', val: this.stats.spells },
                { label: 'Total Gold Earned', val: fmt(this.stats.goldEarned) },
                { label: 'Current Wave', val: this.wave.number },
                { label: 'Current Day', val: this.dayCount },
                { label: 'Storage Capacity', val: fmt(this.cap()) },
                { label: 'Gold Multiplier', val: `x${this.goldMult.toFixed(2)}` },
                { label: 'XP Multiplier', val: `x${this.xpMult.toFixed(2)}` },
            ];
            el.innerHTML = rows.map(r => `<div class="stat-row"><span>${r.label}</span><span class="val">${r.val}</span></div>`).join('');
        }

        // ---------- Feedback helpers ----------
        toast(msg, type = '') {
            const container = document.getElementById('toasts');
            const el = document.createElement('div');
            el.className = 'toast ' + type;
            el.textContent = msg;
            container.appendChild(el);
            setTimeout(() => {
                el.classList.add('out');
                setTimeout(() => el.remove(), 320);
            }, 2200);
        }

        showAlert(text, dur = 2) {
            const p = document.getElementById('alertPanel');
            p.textContent = text;
            p.classList.add('active');
            this.alertTimer = dur;
        }

        floatText(text, x, y, color) {
            this.popups.push({ x, y, text, color, life: 1.2, max: 1.2 });
        }

        pulseRes(key) {
            const el = document.querySelector(`.res[data-res="${key}"]`);
            if (!el) return;
            el.classList.remove('pulse');
            void el.offsetWidth;
            el.classList.add('pulse');
        }

        resColor(k) {
            return ({ gold: '#ffc857', elixir: '#e3a8ff', dark: '#a06bff', gems: '#5cd8ff' })[k] || '#fff';
        }
        resSymbol(k) {
            return ({ gold: '◈', elixir: '❂', dark: '✦', gems: '♦' })[k] || '?';
        }

        // ---------- Achievements ----------
        checkAchievements() {
            for (const a of ACHS) {
                if (this.achievements[a.id]) continue;
                if (a.check(this)) {
                    this.achievements[a.id] = true;
                    this.res.gems += 3;
                    this.toast(`🏆 ${a.name} unlocked! +3 ♦`, 'success');
                    this.audio.levelup();
                }
            }
        }

        // ---------- Game Over ----------
        gameOver() {
            this.showAlert('☠ KINGDOM FALLEN ☠', 4);
            setTimeout(() => {
                if (confirm(`Your Town Hall was destroyed on day ${this.dayCount}, wave ${this.wave.number}.\n\nRestart?`)) {
                    localStorage.removeItem(CFG.saveKey);
                    location.reload();
                }
            }, 2000);
        }

        // ---------- Save / Load ----------
        save() {
            try {
                const data = {
                    v: 3,
                    res: this.res,
                    player: this.player,
                    buildings: this.buildings.map(b => ({ id: b.id, type: b.type, tx: b.tx, ty: b.ty, level: b.level, hp: b.hp, maxHp: b.maxHp })),
                    stats: this.stats,
                    achievements: this.achievements,
                    wave: { number: this.wave.number, timer: this.wave.timer },
                    dayTime: this.dayTime,
                    dayCount: this.dayCount,
                    cam: { zoom: this.cam.zoom },
                    savedAt: Date.now(),
                };
                localStorage.setItem(CFG.saveKey, JSON.stringify(data));
            } catch (e) { console.error('Save failed', e); }
        }

        loadSave() {
            try {
                const raw = localStorage.getItem(CFG.saveKey);
                if (!raw) {
                    this.placeInitial();
                    return;
                }
                const d = JSON.parse(raw);
                if (d.res) this.res = { ...this.res, ...d.res };
                if (d.player) this.player = { ...this.player, ...d.player };
                if (d.stats) this.stats = { ...this.stats, ...d.stats };
                if (d.achievements) this.achievements = d.achievements;
                if (d.wave) this.wave.number = d.wave.number;
                if (d.wave && typeof d.wave.timer === 'number') this.wave.timer = d.wave.timer;
                if (typeof d.dayTime === 'number') this.dayTime = d.dayTime;
                if (typeof d.dayCount === 'number') this.dayCount = d.dayCount;
                if (d.cam && d.cam.zoom) this.cam.zoom = d.cam.zoom;

                if (Array.isArray(d.buildings)) {
                    for (const s of d.buildings) {
                        if (!BLD[s.type]) continue; // unknown type (save migration)
                        this.buildings.push({
                            id: s.id || Math.random().toString(36).slice(2,9),
                            type: s.type, tx: s.tx, ty: s.ty,
                            level: s.level || 1,
                            hp: s.hp ?? 100, maxHp: s.maxHp ?? 100,
                            lastShot: 0, animScale: 1,
                        });
                    }
                }

                if (d.savedAt) {
                    const offlineMs = Math.min(Date.now() - d.savedAt, 4 * 60 * 60 * 1000);
                    const offlineSec = offlineMs / 1000;
                    if (offlineSec > 10) {
                        this.recomputeRates();
                        const og = Math.floor(this.rates.gold * offlineSec * 0.5);
                        const oe = Math.floor(this.rates.elixir * offlineSec * 0.5);
                        const od = this.rates.dark * offlineSec * 0.5;
                        this.res.gold += og;
                        this.res.elixir += oe;
                        this.res.dark += od;
                        setTimeout(() => {
                            this.toast(`Offline earnings: +${fmt(og)} gold, +${fmt(oe)} elixir`, 'success');
                        }, 800);
                    }
                }

                this.recomputeRates();
            } catch (e) {
                console.error('Load failed', e);
                this.placeInitial();
            }
        }

        placeInitial() {
            // Center the initial village using the larger grid
            const cx = Math.floor(CFG.gridW / 2) - 1;
            const cy = Math.floor(CFG.gridH / 2) - 1;
            const push = (type, tx, ty) => {
                const def = BLD[type];
                this.buildings.push({
                    id: Math.random().toString(36).slice(2,9),
                    type, tx, ty, level: 1,
                    hp: def.baseHP, maxHp: def.baseHP,
                    lastShot: 0, animScale: 0,
                });
            };
            push('townhall', cx, cy);
            push('goldmine', cx - 3, cy);
            push('goldmine', cx - 3, cy + 2);
            push('elixirwell', cx + 3, cy);
            push('cannon', cx + 3, cy + 3);
            push('cannon', cx - 3, cy - 2);
            this.recomputeRates();
        }

        exportSave() {
            const raw = localStorage.getItem(CFG.saveKey) || JSON.stringify({ empty: true });
            const blob = new Blob([raw], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kingdom-ember-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.toast('Save exported', 'success');
        }
    }

    // ---------- Boot ----------
    window.addEventListener('DOMContentLoaded', () => {
        const game = new Game();
        game.init();
        window.game = game;
    });
})();
