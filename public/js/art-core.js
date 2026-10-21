/* ============================================================
   Art core — procedural textures, isometric drawing helpers and
   the sprite cache. Nothing in here knows about game state.

   Buildings are painted once into offscreen canvases (at SS times
   the on-screen resolution), outlined, and blitted every frame.
   Each sprite also keeps an alpha mask so clicks can hit the
   pixels the player actually sees.
   ============================================================ */
(function (K) {
    'use strict';
    const { CFG, VIEWS } = K.data;
    const U = K.util;
    const { shade, mixColor, clamp } = U;

    // sprite supersampling: sharper on high-density screens, where zoomed-in sprites would otherwise go soft
    const SS = (window.devicePixelRatio || 1) >= 1.5 ? 4 : 3;
    const view = { name: 'balanced', hk: VIEWS.balanced.hk };

    // ---------- tiny utilities ----------
    const mk = (w, h) => {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.ceil(w));
        c.height = Math.max(1, Math.ceil(h));
        return c;
    };
    // mulberry32: small seeded PRNG so every texture is the same on every load
    const rng = (seed) => {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };
    // Hash a pair of ints to [0,1)
    const hash2 = (x, y) => {
        let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) >>> 0;
        h = (h ^ (h >>> 13)) >>> 0;
        h = Math.imul(h, 1274126177) >>> 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const rgba = (c, a) => {
        const [r, g, b] = U.hexToRgb(c);
        return `rgba(${r},${g},${b},${a})`;
    };

    // Tileable value noise on a power-of-two lattice (wraps, so textures repeat cleanly)
    const makeNoise = (seed, lattice) => {
        const r = rng(seed);
        const n = lattice * lattice;
        const g = new Float32Array(n);
        for (let i = 0; i < n; i++) g[i] = r();
        const mask = lattice - 1;
        const sm = (t) => t * t * (3 - 2 * t);
        return (x, y) => {
            const xi = Math.floor(x), yi = Math.floor(y);
            const xf = sm(x - xi), yf = sm(y - yi);
            const x0 = xi & mask, x1 = (xi + 1) & mask, y0 = yi & mask, y1 = (yi + 1) & mask;
            const a = g[y0 * lattice + x0], b = g[y0 * lattice + x1];
            const c = g[y1 * lattice + x0], d = g[y1 * lattice + x1];
            return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
        };
    };
    // Tileable fractal noise over [0,1)^2 -> roughly [0,1]
    const makeFbm = (seed, octaves = 4, base = 4) => {
        const ns = [];
        for (let i = 0; i < octaves; i++) ns.push(makeNoise(seed + i * 101, base << i));
        let norm = 0;
        for (let i = 0; i < octaves; i++) norm += 1 / (1 << i);
        return (u, v) => {
            let s = 0;
            for (let i = 0; i < octaves; i++) s += ns[i](u * (base << i), v * (base << i)) / (1 << i);
            return s / norm;
        };
    };

    // ---------- texture cache ----------
    const texCache = new Map();
    const cached = (key, build) => {
        let t = texCache.get(key);
        if (!t) { t = build(); texCache.set(key, t); }
        return t;
    };

    const rrect = (g, x, y, w, h, r) => {
        r = Math.min(r, w / 2, h / 2);
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
    };

    // Sprinkle fine grain over a finished texture so flat fills don't look plastic
    const grain = (g, w, h, seed, amount = 0.07, density = 0.5) => {
        const r = rng(seed);
        const n = Math.floor(w * h * density / 6);
        for (let i = 0; i < n; i++) {
            const x = r() * w, y = r() * h;
            g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${amount * r()})` : `rgba(255,255,255,${amount * r()})`;
            g.fillRect(x, y, 1 + r() * 1.5, 1 + r() * 1.5);
        }
    };

    const T = {};

    // Courses of cut stone with per-block tint, bevelled edges and chips
    T.stone = (w, h, base, o = {}) => cached(`stone|${w}|${h}|${base}|${o.rows}|${o.aspect}|${o.seed}`, () => {
        const c = mk(w, h), g = c.getContext('2d'), r = rng(o.seed || 7);
        const rows = o.rows || 5, rh = h / rows, asp = o.aspect || 1.8;
        g.fillStyle = shade(base, 0.62);
        g.fillRect(0, 0, w, h);
        for (let j = 0; j < rows; j++) {
            let x = -r() * rh * asp;
            const y = j * rh;
            while (x < w) {
                const bw = rh * asp * (0.7 + r() * 0.65);
                const f = 0.88 + r() * 0.24;
                g.fillStyle = shade(base, f);
                rrect(g, x + 0.9, y + 0.9, bw - 1.8, rh - 1.8, 1.6);
                g.fill();
                g.fillStyle = 'rgba(255,255,255,0.20)';
                g.fillRect(x + 1.6, y + 1, bw - 3.2, 1.3);
                g.fillStyle = 'rgba(0,0,0,0.20)';
                g.fillRect(x + 1.6, y + rh - 2.3, bw - 3.2, 1.3);
                if (r() < 0.35) {          // a chip or stain
                    g.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.1})`;
                    g.beginPath();
                    g.ellipse(x + bw * r(), y + rh * (0.3 + r() * 0.4), 1.5 + r() * 3, 1 + r() * 2, 0, 0, 7);
                    g.fill();
                }
                x += bw;
            }
        }
        grain(g, w, h, (o.seed || 7) + 3, 0.09);
        return c;
    });

    // Rough boulders for cave mouths and cliff faces
    T.rock = (w, h, base, seed = 3) => cached(`rock|${w}|${h}|${base}|${seed}`, () => {
        const c = mk(w, h), g = c.getContext('2d'), r = rng(seed);
        g.fillStyle = shade(base, 0.7);
        g.fillRect(0, 0, w, h);
        const f = makeFbm(seed, 4, 4);
        const img = g.getImageData(0, 0, w, h);
        const [br, bg, bb] = U.hexToRgb(base);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const n = f(x / w, y / h);
            const k = 0.62 + n * 0.7;
            const i = (y * w + x) * 4;
            img.data[i] = br * k; img.data[i + 1] = bg * k; img.data[i + 2] = bb * k; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        g.strokeStyle = 'rgba(0,0,0,0.28)';
        g.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) {         // cracks
            let x = r() * w, y = r() * h;
            g.beginPath(); g.moveTo(x, y);
            for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 18; y += r() * 14; g.lineTo(x, y); }
            g.stroke();
        }
        grain(g, w, h, seed + 9, 0.1);
        return c;
    });

    // Vertical planks with grain and nails
    T.planks = (w, h, base, o = {}) => cached(`planks|${w}|${h}|${base}|${o.pw}|${o.seed}`, () => {
        const c = mk(w, h), g = c.getContext('2d'), r = rng(o.seed || 11);
        const pw = o.pw || 11;
        for (let x = 0; x < w; x += pw) {
            const f = 0.84 + r() * 0.3;
            const gr = g.createLinearGradient(x, 0, x + pw, 0);
            gr.addColorStop(0, shade(base, f * 1.08));
            gr.addColorStop(1, shade(base, f * 0.88));
            g.fillStyle = gr;
            g.fillRect(x, 0, pw, h);
            g.fillStyle = 'rgba(0,0,0,0.45)';
            g.fillRect(x, 0, 1.2, h);
            g.strokeStyle = 'rgba(0,0,0,0.13)';
            g.lineWidth = 0.8;
            for (let k = 0; k < 3; k++) {          // grain
                const gx = x + 2 + r() * (pw - 4);
                g.beginPath(); g.moveTo(gx, 0);
                g.bezierCurveTo(gx + 2, h * 0.3, gx - 2, h * 0.6, gx + 1, h);
                g.stroke();
            }
            if (r() < 0.25) {                       // knot
                g.fillStyle = 'rgba(40,20,8,0.4)';
                g.beginPath(); g.ellipse(x + pw / 2, r() * h, 1.6, 2.6, 0, 0, 7); g.fill();
            }
            g.fillStyle = 'rgba(30,20,10,0.55)';
            g.fillRect(x + pw / 2 - 0.6, 3, 1.4, 1.4);
            g.fillRect(x + pw / 2 - 0.6, h - 5, 1.4, 1.4);
        }
        grain(g, w, h, (o.seed || 11) + 1, 0.06);
        return c;
    });

    // Lime plaster, used between timber frames
    T.plaster = (w, h, base, seed = 5) => cached(`plaster|${w}|${h}|${base}|${seed}`, () => {
        const c = mk(w, h), g = c.getContext('2d'), r = rng(seed);
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) {
            g.fillStyle = `rgba(${r() < 0.5 ? '90,70,40' : '255,255,255'},${0.04 + r() * 0.07})`;
            g.beginPath();
            g.ellipse(r() * w, r() * h, 6 + r() * 16, 3 + r() * 9, r() * 3, 0, 7);
            g.fill();
        }
        grain(g, w, h, seed + 2, 0.08);
        return c;
    });

    // Overlapping roof tiles. Rows run horizontally; scallops point down.
    T.shingles = (w, h, base, o = {}) => cached(`shing|${w}|${h}|${base}|${o.rows}|${o.seed}`, () => {
        const c = mk(w, h), g = c.getContext('2d'), r = rng(o.seed || 21);
        const rows = o.rows || 8, rh = h / rows, tw = o.tw || 12;
        g.fillStyle = shade(base, 0.55);
        g.fillRect(0, 0, w, h);
        for (let j = -1; j < rows; j++) {
            const y = j * rh + rh * 0.5;
            const off = (j % 2) * tw / 2;
            for (let x = -tw; x < w + tw; x += tw) {
                const f = 0.88 + r() * 0.26;
                const gr = g.createLinearGradient(0, y, 0, y + rh * 1.25);
                gr.addColorStop(0, shade(base, f * 1.12));
                gr.addColorStop(1, shade(base, f * 0.86));
                g.fillStyle = gr;
                g.beginPath();
                g.moveTo(x + off, y);
                g.lineTo(x + off + tw, y);
                g.lineTo(x + off + tw, y + rh * 0.65);
                g.quadraticCurveTo(x + off + tw / 2, y + rh * 1.45, x + off, y + rh * 0.65);
                g.closePath();
                g.fill();
                g.strokeStyle = 'rgba(0,0,0,0.32)';
                g.lineWidth = 0.9;
                g.stroke();
            }
        }
        grain(g, w, h, (o.seed || 21) + 4, 0.07);
        return c;
    });

    // Riveted iron plates
    T.iron = (w, h, base, seed = 9) => cached(`iron|${w}|${h}|${base}|${seed}`, () => {
        const c = mk(w, h), g = c.getContext('2d'), r = rng(seed);
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, shade(base, 1.1));
        gr.addColorStop(1, shade(base, 0.78));
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        const pw = w / 3, ph = h / 2;
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 1.2;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
            const x = i * pw, y = j * ph;
            g.strokeRect(x + 0.6, y + 0.6, pw - 1.2, ph - 1.2);
            g.fillStyle = 'rgba(255,255,255,0.22)';
            g.fillRect(x + 1.5, y + 1.5, pw - 3, 1.4);
            g.fillStyle = shade(base, 1.35);
            for (const [dx, dy] of [[4, 4], [pw - 4, 4], [4, ph - 4], [pw - 4, ph - 4]]) {
                g.beginPath(); g.arc(x + dx, y + dy, 1.5, 0, 7); g.fill();
            }
        }
        grain(g, w, h, seed + 5, 0.1);
        return c;
    });

    // Rows of thatch, for huts and tents
    T.thatch = (w, h, base, seed = 4) => cached(`thatch|${w}|${h}|${base}|${seed}`, () => {
        const c = mk(w, h), g = c.getContext('2d'), r = rng(seed);
        g.fillStyle = shade(base, 0.7);
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < w * h / 14; i++) {
            const x = r() * w, y = r() * h;
            g.strokeStyle = shade(base, 0.7 + r() * 0.65);
            g.lineWidth = 1 + r();
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + 4 + r() * 8); g.stroke();
        }
        return c;
    });

    // Draw a texture onto one side face of a box.
    //   side 'R' = the face that looks down-right, 'L' = down-left.
    // x,y is the footprint centre on the ground; lift raises everything.
    const faceTex = (g, tex, side, x, y, fw, fh, h, lift) => {
        const W = tex.width, H = tex.height;
        g.save();
        if (side === 'R') g.transform(fw / W, -fh / W, 0, h / H, x, y + fh - lift - h);
        else g.transform(fw / W, fh / W, 0, h / H, x - fw, y - lift - h);
        g.drawImage(tex, 0, 0);
        g.restore();
    };
    // Texture on the horizontal diamond at height `lift`
    const topTex = (g, tex, x, y, fw, fh, lift) => {
        const W = tex.width, H = tex.height;
        g.save();
        g.transform(fw / W, fh / W, -fw / H, fh / H, x, y - lift - fh);
        g.drawImage(tex, 0, 0);
        g.restore();
    };

    // ---------- shapes ----------
    const diamondPath = (g, x, y, fw, fh) => {
        g.beginPath();
        g.moveTo(x, y - fh); g.lineTo(x + fw, y); g.lineTo(x, y + fh); g.lineTo(x - fw, y);
        g.closePath();
    };
    const EDGE = 'rgba(30,18,10,0.55)';
    const LIGHT = { L: 1.0, R: 0.66, top: 1.12 };

    // A textured box. tex: {L, R, top} each a canvas or colour string.
    const box = (g, o) => {
        const { x, y, fw, fh, h } = o;
        const lift = o.lift || 0;
        const faces = [['L', o.L], ['R', o.R]];
        for (const [side, tx] of faces) {
            if (!tx) continue;
            g.save();
            g.beginPath();
            if (side === 'R') {
                g.moveTo(x, y + fh - lift); g.lineTo(x + fw, y - lift);
                g.lineTo(x + fw, y - lift - h); g.lineTo(x, y + fh - lift - h);
            } else {
                g.moveTo(x - fw, y - lift); g.lineTo(x, y + fh - lift);
                g.lineTo(x, y + fh - lift - h); g.lineTo(x - fw, y - lift - h);
            }
            g.closePath();
            g.clip();
            if (typeof tx === 'string') {
                g.fillStyle = tx; g.fillRect(x - fw - 2, y - lift - h - 2, fw * 2 + 4, h + fh + 4);
            } else {
                faceTex(g, tx, side, x, y, fw, fh, h, lift);
            }
            // shading: side tint, ambient occlusion toward the ground, light rim on top
            g.fillStyle = side === 'R' ? 'rgba(10,6,30,0.32)' : 'rgba(255,240,200,0.04)';
            g.fillRect(x - fw - 2, y - lift - h - 2, fw * 2 + 4, h + fh + 4);
            const gx = side === 'R' ? x : x - fw;
            const ao = g.createLinearGradient(0, y + fh - lift - h, 0, y + fh - lift);
            ao.addColorStop(0, 'rgba(255,255,255,0.10)');
            ao.addColorStop(0.18, 'rgba(255,255,255,0)');
            ao.addColorStop(0.7, 'rgba(0,0,0,0)');
            ao.addColorStop(1, 'rgba(0,0,0,0.28)');
            g.fillStyle = ao;
            g.fillRect(gx - 1, y - lift - h - 2, fw + 2, h + fh + 4);
            g.restore();
            g.strokeStyle = EDGE; g.lineWidth = 0.9;
            g.beginPath();
            if (side === 'R') {
                g.moveTo(x, y + fh - lift); g.lineTo(x + fw, y - lift);
                g.lineTo(x + fw, y - lift - h); g.lineTo(x, y + fh - lift - h);
            } else {
                g.moveTo(x - fw, y - lift); g.lineTo(x, y + fh - lift);
                g.lineTo(x, y + fh - lift - h); g.lineTo(x - fw, y - lift - h);
            }
            g.closePath();
            g.stroke();
        }
        if (o.top) {
            const ty = y - lift - h;
            g.save();
            diamondPath(g, x, ty, fw, fh);
            g.clip();
            if (typeof o.top === 'string') { g.fillStyle = o.top; g.fillRect(x - fw, ty - fh, fw * 2, fh * 2); }
            else topTex(g, o.top, x, y, fw, fh, lift + h);
            const hi = g.createLinearGradient(x - fw, ty, x + fw, ty);
            hi.addColorStop(0, 'rgba(255,255,255,0.12)');
            hi.addColorStop(1, 'rgba(0,0,0,0.12)');
            g.fillStyle = hi; g.fillRect(x - fw, ty - fh, fw * 2, fh * 2);
            g.restore();
            g.strokeStyle = EDGE; g.lineWidth = 0.9;
            diamondPath(g, x, ty, fw, fh); g.stroke();
            // bright lip on the two front edges
            g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(x - fw, ty); g.lineTo(x, ty + fh); g.lineTo(x + fw, ty); g.stroke();
        }
    };

    // Round tower body: a cylinder with courses of stone drawn as curved bands.
    const cyl = (g, o) => {
        const { x, y, rx, ry, h } = o;
        const lift = o.lift || 0;
        const base = o.color || '#9a9486';
        const yb = y - lift;                 // centre of the bottom ellipse
        const yt = yb - h;                   // centre of the top ellipse
        g.save();
        g.beginPath();
        g.moveTo(x - rx, yt);
        g.lineTo(x - rx, yb);
        g.ellipse(x, yb, rx, ry, 0, Math.PI, 0, true);   // front arc, left to right
        g.lineTo(x + rx, yt);
        g.ellipse(x, yt, rx, ry, 0, 0, Math.PI, false);  // back across the top (clipped by top fill)
        g.closePath();
        g.clip();
        // base fill with light from the left
        const gr = g.createLinearGradient(x - rx, 0, x + rx, 0);
        gr.addColorStop(0, shade(base, 1.18));
        gr.addColorStop(0.35, shade(base, 1.0));
        gr.addColorStop(0.75, shade(base, 0.72));
        gr.addColorStop(1, shade(base, 0.55));
        g.fillStyle = gr;
        g.fillRect(x - rx - 1, yt - ry - 1, rx * 2 + 2, h + ry * 2 + 2);
        // stone courses
        const courses = o.courses || Math.max(3, Math.round(h / 9));
        const ch = h / courses;
        g.lineWidth = 0.9;
        for (let j = 0; j <= courses; j++) {
            const cy = yt + j * ch;
            g.strokeStyle = 'rgba(20,12,8,0.30)';
            g.beginPath(); g.ellipse(x, cy, rx, ry, 0, 0, Math.PI); g.stroke();
            if (j < courses) {
                const joints = o.joints || Math.max(4, Math.round(rx / 3.2));
                for (let k = 1; k < joints; k++) {
                    const th = (k + (j % 2) * 0.5) / joints * Math.PI;
                    const jx = x - Math.cos(th) * rx;
                    const jy = cy + Math.sin(th) * ry;
                    g.beginPath(); g.moveTo(jx, jy); g.lineTo(jx, jy + ch); g.stroke();
                }
            }
        }
        // ambient occlusion at the foot
        const ao = g.createLinearGradient(0, yt, 0, yb + ry);
        ao.addColorStop(0, 'rgba(255,255,255,0.10)');
        ao.addColorStop(0.2, 'rgba(255,255,255,0)');
        ao.addColorStop(0.75, 'rgba(0,0,0,0)');
        ao.addColorStop(1, 'rgba(0,0,0,0.35)');
        g.fillStyle = ao;
        g.fillRect(x - rx - 1, yt - ry, rx * 2 + 2, h + ry * 2 + 2);
        g.restore();
        g.strokeStyle = EDGE; g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(x - rx, yt); g.lineTo(x - rx, yb);
        g.ellipse(x, yb, rx, ry, 0, Math.PI, 0, true);
        g.lineTo(x + rx, yt);
        g.stroke();
        if (o.top !== false) {
            g.beginPath(); g.ellipse(x, yt, rx, ry, 0, 0, Math.PI * 2);
            const tg = g.createLinearGradient(x - rx, yt, x + rx, yt);
            const tc = o.topColor || shade(base, 1.12);
            tg.addColorStop(0, shade(tc, 1.1)); tg.addColorStop(1, shade(tc, 0.85));
            g.fillStyle = tg; g.fill(); g.stroke();
        }
    };

    // Pointed cone roof on a round tower (with shingle rows)
    const cone = (g, o) => {
        const { x, y, rx, ry, h } = o;
        const lift = o.lift || 0;
        const yb = y - lift, ya = yb - h;
        const base = o.color || '#b6452d';
        g.save();
        g.beginPath();
        g.moveTo(x - rx, yb);
        g.ellipse(x, yb, rx, ry, 0, Math.PI, 0, true);
        g.lineTo(x, ya);
        g.closePath();
        g.clip();
        const gr = g.createLinearGradient(x - rx, 0, x + rx, 0);
        gr.addColorStop(0, shade(base, 1.2));
        gr.addColorStop(0.4, shade(base, 1.0));
        gr.addColorStop(1, shade(base, 0.55));
        g.fillStyle = gr;
        g.fillRect(x - rx - 1, ya - 1, rx * 2 + 2, h + ry + 2);
        const rows = o.rows || 7;
        for (let j = 1; j <= rows; j++) {
            const t = j / rows;
            const cy = ya + h * t, cr = rx * t, cry = ry * t;
            g.strokeStyle = 'rgba(15,8,6,0.32)'; g.lineWidth = 0.9;
            g.beginPath(); g.ellipse(x, cy, cr, cry, 0, 0, Math.PI); g.stroke();
            const n = Math.max(3, Math.round(cr / 3));
            for (let k = 1; k < n; k++) {
                const th = (k + (j % 2) * 0.5) / n * Math.PI;
                const jx = x - Math.cos(th) * cr, jy = cy + Math.sin(th) * cry;
                const pr = (j - 1) / rows;
                g.beginPath();
                g.moveTo(jx, jy);
                g.lineTo(x - Math.cos(th) * rx * pr, ya + h * pr + Math.sin(th) * ry * pr);
                g.stroke();
            }
        }
        g.restore();
        g.strokeStyle = EDGE; g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(x - rx, yb); g.lineTo(x, ya); g.lineTo(x + rx, yb);
        g.ellipse(x, yb, rx, ry, 0, 0, Math.PI, false);
        g.stroke();
    };

    // Four-sided hip roof over a box: two visible triangular slopes
    const pyramid = (g, o) => {
        const { x, y, fw, fh, h } = o;
        const lift = o.lift || 0;
        const base = o.color || '#b6452d';
        const yb = y - lift;
        const ex = o.eave || 0;                 // overhang
        const rw = fw + ex, rh = fh + ex * (fh / fw);
        const apex = { x, y: yb - h - rh * 0 };
        const L = { x: x - rw, y: yb }, R = { x: x + rw, y: yb }, B = { x, y: yb + rh };
        const tex = o.tex;
        const slope = (p0, p1, side) => {
            g.save();
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(apex.x, apex.y); g.closePath();
            g.clip();
            if (tex) {
                const W = tex.width, H = tex.height;
                const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
                g.transform((p1.x - p0.x) / W, (p1.y - p0.y) / W, (apex.x - mx) / H, (apex.y - my) / H, p0.x, p0.y);
                g.drawImage(tex, 0, 0);
            } else {
                g.fillStyle = base; g.fillRect(x - rw, apex.y, rw * 2, rh + h + 2);
            }
            g.restore();
            g.fillStyle = side === 'R' ? 'rgba(8,4,28,0.34)' : 'rgba(255,235,190,0.06)';
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(apex.x, apex.y); g.closePath(); g.fill();
            g.strokeStyle = EDGE; g.lineWidth = 0.9; g.stroke();
        };
        slope(L, B, 'L');
        slope(B, R, 'R');
        // light ridge line from the apex to the front corner
        g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(apex.x, apex.y); g.lineTo(B.x, B.y); g.stroke();
        return apex;
    };

    // Battlements around the top edge of a box. Little blocks along the two back edges
    // and the two front edges so they read from any angle.
    const crenel = (g, o) => {
        const { x, y, fw, fh } = o;
        const lift = o.lift || 0;
        const n = o.n || 4, mh = o.mh || 6, base = o.color || '#9a9486';
        const yt = y - lift;
        const seg = (ax, ay, bx, by, front) => {
            for (let i = 0; i < n; i++) {
                const t = (i + 0.5) / n;
                const mx = ax + (bx - ax) * t, my = ay + (by - ay) * t;
                const bw = Math.abs(bx - ax) / n * 0.34;
                const bhh = bw * (fh / fw) ;
                // block: small box
                box(g, { x: mx, y: my, fw: bw, fh: bhh, h: mh, L: shade(base, 1.0), R: shade(base, 0.66), top: shade(base, 1.14) });
            }
        };
        // back edges first so front blocks overlap them
        seg(x - fw, yt, x, yt - fh, false);
        seg(x, yt - fh, x + fw, yt, false);
        seg(x - fw, yt, x, yt + fh, true);
        seg(x, yt + fh, x + fw, yt, true);
    };

    // Ground contact: soft shadow (falls to the lower right) and a dark base patch
    const shadowSprite = cached('shadow', () => {
        const c = mk(128, 128), g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
        gr.addColorStop(0, 'rgba(10,8,30,0.34)');
        gr.addColorStop(0.55, 'rgba(10,8,30,0.17)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        return c;
    });
    const dropShadow = (g, x, y, rx, ry, a = 1) => {
        g.save();
        g.globalAlpha = a;
        g.drawImage(shadowSprite, x - rx, y - ry, rx * 2, ry * 2);
        g.restore();
    };

    // ---------- sprite cache ----------
    // Painters register themselves on K.art.painters[type] = (P, tier, o) => void
    const painters = {};
    const sprites = new Map();
    // How much room above/below/side the canvas needs, per footprint size
    const HEADROOM = { 1: 150, 2: 230 };

    const geoFor = (size) => ({
        size,
        fw: CFG.tileW * size / 2,
        fh: CFG.tileH * size / 2,
        hk: view.hk,
    });

    // Dilate-and-fill outline so every sprite gets a clean, even edge
    const outlined = (src, color, px) => {
        const w = src.width, h = src.height;
        const tint = mk(w, h), tg = tint.getContext('2d');
        tg.drawImage(src, 0, 0);
        tg.globalCompositeOperation = 'source-in';
        tg.fillStyle = color; tg.fillRect(0, 0, w, h);
        const out = mk(w, h), og = out.getContext('2d');
        for (let i = 0; i < 16; i++) {
            const a = i / 16 * Math.PI * 2;
            og.drawImage(tint, Math.cos(a) * px, Math.sin(a) * px);
        }
        og.drawImage(src, 0, 0);
        return out;
    };

    // Build a sprite from a paint function. o.key makes it cacheable.
    const buildSprite = (paint, size, extra = {}) => {
        const geo = geoFor(size);
        geo.tier = extra.tier || 1;
        geo.lights = [];
        geo.anchors = [];
        geo.shadows = [];
        geo.shadowAt = (x, y, rx, ry, a) => geo.shadows.push({ x, y, rx, ry, a: a == null ? 1 : a });
        geo.light = (x, y, r, color) => geo.lights.push({ x, y, r, color: color || '#ffcf6a' });
        geo.anchor = (name, x, y, o) => geo.anchors.push(Object.assign({ name, x, y }, o || {}));
        const wUnits = Math.ceil(geo.fw * 2 + 72);
        const up = extra.up || HEADROOM[size] * (0.6 + 0.4 * geo.hk);
        const down = geo.fh + 26;
        const raw = mk(wUnits * SS, (up + down) * SS);
        const g = raw.getContext('2d');
        g.scale(SS, SS);
        g.translate(wUnits / 2, up);
        paint(g, geo);
        const lineCol = extra.outline || 'rgba(32,20,12,0.9)';
        const canvas = outlined(raw, lineCol, 1.35 * SS);
        const sp = { canvas, ox: wUnits / 2, oy: up, w: wUnits, h: up + down, mask: null, lights: geo.lights, anchors: geo.anchors, shadows: geo.shadows };
        return sp;
    };

    const maskOf = (sp) => {
        if (sp.mask) return sp.mask;
        const { canvas } = sp;
        const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        const W = canvas.width, H = canvas.height;
        const m = new Uint8Array(W * H);
        let x0 = W, y0 = H, x1 = 0, y1 = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const a = d[(y * W + x) * 4 + 3];
            m[y * W + x] = a;
            if (a > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        sp.bbox = { x0: x0 / SS - sp.ox, y0: y0 / SS - sp.oy, x1: x1 / SS - sp.ox, y1: y1 / SS - sp.oy };
        sp.mask = m;
        return m;
    };

    // Does world offset (dx,dy) from the sprite's origin land on a visible pixel?
    // `pad` widens the test by that many world units so thin parts are easy to hit.
    const hitSprite = (sp, dx, dy, pad = 0) => {
        const m = maskOf(sp);
        const cx = Math.round((dx + sp.ox) * SS), cy = Math.round((dy + sp.oy) * SS);
        const W = sp.canvas.width, H = sp.canvas.height;
        const r = Math.round(pad * SS);
        const step = Math.max(1, Math.floor(r / 2));
        for (let oy = -r; oy <= r; oy += step) {
            for (let ox = -r; ox <= r; ox += step) {
                if (ox * ox + oy * oy > r * r + 1) continue;
                const x = cx + ox, y = cy + oy;
                if (x < 0 || y < 0 || x >= W || y >= H) continue;
                if (m[y * W + x] > 40) return true;
            }
        }
        return false;
    };

    // Blit a sprite (soft ground shadow first, then the outlined art) with its origin at x,y
    const drawSprite = (g, sp, x, y, alpha = 1, shadow = true) => {
        if (shadow) for (const s of sp.shadows) dropShadow(g, x + s.x, y + s.y, s.rx, s.ry, s.a * alpha);
        if (alpha !== 1) { g.save(); g.globalAlpha = alpha; }
        g.drawImage(sp.canvas, x - sp.ox, y - sp.oy, sp.canvas.width / SS, sp.canvas.height / SS);
        if (alpha !== 1) g.restore();
    };

    // Tinted silhouette halo behind a sprite (hover / selection highlight)
    const drawGlow = (g, sp, x, y, color, px = 2.2) => {
        sp.tints = sp.tints || {};
        let t = sp.tints[color];
        if (!t) {
            t = mk(sp.canvas.width, sp.canvas.height);
            const tg = t.getContext('2d');
            tg.drawImage(sp.canvas, 0, 0);
            tg.globalCompositeOperation = 'source-in';
            tg.fillStyle = color; tg.fillRect(0, 0, t.width, t.height);
            sp.tints[color] = t;
        }
        const w = sp.canvas.width / SS, h = sp.canvas.height / SS;
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            g.drawImage(t, x - sp.ox + Math.cos(a) * px, y - sp.oy + Math.sin(a) * px, w, h);
        }
    };

    // Upgraded buildings get pennant posts at their side corners, so the tier reads from across the map:
    // silver and blue, then gold and purple, then gold with ruby caps and bigger red pennants.
    const flourish = (g, geo, tier, size) => {
        if (tier < 2) return;
        const X = geo.fw * 0.98, y = 2, H = size >= 2 ? 31 : 23;
        const pole = tier === 2 ? '#d9dee8' : '#f0c040';
        const flag = tier === 2 ? '#3a78d8' : tier === 3 ? '#8a45c8' : '#e8403c';
        const len = tier === 4 ? 15 : 10.5, drop = tier === 4 ? 9 : 6.5;
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        for (const s of [-1, 1]) {
            const x = s * X;
            g.strokeStyle = 'rgba(40,24,6,0.85)'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - H); g.stroke();
            g.strokeStyle = pole; g.lineWidth = 1.7; g.stroke();
            g.fillStyle = flag; g.strokeStyle = 'rgba(30,16,12,0.9)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(x, y - H); g.lineTo(x + s * len, y - H + drop * 0.5); g.lineTo(x, y - H + drop); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = tier === 4 ? '#ff5a5a' : pole; g.beginPath(); g.arc(x, y - H, tier === 4 ? 3 : 2.3, 0, 7); g.fill(); g.stroke();
        }
        g.restore();
    };

    const getSprite = (type, tier, variant = 0) => {
        const key = `${view.name}|${type}|${tier}|${variant}`;
        let sp = sprites.get(key);
        if (sp) return sp;
        const painter = painters[type];
        const size = K.data.BLD[type].size;
        const D = K.data.BLD[type];
        sp = buildSprite((g, geo) => { painter(g, geo, tier, variant); if (type !== 'townhall' && type !== 'wall' && !D.decor) flourish(g, geo, tier, size); }, size, { up: painters[type].up, tier });
        sp.type = type; sp.tier = tier;
        sprites.set(key, sp);
        return sp;
    };

    const setView = (name) => {
        if (!VIEWS[name]) name = 'balanced';
        const v = VIEWS[name];
        CFG.tileW = v.tileW;
        CFG.tileH = v.tileH;
        view.name = name;
        view.hk = v.hk;
        sprites.clear();
        K.art.spriteVersion = (K.art.spriteVersion || 0) + 1;
        K.art.thumbs = {};
        K.art.worldDirty = true;
    };

    K.art = {
        SS, view, mk, rng, hash2, rgba, makeNoise, makeFbm, rrect, grain, cached, T,
        faceTex, topTex, diamondPath, box, cyl, cone, pyramid, crenel, dropShadow, shadowSprite,
        painters, getSprite, drawSprite, drawGlow, hitSprite, maskOf, setView, geoFor, outlined, buildSprite,
        thumbs: {}, worldDirty: true, EDGE, LIGHT,
    };
})(window.KOE = window.KOE || {});
