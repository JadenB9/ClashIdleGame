/* ============================================================
   Co-op (PeerJS) and save / load. Mixed into Game.prototype.
   ============================================================ */
(function (K) {
    'use strict';
    const { CFG, BLD, ACHS, NOTATIONS, VIEWS, PERKS } = K.data;
    const U = K.util;
    const { fmt, fmtTime, fmtDuration, safeNum, cleanStr, cleanInt } = U;

    class Net {
        initCoop() {
            this.bindCoopUI();
            if (typeof Peer === 'undefined') {
                console.warn('PeerJS not loaded, co-op disabled');
                const codeEl = document.getElementById('gameCode');
                if (codeEl) codeEl.textContent = 'OFFLINE';
                this.setRelayStatus('offline', 'Co-op offline — the PeerJS script did not load');
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
                    this.coop.reconnectTries = 0;
                    this.setRelayStatus('ready', 'Ready — share your code');
                });

                peer.on('connection', (conn) => {
                    this.handleIncomingConnection(conn);
                });

                // Lost the signalling server (sleep, a network change). A partner
                // link already up is direct WebRTC and keeps going; new ones
                // can't be made until we're back, so get back.
                peer.on('disconnected', () => {
                    if (this.coop.peer !== peer) return;
                    this.setRelayStatus('lost', 'Relay lost — reconnecting…');
                    this.scheduleReconnect(peer);
                });

                peer.on('close', () => {
                    if (this.coop.peer === peer && !this.coop.reconnectTimer) this.setRelayStatus('offline', 'Co-op offline');
                });

                peer.on('error', (err) => {
                    const type = err && err.type;
                    if (type === 'unavailable-id') {
                        // Someone else holds this code right now: roll a new one
                        this.coop.code = genCode();
                        if (codeEl) codeEl.textContent = this.coop.code;
                        this.coop.peer = null;
                        peer.destroy();
                        this.coop.peer = createPeer(this.coop.code);
                    } else if (type === 'peer-unavailable') {
                        // The code we tried isn't online. PeerJS reports this on
                        // the Peer, not the connection, so the 12s timeout used
                        // to be the only feedback.
                        clearTimeout(this._connectTimer);
                        this.audio.error();
                        this.toast('Nobody is online with that code', 'error');
                    } else if (type === 'browser-incompatible') {
                        this.setRelayStatus('offline', 'Co-op needs a browser with WebRTC');
                    } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
                        this.setRelayStatus('error', 'Relay unreachable — co-op offline');
                        this.scheduleReconnect(peer);
                    } else if (type === 'webrtc') {
                        clearTimeout(this._connectTimer);
                        this.toast('Connection failed — the two networks could not link up', 'error');
                    } else {
                        console.warn('Peer error:', type, err && err.message);
                    }
                });

                return peer;
            };
            this._createPeer = createPeer;

            try {
                this.coop.peer = createPeer(this.coop.code);
            } catch (e) {
                console.warn('Co-op init failed:', e);
                this.setRelayStatus('offline', 'Co-op offline — this browser cannot open a peer link');
            }
        }

        // Try the relay again with backoff (2s, 4s, 8s ... up to 30s, five tries).
        // A peer that never got through was torn down by PeerJS, so it needs
        // a fresh object; one that was connected before can just reconnect.
        scheduleReconnect(peer) {
            if (this.coop.reconnectTimer || this.coop.peer !== peer || !this._createPeer) return;
            const tries = this.coop.reconnectTries++;
            if (tries >= 5) {
                this.setRelayStatus('error', 'Relay unreachable — reload the page to retry co-op');
                return;
            }
            const wait = Math.min(30000, 2000 * Math.pow(2, tries));
            this.coop.reconnectTimer = setTimeout(() => {
                this.coop.reconnectTimer = null;
                if (this.coop.peer !== peer) return;
                this.setRelayStatus('lost', 'Reconnecting to relay…');
                if (peer.destroyed) {
                    this.coop.peer = this._createPeer(this.coop.code);
                } else if (peer.disconnected) {
                    try { peer.reconnect(); } catch (e) { this.coop.peer = this._createPeer(this.coop.code); }
                }
            }, wait);
        }

        setRelayStatus(state, text) {
            this.coop.relay = state;
            this.coop.relayText = text;
            this.updateCoopUI();
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
                    if (!/^[A-Z0-9]{6}$/.test(code)) {
                        this.toast('Codes are 6 letters and digits', 'warn');
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
            const peer = this.coop.peer;
            if (!peer) { this.toast('Co-op not available', 'error'); return; }
            if (this.coop.connected) { this.toast('Already connected', 'warn'); return; }
            if (peer.destroyed || peer.disconnected) {
                this.toast('Not on the relay yet — trying to reconnect', 'warn');
                this.scheduleReconnect(peer);
                return;
            }

            this.toast('Connecting...', 'warn');
            let conn = null;
            try {
                conn = peer.connect('ember_' + code, {
                    metadata: { name: this.player.name, level: this.player.level, code: this.coop.code }
                });
            } catch (e) { /* handled below */ }
            if (!conn) { this.toast('Could not start the connection', 'error'); return; }

            clearTimeout(this._connectTimer);
            this._connectTimer = setTimeout(() => {
                if (!this.coop.connected) {
                    this.toast('Connection timed out — is your partner online?', 'error');
                    try { conn.close(); } catch (_) {}
                }
            }, 12000);

            conn.on('open', () => {
                clearTimeout(this._connectTimer);
                this.setupConnection(conn);
                conn.send({ type: 'hello', name: this.player.name, level: this.player.level });
            });

            conn.on('error', () => {
                clearTimeout(this._connectTimer);
                this.toast('Connection failed — check the code', 'error');
            });
        }

        handleIncomingConnection(conn) {
            if (this.coop.connected || this.coop.pendingInvite) {
                // A data channel can't carry anything until it opens, so the old
                // send-then-close here never actually told them we were busy
                conn.on('open', () => {
                    try { conn.send({ type: 'busy' }); } catch (_) {}
                    setTimeout(() => { try { conn.close(); } catch (_) {} }, 300);
                });
                return;
            }
            // Metadata is whatever the other browser put there
            const meta = (conn.metadata && typeof conn.metadata === 'object') ? conn.metadata : {};
            const name = cleanStr(meta.name, 24, 'A player');
            const level = cleanInt(meta.level, 1, 1, 999);
            this.coop.pendingInvite = conn;

            conn.on('open', () => {
                if (this.coop.pendingInvite === conn) this.showInviteNotification(name, level);
            });

            // They gave up, or their tab closed, before we answered
            const withdrawn = () => {
                if (this.coop.pendingInvite !== conn) return;
                this.coop.pendingInvite = null;
                this.hideInviteNotification();
                this.toast('Invite withdrawn', 'warn');
            };
            conn.on('close', withdrawn);
            conn.on('error', withdrawn);

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

            this.openPanel("coop");
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

        // Everything here arrived over a data channel from another browser.
        // Only the shape we expect gets through, every number is clamped and
        // every string is cut short, and it only ever lands via textContent.
        handleCoopData(data) {
            if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

            switch (data.type) {
                case 'hello':
                    this.toast(`${cleanStr(data.name, 24, 'Partner')} (Lv ${cleanInt(data.level, 1, 1, 999)}) joined!`, 'success');
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
                case 'state': {
                    // The honest client sends one every 2s; don't let a flood redraw the panel
                    const now = performance.now();
                    if (now - this.coop.lastStateAt < 400) return;
                    this.coop.lastStateAt = now;
                    const s = this.sanitizePeerState(data.state);
                    if (!s) return;
                    this.coop.partnerState = s;
                    this.updatePartnerPanel();
                    break;
                }
                case 'gift':
                    this.receiveGift(data.resource, data.amount, cleanStr(data.from, 24, 'Your partner'));
                    break;
            }
        }

        // Copy only the fields the partner panel draws, each checked, into a fresh object
        sanitizePeerState(s) {
            if (!s || typeof s !== 'object') return null;
            const res = (s.res && typeof s.res === 'object') ? s.res : {};
            const wave = (s.wave && typeof s.wave === 'object') ? s.wave : {};
            const buildings = [];
            if (Array.isArray(s.buildings)) {
                // No more entries than the grid has tiles; anything past that is junk
                for (const b of s.buildings.slice(0, CFG.gridW * CFG.gridH)) {
                    if (!b || typeof b !== 'object' || typeof b.type !== 'string' || !Object.hasOwn(BLD, b.type)) continue;
                    const def = BLD[b.type];
                    const maxHp = cleanInt(b.maxHp, 1, 1, 1e9);
                    buildings.push({
                        type: b.type,
                        tx: cleanInt(b.tx, 0, 0, CFG.gridW - 1),
                        ty: cleanInt(b.ty, 0, 0, CFG.gridH - 1),
                        level: cleanInt(b.level, 1, 1, def.maxLevel),
                        hp: cleanInt(b.hp, maxHp, 0, maxHp),
                        maxHp,
                    });
                }
            }
            return {
                name: cleanStr(s.name, 24, 'Partner'),
                level: cleanInt(s.level, 1, 1, 999),
                res: {
                    gold: safeNum(Number(res.gold), 0), elixir: safeNum(Number(res.elixir), 0),
                    dark: safeNum(Number(res.dark), 0), gems: safeNum(Number(res.gems), 0),
                },
                buildings,
                wave: { number: cleanInt(wave.number, 0, 0, 1e6), active: wave.active === true, timer: safeNum(Number(wave.timer), 0, 0, 1e6) },
                enemies: cleanInt(s.enemies, 0, 0, 999),
                dayCount: cleanInt(s.dayCount, 1, 1, 1e9),
                boost: s.boost === true,
                warCry: s.warCry === true,
            };
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
            // Gifts come straight off the wire from another browser, so don't
            // trust them: only real resources, only sane positive amounts.
            if (!['gold', 'elixir', 'dark', 'gems'].includes(resource)) return;
            amount = Math.floor(Number(amount));
            if (!Number.isFinite(amount) || amount < 1) return;
            if (resource === 'gems') amount = 1; // the send button only ever gives 1
            amount = this.addRes(resource, amount);
            this.audio.levelup();
            this.toast(`${String(from || 'Your partner').slice(0, 40)} sent you ${fmt(amount)} ${this.resSymbol(resource)}!`, 'success');
            this.pulseRes(resource);
            this.showAlert(`♦ GIFT: +${fmt(amount)} ${resource.toUpperCase()} ♦`, 2);
            this.updateUI();
        }

        updateCoopUI() {
            const connected = this.coop.connected;
            const panel = document.getElementById('coopConnected');
            const disconnected = document.getElementById('coopDisconnected');
            if (panel) panel.hidden = !connected;
            if (disconnected) disconnected.hidden = connected;

            const codeEl = document.getElementById('gameCode');
            if (codeEl && this.coop.code) codeEl.textContent = this.coop.code;

            // While there's no partner the status line reports the relay instead
            const statusEl = this.el.coopStatus;
            if (statusEl) {
                if (connected) {
                    statusEl.textContent = 'Connected';
                    statusEl.className = 'coop-status online';
                } else {
                    const cls = { connecting: 'pending', lost: 'pending', ready: 'offline', error: 'error', offline: 'error' }[this.coop.relay] || 'offline';
                    statusEl.textContent = this.coop.relayText || 'Not Connected';
                    statusEl.className = 'coop-status ' + cls;
                }
            }
        }

        updatePartnerPanel() {
            const s = this.coop.partnerState;
            if (!s) return;

            const nameEl = document.getElementById('partnerName');
            if (nameEl) nameEl.textContent = `${s.name} · Lv ${s.level}`;

            // Partner state went through sanitizePeerState() on arrival; it still
            // only ever lands via textContent
            const resEl = document.getElementById('partnerRes');
            if (resEl) {
                const r = s.res || {};
                resEl.replaceChildren(...[
                    ['gold', '◈', r.gold], ['elixir', '❂', r.elixir], ['dark', '✦', r.dark], ['gem', '♦', r.gems],
                ].map(([cls, sym, v]) => {
                    const span = document.createElement('span');
                    span.className = 'p-res ' + cls;
                    span.textContent = `${sym} ${fmt(Number(v))}`;
                    return span;
                }));
            }

            const waveEl = document.getElementById('partnerWave');
            if (waveEl && s.wave) {
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
            // Painted with the chrome colors so it matches the panel in both themes
            const css = getComputedStyle(document.documentElement);
            const tone = (name, fallback) => css.getPropertyValue(name).trim() || fallback;

            // Background
            ctx.fillStyle = tone('--panel-2', '#0f1525');
            ctx.fillRect(0, 0, w, h);

            // Grid lines
            ctx.strokeStyle = tone('--line', '#2e3854');
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= CFG.gridW; x++) {
                ctx.beginPath(); ctx.moveTo(x * cellW, 0); ctx.lineTo(x * cellW, h); ctx.stroke();
            }
            for (let y = 0; y <= CFG.gridH; y++) {
                ctx.beginPath(); ctx.moveTo(0, y * cellH); ctx.lineTo(w, y * cellH); ctx.stroke();
            }

            // Buildings
            if (Array.isArray(state.buildings)) {
                for (const b of state.buildings) {
                    if (!b || !Object.hasOwn(BLD, b.type)) continue;
                    const def = BLD[b.type];
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
                        ctx.strokeStyle = tone('--panel-border', '#ffc857');
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 0.5, y + 0.5, bw, bh);
                    }
                }
            }

            // Enemy count indicator
            if (state.enemies > 0) {
                ctx.fillStyle = tone('--danger', '#ff5d5d');
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
        // Save format versions (the localStorage key never changes, the version
        // lives inside the data so old saves keep loading):
        //   v3 — original format
        //   v4 — adds settings (sound, auto-collect)
        //   v5 — adds the number format (settings.notation)
        //   v6 — ascension (meta), quests, view / x-ray / auto-upgrade settings
        snapshot() {
            // Sanitize wave timer on write so a stale game-over value never leaks into saves
            const sanitizedTimer = Math.max(5, Math.min(this.wave.timer || CFG.waveBaseSec, Math.max(CFG.waveBaseSec, 120)));
            return {
                v: CFG.saveVersion,
                res: this.res,
                player: this.player,
                buildings: this.buildings.map(b => ({ id: b.id, type: b.type, tx: b.tx, ty: b.ty, level: b.level, hp: b.hp, maxHp: b.maxHp })),
                stats: this.stats,
                achievements: this.achievements,
                wave: { number: this.wave.number, timer: sanitizedTimer },
                dayTime: this.dayTime,
                dayCount: this.dayCount,
                cam: { zoom: this.cam.zoom },
                settings: {
                    sound: !this.audio.muted, autoCollect: this.autoCollect, notation: K.data.state.notation,
                    view: this.settings.view, xray: this.settings.xray, autoUpgrade: this.settings.autoUpgrade,
                    levelTags: this.settings.levelTags, hints: this.settings.hints,
                },
                meta: { crowns: this.crowns, perks: this.perks, ascensions: this.ascensions, crownsEver: this.crownsEver },
                quests: this.quests.map(q => ({ kind: q.kind, target: q.target, start: q.start, gems: q.gems, done: !!q.done })),
                // While the tab is hidden the game is frozen, so the clock for
                // offline earnings starts when it was hidden, not when we saved
                savedAt: (document.hidden && this._hiddenAt) || Date.now(),
            };
        }

        save() {
            // Reset / import reload the page; the pagehide save must not undo them
            if (this.saveLocked) return false;
            try {
                const raw = JSON.stringify(this.snapshot());
                const prev = localStorage.getItem(CFG.saveKey);
                localStorage.setItem(CFG.saveKey, raw);
                if (prev && prev !== raw) localStorage.setItem(CFG.saveKey + '.bak', prev);
                this._saveWarned = false;
                return true;
            } catch (e) {
                console.error('Save failed', e);
                if (!this._saveWarned) {
                    this._saveWarned = true;
                    this.toast('Could not save — browser storage is full or blocked. Use Export to keep a copy.', 'error');
                }
                return false;
            }
        }

        parseSave(raw) {
            const d = JSON.parse(raw);
            if (!d || typeof d !== 'object' || !d.res || typeof d.res !== 'object' || !Array.isArray(d.buildings)) {
                throw new Error('not a Kingdom of Ember save');
            }
            return this.migrateSave(d);
        }

        migrateSave(d) {
            const v = Number(d.v) || 3;
            if (v < 4) d.settings = { sound: true, autoCollect: false };
            if (v < 5) {
                if (!d.settings || typeof d.settings !== 'object') d.settings = { sound: true, autoCollect: false };
                d.settings.notation = 'short';
            }
            if (v < 6) {
                if (!d.settings || typeof d.settings !== 'object') d.settings = {};
                d.settings.view = 'balanced';
                d.settings.xray = true;
                d.settings.autoUpgrade = 'off';
                d.meta = { crowns: 0, perks: {}, ascensions: 0, crownsEver: 0 };
                d.quests = [];
            }
            d.v = CFG.saveVersion;
            return d;
        }

        loadSave() {
            let raw = null, bak = null;
            try {
                raw = localStorage.getItem(CFG.saveKey);
                bak = localStorage.getItem(CFG.saveKey + '.bak');
            } catch (e) { /* storage blocked */ }
            this.hadSave = !!(raw || bak);
            if (!raw && !bak) { this.placeInitial(); return; }
            if (raw && this.tryLoad(raw)) return;
            if (raw) { try { localStorage.setItem(CFG.saveKey + '.corrupt', raw); } catch (_) { /* ignore */ } }
            if (bak && this.tryLoad(bak)) {
                this.save();
                setTimeout(() => this.toast('Your save was damaged, so the backup from just before it was restored.', 'warn'), 800);
                return;
            }
            this.placeInitial();
            setTimeout(() => this.toast('Your save could not be read, so a new kingdom was started. The old data was kept as a backup.', 'error'), 800);
        }

        tryLoad(raw) {
            let d;
            try { d = this.parseSave(raw); } catch (e) { console.warn('Save could not be read', e); return false; }
            try { this.applySave(d); return true; }
            catch (e) { console.error('Load failed', e); this.resetState(); return false; }
        }

        // Back to the constructor's starting values (after a failed load)
        resetState() {
            this.res = { gold: 500, elixir: 150, dark: 0, gems: 5 };
            this.player = { level: 1, xp: 0, name: 'Chief' };
            this.buildings = [];
            for (const k in this.stats) this.stats[k] = 0;
            this.achievements = {};
            this.crowns = 0; this.crownsEver = 0; this.perks = {}; this.ascensions = 0;
            this.quests = [];
            this.wave.number = 0; this.wave.timer = 90; this.wave.active = false;
            this.dayTime = 0.25; this.dayCount = 1;
            this.cam.zoom = 1;
            this.audio.muted = false; this.autoCollect = false;
            K.data.state.notation = 'short';
            this.occDirty = true;
            this.recomputeRates();
        }

        applySave(d) {
            const r = d.res;
            for (const k of ['gold', 'elixir', 'dark', 'gems']) this.res[k] = safeNum(r[k], this.res[k]);
            this.res.gems = Math.floor(this.res.gems);

            const p = d.player || {};
            this.player.level = Math.floor(safeNum(p.level, 1, 1, 999));
            this.player.xp = safeNum(p.xp, 0);
            if (typeof p.name === 'string') this.player.name = p.name.slice(0, 24);

            const st = d.stats || {};
            for (const k in this.stats) this.stats[k] = safeNum(st[k], 0);
            const ach = d.achievements || {};
            for (const a of ACHS) if (ach[a.id] === true) this.achievements[a.id] = true;

            const w = d.wave || {};
            this.wave.number = Math.floor(safeNum(w.number, 0, 0, 1e6));
            this.wave.timer = safeNum(w.timer, this.wave.timer, 5, Math.max(CFG.waveBaseSec, 120));
            this.dayTime = safeNum(d.dayTime, this.dayTime, 0, 0.9999);
            this.dayCount = Math.floor(safeNum(d.dayCount, 1, 1));
            this.cam.zoom = safeNum(d.cam && d.cam.zoom, 1, CFG.zoomMin, CFG.zoomMax);

            const s = d.settings || {};
            this.audio.muted = s.sound === false;
            this.autoCollect = s.autoCollect === true;
            K.data.state.notation = NOTATIONS.includes(s.notation) ? s.notation : 'short';
            this.settings.view = Object.hasOwn(VIEWS, s.view) ? s.view : 'balanced';
            this.settings.xray = s.xray !== false;
            this.settings.autoUpgrade = ['off', 'economy', 'defense', 'all'].includes(s.autoUpgrade) ? s.autoUpgrade : 'off';
            this.settings.levelTags = s.levelTags === 'hover' ? 'hover' : 'always';
            this.settings.hints = s.hints !== false;

            const m = d.meta || {};
            this.crowns = Math.floor(safeNum(m.crowns, 0, 0, 1e9));
            this.crownsEver = Math.floor(safeNum(m.crownsEver, this.crowns, 0, 1e9));
            this.ascensions = Math.floor(safeNum(m.ascensions, 0, 0, 1e6));
            this.perks = {};
            for (const k in PERKS) this.perks[k] = Math.floor(safeNum(m.perks && m.perks[k], 0, 0, PERKS[k].max));

            this.quests = [];
            if (Array.isArray(d.quests)) {
                for (const q of d.quests.slice(0, 3)) {
                    const kind = q && K.data.QUEST_KINDS.find(k => k.id === q.kind);
                    if (!kind) continue;
                    this.quests.push({
                        kind: kind.id, target: Math.floor(safeNum(q.target, 10, 1, 1e12)),
                        start: safeNum(q.start, 0), gems: Math.floor(safeNum(q.gems, 2, 1, 50)), done: q.done === true,
                    });
                }
            }

            this.buildings = [];
            this.occDirty = true;
            this.rebuildOcc();
            for (const sb of d.buildings) {
                if (!sb || !Object.hasOwn(BLD, sb.type)) continue; // a type that no longer exists
                const def = BLD[sb.type];
                if (!Number.isInteger(sb.tx) || !Number.isInteger(sb.ty)) continue;
                if (!this.canPlace(sb.type, sb.tx, sb.ty)) continue;
                if (def.maxCount && this.countOf(sb.type) >= def.maxCount) continue;
                const level = Math.floor(safeNum(sb.level, 1, 1, def.maxLevel));
                const maxHp = this.hpFor(sb.type, level);
                const hp = safeNum(sb.hp, maxHp, 0, maxHp);
                this.buildings.push({
                    id: typeof sb.id === 'string' ? sb.id.slice(0, 16) : Math.random().toString(36).slice(2, 9),
                    type: sb.type, tx: sb.tx, ty: sb.ty, level,
                    hp: hp > 0 ? hp : maxHp, maxHp, lastShot: 0, build: 1,
                });
                this.occDirty = true; this.rebuildOcc();
            }
            this.fillQuests();
            this.recomputeRates();
            this.applyOfflineEarnings((Date.now() - safeNum(d.savedAt, Date.now())) / 1000);
            if (!this.buildings.some(b => b.type === 'townhall')) setTimeout(() => this.gameOver(), 400);
        }

        // Pay out production for time the game wasn't running. Half rate, capped at 4 hours.
        applyOfflineEarnings(sec) {
            if (!(sec > 10)) return null;
            const t = Math.min(sec, CFG.offlineMaxSec);
            const got = {};
            for (const k of ['gold', 'elixir', 'dark']) got[k] = this.addRes(k, this.rates[k] * t * CFG.offlineRate);
            this.stats.goldEarned += got.gold;
            const parts = [];
            if (got.gold >= 1) parts.push(`${fmt(got.gold)} gold`);
            if (got.elixir >= 1) parts.push(`${fmt(got.elixir)} elixir`);
            if (got.dark >= 1) parts.push(`${fmt(got.dark)} dark`);
            const away = fmtDuration(sec) + (sec > CFG.offlineMaxSec ? ' (earnings cap at 4h)' : '');
            const anyRate = this.rates.gold + this.rates.elixir + this.rates.dark > 0;
            if (sec >= CFG.offlineSummarySec && anyRate) {
                setTimeout(() => this.showOfflineSummary(sec, got, sec > CFG.offlineMaxSec), 800);
            } else if (parts.length) {
                setTimeout(() => this.toast(`Away ${away}: +${parts.join(' · ')}`, 'success'), 800);
            } else if (anyRate) {
                setTimeout(() => this.toast(`Away ${away} — storage was already full`, 'warn'), 800);
            }
            return got;
        }

        placeInitial() {
            const cx = Math.floor(CFG.gridW / 2) - 1;
            const cy = Math.floor(CFG.gridH / 2) - 1;
            const push = (type, tx, ty) => {
                const def = BLD[type];
                this.buildings.push({
                    id: Math.random().toString(36).slice(2, 9), type, tx, ty, level: 1,
                    hp: def.baseHP, maxHp: def.baseHP, lastShot: 0, build: 1,
                });
            };
            this.buildings = [];
            push('townhall', cx, cy);
            push('goldmine', cx - 3, cy);
            push('goldmine', cx - 3, cy + 2);
            push('elixirwell', cx + 3, cy);
            push('cannon', cx + 3, cy + 3);
            push('cannon', cx - 3, cy - 2);
            this.occDirty = true;
            this.rebuildOcc();
            this.recomputeRates();
        }

        exportSave() {
            this.save();
            const raw = JSON.stringify(this.snapshot());
            const blob = new Blob([raw], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kingdom-of-ember-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this.toast('Save exported', 'success');
        }

        importSave(file) {
            if (!file) return;
            if (file.size > 1024 * 1024) { this.audio.error(); this.toast('That file is too big to be a save', 'error'); return; }
            const reader = new FileReader();
            reader.onload = () => {
                let d;
                try { d = this.parseSave(String(reader.result)); }
                catch (e) { this.audio.error(); this.toast("That file isn't a Kingdom of Ember save", 'error'); return; }
                const lv = Math.floor(safeNum(d.player && d.player.level, 1, 1, 999));
                const wave = Math.floor(safeNum(d.wave && d.wave.number, 0, 0, 1e6));
                this.showConfirm({
                    title: 'Import Save', icon: 'import',
                    body: `Load the kingdom from this file (level ${lv}, wave ${wave}, ${d.buildings.length} buildings)?<br><br><span class="warn-text">Your current kingdom will be replaced. Export it first if you want to keep it.</span>`,
                    yesText: 'Import', noText: 'Cancel', danger: true,
                    onYes: () => {
                        this.saveLocked = true;
                        try {
                            const prev = localStorage.getItem(CFG.saveKey);
                            localStorage.setItem(CFG.saveKey, JSON.stringify(d));
                            if (prev) localStorage.setItem(CFG.saveKey + '.bak', prev);
                        } catch (e) { this.saveLocked = false; this.toast('Could not write the save to browser storage', 'error'); return; }
                        location.reload();
                    },
                });
            };
            reader.onerror = () => this.toast('Could not read that file', 'error');
            reader.readAsText(file);
        }

        // Erase everything, ascension progress included
        wipeSave() {
            this.saveLocked = true;
            try {
                localStorage.removeItem(CFG.saveKey);
                localStorage.removeItem(CFG.saveKey + '.bak');
            } catch (_) { /* ignore */ }
            location.reload();
        }
    }

    K.installMixin = (Game, Mixin) => {
        for (const k of Object.getOwnPropertyNames(Mixin.prototype)) {
            if (k !== 'constructor') Object.defineProperty(Game.prototype, k, Object.getOwnPropertyDescriptor(Mixin.prototype, k));
        }
    };
    K.Net = Net;
})(window.KOE = window.KOE || {});
