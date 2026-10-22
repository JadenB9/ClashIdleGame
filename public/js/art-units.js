/* ============================================================
   Moving art: raiders, the Treasure Goblin, turret parts that
   aim, and the little animated bits that hang off buildings
   (flags, fire, smoke, sparkles, window glow).
   Everything here draws straight to a canvas context every frame.
   ============================================================ */
(function (K) {
    'use strict';
    const A = K.art;
    const U = K.util;
    const { shade } = U;
    const TAU = Math.PI * 2;

    // ---------- small drawing helpers ----------
    const limb = (g, x0, y0, x1, y1, w, col, edge = 'rgba(20,10,10,0.8)') => {
        g.lineCap = 'round';
        g.strokeStyle = edge; g.lineWidth = w + 1.6;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    const blob = (g, x, y, rx, ry, col, edge = 'rgba(20,10,10,0.8)', rot = 0) => {
        const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 0.5, x, y, Math.max(rx, ry) * 1.1);
        gr.addColorStop(0, shade(col, 1.3)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, 0.62));
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill();
        if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.stroke(); }
    };
    const eye = (g, x, y, r, pupil = '#111', iris = '#fff') => {
        g.fillStyle = iris; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.fillStyle = pupil; g.beginPath(); g.arc(x + r * 0.25, y, r * 0.5, 0, TAU); g.fill();
    };
    const flame = (g, x, y, s, t, seed = 0) => {
        const f = (k) => 1 + Math.sin(t * 9 + seed + k) * 0.14;
        const layers = [['#e8381a', 1], ['#ff8a1c', 0.72], ['#ffd84a', 0.42]];
        for (const [col, k] of layers) {
            const h = 15 * s * k * f(k * 4), w = 6.5 * s * k;
            g.fillStyle = col;
            g.beginPath();
            g.moveTo(x, y - h);
            g.quadraticCurveTo(x + w * 1.1, y - h * 0.35, x + w * 0.7, y);
            g.quadraticCurveTo(x, y + w * 0.35, x - w * 0.7, y);
            g.quadraticCurveTo(x - w * 1.1, y - h * 0.35, x, y - h);
            g.fill();
        }
    };

    // ======================================================
    // RAIDERS
    // ======================================================
    // Humanoid rig. Feet at (0,0), facing +x (flip with scale before calling).
    const humanoid = (g, p, ph, atk) => {
        const s = p.s;
        g.save(); g.scale(s, s);
        const sw = Math.sin(ph) * 3.4, bob = Math.abs(Math.cos(ph)) * 1.1;
        // legs
        limb(g, -2.4, -8, -2.4 - sw, -0.5, p.legW || 3, p.pants);
        limb(g, 2.4, -8, 2.4 + sw, -0.5, p.legW || 3, p.pants);
        g.fillStyle = p.boots || '#2a1c10';
        g.beginPath(); g.ellipse(-2.4 - sw + 0.8, 0, 2.8, 1.5, 0, 0, TAU); g.ellipse(2.4 + sw + 0.8, 0, 2.8, 1.5, 0, 0, TAU); g.fill();
        g.translate(0, -bob);
        // back arm (hangs)
        limb(g, -4, -15, -5.5 + sw * 0.3, -8.5, p.armW || 2.8, p.skin);
        // torso
        const bw = p.bulk;
        const tg = g.createLinearGradient(-bw, 0, bw, 0);
        tg.addColorStop(0, shade(p.cloth, 1.2)); tg.addColorStop(1, shade(p.cloth, 0.62));
        g.fillStyle = tg; g.strokeStyle = 'rgba(20,10,10,0.8)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-bw, -7.5); g.quadraticCurveTo(-bw - 1, -12, -bw + 0.6, -16.5); g.lineTo(bw - 0.6, -16.5); g.quadraticCurveTo(bw + 1, -12, bw, -7.5); g.closePath(); g.fill(); g.stroke();
        if (p.belly) { blob(g, 1, -10.5, bw * 0.8, 4.2, p.skin, null); }
        if (p.armor) {
            g.fillStyle = p.armor; g.strokeStyle = 'rgba(10,10,14,0.8)';
            g.beginPath(); g.moveTo(-bw - 1.4, -15); g.lineTo(-bw + 3.2, -17); g.lineTo(-bw + 3.2, -12.5); g.lineTo(-bw - 0.6, -11.5); g.closePath(); g.fill(); g.stroke();
            g.beginPath(); g.moveTo(bw + 1.4, -15); g.lineTo(bw - 3.2, -17); g.lineTo(bw - 3.2, -12.5); g.lineTo(bw + 0.6, -11.5); g.closePath(); g.fill(); g.stroke();
        }
        if (p.ribs) {
            g.strokeStyle = '#6a604c'; g.lineWidth = 0.9;
            for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-bw + 1, -14 + i * 2.4); g.lineTo(bw - 1, -14 + i * 2.4); g.stroke(); }
            g.beginPath(); g.moveTo(0, -16); g.lineTo(0, -8.5); g.stroke();
        }
        if (p.belt) { g.fillStyle = p.belt; g.fillRect(-bw, -9.2, bw * 2, 1.8); }
        // head
        const hy = -19.2, hr = p.head;
        if (p.ears) {
            g.fillStyle = p.skin; g.strokeStyle = 'rgba(20,10,10,0.8)'; g.lineWidth = 0.9;
            g.beginPath(); g.moveTo(-hr + 0.6, hy - 1); g.lineTo(-hr - p.ears, hy - 3.6); g.lineTo(-hr + 0.8, hy + 2); g.closePath(); g.fill(); g.stroke();
            g.beginPath(); g.moveTo(hr - 0.6, hy - 1); g.lineTo(hr + p.ears, hy - 3.6); g.lineTo(hr - 0.8, hy + 2); g.closePath(); g.fill(); g.stroke();
        }
        if (p.horns) {
            g.fillStyle = '#e8dcc0'; g.strokeStyle = 'rgba(20,10,10,0.8)'; g.lineWidth = 0.9;
            for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * hr * 0.6, hy - hr * 0.8); g.quadraticCurveTo(d * (hr + 3), hy - hr - 1, d * (hr + 2.4), hy - hr - 5); g.quadraticCurveTo(d * (hr - 0.4), hy - hr - 1.4, d * hr * 0.2, hy - hr * 0.9); g.fill(); g.stroke(); }
        }
        blob(g, 0, hy, hr, hr * 0.94, p.skin);
        if (p.hair) { g.fillStyle = p.hair; g.beginPath(); g.ellipse(0, hy - hr * 0.55, hr * 0.95, hr * 0.5, 0, Math.PI, 0); g.fill(); }
        if (p.helm) {
            g.fillStyle = p.helm; g.strokeStyle = 'rgba(10,10,14,0.85)'; g.lineWidth = 1;
            g.beginPath(); g.ellipse(0, hy - 1, hr + 0.6, hr, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
        }
        if (p.hat) {                 // wizard or witch: wide brim and a pointed, slightly bent cone
            g.fillStyle = p.hat; g.strokeStyle = 'rgba(10,6,20,0.9)'; g.lineWidth = 0.9;
            g.beginPath(); g.ellipse(0, hy - hr * 0.55, hr * 1.5, hr * 0.42, 0, 0, TAU); g.fill(); g.stroke();
            g.beginPath(); g.moveTo(-hr * 0.9, hy - hr * 0.6); g.quadraticCurveTo(-hr * 0.2, hy - hr * 2.2, hr * 0.5 + (p.hatBend || 0), hy - hr * 3.1); g.quadraticCurveTo(hr * 0.5, hy - hr * 1.8, hr * 0.9, hy - hr * 0.6); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = p.hatBand || '#e8c35a'; g.fillRect(-hr * 0.8, hy - hr * 1.02, hr * 1.6, hr * 0.28);
        }
        // face (toward +x)
        if (p.skull) {
            g.fillStyle = '#16120e';
            g.beginPath(); g.ellipse(-hr * 0.15, hy - 0.4, 1.6, 2, 0, 0, TAU); g.ellipse(hr * 0.55, hy - 0.4, 1.6, 2, 0, 0, TAU); g.fill();
            g.fillStyle = '#ff5a3a'; g.beginPath(); g.arc(hr * 0.55, hy - 0.4, 0.6, 0, TAU); g.fill();
            g.strokeStyle = '#16120e'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hr * 0.1, hy + 3.4); g.lineTo(hr * 0.8, hy + 3.4); g.stroke();
        } else {
            eye(g, -hr * 0.1, hy - 0.8, 1.7, '#111', p.eyeCol || '#fff');
            eye(g, hr * 0.55, hy - 0.8, 1.7, '#111', p.eyeCol || '#fff');
            g.strokeStyle = 'rgba(20,10,10,0.9)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(-hr * 0.35, hy - 2.6); g.lineTo(hr * 0.2, hy - 1.8); g.moveTo(hr * 0.35, hy - 1.8); g.lineTo(hr * 0.8, hy - 2.6); g.stroke();
            // mouth with tusks/teeth
            g.fillStyle = '#2a0a0a'; g.beginPath(); g.ellipse(hr * 0.28, hy + 2.6, hr * 0.45, 1.3, 0, 0, TAU); g.fill();
            g.fillStyle = '#f4efe0';
            if (p.tusks) { g.beginPath(); g.moveTo(-hr * 0.1, hy + 2.2); g.lineTo(-hr * 0.05, hy - 0.8); g.lineTo(hr * 0.12, hy + 2.2); g.fill(); g.beginPath(); g.moveTo(hr * 0.5, hy + 2.2); g.lineTo(hr * 0.62, hy - 0.8); g.lineTo(hr * 0.78, hy + 2.2); g.fill(); }
            else { g.fillRect(hr * 0.1, hy + 1.9, 1, 1.2); g.fillRect(hr * 0.5, hy + 1.9, 1, 1.2); }
        }
        // front arm + weapon, swinging on attack
        const ang = -0.9 + atk * 2.2 + Math.sin(ph) * 0.12;
        const ax = 4.4, ay = -15.2;
        const hx = ax + Math.cos(ang) * 7, hy2 = ay + Math.sin(ang) * 7;
        limb(g, ax, ay, hx, hy2, p.armW || 2.8, p.skin);
        g.save(); g.translate(hx, hy2); g.rotate(ang + 0.2);
        const wp = p.weapon;
        if (wp === 'dagger') { limb(g, 0, 0, 7, 0, 1.6, '#c8ccd8'); g.fillStyle = '#4a3020'; g.fillRect(-1, -1.4, 2.4, 2.8); }
        else if (wp === 'club') { limb(g, -1, 0, 9, 0, 2.4, '#7a5230'); blob(g, 11, 0, 4.2, 3.4, '#8a6238'); }
        else if (wp === 'spiked') { limb(g, -1, 0, 10, 0, 2.6, '#6a4424'); blob(g, 12, 0, 4.6, 3.8, '#6a4424'); g.fillStyle = '#c8ccd8'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.moveTo(12 + Math.cos(a) * 4, Math.sin(a) * 3.4); g.lineTo(12 + Math.cos(a) * 7, Math.sin(a) * 6); g.lineTo(12 + Math.cos(a + 0.4) * 4, Math.sin(a + 0.4) * 3.4); g.fill(); } }
        else if (wp === 'trunk') { limb(g, -2, 0, 12, 0, 4.4, '#6a4a2a'); blob(g, 13, 0, 5.4, 4.6, '#7a5632'); }
        else if (wp === 'sword') { limb(g, 0, 0, p.bigSword ? 13 : 9, 0, p.bigSword ? 2.6 : 1.8, '#d8dcea'); limb(g, 0, 0, 1.2, 0, 4.4, '#8a6a2a'); }
        else if (wp === 'staff') { limb(g, -2, 0, 10, 0, 1.6, '#6a4a2a'); const pu = 0.5 + 0.5 * Math.sin(ph * 2); g.fillStyle = p.orb || '#7ad8ff'; g.beginPath(); g.arc(11.5, 0, 2.4 + pu * 0.6, 0, TAU); g.fill(); g.strokeStyle = 'rgba(10,10,20,0.8)'; g.lineWidth = 0.7; g.stroke(); }
        else if (wp === 'bomb') {
            blob(g, 5, 0, 4.2, 4.2, '#1c1c24', 'rgba(0,0,0,0.9)');
            g.strokeStyle = '#c8b890'; g.lineWidth = 1; g.beginPath(); g.moveTo(5, -4); g.quadraticCurveTo(7, -7, 9, -6); g.stroke();
            g.fillStyle = (ph * 4 | 0) % 2 ? '#ffd84a' : '#ff6a2a'; g.beginPath(); g.arc(9, -6, 1.5, 0, TAU); g.fill();
        }
        else if (wp === 'bow') {
            g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.6; g.beginPath(); g.arc(3, 0, 6.4, -Math.PI / 2, Math.PI / 2); g.stroke();
            g.strokeStyle = '#d8d0b8'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(3, -6.4); g.lineTo(3 - atk * 0 - 1.4, 0); g.lineTo(3, 6.4); g.stroke();
        }
        g.restore();
        g.restore();
    };

    const wolf = (g, e, ph, atk) => {
        const s = e.size / 10;
        g.save(); g.scale(s, s);
        const sw = Math.sin(ph * 1.4) * 4, bob = Math.abs(Math.sin(ph * 1.4)) * 1.6;
        const fur = '#7a7a86';
        limb(g, -9, -7, -9 - sw, 0, 3, shade(fur, 0.7)); limb(g, 7, -7, 7 + sw, 0, 3, shade(fur, 0.7));
        g.translate(0, -bob);
        // tail
        g.strokeStyle = shade(fur, 0.75); g.lineWidth = 3.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-14, -11); g.quadraticCurveTo(-21, -14 + Math.sin(ph) * 3, -22, -8); g.stroke();
        blob(g, -1, -9.4, 14, 6, fur);
        blob(g, 5, -11, 8, 4.6, shade(fur, 1.15), null);
        limb(g, -7, -6, -7 + sw, 0.5, 3.2, fur); limb(g, 9, -6, 9 - sw, 0.5, 3.2, fur);
        // head
        blob(g, 13, -13, 6, 5.2, fur);
        blob(g, 18.4, -11.4, 4.2, 2.8, shade(fur, 1.2));
        g.fillStyle = '#111'; g.beginPath(); g.arc(22, -12, 1.2, 0, TAU); g.fill();
        g.fillStyle = shade(fur, 0.65); g.strokeStyle = 'rgba(10,10,14,0.8)'; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(10, -16.5); g.lineTo(11, -22); g.lineTo(14.5, -17); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#ffcc40'; g.beginPath(); g.arc(15, -14, 1.3, 0, TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(15.4, -14, 0.6, 0, TAU); g.fill();
        if (atk > 0.3) { g.fillStyle = '#f4efe0'; g.fillRect(19, -10.2, 1, 1.8); g.fillRect(21, -10.2, 1, 1.8); }
        g.restore();
    };

    const golem = (g, e, ph, atk) => {
        const s = e.size / 26;
        g.save(); g.scale(s, s);
        const sw = Math.sin(ph) * 3.4, bob = Math.abs(Math.cos(ph)) * 1.4;
        const rock = '#7e7a86';
        const boulder = (x, y, rx, ry, c) => { blob(g, x, y, rx, ry, c, 'rgba(14,12,18,0.9)'); g.fillStyle = 'rgba(90,150,70,0.55)'; g.beginPath(); g.ellipse(x - rx * 0.2, y - ry * 0.7, rx * 0.6, ry * 0.22, 0, 0, TAU); g.fill(); };
        boulder(-8 - sw, -7, 7, 7.5, shade(rock, 0.8)); boulder(8 + sw, -7, 7, 7.5, shade(rock, 0.8));
        g.translate(0, -bob);
        boulder(-17, -22 + atk * -6, 6, 8.5, shade(rock, 0.85));
        boulder(0, -25, 14, 15, rock);
        // lava cracks
        g.strokeStyle = '#ff8a1c'; g.lineWidth = 1.8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-6, -34); g.lineTo(-2, -26); g.lineTo(-7, -19); g.moveTo(5, -33); g.lineTo(3, -25); g.lineTo(8, -17); g.stroke();
        g.strokeStyle = '#ffe070'; g.lineWidth = 0.7; g.stroke();
        boulder(18 + atk * 5, -22 - atk * 8, 7.5, 9, shade(rock, 0.85));
        boulder(1, -41, 8, 7.4, shade(rock, 1.1));
        g.fillStyle = '#ffb030'; g.beginPath(); g.ellipse(-2.4, -41.5, 1.9, 1.3, 0, 0, TAU); g.ellipse(5.6, -41.5, 1.9, 1.3, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,170,40,0.4)'; g.beginPath(); g.arc(1.6, -41.5, 8, 0, TAU); g.fill();
        g.restore();
    };

    const bat = (g, e, ph) => {
        const s = e.size / 8;
        g.save(); g.scale(s, s);
        const flap = Math.sin(ph * 2.6);
        const wing = (d) => {
            g.fillStyle = '#4a2a52'; g.strokeStyle = 'rgba(14,6,18,0.9)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(d * 2, -2);
            g.quadraticCurveTo(d * 9, -9 - flap * 6, d * 15, -3 - flap * 8);
            g.lineTo(d * 12, -1 - flap * 4); g.lineTo(d * 9, 1 - flap * 2); g.lineTo(d * 6, 0.4); g.lineTo(d * 3, 2);
            g.closePath(); g.fill(); g.stroke();
        };
        wing(-1); wing(1);
        blob(g, 0, 0, 3.6, 4.2, '#5a3a62');
        g.fillStyle = '#5a3a62'; g.beginPath(); g.moveTo(-2.6, -3); g.lineTo(-2.6, -6.4); g.lineTo(-0.6, -3.4); g.moveTo(2.6, -3); g.lineTo(2.6, -6.4); g.lineTo(0.6, -3.4); g.fill();
        g.fillStyle = '#ff4a4a'; g.beginPath(); g.arc(-1.3, -1, 0.9, 0, TAU); g.arc(1.3, -1, 0.9, 0, TAU); g.fill();
        g.fillStyle = '#f4efe0'; g.fillRect(-1.2, 1.2, 0.7, 1.4); g.fillRect(0.5, 1.2, 0.7, 1.4);
        g.restore();
    };

    const dragon = (g, e, ph, atk) => {
        const s = e.size / 16;
        g.save(); g.scale(s, s);
        const flap = Math.sin(ph * 1.5);
        const red = '#c83a2a';
        // tail
        g.strokeStyle = shade(red, 0.7); g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-8, -2); g.quadraticCurveTo(-18, 4 + Math.sin(ph) * 3, -22, -4); g.stroke();
        g.fillStyle = '#e8c35a'; g.beginPath(); g.moveTo(-22, -4); g.lineTo(-27, -7); g.lineTo(-24, -1); g.closePath(); g.fill();
        // wings (far, near)
        const wing = (dx, dark) => {
            g.fillStyle = dark ? shade('#7a2a4a', 0.8) : '#9a3a5a'; g.strokeStyle = 'rgba(20,6,12,0.9)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(dx, -6);
            g.quadraticCurveTo(dx - 10, -18 - flap * 9, dx - 22, -10 - flap * 14);
            g.lineTo(dx - 17, -6 - flap * 6); g.lineTo(dx - 13, -3 - flap * 3); g.lineTo(dx - 8, -2); g.closePath(); g.fill(); g.stroke();
            g.strokeStyle = 'rgba(20,6,12,0.7)'; g.beginPath(); g.moveTo(dx, -6); g.lineTo(dx - 22, -10 - flap * 14); g.moveTo(dx, -6); g.lineTo(dx - 17, -6 - flap * 6); g.stroke();
        };
        wing(-2, true);
        blob(g, 0, -2, 11, 6.4, red);
        blob(g, 2, 0.4, 8, 3.8, '#f0c070', null);
        wing(4, false);
        // neck and head
        g.strokeStyle = red; g.lineWidth = 5.4; g.beginPath(); g.moveTo(7, -4); g.quadraticCurveTo(12, -9, 14, -9); g.stroke();
        blob(g, 16, -9, 5.4, 4, red);
        blob(g, 20.6, -8, 3.4, 2.4, shade(red, 1.15));
        g.fillStyle = '#e8dcc0'; g.beginPath(); g.moveTo(14, -12.4); g.lineTo(11, -17); g.lineTo(16.6, -12.8); g.closePath(); g.fill();
        g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(17, -10, 1.3, 0, TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(17.3, -10, 0.6, 0, TAU); g.fill();
        if (atk > 0.2) { flame(g, 25, -8, 0.8 + atk * 0.5, e.wobble || 0); }
        g.restore();
    };

    // Hog Rider: a charging boar with a mohawked rider. Runs on the wolf's stride.
    const hog = (g, e, ph, atk) => {
        const s = e.size / 14;
        g.save(); g.scale(s, s);
        const sw = Math.sin(ph * 1.5) * 4, bob = Math.abs(Math.sin(ph * 1.5)) * 1.4;
        const fur = '#b07a68';
        limb(g, -7, -6, -7 - sw, 0, 3.4, shade(fur, 0.7)); limb(g, 8, -6, 8 + sw, 0, 3.4, shade(fur, 0.7));
        g.save(); g.translate(0, -bob);
        blob(g, 0, -9, 14, 7, fur);
        blob(g, 2, -8, 9, 4.4, shade(fur, 1.18), null);
        limb(g, -6, -5, -6 + sw, 0.5, 3.6, fur); limb(g, 10, -5, 10 - sw, 0.5, 3.6, fur);
        blob(g, 15, -10, 6.4, 5.6, fur);
        blob(g, 20.4, -8.6, 4, 3.2, shade(fur, 1.25));
        g.fillStyle = '#2a1a1a'; g.beginPath(); g.arc(22, -9, 0.9, 0, TAU); g.arc(22.6, -7.4, 0.9, 0, TAU); g.fill();
        g.fillStyle = '#f4efe0'; g.beginPath(); g.moveTo(18, -6.4); g.lineTo(20.6, -3.2); g.lineTo(21, -6.4); g.fill();
        g.fillStyle = '#ffcc40'; g.beginPath(); g.arc(16, -12, 1.2, 0, TAU); g.fill();
        g.strokeStyle = '#4a3030'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, -11); g.quadraticCurveTo(-18, -13, -17, -8); g.stroke();
        // the rider
        g.save(); g.translate(1, -13); g.scale(0.78, 0.78);
        humanoid(g, { s: 1, skin: '#e8b890', cloth: '#7a2a2a', pants: '#3a2a20', head: 5.2, bulk: 4.6, weapon: 'club', belt: '#2a1c10', hair: '#3a78d8', armor: '#c8a040' }, ph * 0.4, atk);
        g.restore();
        g.restore();
        g.restore();
    };

    // Balloon: a striped envelope with a basket of bombs
    const balloon = (g, e, ph, atk) => {
        const s = e.size / 17, sway = Math.sin(ph * 0.8) * 1.2;
        g.save(); g.scale(s, s); g.translate(sway, 0);
        g.strokeStyle = '#6a4a2a'; g.lineWidth = 0.9;
        for (const dx of [-6, -2, 2, 6]) { g.beginPath(); g.moveTo(dx * 0.9, -17); g.lineTo(dx * 0.35, -4); g.stroke(); }
        const env = g.createRadialGradient(-6, -34, 2, 0, -28, 22);
        env.addColorStop(0, '#ff9a7a'); env.addColorStop(0.55, '#d8382e'); env.addColorStop(1, '#7a1612');
        g.fillStyle = env; g.strokeStyle = 'rgba(30,6,6,0.9)'; g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(-3, -17); g.bezierCurveTo(-24, -22, -22, -48, 0, -50); g.bezierCurveTo(22, -48, 24, -22, 3, -17); g.closePath(); g.fill(); g.stroke();
        g.save(); g.clip();
        g.strokeStyle = 'rgba(255,230,160,0.8)'; g.lineWidth = 2.2;
        for (const dx of [-12, -4, 4, 12]) { g.beginPath(); g.moveTo(dx * 0.35, -17); g.quadraticCurveTo(dx * 1.7, -32, dx * 0.6, -50); g.stroke(); }
        g.restore();
        g.fillStyle = '#7a5230'; g.strokeStyle = '#2a1a0c'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, -5); g.lineTo(4, 1.5); g.lineTo(-4, 1.5); g.closePath(); g.fill(); g.stroke();
        blob(g, -1.2, -7, 2.4, 2.4, '#1c1c24', 'rgba(0,0,0,0.9)'); blob(g, 2.2, -6.6, 1.9, 1.9, '#1c1c24', 'rgba(0,0,0,0.9)');
        if (atk > 0.2) { g.fillStyle = 'rgba(255,170,40,0.7)'; g.beginPath(); g.arc(0, 6 + (1 - atk) * 8, 3 + atk * 2, 0, TAU); g.fill(); }
        g.restore();
    };

    const KINDS = {
        barbarian:{ s: 1.0, skin: '#f0c8a0', cloth: '#a8782e', pants: '#5a3e24', head: 5.4, bulk: 4.8, hair: '#f2d24a', weapon: 'sword', belt: '#2a1c10' },
        archer:   { s: 0.95, skin: '#f0c8a0', cloth: '#3a8a4a', pants: '#5a3a2a', head: 5.2, bulk: 3.8, hair: '#ff7aa8', weapon: 'bow', belt: '#2a1c10' },
        giant:    { s: 1.5, skin: '#e0b088', cloth: '#8a4a2a', pants: '#4a3020', head: 5.8, bulk: 8, belly: true, hair: '#7a4a1a', weapon: 'club', armW: 4.4, legW: 4.8, belt: '#2a1c10' },
        wallbreaker: { s: 0.9, skin: '#e8e0c8', cloth: '#d8d0b8', pants: '#e0d8c0', head: 5.2, bulk: 3.6, skull: true, ribs: true, weapon: 'bomb', legW: 2, armW: 2, boots: '#bdb49a' },
        wizard:   { s: 1.0, skin: '#f0c8a0', cloth: '#3a5ad0', pants: '#2a3a8a', head: 5.2, bulk: 4, weapon: 'staff', hat: '#2f4ab8', orb: '#ff9a4a', belt: '#e8c35a' },
        witch:    { s: 1.05, skin: '#b8c8d0', cloth: '#5a2a6a', pants: '#3a1a48', head: 5.2, bulk: 4.2, weapon: 'staff', hat: '#4a2060', hatBand: '#9a5ad0', hatBend: 1.6, orb: '#b070ff', belt: '#9a5ad0' },
        minion:   { s: 0.75, skin: '#e8e0c8', cloth: '#cfc6ac', pants: '#d8d0b8', head: 5.2, bulk: 3.2, skull: true, ribs: true, weapon: 'dagger', legW: 2, armW: 2, boots: '#bdb49a' },
        pekka:    { s: 1.7, skin: '#5a6070', cloth: '#2a2e48', pants: '#2a2e48', head: 6, bulk: 8.6, armor: '#6a7088', helm: '#4a5068', horns: true, weapon: 'sword', bigSword: true, eyeCol: '#8ae0ff', legW: 4.6, armW: 4.4, belt: '#1a1a28' },
        goblin:   { s: 0.9, skin: '#7fb23a', cloth: '#6a4a2a', pants: '#4a3a24', head: 5.4, bulk: 4.4, ears: 5, weapon: 'dagger', belt: '#2a1c10' },
        orc:      { s: 1.15, skin: '#6a8a52', cloth: '#5a4a3a', pants: '#3a3028', head: 5.6, bulk: 6, armor: '#6a6e7a', weapon: 'club', tusks: true, belt: '#2a1c10', hair: '#222' },
        skeleton: { s: 1.0, skin: '#e8e0c8', cloth: '#d8d0b8', pants: '#e0d8c0', head: 5.2, bulk: 3.6, skull: true, ribs: true, weapon: 'bow', legW: 2, armW: 2, boots: '#bdb49a' },
        troll:    { s: 1.35, skin: '#8a7ab0', cloth: '#6a5a40', pants: '#4a4034', head: 6, bulk: 7.4, belly: true, weapon: 'trunk', tusks: true, hair: '#3a2a50', legW: 4, armW: 3.8 },
        ogre:     { s: 1.6, skin: '#b0825a', cloth: '#5a3a2a', pants: '#3a2a20', head: 6.2, bulk: 8.4, belly: true, weapon: 'spiked', tusks: true, horns: true, armor: '#4a4e5a', legW: 4.4, armW: 4.2, belt: '#1a1008' },
    };

    A.drawEnemy = (g, e, t) => {
        const ph = e.walk || 0;
        const dir = e.dir < 0 ? -1 : 1;
        g.save();
        g.translate(e.x, e.y);
        // ground contact: flyers hover over a faint shadow
        const fly = !!e.flying;
        if (fly) {
            g.fillStyle = 'rgba(0,0,0,0.26)';
            g.beginPath(); g.ellipse(0, e.air + 4, e.size * 0.9, e.size * 0.28, 0, 0, TAU); g.fill();
            g.translate(0, 0);
        } else {
            g.fillStyle = 'rgba(0,0,0,0.3)';
            g.beginPath(); g.ellipse(0, 1, e.size * 0.95, e.size * 0.32, 0, 0, TAU); g.fill();
        }
        g.scale(dir, 1);
        const atk = e.atkAnim || 0;
        if (e.kind === 'wolf') wolf(g, e, ph, atk);
        else if (e.kind === 'golem') golem(g, e, ph, atk);
        else if (e.kind === 'bat') bat(g, e, ph);
        else if (e.kind === 'dragon') dragon(g, e, ph, atk);
        else if (e.kind === 'hogrider') hog(g, e, ph, atk);
        else if (e.kind === 'balloon') balloon(g, e, ph, atk);
        else humanoid(g, KINDS[e.kind], ph, atk);
        if (e.slow > 0) {         // frost tint
            g.fillStyle = 'rgba(150,220,255,0.28)';
            g.beginPath(); g.ellipse(0, -e.size * 1.1, e.size * 0.8, e.size * 1.2, 0, 0, TAU); g.fill();
        }
        if (e.hit > 0) {
            g.fillStyle = `rgba(255,255,255,${Math.min(0.6, e.hit)})`;
            g.beginPath(); g.ellipse(0, -e.size * 1.1, e.size * 0.85, e.size * 1.25, 0, 0, TAU); g.fill();
        }
        g.restore();
    };

    // Health bar above a raider (screen-aligned)
    A.drawEnemyBar = (g, e) => {
        if (e.hp >= e.maxHp) return;
        const bw = Math.max(18, e.size * 2.2), top = e.y - e.size * 2.5 - (e.flying ? 0 : 2);
        g.fillStyle = 'rgba(10,6,6,0.8)';
        g.fillRect(e.x - bw / 2 - 1, top - 1, bw + 2, 5);
        g.fillStyle = '#3a1010'; g.fillRect(e.x - bw / 2, top, bw, 3);
        const f = Math.max(0, e.hp / e.maxHp);
        g.fillStyle = f > 0.5 ? '#7adf6a' : f > 0.25 ? '#ffc857' : '#ff5d5d';
        g.fillRect(e.x - bw / 2, top, bw * f, 3);
        if (e.boss) { g.strokeStyle = '#e8c35a'; g.lineWidth = 1; g.strokeRect(e.x - bw / 2 - 1, top - 1, bw + 2, 5); }
    };

    // The Treasure Goblin: a fat, nimble goblin with a bulging sack of gold
    A.drawTreasureGoblin = (g, o, t) => {
        g.save(); g.translate(o.x, o.y);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 1, 11, 3.6, 0, 0, TAU); g.fill();
        // sparkle halo so it can be spotted
        const pulse = 0.5 + 0.5 * Math.sin(t * 6);
        g.fillStyle = `rgba(255,220,90,${0.18 + pulse * 0.15})`; g.beginPath(); g.arc(0, -16, 22 + pulse * 3, 0, TAU); g.fill();
        g.scale(o.dir < 0 ? -1 : 1, 1.12 * (1.06 - 0.06 * Math.sin(o.ph * 2)));
        // sack
        blob(g, -7, -15, 9, 10, '#c8a050', 'rgba(40,24,6,0.9)');
        g.strokeStyle = '#6a4a1a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, -22); g.lineTo(-4, -22); g.stroke();
        g.fillStyle = '#ffd34a'; g.font = 'bold 10px Lilita One, sans-serif'; g.textAlign = 'center'; g.fillText('$', -7, -11);
        for (let i = 0; i < 3; i++) { g.fillStyle = '#ffd34a'; g.beginPath(); g.arc(-10 + i * 3, -24.5 - (i % 2) * 1.5, 1.8, 0, TAU); g.fill(); }
        humanoid(g, { s: 0.95, skin: '#9ad040', cloth: '#d8b030', pants: '#7a5a20', head: 5.4, bulk: 5.4, ears: 5.4, belly: true, weapon: null, belt: '#4a2a10', eyeCol: '#fff6c0' }, o.ph, 0);
        g.restore();
    };

    // ======================================================
    // TURRET PARTS (origin at the sprite's 'mount' anchor)
    // st: { ang, rec, fl, t, tier, hasTarget }
    // ======================================================
    const dyn = {};
    dyn.cannon = (g, st) => {
        const a = st.ang, twin = st.tier >= 3;
        g.save();
        g.scale(1.2, 1.2);
        // wheels
        for (const d of [-1, 1]) { g.fillStyle = '#4a3220'; g.strokeStyle = '#1c1008'; g.lineWidth = 1; g.beginPath(); g.ellipse(d * 7, 2, 3.4, 5, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#8a6a44'; g.beginPath(); g.ellipse(d * 7, 2, 1.2, 2, 0, 0, TAU); g.fill(); }
        g.rotate(a);
        const back = -st.rec * 5;
        const barrel = (off, sc) => {
            g.save(); g.translate(0, off); g.scale(1, sc);
            const gr = g.createLinearGradient(0, -5, 0, 5);
            gr.addColorStop(0, '#7a7a86'); gr.addColorStop(0.5, '#34343e'); gr.addColorStop(1, '#16161c');
            g.fillStyle = gr; g.strokeStyle = '#08080c'; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(-6 + back, -5.4); g.lineTo(15 + back, -4); g.lineTo(15 + back, 4); g.lineTo(-6 + back, 5.4); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(-4 + back, -4.4, 18, 1.4);
            g.fillStyle = st.tier >= 4 ? '#e8c35a' : '#8a8a96';
            g.fillRect(2 + back, -5, 1.8, 10); g.fillRect(9 + back, -4.4, 1.6, 8.8);
            g.fillStyle = '#0a0a0e'; g.beginPath(); g.ellipse(15 + back, 0, 1.8, 4, 0, 0, TAU); g.fill();
            g.fillStyle = '#2a2a32'; g.beginPath(); g.arc(-6 + back, 0, 4.4, 0, TAU); g.fill(); g.stroke();
            g.restore();
        };
        if (twin) { barrel(-3.6, 0.7); barrel(3.6, 0.7); } else barrel(0, 1);
        if (st.fl > 0) {
            const f = st.fl;
            g.fillStyle = `rgba(255,200,90,${f})`; g.beginPath();
            for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU, r = (i % 2 ? 5 : 11) * (0.7 + f * 0.6); g.lineTo(18 + Math.cos(ang) * r, Math.sin(ang) * r); }
            g.closePath(); g.fill();
            g.fillStyle = `rgba(255,250,220,${f})`; g.beginPath(); g.arc(18, 0, 3.4 * f + 1, 0, TAU); g.fill();
        }
        g.restore();
    };
    dyn.archer = (g, st) => {
        const a = st.ang, right = Math.cos(a) >= 0;
        g.save(); g.translate(0, 0);
        const sx = right ? 1 : -1;
        g.scale(sx, 1);
        // legs/body
        g.fillStyle = '#3a4a2a'; g.fillRect(-2.6, -4, 5.2, 4);
        const tg = g.createLinearGradient(-4, 0, 4, 0); tg.addColorStop(0, '#5aa04a'); tg.addColorStop(1, '#2c6a28');
        g.fillStyle = tg; g.strokeStyle = 'rgba(10,20,8,0.9)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-3.6, -4); g.lineTo(-3, -11); g.lineTo(3, -11); g.lineTo(3.6, -4); g.closePath(); g.fill(); g.stroke();
        blob(g, 0, -14.4, 3.4, 3.4, '#e8b88a');
        g.fillStyle = '#2c6a28'; g.beginPath(); g.moveTo(-3.9, -14.4); g.quadraticCurveTo(0, -22, 3.9, -14.4); g.lineTo(2, -13); g.lineTo(-2, -13); g.closePath(); g.fill(); g.stroke();
        // bow aimed at the target
        const ba = Math.atan2(Math.sin(a), Math.abs(Math.cos(a)));
        g.save(); g.translate(2, -10.4); g.rotate(ba);
        const draw = st.rec;
        g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.8; g.beginPath(); g.arc(3, 0, 7.6, -Math.PI / 2, Math.PI / 2); g.stroke();
        g.strokeStyle = '#e8e0c8'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(3, -7.6); g.lineTo(3 - draw * 6, 0); g.lineTo(3, 7.6); g.stroke();
        if (st.hasTarget || draw > 0) { g.strokeStyle = '#c8b890'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(3 - draw * 6, 0); g.lineTo(13, 0); g.stroke(); g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(15, 0); g.lineTo(12, -1.6); g.lineTo(12, 1.6); g.fill(); }
        g.restore();
        g.restore();
    };
    dyn.mortar = (g, st) => {
        const lean = Math.max(-0.5, Math.min(0.5, Math.cos(st.ang) * 0.4));
        g.save(); g.rotate(lean);
        const d = st.rec * 4;
        const gr = g.createLinearGradient(-8, 0, 8, 0);
        gr.addColorStop(0, '#6a6c7e'); gr.addColorStop(0.5, '#3a3c4a'); gr.addColorStop(1, '#1e1e28');
        g.fillStyle = gr; g.strokeStyle = '#0a0a10'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-7.4, -d); g.lineTo(-9, -15 - d); g.lineTo(9, -15 - d); g.lineTo(7.4, -d); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#16161e'; g.beginPath(); g.ellipse(0, -15 - d, 9, 3.6, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#7a7c8e'; g.fillRect(-8.4, -9 - d, 16.8, 2);
        if (st.fl > 0) { g.fillStyle = `rgba(255,190,80,${st.fl})`; g.beginPath(); g.arc(0, -19 - d, 7 * st.fl + 2, 0, TAU); g.fill(); g.fillStyle = `rgba(255,250,220,${st.fl})`; g.beginPath(); g.arc(0, -19 - d, 3.4 * st.fl, 0, TAU); g.fill(); }
        g.restore();
    };
    dyn.airdef = (g, st) => {
        g.save(); g.rotate(st.ang * 0.7);
        const rec = st.rec * 3;
        g.fillStyle = '#34343e'; g.strokeStyle = '#0a0a10'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-9, -7); g.lineTo(11 - rec, -9); g.lineTo(11 - rec, 9); g.lineTo(-9, 7); g.closePath(); g.fill(); g.stroke();
        for (let i = -1; i <= 1; i++) {
            g.fillStyle = '#1a1a22'; g.beginPath(); g.ellipse(11 - rec, i * 5.4, 2.4, 2.2, 0, 0, TAU); g.fill();
            g.fillStyle = '#d8dce8'; g.beginPath(); g.moveTo(14 - rec, i * 5.4); g.lineTo(8 - rec, i * 5.4 - 1.6); g.lineTo(8 - rec, i * 5.4 + 1.6); g.fill();
            g.fillStyle = '#e04a3a'; g.beginPath(); g.arc(14 - rec, i * 5.4, 1, 0, TAU); g.fill();
        }
        g.fillStyle = '#e8c35a'; g.fillRect(-8, -1, 5, 2);
        if (st.fl > 0) { g.fillStyle = `rgba(255,170,70,${st.fl})`; g.beginPath(); g.arc(-12, 0, 8 * st.fl, 0, TAU); g.fill(); }
        g.restore();
    };
    dyn.wizard = (g, st) => {
        const t = st.t, pulse = 0.5 + 0.5 * Math.sin(t * 3);
        const lift = Math.sin(t * 2) * 2.4;
        g.save(); g.translate(0, lift);
        const big = 1 + st.fl * 0.7;
        const gr = g.createRadialGradient(0, 0, 1, 0, 0, 19 * big);
        gr.addColorStop(0, `rgba(190,240,255,${0.65 + pulse * 0.2})`); gr.addColorStop(1, 'rgba(60,160,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 19 * big, 0, TAU); g.fill();
        blob(g, 0, 0, 7 * big, 7 * big, '#6ad0ff', '#12406a');
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-2, -2.4, 2.4, 0, TAU); g.fill();
        for (let i = 0; i < 3; i++) {
            const a = t * 2.2 + i * TAU / 3;
            g.fillStyle = '#c8f4ff'; g.beginPath(); g.arc(Math.cos(a) * 12, Math.sin(a) * 4.6, 1.6, 0, TAU); g.fill();
        }
        g.restore();
    };
    dyn.frost = (g, st) => {
        const t = st.t;
        g.save();
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        const gr = g.createRadialGradient(0, 8, 1, 0, 8, 28);
        gr.addColorStop(0, `rgba(190,240,255,${0.35 + pulse * 0.15 + st.fl * 0.4})`); gr.addColorStop(1, 'rgba(120,210,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 8, 28, 0, TAU); g.fill();
        if (st.fl > 0) { g.strokeStyle = `rgba(200,245,255,${st.fl})`; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 30, 10 + (1 - st.fl) * 90, (10 + (1 - st.fl) * 90) * 0.6, 0, 0, TAU); g.stroke(); }
        for (let i = 0; i < 6; i++) {
            const k = ((t * 0.5 + i / 6) % 1);
            g.fillStyle = `rgba(230,250,255,${1 - k})`;
            g.beginPath(); g.arc(Math.sin(i * 2.4) * 12, 28 - k * 40, 1.4, 0, TAU); g.fill();
        }
        g.restore();
    };
    dyn.tesla = (g, st) => {
        const t = st.t;
        g.save();
        const act = st.hasTarget ? 1 : 0.35;
        const gr = g.createRadialGradient(0, 0, 1, 0, 0, 22);
        gr.addColorStop(0, `rgba(200,225,255,${0.5 * act + st.fl * 0.4})`); gr.addColorStop(1, 'rgba(100,150,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
        g.strokeStyle = '#d8e8ff'; g.lineWidth = 1.2; g.lineCap = 'round';
        const arcs = st.hasTarget ? 5 : 2;
        for (let i = 0; i < arcs; i++) {
            const a = (st.hasTarget && i === 0 ? st.ang : Math.sin(t * 7 + i * 3.1) * TAU);
            const L = 10 + ((Math.sin(t * 13 + i * 5.7) + 1) * 0.5) * 12;
            g.beginPath(); g.moveTo(0, 0);
            let x = 0, y = 0;
            for (let k = 1; k <= 4; k++) { x = Math.cos(a) * L * k / 4 + Math.sin(t * 40 + k + i) * 2.4; y = Math.sin(a) * L * k / 4 * 0.8 + Math.cos(t * 37 + k * 2 + i) * 2.4; g.lineTo(x, y); }
            g.stroke();
        }
        g.restore();
    };
    dyn.xbow = (g, st) => {
        g.save(); g.rotate(st.ang);
        const pull = st.rec * 5;
        g.fillStyle = '#6a4424'; g.strokeStyle = '#1e1008'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-10, -2.6); g.lineTo(16, -1.8); g.lineTo(16, 1.8); g.lineTo(-10, 2.6); g.closePath(); g.fill(); g.stroke();
        // limbs
        g.strokeStyle = '#3a2410'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(8, -1); g.quadraticCurveTo(10, -10, 4, -17); g.moveTo(8, 1); g.quadraticCurveTo(10, 10, 4, 17); g.stroke();
        g.strokeStyle = '#c0a070'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(4, -17); g.lineTo(8 - pull, 0); g.lineTo(4, 17); g.stroke();
        g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(19, 0); g.lineTo(14, -1.8); g.lineTo(14, 1.8); g.fill();
        g.fillStyle = '#7a7a86'; g.fillRect(-4, -1, 14, 2);
        g.restore();
    };
    dyn.inferno = (g, st) => {
        const t = st.t, act = st.hasTarget ? 1 : 0.55;
        g.save();
        const gr = g.createRadialGradient(0, -6, 2, 0, -6, 30);
        gr.addColorStop(0, `rgba(255,170,60,${0.5 * act})`); gr.addColorStop(1, 'rgba(255,90,20,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, -6, 30, 0, TAU); g.fill();
        for (let i = -2; i <= 2; i++) flame(g, i * 5.4, -(Math.abs(i) * 1.2), (1.3 - Math.abs(i) * 0.15) * act + st.fl * 0.3, t, i * 1.7);
        g.restore();
    };

    // draw a turret's moving part. mount: sprite anchor, in world coords relative to building origin.
    A.drawTurret = (g, type, x, y, st) => {
        const fn = dyn[type];
        if (!fn) return;
        g.save(); g.translate(x, y);
        fn(g, st);
        g.restore();
    };
    A.hasTurret = (type) => !!dyn[type];

    // ======================================================
    // ANCHORS: flags, fire, smoke, sparkles, water...
    // ======================================================
    A.drawFlag = (g, x, y, w, col, t, seed = 0) => {
        const h = w * 0.62;
        g.save(); g.translate(x, y);
        g.fillStyle = col; g.strokeStyle = 'rgba(20,10,10,0.8)'; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(0, 0);
        const seg = 5;
        for (let i = 1; i <= seg; i++) g.lineTo(i / seg * w, Math.sin(t * 5 + seed + i * 0.9) * 1.8 * (i / seg));
        for (let i = seg; i >= 0; i--) g.lineTo(i / seg * w * (i === seg ? 0.78 : 1), h + Math.sin(t * 5 + seed + i * 0.9) * 1.8 * (i / seg));
        g.closePath(); g.fill(); g.stroke();
        g.restore();
    };
    const smokePuffs = (g, x, y, t, seed, green) => {
        for (let i = 0; i < 3; i++) {
            const k = ((t * 0.35 + i / 3 + seed * 0.13) % 1);
            const a = (1 - k) * 0.5;
            g.fillStyle = green ? `rgba(150,230,170,${a})` : `rgba(215,215,222,${a})`;
            g.beginPath(); g.arc(x + k * 9 + Math.sin(t + i) * 1.5, y - k * 26, 2.6 + k * 5, 0, TAU); g.fill();
        }
    };
    const glowSprite = (col) => A.cached('glow|' + col, () => {
        const c = A.mk(64, 64), g = c.getContext('2d');
        const [r, gg, b] = U.hexToRgb(col);
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, `rgba(${r},${gg},${b},0.9)`); gr.addColorStop(0.35, `rgba(${r},${gg},${b},0.35)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
    });
    // Animated extras for a placed building. x,y = building origin on the ground.
    A.drawAnchors = (g, sp, x, y, t, seed) => {
        for (const a of sp.anchors) {
            const ax = x + a.x, ay = y + a.y;
            switch (a.name) {
                case 'flag': A.drawFlag(g, ax, ay, a.w || 14, a.color || '#c73535', t, seed); break;
                case 'smoke': smokePuffs(g, ax, ay, t, seed, a.green); break;
                case 'steam': smokePuffs(g, ax, ay, t * 1.6, seed + 2, false); break;
                case 'fire': flame(g, ax, ay, a.s || 1, t, seed); break;
                case 'crown': {          // a ring of light turning over a fully evolved building
                    g.save(); g.globalCompositeOperation = 'lighter';
                    const spr = glowSprite('#ffd86a');
                    g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2 + seed);
                    g.drawImage(spr, ax - a.r * 1.6, ay - a.r * 1.1, a.r * 3.2, a.r * 2.2);
                    g.globalAlpha = 1;
                    for (let i = 0; i < 5; i++) {
                        const ang = t * 1.3 + i / 5 * TAU, px = ax + Math.cos(ang) * a.r * 1.5, py = ay + Math.sin(ang) * a.r * 0.45;
                        g.fillStyle = i % 2 ? '#fff0b0' : '#ffd34a';
                        g.beginPath(); g.moveTo(px, py - 3); g.lineTo(px + 1.7, py); g.lineTo(px, py + 3); g.lineTo(px - 1.7, py); g.closePath(); g.fill();
                    }
                    g.restore();
                    break;
                }
                case 'sparkle': {
                    const k = (Math.sin(t * 3 + seed * 5 + a.x * 0.7) + 1) / 2;
                    if (k > 0.82) {
                        const s = (k - 0.82) / 0.18 * 3.4;
                        g.strokeStyle = a.color || '#fff'; g.lineWidth = 1;
                        g.beginPath(); g.moveTo(ax - s, ay); g.lineTo(ax + s, ay); g.moveTo(ax, ay - s); g.lineTo(ax, ay + s); g.stroke();
                    }
                    break;
                }
                case 'liquid': {
                    g.save(); g.globalAlpha = 0.55; g.strokeStyle = '#f6d8ff'; g.lineWidth = 1; g.lineCap = 'round';
                    for (let i = 0; i < 3; i++) {
                        const ph = t * 1.1 + i * 2.1;
                        const px = ax + Math.sin(ph) * a.rx * 0.5, py = ay + Math.cos(ph * 1.3) * a.ry * 0.45;
                        g.beginPath(); g.moveTo(px - 3.5, py); g.quadraticCurveTo(px, py - 1.4, px + 3.5, py); g.stroke();
                    }
                    for (let i = 0; i < 3; i++) {
                        const k = ((t * 0.45 + i / 3 + seed) % 1);
                        g.globalAlpha = (1 - k) * 0.8; g.fillStyle = '#f6d8ff';
                        g.beginPath(); g.arc(ax + (i - 1) * 6, ay - k * 18, 1.4 - k * 0.5, 0, TAU); g.fill();
                    }
                    g.restore();
                    break;
                }
                case 'gear': {
                    g.save(); g.translate(ax, ay); g.rotate(t * 3);
                    g.strokeStyle = '#8a7ab0'; g.lineWidth = 1.4;
                    for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(1, 0); g.lineTo(a.r, 0); g.stroke(); }
                    g.restore();
                    break;
                }
                case 'bubbles':
                    g.save(); g.fillStyle = 'rgba(210,255,235,0.8)';
                    for (let i = 0; i < 4; i++) {
                        const k = ((t * 0.5 + i / 4 + seed) % 1);
                        g.globalAlpha = (1 - k) * 0.85;
                        g.beginPath(); g.arc(ax + Math.sin(i * 2.7 + t) * a.rx * 0.5, ay - k * a.h, 1.2 + (i % 2), 0, TAU); g.fill();
                    }
                    g.restore();
                    break;
                case 'ripple':
                    g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1;
                    for (let i = 0; i < 2; i++) { const k = ((t * 0.6 + i * 0.5) % 1); g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(ax, ay, a.rx * (0.15 + k * 0.7), a.ry * (0.15 + k * 0.7), 0, 0, TAU); g.stroke(); }
                    g.restore();
                    break;
                case 'fountain':
                    g.save(); g.strokeStyle = 'rgba(190,240,255,0.9)'; g.fillStyle = 'rgba(190,240,255,0.9)'; g.lineWidth = 1.2; g.lineCap = 'round';
                    for (let i = 0; i < 6; i++) {
                        const dir = i / 6 * TAU, k = ((t * 0.9 + i * 0.17) % 1);
                        const r = k * 22, up = Math.sin(k * Math.PI) * 14;
                        g.globalAlpha = 1 - k * 0.5;
                        g.beginPath(); g.arc(ax + Math.cos(dir) * r, ay + a.bowl * 0 + 10 + Math.sin(dir) * r * 0.5 - up, 1.3, 0, TAU); g.fill();
                    }
                    g.globalAlpha = 0.8; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - 8 - Math.sin(t * 6) * 2); g.stroke();
                    g.restore();
                    break;
            }
        }
    };
    // Warm glow behind lit windows and fires at night. amount 0..1
    A.drawLights = (g, sp, x, y, amount) => {
        if (amount <= 0 || !sp.lights.length) return;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, amount);
        for (const l of sp.lights) {
            const spr = glowSprite(l.color);
            const r = l.r * 1.7;
            g.drawImage(spr, x + l.x - r, y + l.y - r, r * 2, r * 2);
        }
        g.restore();
    };

    A.flame = flame;
    A.limb = limb;
    A.blob = blob;
    A.dyn = dyn;
    A.glowSprite = glowSprite;
})(window.KOE = window.KOE || {});
