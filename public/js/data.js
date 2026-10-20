/* ============================================================
   Kingdom of Ember — game data
   Config, building definitions, enemies, perks, quests, achievements.
   Everything here is plain data plus small helpers; no DOM, no canvas.
   ============================================================ */
(function (K) {
    'use strict';

    // ---------- CONFIG ----------
    const CFG = {
        gridW: 24,
        gridH: 24,
        tileW: 64,
        tileH: 42,              // set by the view preset; see VIEWS
        homeZoom: 1.3,          // where the camera sits on a fresh game and after 'reset view'
        zoomMin: 0.7,
        zoomMax: 2.2,
        saveKey: 'kingdomOfEmber.v3',   // key stays put so old saves still load; the format version lives in the data
        saveVersion: 6,
        autoSaveMs: 15000,
        offlineMaxSec: 4 * 60 * 60,
        offlineRate: 0.5,
        offlineSummarySec: 120,
        catchUpMaxSec: 3,
        darkCapFrac: 0.3,
        dayLengthSec: 180,
        waveBaseSec: 75,
        waveMinSec: 35,
        xpToLevel: (lv) => Math.floor(100 * Math.pow(1.4, lv - 1)),
        comboWindow: 1.3,
        spellCost: { gems: 1 },
        spellRadius: 3.2,
        spellBaseDmg: 260,
        prosperityCap: 0.15,         // decorations stop adding production past +15%
        ascendMinWave: 10,           // waves survived before the kingdom can ascend
    };

    // Camera tilt presets. tileH/tileW is the sine of the camera elevation, so a
    // bigger ratio looks more from above: buildings show more roof and hide less
    // of what is behind them. hk scales building heights to match.
    const VIEWS = {
        classic:  { label: 'Classic',  tileW: 72, tileH: 36, hk: 1.00 },
        balanced: { label: 'Balanced', tileW: 64, tileH: 44, hk: 0.86 },
        overhead: { label: 'Overhead', tileW: 60, tileH: 50, hk: 0.70 },
    };

    // ---------- BUILDINGS ----------
    // cat: where it sits in the shop. art: key used by the sprite painters in art.js.
    const BLD = {
        townhall: {
            name: 'Town Hall', cat: 'core', size: 2, maxLevel: 20, unlockLevel: 1, maxCount: 1,
            baseCost: { gold: 0 }, baseHP: 2500, tone: '#c8553a',
            desc: 'The heart of your kingdom. Upgrading raises storage and unlocks the late game.',
            upgradeCost: (lv) => ({ gold: 1500 * Math.pow(2, lv - 1), elixir: 400 * Math.pow(1.8, lv - 1) }),
            provides: (lv) => ({ cap: 3000 + lv * 2500 }),
        },
        goldmine: {
            name: 'Gold Mine', cat: 'economy', size: 1, maxLevel: 25, unlockLevel: 1,
            baseCost: { gold: 300 }, baseHP: 500, tone: '#d9b34e',
            desc: 'Digs gold around the clock. Tap it for a bonus burst.',
            upgradeCost: (lv) => ({ gold: 400 * Math.pow(1.55, lv - 1) }),
            production: (lv) => ({ gold: 2 + lv * 1.8 }),
            clickBonus: (lv) => ({ gold: 15 + lv * 12 }),
        },
        elixirwell: {
            name: 'Elixir Well', cat: 'economy', size: 1, maxLevel: 25, unlockLevel: 2,
            baseCost: { gold: 650 }, baseHP: 500, tone: '#c471ed',
            desc: 'Pumps magical elixir from deep underground. Tap for a burst.',
            upgradeCost: (lv) => ({ gold: 600 * Math.pow(1.55, lv - 1), elixir: 80 * Math.pow(1.5, lv - 1) }),
            production: (lv) => ({ elixir: 1 + lv * 1.2 }),
            clickBonus: (lv) => ({ elixir: 10 + lv * 8 }),
        },
        darkdrill: {
            name: 'Dark Drill', cat: 'economy', size: 1, maxLevel: 20, unlockLevel: 6,
            baseCost: { gold: 4500, elixir: 1200 }, baseHP: 700, tone: '#6b2cc9',
            desc: 'Bores for rare dark elixir, the fuel of the strongest defenses.',
            upgradeCost: (lv) => ({ gold: 5000 * Math.pow(1.7, lv - 1), elixir: 1500 * Math.pow(1.6, lv - 1) }),
            production: (lv) => ({ dark: 0.2 + lv * 0.15 }),
            clickBonus: (lv) => ({ dark: 2 + lv * 1.5 }),
        },
        gemquarry: {
            name: 'Gem Quarry', cat: 'economy', size: 1, maxLevel: 8, unlockLevel: 8, maxCount: 2,
            baseCost: { gold: 9000, elixir: 3500, dark: 20 }, baseHP: 650, tone: '#5cd8ff',
            desc: 'Cuts a trickle of gems from the rock. You can only run two.',
            upgradeCost: (lv) => ({ gold: 9000 * Math.pow(1.7, lv - 1), elixir: 3500 * Math.pow(1.6, lv - 1), dark: 25 * Math.pow(1.4, lv - 1) }),
            production: (lv) => ({ gems: 0.003 + lv * 0.0008 }),
        },
        storage: {
            name: 'Vault', cat: 'economy', size: 1, maxLevel: 20, unlockLevel: 2,
            baseCost: { gold: 800 }, baseHP: 900, tone: '#b08040',
            desc: 'Raises the storage cap for every resource.',
            upgradeCost: (lv) => ({ gold: 900 * Math.pow(1.6, lv - 1) }),
            provides: (lv) => ({ cap: 1500 * lv + 1500 }),
        },
        builderhut: {
            name: 'Builder Hut', cat: 'economy', size: 1, maxLevel: 15, unlockLevel: 2,
            baseCost: { gold: 1500 }, baseHP: 400, tone: '#a0703c',
            desc: 'Each hut adds +10% gold production per level.',
            upgradeCost: (lv) => ({ gold: 1800 * Math.pow(1.5, lv - 1) }),
            provides: (lv) => ({ goldMult: 0.1 * lv }),
        },
        lab: {
            name: 'Laboratory', cat: 'economy', size: 1, maxLevel: 18, unlockLevel: 4,
            baseCost: { gold: 2500, elixir: 500 }, baseHP: 480, tone: '#4bb08e',
            desc: 'Research that boosts all XP gained by +15% per level.',
            upgradeCost: (lv) => ({ gold: 3000 * Math.pow(1.55, lv - 1), elixir: 600 * Math.pow(1.5, lv - 1) }),
            provides: (lv) => ({ xpMult: 0.15 * lv }),
        },
        cannon: {
            name: 'Cannon', cat: 'defense', size: 1, maxLevel: 22, unlockLevel: 1,
            baseCost: { gold: 450 }, baseHP: 450, tone: '#666a72',
            desc: 'Single-target artillery. The backbone of any early defense.',
            upgradeCost: (lv) => ({ gold: 550 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 5, dmg: 25 + lv * 14, cd: 1.2, splash: 0 }),
        },
        archer: {
            name: 'Archer Tower', cat: 'defense', size: 1, maxLevel: 22, unlockLevel: 3,
            baseCost: { gold: 1200 }, baseHP: 380, tone: '#8b6b3d',
            desc: 'Quick, long-ranged volleys that never stop.',
            upgradeCost: (lv) => ({ gold: 1400 * Math.pow(1.5, lv - 1), elixir: 200 * Math.pow(1.4, lv - 1) }),
            defense: (lv) => ({ range: 6, dmg: 12 + lv * 7, cd: 0.45, splash: 0 }),
        },
        mortar: {
            name: 'Mortar', cat: 'defense', size: 1, maxLevel: 20, unlockLevel: 4,
            baseCost: { gold: 2200, elixir: 400 }, baseHP: 420, tone: '#585b74',
            desc: 'Lobs heavy shells that burst on whole groups.',
            upgradeCost: (lv) => ({ gold: 2500 * Math.pow(1.55, lv - 1), elixir: 500 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 7, dmg: 60 + lv * 25, cd: 3.2, splash: 1.8 }),
        },
        airdef: {
            name: 'Air Defense', cat: 'defense', size: 1, maxLevel: 20, unlockLevel: 5,
            baseCost: { gold: 2800, elixir: 600 }, baseHP: 500, tone: '#6ea04a',
            desc: 'Slow rocket launcher with a huge punch.',
            upgradeCost: (lv) => ({ gold: 3000 * Math.pow(1.55, lv - 1), elixir: 650 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 5.5, dmg: 95 + lv * 40, cd: 2.4, splash: 0 }),
        },
        wizard: {
            name: 'Wizard Tower', cat: 'defense', size: 1, maxLevel: 20, unlockLevel: 6,
            baseCost: { gold: 3200, elixir: 900 }, baseHP: 420, tone: '#5c9de0',
            desc: 'Arcane bolts that splash across a crowd.',
            upgradeCost: (lv) => ({ gold: 3500 * Math.pow(1.6, lv - 1), elixir: 1100 * Math.pow(1.55, lv - 1) }),
            defense: (lv) => ({ range: 4.5, dmg: 40 + lv * 20, cd: 1.8, splash: 1.2 }),
        },
        frost: {
            name: 'Frost Spire', cat: 'defense', size: 1, maxLevel: 18, unlockLevel: 7,
            baseCost: { gold: 3800, elixir: 1200 }, baseHP: 460, tone: '#9fe3ff',
            desc: 'Freezes raiders in their tracks, slowing everything it hits.',
            upgradeCost: (lv) => ({ gold: 4000 * Math.pow(1.6, lv - 1), elixir: 1300 * Math.pow(1.55, lv - 1) }),
            defense: (lv) => ({ range: 5, dmg: 10 + lv * 6, cd: 0.9, splash: 0, slow: Math.min(0.65, 0.35 + lv * 0.02) }),
        },
        tesla: {
            name: 'Hidden Tesla', cat: 'defense', size: 1, maxLevel: 20, unlockLevel: 7,
            baseCost: { gold: 4200, elixir: 1400 }, baseHP: 600, tone: '#7aa6ff',
            desc: 'Crackling coil that fires very fast.',
            upgradeCost: (lv) => ({ gold: 4500 * Math.pow(1.6, lv - 1), elixir: 1500 * Math.pow(1.55, lv - 1) }),
            defense: (lv) => ({ range: 5, dmg: 28 + lv * 16, cd: 0.55, splash: 0 }),
        },
        xbow: {
            name: 'X-Bow', cat: 'defense', size: 1, maxLevel: 18, unlockLevel: 8,
            baseCost: { gold: 6000, elixir: 2000 }, baseHP: 520, tone: '#a67c4a',
            desc: 'A siege crossbow with enormous range.',
            upgradeCost: (lv) => ({ gold: 6500 * Math.pow(1.6, lv - 1), elixir: 2200 * Math.pow(1.55, lv - 1) }),
            defense: (lv) => ({ range: 9, dmg: 22 + lv * 12, cd: 0.35, splash: 0 }),
        },
        inferno: {
            name: 'Inferno Tower', cat: 'defense', size: 1, maxLevel: 18, unlockLevel: 9,
            baseCost: { gold: 8500, elixir: 3000, dark: 50 }, baseHP: 680, tone: '#ff6b35',
            desc: 'A beam of hellfire with the best damage in the kingdom.',
            upgradeCost: (lv) => ({ gold: 9000 * Math.pow(1.65, lv - 1), elixir: 3300 * Math.pow(1.6, lv - 1), dark: 60 * Math.pow(1.5, lv - 1) }),
            defense: (lv) => ({ range: 4.5, dmg: 55 + lv * 30, cd: 0.22, splash: 0 }),
        },
        clancastle: {
            name: 'Clan Castle', cat: 'defense', size: 2, maxLevel: 18, unlockLevel: 5, maxCount: 1,
            baseCost: { gold: 5500, elixir: 1200 }, baseHP: 1600, tone: '#8f95b2',
            desc: 'A fortress that defends itself and pays +1 gem per wave per level.',
            upgradeCost: (lv) => ({ gold: 6500 * Math.pow(1.6, lv - 1), elixir: 1500 * Math.pow(1.55, lv - 1) }),
            provides: (lv) => ({ waveGems: lv }),
            defense: (lv) => ({ range: 4, dmg: 30 + lv * 15, cd: 1.5, splash: 0.8 }),
        },
        armycamp: {
            name: 'Army Camp', cat: 'defense', size: 1, maxLevel: 15, unlockLevel: 3,
            baseCost: { gold: 1800, elixir: 300 }, baseHP: 420, tone: '#a58048',
            desc: 'Troops rest here. Each level adds 10% to what Rally heals.',
            upgradeCost: (lv) => ({ gold: 2000 * Math.pow(1.5, lv - 1), elixir: 400 * Math.pow(1.45, lv - 1) }),
            provides: (lv) => ({ rallyMult: 0.1 * lv }),
        },
        wall: {
            name: 'Wall', cat: 'defense', size: 1, maxLevel: 20, unlockLevel: 2,
            baseCost: { gold: 180 }, baseHP: 1800, tone: '#8a8a94', drag: true,
            desc: 'Stone rampart. Raiders must chew through it or walk around. Drag to build a line.',
            upgradeCost: (lv) => ({ gold: 220 * Math.pow(1.55, lv - 1) }),
        },
        // Decorations: no stats, but each adds a little production ("prosperity")
        oak: {
            name: 'Oak Tree', cat: 'decor', size: 1, maxLevel: 1, unlockLevel: 1, decor: true, drag: true,
            baseCost: { gold: 150 }, baseHP: 1, tone: '#4f8a34',
            desc: 'An old oak. A little shade is good for business.',
            provides: () => ({ prosperity: 0.004 }),
        },
        garden: {
            name: 'Flower Garden', cat: 'decor', size: 1, maxLevel: 1, unlockLevel: 3, decor: true, drag: true,
            baseCost: { gold: 400 }, baseHP: 1, tone: '#e87aa8',
            desc: 'Neat beds of flowers that cheer up the workers.',
            provides: () => ({ prosperity: 0.006 }),
        },
        fountain: {
            name: 'Fountain', cat: 'decor', size: 2, maxLevel: 1, unlockLevel: 5, decor: true,
            baseCost: { gold: 2500, elixir: 400 }, baseHP: 1, tone: '#6fc4e8',
            desc: 'A stone fountain in the village square.',
            provides: () => ({ prosperity: 0.02 }),
        },
        statue: {
            name: 'Hero Statue', cat: 'decor', size: 1, maxLevel: 1, unlockLevel: 8, decor: true,
            baseCost: { gold: 6000 }, baseHP: 1, tone: '#b9bcc8',
            desc: 'A monument to the first defenders of the realm.',
            provides: () => ({ prosperity: 0.025 }),
        },
    };

    const CATS = [
        { id: 'core',    label: 'Core' },
        { id: 'economy', label: 'Economy' },
        { id: 'defense', label: 'Defense' },
        { id: 'decor',   label: 'Decor' },
    ];

    // ---------- ENEMIES ----------
    // reach is how far (in tiles) it can hit from; walking speed is tiles/second.
    const ENEMY = {
        goblin:   { name: 'Goblin',   hp: 40,   dmg: 8,  spd: 1.4, gold: 18,  xp: 3,  size: 9,  prefers: 'economy' },
        wolf:     { name: 'Dire Wolf',hp: 55,   dmg: 12, spd: 2.2, gold: 24,  xp: 4,  size: 10, prefers: 'any' },
        orc:      { name: 'Orc',      hp: 110,  dmg: 16, spd: 1.1, gold: 40,  xp: 6,  size: 12, prefers: 'any' },
        skeleton: { name: 'Skeleton', hp: 80,   dmg: 14, spd: 1.2, gold: 34,  xp: 6,  size: 10, prefers: 'defense', reach: 3 },
        troll:    { name: 'Troll',    hp: 280,  dmg: 32, spd: 0.8, gold: 85,  xp: 12, size: 15, prefers: 'defense' },
        ogre:     { name: 'Ogre',     hp: 620,  dmg: 55, spd: 0.6, gold: 180, xp: 24, size: 18, prefers: 'defense' },
        golem:    { name: 'Stone Golem', hp: 4200, dmg: 90, spd: 0.45, gold: 900, xp: 120, size: 26, prefers: 'core', boss: true },
        bat:      { name: 'Bat',      hp: 30,   dmg: 6,  spd: 2.0, gold: 25,  xp: 5,  size: 8,  flying: true, prefers: 'economy' },
        dragon:   { name: 'Dragon',   hp: 200,  dmg: 28, spd: 1.2, gold: 100, xp: 15, size: 16, flying: true, prefers: 'any' },
    };

    // What can show up on a given wave, with weights.
    const waveTable = (n) => {
        const t = [{ kind: 'goblin', w: Math.max(2, 10 - n * 0.6) }];
        if (n >= 3)  t.push({ kind: 'wolf', w: 3 });
        if (n >= 3)  t.push({ kind: 'orc', w: Math.min(8, 2 + n * 0.5) });
        if (n >= 5)  t.push({ kind: 'skeleton', w: 3 });
        if (n >= 6)  t.push({ kind: 'bat', w: 3 });
        if (n >= 8)  t.push({ kind: 'troll', w: Math.min(6, 1 + n * 0.3) });
        if (n >= 12) t.push({ kind: 'dragon', w: 2.5 });
        if (n >= 14) t.push({ kind: 'ogre', w: Math.min(5, n * 0.2) });
        return t;
    };

    // ---------- ASCENSION PERKS ----------
    const PERKS = {
        treasury: { name: 'Royal Treasury', desc: '+10% gold, elixir and dark production per rank', max: 20, ico: 'coin' },
        steel:    { name: 'Forged Steel',   desc: '+8% tower damage per rank',                      max: 20, ico: 'sword' },
        study:    { name: 'Quick Study',    desc: '+10% XP per rank',                               max: 10, ico: 'star' },
        headstart:{ name: 'Head Start',     desc: 'Begin each reign with +500 gold per rank',       max: 10, ico: 'flag' },
    };
    const perkCost = (rank) => rank + 1;

    // ---------- QUESTS ----------
    // stat: key in game.stats; each quest tracks the stat from the moment it was given.
    const QUEST_KINDS = [
        { id: 'kills',    stat: 'kills',      text: (n) => `Defeat ${n} raiders`,          base: 12, per: 4,  min: 10 },
        { id: 'clicks',   stat: 'clicks',     text: (n) => `Collect from buildings ${n} times`, base: 20, per: 3, min: 15 },
        { id: 'built',    stat: 'built',      text: (n) => `Build ${n} structures`,        base: 3,  per: 0.5, min: 3 },
        { id: 'upgrades', stat: 'upgrades',   text: (n) => `Upgrade buildings ${n} times`, base: 4,  per: 1,  min: 4 },
        { id: 'waves',    stat: 'wavesCleared', text: (n) => `Clear ${n} waves`,           base: 2,  per: 0.4, min: 2 },
        { id: 'gold',     stat: 'goldEarned', text: (n) => `Earn ${n} gold`,               base: 2000, per: 900, min: 1500, big: true },
        { id: 'goblins',  stat: 'goblins',    text: (n) => `Catch ${n} Treasure Goblin${n > 1 ? 's' : ''}`, base: 1, per: 0.1, min: 1 },
    ];

    // ---------- ACHIEVEMENTS ----------
    const ACHS = [
        { id: 'first_build',  name: 'Groundbreaking',    desc: 'Place your first building',      check: (g) => g.stats.built >= 1 },
        { id: 'ten_builds',   name: 'Master Architect',  desc: 'Build 10 structures',            check: (g) => g.stats.built >= 10 },
        { id: 'twenty_builds',name: 'Urban Planner',     desc: 'Build 20 structures',            check: (g) => g.stats.built >= 20 },
        { id: 'first_kill',   name: 'First Blood',       desc: 'Defeat your first raider',       check: (g) => g.stats.kills >= 1 },
        { id: 'slayer',       name: 'Goblin Slayer',     desc: 'Defeat 50 raiders',              check: (g) => g.stats.kills >= 50 },
        { id: 'warlord',      name: 'Warlord',           desc: 'Defeat 200 raiders',             check: (g) => g.stats.kills >= 200 },
        { id: 'wave_5',       name: 'Wave Rider',        desc: 'Survive wave 5',                 check: (g) => g.wave.number > 5 },
        { id: 'wave_10',      name: 'Unbreakable',       desc: 'Survive wave 10',                check: (g) => g.wave.number > 10 },
        { id: 'wave_20',      name: 'Iron Bastion',      desc: 'Survive wave 20',                check: (g) => g.wave.number > 20 },
        { id: 'level_5',      name: 'Rising Chief',      desc: 'Reach level 5',                  check: (g) => g.player.level >= 5 },
        { id: 'level_10',     name: 'Veteran Lord',      desc: 'Reach level 10',                 check: (g) => g.player.level >= 10 },
        { id: 'gold_rich',    name: 'Gilded',            desc: 'Amass 100,000 gold',             check: (g) => g.res.gold >= 100000 },
        { id: 'darkelixir',   name: 'Touched by Shadow', desc: 'Collect your first dark elixir', check: (g) => g.res.dark >= 1 },
        { id: 'combo_10',     name: 'Click Frenzy',      desc: 'Reach a 10x click combo',        check: (g) => g.stats.maxCombo >= 10 },
        { id: 'spellcaster',  name: 'Lightning Mage',    desc: 'Cast your first spell',          check: (g) => g.stats.spells >= 1 },
        { id: 'goblin_1',     name: 'Sticky Fingers',    desc: 'Catch a Treasure Goblin',        check: (g) => g.stats.goblins >= 1 },
        { id: 'boss_1',       name: 'Giant Killer',      desc: 'Topple a Stone Golem',           check: (g) => g.stats.bosses >= 1 },
        { id: 'ascend_1',     name: 'Reborn',            desc: 'Ascend for the first time',      check: (g) => g.ascensions >= 1 },
        { id: 'beauty',       name: 'Garden Kingdom',    desc: 'Place 8 decorations',            check: (g) => g.decorCount() >= 8 },
    ];

    // ---------- SMALL HELPERS (shared by every file) ----------
    const rand = (a, b) => a + Math.random() * (b - a);
    const randi = (a, b) => Math.floor(rand(a, b));
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    const NOTATIONS = ['short', 'full', 'sci'];
    const state = { notation: 'short' };
    const fmt = (n) => {
        if (!Number.isFinite(n)) return '0';
        if (n < 0) return '-' + fmt(-n);
        if (n < 1000) return Math.floor(n).toString();
        if (state.notation === 'full') return Math.floor(n).toLocaleString('en-US');
        if (state.notation === 'sci') return n.toExponential(2).replace('e+', 'e');
        let tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
        let v = n / Math.pow(1000, tier);
        if (v >= 999.95 && tier < SUFFIXES.length - 1) { tier++; v /= 1000; }
        return v.toFixed(v < 10 ? 2 : 1) + SUFFIXES[tier];
    };
    const fmtRate = (n, digits = 1) => (n < 1000 ? n.toFixed(digits) : fmt(n));
    const safeNum = (v, fallback, lo = 0, hi = Infinity) => (Number.isFinite(v) ? clamp(v, lo, hi) : fallback);
    const cleanStr = (v, max, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback);
    const cleanInt = (v, fallback, lo, hi) => Math.floor(safeNum(Number(v), fallback, lo, hi));
    const compact = (arr, keep) => {
        let w = 0;
        for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[w++] = arr[i];
        arr.length = w;
        return arr;
    };
    const alive = (p) => p.life > 0;
    const fmtDuration = (sec) => {
        const m = Math.round(sec / 60);
        if (m < 1) return `${Math.round(sec)}s`;
        if (m < 60) return `${m}m`;
        return `${Math.floor(m / 60)}h ${m % 60}m`;
    };
    const fmtTime = (sec) => {
        sec = Math.max(0, Math.ceil(sec));
        return Math.floor(sec / 60) + ':' + (sec % 60).toString().padStart(2, '0');
    };
    const hexToRgb = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
    const mixColor = (c1, c2, t) => {
        const a = hexToRgb(c1), b = hexToRgb(c2);
        return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    };
    // Scale brightness: f < 1 darkens, f > 1 lightens (toward white)
    const shade = (c, f) => (f <= 1 ? mixColor(c, '#000000', 1 - f) : mixColor(c, '#ffffff', f - 1));
    const resSymbol = (k) => ({ gold: 'Gold', elixir: 'Elixir', dark: 'Dark', gems: 'Gems' })[k] || k;
    const resColor = (k) => ({ gold: '#ffc857', elixir: '#e3a8ff', dark: '#a06bff', gems: '#5cd8ff' })[k] || '#fff';

    // Visual tier of a building (1-4), used by the sprite painters
    const tierOf = (type, level) => {
        const max = BLD[type].maxLevel;
        if (max <= 1) return 1;
        return clamp(1 + Math.floor(((level - 1) / max) * 4), 1, 4);
    };

    K.data = {
        CFG, VIEWS, BLD, CATS, ENEMY, waveTable, PERKS, perkCost, QUEST_KINDS, ACHS,
        NOTATIONS, state,
    };
    K.util = {
        rand, randi, clamp, fmt, fmtRate, safeNum, cleanStr, cleanInt, compact, alive,
        fmtDuration, fmtTime, hexToRgb, rgbToHex, mixColor, shade, resSymbol, resColor, tierOf,
    };
})(window.KOE = window.KOE || {});
