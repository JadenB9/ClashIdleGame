/* ============================================================
   Kingdom of Ember — Clash Idle
   Single-file isometric tower-defense idle game
   ============================================================ */

(() => {
    'use strict';

    // ---------- CONFIG ----------
    const CFG = {
        gridW: 24,
        gridH: 24,
        tileW: 72,
        tileH: 36,
        zoomMin: 0.65,
        zoomMax: 2.4,
        saveKey: 'kingdomOfEmber.v3',
        autoSaveMs: 15000,
        dayLengthSec: 180,        // 3 minutes real-time = 1 in-game day
        waveBaseSec: 75,
        waveMinSec: 35,
        xpToLevel: (lv) => Math.floor(100 * Math.pow(1.4, lv - 1)),
        comboWindow: 1.3,
        spellCost: { gold: 0, gems: 1 },
        spellRadius: 3.2,
        spellBaseDmg: 260,
    };

    // ---------- BUILDING TYPES ----------
    const BLD = {
        townhall: {
            name: 'Town Hall',
            icon: '♔',
            size: 2,
            maxLevel: 20,
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
            maxLevel: 25,
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
            maxLevel: 25,
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
            maxLevel: 20,
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
            maxLevel: 20,
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
            maxLevel: 22,
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
            maxLevel: 22,
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
            maxLevel: 20,
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
            maxLevel: 20,
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
            maxLevel: 20,
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
            maxLevel: 20,
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
            maxLevel: 18,
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
            maxLevel: 18,
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
            maxLevel: 20,
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
            maxLevel: 15,
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
            maxLevel: 18,
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
            maxLevel: 18,
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
            maxLevel: 15,
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

    // ---------- WINDOW LAYOUTS (hoisted: reused every frame for every building) ----------
    const WINDOW_SPEC = {
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
    // Standard ray-cast point-in-polygon. poly is [[x,y], ...] in any order.
    const pointInPolygon = (px, py, poly) => {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i][0], yi = poly[i][1];
            const xj = poly[j][0], yj = poly[j][1];
            const intersect = ((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
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
            this.moveMode = null;     // building being moved or null (also set during drag-to-move)
            this.spellMode = false;   // lightning targeting?
            this.selectedBuilding = null;  // last left-clicked non-collector (highlight target)
            this.selectHighlight = 0; // 0-1 decay used for the selection ring pulse
            this.paused = false;      // global freeze (manual pause, tab hidden, or game over)
            this.autoCollect = false; // auto-collect toggle — periodically taps all collectors
            this._autoCollectAcc = 0;

            // Boost
            this.boost = { mult: 1, timeLeft: 0 };

            // Combo
            this.combo = { count: 0, time: 0, mult: 1 };

            // Flash effect (screen flash for spells)
            this.flash = 0;

            // War Cry (free cooldown ability)
            this.warCry = { active: false, timeLeft: 0, cooldown: 0 };

            // Co-op multiplayer
            this.coop = {
                peer: null,
                conn: null,
                code: '',
                partnerCode: '',
                connected: false,
                partnerState: null,
                syncInterval: null,
                pendingInvite: null,
            };

            this.lastTime = 0;
            this.alertTimer = 0;

            try {
                this.socket = (typeof io !== 'undefined') ? io() : null;
            } catch (e) { this.socket = null; }
        }

        init() {
            // Emergency escape hatch: ?reset=1 in the URL wipes the save before
            // we even try to load it. Use this when the game is in a broken
            // state you can't click out of.
            try {
                if (window.location.search.indexOf('reset=1') >= 0) {
                    localStorage.removeItem(CFG.saveKey);
                    // Strip the query string so reloads don't keep wiping
                    window.history.replaceState({}, '', window.location.pathname);
                }
            } catch (e) { /* ignore */ }

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
            this.initCoop();

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
            // Invalidate gradients + ground cache that depend on viewport size
            this._skyCache = null;
            this.groundCache = null;
            this.cacheMinX = undefined;
            this.clampCamera();
        }

        centerCamera() {
            // Place camera so the middle of the grid sits at the visible center
            const midWorld = this.worldIso(CFG.gridW / 2, CFG.gridH / 2);
            this.cam.x = this.vw / 2 - midWorld.x * this.cam.zoom;
            this.cam.y = this.vh / 2 - midWorld.y * this.cam.zoom - 60;
            this.clampCamera();
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
                // We only respond to the primary (left) mouse button for down-tracking.
                // Right-click is handled by the contextmenu listener below.
                if (e.button !== undefined && e.button !== 0) {
                    return;
                }
                const p = getPos(e);
                this.input.down = true;
                this.input.drag = false;
                this.input.dragMove = false;    // dragging-to-move a building?
                this.input.downX = p.x;
                this.input.downY = p.y;
                this.input.lastX = p.x;
                this.input.lastY = p.y;
                this.input.x = p.x;
                this.input.y = p.y;
                this.input.downTime = performance.now();
                this.input.shift = !!(e.shiftKey);
                this.input.right = false;
                // Identify what's under the press using visual hit detection so
                // clicking anywhere on a tall building (not just its base tile) counts.
                this.input.downBuilding = this.buildingAtScreen(p.x, p.y);
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

                    // Once the mouse has traveled past the threshold, commit to a drag.
                    // Two kinds of drag:
                    //   1. dragMove: press started on a building → drag-to-move that building
                    //   2. pan: press started on grass → pan the camera
                    if (!this.input.drag && dist > DRAG_THRESH) {
                        this.input.drag = true;
                        if (this.input.downBuilding
                                && !this.buildMode
                                && !this.spellMode
                                && !this.moveMode) {
                            this.input.dragMove = true;
                            // Enter live move mode; ghost + range preview render while dragging
                            this.moveMode = this.input.downBuilding;
                            this.updateCanvasCursor();
                        }
                    }
                    if (this.input.drag && !this.input.dragMove) {
                        // Pan the world
                        this.cam.x += p.x - this.input.lastX;
                        this.cam.y += p.y - this.input.lastY;
                        this.clampCamera();
                    }
                    this.input.lastX = p.x;
                    this.input.lastY = p.y;
                }
                this.updateHover();
            };

            const onUp = () => {
                if (this.input.down) {
                    if (this.input.dragMove) {
                        // Drag-to-move release: try to place at the hovered tile
                        this.commitDragMove();
                    } else if (!this.input.drag) {
                        // Pure left-click (no drag) → collect / select / place etc.
                        this.handleTap(this.input.x, this.input.y, this.input.shift, /*right*/ false);
                    }
                }
                this.input.down = false;
                this.input.drag = false;
                this.input.dragMove = false;
                this.input.downBuilding = null;
            };

            c.addEventListener('mousedown', onDown);
            // Listen on canvas for hover work (saves events when mouse is over side/top bars),
            // but also listen on window so we can keep tracking a drag once it has started.
            c.addEventListener('mousemove', onMove);
            window.addEventListener('mousemove', (e) => {
                // Only forward while actively dragging (otherwise canvas handler covers it)
                if (this.input.down && this.input.drag) onMove(e);
            });
            window.addEventListener('mouseup', onUp);
            c.addEventListener('mouseleave', () => {
                // Clear hover state when the mouse leaves the canvas so the tip hides
                this.hoverTile = null;
                this.hoverBuilding = null;
                this.rebuildHoverTip();
            });
            c.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive: false });
            c.addEventListener('touchmove',  (e) => { e.preventDefault(); onMove(e); }, { passive: false });
            c.addEventListener('touchend',   (e) => { e.preventDefault(); onUp(); }, { passive: false });

            // Right click: exit build/move/spell mode if active, otherwise open modal
            c.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (this.buildMode || this.moveMode || this.spellMode) {
                    this.setBuildMode(null);
                    this.moveMode = null;
                    this.spellMode = false;
                    this.updateCanvasCursor();
                    return;
                }
                const rect = c.getBoundingClientRect();
                const sx = e.clientX - rect.left;
                const sy = e.clientY - rect.top;
                const b = this.buildingAtScreen(sx, sy);
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
                if (e.key === 'w' || e.key === 'W') this.activateWarCry();
                if (e.key === 'l' || e.key === 'L') {
                    if (this.res.gems >= CFG.spellCost.gems) {
                        this.spellMode = true;
                        this.setBuildMode(null);
                        this.moveMode = null;
                        this.updateCanvasCursor();
                        this.toast('⚡ Click a tile to strike', 'warn');
                    }
                }
                if (e.key === 'p' || e.key === 'P') {
                    this.togglePause();
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
            this.clampCamera();
        }

        /**
         * Clamp the camera so the ground cache always fully covers the viewport.
         * This is what keeps the player from panning far enough that the dark
         * sky peeks in on the sides or top. Called after every pan / zoom /
         * resize. No-op before the cache has been built (init phase).
         */
        clampCamera() {
            if (this.cacheMinX === undefined) return;
            const z = this.cam.zoom;
            // The viewport in world space goes from
            //   (-cam.x/z, -cam.y/z)  to  ((vw-cam.x)/z, (vh-cam.y)/z)
            // We need this rectangle to sit inside the cache rectangle
            //   [cacheMinX, cacheMaxX] × [cacheMinY, cacheMaxY]
            // Solving for cam.x:
            //   -cam.x/z       >= cacheMinX  → cam.x <= -cacheMinX * z
            //   (vw-cam.x)/z  <= cacheMaxX  → cam.x >= vw - cacheMaxX * z
            const minCamX = this.vw - this.cacheMaxX * z;
            const maxCamX = -this.cacheMinX * z;
            const minCamY = this.vh - this.cacheMaxY * z;
            const maxCamY = -this.cacheMinY * z;
            // If the cache is wider/taller than the viewport, clamp normally;
            // otherwise just center (shouldn't happen with our pad logic, but
            // be safe).
            if (minCamX <= maxCamX) {
                this.cam.x = clamp(this.cam.x, minCamX, maxCamX);
            } else {
                this.cam.x = (minCamX + maxCamX) / 2;
            }
            if (minCamY <= maxCamY) {
                this.cam.y = clamp(this.cam.y, minCamY, maxCamY);
            } else {
                this.cam.y = (minCamY + maxCamY) / 2;
            }
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
            const prev = this.hoverBuilding;
            // Use visual hit detection so hovering any part of a tall building
            // shows its tooltip, not just when over the base tile.
            this.hoverBuilding = this.buildingAtScreen(this.input.x, this.input.y);

            // Only regenerate the hover-tip HTML when the hovered building IDENTITY
            // or LEVEL changes. Position is updated cheaply below.
            const changed = prev !== this.hoverBuilding
                || (this.hoverBuilding && this._hoverLevel !== this.hoverBuilding.level);
            if (changed) this.rebuildHoverTip();
            this.positionHoverTip();
        }

        rebuildHoverTip() {
            const tip = this._hoverTipEl || (this._hoverTipEl = document.getElementById('hoverTip'));
            if (!tip) return;
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
                parts.push(`<span style="color:#6b6854">Shift+click = upgrade · Right-click = menu · Drag = move</span>`);
                tip.innerHTML = parts.join('<br>');
                tip.classList.add('visible');
                this._hoverLevel = b.level;
            } else {
                tip.classList.remove('visible');
                this._hoverLevel = -1;
            }
        }

        positionHoverTip() {
            const tip = this._hoverTipEl;
            if (!tip || !tip.classList.contains('visible')) return;
            tip.style.left = (this.input.x + 18) + 'px';
            tip.style.top = (this.input.y + 18) + 'px';
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

            // Build mode placement (first left-click places the queued building)
            if (this.buildMode) {
                if (this.canPlace(this.buildMode, tx, ty)) {
                    this.placeBuilding(this.buildMode, tx, ty);
                } else {
                    this.audio.error();
                    this.toast('Cannot build here', 'warn');
                }
                return;
            }

            // Click a building — use visual hit detection so clicks anywhere on
            // the drawn shape register, not just the base tile footprint.
            const b = this.buildingAtScreen(sx, sy);
            if (b) {
                // Shift-click → instant upgrade (power-user shortcut). Falls back to
                // the modal if already max level so the player still gets feedback.
                if (shift) {
                    const def = BLD[b.type];
                    if (b.level >= def.maxLevel) {
                        this.openBuildingModal(b);
                        return;
                    }
                    this.upgradeBuilding(b);
                    return;
                }
                // Right-click: open the full stats/upgrade modal
                if (right) {
                    this.openBuildingModal(b);
                    return;
                }
                // Left-click: collect (for resource buildings) or select (for others)
                const def = BLD[b.type];
                if (def.clickBonus) {
                    // Collect — feeds combo
                    this.collectFrom(b);
                } else {
                    // Non-collector: mark as selected and flash a ring
                    this.selectBuilding(b);
                }
                return;
            }
            // Clicked empty terrain — clear selection
            this.selectedBuilding = null;
        }

        /** Apply a short highlight to a building so the player sees their click registered. */
        selectBuilding(b) {
            this.selectedBuilding = b;
            this.selectHighlight = 1.0;
            this.audio.click();
            // Float the name once so they see what they clicked
            const p = this.worldIso(b.tx + 0.5, b.ty + 0.5);
            const def = BLD[b.type];
            this.floatText(def.name, p.x, p.y - 40, '#ffe3a1');
        }

        /** Called on mouse-up when a drag-to-move was in progress. */
        commitDragMove() {
            const mb = this.moveMode;
            if (!mb) { this.moveMode = null; this.updateCanvasCursor(); return; }
            const t = this.hoverTile;
            if (!t) {
                this.toast('Drop on a valid tile', 'warn');
                this.moveMode = null;
                this.updateCanvasCursor();
                return;
            }
            const originalTx = mb.tx, originalTy = mb.ty;
            mb.tx = -999; mb.ty = -999;
            const ok = this.canPlace(mb.type, t.tx, t.ty);
            mb.tx = originalTx; mb.ty = originalTy;
            if (ok) {
                mb.tx = t.tx;
                mb.ty = t.ty;
                this.audio.build();
                // Tiny dust puff on arrival
                const p = this.worldIso(mb.tx + 0.5, mb.ty + 0.5);
                for (let i = 0; i < 8; i++) {
                    this.particles.push({
                        x: p.x + rand(-10, 10), y: p.y + rand(-6, 4),
                        vx: rand(-30, 30), vy: rand(-50, -15),
                        life: 0.5, max: 0.5,
                        color: '#d4c0a0', size: rand(2, 4),
                    });
                }
            } else {
                this.audio.error();
                this.toast('Cannot place there', 'warn');
            }
            this.moveMode = null;
            this.updateCanvasCursor();
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
            this.flash = 0.55;
            this.audio.spell();
            const dmg = CFG.spellBaseDmg + this.player.level * 80;
            // Big burst of particles
            const center = this.worldIso(tx, ty);
            for (let i = 0; i < 60; i++) {
                const ang = Math.random() * Math.PI * 2;
                const sp = rand(80, 420);
                this.particles.push({
                    x: center.x, y: center.y,
                    vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 80,
                    life: rand(0.4, 1.1), max: 1.1,
                    color: i % 2 ? '#a6ecff' : '#ffffff', size: rand(2, 5),
                });
            }
            // Lightning bolt jagged line from sky
            for (let j = 0; j < 6; j++) {
                this.particles.push({
                    x: center.x + rand(-25, 25), y: center.y - 340,
                    vx: rand(-10, 10), vy: 1400,
                    life: 0.12, max: 0.12,
                    color: '#ffffff', size: 5,
                });
            }
            // Damage enemies in radius. Use both tile-space and screen-space
            // distance checks — tile coords for logic, screen coords as a
            // fallback so fast-moving enemies near the strike still get hit.
            let hits = 0;
            for (const e of this.enemies) {
                if (e.hp <= 0) continue;
                const d = Math.hypot(e.tx - tx, e.ty - ty);
                if (d <= CFG.spellRadius) {
                    this.hitEnemy(e, dmg);
                    hits++;
                    // Per-hit spark burst so the player sees the damage land
                    for (let k = 0; k < 6; k++) {
                        this.particles.push({
                            x: e.x, y: e.y,
                            vx: rand(-120, 120), vy: rand(-140, -40),
                            life: rand(0.3, 0.6), max: 0.6,
                            color: '#ffe3a1', size: rand(2, 4),
                        });
                    }
                }
            }
            if (hits > 0) {
                this.toast(`⚡ Lightning struck ${hits} raider${hits > 1 ? 's' : ''}!`, 'success');
            } else {
                this.toast('⚡ Lightning strike — no targets in range', 'warn');
            }
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

        /**
         * Hit test: resolve which building the player is clicking on.
         *
         * Strategy:
         *   1. Check the base tile under the cursor — if that tile is inside a
         *      building's footprint, that building is the winner (it's what's
         *      visible on the ground plane).
         *   2. Otherwise check each building's actual iso silhouette (a hexagon
         *      made from the base diamond + the two side faces + the top
         *      diamond). This matches the pixels the player actually sees.
         *   3. Also check the level marker region drawn above each building so
         *      clicking the floating number acts as clicking the building.
         *
         * Uses frontmost-depth ordering so when hexagons overlap, the building
         * drawn on top wins.
         */
        buildingAtScreen(sx, sy) {
            // Screen → world
            const wx = (sx - this.cam.x) / this.cam.zoom;
            const wy = (sy - this.cam.y) / this.cam.zoom;

            // 1) Polygon check FIRST — tests the actual iso silhouette hexagon
            // of every building. This means hovering or clicking anywhere on a
            // building's drawn shape (roof, sides, base, badge) hits that
            // building, even if a different building's base tile is underneath.
            // The FRONTMOST building by draw-depth wins when shapes overlap,
            // which matches what the player visually sees.
            let best = null;
            let bestDepth = -Infinity;
            for (const b of this.buildings) {
                const def = BLD[b.type];
                const size = def.size;
                const center = this.worldIso(b.tx + size / 2, b.ty + size / 2);
                const fw = CFG.tileW * size / 2;
                const fh = CFG.tileH * size / 2;
                const h = this.buildHeight(b.type);
                // Account for per-level height scaling
                const lvlProgress = Math.min(1, ((b.level || 1) - 1) / Math.max(1, (def.maxLevel || 20) - 1));
                const hScaled = h * (1 + lvlProgress * 0.28);

                const hex = [
                    [center.x,           center.y + fh],
                    [center.x + fw,      center.y],
                    [center.x + fw,      center.y - hScaled],
                    [center.x,           center.y - fh - hScaled],
                    [center.x - fw,      center.y - hScaled],
                    [center.x - fw,      center.y],
                ];
                const inHex = pointInPolygon(wx, wy, hex);

                // Also check the small level badge circle
                const badgeX = center.x + fw * 0.42;
                const badgeY = center.y - hScaled - fh * 0.12;
                const inBadge = Math.hypot(wx - badgeX, wy - badgeY) <= 10;

                if (inHex || inBadge) {
                    const depth = b.tx + b.ty + size;
                    if (depth > bestDepth) {
                        bestDepth = depth;
                        best = b;
                    }
                }
            }
            if (best) return best;

            // 2) Tile-based fallback — catches clicks on empty grass between
            // buildings where no polygon matched but the tile belongs to a
            // building's footprint.
            const t = this.screenToTile(sx, sy);
            return this.buildingAt(t.tx, t.ty);
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
            // Sticky build mode — stay in placement mode after placing one so you
            // can drop multiple walls/towers in a row. Escape / right-click / Cancel
            // button all still exit. Automatically exits when the player can no
            // longer afford another, or (for singletons like townhall) after one.
            const singleton = (type === 'townhall');
            const stillAffordable = this.canAfford(def.baseCost);
            if (singleton || !stillAffordable) {
                this.setBuildMode(null);
                if (!stillAffordable && !singleton) {
                    this.toast('Not enough for another — tap a card to keep building', 'warn');
                }
            } else {
                // Refresh the sidebar so greyed-out cards update, and keep the
                // same build tool selected for the next placement.
                this.buildMenu();
            }
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
            const groundTypes = [
                { kind: 'goblin', hp: 40, dmg: 8, spd: 1.4, gold: 18, xp: 3, color: '#6a8e3a', size: 10 },
                { kind: 'orc',    hp: 110, dmg: 16, spd: 1.1, gold: 40, xp: 6, color: '#8a3a3a', size: 14 },
                { kind: 'troll',  hp: 280, dmg: 32, spd: 0.8, gold: 85, xp: 12, color: '#6a2c8a', size: 18 },
                { kind: 'ogre',   hp: 620, dmg: 55, spd: 0.6, gold: 180, xp: 24, color: '#3a2c6a', size: 22 },
            ];
            const flyingTypes = [
                { kind: 'bat',    hp: 30,  dmg: 6,  spd: 2.0, gold: 25,  xp: 5,  color: '#5a2a4a', size: 9 },
                { kind: 'dragon', hp: 200, dmg: 28, spd: 1.2, gold: 100, xp: 15, color: '#c93535', size: 17 },
            ];
            // From wave 6+, 30% chance of a flying enemy
            const isFlying = this.wave.number >= 6 && Math.random() < 0.3;
            let t;
            if (isFlying) {
                const flyTier = this.wave.number >= 12 ? 1 : 0;
                t = flyingTypes[flyTier];
            } else {
                t = groundTypes[Math.min(tier, groundTypes.length - 1)];
            }
            const hpScale = 1 + this.wave.number * 0.12;
            const sp = this.worldIso(tx + 0.5, ty + 0.5);
            this.enemies.push({
                kind: t.kind,
                flying: isFlying,
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
            // Flying enemies ignore walls entirely — they fly over.
            // Ground enemies hit the nearest wall that stands between them and
            // their ideal target, forcing them to break through.
            let best = null;
            let bestD = Infinity;
            for (const b of this.buildings) {
                if (b.hp <= 0) continue;
                const def = BLD[b.type];
                // Flying troops skip walls
                if (enemy.flying && b.type === 'wall') continue;
                const cx = b.tx + def.size / 2;
                const cy = b.ty + def.size / 2;
                const d = Math.hypot(cx - enemy.tx, cy - enemy.ty);
                let prio = 1;
                if (b.type === 'townhall') prio = 0.4;
                if (def.production)        prio = 0.6;
                // Ground enemies prioritize nearby walls so they break through
                // instead of walking past them
                if (b.type === 'wall' && !enemy.flying) prio = 0.3;
                const score = d * prio;
                if (score < bestD) { bestD = score; best = b; }
            }
            return best;
        }

        /**
         * Check if a wall tile blocks the line between two tile positions.
         * Returns the wall building if one is in the way, null otherwise.
         */
        wallBetween(fromTx, fromTy, _toTx, _toTy) {
            // Simple: check each wall building to see if the enemy's movement
            // vector passes within 0.8 tiles of the wall center
            for (const b of this.buildings) {
                if (b.type !== 'wall' || b.hp <= 0) continue;
                const wx = b.tx + 0.5, wy = b.ty + 0.5;
                // Point-to-segment distance approximation
                const d = Math.hypot(wx - fromTx, wy - fromTy);
                if (d < 1.0) return b; // standing on/next to wall → attack it
            }
            return null;
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
                dmg: d.dmg * (this.warCry.active ? 1.5 : 1),
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

                    // Ground troops check for wall collision — if a wall is
                    // adjacent, stop and attack it instead of walking through.
                    if (!e.flying && d > 0.6 && e.target.type !== 'wall') {
                        const blocker = this.wallBetween(e.tx, e.ty, tx, ty);
                        if (blocker && blocker.hp > 0) {
                            // Re-target the blocking wall
                            e.target = blocker;
                            // Fall through to the attack/move logic below with
                            // the new target on next tick
                            continue;
                        }
                    }

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
                // Flying enemies float much higher above the ground + bob
                e.y = p.y - (e.flying ? 40 + Math.sin(e.wobble * 0.5) * 6 : 10);
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

        // ---------- Pause ----------
        togglePause() {
            if (this.gameOverShown) return;
            this.paused = !this.paused;
            const btn = document.getElementById('actPause');
            if (btn) {
                const lbl = btn.querySelector('.action-label');
                if (lbl) lbl.textContent = this.paused ? 'Resume' : 'Pause';
                btn.classList.toggle('on', this.paused);
            }
            // Reset dt so the first post-resume tick doesn't jump.
            if (!this.paused) this.lastTime = performance.now();
            this.toast(this.paused ? '⏸ Paused' : '▶ Resumed', 'warn');
        }

        // ---------- Main loop ----------
        loop(ts) {
            const dt = Math.min((ts - this.lastTime) / 1000, 0.1);
            this.lastTime = ts;
            // When paused (manual, tab hidden, or game-over), skip sim tick but
            // keep rendering so the UI stays responsive to the user.
            if (!this.paused) this.update(dt);
            this.render();
            requestAnimationFrame((t) => this.loop(t));
        }

        update(dt) {
            this.tnow += dt;

            // Day cycle
            this.dayTime += dt / CFG.dayLengthSec;
            if (this.dayTime >= 1) { this.dayTime -= 1; this.dayCount++; }

            // Resources (night bonus: +25% during night hours)
            const mult = this.boost.mult;
            const nightMult = (this.dayTime < 0.2 || this.dayTime > 0.8) ? 1.25 : 1;
            const rm = mult * nightMult;
            this.res.gold   = Math.min(this.cap(), this.res.gold   + this.rates.gold   * dt * rm);
            this.res.elixir = Math.min(this.cap(), this.res.elixir + this.rates.elixir * dt * rm);
            this.res.dark   = Math.min(this.cap() * 0.3, this.res.dark + this.rates.dark * dt * rm);
            this.stats.goldEarned += this.rates.gold * dt * rm;

            // Boost timer
            if (this.boost.timeLeft > 0) {
                this.boost.timeLeft -= dt;
                if (this.boost.timeLeft <= 0) {
                    this.boost.mult = 1;
                    this.toast('Boost expired', 'warn');
                }
            }

            // War Cry timer
            if (this.warCry.active) {
                this.warCry.timeLeft -= dt;
                if (this.warCry.timeLeft <= 0) {
                    this.warCry.active = false;
                    this.toast('War Cry ended', 'warn');
                }
            }
            if (this.warCry.cooldown > 0) this.warCry.cooldown -= dt;

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

            // Selection ring decay (clicked non-collector pulse)
            if (this.selectHighlight > 0) this.selectHighlight = Math.max(0, this.selectHighlight - dt * 0.9);

            // Auto-collect tick — every 5 seconds, trigger the full "Collect All"
            // action (same as the bottom-bar button) when the toggle is on.
            // Gives the visible collect effect (particles + toast) automatically.
            if (this.autoCollect) {
                this._autoCollectAcc = (this._autoCollectAcc || 0) + dt;
                if (this._autoCollectAcc >= 5) {
                    this._autoCollectAcc = 0;
                    this.collectAll();
                }
            }

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

            // Paused overlay — dimmed backdrop + label in the center of the
            // canvas. Only shown for user-initiated pauses (not game over,
            // which has its own modal).
            if (this.paused && !this.gameOverShown) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                ctx.fillRect(0, 0, this.vw, this.vh);
                ctx.fillStyle = '#ffe3a1';
                ctx.font = 'bold 42px Cinzel, serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⏸ PAUSED', this.vw / 2, this.vh / 2 - 14);
                ctx.font = '14px Inter, sans-serif';
                ctx.fillStyle = '#a7a08a';
                ctx.fillText('Press P or the Pause button to resume', this.vw / 2, this.vh / 2 + 22);
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
            // World-space bounding box of the full grid + a large scenery frame.
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
            // Wide scenery frame so camera pan always shows terrain + decorations.
            // Computed dynamically so the cache always covers the full viewport at
            // CFG.zoomMin — this prevents the sky from peeking through when the player
            // zooms out to the limit.
            const basePadX = 760;
            const basePadY = 520;
            const vwW = this.vw || 1600;
            const vhH = this.vh || 900;
            const needPadX = (vwW / CFG.zoomMin) / 2 + 240;
            const needPadY = (vhH / CFG.zoomMin) / 2 + 240;
            const padX = Math.max(basePadX, needPadX);
            const padY = Math.max(basePadY, needPadY);
            minX -= padX; minY -= padY; maxX += padX; maxY += padY + CFG.tileH;
            const w = Math.ceil(maxX - minX);
            const h = Math.ceil(maxY - minY);
            // Remember the world-space bounds of the cache so camera pan can be
            // clamped to them — this is what prevents the sky from peeking in
            // when the user drags the view to the edge on a wide screen.
            this.cacheMinX = minX;
            this.cacheMinY = minY;
            this.cacheMaxX = maxX;
            this.cacheMaxY = maxY;
            const cv = document.createElement('canvas');
            cv.width = w;
            cv.height = h;
            const gctx = cv.getContext('2d');
            // Shift world (0,0) to (offsetX, offsetY) within the cache
            gctx.translate(-minX, -minY);

            // Pseudo-random per-coord hash without runtime cost at frame time
            const hash = (x, y) => {
                let h = (x * 374761393 ^ y * 668265263) >>> 0;
                h = (h ^ (h >>> 13)) >>> 0;
                h = (h * 1274126177) >>> 0;
                return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
            };

            // ===== FAR BACKGROUND — outer "sea of grass / dirt" terrain =====
            // Base wash so there's no black outside the grid
            const bgGrad = gctx.createLinearGradient(minX, minY, maxX, maxY);
            bgGrad.addColorStop(0, '#1f321a');
            bgGrad.addColorStop(0.5, '#253a1d');
            bgGrad.addColorStop(1, '#1a2e14');
            gctx.fillStyle = bgGrad;
            gctx.fillRect(minX, minY, w, h);

            // Sprinkled darker patches to break the wash up
            for (let i = 0; i < 260; i++) {
                const r = hash(i * 13, i * 29);
                const r2 = hash(i * 17, i * 31);
                const x = minX + r * w;
                const y = minY + r2 * h;
                gctx.fillStyle = `rgba(10, 20, 8, ${0.08 + r * 0.12})`;
                gctx.beginPath();
                gctx.ellipse(x, y, 30 + r * 60, 16 + r2 * 30, 0, 0, Math.PI * 2);
                gctx.fill();
            }

            // ===== SCENERY OBJECTS in the frame (outside the grid) =====
            // Determine if a world point is INSIDE the grid (diamond shape)
            const inGrid = (wx, wy) => {
                // Convert world point back to tile space
                const tx = wx / CFG.tileW + wy / CFG.tileH;
                const ty = -wx / CFG.tileW + wy / CFG.tileH;
                return tx > -0.5 && tx < CFG.gridW + 0.5 && ty > -0.5 && ty < CFG.gridH + 0.5;
            };

            const drawTree = (x, y, scale = 1) => {
                // Dark trunk
                gctx.fillStyle = '#3a260e';
                gctx.fillRect(x - 2 * scale, y - 6 * scale, 4 * scale, 10 * scale);
                // Pine canopy — three stacked triangles
                const layers = [
                    { w: 22, h: 14, off: 6 },
                    { w: 18, h: 12, off: 14 },
                    { w: 14, h: 10, off: 21 },
                ];
                for (const L of layers) {
                    gctx.fillStyle = '#2c4a1a';
                    gctx.beginPath();
                    gctx.moveTo(x, y - (L.off + L.h) * scale);
                    gctx.lineTo(x + (L.w / 2) * scale, y - L.off * scale);
                    gctx.lineTo(x - (L.w / 2) * scale, y - L.off * scale);
                    gctx.closePath();
                    gctx.fill();
                    gctx.strokeStyle = 'rgba(0,0,0,0.35)';
                    gctx.lineWidth = 1;
                    gctx.stroke();
                    // Highlight edge
                    gctx.fillStyle = 'rgba(140, 180, 90, 0.25)';
                    gctx.beginPath();
                    gctx.moveTo(x - (L.w / 2) * scale, y - L.off * scale);
                    gctx.lineTo(x, y - (L.off + L.h) * scale);
                    gctx.lineTo(x - 2 * scale, y - L.off * scale);
                    gctx.closePath();
                    gctx.fill();
                }
            };

            const drawRock = (x, y, scale = 1) => {
                gctx.fillStyle = 'rgba(0,0,0,0.3)';
                gctx.beginPath();
                gctx.ellipse(x, y + 3 * scale, 9 * scale, 3 * scale, 0, 0, Math.PI * 2);
                gctx.fill();
                const g = gctx.createRadialGradient(x - 2, y - 3, 1, x, y, 10 * scale);
                g.addColorStop(0, '#8c8890');
                g.addColorStop(1, '#4a4850');
                gctx.fillStyle = g;
                gctx.beginPath();
                gctx.moveTo(x - 8 * scale, y + 2 * scale);
                gctx.quadraticCurveTo(x - 10 * scale, y - 6 * scale, x - 2 * scale, y - 7 * scale);
                gctx.quadraticCurveTo(x + 7 * scale, y - 8 * scale, x + 9 * scale, y - 2 * scale);
                gctx.quadraticCurveTo(x + 8 * scale, y + 4 * scale, x - 8 * scale, y + 2 * scale);
                gctx.closePath();
                gctx.fill();
                gctx.strokeStyle = 'rgba(0,0,0,0.45)';
                gctx.lineWidth = 1;
                gctx.stroke();
            };

            const drawBush = (x, y) => {
                gctx.fillStyle = '#2e4e1d';
                gctx.beginPath();
                gctx.arc(x, y, 6, 0, Math.PI * 2);
                gctx.arc(x + 5, y - 2, 5, 0, Math.PI * 2);
                gctx.arc(x - 5, y - 2, 5, 0, Math.PI * 2);
                gctx.fill();
                gctx.strokeStyle = 'rgba(0,0,0,0.35)';
                gctx.lineWidth = 0.8;
                gctx.stroke();
                // Tiny flowers
                gctx.fillStyle = '#f5d260';
                gctx.beginPath();
                gctx.arc(x + 2, y - 3, 1, 0, Math.PI * 2);
                gctx.arc(x - 3, y - 1, 1, 0, Math.PI * 2);
                gctx.fill();
            };

            // Water pool / lake on one side
            const drawLake = (cx, cy, rx, ry) => {
                // Shoreline shadow
                gctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                gctx.beginPath();
                gctx.ellipse(cx + 4, cy + 4, rx + 8, ry + 6, 0, 0, Math.PI * 2);
                gctx.fill();
                // Water
                const wg = gctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 4, cx, cy, Math.max(rx, ry));
                wg.addColorStop(0, '#5aa9d8');
                wg.addColorStop(0.5, '#3079b0');
                wg.addColorStop(1, '#1b4668');
                gctx.fillStyle = wg;
                gctx.beginPath();
                gctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                gctx.fill();
                // Reed clumps on the edge
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    const xx = cx + Math.cos(ang) * rx * 0.95;
                    const yy = cy + Math.sin(ang) * ry * 0.95;
                    gctx.strokeStyle = '#486b2a';
                    gctx.lineWidth = 1.5;
                    gctx.beginPath();
                    gctx.moveTo(xx - 1, yy);
                    gctx.lineTo(xx - 1, yy - 8);
                    gctx.moveTo(xx + 1, yy);
                    gctx.lineTo(xx + 1, yy - 9);
                    gctx.moveTo(xx + 3, yy);
                    gctx.lineTo(xx + 3, yy - 6);
                    gctx.stroke();
                }
                // Water highlight ripple
                gctx.strokeStyle = 'rgba(255,255,255,0.25)';
                gctx.lineWidth = 1;
                gctx.beginPath();
                gctx.ellipse(cx - rx * 0.2, cy - ry * 0.3, rx * 0.5, ry * 0.25, 0, 0, Math.PI);
                gctx.stroke();
            };

            // Lay out scenery deterministically (looks like someone placed it)
            // Scatter trees heavily in the frame but NEVER inside the playable grid
            const sceneryBudget = 240;
            for (let i = 0; i < sceneryBudget; i++) {
                const rx = hash(i * 19 + 1, i * 5);
                const ry = hash(i * 23 + 7, i * 11);
                // Bias toward edges so the playable area stays visually clean
                const tx = minX + rx * w;
                const ty = minY + ry * h;
                if (inGrid(tx, ty)) continue;
                const kind = hash(i * 3, i * 7);
                if (kind < 0.55) {
                    drawTree(tx, ty, 0.8 + hash(i, i * 2) * 0.6);
                } else if (kind < 0.75) {
                    drawRock(tx, ty, 0.8 + hash(i, i + 1) * 0.5);
                } else if (kind < 0.92) {
                    drawBush(tx, ty);
                } else {
                    // Flower cluster
                    for (let k = 0; k < 5; k++) {
                        gctx.fillStyle = k % 2 ? '#f5d260' : '#e3a8ff';
                        gctx.beginPath();
                        gctx.arc(tx + (hash(i, k) - 0.5) * 14, ty + (hash(k, i) - 0.5) * 8, 1.4, 0, Math.PI * 2);
                        gctx.fill();
                    }
                }
            }

            // Pond north-east of the grid
            const gCenter = this.worldIso(CFG.gridW / 2, CFG.gridH / 2);
            drawLake(gCenter.x + 460, gCenter.y - 340, 120, 60);
            // Another smaller pond south-west
            drawLake(gCenter.x - 520, gCenter.y + 220, 90, 48);

            // ===== PLAYABLE GRID (drawn LAST so it sits on top of the scenery wash) =====
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
                        gctx.fillStyle = rr < 0.035 ? '#f5d260' : '#e3a8ff';
                        gctx.beginPath();
                        gctx.arc(p.x + (rr - 0.035) * 40, p.y + CFG.tileH * 0.3, 1.6, 0, Math.PI * 2);
                        gctx.fill();
                    } else if (rr < 0.12) {
                        gctx.fillStyle = '#6a6a6c';
                        gctx.beginPath();
                        gctx.ellipse(p.x - 4, p.y + CFG.tileH * 0.35, 2.2, 1.2, 0, 0, Math.PI * 2);
                        gctx.fill();
                    } else if (rr < 0.16) {
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

            // Ornate border around the playable grid
            gctx.strokeStyle = 'rgba(255, 200, 87, 0.32)';
            gctx.lineWidth = 4;
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
            gctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
            gctx.lineWidth = 2;
            gctx.stroke();

            this.groundCache = cv;
            this.groundCacheOffsetX = minX;
            this.groundCacheOffsetY = minY;
            // Now that we know the cache bounds, clamp the camera so any stale
            // pan from before the cache was (re)built is brought back in range.
            this.clampCamera();
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
            // Thick pulsing snap indicator on the target tile(s) — very
            // prominent so the drop target is obvious at a glance.
            const pulse = 0.5 + 0.5 * Math.sin(this.tnow * 6);
            const fillAlpha = ok ? (0x88 + Math.floor(pulse * 0x55)) : 0x88;
            const fillHex = color + Math.min(0xff, fillAlpha).toString(16).padStart(2, '0');
            for (let dy = 0; dy < def.size; dy++) {
                for (let dx = 0; dx < def.size; dx++) {
                    this.drawTileAt(ctx, tx + dx, ty + dy, fillHex, color, 4);
                }
            }
            // Extra glowing outer ring around the target footprint
            if (ok) {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2 + pulse * 2;
                ctx.globalAlpha = 0.6 + pulse * 0.4;
                const cx = this.worldIso(tx + def.size / 2, ty + def.size / 2);
                ctx.beginPath();
                ctx.ellipse(cx.x, cx.y + CFG.tileH / 2, CFG.tileW * def.size * 0.65, CFG.tileH * def.size * 0.65, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            // Draw a mostly-opaque ghost of the building at the target tile so
            // the player clearly sees exactly what/where it'll land.
            if (ok) {
                ctx.save();
                ctx.globalAlpha = 0.9;
                this.drawBuilding(ctx, {
                    tx, ty, type: this.moveMode.type,
                    level: this.moveMode.level,
                    hp: this.moveMode.hp, maxHp: this.moveMode.maxHp,
                    animScale: 1, ghost: true,
                });
                ctx.restore();
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
            // If this building is currently being drag-moved AND we're rendering the
            // original (not the ghost), fade it almost out so the target ghost
            // is the clear focus.
            const isDraggedSource = this.input?.dragMove && this.moveMode === b && !b.ghost;
            // During any drag-move operation, fade ALL other buildings down
            // hard so the player can clearly see open tiles through the crowd.
            const anyDragging = this.input?.dragMove && !b.ghost;
            let savedAlpha = false;
            if (isDraggedSource) {
                ctx.save();
                ctx.globalAlpha = 0.12;
                savedAlpha = true;
            } else if (anyDragging && this.moveMode !== b) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                savedAlpha = true;
            }
            // Per-building idle bob so the village doesn't feel static
            if (b._seed === undefined) b._seed = Math.random() * Math.PI * 2;
            const idleBob = Math.sin(this.tnow * 1.4 + b._seed) * 0.6;
            const centerP = this.worldIso(b.tx + size / 2, b.ty + size / 2);
            centerP.y += idleBob;
            const fw = CFG.tileW * size / 2;
            const fh = CFG.tileH * size / 2;

            // Walls get their own dedicated rendering — proper stone block faces
            // with crenellations on top instead of the generic building shape.
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

            // Buildings grow slightly taller as they level up — another
            // glance-level cue that a structure has been upgraded.
            const lvlProgress = Math.min(1, ((b.level || 1) - 1) / Math.max(1, (def.maxLevel || 20) - 1));
            const heightMult = 1 + lvlProgress * 0.28;
            const h = this.buildHeight(b.type) * scale * heightMult;

            if (isWall) {
                this.drawWall(ctx, b, centerP, h, fw, fh);
            } else {
                // Per-level color shift — buildings evolve visibly every few levels.
                // Low levels use their defined colors; mid levels get a strong
                // darken + saturation boost; high levels get a brilliant gold
                // wash on the roof. Shifts are aggressive enough that you can
                // tell a Lv 1 from a Lv 5 at a glance.
                const lvl = b.level || 1;
                const maxLv = def.maxLevel || 20;
                const progress = Math.min(1, (lvl - 1) / Math.max(1, maxLv - 1));
                // Darken right face toward a rich shadow color (up to 55%)
                const c1 = progress > 0 ? mixColor(def.color1, '#0a0410', progress * 0.55) : def.color1;
                // Left face shifts toward a warm ember tone as buildings grow
                const c2 = progress > 0 ? mixColor(def.color2, '#4a1808', progress * 0.45) : def.color2;
                // Roof shifts toward a brilliant gold tone
                const rf = progress > 0 ? mixColor(def.roof, '#ffc857', Math.min(0.8, progress * 0.85)) : def.roof;

                // Right face
                ctx.fillStyle = c1;
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
                ctx.fillStyle = c2;
                ctx.beginPath();
                ctx.moveTo(centerP.x, centerP.y + fh);
                ctx.lineTo(centerP.x - fw, centerP.y);
                ctx.lineTo(centerP.x - fw, centerP.y - h);
                ctx.lineTo(centerP.x, centerP.y + fh - h);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Top diamond
                ctx.fillStyle = rf;
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
                if (!b.ghost) {
                    this.drawBuildingBody(ctx, b, centerP, h, fw, fh);
                }

                // Type-specific details
                this.drawBuildingDetail(ctx, b, centerP, h, fw, fh);

                // ---------- LEVEL MILESTONE ACCENTS ----------
                // Every 5 levels the building earns a visible upgrade accent so
                // progression is readable at a glance without opening the modal.
                if (!b.ghost) {
                    const lv = b.level || 1;
                    // Gold trim line on the roof seam at level 5+
                    if (lv >= 5) {
                        ctx.strokeStyle = '#ffc857';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(centerP.x - fw, centerP.y - h);
                        ctx.lineTo(centerP.x, centerP.y - fh - h);
                        ctx.lineTo(centerP.x + fw, centerP.y - h);
                        ctx.stroke();
                    }
                    // Pair of pennant flags at level 10+
                    if (lv >= 10) {
                        const flagY = centerP.y - h - fh - 10;
                        // Left flag
                        ctx.strokeStyle = '#c0a060';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(centerP.x - fw * 0.45, centerP.y - h - fh * 0.3);
                        ctx.lineTo(centerP.x - fw * 0.45, flagY);
                        ctx.stroke();
                        ctx.fillStyle = '#c73535';
                        ctx.beginPath();
                        ctx.moveTo(centerP.x - fw * 0.45, flagY);
                        ctx.lineTo(centerP.x - fw * 0.45 + 8, flagY + 3);
                        ctx.lineTo(centerP.x - fw * 0.45, flagY + 6);
                        ctx.closePath();
                        ctx.fill();
                        // Right flag
                        ctx.strokeStyle = '#c0a060';
                        ctx.beginPath();
                        ctx.moveTo(centerP.x + fw * 0.45, centerP.y - h - fh * 0.3);
                        ctx.lineTo(centerP.x + fw * 0.45, flagY);
                        ctx.stroke();
                        ctx.fillStyle = '#c73535';
                        ctx.beginPath();
                        ctx.moveTo(centerP.x + fw * 0.45, flagY);
                        ctx.lineTo(centerP.x + fw * 0.45 - 8, flagY + 3);
                        ctx.lineTo(centerP.x + fw * 0.45, flagY + 6);
                        ctx.closePath();
                        ctx.fill();
                    }
                    // Golden crown marker at level 15+
                    if (lv >= 15) {
                        ctx.fillStyle = '#ffe3a1';
                        ctx.font = 'bold 12px Cinzel, serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('♛', centerP.x, centerP.y - h - fh - 20);
                    }
                    // Ember halo pulse at level 20+ (max-tier aesthetic)
                    if (lv >= 20) {
                        const pulse = 0.5 + 0.5 * Math.sin(this.tnow * 2 + (b._seed || 0));
                        ctx.strokeStyle = `rgba(255, 107, 53, ${0.3 + pulse * 0.3})`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.ellipse(centerP.x, centerP.y + fh * 0.2, fw * 1.1, fh * 0.65, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }

            // Chimney smoke for buildings with clickBonus / production — rises continuously
            if (!b.ghost && (def.production || b.type === 'builderhut' || b.type === 'lab')) {
                this.spawnChimneyPuff(b, centerP, h, fw);
            }

            if (b.ghost) return;

            // Level badge — small circle tucked against the top-right of the
            // building. Tiny like Clash of Clans (not a big floating tag).
            // The polygon hex hit-test already covers the whole building shape,
            // so this is purely visual — no need for a separate hit target.
            const badgeX = centerP.x + fw * 0.42;
            const badgeY = centerP.y - h - fh * 0.12;
            ctx.fillStyle = 'rgba(0,0,0,.8)';
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffc857';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#ffc857';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.level, badgeX, badgeY);

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

            // Selection pulse ring (fades out after left-click on a non-collector)
            if (this.selectedBuilding === b && this.selectHighlight > 0) {
                const s = this.selectHighlight;
                ctx.save();
                ctx.globalAlpha = s * 0.9;
                ctx.strokeStyle = '#ffe3a1';
                ctx.lineWidth = 2.5 + (1 - s) * 3;
                ctx.beginPath();
                ctx.ellipse(
                    centerP.x,
                    centerP.y + fh * 0.25,
                    fw * (0.85 + (1 - s) * 0.35),
                    fh * (0.55 + (1 - s) * 0.25),
                    0, 0, Math.PI * 2
                );
                ctx.stroke();
                ctx.restore();
            }

            if (savedAlpha) ctx.restore();
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

        /**
         * Dedicated wall renderer — replaces the generic building shape with a
         * chunky stone rampart: two-tone stone block faces, mortared seams, and
         * proper merlon crenellations along the top back edges.
         */
        drawWall(ctx, b, c, h, fw, fh) {
            // Stone palette — slight level-based tint (walls look stronger as they level)
            const level = Math.max(1, b.level || 1);
            const tint = Math.min(0.25, (level - 1) * 0.03);
            const lerp = (a, t) => Math.round(a + (90 - a) * t);
            const rightR = lerp(0x6a, tint), rightG = lerp(0x6a, tint), rightB = lerp(0x74, tint);
            const leftR  = lerp(0x3c, tint), leftG  = lerp(0x3c, tint), leftB  = lerp(0x46, tint);
            const topR   = lerp(0x84, tint), topG   = lerp(0x84, tint), topB   = lerp(0x90, tint);
            const rightFill = `rgb(${rightR},${rightG},${rightB})`;
            const leftFill  = `rgb(${leftR},${leftG},${leftB})`;
            const topFill   = `rgb(${topR},${topG},${topB})`;
            const mortar    = 'rgba(12,12,16,0.75)';
            const edge      = 'rgba(0,0,0,0.6)';

            // ---------- RIGHT FACE (lit side) ----------
            ctx.fillStyle = rightFill;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + fh);
            ctx.lineTo(c.x + fw, c.y);
            ctx.lineTo(c.x + fw, c.y - h);
            ctx.lineTo(c.x, c.y + fh - h);
            ctx.closePath();
            ctx.fill();

            // Stone block seams on right face — one horizontal mid-seam + staggered
            // verticals to imply bricks without drawing every block individually
            ctx.strokeStyle = mortar;
            ctx.lineWidth = 1;
            // Horizontal mid-seam: from (c.x, c.y+fh-h*0.5) to (c.x+fw, c.y-h*0.5)
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + fh - h * 0.5);
            ctx.lineTo(c.x + fw, c.y - h * 0.5);
            ctx.stroke();
            // Top-row vertical seam at ~1/3 across
            ctx.beginPath();
            let tx = 0.38;
            ctx.moveTo(c.x + fw * tx, c.y + fh * (1 - tx));
            ctx.lineTo(c.x + fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.stroke();
            // Top-row vertical seam at ~2/3 across
            ctx.beginPath();
            tx = 0.72;
            ctx.moveTo(c.x + fw * tx, c.y + fh * (1 - tx));
            ctx.lineTo(c.x + fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.stroke();
            // Bottom-row verticals staggered for brick offset
            ctx.beginPath();
            tx = 0.22;
            ctx.moveTo(c.x + fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.lineTo(c.x + fw * tx, c.y + fh * (1 - tx) - h);
            ctx.stroke();
            ctx.beginPath();
            tx = 0.55;
            ctx.moveTo(c.x + fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.lineTo(c.x + fw * tx, c.y + fh * (1 - tx) - h);
            ctx.stroke();

            // Right face outline
            ctx.strokeStyle = edge;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + fh);
            ctx.lineTo(c.x + fw, c.y);
            ctx.lineTo(c.x + fw, c.y - h);
            ctx.lineTo(c.x, c.y + fh - h);
            ctx.closePath();
            ctx.stroke();

            // ---------- LEFT FACE (shadow side) ----------
            ctx.fillStyle = leftFill;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + fh);
            ctx.lineTo(c.x - fw, c.y);
            ctx.lineTo(c.x - fw, c.y - h);
            ctx.lineTo(c.x, c.y + fh - h);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = mortar;
            ctx.lineWidth = 1;
            // Horizontal mid-seam
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + fh - h * 0.5);
            ctx.lineTo(c.x - fw, c.y - h * 0.5);
            ctx.stroke();
            // Top-row vertical seams
            ctx.beginPath();
            tx = 0.38;
            ctx.moveTo(c.x - fw * tx, c.y + fh * (1 - tx));
            ctx.lineTo(c.x - fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.stroke();
            ctx.beginPath();
            tx = 0.72;
            ctx.moveTo(c.x - fw * tx, c.y + fh * (1 - tx));
            ctx.lineTo(c.x - fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.stroke();
            // Bottom-row verticals
            ctx.beginPath();
            tx = 0.22;
            ctx.moveTo(c.x - fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.lineTo(c.x - fw * tx, c.y + fh * (1 - tx) - h);
            ctx.stroke();
            ctx.beginPath();
            tx = 0.55;
            ctx.moveTo(c.x - fw * tx, c.y + fh * (1 - tx) - h * 0.5);
            ctx.lineTo(c.x - fw * tx, c.y + fh * (1 - tx) - h);
            ctx.stroke();

            ctx.strokeStyle = edge;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y + fh);
            ctx.lineTo(c.x - fw, c.y);
            ctx.lineTo(c.x - fw, c.y - h);
            ctx.lineTo(c.x, c.y + fh - h);
            ctx.closePath();
            ctx.stroke();

            // ---------- TOP WALKWAY ----------
            ctx.fillStyle = topFill;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y - fh - h);
            ctx.lineTo(c.x + fw, c.y - h);
            ctx.lineTo(c.x, c.y + fh - h);
            ctx.lineTo(c.x - fw, c.y - h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = edge;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Subtle inner highlight on the top so it reads as a walkway
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(c.x - fw * 0.85, c.y - h - fh * 0.1);
            ctx.lineTo(c.x, c.y - fh - h + 2);
            ctx.stroke();

            // ---------- CRENELLATIONS (merlons) ----------
            // A row of chunky merlons along the two back edges of the top diamond.
            // Back-right edge: from back point (c.x, c.y-fh-h) → right point (c.x+fw, c.y-h)
            // Back-left edge:  from back point (c.x, c.y-fh-h) → left point (c.x-fw, c.y-h)
            const merlonH = 6;
            const merlonHalfW = 4;
            const drawMerlon = (mx, my) => {
                // Front face (facing camera)
                ctx.fillStyle = rightFill;
                ctx.beginPath();
                ctx.moveTo(mx - merlonHalfW, my - merlonH);
                ctx.lineTo(mx + merlonHalfW, my - merlonH);
                ctx.lineTo(mx + merlonHalfW, my);
                ctx.lineTo(mx - merlonHalfW, my);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = edge;
                ctx.stroke();
                // Tiny top highlight
                ctx.fillStyle = topFill;
                ctx.fillRect(mx - merlonHalfW, my - merlonH - 1, merlonHalfW * 2, 1.5);
            };

            // Back-right edge merlons
            for (let k = 0; k < 3; k++) {
                const t = 0.2 + k * 0.3;
                const mx = c.x + fw * t;
                const my = c.y - h - fh * (1 - t);
                drawMerlon(mx, my);
            }
            // Back-left edge merlons
            for (let k = 0; k < 3; k++) {
                const t = 0.2 + k * 0.3;
                const mx = c.x - fw * t;
                const my = c.y - h - fh * (1 - t);
                drawMerlon(mx, my);
            }

            // Small moss tuft on the base for character
            ctx.fillStyle = '#5a8a3a';
            ctx.beginPath();
            ctx.arc(c.x - fw * 0.5, c.y - h * 0.2, 1.3, 0, Math.PI * 2);
            ctx.arc(c.x + fw * 0.45, c.y - h * 0.75, 1.3, 0, Math.PI * 2);
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
            // Lookup from hoisted module-level WINDOW_SPEC (see top of file)
            const spec = WINDOW_SPEC[b.type] || [];
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
                        ctx.arc(c.x - 6 + i * 6 + Math.sin(this.tnow * 3.3 + i) * 2, c.y - h - fh * 0.3 - (i * 2), 2, 0, Math.PI * 2);
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
                    const t = this.tnow * 2.5;
                    const r = 8 + Math.sin(t) * 2;
                    // Use a solid fill instead of a per-frame radial gradient — cheaper
                    // and visually nearly identical once layered with the white core.
                    ctx.fillStyle = 'rgba(92, 216, 255, 0.55)';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.4, r + 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(166, 236, 255, 0.85)';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.4, r + 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'tesla': {
                    // Crackling lightning coil
                    const t = this.tnow * 8.3;
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
                    // Glowing core — layered solid fills instead of per-frame radial
                    // gradient (gradients are expensive; this version is visually
                    // nearly identical and runs ~10× faster.)
                    const t = this.tnow * 5;
                    const r = 7 + Math.sin(t) * 2;
                    ctx.fillStyle = 'rgba(255, 107, 53, 0.45)';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.5, r + 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255, 180, 70, 0.75)';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.5, r + 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffee99';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y - h - fh * 0.5, r - 1, 0, Math.PI * 2);
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
                    const t = this.tnow * 5;
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

            // Flying enemies: draw a ground shadow far below and wings
            if (e.flying) {
                // Ground shadow (on the "real" ground plane, ~30px below)
                ctx.fillStyle = 'rgba(0,0,0,.25)';
                ctx.beginPath();
                ctx.ellipse(e.x, e.y + 38, e.size * 0.7, e.size * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Wings — triangle flaps that animate with wobble
                const wingAngle = Math.sin(e.wobble * 0.8) * 0.5;
                ctx.fillStyle = e.color;
                ctx.globalAlpha = 0.6;
                // Left wing
                ctx.beginPath();
                ctx.moveTo(e.x - e.size * 0.4, e.y + bob);
                ctx.lineTo(e.x - e.size * 2.2, e.y - e.size * 0.3 + bob - wingAngle * 14);
                ctx.lineTo(e.x - e.size * 0.2, e.y - e.size * 0.5 + bob);
                ctx.closePath();
                ctx.fill();
                // Right wing
                ctx.beginPath();
                ctx.moveTo(e.x + e.size * 0.4, e.y + bob);
                ctx.lineTo(e.x + e.size * 2.2, e.y - e.size * 0.3 + bob + wingAngle * 14);
                ctx.lineTo(e.x + e.size * 0.2, e.y - e.size * 0.5 + bob);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                // Ground shadow for walking enemies
                ctx.fillStyle = 'rgba(0,0,0,.45)';
                ctx.beginPath();
                ctx.ellipse(e.x, e.y + e.size + 4, e.size * 0.9, e.size * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Body
            if (!e._hi) e._hi = mixColor(e.color, '#ffffff', 0.3);
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y + bob, e.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = e._hi;
            ctx.beginPath();
            ctx.arc(e.x - e.size * 0.3, e.y - e.size * 0.3 + bob, e.size * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(e.x, e.y + bob, e.size, 0, Math.PI * 2);
            ctx.stroke();

            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(e.x - e.size * 0.3, e.y - e.size * 0.2 + bob, 2.2, 0, Math.PI * 2);
            ctx.arc(e.x + e.size * 0.3, e.y - e.size * 0.2 + bob, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = e.flying ? '#ff3333' : '#000';
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
        /**
         * Render (or refresh) the build shop. The cards are kept in place across
         * refreshes — we only update class names for affordability / selection
         * state rather than wiping innerHTML. This eliminates the 500ms flicker
         * that was happening because updateUI calls buildMenu() on a timer.
         *
         * `forceRebuild` is true when the card set itself changes (e.g. town hall
         * placed → its card disappears, or player level unlocks a new card).
         */
        buildMenu(forceRebuild = false) {
            const menu = document.getElementById('buildMenu');
            if (!menu) return;
            const hasTownHall = this.buildings.some(b => b.type === 'townhall');

            // Compute the stable key of which cards should exist right now
            const entries = Object.entries(BLD).filter(([type]) => {
                if (type === 'townhall' && hasTownHall) return false;
                return true;
            });
            const setKey = entries.map(([type, def]) => {
                const locked = this.player.level < def.unlockLevel;
                return type + (locked ? 'L' : '');
            }).join('|');

            // Only rebuild DOM if the card set changed (or first render)
            if (forceRebuild || this._buildMenuKey !== setKey) {
                this._buildMenuKey = setKey;
                menu.innerHTML = '';
                for (const [type, def] of entries) {
                    const locked = this.player.level < def.unlockLevel;
                    const afford = this.canAfford(def.baseCost);
                    const card = document.createElement('div');
                    card.className = 'build-card' + (locked ? ' locked' : '') + (!afford && !locked ? ' cannot-afford' : '');
                    card.dataset.type = type;
                    const cost = Object.entries(def.baseCost).map(([k,v]) => `${fmt(v)} ${this.resSymbol(k)}`).join(' · ') || 'Free';
                    card.innerHTML = `
                        <div class="build-icon">${def.icon}</div>
                        <div class="build-name">${def.name}</div>
                        ${locked
                            ? `<div class="build-lock">Unlocks Lv ${def.unlockLevel}</div>`
                            : `<div class="build-cost ${!afford ? 'red' : ''}">${cost}</div>`}
                    `;
                    card.addEventListener('click', () => {
                        // Re-evaluate affordability at click time — state may have changed
                        const curLocked = this.player.level < def.unlockLevel;
                        const curAfford = this.canAfford(def.baseCost);
                        if (curLocked) { this.audio.error(); this.toast(`Requires player level ${def.unlockLevel}`, 'warn'); return; }
                        if (!curAfford) { this.audio.error(); this.toast('Not enough resources', 'warn'); return; }
                        this.setBuildMode(type);
                    });
                    menu.appendChild(card);
                }
            }

            // Cheap refresh: just update per-card class state in place. No reflow,
            // no flicker, no re-binding event listeners.
            const cards = menu.children;
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const type = card.dataset.type;
                if (!type) continue;
                const def = BLD[type];
                const locked = this.player.level < def.unlockLevel;
                const afford = this.canAfford(def.baseCost);
                card.classList.toggle('locked', locked);
                card.classList.toggle('cannot-afford', !afford && !locked);
                card.classList.toggle('selected', this.buildMode === type);
                // Also refresh the red-cost color on the cost line
                const costEl = card.querySelector('.build-cost');
                if (costEl) costEl.classList.toggle('red', !afford);
            }
        }

        setBuildMode(type) {
            // Hard guard: only ONE Town Hall per kingdom. Refuse the mode even
            // if a stale card somehow makes it into the DOM.
            if (type === 'townhall' && this.buildings.some(b => b.type === 'townhall')) {
                this.audio.error();
                this.toast('You already have a Town Hall', 'warn');
                this.buildMenu(true); // force-rebuild so the card is removed
                return;
            }
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

            const warCryBtn = document.getElementById('actWarCry');
            if (warCryBtn) warCryBtn.addEventListener('click', () => { this.audio.click(); this.activateWarCry(); });

            const pauseBtn = document.getElementById('actPause');
            if (pauseBtn) pauseBtn.addEventListener('click', () => { this.audio.click(); this.togglePause(); });

            const autoBtn = document.getElementById('actAutoCollect');
            if (autoBtn) autoBtn.addEventListener('click', () => {
                this.audio.click();
                this.autoCollect = !this.autoCollect;
                const label = autoBtn.querySelector('.action-label');
                if (label) label.textContent = this.autoCollect ? 'Auto: On' : 'Auto: Off';
                autoBtn.classList.toggle('on', this.autoCollect);
                this.toast(this.autoCollect ? 'Auto-collect enabled' : 'Auto-collect disabled', 'success');
            });

            // Auto-pause when the tab becomes hidden so raiders don't attack
            // the kingdom while the player has the app closed or backgrounded.
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this._wasPausedBeforeHide = this.paused;
                    this.paused = true;
                } else if (!this._wasPausedBeforeHide && !this.gameOverShown) {
                    this.paused = false;
                    // Reset frame delta so the first post-resume tick doesn't
                    // jump forward by the entire hidden duration.
                    this.lastTime = performance.now();
                }
            });

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
                this.showConfirm({
                    title: 'Reset Kingdom',
                    icon: '⚠',
                    body: 'Erase all progress and start a new kingdom?<br><br><span style="color:#ff9a6b">This cannot be undone.</span>',
                    yesText: 'Erase Everything',
                    noText: 'Keep Playing',
                    danger: true,
                    onYes: () => {
                        localStorage.removeItem(CFG.saveKey);
                        location.reload();
                    },
                });
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

            // War Cry button state
            const wcBtn = document.getElementById('actWarCry');
            if (wcBtn) {
                const wcLabel = wcBtn.querySelector('.action-label');
                if (this.warCry.active) {
                    wcBtn.classList.add('active');
                    wcBtn.classList.remove('on-cooldown');
                    if (wcLabel) wcLabel.textContent = `War Cry ${Math.ceil(this.warCry.timeLeft)}s`;
                } else if (this.warCry.cooldown > 0) {
                    wcBtn.classList.remove('active');
                    wcBtn.classList.add('on-cooldown');
                    if (wcLabel) wcLabel.textContent = `Cooldown ${Math.ceil(this.warCry.cooldown)}s`;
                } else {
                    wcBtn.classList.remove('active', 'on-cooldown');
                    if (wcLabel) wcLabel.textContent = 'War Cry';
                }
            }

            // Night bonus indicator on rate display
            const isNightNow = this.dayTime < 0.2 || this.dayTime > 0.8;
            const rateGold = document.getElementById('rate-gold');
            if (rateGold && isNightNow) {
                rateGold.textContent += ' 🌙';
            }

            // Only rebuild inner tab content when that tab is actually visible.
            // updateUI runs at 10Hz, so skipping hidden tabs saves a LOT of DOM work.
            const activeTab = document.querySelector('.tab.active')?.dataset.tab;
            if (activeTab === 'army')  this.updateArmyTab();
            if (activeTab === 'stats') this.updateStatsTab();

            if (!this._menuAcc) this._menuAcc = 0;
            this._menuAcc++;
            if (activeTab === 'build' && this._menuAcc % 5 === 0) this.buildMenu();
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
            if (this.gameOverShown) return; // don't re-queue if already showing
            this.showAlert('☠ KINGDOM FALLEN ☠', 4);
            // Freeze the world during game-over via the pause flag — no more
            // sentinel values on wave.timer that could leak into saves.
            this.wave.active = false;
            this.wave.spawnLeft = 0;
            this.wave.timer = CFG.waveBaseSec;
            this.enemies = [];
            this.projectiles = [];
            this.gameOverShown = true;
            this.paused = true;
            setTimeout(() => {
                this.showConfirm({
                    title: 'KINGDOM FALLEN',
                    icon: '☠',
                    body: `Your Town Hall fell on <b>Day ${this.dayCount}</b>, <b>Wave ${this.wave.number}</b>.<br><br>Raise a new banner and rebuild from the ashes?`,
                    yesText: '⚔ Rebuild',
                    noText: 'Not yet',
                    danger: true,
                    onYes: () => {
                        localStorage.removeItem(CFG.saveKey);
                        location.reload();
                    },
                    onNo: () => {
                        // Declined: give them a 60s grace period to rebuild, then waves resume
                        this.wave.timer = 60;
                        this.gameOverShown = false;
                        this.paused = false;
                        this.toast('60s grace — rebuild your Town Hall', 'warn');
                        this.buildMenu(true); // refresh so TH card reappears
                    },
                });
            }, 1800);
        }

        /**
         * Custom themed confirm dialog.
         * opts: { title, body (html), icon, yesText, noText, danger, onYes, onNo }
         */
        showConfirm(opts = {}) {
            // Create once, reuse
            let el = document.getElementById('confirmDialog');
            if (!el) {
                el = document.createElement('div');
                el.id = 'confirmDialog';
                el.className = 'confirm-dialog';
                el.innerHTML = `
                    <div class="confirm-backdrop"></div>
                    <div class="confirm-panel">
                        <div class="confirm-icon"></div>
                        <h2 class="confirm-title"></h2>
                        <div class="confirm-body"></div>
                        <div class="confirm-actions">
                            <button class="btn small" data-act="no"></button>
                            <button class="btn primary" data-act="yes"></button>
                        </div>
                    </div>
                `;
                document.body.appendChild(el);
            }
            const panel = el.querySelector('.confirm-panel');
            el.querySelector('.confirm-icon').textContent = opts.icon || '⚔';
            el.querySelector('.confirm-title').textContent = opts.title || 'Confirm';
            el.querySelector('.confirm-body').innerHTML = opts.body || '';
            const yesBtn = el.querySelector('[data-act="yes"]');
            const noBtn  = el.querySelector('[data-act="no"]');
            yesBtn.textContent = opts.yesText || 'Confirm';
            noBtn.textContent  = opts.noText || 'Cancel';
            panel.classList.toggle('danger', !!opts.danger);

            const close = () => {
                el.classList.remove('open');
                yesBtn.removeEventListener('click', onYes);
                noBtn.removeEventListener('click', onNo);
                el.querySelector('.confirm-backdrop').removeEventListener('click', onNo);
                document.removeEventListener('keydown', onKey);
            };
            const onYes = () => { close(); if (opts.onYes) opts.onYes(); };
            const onNo  = () => { close(); if (opts.onNo) opts.onNo(); };
            const onKey = (e) => {
                if (e.key === 'Escape') onNo();
                if (e.key === 'Enter')  onYes();
            };
            yesBtn.addEventListener('click', onYes);
            noBtn.addEventListener('click', onNo);
            el.querySelector('.confirm-backdrop').addEventListener('click', onNo);
            document.addEventListener('keydown', onKey);
            // Force reflow to restart animation
            void el.offsetWidth;
            el.classList.add('open');
        }

        // ---------- War Cry ----------
        activateWarCry() {
            if (this.warCry.active) {
                this.toast('War Cry already active!', 'warn');
                return;
            }
            if (this.warCry.cooldown > 0) {
                this.toast(`War Cry on cooldown (${Math.ceil(this.warCry.cooldown)}s)`, 'warn');
                this.audio.error();
                return;
            }
            this.warCry.active = true;
            this.warCry.timeLeft = 15;
            this.warCry.cooldown = 90;
            this.audio.spell();
            this.toast('🔥 War Cry! Tower damage +50% for 15s', 'success');
            this.showAlert('🔥 WAR CRY 🔥', 2);
        }

        // ---------- Co-op Multiplayer ----------
        initCoop() {
            if (typeof Peer === 'undefined') {
                console.warn('PeerJS not loaded, co-op disabled');
                const codeEl = document.getElementById('gameCode');
                if (codeEl) codeEl.textContent = 'OFFLINE';
                return;
            }

            const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
            const genCode = () => Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            this.coop.code = genCode();

            const codeEl = document.getElementById('gameCode');
            if (codeEl) codeEl.textContent = this.coop.code;

            const createPeer = (code) => {
                const peer = new Peer('ember_' + code, { debug: 0 });

                peer.on('open', () => {
                    console.log('Co-op ready, code:', code);
                });

                peer.on('connection', (conn) => {
                    this.handleIncomingConnection(conn);
                });

                peer.on('error', (err) => {
                    if (err.type === 'unavailable-id') {
                        this.coop.code = genCode();
                        if (codeEl) codeEl.textContent = this.coop.code;
                        peer.destroy();
                        this.coop.peer = createPeer(this.coop.code);
                    } else {
                        console.warn('Peer error:', err.type, err.message);
                    }
                });

                return peer;
            };

            try {
                this.coop.peer = createPeer(this.coop.code);
            } catch (e) {
                console.warn('Co-op init failed:', e);
            }

            this.bindCoopUI();
        }

        bindCoopUI() {
            const copyBtn = document.getElementById('btnCopyCode');
            if (copyBtn) copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(this.coop.code).then(() => {
                    this.toast('Code copied!', 'success');
                    this.audio.click();
                }).catch(() => {
                    this.toast(this.coop.code, 'success');
                    this.audio.click();
                });
            });

            const connectBtn = document.getElementById('btnConnect');
            const codeInput = document.getElementById('partnerCodeInput');
            if (connectBtn && codeInput) {
                connectBtn.addEventListener('click', () => {
                    const code = codeInput.value.trim().toUpperCase();
                    if (code.length !== 6) {
                        this.toast('Enter a 6-character code', 'warn');
                        this.audio.error();
                        return;
                    }
                    if (code === this.coop.code) {
                        this.toast("That's your own code!", 'warn');
                        this.audio.error();
                        return;
                    }
                    this.audio.click();
                    this.connectToPartner(code);
                });
                codeInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') connectBtn.click();
                });
            }

            const disconnectBtn = document.getElementById('btnDisconnect');
            if (disconnectBtn) disconnectBtn.addEventListener('click', () => {
                this.audio.click();
                this.disconnectCoop();
            });

            const acceptBtn = document.getElementById('btnAcceptInvite');
            if (acceptBtn) acceptBtn.addEventListener('click', () => {
                this.audio.click();
                this.acceptInvite();
            });

            const declineBtn = document.getElementById('btnDeclineInvite');
            if (declineBtn) declineBtn.addEventListener('click', () => {
                this.audio.click();
                this.declineInvite();
            });

            document.querySelectorAll('.gift-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.audio.click();
                    this.sendGift(btn.dataset.gift);
                });
            });
        }

        connectToPartner(code) {
            if (!this.coop.peer) { this.toast('Co-op not available', 'error'); return; }
            if (this.coop.connected) { this.toast('Already connected', 'warn'); return; }

            this.toast('Connecting...', 'warn');
            const conn = this.coop.peer.connect('ember_' + code, {
                metadata: { name: this.player.name, level: this.player.level, code: this.coop.code }
            });

            const timeout = setTimeout(() => {
                if (!this.coop.connected) {
                    this.toast('Connection timed out — is partner online?', 'error');
                    conn.close();
                }
            }, 12000);

            conn.on('open', () => {
                clearTimeout(timeout);
                this.setupConnection(conn);
                conn.send({ type: 'hello', name: this.player.name, level: this.player.level });
            });

            conn.on('error', () => {
                clearTimeout(timeout);
                this.toast('Connection failed — check the code', 'error');
            });
        }

        handleIncomingConnection(conn) {
            if (this.coop.connected) {
                conn.send({ type: 'busy' });
                conn.close();
                return;
            }
            const meta = conn.metadata || {};
            this.coop.pendingInvite = conn;

            conn.on('open', () => {
                this.showInviteNotification(meta.name || 'A player', meta.level || 1);
            });

            // Auto-decline after 30 seconds
            setTimeout(() => {
                if (this.coop.pendingInvite === conn && !this.coop.connected) {
                    this.declineInvite();
                }
            }, 30000);
        }

        acceptInvite() {
            if (!this.coop.pendingInvite) return;
            const conn = this.coop.pendingInvite;
            this.coop.pendingInvite = null;
            this.hideInviteNotification();
            this.setupConnection(conn);
            conn.send({ type: 'hello', name: this.player.name, level: this.player.level });
        }

        declineInvite() {
            if (!this.coop.pendingInvite) {
                this.hideInviteNotification();
                return;
            }
            try { this.coop.pendingInvite.send({ type: 'declined' }); } catch (_) {}
            try { this.coop.pendingInvite.close(); } catch (_) {}
            this.coop.pendingInvite = null;
            this.hideInviteNotification();
            this.toast('Invite declined', 'warn');
        }

        setupConnection(conn) {
            this.coop.conn = conn;
            this.coop.connected = true;
            this.coop.partnerCode = (conn.peer || '').replace('ember_', '');

            conn.on('data', (data) => this.handleCoopData(data));
            conn.on('close', () => this.handleCoopDisconnect());
            conn.on('error', () => this.handleCoopDisconnect());

            // Sync state every 2 seconds
            this.coop.syncInterval = setInterval(() => {
                if (this.coop.connected && this.coop.conn && this.coop.conn.open) {
                    try { this.coop.conn.send({ type: 'state', state: this.getCoopState() }); } catch (_) {}
                }
            }, 2000);

            this.audio.levelup();
            this.toast('Co-op connected!', 'success');
            this.showAlert('⚔ ALLY JOINED ⚔', 2);
            this.updateCoopUI();

            // Send initial state immediately
            try { conn.send({ type: 'state', state: this.getCoopState() }); } catch (_) {}

            // Switch to co-op tab
            document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'coop'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === 'coop'));
        }

        handleCoopDisconnect() {
            const wasConnected = this.coop.connected;
            this.coop.connected = false;
            this.coop.conn = null;
            this.coop.partnerState = null;
            this.coop.partnerCode = '';
            if (this.coop.syncInterval) {
                clearInterval(this.coop.syncInterval);
                this.coop.syncInterval = null;
            }
            if (wasConnected) {
                this.toast('Partner disconnected', 'warn');
                this.showAlert('ALLY LEFT', 2);
            }
            this.updateCoopUI();
        }

        disconnectCoop() {
            if (this.coop.conn) {
                try { this.coop.conn.send({ type: 'goodbye' }); } catch (_) {}
                try { this.coop.conn.close(); } catch (_) {}
            }
            this.handleCoopDisconnect();
        }

        handleCoopData(data) {
            if (!data || !data.type) return;

            switch (data.type) {
                case 'hello':
                    this.toast(`${data.name} (Lv ${data.level}) joined!`, 'success');
                    break;
                case 'declined':
                    this.toast('Invite was declined', 'warn');
                    this.handleCoopDisconnect();
                    break;
                case 'busy':
                    this.toast('Player is already in a co-op session', 'warn');
                    this.handleCoopDisconnect();
                    break;
                case 'goodbye':
                    this.handleCoopDisconnect();
                    break;
                case 'state':
                    this.coop.partnerState = data.state;
                    this.updatePartnerPanel();
                    break;
                case 'gift':
                    this.receiveGift(data.resource, data.amount, data.from);
                    break;
            }
        }

        getCoopState() {
            return {
                name: this.player.name,
                level: this.player.level,
                res: { gold: this.res.gold, elixir: this.res.elixir, dark: this.res.dark, gems: this.res.gems },
                rates: { gold: this.rates.gold, elixir: this.rates.elixir, dark: this.rates.dark },
                buildings: this.buildings.map(b => ({
                    type: b.type, tx: b.tx, ty: b.ty, level: b.level,
                    hp: b.hp, maxHp: b.maxHp,
                })),
                wave: { number: this.wave.number, active: this.wave.active, timer: this.wave.timer },
                enemies: this.enemies.length,
                dayTime: this.dayTime,
                dayCount: this.dayCount,
                stats: { built: this.stats.built, kills: this.stats.kills },
                boost: this.boost.mult > 1,
                warCry: this.warCry.active,
            };
        }

        sendGift(resource) {
            if (!this.coop.connected || !this.coop.conn || !this.coop.conn.open) {
                this.toast('Not connected to a partner', 'warn');
                return;
            }
            let amount;
            if (resource === 'gems') {
                amount = 1;
                if (this.res.gems < 1) {
                    this.toast('Not enough gems', 'warn');
                    this.audio.error();
                    return;
                }
            } else {
                amount = Math.floor((this.res[resource] || 0) * 0.1);
                if (amount < 1) {
                    this.toast(`Not enough ${resource} to send`, 'warn');
                    this.audio.error();
                    return;
                }
            }
            this.res[resource] -= amount;
            try {
                this.coop.conn.send({
                    type: 'gift',
                    resource,
                    amount,
                    from: this.player.name,
                });
            } catch (_) {
                // Refund on send failure
                this.res[resource] += amount;
                this.toast('Send failed', 'error');
                return;
            }
            this.audio.coin();
            this.toast(`Sent ${fmt(amount)} ${this.resSymbol(resource)} to partner`, 'success');
            this.pulseRes(resource);
            this.updateUI();
        }

        receiveGift(resource, amount, from) {
            if (resource === 'gems') {
                this.res.gems += amount;
            } else {
                this.res[resource] = Math.min(this.cap(), (this.res[resource] || 0) + amount);
            }
            this.audio.levelup();
            this.toast(`${from} sent you ${fmt(amount)} ${this.resSymbol(resource)}!`, 'success');
            this.pulseRes(resource);
            this.showAlert(`♦ GIFT: +${fmt(amount)} ${resource.toUpperCase()} ♦`, 2);
            this.updateUI();
        }

        updateCoopUI() {
            const connected = this.coop.connected;
            const panel = document.getElementById('coopConnected');
            const disconnected = document.getElementById('coopDisconnected');
            if (panel) panel.style.display = connected ? 'block' : 'none';
            if (disconnected) disconnected.style.display = connected ? 'none' : 'block';

            const codeEl = document.getElementById('gameCode');
            if (codeEl) codeEl.textContent = this.coop.code;

            const statusEl = document.getElementById('coopStatus');
            if (statusEl) {
                statusEl.textContent = connected ? 'Connected' : 'Not Connected';
                statusEl.className = 'coop-status ' + (connected ? 'online' : 'offline');
            }
        }

        updatePartnerPanel() {
            const s = this.coop.partnerState;
            if (!s) return;

            const nameEl = document.getElementById('partnerName');
            if (nameEl) nameEl.textContent = `${s.name} · Lv ${s.level}`;

            const resEl = document.getElementById('partnerRes');
            if (resEl) resEl.innerHTML = `
                <span class="p-res gold">◈ ${fmt(s.res.gold)}</span>
                <span class="p-res elixir">❂ ${fmt(s.res.elixir)}</span>
                <span class="p-res dark">✦ ${fmt(s.res.dark)}</span>
                <span class="p-res gem">♦ ${s.res.gems}</span>
            `;

            const waveEl = document.getElementById('partnerWave');
            if (waveEl) {
                if (s.wave.active) {
                    waveEl.textContent = `Wave ${s.wave.number} · ${s.enemies} enemies · ${s.boost ? '⚡BOOSTED' : ''} ${s.warCry ? '🔥WAR CRY' : ''}`;
                } else {
                    waveEl.textContent = `Wave ${s.wave.number} · Next in ${fmtTime(s.wave.timer)} · Day ${s.dayCount}`;
                }
            }

            this.renderPartnerMinimap(s);
        }

        renderPartnerMinimap(state) {
            const canvas = document.getElementById('partnerMap');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            const cellW = w / CFG.gridW;
            const cellH = h / CFG.gridH;

            // Background
            ctx.fillStyle = '#0f1525';
            ctx.fillRect(0, 0, w, h);

            // Grid lines
            ctx.strokeStyle = 'rgba(255, 200, 87, 0.06)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= CFG.gridW; x++) {
                ctx.beginPath(); ctx.moveTo(x * cellW, 0); ctx.lineTo(x * cellW, h); ctx.stroke();
            }
            for (let y = 0; y <= CFG.gridH; y++) {
                ctx.beginPath(); ctx.moveTo(0, y * cellH); ctx.lineTo(w, y * cellH); ctx.stroke();
            }

            // Buildings
            if (state.buildings) {
                for (const b of state.buildings) {
                    const def = BLD[b.type];
                    if (!def) continue;
                    const size = def.size || 1;
                    const x = b.tx * cellW;
                    const y = b.ty * cellH;
                    const bw = size * cellW - 1;
                    const bh = size * cellH - 1;

                    // Level-based brightness
                    const bright = Math.min(1, 0.5 + (b.level / (def.maxLevel || 20)) * 0.5);
                    ctx.globalAlpha = bright;
                    ctx.fillStyle = def.roof || def.color2 || '#888';
                    ctx.fillRect(x + 0.5, y + 0.5, bw, bh);
                    ctx.globalAlpha = 1;

                    // HP bar if damaged
                    if (b.hp < b.maxHp * 0.95) {
                        const hpFrac = b.hp / b.maxHp;
                        ctx.fillStyle = hpFrac > 0.5 ? '#6bff95' : '#ff5d5d';
                        ctx.fillRect(x + 0.5, y + bh - 1, bw * hpFrac, 1.5);
                    }

                    // Town hall golden border
                    if (b.type === 'townhall') {
                        ctx.strokeStyle = '#ffc857';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 0.5, y + 0.5, bw, bh);
                    }
                }
            }

            // Enemy count indicator
            if (state.enemies > 0) {
                ctx.fillStyle = 'rgba(255, 93, 93, 0.85)';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(`⚔ ${state.enemies} enemies`, w - 6, 14);
            }
        }

        showInviteNotification(name, level) {
            const el = document.getElementById('inviteNotify');
            if (!el) return;
            const nameEl = document.getElementById('inviteName');
            if (nameEl) nameEl.textContent = `${name} (Lv ${level}) wants to co-op`;
            el.classList.add('show');
            this.audio.wave();
        }

        hideInviteNotification() {
            const el = document.getElementById('inviteNotify');
            if (el) el.classList.remove('show');
        }

        // ---------- Save / Load ----------
        save() {
            try {
                // Sanitize wave timer on write so the game-over sentinel never
                // leaks into persisted state. If the value is wild (destroyed
                // game over path), clamp it back to a normal range.
                const sanitizedTimer = Math.max(
                    5,
                    Math.min(this.wave.timer || CFG.waveBaseSec, Math.max(CFG.waveBaseSec, 120))
                );
                const data = {
                    v: 3,
                    res: this.res,
                    player: this.player,
                    buildings: this.buildings.map(b => ({ id: b.id, type: b.type, tx: b.tx, ty: b.ty, level: b.level, hp: b.hp, maxHp: b.maxHp })),
                    stats: this.stats,
                    achievements: this.achievements,
                    wave: { number: this.wave.number, timer: sanitizedTimer },
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
                // Sanitize the wave timer — old saves could get corrupted values
                // (e.g. 999999 from the game-over sentinel). Clamp to a sane range
                // so the "next raid in 16656:53" bug can't survive a reload.
                if (d.wave && typeof d.wave.timer === 'number') {
                    const maxSane = Math.max(CFG.waveBaseSec, 120);
                    this.wave.timer = Math.max(5, Math.min(d.wave.timer, maxSane));
                }
                if (typeof d.dayTime === 'number') this.dayTime = d.dayTime;
                if (typeof d.dayCount === 'number') this.dayCount = d.dayCount;
                if (d.cam && d.cam.zoom) this.cam.zoom = d.cam.zoom;

                if (Array.isArray(d.buildings)) {
                    let townHallSeen = false;
                    for (const s of d.buildings) {
                        if (!BLD[s.type]) continue; // unknown type (save migration)
                        // Dedupe town halls on load — only keep the first one.
                        // Guards against corrupt saves with duplicates.
                        if (s.type === 'townhall') {
                            if (townHallSeen) continue;
                            townHallSeen = true;
                        }
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

                // Safety net: if the save somehow lost the Town Hall (destroyed
                // mid-wave, user dismissed the modal, etc.), auto-show the
                // Kingdom Fallen prompt so the player always has a way back in.
                const hasTH = this.buildings.some(b => b.type === 'townhall');
                if (!hasTH) {
                    // Defer until after init finishes so the confirm dialog
                    // and audio are both ready.
                    setTimeout(() => this.gameOver(), 400);
                }
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
