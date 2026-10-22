/* ============================================================
   UI: side panels, the selection card, toasts, dialogs and the
   HUD. Mixed into Game.prototype (see boot.js).

   Content-Security-Policy note: inline style="" attributes are
   blocked, so anything dynamic (bar widths, the cooldown sweep)
   is set through the CSSOM after the markup goes in.
   ============================================================ */
(function (K) {
    'use strict';
    const { CFG, VIEWS, BLD, CATS, ENEMY, PERKS, perkCost, QUEST_KINDS, ACHS, NOTATIONS, DIFFICULTY, BOONS, thForLevel } = K.data;
    const U = K.util;
    const { fmt, fmtRate, fmtTime, fmtDuration, tierOf } = U;
    const A = K.art;

    const $ = (id) => document.getElementById(id);
    const ico = (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
    const RES_ICON = { gold: 'coin', elixir: 'elixir', dark: 'dark', gems: 'gem' };
    const PANEL_TITLES = { build: 'Build', upgrade: 'Upgrades', kingdom: 'Kingdom', coop: 'Co-op', menu: 'Menu' };
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    // These lists refresh several times a second; only touch the DOM when the markup changed
    const setHtml = (el, html) => { if (el && el._html !== html) { el._html = html; el.innerHTML = html; return true; } return false; };
    const setText = (el, s) => { if (el && el._t !== s) { el._t = s; el.textContent = s; } };
    // widths set through the CSSOM (CSP forbids style attributes)
    const fixBars = (root) => { root.querySelectorAll('[data-w]').forEach((e) => { e.style.width = e.dataset.w + '%'; }); };

    class UI {
        // ---------- setup ----------
        cacheEls() {
            this.el = {
                gold: $('val-gold'), elixir: $('val-elixir'), dark: $('val-dark'), gems: $('val-gems'),
                rateGold: $('rate-gold'), rateElixir: $('rate-elixir'), rateDark: $('rate-dark'),
                fillGold: $('fill-gold'), fillElixir: $('fill-elixir'), fillDark: $('fill-dark'),
                level: $('playerLevel'), xp: $('playerXp'), ring: $('xpRing'), xpFill: $('xpFill'),
                waveTimer: $('waveTimer'), waveInfo: $('waveInfo'), wavePreview: $('wavePreview'),
                dayTime: $('dayTime'), dayCount: $('dayCount'), dayPanel: $('dayPanel'),
                zoom: $('zoomVal'), combo: $('comboLabel'),
                warCry: $('actWarCry'), warCryLabel: $('warCryLabel'), warCryCd: $('warCryCd'), cancel: $('actCancel'),
                boost: $('actBoost'), boostLabel: $('boostLabel'), spell: $('actSpell'),
                modal: $('modal'), modalBody: $('modalBody'),
                coopStatus: $('coopStatus'), themeBtn: $('btnTheme'),
                sel: $('selCard'), drawer: $('drawer'), app: $('app'),
                dotUp: $('dotUpgrade'), dotKing: $('dotKingdom'),
                alert: $('alertPanel'), veil: $('pauseVeil'), speedTag: $('speedTag'),
                goal: $('goalCard'), hint: $('modeHint'), collect: $('actCollect'), collectDot: $('collectDot'), freeze: $('actFreeze'),
                repair: $('actRepair'), repairDot: $('repairDot'), groupBar: $('groupBar'),
            };
            this.panel = null;
            this.buildCat = 'economy';
        }

        // ---------- theme (shared with the rest of j4den.com) ----------
        initTheme() {
            const btn = this.el.themeBtn;
            if (btn) btn.addEventListener('click', () => { this.audio.click(); this.setTheme(this.isLight() ? 'dark' : 'light'); });
            document.querySelectorAll('#themeSeg .seg-btn').forEach(b => {
                b.addEventListener('click', () => { this.audio.click(); this.setTheme(b.dataset.themeOpt); });
            });
            const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
            if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (!this.savedTheme()) this.applyTheme(); });
            window.addEventListener('storage', (e) => { if (e.key === 'theme') this.applyTheme(); });
            this.applyTheme();
        }
        savedTheme() {
            try { const t = localStorage.getItem('theme'); return (t === 'light' || t === 'dark') ? t : null; } catch (e) { return null; }
        }
        isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
        setTheme(mode) {
            const explicit = (mode === 'light' || mode === 'dark') ? mode : null;
            try { if (explicit) localStorage.setItem('theme', explicit); else localStorage.removeItem('theme'); } catch (e) { /* private window */ }
            this._themeOverride = explicit;
            this.applyTheme();
        }
        applyTheme() {
            const saved = this.savedTheme() || this._themeOverride || null;
            const light = saved === 'light' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
            const root = document.documentElement;
            if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
            const btn = this.el.themeBtn;
            if (btn) { btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode'); btn.title = (light ? 'Dark mode' : 'Light mode') + ' (T)'; }
            document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = light ? '#ece2cc' : '#141b2e'; });
            const pick = saved || 'system';
            document.querySelectorAll('#themeSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeOpt === pick)));
            if (this.coop && this.coop.partnerState) this.renderPartnerMinimap(this.coop.partnerState);
        }

        // ---------- wiring ----------
        bindUI() {
            const click = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', () => { this.audio.click(); fn(); }); };
            document.querySelectorAll('.dock-btn').forEach(b => b.addEventListener('click', () => { this.audio.click(); this.openPanel(b.dataset.tab, true); }));
            click('drawerClose', () => this.closePanel());
            click('playerBadge', () => this.openPanel('kingdom', true));

            click('actCollect', () => this.collectAll());
            click('actAutoCollect', () => this.toggleAutoCollect());
            click('actRally', () => this.rally());
            click('actBoost', () => this.activateBoost());
            click('actSpell', () => this.beginSpell());
            click('actFreeze', () => this.castFreeze());
            click('actRepair', () => this.openRepair());
            click('btnRest', () => this.toggleRest());
            click('btnSelect', () => this.toggleSelect());
            click('grpShape', () => { this.selectShape = this.selectShape === 'box' ? 'line' : 'box'; this.updateGroupBar(); });
            click('grpAdd', () => { this.selectAdd = !this.selectAdd; this.updateGroupBar(); });
            click('grpMove', () => this.startGroupMove());
            click('grpDelete', () => this.deleteSelection());
            click('grpDone', () => this.cancelModes());
            click('btnMenu', () => { this.audio.click(); this.openPanel('menu', true); });
            this.buildMenuHelp();
            const home = $('homeLink'); if (home && /(^|\.)j4den\.com$/.test(location.hostname)) home.hidden = false;
            document.querySelectorAll('#diffSeg .seg-btn').forEach(b => b.addEventListener('click', () => { this.audio.click(); this.settings.difficulty = b.dataset.diff; this.reignCrowns = Math.min(this.reignCrowns, DIFFICULTY[b.dataset.diff].crowns); this.syncSettingsUI(); this.save(); this.toast(`Difficulty: ${DIFFICULTY[b.dataset.diff].label}. ${DIFFICULTY[b.dataset.diff].desc}`, 'success'); }));
            this.el.goal.addEventListener('click', (e) => { const a = e.target.closest('[data-goal]'); if (!a) return; this.audio.click(); if (a.dataset.goal === 'skip') this.tutSkip(); else this.tutAdvance(); });
            click('actWarCry', () => this.activateWarCry());
            click('actCancel', () => this.cancelModes());
            click('btnSpeed', () => this.cycleSpeed());
            click('btnStartRaid', () => this.callRaid());
            click('zoomIn', () => this.zoomBy(1.2, this.vw / 2, this.vh / 2));
            click('zoomOut', () => this.zoomBy(1 / 1.2, this.vw / 2, this.vh / 2));
            click('zoomReset', () => { this.cam.zoom = this.homeZoom(); this.centerCamera(); });

            // settings
            click('btnSound', () => this.toggleSound());
            click('btnShortcuts', () => this.showShortcuts());
            click('btnXray', () => { this.settings.xray = !this.settings.xray; this.syncSettingsUI(); this.save(); });
            click('btnHints', () => { this.settings.hints = !this.settings.hints; this.syncSettingsUI(); this.save(); });
            document.querySelectorAll('#notationSeg .seg-btn').forEach(b => b.addEventListener('click', () => { this.audio.click(); this.setNotation(b.dataset.notation); }));
            document.querySelectorAll('#viewSeg .seg-btn').forEach(b => b.addEventListener('click', () => { this.audio.click(); this.changeView(b.dataset.view); }));
            document.querySelectorAll('#tagsSeg .seg-btn').forEach(b => b.addEventListener('click', () => { this.audio.click(); this.settings.levelTags = b.dataset.tags; this.syncSettingsUI(); this.save(); }));
            document.querySelectorAll('#autoUpSeg .seg-btn').forEach(b => b.addEventListener('click', () => { this.audio.click(); this.settings.autoUpgrade = b.dataset.autoup; this.syncSettingsUI(); this.save(); this.toast(b.dataset.autoup === 'off' ? 'Auto-upgrade off' : `Auto-upgrade: ${b.textContent}`, 'success'); }));
            click('btnUpCheap', () => this.upgradeCheapest());
            click('btnUpAll', () => this.upgradeAll());
            click('btnUpWeak', () => this.upgradeWeakest());

            click('btnSave', () => { this.save(); this.toast('Game saved', 'success'); });
            click('btnExport', () => this.exportSave());
            const importInput = $('importFile');
            click('btnImport', () => importInput.click());
            importInput.addEventListener('change', () => { this.importSave(importInput.files[0]); importInput.value = ''; });
            click('btnReset', () => this.confirmReset());

            $('modalClose').addEventListener('click', () => this.closeModal());
            $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.closeModal(); });

            // delegated clicks inside the generated panels
            $('upgradeList').addEventListener('click', (e) => {
                const grp = e.target.closest('[data-upg]');
                if (grp) { const [type, lv] = grp.dataset.upg.split('|'); this.upgradeGroup(type, +lv); return; }
                const btn = e.target.closest('[data-up]'), row = e.target.closest('[data-focus]');
                if (btn) { const b = this.buildings.find(x => x.id === btn.dataset.up); if (b) this.upgradeBuilding(b); return; }
                if (row) { const b = this.buildings.find(x => x.id === row.dataset.focus); if (b) this.focusBuilding(b); }
            });
            $('questList').addEventListener('click', (e) => { const b = e.target.closest('[data-claim]'); if (b) this.claimQuest(+b.dataset.claim); });
            $('ascendBox').addEventListener('click', (e) => {
                const p = e.target.closest('[data-perk]'); if (p) { this.buyPerk(p.dataset.perk); return; }
                if (e.target.closest('[data-ascend]')) this.confirmAscend();
            });
            this.el.sel.addEventListener('click', (e) => this.onSelClick(e));
            $('catSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { this.audio.click(); this.buildCat = b.dataset.cat; this.buildMenu(true); } });

            // keep the map sized to whatever room the panel leaves it
            if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe($('gameArea'));

            // auto-pause when the tab is hidden; production still pays out on return
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this._wasPausedBeforeHide = this.paused; this._hiddenAt = Date.now(); this.paused = true; this.save();
                } else {
                    const away = (Date.now() - (this._hiddenAt || Date.now())) / 1000;
                    this._hiddenAt = 0;
                    if (!this._wasPausedBeforeHide && !this.gameOverShown && !this.boonOpen && !this.welcomeOpen) {
                        this.paused = false; this.lastTime = performance.now();
                        this.applyOfflineEarnings(away); this.updateUI();
                    }
                    setTimeout(() => this.offerPendingBoon(), 600);
                }
                this.syncToggles();
            });

            // the layout is fixed-size: if anything ever scrolls it (focus into a sliding panel, a find-in-page), put it back
            const unscroll = (el) => { if (el.scrollLeft || el.scrollTop) { el.scrollLeft = 0; el.scrollTop = 0; } };
            for (const el of [document.documentElement, document.body, this.el.app, $('stage'), $('gameArea')]) if (el) el.addEventListener('scroll', () => unscroll(el), { passive: true });
            window.addEventListener('scroll', () => window.scrollTo(0, 0), { passive: true });
            this.syncToggles();
            this.syncSettingsUI();
            this.drawWelcomeArt();
            if (document.fonts && document.fonts.load) document.fonts.load('16px "Lilita One"').catch(() => {});
        }

        drawWelcomeArt() {
            const cv = $('welcomeArt'); if (!cv) return;
            const g = cv.getContext('2d');
            try {
                const sp = A.getSprite('townhall', 3, 0);
                const gr = g.createRadialGradient(180, 150, 10, 180, 150, 200);
                gr.addColorStop(0, 'rgba(255,214,120,0.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
                g.fillStyle = gr; g.fillRect(0, 0, 360, 230);
                g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(180, 190, 130, 34, 0, 0, Math.PI * 2); g.fill();
                for (const [t, x, y, f] of [['archer', 70, 195, 1], ['cannon', 300, 200, 1], ['wizard', 52, 160, 0], ['goldmine', 300, 168, 0]]) {
                    const s = A.getSprite(t, 2, 0); g.save(); g.translate(x, y); g.scale(0.82, 0.82); A.drawSprite(g, s, 0, 0, 1, false); g.restore();
                }
                g.save(); g.translate(180, 200); g.scale(0.95, 0.95); A.drawSprite(g, sp, 0, 0, 1, false); g.restore();
            } catch (e) { /* art is cosmetic */ }
        }

        // ---------- panels ----------
        openPanel(name, toggle = false) {
            if (!PANEL_TITLES[name]) return;
            if (toggle && this.panel === name) { this.closePanel(); return; }
            if (this.panel === 'menu' && name !== 'menu') this.resumeFromMenu();
            this.panel = name;
            this.opened[name] = true;
            $('drawerTitle').textContent = PANEL_TITLES[name];
            document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === name));
            document.querySelectorAll('.dock-btn').forEach(b => { const on = b.dataset.tab === name; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
            this.el.app.classList.add('drawer-open');
            if (name === 'menu') { this.pauseForMenu(); const mh = $('panel-menu'); if (mh) mh.scrollTop = 0; }
            this.syncToggles();
            this.forceRefresh = true;
            if (name === 'build') { const cs = this.tutCurrent(); if (cs && cs.id === 'build') this.buildCat = 'defense'; this.buildMenu(true); }
            this.updateUI();
            this.forceRefresh = false;
        }
        closePanel() {
            if (!this.panel) return;
            if (this.panel === 'menu') this.resumeFromMenu();
            this.panel = null;
            this.el.app.classList.remove('drawer-open');
            document.querySelectorAll('.dock-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        }
        showTab(n) { this.openPanel(n); }
        // the menu freezes the game while it is open; only resume what the menu itself paused
        pauseForMenu() { if (!this.paused && !this.boonOpen && !this.gameOverShown) { this.paused = true; this._menuPaused = true; } }
        resumeFromMenu() {
            if (!this._menuPaused) return;
            this._menuPaused = false;
            if (!this.gameOverShown && !this.boonOpen) { this.paused = false; this.lastTime = performance.now(); }
            this.syncToggles();
        }
        isNarrow() { return window.matchMedia && window.matchMedia('(max-width: 880px)').matches; }

        focusBuilding(b) {
            const c = this.centerOf(b);
            this.cam.x = this.vw / 2 - c.x * this.cam.zoom;
            this.cam.y = this.vh / 2 - (c.y - 20) * this.cam.zoom;
            this.clampCamera(); this._camMoved = true;
            this.selectBuilding(b, true);
            if (this.isNarrow()) this.closePanel();
        }

        // ---------- build menu ----------
        setBuildMode(type) {
            if (type && this.maxedOut(type)) {
                this.audio.error(); this.toast(this.limitText(type), 'warn'); type = null;
            }
            this.buildMode = type;
            this.moveMode = null; this.spellMode = false;
            if (type) { this.selectMode = false; this.selectDrag = null; }
            if (type) this.deselect();
            this.updateCanvasCursor();
            this.buildMenu();
        }

        // the little bar that appears while the row tool is on
        updateGroupBar() {
            const bar = this.el && this.el.groupBar; if (!bar) return;
            bar.hidden = !this.selectMode;
            if (!this.selectMode) { this.updateHint && this.updateHint(); return; }
            const n = this.group.length;
            setText($('grpCount'), n ? `${n} picked` : 'Pick a row');
            $('grpMove').disabled = !n || !!this.gmove; $('grpDelete').disabled = !n;
            setText($('grpShape'), this.selectShape === 'box' ? 'Box' : 'Row');
            $('grpAdd').classList.toggle('on', this.selectAdd);
            this.updateHint();
        }
        updateCanvasCursor() {
            const busy = !!(this.buildMode || this.moveMode || this.spellMode || this.selectMode);
            this.canvas.classList.toggle('building', busy);
            this.canvas.classList.toggle('pointing', !busy && !!this.hoverBuilding);
            this.el.cancel.hidden = !busy;
            this.el.app.classList.toggle('carrying', busy);
            this.updateHint();
        }

        thumbURL(type) {
            if (A.thumbs[type]) return A.thumbs[type];
            const sp = A.getSprite(type, 1, 0); A.maskOf(sp);
            const S = 96, cv = A.mk(S, S), g = cv.getContext('2d');
            const bb = sp.bbox, w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
            const k = Math.min((S - 8) / w, (S - 8) / h, type === 'wall' ? 3.4 : 1.6);
            g.translate(S / 2, S / 2); g.scale(k, k);
            g.translate(-(bb.x0 + bb.x1) / 2, -(bb.y0 + bb.y1) / 2);
            g.drawImage(sp.canvas, -sp.ox, -sp.oy, sp.canvas.width / A.SS, sp.canvas.height / A.SS);
            return (A.thumbs[type] = cv.toDataURL());
        }
        enemyThumb(kind) {
            A.enemyThumbs = A.enemyThumbs || {};
            if (A.enemyThumbs[kind]) return A.enemyThumbs[kind];
            const S = 44, cv = A.mk(S, S), g = cv.getContext('2d');
            const T = ENEMY[kind];
            const e = { kind, x: 0, y: 0, size: T.size, flying: !!T.flying, air: 8, dir: 1, walk: 0.6, slow: 0, hit: 0, atkAnim: 0, wobble: 1 };
            const sc = Math.min(1.1, 30 / (T.size * 2.7));
            g.translate(S / 2, S - (T.flying ? 14 : 5)); g.scale(sc, sc);
            A.drawEnemy(g, e, 0);
            return (A.enemyThumbs[kind] = cv.toDataURL());
        }

        // cost chips for an upgrade; walls show both ways to pay ("180 gold or 90 elixir")
        upgradeChips(b) {
            const def = BLD[b.type], c = this.upgradeCostOf(b);
            if (!def.upgradeAlt) return this.costChips(c);
            const p = def.upgradeCost(b.level), a = def.upgradeAlt(b.level);
            return `${this.costChips(p)}<span class="chip free">or</span>${this.costChips(a)}`;
        }
        costChips(cost, haveFn = true) {
            return Object.entries(cost).map(([k, v]) => {
                const ok = !haveFn || (this.res[k] || 0) >= v;
                return `<span class="chip${ok ? '' : ' short'}">${ico(RES_ICON[k])}${fmt(v)}</span>`;
            }).join('') || '<span class="chip free">Free</span>';
        }

        buildMenu(force = false) {
            const menu = $('buildMenu');
            if (!menu) return;
            const seg = $('catSeg');
            const catsKey = CATS.map(c => c.id + (this.buildCat === c.id ? '*' : '')).join('|');
            if (seg._k !== catsKey) {
                seg._k = catsKey;
                seg.innerHTML = CATS.map(c => `<button class="seg-btn" type="button" data-cat="${c.id}" aria-pressed="${this.buildCat === c.id}">${c.label}</button>`).join('');
            }
            const hasTH = this.buildings.some(b => b.type === 'townhall');
            const entries = Object.entries(BLD).filter(([type, def]) => def.cat === this.buildCat && !(type === 'townhall' && hasTH));
            if (!entries.length && this.buildCat === 'core') { this.buildCat = 'economy'; return this.buildMenu(true); }
            // hide the Core tab once the Town Hall exists
            seg.querySelectorAll('[data-cat="core"]').forEach(b => { b.hidden = hasTH; });
            const key = this.buildCat + '|' + entries.map(([t, d]) => t + (this.player.level < d.unlockLevel ? 'L' : '') + (this.maxedOut(t) ? 'M' : '') + this.countCapOf(t)).join('|');
            if (force || menu._key !== key) {
                menu._key = key;
                menu.innerHTML = entries.map(([type, def]) => {
                    const locked = this.player.level < def.unlockLevel;
                    const cc = this.countCapOf(type), have = cc < 1e6 ? `<span class="count">${this.countOf(type)}/${cc}</span>` : '';
                    return `<button type="button" class="build-card" data-type="${type}" title="${esc(def.desc)}">
                        <span class="thumb-wrap"><img class="thumb" alt="" width="48" height="48"></span>
                        <span class="build-name">${def.name}</span>
                        <span class="build-blurb">${esc(def.desc.split('. ')[0].replace(/\.$/, ''))}</span>
                        ${locked ? `<span class="build-lock">${ico('lock')}Level ${def.unlockLevel}</span>` : `<span class="build-cost">${this.costChips(this.buildCost(type))}</span>`}
                        ${have}
                    </button>`;
                }).join('') || '<p class="hint">Nothing here yet.</p>';
                menu.querySelectorAll('.build-card').forEach(card => {
                    const type = card.dataset.type, def = BLD[type];
                    card.addEventListener('click', () => {
                        if (this.player.level < def.unlockLevel) { this.audio.error(); this.toast(`${def.name} unlocks at level ${def.unlockLevel}`, 'warn'); return; }
                        if (this.maxedOut(type)) { this.audio.error(); this.toast(this.limitText(type), 'warn'); return; }
                        if (!this.canAfford(this.buildCost(type))) { this.audio.error(); this.toast('Not enough resources', 'warn'); return; }
                        this.audio.click();
                        this.setBuildMode(this.buildMode === type ? null : type);
                        if (this.buildMode && this.isNarrow()) this.closePanel();
                    });
                });
                this.queueThumbs(menu);
            }
            // cheap per-tick refresh of affordability and selection
            for (const card of menu.children) {
                const type = card.dataset.type; if (!type) continue;
                const def = BLD[type];
                const locked = this.player.level < def.unlockLevel, afford = this.canAfford(this.buildCost(type));
                card.classList.toggle('locked', locked);
                card.classList.toggle('cannot-afford', !afford && !locked);
                card.classList.toggle('selected', this.buildMode === type);
                card.setAttribute('aria-pressed', String(this.buildMode === type));
                const cost = card.querySelector('.build-cost');
                if (cost && !locked) setHtml(cost, this.costChips(this.buildCost(type)));
                const cnt = card.querySelector('.count');
                if (cnt) setText(cnt, `${this.countOf(type)}/${this.countCapOf(type)}`);
                card.classList.toggle('full', this.maxedOut(type) && !locked);
            }
        }
        // building pictures are painted a few at a time so opening the panel never stalls
        queueThumbs(menu) {
            const imgs = [...menu.querySelectorAll('.build-card')];
            let i = 0;
            const next = () => {
                if (menu._key === undefined || i >= imgs.length) return;
                const card = imgs[i++];
                if (card && card.isConnected) { try { card.querySelector('img').src = this.thumbURL(card.dataset.type); } catch (e) { /* skip */ } }
                setTimeout(next, 8);
            };
            setTimeout(next, 0);
        }

        // ---------- HUD refresh (10 Hz) ----------
        updateUI() {
            const el = this.el;
            setText(el.gold, fmt(this.res.gold)); setText(el.elixir, fmt(this.res.elixir));
            setText(el.dark, fmt(this.res.dark)); setText(el.gems, fmt(this.res.gems));
            const cap = this.cap();
            for (const [k, fill] of [['gold', el.fillGold], ['elixir', el.fillElixir], ['dark', el.fillDark]]) {
                const f = Math.min(1, this.res[k] / this.capFor(k));
                const w = (f * 100).toFixed(1);
                if (fill._w !== w) { fill._w = w; fill.style.width = w + '%'; fill.parentElement.classList.toggle('full', f >= 0.995); }
            }
            const mult = this.rateMult(), moon = this.isNight() ? ' ☾' : '';
            setText(el.rateGold, `+${fmtRate(this.rates.gold * mult)}/s${moon}`);
            setText(el.rateElixir, `+${fmtRate(this.rates.elixir * mult)}/s`);
            setText(el.rateDark, `+${fmtRate(this.rates.dark * mult, 2)}/s`);

            setText(el.level, String(this.player.level));
            const xpNeeded = CFG.xpToLevel(this.player.level);
            setText(el.xp, `${Math.floor(this.player.xp)} / ${xpNeeded} XP`);
            const frac = Math.min(1, this.player.xp / xpNeeded);
            el.ring.style.strokeDashoffset = 113.1 * (1 - frac);
            const xw = (frac * 100).toFixed(1); if (el.xpFill._w !== xw) { el.xpFill._w = xw; el.xpFill.style.width = xw + '%'; }

            // raid card
            if (this.wave.active) {
                const left = this.enemies.length + this.wave.spawnLeft;
                setText(el.waveTimer, `${left} left`); el.waveTimer.classList.add('danger'); el.waveTimer.classList.remove('rest');
                setText(el.waveInfo, `Wave ${this.wave.number} · ${this.sideNames(this.wave.sides)}`);
            } else {
                const manual = this.settings.raidStart === 'manual';
                setText(el.waveTimer, manual ? 'Resting' : fmtTime(this.wave.timer));
                el.waveTimer.classList.toggle('danger', !manual && this.wave.timer < 10);
                el.waveTimer.classList.toggle('rest', manual);
                setText(el.waveInfo, manual ? `Rest · collectors ${Math.round(CFG.restRate * 100)}%` : `Next ${this.wave.number + 1} · ${this.sideNames(this.wave.nextSides)}`);
            }
            const ra = $('waveActions');
            if (ra) {
                ra.hidden = this.wave.active;
                const manual = this.settings.raidStart === 'manual';
                const rm = $('btnRest'); setText(rm, manual ? 'Resting' : 'Rest'); rm.classList.toggle('on', manual); rm.setAttribute('aria-pressed', String(manual));
                setText($('btnStartRaid'), manual ? 'Start raid' : 'Start now');
            }
            const counts = {};
            const src = this.wave.active ? this.enemies.map(e => e.kind).concat(this.wave.queue.slice(this.wave.total - this.wave.spawnLeft)) : this.wave.next;
            for (const k of src) counts[k] = (counts[k] || 0) + 1;
            const order = Object.keys(counts).sort((a, b) => ENEMY[b].hp - ENEMY[a].hp).slice(0, 5);
            setHtml(el.wavePreview, order.map(k => `<span class="pv${ENEMY[k].boss ? ' boss' : ''}" title="${ENEMY[k].name}${ENEMY[k].flying ? ' (flying)' : ''}"><img alt="${ENEMY[k].name}" width="26" height="26" src="${this.enemyThumb(k)}"><b>${counts[k]}</b></span>`).join(''));

            const hours = Math.floor(this.dayTime * 24), mins = Math.floor((this.dayTime * 24 - hours) * 60);
            setText(el.dayTime, `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
            setText(el.dayCount, this.isNight() ? `Day ${this.dayCount} · +25%` : `Day ${this.dayCount}`);
            el.dayPanel.classList.toggle('night', this.isNight());
            setText(el.zoom, `${Math.round(this.cam.zoom / this.homeZoom() * 100)}%`);

            if (el.combo) {
                if (this.combo.count >= 3) { setText(el.combo, `COMBO x${this.combo.mult}`); el.combo.classList.add('show'); } else el.combo.classList.remove('show');
            }

            // abilities
            const wc = el.warCry;
            if (this.warCry.active) { wc.classList.add('active'); wc.classList.remove('cooling'); setText(el.warCryLabel, `${Math.ceil(this.warCry.timeLeft)}s`); el.warCryCd.style.setProperty('--cd', '0'); }
            else if (this.warCry.cooldown > 0) { wc.classList.remove('active'); wc.classList.add('cooling'); setText(el.warCryLabel, `${Math.ceil(this.warCry.cooldown)}s`); el.warCryCd.style.setProperty('--cd', String(this.warCry.cooldown / 90)); }
            else { wc.classList.remove('active', 'cooling'); setText(el.warCryLabel, 'War Cry'); el.warCryCd.style.setProperty('--cd', '0'); }
            el.boost.classList.toggle('active', this.boost.timeLeft > 0);
            setText(el.boostLabel, this.boost.timeLeft > 0 ? `x2 ${Math.ceil(this.boost.timeLeft)}s` : 'Boost');
            const rl = $('rallyLabel'); if (rl) { setText(rl, this.rallyCd > 0 ? `${Math.ceil(this.rallyCd)}s` : 'Rally'); $('actRally').classList.toggle('cooling', this.rallyCd > 0); }
            el.boost.classList.toggle('dim', this.res.gems < CFG.boostCost && this.boost.timeLeft <= 0);
            el.spell.classList.toggle('dim', this.res.gems < 1);
            el.spell.classList.toggle('active', this.spellMode);

            // dock badges
            const upReady = this.buildings.filter(b => this.upgradeReady(b)).length;
            const claim = this.quests.filter(q => q.done).length;
            if (el.dotUp._n !== upReady) { el.dotUp._n = upReady; el.dotUp.textContent = String(upReady); el.dotUp.hidden = upReady === 0; }
            if (el.dotKing._n !== claim) { el.dotKing._n = claim; el.dotKing.textContent = String(claim); el.dotKing.hidden = claim === 0; }

            // coin bubbles ready to tap
            const ready = this.readyCount();
            el.collect.classList.toggle('glow', ready > 0);
            if (el.collectDot._n !== ready) { el.collectDot._n = ready; el.collectDot.textContent = String(ready); el.collectDot.hidden = ready === 0; }
            el.freeze.classList.toggle('dim', this.res.gems < CFG.freezeCost || this.enemies.length === 0);
            const rc = this.repairCost();
            if (el.repairDot._n !== rc.n) { el.repairDot._n = rc.n; el.repairDot.textContent = String(rc.n); el.repairDot.hidden = rc.n === 0; }
            el.repair.classList.toggle('glow', rc.n > 0 && !this.wave.active);
            if (this.repairOpen) this.renderRepair(rc);
            this.renderGoal();

            this.updateSelectionLive();
            if (this.panel === 'build') this.buildMenu();
            else if (this.panel === 'upgrade') this.renderUpgrades();
            else if (this.panel === 'kingdom') this.renderKingdom();
        }

        // ---------- selection card ----------
        levelStats(type, level) {
            const def = BLD[type], out = [];
            const gm = this.goldMult * this.prodMult(), pm = this.prodMult();
            if (def.production) {
                const p = def.production(level);
                for (const k in p) {
                    const mul = k === 'gold' ? gm : (k === 'gems' ? 1 : pm);
                    out.push({ id: 'p' + k, label: `${U.resSymbol(k)} per second`, v: p[k] * mul, f: (v) => (k === 'gems' ? v.toFixed(3) : fmtRate(v, 1)) });
                }
            }
            if (def.defense) {
                const d = def.defense(level);
                out.push({ id: 'dmg', label: 'Damage', v: d.dmg, f: (v) => fmt(v) });
                out.push({ id: 'dps', label: 'Damage per second', v: d.dmg / d.cd, f: (v) => fmt(v) });
                out.push({ id: 'range', label: 'Range', v: d.range, f: (v) => v.toFixed(1) + ' tiles' });
                if (d.slow) out.push({ id: 'slow', label: 'Slows by', v: d.slow * 100, f: (v) => Math.round(v) + '%' });
            }
            if (def.provides) {
                const p = def.provides(level);
                if (p.cap) out.push({ id: 'cap', label: 'Storage', v: p.cap, f: (v) => '+' + fmt(v) });
                if (p.goldMult) out.push({ id: 'gm', label: 'Gold bonus', v: p.goldMult * 100, f: (v) => '+' + Math.round(v) + '%' });
                if (p.xpMult) out.push({ id: 'xm', label: 'XP bonus', v: p.xpMult * 100, f: (v) => '+' + Math.round(v) + '%' });
                if (p.rallyMult) out.push({ id: 'rm', label: 'Rally heal', v: p.rallyMult * 100, f: (v) => '+' + Math.round(v) + '%' });
                if (p.waveGems) out.push({ id: 'wg', label: 'Gems per wave', v: p.waveGems, f: (v) => '+' + v });
                if (p.prosperity) out.push({ id: 'pr', label: 'Prosperity', v: p.prosperity * 100, f: (v) => '+' + v.toFixed(1) + '% production' });
            }
            return out;
        }

        refreshSelection() {
            const b = this.selected, sel = this.el.sel;
            if (!b || !this.buildings.includes(b)) { sel.hidden = true; sel._key = null; this.el.app.classList.remove('has-sel'); this.updateCanvasCursor(); return; }
            const def = BLD[b.type];
            const capped = this.thCapped(b);
            const key = [b.id, b.level, this.thLevel()].join('|');
            sel.hidden = false;
            this.el.app.classList.add('has-sel');
            const max = b.level >= def.maxLevel;
            const cur = this.levelStats(b.type, b.level), nxt = (max || capped) ? [] : this.levelStats(b.type, b.level + 1);
            const stats = cur.slice(0, 3).map((s, i) => {
                const n = nxt.find(x => x.id === s.id);
                const same = n && Math.abs(n.v - s.v) < 1e-9;
                return `<div class="sel-stat"><label>${s.label}</label><span><b>${s.f(s.v)}</b>${n && !same ? `<i>${ico('chevron')}</i><b class="up">${n.f(n.v)}</b>` : ''}</span></div>`;
            }).join('');
            const canMove = def.cat !== 'core';
            const next = !max && def.upgradeCost ? this.upgradeCostOf(b) : null;
            sel.innerHTML = `
                <div class="sel-head">
                    <img class="sel-thumb" alt="" src="${this.thumbURL(b.type)}" width="56" height="56">
                    <div class="sel-info">
                        <div class="sel-title"><span class="sel-name">${def.name}</span>${def.maxLevel > 1 ? `<span class="sel-lv">Level ${b.level}${max ? ' · MAX' : ` of ${def.maxLevel}`}</span>` : ''}</div>
                        ${def.decor ? '' : '<div class="sel-hp" id="selHp"><span id="selHpFill"></span><em id="selHpText"></em></div>'}
                    </div>
                    <button class="icon-btn sel-close" type="button" data-act="close" aria-label="Deselect">${ico('close')}</button>
                </div>
                ${stats ? `<div class="sel-stats">${stats}</div>` : `<p class="sel-desc">${def.desc}</p>`}
                <div class="sel-actions">
                    ${def.clickBonus ? `<button class="btn gold" type="button" data-act="collect">${ico('sack')}Collect</button>` : ''}
                    ${next && capped ? `<button class="btn upgrade th-locked" type="button" data-act="upgrade" id="selUpLock">${ico('lock')}Needs Town Hall ${thForLevel(b.type, b.level + 1)}</button>` : ''}
                    ${next && !capped ? `<button class="btn good upgrade" type="button" data-act="upgrade" id="selUp"><span class="up-label">${ico('up')}Upgrade</span><span class="up-cost" id="selUpCost">${this.upgradeChips(b)}</span></button>
                    <button class="btn small" type="button" data-act="max" title="Keep upgrading until you run out of money">Max</button>` : ''}
                    ${b.type === 'wall' && this.sameLevelCount(b) > 1 && !max && !capped ? `<button class="btn small" type="button" data-act="upall" title="Upgrade every wall of this level">All ${this.sameLevelCount(b)}</button>` : ''}
                    ${b.type === 'wall' ? `<button class="btn small" type="button" data-act="erase" title="Pick whole rows of walls to move or delete">Rows…</button>` : ''}
                    ${canMove ? `<button class="btn small" type="button" data-act="move" title="Move this building" aria-label="Move">${ico('move')}</button>` : ''}
                    <button class="btn small" type="button" data-act="info" title="Details" aria-label="Details">${ico('info')}</button>
                    ${canMove ? `<button class="btn small danger" type="button" data-act="sell" title="Sell (50% back) · Delete key" aria-label="Sell">${ico('trash')}</button>` : ''}
                </div>`;
            sel._key = key;
            this.updateSelectionLive(true);
            this.updateCanvasCursor();
        }
        // HP and affordability change every tick without a full rebuild
        updateSelectionLive(force) {
            const b = this.selected, sel = this.el.sel;
            if (!b || sel.hidden) return;
            const def = BLD[b.type];
            const fill = $('selHpFill'), txt = $('selHpText');
            if (fill) {
                const f = Math.max(0, b.hp / b.maxHp), w = (f * 100).toFixed(1);
                if (fill._w !== w) { fill._w = w; fill.style.width = w + '%'; fill.className = f > 0.5 ? 'hi' : f > 0.25 ? 'mid' : 'lo'; }
                setText(txt, `${fmt(Math.ceil(b.hp))} / ${fmt(b.maxHp)}`);
            }
            const col = sel.querySelector('[data-act="collect"]');
            if (col) {
                const r = this.bubbleReady(b), left = Math.max(0, Math.ceil(this.bubbleSec() - (b.charge || 0)));
                col.disabled = !r;
                const lab = r ? 'Collect' : `Ready in ${left}s`;
                if (col._lab !== lab) { col._lab = lab; col.innerHTML = `${ico('sack')}${lab}`; }
            }
            const up = $('selUp');
            if (up) up.classList.toggle('tut-pulse', !!this._tt && this._tt.sel === 'upgrade');
            if (up && b.level < def.maxLevel) {
                const cost = this.upgradeCostOf(b), ok = this.canAfford(cost);
                up.classList.toggle('cant', !ok);
                const cc = $('selUpCost'); if (cc) setHtml(cc, this.upgradeChips(b));
            }
        }
        sameLevelCount(b) { let n = 0; for (const o of this.buildings) if (o.type === b.type && o.level === b.level) n++; return n; }
        onSelClick(e) {
            const btn = e.target.closest('[data-act]'); const b = this.selected;
            if (!btn || !b) return;
            this.audio.click();
            const act = btn.dataset.act;
            if (act === 'close') this.deselect();
            else if (act === 'collect') this.collectFrom(b);
            else if (act === 'upgrade') this.upgradeBuilding(b);
            else if (act === 'max') this.upgradeMax(b);
            else if (act === 'move') this.startMove(b);
            else if (act === 'erase') { this.toggleSelect(b); }
            else if (act === 'upall') this.upgradeGroup(b.type, b.level);
            else if (act === 'info') this.openBuildingModal(b);
            else if (act === 'sell') this.confirmSell(b);
        }

        confirmSell(b) {
            const def = BLD[b.type];
            const refund = {};
            for (const k in def.baseCost) refund[k] = Math.floor(def.baseCost[k] * 0.5);
            const refundStr = Object.entries(refund).map(([k, v]) => `${fmt(v)} ${U.resSymbol(k).toLowerCase()}`).join(', ') || 'nothing';
            const lost = b.level > 1 ? `<br><br><span class="warn-text">Its ${b.level - 1} upgrade${b.level > 2 ? 's' : ''} won't be refunded.</span>` : '';
            this.showConfirm({
                title: `Sell ${def.name}?`, icon: 'trash',
                body: `You get back ${refundStr}.${lost}`, yesText: 'Sell', noText: 'Keep it', danger: true,
                onYes: () => { if (!this.buildings.includes(b)) return; const r = this.sellBuilding(b); this.toast(`Sold for ${Object.entries(r).map(([k, v]) => fmt(v) + ' ' + U.resSymbol(k).toLowerCase()).join(', ')}`, 'success'); },
            });
        }

        // ---------- upgrade list ----------
        // Many identical buildings (walls above all) collapse into one row
        upgradeGroup(type, level) {
            let n = 0;
            for (const b of this.buildings.slice()) if (b.type === type && b.level === level && this.upgradeBuilding(b, true)) n++;
            if (n) { this.toast(`${BLD[type].name}: ${n} upgraded`, 'success'); this.audio.upgrade(); } else this.toast('Not enough resources', 'warn');
        }
        renderUpgrades() {
            const list = $('upgradeList');
            const groups = new Map();
            for (const b of this.buildings) {
                const def = BLD[b.type];
                if (!def.upgradeCost || b.level >= def.maxLevel) continue;
                const key = b.type + '|' + b.level;
                const g = groups.get(key) || { type: b.type, level: b.level, list: [], locked: this.thCapped(b) };
                g.list.push(b); groups.set(key, g);
            }
            const rows = [...groups.values()].map(g => {
                const b = g.list[0], cost = this.upgradeCostOf(b);
                return { g, b, cost, n: g.list.length, locked: g.locked, ok: !g.locked && this.canAfford(cost), c$: this.upgradeCostScore(b) + (g.type === 'wall' ? 1e12 : 0) };
            }).sort((a, z) => (a.locked - z.locked) || (z.ok - a.ok) || (a.c$ - z.c$));
            const maxed = this.buildings.filter(b => BLD[b.type].upgradeCost && b.level >= BLD[b.type].maxLevel).length;
            const html = rows.map(({ g, b, cost, n, ok, locked }) => {
                const def = BLD[b.type];
                const cur = this.levelStats(b.type, b.level), nxt = this.levelStats(b.type, b.level + 1);
                const s0 = cur[0], n0 = s0 && nxt.find(x => x.id === s0.id);
                const gain = s0 && n0 ? `${s0.label}: ${s0.f(s0.v)} → <b>${n0.f(n0.v)}</b>` : '';
                const many = n > 1;
                const act = locked ? `<span class="th-need">${ico('lock')}Town Hall ${thForLevel(b.type, b.level + 1)}</span>`
                    : many ? `<button type="button" class="btn small ${ok ? 'good' : ''}" data-upg="${g.type}|${g.level}" ${ok ? '' : 'disabled'}>Upgrade all</button>`
                           : `<button type="button" class="btn small ${ok ? 'good' : ''}" data-up="${b.id}" ${ok ? '' : 'disabled'}>Upgrade</button>`;
                return `<div class="up-row${ok ? ' ready' : ''}${many ? ' group' : ''}${locked ? ' locked' : ''}" data-focus="${b.id}">
                    <img class="up-thumb" alt="" width="40" height="40" src="${this.thumbURL(b.type)}">
                    <div class="up-info"><div class="up-name">${def.name}${many ? `<span class="up-count">x${n}</span>` : ''}<small>Lv ${b.level} → ${b.level + 1}</small></div><div class="up-gain">${gain}</div><div class="up-cost">${this.upgradeChips(b)}${many ? '<span class="chip free">each</span>' : ''}</div></div>
                    ${act}
                </div>`;
            }).join('') + (maxed ? `<p class="hint">${maxed} building${maxed > 1 ? 's' : ''} fully upgraded.</p>` : '') + (!rows.length && !maxed ? '<p class="hint">Build something and it shows up here.</p>' : '');
            setHtml(list, html);
            this.updateUpButtons(rows);
        }
        // The two big buttons say plainly whether they can do anything right now
        updateUpButtons(rows) {
            const weak = $('btnUpWeak');
            if (weak) {
                const hurt = this.weakCandidates(0.9).length, ok = hurt ? this.weakUpgradable(0.9).length : 0;
                weak.disabled = ok === 0;
                const lab = ok ? `Upgrade weakest (${ok} damaged)` : (hurt ? 'Weakest cost too much now' : 'Nothing is damaged');
                if (weak._lab !== lab) { weak._lab = lab; setHtml(weak, `${ico('heart')}${lab}`); }
            }
            const ready = rows.filter(r => r.ok).reduce((n, r) => n + r.n, 0);
            const locked = rows.some(r => r.locked), open = rows.filter(r => !r.locked);
            const all = $('btnUpAll'), cheap = $('btnUpCheap'), note = $('upNote');
            if (!all || !cheap) return;
            all.disabled = cheap.disabled = ready === 0;
            const label = ready ? 'Upgrade all you can' : 'Nothing affordable yet';
            if (all._lab !== label) { all._lab = label; setHtml(all, `${ico('up')}${label}`); }
            let text = '';
            if (!ready) {
                const next = open.slice().sort((a, z) => a.c$ - z.c$)[0];
                if (next) text = `Cheapest next: ${BLD[next.b.type].name} for ${Object.entries(next.cost).map(([k, v]) => `${fmt(v)} ${U.resSymbol(k).toLowerCase()}`).join(' + ')}.`;
                else if (locked) text = 'Everything is waiting on the Town Hall. Upgrade it to unlock more levels.';
            } else text = `${ready} upgrade${ready > 1 ? 's' : ''} ready now.${locked ? ' Greyed rows need a higher Town Hall level.' : ''}`;
            if (note._t !== text) { note._t = text; note.textContent = text; note.hidden = !text; }
        }

        // ---------- kingdom panel ----------
        renderKingdom() {
            this._kt = (this._kt || 0) + 1;
            if (!this.forceRefresh && this._kt % 3 !== 0) return;
            // quests
            const qs = this.quests.map((q, i) => {
                const kind = this.questKind(q), prog = Math.min(q.target, this.questProgress(q)), pct = (prog / q.target * 100).toFixed(1);
                return `<div class="quest${q.done ? ' done' : ''}">
                    <div class="quest-text">${kind.text(fmt(q.target)).replace(/(\d[\d.,KMBT]*)/, '<b>$1</b>')}</div>
                    <div class="bar"><span data-w="${pct}"></span><em>${fmt(prog)} / ${fmt(q.target)}</em></div>
                    <button type="button" class="btn small ${q.done ? 'gold' : ''}" ${q.done ? `data-claim="${i}"` : 'disabled'}>${q.done ? `Claim ${q.gems} ${ico('gem')}` : `Reward ${q.gems} ${ico('gem')}`}</button>
                </div>`;
            }).join('');
            const ql = $('questList'); if (setHtml(ql, qs)) fixBars(ql);

            // ascension
            const gain = this.ascendGain(), can = this.canAscend();
            const perks = Object.entries(PERKS).map(([k, p]) => {
                const r = this.perkRank(k), cost = perkCost(r), maxed = r >= p.max;
                return `<div class="perk"><div class="perk-info"><b>${p.name}</b><span>${p.desc}</span><em>Rank ${r} / ${p.max}</em></div>
                    <button type="button" class="btn small ${!maxed && this.crowns >= cost ? 'gold' : ''}" data-perk="${k}" ${maxed || this.crowns < cost ? 'disabled' : ''}>${maxed ? 'Max' : `${cost} ${ico('crown')}`}</button></div>`;
            }).join('');
            const asc = `<div class="crown-row">${ico('crown', 'big')}<div><b>${this.crowns}</b> crown${this.crowns === 1 ? '' : 's'}<small>${this.ascensions} ascension${this.ascensions === 1 ? '' : 's'} · reign ${this.ascensions + 1}</small></div></div>
                <p class="hint">Ascending starts a new reign: your buildings, level, wave and resources reset. Crowns, perks, gems, achievements and statistics stay. ${can ? `Right now it would earn <b>${gain} crown${gain === 1 ? '' : 's'}</b>.` : `Survive ${CFG.ascendMinWave} waves to unlock it (${this.wavesSurvived()} so far).`}</p>
                <button type="button" class="btn ascend" data-ascend="1" ${can ? '' : 'disabled'}>${ico('crown')}${can ? `Ascend for ${gain} crown${gain === 1 ? '' : 's'}` : `Ascend (needs ${CFG.ascendMinWave} waves)`}</button>
                <div class="perks">${perks}</div>`;
            setHtml($('ascendBox'), asc);

            // boons
            const owned = BOONS.filter(b => !b.instant && this.boon(b.id) > 0);
            setHtml($('boonList'), owned.length ? owned.map(b => `<div class="boon-chip" title="${esc(b.desc)}">${ico(b.ico)}<span>${b.name}</span><b>x${this.boon(b.id)}</b></div>`).join('') : '<p class="hint">Pick a boon after each raid. They show up here.</p>');

            // defenses
            const defCount = {}; let dps = 0;
            for (const b of this.buildings) { const def = BLD[b.type]; if (def.defense) { defCount[def.name] = (defCount[def.name] || 0) + 1; const d = def.defense(b.level); dps += d.dmg / d.cd; } }
            const rows = [['Buildings', this.buildings.length], ['Damage per second', fmt(dps * this.towerMult())], ...Object.entries(defCount)];
            setHtml($('armyList'), rows.map(([l, v]) => `<div class="stat-row"><span>${l}</span><span class="val">${v}</span></div>`).join(''));
            setHtml($('achievementList'), ACHS.map(a => `<div class="achievement ${this.achievements[a.id] ? 'done' : ''}" title="${esc(a.desc)}">${ico(this.achievements[a.id] ? 'trophy' : 'lock')}<div class="achievement-body"><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div></div></div>`).join(''));
            const S = this.stats;
            const st = [['Buildings built', S.built], ['Upgrades', S.upgrades], ['Raiders slain', S.kills], ['Golems toppled', S.bosses], ['Collections', S.clicks], ['Treasure Goblins caught', S.goblins], ['Spells cast', S.spells], ['Best combo', 'x' + S.maxCombo], ['Gold earned', fmt(S.goldEarned)], ['Waves cleared', S.wavesCleared], ['Time played', fmtDuration(S.playTime)], ['Storage cap', fmt(this.cap())], ['Gold multiplier', `x${(this.goldMult * this.prodMult()).toFixed(2)}`], ['XP multiplier', `x${this.xpMult.toFixed(2)}`], ['Prosperity', `+${(this.prosperity * 100).toFixed(1)}%`]];
            setHtml($('statList'), st.map(([l, v]) => `<div class="stat-row"><span>${l}</span><span class="val">${v}</span></div>`).join(''));
        }

        confirmAscend() {
            if (!this.canAscend()) return;
            const gain = this.ascendGain();
            this.showConfirm({
                title: 'Ascend?', icon: 'crown',
                body: `Start a new reign and earn <b>${gain} crown${gain === 1 ? '' : 's'}</b>.<br><br>Your buildings, level, wave and resources reset. Crowns, perks, gems, achievements and statistics stay.`,
                yesText: `Ascend (+${gain})`, noText: 'Not yet', danger: false,
                onYes: () => this.ascend(),
            });
        }
        confirmReset() {
            this.showConfirm({
                title: 'Reset everything?', icon: 'warn',
                body: 'This erases your kingdom, crowns, perks and achievements and starts from nothing.<br><br><span class="warn-text">There is no undo.</span>',
                yesText: 'Continue', noText: 'Keep playing', danger: true,
                onYes: () => setTimeout(() => this.showConfirm({
                    title: 'Really erase it all?', icon: 'skull',
                    body: 'Last chance. Export a backup first if you might want this kingdom again.',
                    yesText: 'Erase everything', noText: 'Keep playing', danger: true,
                    onYes: () => this.wipeSave(),
                }), 120),
            });
        }

        // ---------- hover tooltip ----------
        rebuildHoverTip() {
            const tip = this._tipEl || (this._tipEl = $('hoverTip'));
            if (!tip) return;
            const b = this.hoverBuilding;
            if (b && !this.buildMode && !this.spellMode && !this.moveMode && b !== this.selected) {
                const def = BLD[b.type];
                const s = this.levelStats(b.type, b.level)[0];
                tip.innerHTML = `<strong>${def.name}</strong>${def.maxLevel > 1 ? ` <span class="tip-dim">Lv ${b.level}</span>` : ''}${s ? `<br><span class="tip-dim">${s.label}</span> ${s.f(s.v)}` : ''}<br><span class="tip-help">Click to select</span>`;
                tip.classList.add('visible'); this._hoverLevel = b.level;
            } else { tip.classList.remove('visible'); this._hoverLevel = -1; }
        }
        positionHoverTip() {
            const tip = this._tipEl;
            if (!tip || !tip.classList.contains('visible')) return;
            tip.style.left = (this.input.x + 18) + 'px';
            tip.style.top = (this.input.y + 18) + 'px';
        }

        // ---------- toasts and banners ----------
        toast(msg, type = '') {
            const c = $('toasts');
            const el = document.createElement('div');
            el.className = 'toast ' + type;
            const icon = type === 'success' ? 'check' : (type === 'error' ? 'skull' : (type === 'warn' ? 'warn' : (type === 'tip' ? 'help' : 'info')));
            el.innerHTML = `${ico(icon)}<span></span>`;
            el.lastChild.textContent = msg;
            c.appendChild(el);
            while (c.children.length > 3) c.firstElementChild.remove();
            setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, type === 'tip' ? 6500 : 2600);
        }
        showAlert(text, dur = 2, boss = false) {
            const p = this.el.alert;
            p.textContent = text;
            p.classList.toggle('boss', !!boss);
            p.classList.remove('active'); void p.offsetWidth; p.classList.add('active');
            this.alertTimer = dur;
        }
        hideAlert() { this.el.alert.classList.remove('active'); }
        pulseRes(key) {
            const e = document.querySelector(`.res[data-res="${key}"]`);
            if (!e) return;
            e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse');
        }

        // ---------- toggles and settings ----------
        syncToggles() {
            const auto = $('actAutoCollect');
            if (auto) { setText($('autoLabel'), this.autoCollect ? 'on' : 'off'); auto.classList.toggle('on', this.autoCollect); auto.setAttribute('aria-pressed', String(this.autoCollect)); }
            const snd = $('btnSound');
            if (snd) { snd.textContent = this.audio.muted ? 'Off' : 'On'; snd.setAttribute('aria-pressed', String(!this.audio.muted)); }
            const mb = $('btnMenu');
            if (mb) { const open = this.panel === 'menu'; mb.classList.toggle('on', open || this.paused); mb.setAttribute('aria-pressed', String(open)); setText($('menuTag'), this.paused ? 'paused' : 'menu'); }
            this.el.veil.hidden = !(this.paused && !this.gameOverShown && !document.hidden && !this.welcomeOpen && !this.boonOpen && !$('modal').classList.contains('open'));
            setText(this.el.speedTag, 'x' + this.speed);
            $('btnSpeed').classList.toggle('on', this.speed > 1);
            document.querySelectorAll('#notationSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.notation === K.data.state.notation)));
        }
        syncSettingsUI() {
            const S = this.settings;
            document.querySelectorAll('#viewSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
            document.querySelectorAll('#tagsSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tags === S.levelTags)));
            document.querySelectorAll('#autoUpSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.autoup === S.autoUpgrade)));
            const set = (id, on) => { const e = $(id); if (e) { e.textContent = on ? 'On' : 'Off'; e.setAttribute('aria-pressed', String(on)); } };
            set('btnXray', S.xray); set('btnHints', S.hints);
            document.querySelectorAll('#diffSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.diff === S.difficulty)));
        }
        toggleAutoCollect() { this.autoCollect = !this.autoCollect; this.syncToggles(); this.toast(this.autoCollect ? 'Auto-collect on' : 'Auto-collect off', 'success'); }
        toggleSound() { this.audio.muted = !this.audio.muted; this.syncToggles(); this.audio.click(); this.save(); }
        setNotation(n) {
            if (!NOTATIONS.includes(n) || n === K.data.state.notation) return;
            K.data.state.notation = n;
            this.syncToggles(); this.buildMenu(true); this.updateUI(); this.refreshSelection();
            if (this.modalBuilding) this.openBuildingModal(this.modalBuilding);
            this.save();
        }

        // ---------- dialogs ----------
        openPlainModal(html) {
            const modal = this.el.modal;
            if (!modal.classList.contains('open')) this._modalReturnFocus = document.activeElement;
            this.modalBuilding = null;
            this.el.modalBody.innerHTML = html;
            fixBars(this.el.modalBody);
            modal.classList.add('open');
            $('modalClose').focus({ preventScroll: true });
        }
        closeModal() {
            const modal = $('modal');
            if (this.boonOpen) return;
            if (!modal.classList.contains('open')) return;
            modal.classList.remove('open');
            this.modalBuilding = null; this.repairOpen = false;
            if (this._modalPaused) { this._modalPaused = false; this.paused = false; this.lastTime = performance.now(); this.syncToggles(); }
            if (this._modalReturnFocus && document.contains(this._modalReturnFocus)) this._modalReturnFocus.focus({ preventScroll: true });
            this._modalReturnFocus = null;
        }
        // ---------- first-run goal card ----------
        renderGoal() {
            const el = this.el.goal;
            const s = this.tutCurrent();
            if (!s) { el.hidden = true; this._tt = null; this.setDockPulse(null); return; }
            el.hidden = false;
            const steps = this.tutSteps();
            const dots = steps.map((_, i) => `<i class="${i < this.tut.step ? 'done' : (i === this.tut.step ? 'now' : '')}"></i>`).join('');
            setHtml(el, `<div class="goal-top"><b>Goal ${this.tut.step + 1} of ${steps.length}</b><button type="button" data-goal="skip" title="Hide the goals">Skip</button></div>
                <div class="goal-title">${s.title}</div><div class="goal-sub">${s.sub}</div>
                <div class="goal-dots">${dots}</div>${s.manual ? '<button type="button" class="btn small good" data-goal="next">Got it</button>' : ''}`);
            this._tt = this.tutTarget();
            this.setDockPulse(this._tt.dock || null);
        }
        setDockPulse(tab) {
            document.querySelectorAll('.dock-btn').forEach(b => b.classList.toggle('tut-pulse', !!tab && b.dataset.tab === tab && this.panel !== tab));
        }

        // The one-line banner that says what a tap will do right now
        updateHint() {
            const h = this.el.hint;
            let text = '';
            if (this.gmove) text = 'Tap where the picked buildings should go (blue means they fit). Esc cancels.';
            else if (this.selectMode) text = this.group.length ? `${this.group.length} picked. Drag one to move them all, or press Delete. Drag again for a new row.` : 'Row tool: drag along a row or column to pick it. Shift drags a box. Esc stops.';
            else if (this.buildMode) { const d = BLD[this.buildMode]; text = `Tap the grass to place the ${d.name}.${d.drag ? ' Drag to paint a line.' : ''} Esc cancels.`; }
            else if (this.moveMode) text = `Drop the ${BLD[this.moveMode.type].name} on an empty tile to move it, or on another building to swap places. Esc cancels.`;
            else if (this.spellMode) text = 'Tap the map to call down lightning. Esc cancels.';
            h.hidden = !text;
            if (text) setText(h, text);
        }

        // ---------- how to play ----------
        showHelp() { this.openPanel('menu'); }
        buildMenuHelp() {
            const host = $('menuHelp'); if (!host) return;
            const row = (icon, title, body) => `<div class="help-row">${ico(icon)}<div><b>${title}</b><span>${body}</span></div></div>`;
            setHtml(host, `
                ${row('sack', 'Collect', 'Mines and wells fill a coin bubble every few seconds. Tap it for a bonus. Tap several quickly for a combo. The <b>Collect</b> button (or Space) grabs every ready bubble.')}
                ${row('up', 'Upgrade', 'Tap a building to select it, then press <b>Upgrade</b>. <b>Upgrade weakest</b> (Upgrade tab) spends on the most damaged buildings first, since an upgrade heals fully, and skips anything pricey; the <b>Weakest</b> auto-upgrade mode does it for you. Or tap the green arrow floating over anything you can afford. The Upgrade tab does many at once.')}
                ${row('hammer', 'Build', 'Open <b>Build</b>, pick a card, tap the grass. Buildings are 3x3 tiles, the Town Hall 4x4, walls 1x1, and they can touch. Walls and decorations can be painted by dragging. The <b>Town Hall</b> level limits how many of each you can have and how high they upgrade.')}
                ${row('move', 'Row tool', 'Press <b>E</b> (or <b>Rows…</b> on a selected wall). Drag along a row or column to pick everything on it (Shift drags a box, Ctrl/Cmd or the Add button adds to what you have). Then drag any picked building to move the whole group, press <b>Move</b> and tap a spot, or press <b>Delete</b>. Arrow keys nudge by one tile.')}
                ${row('move', 'Move and swap', 'Select a building, then drag it. Drop it on empty grass to move it, or on another building to swap places.')}
                ${row('sword', 'Defend', 'Raiders arrive when the raid timer (top left) runs out. Press <b>Start now</b> to call them early, or hit <b>Rest</b> to hold raids back while you build: nothing attacks, but your collectors only run at half speed until you call the next raid. Red arrows show which side they come from. Towers fire on their own. Cannons and mortars only hit ground raiders, Air Defense only hits flyers. Walls slow ground raiders.')}
                ${row('heart', 'Repair', 'Damaged buildings smoke and burn. <b>Repair</b> (K) fixes everything for a few gems, or you can feed gold into the <b>repair fund</b>: the moment it covers the damage, everything is mended. Upgrading a building also heals it fully, and buildings slowly mend themselves a few seconds after the last hit.')}
                ${row('star', 'Boons', 'After every raid you pick one of three rewards. They stack and last until you ascend.')}
                ${row('gem', 'Gems', `Spend them on <b>Boost</b> (double income, ${CFG.boostCost} gems), <b>Lightning</b> (1) and <b>Freeze</b> (${CFG.freezeCost}). Earn them from waves, quests and goblins.`)}
                ${row('crown', 'Ascend', `From wave ${CFG.ascendMinWave}, Ascend in the Kingdom tab: the kingdom restarts and you keep crowns that buy permanent perks.`)}`);
        }

        // ---------- repairs ----------
        openRepair() {
            if (this.gameOverShown || this.welcomeOpen || this.boonOpen) return;
            this.repairOpen = true;
            this.openPlainModal('<div id="repairBody" class="repair-card"></div>');
            this.el.modalBody.onclick = (e) => {
                const b = e.target.closest('[data-rep]'); if (!b) return;
                this.audio.click();
                const a = b.dataset.rep;
                if (a === 'gems') this.repairWithGems();
                else if (a === 'all') this.contributeRepair(this.res.gold);
                else this.contributeRepair(Number(a));
                this.renderRepair();
            };
            this.renderRepair();
        }
        renderRepair(c = this.repairCost()) {
            const body = $('repairBody'); if (!body) return;
            const f = Math.min(1, c.gold ? this.repairFund / c.gold : (c.max ? this.repairFund / c.max : 0));
            const pct = (f * 100).toFixed(1);
            const need = c.n ? `${c.n} building${c.n === 1 ? ' is' : 's are'} damaged. A full repair is <b>${fmt(c.gold)} gold</b>.` : 'Everything is in good shape.';
            const step = Math.max(50, Math.round((c.gold || c.max) / 10 / 50) * 50);
            const wait = this.enemies.length ? ' The fund pays out when the raiders are gone.' : '';
            const html = `<h2 id="modalTitle">Repair</h2>
                <div class="subtitle">${need}</div>
                <div class="rep-row"><span>Repair everything now</span><button type="button" class="btn ${c.n && this.res.gems >= c.gems ? 'good' : ''}" data-rep="gems" ${c.n ? '' : 'disabled'}>${ico('gem')}${c.n ? c.gems : 0} gem${c.gems === 1 ? '' : 's'}</button></div>
                <div><div class="rep-row"><b>Repair fund</b><span>${fmt(this.repairFund)} gold saved</span></div>
                <div class="bar"><span data-w="${pct}"></span><em>${c.n ? `${fmt(Math.min(this.repairFund, c.gold))} / ${fmt(c.gold)}` : `${fmt(this.repairFund)} saved for next time`}</em></div></div>
                <div class="rep-btns"><button type="button" class="btn small" data-rep="${step}">+${fmt(step)}</button><button type="button" class="btn small" data-rep="${step * 5}">+${fmt(step * 5)}</button><button type="button" class="btn small gold" data-rep="all">All my gold</button></div>
                <p class="hint">Put gold into the fund as you like. The moment it covers the damage, every building is mended, and anything left over stays saved.${wait} Upgrading a building also heals it completely.</p>`;
            if (setHtml(body, html)) fixBars(body);
        }

        // ---------- wave boons ----------
        showBoons(picks) {
            if (this.boonOpen || this.gameOverShown) return;
            const wasPaused = document.hidden ? !!this._wasPausedBeforeHide : this.paused;
            this.boonOpen = true; this.modalBlocking = true;
            this.paused = true; this.syncToggles();
            this.audio.levelup();
            const cards = picks.map((b, i) => {
                const n = this.boon(b.id);
                return `<button type="button" class="boon-card" data-boon="${b.id}">
                    <span class="boon-key">${i + 1}</span>${ico(b.ico)}
                    <b>${b.name}</b><span>${b.desc}</span>
                    <em>${b.instant ? 'Right now' : (n ? `You have x${n}` : 'Lasts this reign')}</em></button>`;
            }).join('');
            this.openPlainModal(`<h2 id="modalTitle">Raid spoils</h2>
                <div class="subtitle">Wave ${this.wave.number} is done. Pick one reward.</div>
                <div class="boon-row">${cards}</div>`);
            $('modalClose').hidden = true;
            const finish = (id) => {
                document.removeEventListener('keydown', onKey, true);
                this.boonOpen = false; this.modalBlocking = false;
                $('modalClose').hidden = false;
                this.closeModal();
                this.pickBoon(id);
                this.paused = wasPaused; this.lastTime = performance.now(); this.syncToggles();
            };
            const onKey = (e) => { const i = '123'.indexOf(e.key); if (i >= 0 && picks[i]) { e.preventDefault(); e.stopPropagation(); finish(picks[i].id); } };
            document.addEventListener('keydown', onKey, true);
            this.el.modalBody.querySelectorAll('[data-boon]').forEach(btn => btn.addEventListener('click', () => finish(btn.dataset.boon)));
            const first = this.el.modalBody.querySelector('[data-boon]'); if (first) first.focus({ preventScroll: true });
        }

        // reading help should not cost you a raid
        pauseForModal() { if (!this.paused && !this.boonOpen) { this.paused = true; this._modalPaused = true; this.syncToggles(); } }
        showShortcuts() {
            this.pauseForModal();
            const rows = [
                [['Space'], 'Collect every ready coin bubble'], [['F'], 'Freeze all raiders'], [['U'], 'Upgrade the selected building (or the cheapest one)'],
                [['P'], 'Pause / resume'], [['X'], 'Game speed x1 / x2 / x3 / x5'], [['N'], 'Start the next raid now'], [['Z'], 'Rest between raids (raids wait, collectors at half rate)'], [['K'], 'Repair everything'], [['E'], 'Row tool: pick a row or box, then move or delete it'], [['Delete'], 'Delete the selected building or picked group'], [['←', '↑', '↓', '→'], 'Nudge the selected building or group one tile'], [['W'], 'War Cry'], [['L'], 'Lightning, then click the map'],
                [['A'], 'Auto-collect on / off'], [['R'], 'Rally defenses'], [['M'], 'Sound on / off'], [['T'], 'Light / dark theme'],
                [['V'], 'Cycle the camera angle'], [['1', '2', '3', '4', '5'], 'Build · Upgrade · Kingdom · Co-op · Menu'],
                [['+', '−'], 'Zoom'], [['0'], 'Back to the Town Hall'], [['Esc'], 'Cancel, deselect, close'],
                [['Click'], 'Select a building (anywhere on its picture)'], [['Double-click'], 'Upgrade it right away'],
                [['Drag'], 'Pan the map, or move the selected building'], [['?'], 'How to play'],
            ];
            this.openPlainModal(`<h2 id="modalTitle">Keyboard and mouse</h2><div class="subtitle">Shortcuts work whenever you are not typing in a box.</div>
                <table class="keys">${rows.map(([k, w]) => `<tr><td>${k.map(x => `<kbd>${x}</kbd>`).join('')}</td><td>${w}</td></tr>`).join('')}</table>`);
        }
        showOfflineSummary(sec, got, capped) {
            const boxes = [['gold', 'Gold'], ['elixir', 'Elixir'], ['dark', 'Dark elixir']].filter(([k]) => got[k] >= 1)
                .map(([k, name]) => `<div class="stat-box ${k}"><div class="label">${name}</div><div class="value">${ico(RES_ICON[k])}+${fmt(got[k])}</div></div>`).join('');
            this.openPlainModal(`<h2 id="modalTitle">Welcome back</h2>
                <div class="subtitle">You were away for ${fmtDuration(sec)}. ${boxes ? 'The kingdom kept working:' : 'Your storage was already full, so nothing new came in.'}</div>
                ${boxes ? `<div class="stat-grid away-grid">${boxes}</div>` : ''}
                <div class="modal-hint">${capped ? 'Earnings stop after 4 hours away and never go past your storage.' : 'Time away pays half the live rate, up to 4 hours, within your storage.'}</div>
                <div class="modal-actions center"><button class="btn good" id="awayOk" type="button">Back to the kingdom</button></div>`);
            const ok = $('awayOk');
            ok.addEventListener('click', () => { this.audio.click(); this.closeModal(); });
            ok.focus({ preventScroll: true });
        }
        openBuildingModal(b) {
            const def = BLD[b.type];
            const stats = [];
            if (def.maxLevel > 1) stats.push(['Level', `${b.level} / ${def.maxLevel}`]);
            if (!def.decor) stats.push(['Health', `${fmt(Math.ceil(b.hp))} / ${fmt(b.maxHp)}`]);
            for (const s of this.levelStats(b.type, b.level)) stats.push([s.label, s.f(s.v)]);
            if (def.defense) { const d = def.defense(b.level); stats.push(['Cooldown', d.cd + 's']); if (d.splash) stats.push(['Splash radius', d.splash + ' tiles']); if (d.minRange) stats.push(['Dead zone', d.minRange + ' tiles']); stats.push(['Targets', b.type === 'airdef' ? 'Flying only' : (b.type === 'cannon' || b.type === 'mortar' ? 'Ground only' : 'Ground and air')]); }
            const tier = tierOf(b.type, b.level);
            this.openPlainModal(`<h2 id="modalTitle">${def.name}</h2><div class="subtitle">${def.desc}</div>
                <div class="modal-pic"><img alt="" src="${this.thumbURL(b.type)}" width="96" height="96"></div>
                <div class="stat-grid">${stats.map(([l, v]) => `<div class="stat-box"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('')}</div>
                ${def.maxLevel > 1 ? `<div class="modal-hint">Appearance changes at levels ${[1, ...U.tierLevels(b.type)].join(', ')} (now look ${tier} of ${U.tierCount(b.type)}).</div>` : ''}`);
            this.modalBuilding = b;
        }

        showConfirm(opts = {}) {
            if (this._confirmCleanup) this._confirmCleanup();
            let el = $('confirmDialog');
            if (!el) {
                el = document.createElement('div');
                el.id = 'confirmDialog'; el.className = 'confirm-dialog';
                el.innerHTML = `<div class="confirm-backdrop"></div>
                    <div class="confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmBody">
                        <div class="confirm-icon" aria-hidden="true"></div>
                        <h2 class="confirm-title" id="confirmTitle"></h2>
                        <div class="confirm-body" id="confirmBody"></div>
                        <div class="confirm-actions"><button class="btn" type="button" data-act="no"></button><button class="btn good" type="button" data-act="yes"></button></div>
                    </div>`;
                document.body.appendChild(el);
            }
            const panel = el.querySelector('.confirm-panel');
            el.querySelector('.confirm-icon').innerHTML = ico(opts.icon || 'warn');
            el.querySelector('.confirm-title').textContent = opts.title || 'Confirm';
            el.querySelector('.confirm-body').innerHTML = opts.body || '';
            const yes = el.querySelector('[data-act="yes"]'), no = el.querySelector('[data-act="no"]');
            yes.textContent = opts.yesText || 'Confirm'; no.textContent = opts.noText || 'Cancel';
            yes.className = 'btn ' + (opts.danger ? 'danger' : 'good');
            panel.classList.toggle('danger', !!opts.danger);
            const back = el.querySelector('.confirm-backdrop');
            const returnFocus = document.activeElement;
            const close = () => {
                this._confirmCleanup = null;
                el.classList.remove('open');
                if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
                yes.removeEventListener('click', onYes); no.removeEventListener('click', onNo); back.removeEventListener('click', onNo);
                document.removeEventListener('keydown', onKey);
            };
            const onYes = () => { close(); if (opts.onYes) opts.onYes(); };
            const onNo = () => { close(); if (opts.onNo) opts.onNo(); };
            const onKey = (e) => {
                if (e.key === 'Escape') onNo();
                if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') onYes();
            };
            yes.addEventListener('click', onYes); no.addEventListener('click', onNo); back.addEventListener('click', onNo);
            document.addEventListener('keydown', onKey);
            this._confirmCleanup = () => { this._confirmCleanup = null; yes.removeEventListener('click', onYes); no.removeEventListener('click', onNo); back.removeEventListener('click', onNo); document.removeEventListener('keydown', onKey); el.classList.remove('open'); };
            void el.offsetWidth;
            el.classList.add('open');
            (opts.danger ? no : yes).focus({ preventScroll: true });
        }
    }

    K.UI = UI;
})(window.KOE = window.KOE || {});
