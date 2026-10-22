/* ============================================================
   World art: the island ground (baked once), the endless meadow
   around it, scenery sprites (trees, rocks, lakes) and ambient
   effects. Rebuilt whenever the camera tilt preset changes.
   ============================================================ */
(function (K) {
    'use strict';
    const A = K.art;
    const { CFG } = K.data;
    const U = K.util;
    const { mk, rng, hash2, makeFbm, T, SS, box, shade } = Object.assign({}, A, { shade: U.shade });
    const { leafBlob } = A.h;

    const TD = CFG.tileDiv;               // tiles per old building tile: ground art is laid out in old units and scaled by this
    const G = 2;                          // island bake resolution
    const world = { ready: false };

    const iso = (tx, ty) => ({ x: (tx - ty) * CFG.tileW / 2, y: (tx + ty) * CFG.tileH / 2 });

    // ---------- seamless ground textures ----------
    const lerpRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const grassTex = (key, seed, dark, light, blades) => A.cached('grass|' + key, () => {
        const N = 256;
        const c = mk(N, N), g = c.getContext('2d');
        const f = makeFbm(seed, 4, 4), f2 = makeFbm(seed + 77, 3, 8);
        const img = g.createImageData(N, N);
        const d0 = U.hexToRgb(dark), l0 = U.hexToRgb(light);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const n = f(x / N, y / N) * 0.75 + f2(x / N, y / N) * 0.25;
            const k = Math.min(1, Math.max(0, (n - 0.3) * 1.9));
            const col = lerpRGB(d0, l0, k);
            const j = (hash2(x, y + seed) - 0.5) * 14;
            const i = (y * N + x) * 4;
            img.data[i] = col[0] + j; img.data[i + 1] = col[1] + j; img.data[i + 2] = col[2] + j * 0.6; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        const r = rng(seed + 5);
        const blade = (x, y, h, col) => {
            g.strokeStyle = col; g.lineWidth = 1.1; g.lineCap = 'round';
            g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 3, y - h * 0.6, x + (r() - 0.5) * 4, y - h); g.stroke();
        };
        for (let i = 0; i < blades; i++) {
            const x = r() * N, y = r() * N, h = 3 + r() * 5;
            const col = r() < 0.5 ? shade(light, 0.95 + r() * 0.25) : shade(dark, 0.8 + r() * 0.3);
            for (const ox of [0, N, -N]) for (const oy of [0, N, -N]) {
                const px = x + ox, py = y + oy;
                if (px > -8 && px < N + 8 && py > -8 && py < N + 8) blade(px, py, h, col);
            }
        }
        return c;
    });
    const dirtTex = () => A.cached('dirt', () => {
        const N = 128;
        const c = mk(N, N), g = c.getContext('2d');
        const f = makeFbm(909, 4, 4);
        const img = g.createImageData(N, N);
        const a = U.hexToRgb('#8a6a42'), b = U.hexToRgb('#b99564');
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const col = lerpRGB(a, b, Math.min(1, Math.max(0, (f(x / N, y / N) - 0.25) * 2)));
            const j = (hash2(x, y) - 0.5) * 16;
            const i = (y * N + x) * 4;
            img.data[i] = col[0] + j; img.data[i + 1] = col[1] + j; img.data[i + 2] = col[2] + j; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        const r = rng(4);
        for (let i = 0; i < 90; i++) {
            g.fillStyle = r() < 0.5 ? 'rgba(60,40,20,0.35)' : 'rgba(230,200,150,0.35)';
            const x = r() * N, y = r() * N;
            g.beginPath(); g.ellipse(x, y, 0.8 + r() * 1.6, 0.6 + r(), 0, 0, 7); g.fill();
        }
        return c;
    });
    const cliffTex = (dark) => A.cached('cliff|' + dark, () => {
        const W = 256, H = 64;
        const c = mk(W, H), g = c.getContext('2d'), r = rng(88);
        const bands = ['#7a5a3a', '#6a4c30', '#85633f', '#5e4328', '#76563a'];
        let y = 0;
        while (y < H) {
            const h = 7 + r() * 10;
            g.fillStyle = shade(bands[Math.floor(r() * bands.length)], dark ? 0.85 : 1);
            g.fillRect(0, y, W, h);
            g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y + h - 1.4, W, 1.4);
            y += h;
        }
        for (let i = 0; i < 46; i++) {              // embedded stones
            const x = r() * W, yy = r() * H, rx = 4 + r() * 8, ry = 3 + r() * 5;
            const gr = g.createLinearGradient(x - rx, yy - ry, x + rx, yy + ry);
            gr.addColorStop(0, '#a89a86'); gr.addColorStop(1, '#5a4e42');
            g.fillStyle = gr; g.strokeStyle = 'rgba(20,12,6,0.6)'; g.lineWidth = 0.9;
            g.beginPath(); g.ellipse(x, yy, rx, ry, 0, 0, 7); g.fill(); g.stroke();
        }
        for (let i = 0; i < 18; i++) {              // roots hanging from the lip
            const x = r() * W; g.strokeStyle = 'rgba(40,24,10,0.7)'; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (r() - 0.5) * 8, 10, x + (r() - 0.5) * 10, 14 + r() * 14); g.stroke();
        }
        const sh = g.createLinearGradient(0, 0, 0, H);
        sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.38)');
        g.fillStyle = sh; g.fillRect(0, 0, W, H);
        return c;
    });

    const patternIso = (g, tex, tilesAcross) => {
        const pat = g.createPattern(tex, 'repeat');
        const k = tilesAcross * TD / 2 / tex.width;
        if (pat.setTransform) pat.setTransform(new DOMMatrix([k * CFG.tileW, k * CFG.tileH, -k * CFG.tileW, k * CFG.tileH, 0, 0]));
        return pat;
    };

    // ---------- scenery sprites ----------
    const simple = (w, h, ox, oy, paint, outline = 'rgba(24,36,16,0.85)') => {
        const raw = mk(w * SS, h * SS), g = raw.getContext('2d');
        g.scale(SS, SS); g.translate(ox, oy);
        const shadows = [];
        paint(g, shadows);
        const canvas = outline ? A.outlined(raw, outline, 1.1 * SS) : raw;
        return { canvas, ox, oy, w, h, shadows, lights: [], anchors: [] };
    };
    const pine = (s, seed, c1, c2) => simple(70 * s, 110 * s, 35 * s, 96 * s, (g, sh) => {
        sh.push({ x: 5, y: 3, rx: 26 * s, ry: 10 * s, a: 0.8 });
        g.fillStyle = '#4a2e16'; g.fillRect(-3 * s, -14 * s, 6 * s, 16 * s);
        const tiers = [[30, 30, 0], [25, 28, 22], [20, 26, 42], [14, 24, 60]];
        tiers.forEach(([hw, hh, off], i) => {
            const by = -off * s - 4 * s, ty = by - hh * s;
            const gr = g.createLinearGradient(-hw * s, 0, hw * s, 0);
            gr.addColorStop(0, shade(i % 2 ? c2 : c1, 1.25)); gr.addColorStop(0.45, i % 2 ? c2 : c1); gr.addColorStop(1, shade(i % 2 ? c2 : c1, 0.5));
            g.fillStyle = gr;
            g.beginPath(); g.moveTo(0, ty); g.lineTo(hw * s, by); g.quadraticCurveTo(0, by + 7 * s, -hw * s, by); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(8,24,8,0.4)'; g.lineWidth = 0.9; g.stroke();
        });
    });
    const roundTree = (s, c1, c2, c3, seed) => simple(90 * s, 110 * s, 45 * s, 96 * s, (g, sh) => {
        sh.push({ x: 6, y: 3, rx: 30 * s, ry: 11 * s, a: 0.8 });
        const tg = g.createLinearGradient(-5 * s, 0, 5 * s, 0);
        tg.addColorStop(0, '#9a6a3a'); tg.addColorStop(1, '#4a2e16');
        g.fillStyle = tg; g.beginPath(); g.moveTo(-5 * s, 2); g.quadraticCurveTo(-3 * s, -22 * s, -3 * s, -34 * s); g.lineTo(3 * s, -34 * s); g.quadraticCurveTo(3 * s, -20 * s, 6 * s, 2); g.closePath(); g.fill();
        leafBlob(g, -14 * s, -44 * s, 17 * s, c1, seed);
        leafBlob(g, 15 * s, -42 * s, 16 * s, c1, seed + 2);
        leafBlob(g, 0, -56 * s, 21 * s, c2, seed + 4);
        leafBlob(g, -9 * s, -62 * s, 13 * s, c3, seed + 6);
        leafBlob(g, 10 * s, -60 * s, 12 * s, c3, seed + 8);
    });
    const rockSpr = (s, seed, base) => simple(60 * s, 50 * s, 30 * s, 40 * s, (g, sh) => {
        sh.push({ x: 4, y: 2, rx: 22 * s, ry: 8 * s, a: 0.8 });
        const r = rng(seed);
        const pts = [[-20, 0], [-22, -12], [-10, -26], [4, -30], [18, -20], [22, -6], [16, 2]];
        g.beginPath(); pts.forEach(([x, y], i) => { x *= s; y *= s; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath();
        const gr = g.createLinearGradient(-22 * s, -30 * s, 22 * s, 4 * s);
        gr.addColorStop(0, shade(base, 1.35)); gr.addColorStop(0.5, base); gr.addColorStop(1, shade(base, 0.55));
        g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(16,14,20,0.6)'; g.lineWidth = 1; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.3)';
        g.beginPath(); g.moveTo(-4 * s, -29 * s); g.lineTo(-2 * s, -14 * s); g.lineTo(8 * s, -4 * s); g.moveTo(-14 * s, -18 * s); g.lineTo(-4 * s, -14 * s); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(-10 * s, -26 * s); g.lineTo(4 * s, -30 * s); g.lineTo(0, -18 * s); g.lineTo(-12 * s, -14 * s); g.fill();
        if (r() < 0.8) { g.fillStyle = 'rgba(90,140,60,0.8)'; g.beginPath(); g.ellipse(-14 * s, -3 * s, 6 * s, 2.4 * s, 0, 0, 7); g.fill(); }
    });
    const bushSpr = (c, seed) => simple(60, 40, 30, 30, (g, sh) => {
        sh.push({ x: 3, y: 2, rx: 20, ry: 7, a: 0.7 });
        leafBlob(g, -8, -9, 9, shade(c, 0.85), seed); leafBlob(g, 8, -8, 9, shade(c, 0.85), seed + 1); leafBlob(g, 0, -13, 11, c, seed + 2);
        const r = rng(seed); g.fillStyle = '#ff6a8a';
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-10 + r() * 20, -18 + r() * 12, 1.4, 0, 7); g.fill(); }
    });
    const stumpSpr = () => simple(40, 30, 20, 22, (g, sh) => {
        sh.push({ x: 2, y: 1, rx: 14, ry: 5, a: 0.6 });
        g.fillStyle = '#6a4424'; g.beginPath(); g.moveTo(-8, 0); g.lineTo(-7, -9); g.lineTo(7, -9); g.lineTo(8, 0); g.closePath(); g.fill();
        g.fillStyle = '#d8b07a'; g.beginPath(); g.ellipse(0, -9, 7, 3, 0, 0, 7); g.fill(); g.strokeStyle = '#8a6a44'; g.beginPath(); g.ellipse(0, -9, 3.6, 1.5, 0, 0, 7); g.stroke();
    });
    const lakeSpr = (rx, ry) => simple(rx * 2 + 40, ry * 2 + 50, rx + 20, ry + 20, (g) => {
        g.fillStyle = '#c8b88a'; g.beginPath(); g.ellipse(0, 4, rx + 9, ry + 6, 0, 0, 7); g.fill();
        g.fillStyle = '#9a8a62'; g.beginPath(); g.ellipse(0, 7, rx + 9, ry + 6, 0, 0, Math.PI); g.fill();
        const gr = g.createRadialGradient(-rx * 0.3, -ry * 0.3, 4, 0, 0, Math.max(rx, ry));
        gr.addColorStop(0, '#7ad0ee'); gr.addColorStop(0.55, '#3a96cc'); gr.addColorStop(1, '#1e5f94');
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, rx - 2, ry - 1, 0, 0, 7); g.stroke();
        const r = rng(rx);
        for (let i = 0; i < 9; i++) {                 // reeds
            const a = r() * Math.PI * 2, x = Math.cos(a) * (rx + 4), y = Math.sin(a) * (ry + 3);
            g.strokeStyle = '#4a7a2a'; g.lineWidth = 1.4;
            for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + k * 2.4, y + 2); g.lineTo(x + k * 2.4 + (k - 1), y - 9 - k * 2); g.stroke(); }
            g.fillStyle = '#7a5a2a'; g.fillRect(x + 2.4 - 1, y - 14, 2.4, 5);
        }
        // lily pads
        for (let i = 0; i < 5; i++) { g.fillStyle = '#3a8a3a'; g.beginPath(); g.ellipse((r() - 0.5) * rx, (r() - 0.5) * ry, 5, 2.6, 0, 0, 7); g.fill(); }
    }, 'rgba(24,40,32,0.5)');

    // ---------- build ----------
    world.build = () => {
        const gw = CFG.gridW, gh = CFG.gridH, tw = CFG.tileW, th = CFG.tileH;
        const btw = tw * TD, bth = th * TD;                 // the width of one building-sized block
        const cliff = 36;
        const N = iso(0, 0), E = iso(gw, 0), S = iso(gw, gh), W = iso(0, gh);
        // island bake
        const pad = 60;
        const minX = W.x - pad, maxX = E.x + pad, minY = N.y - pad, maxY = S.y + cliff + pad;
        const cv = mk((maxX - minX) * G, (maxY - minY) * G), g = cv.getContext('2d');
        g.scale(G, G); g.translate(-minX, -minY);
        const poly = (p) => { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); };
        // soft shadow of the plateau on the meadow
        g.save(); g.shadowColor = 'rgba(6,16,8,0.55)'; g.shadowBlur = 26 * G; g.shadowOffsetY = 10 * G; g.fillStyle = '#000';
        poly([W, S, { x: S.x, y: S.y + cliff }, { x: W.x, y: W.y + cliff }]); g.fill();
        poly([S, E, { x: E.x, y: E.y + cliff }, { x: S.x, y: S.y + cliff }]); g.fill();
        g.restore();
        // earth walls (the two faces we can see)
        const cx = 0, cy = (N.y + S.y) / 2, fw = gw * tw / 2, fh = gh * th / 2;
        box(g, { x: cx, y: cy, fw, fh, h: cliff, lift: -cliff, L: cliffTex(false), R: cliffTex(true) });
        // grass top
        poly([N, E, S, W]);
        g.fillStyle = patternIso(g, grassTex('island', 31, '#4e9434', '#86c24e', 1300), 8);
        g.fill();
        g.save(); poly([N, E, S, W]); g.clip();
        // broad patches so the lawn is not one flat sheet of noise
        const rn = rng(1234);
        for (let i = 0; i < 70; i++) {
            const t = iso(rn() * gw, rn() * gh);
            const rr = 40 + rn() * 90;
            const gr = g.createRadialGradient(t.x, t.y, 0, t.x, t.y, rr);
            const light = rn() < 0.5;
            gr.addColorStop(0, light ? 'rgba(170,220,90,0.22)' : 'rgba(20,70,28,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.save(); g.translate(t.x, t.y); g.scale(1, th / tw); g.translate(-t.x, -t.y); g.beginPath(); g.arc(t.x, t.y, rr, 0, 7); g.fill(); g.restore();
        }
        // winding dirt roads out from the middle
        const roads = [
            [[12, 12], [10, 15], [8, 19], [6, 24.5]],
            [[12, 12], [15, 11], [19, 8], [24.5, 6]],
            [[12, 12], [14, 15], [18, 17], [24.5, 18]],
            [[12, 12], [9, 10], [6, 6], [1, -0.5]],
        ].map(rd => rd.map(([a, b]) => [a * TD, b * TD]));
        const dirt = patternIso(g, dirtTex(), 4);
        const road = (w, style, off) => {
            g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = style;
            for (const rd of roads) {
                const p = rd.map(([a, b]) => iso(a, b));
                g.beginPath(); g.moveTo(p[0].x, p[0].y + off);
                g.bezierCurveTo(p[1].x, p[1].y + off, p[2].x, p[2].y + off, p[3].x, p[3].y + off); g.stroke();
            }
        };
        road(30, 'rgba(30,60,20,0.35)', 1.5);
        road(26, 'rgba(120,200,70,0.4)', 0);
        road(23, dirt, 0);
        // flagstone plaza around the Town Hall
        g.beginPath(); { const c = iso(12 * TD, 12 * TD); g.ellipse(c.x, c.y, btw * 1.25, bth * 1.25, 0, 0, 7); }
        g.fillStyle = 'rgba(30,60,20,0.3)'; g.fill();
        g.beginPath(); { const c = iso(12 * TD, 12 * TD); g.ellipse(c.x, c.y, btw * 1.15, bth * 1.15, 0, 0, 7); }
        g.fillStyle = patternIso(g, T.stone(128, 128, '#a89c84', { rows: 9, aspect: 1.1, seed: 19 }), 5); g.fill();
        g.strokeStyle = 'rgba(40,30,20,0.4)'; g.lineWidth = 1.2; g.stroke();
        // scattered detail: flowers, pebbles, tufts, mushrooms
        const rd = rng(777);
        for (let i = 0; i < 1300; i++) {
            const t = iso(rd() * gw, rd() * gh);
            const k = rd();
            if (k < 0.34) {
                const cols = ['#ffffff', '#ffe066', '#ff8aa8', '#b88aff'];
                g.fillStyle = cols[Math.floor(rd() * cols.length)];
                g.beginPath(); g.arc(t.x, t.y, 1.3, 0, 7); g.fill();
                g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(t.x, t.y, 0.5, 0, 7); g.fill();
            } else if (k < 0.5) {
                g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(t.x + 0.6, t.y + 0.8, 2.6, 1.2, 0, 0, 7); g.fill();
                g.fillStyle = '#a8a8ae'; g.beginPath(); g.ellipse(t.x, t.y, 2.3, 1.3, 0, 0, 7); g.fill();
                g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(t.x - 0.6, t.y - 0.4, 1, 0.5, 0, 0, 7); g.fill();
            } else if (k < 0.9) {
                g.strokeStyle = shade('#4e9a34', 0.8 + rd() * 0.5); g.lineWidth = 1;
                for (let b = -1; b <= 1; b++) { g.beginPath(); g.moveTo(t.x + b * 1.4, t.y); g.lineTo(t.x + b * 2.4, t.y - 4 - rd() * 3); g.stroke(); }
            } else {
                g.fillStyle = '#f2ead8'; g.fillRect(t.x - 0.5, t.y - 2, 1, 2);
                g.fillStyle = '#d83a3a'; g.beginPath(); g.ellipse(t.x, t.y - 2.3, 2.2, 1.4, 0, Math.PI, 0); g.fill();
            }
        }
        g.restore();
        // rim: darker edge line with a bright lip so the plateau reads as raised
        poly([N, E, S, W]);
        g.strokeStyle = 'rgba(20,50,16,0.65)'; g.lineWidth = 3; g.stroke();
        g.strokeStyle = 'rgba(190,240,120,0.5)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(W.x, W.y + 0.5); g.lineTo(S.x, S.y + 0.5); g.lineTo(E.x, E.y + 0.5); g.stroke();
        world.island = { canvas: cv, minX, minY };

        // outskirts pattern
        world.meadow = grassTex('meadow', 61, '#386e2c', '#5a9a3c', 1100);
        world.meadowTilt = null;

        // scenery list
        world.sprites = {
            pines: [pine(0.9, 1, '#2a6a3a', '#357a44'), pine(1.15, 2, '#2c6638', '#3a7d46'), pine(1.4, 3, '#265e34', '#33723f'), pine(1.0, 4, '#356d3a', '#43894a')],
            oaks: [roundTree(0.9, '#3a7a2e', '#4e9a3a', '#6ab84a', 5), roundTree(1.15, '#3a7a2e', '#4e9a3a', '#6ab84a', 6), roundTree(1.0, '#a8602a', '#c8802e', '#e0a040', 7), roundTree(1.2, '#36762c', '#4a9638', '#66b448', 8)],
            rocks: [rockSpr(0.8, 1, '#8a8a96'), rockSpr(1.1, 2, '#7e7e8c'), rockSpr(1.5, 3, '#8c8a98')],
            bushes: [bushSpr('#3f8a34', 1), bushSpr('#4a9a3a', 2)],
            stump: stumpSpr(),
            lakes: [lakeSpr(130, 60), lakeSpr(92, 46)],
        };
        const fb = makeFbm(222, 3, 4);
        const items = [];
        const m = 26 * TD;
        for (let i = 0; i < 1900 && items.length < 720; i++) {
            const tx = -m + hash2(i, 5) * (gw + 2 * m), ty = -m + hash2(i, 9) * (gh + 2 * m);
            if (tx > -2.5 * TD && tx < gw + 2.5 * TD && ty > -2.5 * TD && ty < gh + 2.5 * TD) continue;
            const dens = fb((tx + m) / (gw + 2 * m), (ty + m) / (gh + 2 * m));
            const k = hash2(i, 13);
            let spr;
            if (dens > 0.5 && k < 0.8) spr = k < 0.45 ? world.sprites.pines[i % 4] : world.sprites.oaks[i % 4];
            else if (k < 0.12) spr = world.sprites.rocks[i % 3];
            else if (k < 0.3) spr = world.sprites.bushes[i % 2];
            else if (k < 0.34) spr = world.sprites.stump;
            else if (dens > 0.38 && k < 0.5) spr = world.sprites.pines[i % 4];
            else continue;
            const p = iso(tx, ty);
            items.push({ spr, x: p.x, y: p.y, depth: tx + ty, flip: hash2(i, 3) < 0.5 });
        }
        // two lakes
        const l1 = iso(gw + 12 * TD, -6 * TD), l2 = iso(-10 * TD, gh + 9 * TD);
        items.push({ spr: world.sprites.lakes[0], x: l1.x, y: l1.y, depth: gw + 6 * TD - 40 * TD, lake: true, shadowless: true });
        items.push({ spr: world.sprites.lakes[1], x: l2.x, y: l2.y, depth: gh - TD - 40 * TD, lake: true, shadowless: true });
        items.sort((a, b) => a.depth - b.depth);
        world.scenery = items;
        world.ready = true;
        A.worldDirty = false;
    };

    // Meadow behind everything: an endless iso-projected pattern fill. Called with the
    // world transform already applied; vx0..vy1 is the visible world rectangle.
    world.drawMeadow = (g, vx0, vy0, vx1, vy1) => {
        if (!world.meadowPat || world.meadowPatFor !== CFG.tileW + '|' + CFG.tileH) {
            world.meadowPat = patternIso(g, world.meadow, 8);
            world.meadowPatFor = CFG.tileW + '|' + CFG.tileH;
        }
        g.fillStyle = world.meadowPat;
        g.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    };
    world.drawIsland = (g) => {
        const I = world.island;
        g.drawImage(I.canvas, I.minX, I.minY, I.canvas.width / G, I.canvas.height / G);
    };
    // Scenery index range visible in a world rectangle
    world.sceneryIn = (vx0, vy0, vx1, vy1, out) => {
        out.length = 0;
        for (const it of world.scenery) {
            if (it.x < vx0 - 160 || it.x > vx1 + 160 || it.y < vy0 - 60 || it.y > vy1 + 260) continue;
            out.push(it);
        }
        return out;
    };
    world.drawSceneryItem = (g, it, t) => {
        const sp = it.spr;
        if (it.flip) {
            g.save(); g.translate(it.x, it.y); g.scale(-1, 1);
            A.drawSprite(g, sp, 0, 0, 1, !it.shadowless);
            g.restore();
        } else A.drawSprite(g, sp, it.x, it.y, 1, !it.shadowless);
        if (it.lake) {      // drifting highlights on the water
            g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#ffffff'; g.lineWidth = 1.1; g.lineCap = 'round';
            const rx = sp.w / 2 - 28, ry = sp.h / 2 - 28;
            for (let i = 0; i < 5; i++) {
                const ph = t * 0.4 + i * 1.7;
                const x = it.x + Math.sin(ph) * rx * 0.55, y = it.y + Math.cos(ph * 0.8 + i) * ry * 0.5;
                g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x, y - 2.4, x + 9, y); g.stroke();
            }
            g.restore();
        }
    };

    // Big soft cloud shadows crossing the land
    const cloudSpr = () => A.cached('cloud', () => {
        const c = mk(256, 128), g = c.getContext('2d');
        for (let i = 0; i < 9; i++) {
            const x = 50 + i * 20, y = 64 + Math.sin(i * 1.7) * 18, r = 34 + (i % 3) * 8;
            const gr = g.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, 'rgba(10,20,40,0.5)'); gr.addColorStop(1, 'rgba(10,20,40,0)');
            g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        return c;
    });
    world.drawClouds = (g, t, cam, vw, vh, strength) => {
        if (strength <= 0) return;
        const spr = cloudSpr();
        g.save(); g.globalAlpha = 0.20 * strength;
        for (let i = 0; i < 6; i++) {
            const sp = 14 + i * 3;
            const x = ((t * sp + i * 1100) % 4600) - 1800 + i * 90;
            const y = -500 + i * 330 + Math.sin(t * 0.05 + i) * 80;
            const w = 900 + (i % 3) * 300;
            g.drawImage(spr, x, y, w, w * 0.5);
        }
        g.restore();
    };

    A.world = world;
    A.iso = iso;
})(window.KOE = window.KOE || {});
