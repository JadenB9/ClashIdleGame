/* ============================================================
   Building painters, part 1: helpers, Town Hall, economy, walls.
   Each painter draws one building around (0,0), the centre of its
   footprint on the ground, in world units. tier is 1-4.
   ============================================================ */
(function (K) {
    'use strict';
    const A = K.art;
    const U = K.util;
    const { T, box, cyl, cone, pyramid, crenel, dropShadow, cached, mk, rng, rrect, diamondPath } = A;
    const { shade, mixColor: mix } = U;
    const P = A.painters;

    // ----- drawing straight onto a box face, in a square-ish 100-wide design space -----
    // bp = { x, y, fw, fh, h, lift } is the same box you passed to box(); hRef is the
    // wall height in classic-view units so doors and windows keep their proportions.
    const faceSpace = (bp, hRef) => {
        const fwc = bp.fw * 72 / K.data.CFG.tileW;
        return { W: 100, H: Math.max(24, 100 * hRef * 0.8165 / fwc) };
    };
    const onFace = (g, side, bp, hRef, fn) => {
        const { W, H } = faceSpace(bp, hRef);
        const lift = bp.lift || 0;
        g.save();
        if (side === 'R') g.transform(bp.fw / W, -bp.fh / W, 0, bp.h / H, bp.x, bp.y + bp.fh - lift - bp.h);
        else g.transform(bp.fw / W, bp.fh / W, 0, bp.h / H, bp.x - bp.fw, bp.y - lift - bp.h);
        fn(g, W, H);
        g.restore();
    };
    // world position of a point (ex,ey) in a face's design space
    const faceWorld = (side, bp, hRef, ex, ey) => {
        const { W, H } = faceSpace(bp, hRef);
        const lift = bp.lift || 0;
        if (side === 'R') return { x: bp.x + ex / W * bp.fw, y: bp.y + bp.fh - lift - bp.h - ex / W * bp.fh + ey / H * bp.h };
        return { x: bp.x - bp.fw + ex / W * bp.fw, y: bp.y - lift - bp.h + ex / W * bp.fh + ey / H * bp.h };
    };
    // Mark a lit window so the renderer can glow it at night
    const glowAt = (geo, side, bp, hRef, ex, ey, r = 7) => {
        const p = faceWorld(side, bp, hRef, ex, ey);
        geo.light(p.x, p.y, r);
    };

    // ----- features, drawn in face space -----
    const archPath = (g, cx, by, w, h) => {
        const r = w / 2;
        g.beginPath();
        g.moveTo(cx - r, by); g.lineTo(cx - r, by - h + r);
        g.arc(cx, by - h + r, r, Math.PI, 0);
        g.lineTo(cx + r, by); g.closePath();
    };
    const windowF = (g, cx, cy, w, h, o = {}) => {
        const by = cy + h / 2;
        archPath(g, cx, by, w, h);
        const gl = g.createLinearGradient(0, cy - h / 2, 0, by);
        if (o.lit) { gl.addColorStop(0, '#ffd98a'); gl.addColorStop(1, '#e8963a'); }
        else { gl.addColorStop(0, '#46648c'); gl.addColorStop(1, '#1c2840'); }
        g.fillStyle = gl; g.fill();
        // glint
        g.save(); archPath(g, cx, by, w, h); g.clip();
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.beginPath(); g.moveTo(cx - w / 2, by - h * 0.25); g.lineTo(cx - w * 0.05, cy - h / 2); g.lineTo(cx + w * 0.25, cy - h / 2); g.lineTo(cx - w / 2, by - h * 0.62); g.fill();
        g.restore();
        g.lineWidth = o.thick || 2.2; g.strokeStyle = o.frame || '#3b2a1d';
        archPath(g, cx, by, w, h); g.stroke();
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(cx, cy - h / 2 + w / 2); g.lineTo(cx, by); g.moveTo(cx - w / 2, cy + h * 0.1); g.lineTo(cx + w / 2, cy + h * 0.1); g.stroke();
        g.fillStyle = o.sill || '#cfc6b0';
        g.fillRect(cx - w / 2 - 2, by, w + 4, 2.4);
        if (o.shutters) {
            g.fillStyle = o.shutters;
            g.fillRect(cx - w / 2 - 6, cy - h / 2 + 3, 5, h - 2);
            g.fillRect(cx + w / 2 + 1, cy - h / 2 + 3, 5, h - 2);
        }
    };
    const doorF = (g, cx, by, w, h, o = {}) => {
        const wood = o.wood || '#6a4424';
        // stone surround
        g.fillStyle = o.frame || '#8a8272';
        archPath(g, cx, by, w + 8, h + 4); g.fill();
        archPath(g, cx, by, w, h);
        const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        gr.addColorStop(0, shade(wood, 1.15)); gr.addColorStop(1, shade(wood, 0.8));
        g.fillStyle = gr; g.fill();
        g.save(); archPath(g, cx, by, w, h); g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
        for (let x = cx - w / 2 + w / 4; x < cx + w / 2; x += w / 4) { g.beginPath(); g.moveTo(x, by - h); g.lineTo(x, by); g.stroke(); }
        g.fillStyle = o.iron || '#2c2c32';
        g.fillRect(cx - w / 2, by - h * 0.72, w, 3.4);
        g.fillRect(cx - w / 2, by - h * 0.28, w, 3.4);
        g.restore();
        g.strokeStyle = '#1e140c'; g.lineWidth = 2; archPath(g, cx, by, w, h); g.stroke();
        g.fillStyle = o.knob || '#d8b04a';
        g.beginPath(); g.arc(cx + w * 0.22, by - h * 0.42, 1.8, 0, 7); g.arc(cx - w * 0.22, by - h * 0.42, 1.8, 0, 7); g.fill();
    };
    // Timber framing over plaster: posts, rails and braces
    const timberF = (g, W, H, col, posts = 4) => {
        g.strokeStyle = col; g.lineWidth = 4.2; g.lineCap = 'butt';
        g.strokeRect(2, 2, W - 4, H - 4);
        for (let i = 1; i < posts - 1; i++) { const x = W * i / (posts - 1); g.beginPath(); g.moveTo(x, 2); g.lineTo(x, H - 2); g.stroke(); }
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(2, H * 0.5); g.lineTo(W - 2, H * 0.5); g.stroke();
        g.lineWidth = 2.6;
        const seg = W / (posts - 1);
        for (let i = 0; i < posts - 1; i++) {
            g.beginPath();
            if (i % 2) { g.moveTo(i * seg + 2, H * 0.5); g.lineTo((i + 1) * seg - 2, 2); }
            else { g.moveTo(i * seg + 2, 2); g.lineTo((i + 1) * seg - 2, H * 0.5); }
            g.stroke();
        }
    };
    const coinPile = (g, x, y, n = 12, seed = 3, r0 = 2.6) => {
        const r = rng(seed);
        for (let i = 0; i < n; i++) {
            const px = x + (r() - 0.5) * 14, py = y - r() * 7 + (i % 3);
            const gr = g.createRadialGradient(px - 0.8, py - 0.8, 0.3, px, py, r0 + 1);
            gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.6, '#f2bd38'); gr.addColorStop(1, '#b57a14');
            g.fillStyle = gr;
            g.beginPath(); g.ellipse(px, py, r0 + 0.6, r0 - 0.4, 0, 0, 7); g.fill();
            g.strokeStyle = 'rgba(80,40,0,0.55)'; g.lineWidth = 0.6; g.stroke();
        }
    };
    const flagPole = (g, x, y, h, col = '#6b4a2a') => {
        g.strokeStyle = col; g.lineWidth = 1.8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke();
        g.fillStyle = '#e8c35a';
        g.beginPath(); g.arc(x, y - h, 2, 0, 7); g.fill();
    };
    // A leafy blob: used for trees and bushes
    const leafBlob = (g, x, y, r, base, seed = 1) => {
        const rn = rng(seed);
        const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
        gr.addColorStop(0, shade(base, 1.35)); gr.addColorStop(0.55, base); gr.addColorStop(1, shade(base, 0.5));
        g.fillStyle = gr;
        g.beginPath();
        const n = 9;
        for (let i = 0; i <= n; i++) {
            const a = i / n * Math.PI * 2;
            const rr = r * (0.88 + rn() * 0.2);
            const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(10,30,10,0.45)'; g.lineWidth = 0.9; g.stroke();
    };
    // A metal rim that shows the tier: silver, then gold, then gold with gems at the corners.
    // top is the y of the diamond the rim follows (negative = raised).
    const rimTrim = (g, geo, scale, top) => {
        const tier = geo.tier || 1;
        if (tier < 2) return;
        const rim = tier === 2 ? '#d4d8e4' : '#f0c040', X = geo.fw * scale, Y = geo.fh * scale;
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        g.strokeStyle = 'rgba(40,24,6,0.8)'; g.lineWidth = 3.4;
        g.beginPath(); g.moveTo(-X, top); g.lineTo(0, Y + top); g.lineTo(X, top); g.stroke();
        g.strokeStyle = rim; g.lineWidth = 1.9; g.stroke();
        if (tier === 4) {
            for (const [gx, gy, col] of [[-X, top, '#ff5a5a'], [0, Y + top, '#5cd8ff'], [X, top, '#7adf6a']]) {
                g.fillStyle = col; g.strokeStyle = 'rgba(20,10,10,0.9)'; g.lineWidth = 1;
                g.beginPath(); g.arc(gx, gy, 2.8, 0, 7); g.fill(); g.stroke();
                g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(gx - 0.8, gy - 0.9, 0.9, 0, 7); g.fill();
            }
        }
        g.restore();
    };
    // Low cobbled plinth that every building stands on
    const plate = (g, geo, scale = 0.98, color = '#8c8576', h = 3) => {
        const { fw, fh, hk } = geo;
        box(g, {
            x: 0, y: 0, fw: fw * scale, fh: fh * scale, h: h * hk,
            L: T.stone(96, 20, shade(color, 0.85), { rows: 2, seed: 2 }),
            R: T.stone(96, 20, shade(color, 0.85), { rows: 2, seed: 3 }),
            top: T.stone(128, 128, shade(color, 0.92), { rows: 9, aspect: 1.1, seed: 5 }),
        });
        rimTrim(g, geo, scale, -h * hk);
    };
    // General prism along the tile axes (walls, fences). a,b = half extents in tiles.
    const prism = (g, o) => {
        const tw = K.data.CFG.tileW, th = K.data.CFG.tileH;
        const ex = [tw / 2, th / 2], ey = [-tw / 2, th / 2];
        const lift = o.lift || 0, h = o.h;
        const pt = (sa, sb) => ({ x: o.cx + sa * o.a * ex[0] + sb * o.b * ey[0], y: o.cy + sa * o.a * ex[1] + sb * o.b * ey[1] - lift });
        const B = pt(1, 1), Rv = pt(1, -1), Lv = pt(-1, 1), Tv = pt(-1, -1);
        const face = (p0, p1, tex, dark) => {
            g.save();
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(p1.x, p1.y - h); g.lineTo(p0.x, p0.y - h); g.closePath();
            g.clip();
            if (typeof tex === 'string') { g.fillStyle = tex; g.fillRect(Math.min(p0.x, p1.x) - 1, Math.min(p0.y, p1.y) - h - 1, Math.abs(p1.x - p0.x) + 2, h + Math.abs(p1.y - p0.y) + 2); }
            else {
                g.transform((p1.x - p0.x) / tex.width, (p1.y - p0.y) / tex.width, 0, h / tex.height, p0.x, p0.y - h);
                g.drawImage(tex, 0, 0);
            }
            g.fillStyle = dark ? 'rgba(10,6,30,0.32)' : 'rgba(255,240,200,0.04)';
            g.fillRect(Math.min(p0.x, p1.x) - 1, Math.min(p0.y, p1.y) - h - 1, Math.abs(p1.x - p0.x) + 2, h + Math.abs(p1.y - p0.y) + 2);
            const ao = g.createLinearGradient(0, Math.min(p0.y, p1.y) - h, 0, Math.max(p0.y, p1.y));
            ao.addColorStop(0, 'rgba(255,255,255,0.10)'); ao.addColorStop(0.25, 'rgba(255,255,255,0)');
            ao.addColorStop(0.7, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,0.26)');
            g.fillStyle = ao;
            g.fillRect(Math.min(p0.x, p1.x) - 1, Math.min(p0.y, p1.y) - h - 1, Math.abs(p1.x - p0.x) + 2, h + Math.abs(p1.y - p0.y) + 2);
            g.restore();
            g.strokeStyle = A.EDGE; g.lineWidth = 0.9;
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(p1.x, p1.y - h); g.lineTo(p0.x, p0.y - h); g.closePath(); g.stroke();
        };
        face(Lv, B, o.L, false);
        face(B, Rv, o.R, true);
        if (o.top) {
            g.beginPath(); g.moveTo(Tv.x, Tv.y - h); g.lineTo(Rv.x, Rv.y - h); g.lineTo(B.x, B.y - h); g.lineTo(Lv.x, Lv.y - h); g.closePath();
            g.fillStyle = o.top; g.fill();
            g.strokeStyle = A.EDGE; g.lineWidth = 0.9; g.stroke();
            g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(Lv.x, Lv.y - h); g.lineTo(B.x, B.y - h); g.lineTo(Rv.x, Rv.y - h); g.stroke();
        }
    };

    A.h = { rimTrim, onFace, faceWorld, glowAt, windowF, doorF, timberF, coinPile, flagPole, leafBlob, plate, prism, archPath, faceSpace };

    // =========================================================
    // TOWN HALL (2x2)
    // =========================================================
    P.townhall = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        const stone = ['#c4bba4', '#aab2c0', '#a29cb4', '#eee8d8'][t];
        const roofC = ['#b6452d', '#2f6aa8', '#7a3fa0', '#e2a92f'][t];
        const trim = ['#6b4a2a', '#46505f', '#3d3354', '#d9a21b'][t];
        geo.shadowAt(18, 10, fw * 1.75, fh * 1.8, 0.95);
        plate(g, geo, 1.0, stone);

        const turret = (x, y, hh, col) => {
            cyl(g, { x, y, rx: fw * 0.17, ry: fh * 0.17, h: H(hh), lift: H(3), color: col, courses: 6 });
            cone(g, { x, y, rx: fw * 0.22, ry: fh * 0.22, h: H(24), lift: H(3 + hh - 1), color: roofC, rows: 6 });
            flagPole(g, x, y - H(3 + hh + 22), H(9));
        };
        if (tier >= 2) turret(0, -fh * 0.82, 58, shade(stone, 0.92));

        // main hall
        const hall = { x: 0, y: 0, fw: fw * 0.86, fh: fh * 0.86, h: H(34), lift: H(3) };
        box(g, { ...hall, L: T.stone(168, 112, stone, { rows: 7, seed: 3 }), R: T.stone(168, 112, stone, { rows: 7, seed: 4 }), top: shade(stone, 0.8) });
        // string course and plinth band
        for (const side of ['L', 'R']) {
            onFace(g, side, hall, 34, (c, W, Hh) => {
                c.fillStyle = shade(stone, 1.15); c.fillRect(0, Hh * 0.52, W, 4);
                c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, Hh * 0.52 + 4, W, 2);
                c.fillStyle = shade(stone, 0.78); c.fillRect(0, Hh - 7, W, 7);
            });
        }
        onFace(g, 'R', hall, 34, (c, W, Hh) => {
            doorF(c, W * 0.5, Hh - 7, 17, Hh * 0.52, { frame: shade(stone, 1.1), wood: trim });
            windowF(c, W * 0.17, Hh * 0.33, 9, Hh * 0.3, { lit: true });
            windowF(c, W * 0.83, Hh * 0.33, 9, Hh * 0.3, { lit: true });
            c.fillStyle = tier === 4 ? '#e8c35a' : shade(trim, 1.2);
            c.beginPath(); c.moveTo(W * 0.5 - 14, 8); c.lineTo(W * 0.5 + 14, 8); c.lineTo(W * 0.5, 18); c.closePath(); c.fill();
        });
        glowAt(geo, 'R', hall, 34, 17, 33, 8); glowAt(geo, 'R', hall, 34, 83, 33, 8);
        onFace(g, 'L', hall, 34, (c, W, Hh) => {
            for (const u of [0.2, 0.5, 0.8]) windowF(c, W * u, Hh * 0.33, 9, Hh * 0.3, { lit: true });
            windowF(c, W * 0.35, Hh - 22, 8, 14, { lit: false });
        });
        for (const u of [20, 50, 80]) glowAt(geo, 'L', hall, 34, u, 33, 8);
        // crenellated parapet around the hall roof

        if (tier >= 2) { turret(-fw * 0.86, 0, 56, shade(stone, 1.0)); turret(fw * 0.86, 0, 56, shade(stone, 0.9)); }

        // upper timber floor
        const up = { x: 0, y: 0, fw: fw * 0.58, fh: fh * 0.58, h: H(24), lift: H(37) };
        const plast = T.plaster(120, 90, ['#efe3c4', '#e8e4dc', '#e4dcea', '#f7efdc'][t]);
        box(g, { ...up, L: plast, R: plast, top: shade(stone, 0.9) });
        for (const side of ['L', 'R']) {
            onFace(g, side, up, 24, (c, W, Hh) => {
                timberF(c, W, Hh, trim, 3);
                windowF(c, W * 0.25, Hh * 0.72, 10, Hh * 0.34, { lit: true, frame: trim });
                windowF(c, W * 0.75, Hh * 0.72, 10, Hh * 0.34, { lit: true, frame: trim });
            });
            glowAt(geo, side, up, 24, 25, 72 * 0.9, 6); glowAt(geo, side, up, 24, 75, 72 * 0.9, 6);
        }
        // roof
        const apex = pyramid(g, { x: 0, y: 0, fw: fw * 0.58, fh: fh * 0.58, h: H(34), lift: H(61), eave: fw * 0.1, color: roofC, tex: T.shingles(120, 90, roofC, { rows: 8, tw: 14 }) });
        if (tier === 4) {                      // gilded finial
            g.fillStyle = '#ffd86a'; g.strokeStyle = '#7a5410'; g.lineWidth = 0.8;
            g.beginPath(); g.arc(apex.x, apex.y - H(2), 3.4, 0, 7); g.fill(); g.stroke();
        }
        flagPole(g, apex.x, apex.y, H(26));
        geo.anchor('flag', apex.x, apex.y - H(26), { color: ['#c73535', '#2f6aa8', '#7a3fa0', '#e2a92f'][t], w: 22 });
        if (tier >= 2) { geo.anchor('flag', -fw * 0.86, -H(3 + 58 + 24 + 22), { color: '#c73535', w: 12 }); geo.anchor('flag', fw * 0.86, -H(3 + 58 + 24 + 22), { color: '#c73535', w: 12 }); }
    };
    P.townhall.up = 270;

    // =========================================================
    // GOLD MINE
    // =========================================================
    P.goldmine = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.5, fh * 1.5, 0.9);
        // dirt apron
        diamondPath(g, 0, 2, fw * 0.98, fh * 0.98);
        g.fillStyle = '#7d5d3a'; g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
        rimTrim(g, geo, 0.98, 2);
        // rocky hill
        const pts = [[-0.96, 0.05, 0], [-0.8, -0.1, 18], [-0.5, -0.3, 30], [-0.15, -0.42, 40], [0.2, -0.38, 36], [0.55, -0.2, 24], [0.92, 0.02, 8], [0.7, 0.45, 0], [0.0, 0.8, 0], [-0.7, 0.45, 0]];
        const P2 = pts.map(([x, y, h]) => ({ x: x * fw, y: y * fh * 1.0 - H(h) * 0.0 - H(h) }));
        g.beginPath();
        g.moveTo((P2[0].x + P2[P2.length - 1].x) / 2, (P2[0].y + P2[P2.length - 1].y) / 2);
        for (let i = 0; i < P2.length; i++) {
            const a = P2[i], b = P2[(i + 1) % P2.length];
            g.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        g.closePath();
        const rockTex = T.rock(128, 96, ['#8a8478', '#8c8c98', '#6c6678', '#9a94a8'][t], 5);
        g.save(); g.clip();
        g.drawImage(rockTex, -fw, -H(46), fw * 2, H(46) + fh * 1.2);
        const lg = g.createLinearGradient(-fw, 0, fw, 0);
        lg.addColorStop(0, 'rgba(255,240,200,0.20)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(8,4,30,0.42)');
        g.fillStyle = lg; g.fillRect(-fw, -H(50), fw * 2, H(50) + fh * 1.2);
        const ag = g.createLinearGradient(0, -H(40), 0, fh * 0.8);
        ag.addColorStop(0, 'rgba(255,255,255,0.12)'); ag.addColorStop(0.4, 'rgba(0,0,0,0)'); ag.addColorStop(1, 'rgba(0,0,0,0.3)');
        g.fillStyle = ag; g.fillRect(-fw, -H(50), fw * 2, H(50) + fh * 1.2);
        // gold veins
        const rn = rng(17);
        for (let i = 0; i < 5 + t * 2; i++) {
            const vx = (rn() - 0.55) * fw * 1.3, vy = -H(8 + rn() * 28);
            g.strokeStyle = '#f6c441'; g.lineWidth = 1.6 + rn(); g.lineCap = 'round';
            g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + 4 + rn() * 5, vy + 3 + rn() * 4); g.lineTo(vx + 2 + rn() * 7, vy + 7 + rn() * 4); g.stroke();
            g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(vx + 1, vy, 1.2, 0, 7); g.fill();
            geo.anchor('sparkle', vx + 1, vy, { color: '#fff3a8' });
        }
        g.restore();
        g.strokeStyle = A.EDGE; g.lineWidth = 0.9; g.stroke();
        // mine mouth with timber frame
        const mx = fw * 0.3, my = fh * 0.34;
        const w = 17, hh = H(24);
        g.fillStyle = '#120c08';
        g.beginPath(); g.moveTo(mx - w / 2, my); g.lineTo(mx - w / 2, my - hh + 6); g.quadraticCurveTo(mx, my - hh - 4, mx + w / 2, my - hh + 6); g.lineTo(mx + w / 2, my); g.closePath(); g.fill();
        const beam = t >= 2 ? '#7c7f8c' : '#7b5230';
        g.strokeStyle = beam; g.lineWidth = 3.2; g.lineCap = 'butt';
        g.beginPath(); g.moveTo(mx - w / 2 - 1, my + 1); g.lineTo(mx - w / 2 - 1, my - hh + 4); g.lineTo(mx + w / 2 + 1, my - hh + 4); g.lineTo(mx + w / 2 + 1, my + 1); g.stroke();
        g.strokeStyle = shade(beam, 1.3); g.lineWidth = 1; g.beginPath(); g.moveTo(mx - w / 2 - 2, my - hh + 3); g.lineTo(mx + w / 2 + 2, my - hh + 3); g.stroke();
        // lantern
        g.fillStyle = '#ffcf6a'; g.beginPath(); g.arc(mx + w / 2 + 4, my - hh + 6, 2.4, 0, 7); g.fill();
        geo.light(mx + w / 2 + 4, my - hh + 6, 9);
        // rails + cart
        g.strokeStyle = '#4b3a2a'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(mx - 3, my + 1); g.lineTo(mx + 13, my + 9); g.moveTo(mx + 3, my - 1); g.lineTo(mx + 19, my + 7); g.stroke();
        const cx = mx + 13, cy = my + 6;
        g.fillStyle = '#5a4a3c';
        g.beginPath(); g.moveTo(cx - 8, cy - 7); g.lineTo(cx + 8, cy - 7); g.lineTo(cx + 6, cy + 1); g.lineTo(cx - 6, cy + 1); g.closePath(); g.fill();
        g.strokeStyle = '#1e140c'; g.lineWidth = 1; g.stroke();
        coinPile(g, cx, cy - 7, 8 + t * 2, 9, 2.4);
        g.fillStyle = '#222'; g.beginPath(); g.arc(cx - 4, cy + 2, 2, 0, 7); g.arc(cx + 4, cy + 2, 2, 0, 7); g.fill();
        // pickaxe + gold heap by the base
        coinPile(g, -fw * 0.5, fh * 0.45, 10 + t * 3, 4, 2.6);
        g.strokeStyle = '#7b5230'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-fw * 0.2, fh * 0.55); g.lineTo(-fw * 0.05, fh * 0.2); g.stroke();
        g.strokeStyle = '#9aa0ac'; g.lineWidth = 2; g.beginPath(); g.moveTo(-fw * 0.12, fh * 0.2); g.lineTo(fw * 0.0, fh * 0.2); g.stroke();
        if (t >= 1) { // wooden headframe and wheel on top
            g.strokeStyle = '#6b4526'; g.lineWidth = 2.4;
            const hx = -fw * 0.15, hy = -H(38);
            g.beginPath(); g.moveTo(hx - 7, hy + 14); g.lineTo(hx, hy); g.lineTo(hx + 7, hy + 14); g.moveTo(hx - 4, hy + 8); g.lineTo(hx + 4, hy + 8); g.stroke();
            g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.4; g.beginPath(); g.arc(hx, hy + 2, 4, 0, 7); g.stroke();
        }
    };

    // =========================================================
    // ELIXIR WELL
    // =========================================================
    P.elixirwell = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.4, fh * 1.4, 0.9);
        plate(g, geo, 0.96, '#8a8272', 3);
        const stone = ['#a69e8c', '#9aa6b6', '#9a8cb4', '#d8d0ea'][t];
        const rx = fw * 0.6, ry = fh * 0.6;
        cyl(g, { x: 0, y: 0, rx, ry, h: H(16), lift: H(3), color: stone, top: false, courses: 3 });
        // inner basin
        const yt = -H(19);
        g.beginPath(); g.ellipse(0, yt, rx, ry, 0, 0, 7);
        g.fillStyle = shade(stone, 1.1); g.fill(); g.strokeStyle = A.EDGE; g.lineWidth = 0.9; g.stroke();
        const ir = 0.78;
        g.beginPath(); g.ellipse(0, yt + 0.5, rx * ir, ry * ir, 0, 0, 7);
        const lg = g.createRadialGradient(-rx * 0.2, yt - ry * 0.2, 1, 0, yt, rx);
        lg.addColorStop(0, '#f0b6ff'); lg.addColorStop(0.55, '#b44ee0'); lg.addColorStop(1, '#6a1fa0');
        g.fillStyle = lg; g.fill(); g.strokeStyle = 'rgba(30,0,50,0.7)'; g.lineWidth = 1.2; g.stroke();
        geo.anchor('liquid', 0, yt, { rx: rx * ir, ry: ry * ir });
        geo.light(0, yt, 18);
        // wooden frame, pulley and bucket
        const post = '#6b4526';
        g.strokeStyle = post; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-rx * 0.9, yt + 2); g.lineTo(-rx * 0.5, yt - H(30)); g.moveTo(rx * 0.9, yt + 2); g.lineTo(rx * 0.5, yt - H(30)); g.stroke();
        g.lineWidth = 3.4; g.beginPath(); g.moveTo(-rx * 0.62, yt - H(27)); g.lineTo(rx * 0.62, yt - H(27)); g.stroke();
        g.strokeStyle = '#d8c8a0'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, yt - H(27)); g.lineTo(0, yt - H(8)); g.stroke();
        g.fillStyle = '#7b5230'; g.strokeStyle = '#2a1a0c'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-4, yt - H(9)); g.lineTo(4, yt - H(9)); g.lineTo(3, yt - H(2)); g.lineTo(-3, yt - H(2)); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#c9a56a'; g.beginPath(); g.arc(0, yt - H(27), 3, 0, 7); g.fill(); g.stroke();
        // crystals around the rim
        const nC = 2 + t * 2;
        for (let i = 0; i < nC; i++) {
            const a = Math.PI * (0.15 + 0.7 * i / Math.max(1, nC - 1));
            const cx = Math.cos(a + Math.PI) * rx * 1.02 * (i % 2 ? 1 : -1) * -1, cy = -H(16) + Math.sin(a) * ry * 0.9;
            g.fillStyle = '#d27cff'; g.strokeStyle = '#4a1070'; g.lineWidth = 0.9;
            g.beginPath(); g.moveTo(cx, cy - H(10 + (i % 3) * 3)); g.lineTo(cx + 3.4, cy); g.lineTo(cx - 3.4, cy); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(cx, cy - H(10 + (i % 3) * 3)); g.lineTo(cx - 3.4, cy); g.lineTo(cx - 1, cy); g.closePath(); g.fill();
        }
    };

    // =========================================================
    // DARK DRILL
    // =========================================================
    P.darkdrill = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.4, fh * 1.4, 0.95);
        plate(g, geo, 0.96, '#5a5666', 3);
        const iron = ['#4a4658', '#3c3a52', '#34304a', '#2a2640'][t];
        cyl(g, { x: 0, y: 0, rx: fw * 0.62, ry: fh * 0.62, h: H(14), lift: H(3), color: iron, courses: 2, joints: 8, topColor: shade(iron, 0.8) });
        // rivet band
        g.fillStyle = shade(iron, 1.5);
        for (let i = 0; i < 9; i++) { const a = Math.PI * (i + 0.5) / 9; g.beginPath(); g.arc(-Math.cos(a) * fw * 0.6, -H(9) + Math.sin(a) * fh * 0.6, 1.1, 0, 7); g.fill(); }
        // purple glowing shaft
        const yt = -H(17);
        g.beginPath(); g.ellipse(0, yt, fw * 0.36, fh * 0.36, 0, 0, 7);
        const lg = g.createRadialGradient(0, yt, 1, 0, yt, fw * 0.4);
        lg.addColorStop(0, '#f0d0ff'); lg.addColorStop(0.5, '#8a3fe0'); lg.addColorStop(1, '#2a0a50');
        g.fillStyle = lg; g.fill(); g.strokeStyle = '#0c0418'; g.lineWidth = 1.4; g.stroke();
        geo.light(0, yt, 16, '#a060ff');
        // lattice derrick
        const topY = yt - H(40);
        g.strokeStyle = '#2a2838'; g.lineWidth = 2.4; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-fw * 0.34, yt + 2); g.lineTo(-fw * 0.08, topY); g.moveTo(fw * 0.34, yt + 2); g.lineTo(fw * 0.08, topY);
        g.moveTo(-fw * 0.2, yt - H(14)); g.lineTo(fw * 0.2, yt - H(14)); g.moveTo(-fw * 0.14, yt - H(27)); g.lineTo(fw * 0.14, yt - H(27));
        g.moveTo(-fw * 0.34, yt + 2); g.lineTo(fw * 0.2, yt - H(14)); g.moveTo(fw * 0.34, yt + 2); g.lineTo(-fw * 0.2, yt - H(14));
        g.moveTo(-fw * 0.2, yt - H(14)); g.lineTo(fw * 0.14, yt - H(27)); g.moveTo(fw * 0.2, yt - H(14)); g.lineTo(-fw * 0.14, yt - H(27));
        g.stroke();
        g.strokeStyle = '#6b6880'; g.lineWidth = 1; g.beginPath(); g.moveTo(-fw * 0.34, yt + 1); g.lineTo(-fw * 0.08, topY - 1); g.stroke();
        // crown block + gear housing
        box(g, { x: 0, y: topY + H(5), fw: fw * 0.17, fh: fh * 0.17, h: H(9), L: iron, R: shade(iron, 0.7), top: shade(iron, 1.2) });
        g.fillStyle = '#b070ff'; g.beginPath(); g.arc(0, topY - H(2), 2.2, 0, 7); g.fill();
        geo.anchor('gear', 0, topY + H(3), { r: 5 });
        geo.anchor('steam', fw * 0.3, -H(14), {});
        // hoses
        g.strokeStyle = '#1a1a22'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(fw * 0.5, -H(8)); g.quadraticCurveTo(fw * 0.85, -H(2), fw * 0.7, fh * 0.35); g.stroke();
        g.strokeStyle = '#555268'; g.lineWidth = 1; g.stroke();
    };

    // =========================================================
    // GEM QUARRY
    // =========================================================
    P.gemquarry = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.5, fh * 1.5, 0.9);
        // sunken pit
        diamondPath(g, 0, 2, fw * 0.98, fh * 0.98);
        g.fillStyle = '#6e6a76'; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.stroke();
        rimTrim(g, geo, 0.98, 2);
        g.save(); diamondPath(g, 0, 2, fw * 0.98, fh * 0.98); g.clip();
        g.drawImage(T.rock(96, 64, '#7a7684', 21), -fw, -fh, fw * 2, fh * 2.1);
        g.restore();
        g.beginPath(); g.ellipse(0, 3, fw * 0.62, fh * 0.64, 0, 0, 7);
        const pg = g.createRadialGradient(0, 3, 2, 0, 3, fw * 0.64);
        pg.addColorStop(0, '#0a1a28'); pg.addColorStop(0.7, '#1a3248'); pg.addColorStop(1, '#4a5a6e');
        g.fillStyle = pg; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.4; g.stroke();
        // crystal cluster
        const cr = [[-10, 2, 22, 7], [-2, -2, 32, 9], [8, 3, 24, 7], [14, 6, 14, 5], [-16, 6, 13, 5], [2, 8, 16, 6]];
        const nC = 4 + t;
        for (let i = 0; i < Math.min(nC, cr.length); i++) {
            const [cx, cy, ch, cw] = cr[i];
            const hh = H(ch);
            g.fillStyle = ['#53d4ff', '#7ae8ff', '#44b8f0', '#9af0ff'][i % 4];
            g.beginPath(); g.moveTo(cx, cy - hh); g.lineTo(cx + cw / 2, cy - hh * 0.72); g.lineTo(cx + cw / 2, cy); g.lineTo(cx - cw / 2, cy); g.lineTo(cx - cw / 2, cy - hh * 0.72); g.closePath(); g.fill();
            g.strokeStyle = '#0d4d6e'; g.lineWidth = 0.9; g.stroke();
            g.fillStyle = 'rgba(255,255,255,0.55)';
            g.beginPath(); g.moveTo(cx, cy - hh); g.lineTo(cx - cw / 2, cy - hh * 0.72); g.lineTo(cx - cw / 2, cy); g.lineTo(cx - cw / 5, cy); g.lineTo(cx - cw / 5, cy - hh * 0.72); g.closePath(); g.fill();
            g.fillStyle = 'rgba(0,40,90,0.3)';
            g.beginPath(); g.moveTo(cx + cw / 2, cy - hh * 0.72); g.lineTo(cx + cw / 2, cy); g.lineTo(cx + cw / 8, cy); g.lineTo(cx + cw / 8, cy - hh * 0.72); g.closePath(); g.fill();
            geo.anchor('sparkle', cx, cy - hh * 0.8, { color: '#d8fbff' });
        }
        geo.light(0, -H(14), 22, '#6ae0ff');
        // wooden crane + bucket
        g.strokeStyle = '#6b4526'; g.lineWidth = 3; g.lineCap = 'round';
        const bx = fw * 0.62, by = fh * 0.1;
        g.beginPath(); g.moveTo(bx, by + 4); g.lineTo(bx, by - H(36)); g.moveTo(bx - 7, by + 7); g.lineTo(bx, by - H(24)); g.stroke();
        g.lineWidth = 2.6; g.beginPath(); g.moveTo(bx + 2, by - H(36)); g.lineTo(-fw * 0.18, by - H(30)); g.stroke();
        g.strokeStyle = '#d8c8a0'; g.lineWidth = 1; g.beginPath(); g.moveTo(-fw * 0.16, by - H(30)); g.lineTo(-fw * 0.16, by - H(14)); g.stroke();
        g.fillStyle = '#7b5230'; g.strokeStyle = '#2a1a0c'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-fw * 0.16 - 5, by - H(14)); g.lineTo(-fw * 0.16 + 5, by - H(14)); g.lineTo(-fw * 0.16 + 3.5, by - H(7)); g.lineTo(-fw * 0.16 - 3.5, by - H(7)); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#7ae8ff'; g.beginPath(); g.arc(-fw * 0.16 - 1, by - H(15), 2, 0, 7); g.arc(-fw * 0.16 + 2, by - H(15.5), 1.6, 0, 7); g.fill();
    };

    // =========================================================
    // VAULT
    // =========================================================
    P.storage = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.5, fh * 1.5, 0.95);
        plate(g, geo, 0.98, '#8a7f6c');
        const stone = ['#a89a82', '#9aa0aa', '#8e86a4', '#d8cca8'][t];
        const b = { x: 0, y: 0, fw: fw * 0.8, fh: fh * 0.8, h: H(30), lift: H(3) };
        box(g, { ...b, L: T.stone(120, 100, stone, { rows: 5, seed: 8 }), R: T.stone(120, 100, stone, { rows: 5, seed: 9 }), top: shade(stone, 0.8) });
        const band = t >= 3 ? '#d9a21b' : '#3a3a44';
        for (const side of ['L', 'R']) {
            onFace(g, side, b, 30, (c, W, Hh) => {
                c.fillStyle = band;
                c.fillRect(0, Hh * 0.18, W, 6); c.fillRect(0, Hh * 0.78, W, 6);
                c.fillStyle = shade(band, 1.5);
                for (let x = 8; x < W; x += 16) { c.beginPath(); c.arc(x, Hh * 0.18 + 3, 1.7, 0, 7); c.arc(x, Hh * 0.78 + 3, 1.7, 0, 7); c.fill(); }
            });
        }
        onFace(g, 'R', b, 30, (c, W, Hh) => {
            // round steel door
            const cx = W * 0.5, cy = Hh * 0.52, r = Math.min(W * 0.2, Hh * 0.3);
            c.fillStyle = '#2a2a32'; c.beginPath(); c.arc(cx, cy, r + 3, 0, 7); c.fill();
            const gr = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
            gr.addColorStop(0, '#d8dae4'); gr.addColorStop(1, '#6a6c78');
            c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
            c.strokeStyle = '#2a2a32'; c.lineWidth = 2; c.stroke();
            c.strokeStyle = '#3a3a44'; c.lineWidth = 2.4;
            c.beginPath(); c.moveTo(cx - r * 0.7, cy); c.lineTo(cx + r * 0.7, cy); c.moveTo(cx, cy - r * 0.7); c.lineTo(cx, cy + r * 0.7); c.stroke();
            c.fillStyle = '#d9a21b'; c.beginPath(); c.arc(cx, cy, r * 0.22, 0, 7); c.fill(); c.stroke();
        });
        // low dark roof with a gold trim
        const roof = ['#5a4636', '#46505f', '#473f62', '#8a6a24'][t];
        pyramid(g, { x: 0, y: 0, fw: fw * 0.8, fh: fh * 0.8, h: H(15), lift: H(33), eave: fw * 0.06, color: roof, tex: T.shingles(100, 70, roof, { rows: 6, tw: 12 }) });
        coinPile(g, fw * 0.5, fh * 0.72, 7 + t * 2, 12, 2.4);
        coinPile(g, -fw * 0.05, fh * 0.84, 5, 14, 2.2);
    };

    // =========================================================
    // BUILDER HUT
    // =========================================================
    P.builderhut = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.4, fh * 1.4, 0.9);
        plate(g, geo, 0.98, '#8a7f6c', 2);
        const b = { x: 0, y: 0, fw: fw * 0.7, fh: fh * 0.7, h: H(22), lift: H(2) };
        const plast = T.plaster(110, 80, ['#e8d8b0', '#e6dcc6', '#dcd4e0', '#f0e4c0'][t], 14);
        const wood = ['#6b4526', '#5a4a3a', '#4a4560', '#8a6a24'][t];
        box(g, { ...b, L: plast, R: plast, top: '#7a5a38' });
        for (const side of ['L', 'R']) onFace(g, side, b, 22, (c, W, Hh) => timberF(c, W, Hh, wood, 3));
        onFace(g, 'R', b, 22, (c, W, Hh) => {
            doorF(c, W * 0.34, Hh - 3, 15, Hh * 0.6, { frame: '#a89c80', wood: '#5a3a1c' });
            windowF(c, W * 0.74, Hh * 0.45, 12, Hh * 0.34, { lit: true, frame: wood, shutters: '#3d6a40' });
        });
        glowAt(geo, 'R', b, 22, 74, 45, 7);
        onFace(g, 'L', b, 22, (c, W, Hh) => windowF(c, W * 0.5, Hh * 0.45, 14, Hh * 0.36, { lit: true, frame: wood, shutters: '#3d6a40' }));
        glowAt(geo, 'L', b, 22, 50, 45, 7);
        const roofC = ['#c8a850', '#a05a3a', '#4a6a8a', '#d9a21b'][t];
        pyramid(g, { x: 0, y: 0, fw: fw * 0.7, fh: fh * 0.7, h: H(26), lift: H(24), eave: fw * 0.12, color: roofC, tex: t === 0 ? T.thatch(100, 80, roofC, 6) : T.shingles(100, 80, roofC, { rows: 7, tw: 12 }) });
        // chimney
        box(g, { x: fw * 0.3, y: -fh * 0.12, fw: fw * 0.1, fh: fh * 0.1, h: H(20), lift: H(40), L: T.stone(40, 40, '#8a8272', { rows: 4, seed: 3 }), R: T.stone(40, 40, '#6a6252', { rows: 4, seed: 4 }), top: '#2a2420' });
        geo.anchor('smoke', fw * 0.3, -fh * 0.12 - H(60), {});
        // anvil and logs
        g.fillStyle = '#2f3038'; g.strokeStyle = '#121216'; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(fw * 0.52, fh * 0.7); g.lineTo(fw * 0.82, fh * 0.7); g.lineTo(fw * 0.78, fh * 0.6); g.lineTo(fw * 0.62, fh * 0.6); g.lineTo(fw * 0.58, fh * 0.52); g.lineTo(fw * 0.48, fh * 0.52); g.lineTo(fw * 0.58, fh * 0.6); g.closePath(); g.fill(); g.stroke();
        for (let i = 0; i < 3; i++) {
            const lx = -fw * 0.62 + i * 6, ly = fh * 0.72 - (i === 2 ? 5 : 0);
            g.fillStyle = '#7b5230'; g.strokeStyle = '#2a1a0c'; g.lineWidth = 0.8;
            g.beginPath(); g.ellipse(lx, ly, 3.2, 3.2, 0, 0, 7); g.fill(); g.stroke();
            g.fillStyle = '#d8b07a'; g.beginPath(); g.ellipse(lx, ly, 1.8, 1.8, 0, 0, 7); g.fill();
        }
        // hammer sign
        g.strokeStyle = '#4a2f18'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(fw * 0.62, fh * 0.1); g.lineTo(fw * 0.62, -H(14)); g.lineTo(fw * 0.82, -H(14)); g.stroke();
        g.fillStyle = '#8a6a44'; g.fillRect(fw * 0.64, -H(14), 12, 9); g.strokeRect(fw * 0.64, -H(14), 12, 9);
        g.fillStyle = '#2f3038'; g.fillRect(fw * 0.7, -H(12.5), 1.6, 6); g.fillRect(fw * 0.66, -H(13), 8, 2.6);
    };

    // =========================================================
    // LABORATORY
    // =========================================================
    P.lab = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.4, fh * 1.4, 0.95);
        plate(g, geo, 0.98, '#7f8a84');
        const stone = ['#7fb8a0', '#78aab8', '#9a8cc0', '#cfe8dc'][t];
        // chimney pipe at the back
        cyl(g, { x: -fw * 0.4, y: -fh * 0.3, rx: fw * 0.1, ry: fh * 0.1, h: H(58), lift: H(3), color: '#6a5a4a', courses: 6 });
        geo.anchor('smoke', -fw * 0.4, -fh * 0.3 - H(61), { green: true });
        // round tower body
        cyl(g, { x: 0, y: 0, rx: fw * 0.62, ry: fh * 0.62, h: H(30), lift: H(3), color: stone, courses: 5, top: false });
        // porthole windows
        for (const [px, py] of [[-0.25, 0.25], [0.2, 0.34], [0.5, 0.1]]) {
            const wx = px * fw * 1.2, wy = -H(14) + py * fh;
            g.fillStyle = '#c8ffee'; g.strokeStyle = '#2a4a40'; g.lineWidth = 1.6;
            g.beginPath(); g.ellipse(wx, wy, 3.6, 4.4, 0, 0, 7); g.fill(); g.stroke();
            geo.light(wx, wy, 8, '#8affd0');
        }
        // door
        g.fillStyle = '#5a3a1c'; g.strokeStyle = '#1e140c'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(fw * 0.12, fh * 0.55); g.lineTo(fw * 0.12, fh * 0.55 - H(12)); g.quadraticCurveTo(fw * 0.2, fh * 0.55 - H(18), fw * 0.28, fh * 0.55 - H(12)); g.lineTo(fw * 0.28, fh * 0.5); g.closePath(); g.fill(); g.stroke();
        // brass rim then glass dome
        const yb = -H(33);
        g.beginPath(); g.ellipse(0, yb, fw * 0.66, fh * 0.66, 0, 0, 7);
        g.fillStyle = '#b8863a'; g.fill(); g.strokeStyle = '#4a3010'; g.lineWidth = 1.2; g.stroke();
        g.save();
        g.beginPath(); g.moveTo(-fw * 0.56, yb); g.bezierCurveTo(-fw * 0.56, yb - H(34), fw * 0.56, yb - H(34), fw * 0.56, yb); g.ellipse(0, yb, fw * 0.56, fh * 0.56, 0, 0, Math.PI, false); g.closePath();
        const dg = g.createLinearGradient(-fw * 0.5, 0, fw * 0.5, 0);
        dg.addColorStop(0, 'rgba(170,255,225,0.85)'); dg.addColorStop(0.6, 'rgba(70,200,170,0.75)'); dg.addColorStop(1, 'rgba(20,110,100,0.85)');
        g.fillStyle = dg; g.fill(); g.clip();
        g.fillStyle = 'rgba(60,230,160,0.55)';
        g.fillRect(-fw, yb - H(12), fw * 2, H(14) + fh);
        g.restore();
        g.strokeStyle = '#4a3010'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-fw * 0.56, yb); g.bezierCurveTo(-fw * 0.56, yb - H(34), fw * 0.56, yb - H(34), fw * 0.56, yb); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-fw * 0.42, yb - H(5)); g.quadraticCurveTo(-fw * 0.38, yb - H(22), -fw * 0.1, yb - H(24)); g.stroke();
        g.strokeStyle = 'rgba(40,60,50,0.5)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, yb - H(25)); g.lineTo(0, yb + fh * 0.5); g.stroke();
        geo.anchor('bubbles', 0, yb - H(6), { rx: fw * 0.4, h: H(14) });
        geo.light(0, yb - H(8), 22, '#60ffb0');
        // flask on the ground
        g.fillStyle = '#d8fff0'; g.strokeStyle = '#2a4a40'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(fw * 0.62, fh * 0.55); g.lineTo(fw * 0.62, fh * 0.55 - H(6)); g.lineTo(fw * 0.58, fh * 0.55 - H(11)); g.lineTo(fw * 0.7, fh * 0.55 - H(11)); g.lineTo(fw * 0.66, fh * 0.55 - H(6)); g.lineTo(fw * 0.66, fh * 0.55); g.closePath();
        g.fill(); g.stroke();
        g.fillStyle = '#ff6ac0'; g.fillRect(fw * 0.6, fh * 0.55 - H(5), 7, H(4));
    };
    P.lab.up = 170;

    // =========================================================
    // ARMY CAMP
    // =========================================================
    P.armycamp = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.5, fh * 1.5, 0.9);
        diamondPath(g, 0, 2, fw * 0.98, fh * 0.98);
        g.fillStyle = '#7d6a48'; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
        rimTrim(g, geo, 0.98, 2);
        g.save(); diamondPath(g, 0, 2, fw * 0.98, fh * 0.98); g.clip();
        g.globalAlpha = 0.55; g.drawImage(T.rock(96, 64, '#8a7650', 31), -fw, -fh, fw * 2, fh * 2.1); g.restore();
        // tent: front-facing pyramid of canvas with stripes
        const cloth = ['#cdb98a', '#b04a3a', '#3f6aa8', '#7a4aa0'][t];
        const trimc = ['#8a6a3a', '#e8d8b0', '#e8d8b0', '#e2c26a'][t];
        const apex = { x: -fw * 0.1, y: -H(40) };
        const Lp = { x: -fw * 0.78, y: fh * 0.1 }, Bp = { x: -fw * 0.1, y: fh * 0.62 }, Rp = { x: fw * 0.58, y: fh * 0.08 }, Tp = { x: -fw * 0.1, y: -fh * 0.42 };
        const tri = (p0, p1, col, dark) => {
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(apex.x, apex.y); g.closePath();
            const gr = g.createLinearGradient(p0.x, 0, p1.x, 0);
            gr.addColorStop(0, shade(col, dark ? 0.7 : 1.15)); gr.addColorStop(1, shade(col, dark ? 0.55 : 0.9));
            g.fillStyle = gr; g.fill();
            g.save(); g.clip();
            g.strokeStyle = trimc; g.lineWidth = 4;
            for (let i = 1; i < 4; i++) { const f = i / 4; g.beginPath(); g.moveTo(p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f); g.lineTo(apex.x, apex.y); g.stroke(); }
            g.restore();
            g.strokeStyle = A.EDGE; g.lineWidth = 0.9; g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(apex.x, apex.y); g.closePath(); g.stroke();
        };
        tri(Lp, Bp, cloth, false);
        tri(Bp, Rp, cloth, true);
        // door flap
        g.fillStyle = '#2a1c12';
        g.beginPath(); g.moveTo(Bp.x - 6, Bp.y - 1); g.lineTo(Bp.x, apex.y + 34); g.lineTo(Bp.x + 6, Bp.y - 1); g.closePath(); g.fill();
        g.strokeStyle = trimc; g.lineWidth = 1.2; g.stroke();
        // banner pole
        g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(apex.x, apex.y); g.lineTo(apex.x, apex.y - 14); g.stroke();
        geo.anchor('flag', apex.x, apex.y - 14, { color: ['#c73535', '#e8c35a', '#e8c35a', '#e8c35a'][t], w: 14 });
        // campfire with logs
        const fx = fw * 0.5, fy = fh * 0.58;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(fx, fy + 2, 9, 4, 0, 0, 7); g.fill();
        g.strokeStyle = '#5a3a1c'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(fx - 7, fy + 2); g.lineTo(fx + 6, fy - 2); g.moveTo(fx - 6, fy - 2); g.lineTo(fx + 7, fy + 2); g.stroke();
        g.fillStyle = '#6a6a72'; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; g.beginPath(); g.ellipse(fx + Math.cos(a) * 9, fy + 1 + Math.sin(a) * 3.6, 2, 1.4, 0, 0, 7); g.fill(); }
        geo.anchor('fire', fx, fy - 1, { s: 1 });
        geo.light(fx, fy - 4, 20, '#ffa850');
        // weapon rack with spears
        g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(-fw * 0.78, fh * 0.55); g.lineTo(-fw * 0.78, fh * 0.55 - H(14)); g.moveTo(-fw * 0.52, fh * 0.68); g.lineTo(-fw * 0.52, fh * 0.68 - H(14)); g.moveTo(-fw * 0.78, fh * 0.55 - H(11)); g.lineTo(-fw * 0.52, fh * 0.68 - H(11)); g.stroke();
        g.strokeStyle = '#a07a4a'; g.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
            const sx = -fw * 0.74 + i * 6, sy = fh * 0.58 + i * 2.4;
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 2, sy - H(20)); g.stroke();
            g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(sx + 2, sy - H(24)); g.lineTo(sx + 4, sy - H(19)); g.lineTo(sx, sy - H(19)); g.closePath(); g.fill();
        }
        // barrels
        for (const [bx, by] of [[fw * 0.14, fh * 0.66], [fw * 0.3, fh * 0.56]]) {
            const bg = g.createLinearGradient(bx - 5, 0, bx + 5, 0);
            bg.addColorStop(0, '#9a6a3a'); bg.addColorStop(1, '#5a3a1c');
            g.fillStyle = bg; g.strokeStyle = '#1e140c'; g.lineWidth = 0.9;
            g.beginPath(); g.moveTo(bx - 4.5, by); g.quadraticCurveTo(bx - 6, by - 5, bx - 4.5, by - 9); g.lineTo(bx + 4.5, by - 9); g.quadraticCurveTo(bx + 6, by - 5, bx + 4.5, by); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = '#c8a070'; g.beginPath(); g.ellipse(bx, by - 9, 4.5, 1.8, 0, 0, 7); g.fill(); g.stroke();
        }
    };

    // =========================================================
    // WALL — variant is a 4-bit mask of connected neighbours:
    //   1 = +x (down-right), 2 = +y (down-left), 4 = -x (up-left), 8 = -y (up-right)
    // =========================================================
    P.wall = (g, geo, tier, mask = 0) => {
        const { fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        const stone = ['#9a9486', '#a8a4a0', '#8a90a0', '#d4cba8'][t];
        const trimc = t === 3 ? '#e8c35a' : t === 2 ? '#4a5060' : shade(stone, 0.7);
        const texL = T.stone(70, 60, stone, { rows: 4, seed: 41 + t, aspect: 1.5 });
        const texR = T.stone(70, 60, shade(stone, 0.96), { rows: 4, seed: 42 + t, aspect: 1.5 });
        const topC = shade(stone, 1.1);
        const hw = H(22 + t * 1.5), ha = H(18 + t * 1.2);
        geo.shadowAt(5, 3, geo.fw * 1.1, fh * 1.1, 0.8);
        // Arms are prisms along a tile axis. Centre of an arm = 0.35 tile from the tile centre.
        const tw = K.data.CFG.tileW, th = K.data.CFG.tileH;
        const ex = [tw / 2, th / 2], ey = [-tw / 2, th / 2];
        const drawArm = (sx, sy) => {
            // direction vector (sx, sy) in tile space is (±1,0) or (0,±1)
            const cx = (sx * ex[0] + sy * ey[0]) * 0.36, cy = (sx * ex[1] + sy * ey[1]) * 0.36;
            const a = sx !== 0 ? 0.15 : 0.12, b = sx !== 0 ? 0.12 : 0.15;
            prism(g, { cx, cy, a, b, h: ha, lift: 0, L: texL, R: texR, top: topC });
        };
        if (mask & 4) drawArm(-1, 0);
        if (mask & 8) drawArm(0, -1);
        // pillar
        prism(g, { cx: 0, cy: 0, a: 0.2, b: 0.2, h: hw, L: texL, R: texR, top: topC });
        // merlon cap on the pillar
        prism(g, { cx: 0, cy: 0, a: 0.235, b: 0.235, h: H(4), lift: hw, L: shade(stone, 1.05), R: shade(stone, 0.7), top: shade(topC, 1.05) });
        if (t >= 1) {
            g.fillStyle = trimc;
            prism(g, { cx: 0, cy: 0, a: 0.215, b: 0.215, h: H(2.2), lift: hw * 0.45, L: trimc, R: shade(trimc, 0.7) });
        }
        if (mask & 1) drawArm(1, 0);
        if (mask & 2) drawArm(0, 1);
        // moss for the oldest tier only
        if (t === 0) {
            g.fillStyle = 'rgba(80,130,50,0.7)';
            g.beginPath(); g.ellipse(-4, -2, 3, 1.6, 0, 0, 7); g.ellipse(5, -hw * 0.7, 2.4, 1.4, 0, 0, 7); g.fill();
        }
        if (t === 3) geo.anchor('sparkle', 0, -hw - H(5), { color: '#fff3a8' });
    };
    P.wall.up = 80;
})(window.KOE = window.KOE || {});
