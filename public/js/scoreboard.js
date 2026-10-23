/* ============================================================
   Public scoreboard. Players who pick a name send their best
   figures to j4den's API every couple of minutes; anyone can read
   the list. Mixed into Game.prototype.
   ============================================================ */
(function (K) {
    'use strict';
    const U = K.util;
    const { fmt, fmtDuration, cleanStr } = U;

    const API = 'https://api.j4den.com/api/clashidle/scores';
    const STORE = 'kingdomOfEmber.board';
    const SORTS = [
        ['level', 'Level'], ['xp', 'XP'], ['wave', 'Wave'], ['crowns', 'Crowns'], ['kills', 'Kills'], ['gold', 'Gold'],
    ];
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    class Scoreboard {
        // { key: the player's secret, on: sharing, pid: the public id the server gave back }
        boardState() {
            if (this._board) return this._board;
            let b = null;
            try { b = JSON.parse(localStorage.getItem(STORE)); } catch (_) { /* private mode or bad data */ }
            if (!b || typeof b.key !== 'string' || b.key.length < 22) {
                const bytes = new Uint8Array(24);
                crypto.getRandomValues(bytes);
                b = { key: btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''), on: false, pid: '' };
            }
            this._board = b;
            return b;
        }
        saveBoardState() {
            try { localStorage.setItem(STORE, JSON.stringify(this._board)); } catch (_) { /* ignore */ }
        }

        // The figures that go on the board: bests and lifetime totals only
        boardStats() {
            this.noteBest();
            const S = this.stats;
            return {
                name: this.player.name,
                level: this.best.level, wave: this.best.wave,
                xp: Math.floor(S.xpEarned), gold: Math.floor(S.goldEarned),
                ascensions: this.ascensions, crowns: this.crownsEver,
                kills: S.kills, bosses: S.bosses, wavesCleared: S.wavesCleared, maxCombo: S.maxCombo,
                achievements: Object.keys(this.achievements).length,
                upgrades: S.upgrades, built: S.built, playTime: Math.floor(S.playTime),
            };
        }

        // Send this player's figures. Quietly does nothing unless they joined; the board is a bonus, never an error.
        async boardSubmit(opts = {}) {
            const b = this.boardState();
            if (!b.on || !this.player.name || this.player.name === 'Chief') return false;
            if (this._boardBusy) return false;
            this._boardBusy = true;
            try {
                const res = await fetch(API, {
                    method: 'POST', keepalive: !!opts.keepalive,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: b.key, ...this.boardStats() }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.pid) { if (b.pid !== data.pid) { b.pid = data.pid; this.saveBoardState(); } return true; }
                return false;
            } catch (_) { return false; } finally { this._boardBusy = false; }
        }

        initBoard() {
            this.boardState();
            setInterval(() => { if (!document.hidden) this.boardSubmit(); }, 120000);
            setTimeout(() => this.boardSubmit(), 8000);
            document.addEventListener('visibilitychange', () => { if (document.hidden) this.boardSubmit({ keepalive: true }); });
        }

        async boardLeave() {
            const b = this.boardState();
            b.on = false; b.pid = ''; this.saveBoardState();
            try { await fetch(API, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: b.key }) }); } catch (_) { /* the row ages out of sight only if this fails; the next join replaces it */ }
        }

        async boardJoin(name) {
            name = cleanStr(name, 20, '').trim();
            if (name.length < 2) { this.toast('Pick a name of at least 2 letters', 'warn'); return false; }
            this.player.name = name;
            const b = this.boardState(); b.on = true; this.saveBoardState();
            this.save();
            return this.boardSubmit();
        }

        async openBoard(sort) {
            this.audio.click();
            sort = SORTS.some(s => s[0] === sort) ? sort : (this._boardSort || 'level');
            this._boardSort = sort;
            const b = this.boardState();
            const named = this.player.name && this.player.name !== 'Chief';
            const panel = this.el.modal.querySelector('.modal-panel');
            this.openPlainModal(`<h2 id="modalTitle">Scoreboard</h2>
                <div class="subtitle">Every player's best. Public: anyone can see it.</div>
                <div class="board-me">${b.on
                    ? `<span>Playing as <b>${esc(this.player.name)}</b></span><button class="btn small" id="boardRename" type="button">Change name</button><button class="btn small danger" id="boardLeave" type="button">Remove me</button>`
                    : `<input id="boardName" class="board-name" type="text" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Your name" value="${named ? esc(this.player.name) : ''}" aria-label="Your name for the scoreboard"><button class="btn good small" id="boardJoin" type="button">Join the board</button>`}
                </div>
                <div class="seg board-sorts" role="group" aria-label="Sort by" id="boardSorts">${SORTS.map(([k, l]) => `<button class="seg-btn" type="button" data-sort="${k}" aria-pressed="${k === sort}">${l}</button>`).join('')}</div>
                <div id="boardList" class="board-list"><p class="hint">Loading…</p></div>
                <p class="hint board-note">Figures are what each browser reports, so treat it as friendly competition. Your name and these stats are the only things shared.</p>`);
            panel.classList.add('wide');
            const $ = (id) => document.getElementById(id);
            const joinBtn = $('boardJoin'), nameIn = $('boardName');
            if (joinBtn) {
                const go = async () => { joinBtn.disabled = true; const ok = await this.boardJoin(nameIn.value); if (ok) { this.toast('You are on the scoreboard', 'success'); } else if (this.boardState().on) this.toast('Could not reach the scoreboard yet. It will keep trying.', 'warn'); this.openBoard(sort); };
                joinBtn.addEventListener('click', go);
                nameIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
            }
            const leave = $('boardLeave');
            if (leave) leave.addEventListener('click', async () => { await this.boardLeave(); this.toast('Removed from the scoreboard', 'success'); this.openBoard(sort); });
            const rename = $('boardRename');
            if (rename) rename.addEventListener('click', () => { const b2 = this.boardState(); b2.on = false; this.saveBoardState(); this.openBoard(sort); });
            $('boardSorts').addEventListener('click', (e) => { const s = e.target.closest('[data-sort]'); if (s) this.openBoard(s.dataset.sort); });
            this.loadBoard(sort);
        }

        async loadBoard(sort) {
            const box = document.getElementById('boardList'); if (!box) return;
            let data = null;
            try {
                const res = await fetch(`${API}?sort=${sort}&limit=100`);
                if (res.ok) data = await res.json();
            } catch (_) { /* offline */ }
            if (!document.getElementById('boardList') || this._boardSort !== sort) return;
            if (!data) { box.innerHTML = '<p class="hint">The scoreboard cannot be reached right now. Try again in a moment.</p>'; return; }
            if (!data.players.length) { box.innerHTML = '<p class="hint">Nobody is on the board yet. Join it and be first.</p>'; return; }
            const mine = this.boardState().pid;
            const cols = [['level', 'Lv', (p) => p.level], ['xp', 'XP', (p) => fmt(p.xp)], ['wave', 'Wave', (p) => p.wave], ['crowns', 'Crowns', (p) => p.crowns], ['kills', 'Kills', (p) => fmt(p.kills)], ['gold', 'Gold', (p) => fmt(p.gold)]];
            const rows = data.players.map((p, i) => `<tr class="${p.pid === mine ? 'me' : ''}">
                <td class="rk">${i + 1}</td>
                <td class="nm"><b>${esc(p.name)}</b>${p.pid === mine ? ' <em>you</em>' : ''}<small>${p.ascensions} ascension${p.ascensions === 1 ? '' : 's'} · ${fmt(p.bosses)} golems · ${fmt(p.wavesCleared)} waves cleared · combo x${p.maxCombo} · ${p.achievements} achievements · ${fmtDuration(p.playTime)}</small></td>
                ${cols.map(([k, , f]) => `<td class="${k === sort ? 'on' : ''}">${f(p)}</td>`).join('')}</tr>`).join('');
            box.innerHTML = `<div class="board-scroll"><table class="board"><thead><tr><th>#</th><th>Player</th>${cols.map(([k, l]) => `<th class="${k === sort ? 'on' : ''}">${l}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
                <p class="hint">${data.total} player${data.total === 1 ? '' : 's'}${data.total > data.players.length ? `, top ${data.players.length} shown` : ''}.</p>`;
        }
    }

    K.Scoreboard = Scoreboard;
})(window.KOE = window.KOE || {});
