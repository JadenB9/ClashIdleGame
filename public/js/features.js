/* ============================================================
   Features mixed into Game.prototype: the first-run goals, one-time
   tips, wave boons, the Freeze spell, weather, birds, and the
   damage / max-level effects drawn on buildings.
   ============================================================ */
(function (K) {
    'use strict';
    const { CFG, BLD, BOONS, ENEMY } = K.data;
    const U = K.util;
    const { rand, randi, fmt } = U;
    const A = K.art;
    const TAU = Math.PI * 2;

    class Features {
        // ---------- first-run goals ----------
        // One goal at a time, each completes by itself when the player does the thing.
        tutSteps() {
            return [
                { id: 'tap', title: 'Tap a coin bubble', sub: 'Mines and wells fill a bubble every few seconds. Tap it for a bonus.', done: () => this.stats.clicks >= 1, target: () => ({ b: this.tutBuilding('goldmine', true) }) },
                { id: 'upgrade', title: 'Upgrade a building', sub: 'Tap the Gold Mine, then press the green Upgrade button.', done: () => this.stats.upgrades >= 1, target: () => ({ b: this.tutBuilding('goldmine'), sel: 'upgrade' }) },
                { id: 'build', title: 'Build a Cannon', sub: 'Open Build, then tap Cannon (it opens on Defense) and tap the grass.', done: () => this.stats.built >= 1, target: () => ({ dock: 'build' }) },
                { id: 'raid', title: 'Survive the first raid', sub: 'Towers fire on their own. Raiders arrive when the timer runs out.', done: () => this.stats.wavesCleared >= 1, target: () => ({}) },
                { id: 'boon', title: 'Pick a reward', sub: 'After each raid you choose one of three boons. They last the whole reign.', done: () => this.stats.boons >= 1, target: () => ({}) },
                { id: 'tab', title: 'Open the Upgrade tab', sub: 'It lists every upgrade and has a one-tap "upgrade all you can".', done: () => !!this.opened.upgrade, target: () => ({ dock: 'upgrade' }) },
                { id: 'quests', title: 'Check your quests', sub: 'Open Kingdom. Quests pay gems, and gems power Boost and Lightning.', done: () => !!this.opened.kingdom, target: () => ({ dock: 'kingdom' }) },
                { id: 'goal', title: `Aim for wave ${CFG.ascendMinWave}`, sub: 'Then Ascend (Kingdom tab) to restart with permanent crowns and perks.', done: () => this.wave.number >= CFG.ascendMinWave, manual: true, target: () => ({}) },
            ];
        }
        tutBuilding(type, preferReady) {
            const list = this.buildings.filter(b => b.type === type);
            if (!list.length) return this.buildings.find(b => BLD[b.type].clickBonus) || null;
            if (preferReady) return list.find(b => this.bubbleReady(b)) || list[0];
            return list[0];
        }
        tutCurrent() {
            if (this.tut.done) return null;
            return this.tutSteps()[this.tut.step] || null;
        }
        tutTarget() {
            const s = this.tutCurrent();
            return s ? (s.target() || {}) : {};
        }
        // Goals complete themselves. If several are already true (a player who did things in a
        // different order) they all tick off at once. Veterans never see the card.
        tutCheck() {
            if (!this.tutCurrent() || this.gameOverShown) return;
            if (this.player.level >= 8 || this.wave.number >= 6) { this.tut.done = true; this.updateUI(); return; }
            const steps = this.tutSteps();
            let n = 0;
            while (this.tut.step < steps.length && !steps[this.tut.step].manual && steps[this.tut.step].done() && n < steps.length) { this.tut.step++; n++; }
            if (n) {
                this.res.gems += n;
                this.audio.levelup();
                this.toast(n > 1 ? `${n} goals complete! +${n} gems` : 'Goal complete! +1 gem', 'success');
                const cur = this.tutCurrent();
                if (cur && cur.id === 'build') {                    // make sure the Cannon is actually affordable
                    const need = this.buildCost('cannon').gold;
                    if (this.res.gold < need) { this.addRes('gold', need - this.res.gold + 60); setTimeout(() => this.toast('Here is some gold so you can afford a Cannon', 'success'), 900); }
                }
                if (this.tut.step >= steps.length) this.tut.done = true;
                this.updateUI();
            }
        }
        // The "Got it" button on the last, informational goal
        tutAdvance() {
            this.res.gems += 1;
            this.audio.levelup();
            this.tut.step++;
            if (this.tut.step >= this.tutSteps().length) { this.tut.done = true; this.toast('Tutorial finished. Have fun!', 'success'); }
            this.updateUI();
        }
        tutSkip() { this.tut.done = true; this.updateUI(); this.save(); }

        // ---------- one-time tips ----------
        // At most one tip every 40 seconds of play, so they never pile up
        tip(id, msg) {
            if (this.tipsSeen[id]) return;
            if (this.stats.playTime - (this._tipAt ?? -999) < 40) return;
            this._tipAt = this.stats.playTime;
            this.tipsSeen[id] = true;
            this.toast(msg, 'tip');
        }
        tipCheck() {
            if (this.gameOverShown || this.modalBlocking) return;
            if (this.res.gold >= this.cap() * 0.97 && this.rates.gold > 0) this.tip('full', 'Storage is full! Upgrade the Town Hall or build a Vault to hold more.');
            if (this.isNight() && this.stats.playTime > 20) this.tip('night', 'It is night: everything produces 25% more until dawn.');
            if (this.wave.number >= 2 && !this.wave.active && this.buildings.filter(b => BLD[b.type].defense).length < 3) this.tip('defense', 'Raids grow every wave. Build more towers in the Build tab.');
            if (this.enemies.some(e => e.flying) && !this.buildings.some(b => ['airdef', 'archer', 'wizard', 'tesla', 'xbow', 'frost', 'inferno', 'clancastle'].includes(b.type))) this.tip('air', 'Flying raiders! Cannons and mortars cannot hit them. Build an Archer Tower or Air Defense.');
            if (this.enemies.some(e => e.boss)) this.tip('boss', 'A Stone Golem! It is slow but huge. Focus fire and use Lightning or War Cry.');
            if (!this.wave.active && this.buildings.some(b => !BLD[b.type].decor && b.hp < b.maxHp * 0.4)) this.tip('hurt', 'Buildings are damaged. Press Rally (R) to repair everything.');
            if (this.res.gems >= 8 && this.stats.spells === 0 && this.boost.timeLeft <= 0) this.tip('gems', 'You have gems! Boost doubles income for a minute. Lightning and Freeze stop raiders.');
        }

        // ---------- wave boons ----------
        // A reward is owed after every cleared wave until it is picked (it also survives a reload)
        offerPendingBoon() {
            if (!this.pendingBoon || this.boonOpen || this.gameOverShown) return;
            if (document.hidden || this.wave.active) return;       // shown when the player is back and calm
            this.offerBoons();
        }
        offerBoons() {
            const pool = BOONS.filter(b => b.instant || this.boon(b.id) < b.max);
            const picks = [];
            const bag = pool.slice();
            while (picks.length < 3 && bag.length) {
                const total = bag.reduce((s, b) => s + (b.instant ? 1.2 : 3), 0);
                let r = Math.random() * total, idx = 0;
                for (let i = 0; i < bag.length; i++) { r -= bag[i].instant ? 1.2 : 3; if (r <= 0) { idx = i; break; } }
                picks.push(bag.splice(idx, 1)[0]);
            }
            if (!picks.length) return;
            this.showBoons(picks);
        }
        pickBoon(id) {
            const b = BOONS.find(x => x.id === id);
            if (!b) return;
            this.stats.boons++;
            this.pendingBoon = false;
            if (b.instant) {
                if (id === 'chest') {
                    const gold = Math.max(500 * Math.max(1, this.wave.number), Math.floor(this.rates.gold * 90));
                    const got = this.addRes('gold', gold); this.stats.goldEarned += got;
                    this.toast(`Treasure Chest: +${fmt(got)} gold`, 'success');
                } else if (id === 'medic') {
                    for (const x of this.buildings) x.hp = x.maxHp;
                    this.toast('Every building is repaired', 'success');
                } else if (id === 'gems') {
                    this.res.gems += 3; this.toast('+3 gems', 'success');
                }
            } else {
                this.boons[id] = this.boon(id) + 1;
                if (id === 'masonry') this.refreshMaxHp();
                this.recomputeRates();
                this.toast(`${b.name} ${this.boons[id] > 1 ? 'x' + this.boons[id] : ''}: ${b.desc}`, 'success');
            }
            this.audio.upgrade();
            this.checkAchievements(); this.updateUI(); this.save();
        }

        // ---------- raid directions ----------
        // Each wave comes from one to three sides of the island, shown ahead of time.
        // Edge 0 is the top-right edge of the map, then clockwise.
        pickSides(n) {
            const count = n % 10 === 0 ? 2 : n < 6 ? 1 : n < 15 ? 2 : 3;
            const all = [0, 1, 2, 3];
            for (let i = all.length - 1; i > 0; i--) { const j = randi(0, i + 1); [all[i], all[j]] = [all[j], all[i]]; }
            return all.slice(0, count);
        }
        sideNames(sides) { return (sides || []).map(s => ['NE', 'SE', 'SW', 'NW'][s]).join('+'); }
        // Red markers: on the map near the edge, or pinned to the screen border when that edge is out of view
        drawRaidSides(g) {
            const show = this.wave.active || this.wave.timer < 25 || this.settings.raidStart === 'manual';
            const sides = this.wave.active ? this.wave.sides : this.wave.nextSides;
            if (!show || !sides || !sides.length || this.gameOverShown) return;
            const gw = CFG.gridW, gh = CFG.gridH, t = this.tnow;
            const spots = [[gw / 2, -1.4], [gw + 1.4, gh / 2], [gw / 2, gh + 1.4], [-1.4, gh / 2]];
            const c = this.worldIso(gw / 2, gh / 2);
            const cs = { x: this.cam.x + c.x * this.cam.zoom, y: this.cam.y + c.y * this.cam.zoom };
            const m = 46, top = this.vw < 900 ? 250 : 108, bot = this.vh - 100;
            for (const s of sides) {
                const w = this.worldIso(spots[s][0], spots[s][1]);
                let x = this.cam.x + w.x * this.cam.zoom, y = this.cam.y + w.y * this.cam.zoom;
                const off = x < m || x > this.vw - m || y < top || y > bot;
                const ux = x, uy = y;
                x = Math.max(m, Math.min(this.vw - 86, x)); y = Math.max(top, Math.min(bot, y));
                // arrow points at the marker when it is off-screen, otherwise inward toward the village
                let dx = off ? ux - x : cs.x - x, dy = off ? uy - y : cs.y - y;
                const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
                const pulse = 0.5 + 0.5 * Math.sin(t * 6);
                g.save(); g.translate(x, y);
                g.fillStyle = `rgba(255,70,60,${0.25 + pulse * 0.2})`; g.beginPath(); g.arc(0, 0, 26 + pulse * 5, 0, TAU); g.fill();
                g.fillStyle = '#c8302a'; g.strokeStyle = '#ffe0d8'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.fill(); g.stroke();
                g.rotate(Math.atan2(dy, dx));
                g.fillStyle = '#fff'; g.strokeStyle = '#4a0808'; g.lineWidth = 1.6;
                g.beginPath(); g.moveTo(9, 0); g.lineTo(-2, -9); g.lineTo(-2, -3.6); g.lineTo(-9, -3.6); g.lineTo(-9, 3.6); g.lineTo(-2, 3.6); g.lineTo(-2, 9); g.closePath(); g.fill(); g.stroke();
                g.restore();
            }
        }

        // ---------- freeze ----------
        castFreeze() {
            if (!this.enemies.length) { this.toast('No raiders to freeze right now', 'warn'); this.audio.error(); return; }
            if (this.res.gems < CFG.freezeCost) { this.audio.error(); this.toast(`Freeze costs ${CFG.freezeCost} gems`, 'warn'); return; }
            this.res.gems -= CFG.freezeCost;
            this.stats.freezes++;
            for (const e of this.enemies) {
                e.slow = 4; e.slowAmt = 0.92;
                for (let i = 0; i < 6; i++) this.particles.push({ x: e.x + rand(-8, 8), y: e.y - e.size * rand(0.5, 2.2), vx: rand(-40, 40), vy: rand(-60, 10), life: 0.7, max: 0.7, color: '#d8f6ff', size: rand(2, 4), kind: 'shard' });
            }
            this.flash = 0.35; this.flashTint = '190,240,255';
            this.audio.spell();
            this.toast(`Froze ${this.enemies.length} raider${this.enemies.length > 1 ? 's' : ''} for 4 seconds`, 'success');
            this.updateUI(); this.checkAchievements();
        }

        // ---------- weather ----------
        updateWeather(dt) {
            const w = this.weather;
            w.timer -= dt;
            if (w.timer <= 0) {
                if (w.target === 0) { w.target = 1; w.timer = rand(55, 95); this.tip('rain', 'It is raining. Nothing changes except the mood.'); }
                else { w.target = 0; w.timer = rand(220, 420); }
            }
            w.rain += Math.sign(w.target - w.rain) * Math.min(Math.abs(w.target - w.rain), dt * 0.25);
            if (w.rain > 0.3 && Math.random() < dt * 24 * w.rain && this.particles.length < 380) {
                // splashes on the ground inside the visible area
                const x = (-this.cam.x + Math.random() * this.vw) / this.cam.zoom, y = (-this.cam.y + Math.random() * this.vh) / this.cam.zoom;
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: 'rgba(220,235,255,0.7)', size: 7, kind: 'ring' });
            }
        }
        drawWeather(g) {
            const r = this.weather.rain;
            if (r <= 0.01) return;
            const t = this.tnow, W = this.vw, H = this.vh;
            g.save();
            g.fillStyle = `rgba(24,34,56,${0.2 * r})`; g.fillRect(0, 0, W, H);
            g.strokeStyle = `rgba(205,222,255,${0.38 * r})`; g.lineWidth = 1.2; g.lineCap = 'round';
            const n = Math.floor(140 * r);
            g.beginPath();
            for (let i = 0; i < n; i++) {
                const sp = 620 + (i * 37) % 260;
                const x = ((i * 127.1 + t * 90) % (W + 80)) - 40;
                const y = ((i * 311.7 + t * sp) % (H + 60)) - 30;
                g.moveTo(x, y); g.lineTo(x - 5, y + 16);
            }
            g.stroke();
            g.restore();
        }

        // ---------- birds ----------
        drawBirds(g, t, night) {
            if (night > 0.2 || this.weather.rain > 0.2) return;
            const cycle = 90, dur = 26, ph = t % cycle;
            if (ph > dur) return;
            const p = ph / dur;
            const c = this.worldIso(CFG.gridW / 2, CFG.gridH / 2);
            for (let i = 0; i < 5; i++) {
                const x = c.x - 1000 + p * 2000 + i * 46 + (i % 2) * 22;
                const y = c.y - 420 + p * -80 + Math.sin(i * 2.1 + p * 6) * 22 + i * 14;
                const flap = Math.sin(t * 9 + i * 1.3);
                g.fillStyle = 'rgba(10,20,10,0.16)';
                g.beginPath(); g.ellipse(x + 20, y + 330, 7, 2.4, 0, 0, TAU); g.fill();
                g.strokeStyle = '#2a2a34'; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round';
                g.beginPath(); g.moveTo(x - 8, y + flap * 3); g.quadraticCurveTo(x - 3, y - 4 - flap * 2, x, y); g.quadraticCurveTo(x + 3, y - 4 - flap * 2, x + 8, y + flap * 3); g.stroke();
            }
        }

        // ---------- extra life on buildings ----------
        // Smoke and then flames on hurt buildings; a slow golden shine on maxed ones.
        drawBuildingFx(g, b, sp, c, t) {
            const def = BLD[b.type];
            if (def.decor) return;
            const f = b.hp / b.maxHp;
            const top = c.y + sp.bbox.y0 + 14, cx = c.x + (sp.bbox.x0 + sp.bbox.x1) / 2 * 0.4;
            const seed = b.tx * 5 + b.ty * 3;
            if (f < 0.5) {
                const n = f < 0.25 ? 4 : 2;
                for (let i = 0; i < n; i++) {
                    const k = ((t * 0.5 + i / n + seed * 0.07) % 1);
                    const a = (1 - k) * 0.55;
                    g.fillStyle = `rgba(70,66,74,${a})`;
                    g.beginPath(); g.arc(cx + (i - n / 2) * 6 + Math.sin(t + i) * 2 + k * 8, top - k * 34, 3 + k * 7, 0, TAU); g.fill();
                }
            }
            if (f < 0.25) {
                A.flame(g, cx - 6, top + 12, 0.9, t, seed);
                A.flame(g, cx + 8, top + 18, 0.7, t, seed + 2);
            }
            if (def.maxLevel > 1 && b.level >= def.maxLevel) {
                const ph = ((t + seed * 0.37) % 7) / 0.7;       // a quick sweep every seven seconds
                if (ph < 1) {
                    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(ph * Math.PI) * 0.45;
                    A.drawGlow(g, sp, c.x, c.y, '#fff1b0', 0.6); g.restore();
                }
            }
        }
    }

    K.Features = Features;
})(window.KOE = window.KOE || {});
