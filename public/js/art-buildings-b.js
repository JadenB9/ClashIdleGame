/* ============================================================
   Building painters, part 2: defenses and decorations.
   Turret parts that aim at enemies (barrels, bows, orbs) are not in
   these sprites: each tower leaves a 'mount' anchor and units.js
   draws the moving part there every frame.
   ============================================================ */
(function (K) {
    'use strict';
    const A = K.art;
    const U = K.util;
    const { T, box, cyl, cone, pyramid, crenel, cached, diamondPath, rng } = A;
    const { shade } = U;
    const P = A.painters;
    const { onFace, glowAt, windowF, doorF, timberF, coinPile, flagPole, leafBlob, plate, prism } = A.h;

    // Sandbag ring / ground clutter shared by several towers
    const sandbags = (g, geo, n = 6, r = 0.66) => {
        const { fw, fh } = geo;
        for (let i = 0; i < n; i++) {
            const a = Math.PI * (0.08 + 0.84 * i / (n - 1));
            const x = Math.cos(a) * fw * r, y = Math.sin(a) * fh * r + 2;
            const gr = g.createLinearGradient(x - 5, y - 3, x + 5, y + 3);
            gr.addColorStop(0, '#d8c490'); gr.addColorStop(1, '#a89260');
            g.fillStyle = gr; g.strokeStyle = 'rgba(40,24,8,0.7)'; g.lineWidth = 0.9;
            g.beginPath(); g.ellipse(x, y, 5.2, 3, 0, 0, 7); g.fill(); g.stroke();
        }
    };
    const stoneCol = (t) => ['#a09a8a', '#9ea6b4', '#9a92b0', '#d8d0b8'][t];

    // =========================================================
    // CANNON
    // =========================================================
    P.cannon = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(6, 4, fw * 1.3, fh * 1.3, 0.9);
        plate(g, geo, 0.96, '#867e6e', 3);
        const col = stoneCol(t);
        cyl(g, { x: 0, y: 0, rx: fw * 0.6, ry: fh * 0.6, h: H(15), lift: H(3), color: col, courses: 3, topColor: shade(col, 0.72) });
        if (t >= 1) { // iron hoop
            g.strokeStyle = t === 3 ? '#e8c35a' : '#34343c'; g.lineWidth = 2.4;
            g.beginPath(); g.ellipse(0, -H(11), fw * 0.605, fh * 0.605, 0, 0, Math.PI); g.stroke();
        }
        // merlon teeth around the rim
        for (let i = 0; i < 7; i++) {
            const a = Math.PI * (0.05 + 0.9 * i / 6) ;
            const x = -Math.cos(a) * fw * 0.54, y = -H(18) + Math.sin(a) * fh * 0.54;
            box(g, { x, y: y + H(0), fw: 3.4, fh: 2.2, h: H(4), L: shade(col, 1.0), R: shade(col, 0.66), top: shade(col, 1.15) });
        }
        // ball stack
        for (const [bx, by] of [[fw * 0.62, fh * 0.55], [fw * 0.74, fh * 0.5], [fw * 0.68, fh * 0.46 - 3]]) {
            const gr = g.createRadialGradient(bx - 1, by - 1.5, 0.5, bx, by, 4);
            gr.addColorStop(0, '#8a8a96'); gr.addColorStop(1, '#1c1c24');
            g.fillStyle = gr; g.beginPath(); g.arc(bx, by - 2, 3.4, 0, 7); g.fill();
        }
        geo.anchor('mount', 0, -H(20), {});
    };

    // =========================================================
    // ARCHER TOWER
    // =========================================================
    P.archer = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(10, 6, fw * 1.4, fh * 1.5, 0.9);
        plate(g, geo, 0.96, '#867e6e', 3);
        const col = stoneCol(t);
        const body = { x: 0, y: 0, fw: fw * 0.5, fh: fh * 0.5, h: H(34), lift: H(3) };
        box(g, { ...body, L: T.stone(70, 100, col, { rows: 6, seed: 51, aspect: 1.5 }), R: T.stone(70, 100, col, { rows: 6, seed: 52, aspect: 1.5 }), top: shade(col, 0.8) });
        onFace(g, 'R', body, 34, (c, W, Hh) => {
            doorF(c, W * 0.5, Hh - 3, 24, Hh * 0.3, { frame: shade(col, 1.1) });
            windowF(c, W * 0.5, Hh * 0.46, 11, Hh * 0.2, { frame: '#2c2018' });
        });
        onFace(g, 'L', body, 34, (c, W, Hh) => {
            windowF(c, W * 0.5, Hh * 0.5, 11, Hh * 0.2, { frame: '#2c2018', lit: true });
        });
        glowAt(geo, 'L', body, 34, 50, 50, 5);
        // wooden hoarding platform that overhangs the shaft
        const wood = ['#8a5a34', '#6a5a46', '#5a4a6a', '#a07a30'][t];
        const plat = { x: 0, y: 0, fw: fw * 0.66, fh: fh * 0.66, h: H(13), lift: H(37) };
        box(g, { ...plat, L: T.planks(70, 40, wood, { pw: 7, seed: 5 }), R: T.planks(70, 40, wood, { pw: 7, seed: 6 }), top: shade(wood, 0.75) });
        onFace(g, 'R', plat, 13, (c, W, Hh) => {
            c.fillStyle = 'rgba(0,0,0,0.5)';
            for (const u of [0.3, 0.7]) c.fillRect(W * u - 3, Hh * 0.28, 6, Hh * 0.4);
        });
        onFace(g, 'L', plat, 13, (c, W, Hh) => {
            c.fillStyle = 'rgba(0,0,0,0.5)';
            for (const u of [0.3, 0.7]) c.fillRect(W * u - 3, Hh * 0.28, 6, Hh * 0.4);
        });
        // corner posts and a banner
        g.strokeStyle = shade(wood, 0.7); g.lineWidth = 2.6; g.lineCap = 'round';
        const topY = -H(50);
        for (const [px, py] of [[-fw * 0.66, 0], [fw * 0.66, 0], [0, fh * 0.66], [0, -fh * 0.66]]) {
            g.beginPath(); g.moveTo(px, py + topY + H(0)); g.lineTo(px, py + topY - H(10)); g.stroke();
        }
        // back rail and front rail
        g.lineWidth = 2; g.strokeStyle = shade(wood, 0.85);
        g.beginPath(); g.moveTo(-fw * 0.66, topY - H(8)); g.lineTo(0, topY - fh * 0.66 - H(8)); g.lineTo(fw * 0.66, topY - H(8)); g.stroke();
        g.beginPath(); g.moveTo(-fw * 0.66, topY - H(8)); g.lineTo(0, topY + fh * 0.66 - H(8)); g.lineTo(fw * 0.66, topY - H(8)); g.stroke();
        flagPole(g, -fw * 0.66, topY - H(10), H(14));
        geo.anchor('flag', -fw * 0.66, topY - H(24), { color: ['#c73535', '#2f6aa8', '#7a3fa0', '#e2a92f'][t], w: 14 });
        geo.anchor('mount', 0, topY - H(2), {});
    };
    P.archer.up = 190;

    // =========================================================
    // MORTAR
    // =========================================================
    P.mortar = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(6, 4, fw * 1.4, fh * 1.4, 0.9);
        plate(g, geo, 0.96, '#7c7468', 3);
        const col = ['#6a6c80', '#5e6a82', '#5a4e78', '#8a84a0'][t];
        cyl(g, { x: 0, y: 0, rx: fw * 0.66, ry: fh * 0.66, h: H(14), lift: H(3), color: col, courses: 3, topColor: shade(col, 0.7) });
        // iron ring
        g.strokeStyle = t === 3 ? '#e8c35a' : '#2a2a32'; g.lineWidth = 2.6;
        g.beginPath(); g.ellipse(0, -H(8), fw * 0.665, fh * 0.665, 0, 0, Math.PI); g.stroke();
        // inner pit
        g.beginPath(); g.ellipse(0, -H(17), fw * 0.42, fh * 0.42, 0, 0, 7); g.fillStyle = '#16141c'; g.fill();
        sandbags(g, geo, 7, 0.78);
        // shell crate
        box(g, { x: fw * 0.6, y: fh * 0.2, fw: 5, fh: 3.4, h: H(6), L: '#8a5a34', R: '#5a3a1c', top: '#a0703c' });
        g.fillStyle = '#34343c'; g.beginPath(); g.arc(fw * 0.6, fh * 0.2 - H(7), 2.6, 0, 7); g.fill();
        geo.anchor('mount', 0, -H(16), {});
    };

    // =========================================================
    // AIR DEFENSE
    // =========================================================
    P.airdef = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.4, fh * 1.4, 0.9);
        plate(g, geo, 0.96, '#7a8070', 3);
        const col = ['#7a9a5a', '#6a9a8a', '#7a7aa8', '#c8c0a0'][t];
        cyl(g, { x: 0, y: 0, rx: fw * 0.56, ry: fh * 0.56, h: H(24), lift: H(3), color: col, courses: 4, topColor: shade(col, 0.75) });
        // armoured band and warning chevrons
        g.fillStyle = '#2c2c34';
        g.beginPath(); g.ellipse(0, -H(20), fw * 0.575, fh * 0.575, 0, 0, Math.PI); g.lineTo(-fw * 0.575, -H(25)); g.ellipse(0, -H(25), fw * 0.575, fh * 0.575, 0, Math.PI, 0, true); g.closePath(); g.fill();
        g.fillStyle = '#e8c35a';
        for (let i = 0; i < 5; i++) { const a = Math.PI * (i + 0.5) / 5; g.fillRect(-Math.cos(a) * fw * 0.57 - 1.6, -H(22.5) + Math.sin(a) * fh * 0.57 - 1, 3.2, 2.4); }
        // hatch
        g.beginPath(); g.ellipse(0, -H(27), fw * 0.3, fh * 0.3, 0, 0, 7); g.fillStyle = '#34343c'; g.fill(); g.strokeStyle = '#121216'; g.lineWidth = 1; g.stroke();
        geo.light(0, -H(26), 8, '#8aff60');
        geo.anchor('mount', 0, -H(28), {});
    };

    // =========================================================
    // WIZARD TOWER
    // =========================================================
    P.wizard = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(10, 6, fw * 1.3, fh * 1.4, 0.9);
        plate(g, geo, 0.94, '#7a8090', 3);
        const col = ['#8a9ec4', '#7a98c8', '#9a8ed0', '#cfd6ee'][t];
        cyl(g, { x: 0, y: 0, rx: fw * 0.42, ry: fh * 0.42, h: H(46), lift: H(3), color: col, courses: 8, top: false });
        // slit windows
        for (const [a, hh] of [[0.3, 34], [0.62, 22], [0.9, 38]]) {
            const wx = -Math.cos(Math.PI * a) * fw * 0.42, wy = -H(hh) + Math.sin(Math.PI * a) * fh * 0.42;
            g.fillStyle = '#ffd98a'; g.strokeStyle = '#1e2a44'; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(wx - 2, wy + 5); g.lineTo(wx - 2, wy - 2); g.arc(wx, wy - 2, 2, Math.PI, 0); g.lineTo(wx + 2, wy + 5); g.closePath(); g.fill(); g.stroke();
            geo.light(wx, wy, 7);
        }
        // door
        g.fillStyle = '#4a3020'; g.strokeStyle = '#1a1008'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(fw * 0.04, fh * 0.42 + 1); g.lineTo(fw * 0.04, fh * 0.42 - H(9)); g.arc(fw * 0.14, fh * 0.42 - H(9), fw * 0.1, Math.PI, 0); g.lineTo(fw * 0.24, fh * 0.42 + 1); g.closePath(); g.fill(); g.stroke();
        // balcony ring
        cyl(g, { x: 0, y: 0, rx: fw * 0.56, ry: fh * 0.56, h: H(5), lift: H(47), color: shade(col, 0.85), courses: 1, topColor: shade(col, 0.7) });
        for (let i = 0; i < 9; i++) {
            const a = Math.PI * (0.04 + 0.92 * i / 8);
            const x = -Math.cos(a) * fw * 0.52, y = -H(54) + Math.sin(a) * fh * 0.52;
            g.fillStyle = shade(col, 0.95 - 0.2 * (i / 8)); g.strokeStyle = A.EDGE; g.lineWidth = 0.7;
            g.beginPath(); g.rect(x - 1.8, y - 4, 3.6, 5); g.fill(); g.stroke();
        }
        // four crystal prongs holding the orb
        g.strokeStyle = '#d8c070'; g.lineWidth = 1.8; g.lineCap = 'round';
        for (const dx of [-1, 1]) {
            g.beginPath(); g.moveTo(dx * fw * 0.3, -H(52)); g.quadraticCurveTo(dx * fw * 0.36, -H(68), dx * fw * 0.1, -H(74)); g.stroke();
        }
        // pointed hat roof, small, behind the orb
        cone(g, { x: 0, y: -fh * 0.1, rx: fw * 0.3, ry: fh * 0.3, h: H(22), lift: H(50), color: ['#3c5aa8', '#2f6aa8', '#6a3fa0', '#2a7aa8'][t], rows: 5 });
        geo.anchor('mount', 0, -H(66), {});
    };
    P.wizard.up = 210;

    // =========================================================
    // FROST SPIRE
    // =========================================================
    P.frost = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.3, fh * 1.4, 0.8);
        plate(g, geo, 0.96, '#8a96a6', 3);
        const col = ['#a8b8c8', '#98b0d0', '#a0a8d8', '#dce8f8'][t];
        cyl(g, { x: 0, y: 0, rx: fw * 0.56, ry: fh * 0.56, h: H(10), lift: H(3), color: col, courses: 2, topColor: '#eef6ff' });
        // snow cap on the pedestal
        g.fillStyle = '#f4fbff';
        g.beginPath(); g.ellipse(0, -H(13), fw * 0.56, fh * 0.56, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(120,150,190,0.6)'; g.lineWidth = 0.9; g.stroke();
        // main crystal
        const base = -H(12);
        const spire = (x, w, h, c1, c2, c3, lean = 0) => {
            const tip = { x: x + lean, y: base - H(h) };
            g.beginPath(); g.moveTo(x - w, base); g.lineTo(x - w * 0.8, base - H(h * 0.58)); g.lineTo(tip.x, tip.y); g.lineTo(x + w * 0.8, base - H(h * 0.58)); g.lineTo(x + w, base); g.lineTo(x, base + w * 0.35); g.closePath();
            g.fillStyle = c1; g.fill(); g.strokeStyle = '#2a5a80'; g.lineWidth = 1; g.stroke();
            g.beginPath(); g.moveTo(x - w, base); g.lineTo(x - w * 0.8, base - H(h * 0.58)); g.lineTo(tip.x, tip.y); g.lineTo(x - w * 0.15, base - H(h * 0.4)); g.lineTo(x - w * 0.15, base + w * 0.3); g.closePath();
            g.fillStyle = c2; g.fill();
            g.beginPath(); g.moveTo(x + w, base); g.lineTo(x + w * 0.8, base - H(h * 0.58)); g.lineTo(tip.x, tip.y); g.lineTo(x + w * 0.2, base - H(h * 0.4)); g.lineTo(x + w * 0.2, base + w * 0.3); g.closePath();
            g.fillStyle = c3; g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - w * 0.5, base - H(h * 0.2)); g.lineTo(x - w * 0.4, base - H(h * 0.58)); g.stroke();
            return tip;
        };
        spire(-fw * 0.34, 5.5, 20, '#8ad8ff', '#d8f6ff', '#4aa0d8', -2);
        spire(fw * 0.32, 5, 16, '#8ad8ff', '#d8f6ff', '#4aa0d8', 2);
        spire(-fw * 0.12, 6, 14, '#8ad8ff', '#d8f6ff', '#4aa0d8', 0);
        const tip = spire(0, 9, 56 + t * 4, '#7acaf4', '#d0f4ff', '#3c8cc8', 0);
        geo.light(0, base - H(30), 24, '#80d8ff');
        geo.anchor('mount', tip.x, tip.y, {});
        geo.anchor('sparkle', 0, base - H(34), { color: '#e8fbff' });
    };
    P.frost.up = 190;

    // =========================================================
    // HIDDEN TESLA
    // =========================================================
    P.tesla = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(6, 4, fw * 1.3, fh * 1.3, 0.9);
        plate(g, geo, 0.96, '#6a6a78', 3);
        const metal = ['#4a5068', '#44506c', '#3c3e68', '#2a2e4c'][t];
        box(g, { x: 0, y: 0, fw: fw * 0.58, fh: fh * 0.58, h: H(12), lift: H(3), L: T.iron(60, 40, metal, 5), R: T.iron(60, 40, metal, 6), top: shade(metal, 0.8) });
        // copper coil: stacked rings on a tapering core
        const cx = 0, y0 = -H(15);
        g.fillStyle = '#2c3048';
        g.beginPath(); g.moveTo(-6, y0); g.lineTo(-3.4, y0 - H(46)); g.lineTo(3.4, y0 - H(46)); g.lineTo(6, y0); g.closePath(); g.fill();
        g.strokeStyle = A.EDGE; g.lineWidth = 0.9; g.stroke();
        for (let i = 0; i < 6; i++) {
            const y = y0 - H(4 + i * 7.4), r = 8.6 - i * 0.9;
            const gr = g.createLinearGradient(cx - r, 0, cx + r, 0);
            gr.addColorStop(0, '#f0b070'); gr.addColorStop(0.5, '#c87838'); gr.addColorStop(1, '#6a3414');
            g.fillStyle = gr;
            g.beginPath(); g.ellipse(cx, y, r, r * 0.42, 0, 0, 7); g.fill(); g.strokeStyle = '#3a1a08'; g.lineWidth = 0.9; g.stroke();
        }
        // sphere on top
        const sy = y0 - H(53);
        const sg = g.createRadialGradient(-2, sy - 2, 1, 0, sy, 7.5);
        sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.5, '#a8c8ff'); sg.addColorStop(1, '#4a6ac8');
        g.fillStyle = sg; g.beginPath(); g.arc(0, sy, 7, 0, 7); g.fill(); g.strokeStyle = '#1a2a68'; g.lineWidth = 1; g.stroke();
        geo.light(0, sy, 18, '#90b8ff');
        geo.anchor('mount', 0, sy, {});
        // cable running off the pedestal
        g.strokeStyle = '#16161c'; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(fw * 0.45, -H(8)); g.quadraticCurveTo(fw * 0.8, -H(2), fw * 0.6, fh * 0.5); g.stroke();
    };
    P.tesla.up = 180;

    // =========================================================
    // X-BOW
    // =========================================================
    P.xbow = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.4, fh * 1.4, 0.9);
        plate(g, geo, 0.96, '#867e6e', 3);
        const wood = ['#8a5a34', '#6a5444', '#5a4a6a', '#a07a30'][t];
        const b = { x: 0, y: 0, fw: fw * 0.6, fh: fh * 0.6, h: H(26), lift: H(3) };
        box(g, { ...b, L: T.planks(70, 70, wood, { pw: 9, seed: 7 }), R: T.planks(70, 70, wood, { pw: 9, seed: 8 }), top: shade(wood, 0.8) });
        for (const side of ['L', 'R']) onFace(g, side, b, 26, (c, W, Hh) => {
            c.strokeStyle = shade(wood, 0.55); c.lineWidth = 5; c.lineCap = 'butt';
            c.strokeRect(3, 3, W - 6, Hh - 6);
            c.beginPath(); c.moveTo(3, 3); c.lineTo(W - 3, Hh - 3); c.moveTo(W - 3, 3); c.lineTo(3, Hh - 3); c.stroke();
        });
        // top platform with railing
        box(g, { x: 0, y: 0, fw: fw * 0.68, fh: fh * 0.68, h: H(4), lift: H(29), L: T.planks(70, 14, wood, { pw: 7, seed: 9 }), R: T.planks(70, 14, wood, { pw: 7, seed: 10 }), top: shade(wood, 0.95) });
        const ty = -H(33);
        g.strokeStyle = shade(wood, 0.6); g.lineWidth = 2; g.lineCap = 'round';
        for (const [px, py] of [[-fw * 0.66, 0], [fw * 0.66, 0], [0, fh * 0.66], [0, -fh * 0.66]]) { g.beginPath(); g.moveTo(px, ty + py); g.lineTo(px, ty + py - H(9)); g.stroke(); }
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-fw * 0.66, ty - H(8)); g.lineTo(0, ty + fh * 0.66 - H(8)); g.lineTo(fw * 0.66, ty - H(8)); g.stroke();
        // bolt barrel
        box(g, { x: fw * 0.55, y: fh * 0.62, fw: 4.5, fh: 3, h: H(7), L: '#8a5a34', R: '#5a3a1c', top: '#a0703c' });
        g.strokeStyle = '#c8ccd8'; g.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(fw * 0.52 + i * 1.8, fh * 0.6 - H(8)); g.lineTo(fw * 0.52 + i * 1.8, fh * 0.6 - H(13)); g.stroke(); }
        geo.anchor('mount', 0, ty - H(2), {});
    };
    P.xbow.up = 170;

    // =========================================================
    // INFERNO TOWER
    // =========================================================
    P.inferno = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(8, 5, fw * 1.4, fh * 1.4, 0.95);
        plate(g, geo, 0.96, '#4a4450', 3);
        const iron = ['#3a3440', '#34303c', '#2c2434', '#241c28'][t];
        cyl(g, { x: 0, y: 0, rx: fw * 0.52, ry: fh * 0.52, h: H(34), lift: H(3), color: iron, courses: 6, top: false });
        // glowing seams
        g.strokeStyle = '#ff6a2a'; g.lineWidth = 1.6; g.lineCap = 'round';
        for (let j = 0; j < 3; j++) {
            const y = -H(10 + j * 10);
            g.beginPath(); g.ellipse(0, y, fw * 0.525, fh * 0.525, 0, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
        }
        g.strokeStyle = '#ffc860'; g.lineWidth = 0.7;
        for (let j = 0; j < 3; j++) { g.beginPath(); g.ellipse(0, -H(10 + j * 10), fw * 0.525, fh * 0.525, 0, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
        geo.light(0, -H(20), 24, '#ff7a30');
        // spiked flared top bowl
        const yt = -H(37);
        g.beginPath(); g.moveTo(-fw * 0.52, yt); g.lineTo(-fw * 0.7, yt - H(10)); g.ellipse(0, yt - H(10), fw * 0.7, fh * 0.7, 0, Math.PI, 0, true); g.lineTo(fw * 0.52, yt); g.ellipse(0, yt, fw * 0.52, fh * 0.52, 0, 0, Math.PI, false); g.closePath();
        const bg = g.createLinearGradient(-fw * 0.7, 0, fw * 0.7, 0);
        bg.addColorStop(0, shade(iron, 1.5)); bg.addColorStop(1, shade(iron, 0.6));
        g.fillStyle = bg; g.fill(); g.strokeStyle = A.EDGE; g.lineWidth = 1; g.stroke();
        g.beginPath(); g.ellipse(0, yt - H(10), fw * 0.7, fh * 0.7, 0, 0, 7); g.fillStyle = '#1a1018'; g.fill(); g.stroke();
        g.beginPath(); g.ellipse(0, yt - H(10), fw * 0.5, fh * 0.5, 0, 0, 7);
        const cg = g.createRadialGradient(0, yt - H(10), 1, 0, yt - H(10), fw * 0.5);
        cg.addColorStop(0, '#ffee99'); cg.addColorStop(0.5, '#ff7a20'); cg.addColorStop(1, '#6a1408');
        g.fillStyle = cg; g.fill();
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            const x = Math.cos(a) * fw * 0.7, y = yt - H(10) + Math.sin(a) * fh * 0.7;
            if (Math.sin(a) < -0.3) continue;
            g.fillStyle = shade(iron, 1.3); g.strokeStyle = A.EDGE; g.lineWidth = 0.8;
            g.beginPath(); g.moveTo(x - 2.4, y); g.lineTo(x, y - H(8)); g.lineTo(x + 2.4, y); g.closePath(); g.fill(); g.stroke();
        }
        geo.anchor('mount', 0, yt - H(12), { rx: fw * 0.5, ry: fh * 0.5 });
    };
    P.inferno.up = 190;

    // =========================================================
    // CLAN CASTLE (2x2)
    // =========================================================
    P.clancastle = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk, t = tier - 1;
        geo.shadowAt(18, 10, fw * 1.75, fh * 1.8, 0.95);
        plate(g, geo, 1.0, '#8a8478');
        const col = ['#a9a89e', '#a6aebe', '#a89cc0', '#e8e2d0'][t];
        const roofC = ['#3f5f9a', '#2f6aa8', '#6a3fa0', '#d9a21b'][t];
        const bannerC = ['#3f5f9a', '#c73535', '#e8c35a', '#7a3fa0'][t];
        const tower = (x, y, hh, flag) => {
            cyl(g, { x, y, rx: fw * 0.19, ry: fh * 0.19, h: H(hh), lift: H(3), color: col, courses: 7 });
            const gy = -H(3 + hh * 0.7);
            g.fillStyle = '#ffd98a'; g.strokeStyle = '#1e2a44'; g.lineWidth = 1;
            g.beginPath(); g.rect(x - 2, y + fh * 0.19 * 0.4 + gy - 4, 4, 6); g.fill(); g.stroke();
            cone(g, { x, y, rx: fw * 0.24, ry: fh * 0.24, h: H(24), lift: H(3 + hh - 1), color: roofC, rows: 6 });
            flagPole(g, x, y - H(3 + hh + 22), H(10));
            if (flag) geo.anchor('flag', x, y - H(3 + hh + 32), { color: bannerC, w: 12 });
        };
        tower(0, -fh * 0.84, 56, true);
        // curtain walls
        const wall = { x: 0, y: 0, fw: fw * 0.84, fh: fh * 0.84, h: H(32), lift: H(3) };
        box(g, { ...wall, L: T.stone(170, 100, col, { rows: 7, seed: 61 }), R: T.stone(170, 100, col, { rows: 7, seed: 62 }), top: shade(col, 0.75) });
        onFace(g, 'R', wall, 32, (c, W, Hh) => {
            // gatehouse
            c.fillStyle = shade(col, 0.82); c.fillRect(W * 0.36, Hh * 0.18, W * 0.28, Hh * 0.82);
            doorF(c, W * 0.5, Hh - 3, 20, Hh * 0.55, { frame: shade(col, 1.12), wood: '#5a3a1c' });
            c.fillStyle = 'rgba(0,0,0,0.45)';
            for (let x = W * 0.43; x < W * 0.58; x += 3.4) c.fillRect(x, Hh * 0.45, 1.2, Hh * 0.26);
            windowF(c, W * 0.15, Hh * 0.4, 8, Hh * 0.28, { lit: true });
            windowF(c, W * 0.85, Hh * 0.4, 8, Hh * 0.28, { lit: true });
            // heraldic banner over the gate
            c.fillStyle = bannerC; c.beginPath(); c.moveTo(W * 0.46, Hh * 0.2); c.lineTo(W * 0.54, Hh * 0.2); c.lineTo(W * 0.54, Hh * 0.38); c.lineTo(W * 0.5, Hh * 0.33); c.lineTo(W * 0.46, Hh * 0.38); c.closePath(); c.fill();
        });
        glowAt(geo, 'R', wall, 32, 15, 40, 8); glowAt(geo, 'R', wall, 32, 85, 40, 8);
        onFace(g, 'L', wall, 32, (c, W, Hh) => {
            for (const u of [0.22, 0.5, 0.78]) windowF(c, W * u, Hh * 0.4, 8, Hh * 0.28, { lit: true });
        });
        for (const u of [22, 50, 78]) glowAt(geo, 'L', wall, 32, u, 40, 8);
        crenel(g, { x: 0, y: 0, fw: wall.fw, fh: wall.fh, lift: H(35), n: 6, mh: H(5), color: shade(col, 0.95) });
        // keep
        const keep = { x: 0, y: -fh * 0.1, fw: fw * 0.44, fh: fh * 0.44, h: H(26), lift: H(38) };
        box(g, { ...keep, L: T.stone(110, 90, shade(col, 1.04), { rows: 6, seed: 63 }), R: T.stone(110, 90, shade(col, 1.04), { rows: 6, seed: 64 }), top: shade(col, 0.8) });
        for (const side of ['L', 'R']) {
            onFace(g, side, keep, 26, (c, W, Hh) => { windowF(c, W * 0.3, Hh * 0.5, 9, Hh * 0.38, { lit: true }); windowF(c, W * 0.7, Hh * 0.5, 9, Hh * 0.38, { lit: true }); });
            glowAt(geo, side, keep, 26, 30, 50, 6); glowAt(geo, side, keep, 26, 70, 50, 6);
        }
        const apex = pyramid(g, { x: 0, y: -fh * 0.1, fw: fw * 0.44, fh: fh * 0.44, h: H(30), lift: H(64), eave: fw * 0.07, color: roofC, tex: T.shingles(120, 90, roofC, { rows: 8, tw: 14 }) });
        flagPole(g, apex.x, apex.y, H(24));
        geo.anchor('flag', apex.x, apex.y - H(24), { color: bannerC, w: 20 });
        tower(-fw * 0.84, 0, 48, false);
        tower(fw * 0.84, 0, 48, false);
        // front corner turret, short, flanking the gate
        if (tier >= 3) tower(0, fh * 0.84, 36, false);
        geo.anchor('mount', fw * 0.0, -H(60), {});
    };
    P.clancastle.up = 280;

    // =========================================================
    // DECORATIONS
    // =========================================================
    P.oak = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk;
        geo.shadowAt(10, 5, fw * 1.2, fh * 1.2, 0.85);
        // trunk
        const tg = g.createLinearGradient(-5, 0, 5, 0);
        tg.addColorStop(0, '#9a6a3a'); tg.addColorStop(1, '#4a2e16');
        g.fillStyle = tg; g.strokeStyle = '#2a1a0c'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-5, 3); g.quadraticCurveTo(-3, -H(10), -3.4, -H(24)); g.lineTo(3.4, -H(24)); g.quadraticCurveTo(3, -H(10), 6, 3); g.closePath(); g.fill(); g.stroke();
        // roots
        g.strokeStyle = '#3a2410'; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-5, 2); g.lineTo(-9, 5); g.moveTo(6, 2); g.lineTo(10, 5); g.stroke();
        // canopy: layered blobs, dark first
        const cols = ['#2f6a2a', '#3f8a34', '#56a842'];
        leafBlob(g, -12, -H(36), 15, cols[0], 3);
        leafBlob(g, 13, -H(34), 14, cols[0], 5);
        leafBlob(g, 0, -H(46), 17, cols[1], 7);
        leafBlob(g, -8, -H(52), 12, cols[2], 9);
        leafBlob(g, 9, -H(50), 11, cols[2], 11);
    };
    P.oak.up = 150;

    P.garden = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk;
        geo.shadowAt(4, 3, fw * 1.1, fh * 1.1, 0.5);
        prism(g, { cx: 0, cy: 0, a: 0.46, b: 0.46, h: H(5), L: T.stone(80, 24, '#a8a090', { rows: 2, seed: 71 }), R: T.stone(80, 24, '#a8a090', { rows: 2, seed: 72 }), top: '#5a4028' });
        // soil and flowers
        const r = rng(33);
        const cols = ['#ff7aa8', '#ffd84a', '#ffffff', '#b07aff', '#ff9a4a'];
        const pts = [];
        for (let i = 0; i < 34; i++) {
            const u = (r() - 0.5) * 0.84, v = (r() - 0.5) * 0.84;
            const x = (u - v) * fw * 0.95, y = (u + v) * fh * 0.95 - H(5);
            pts.push({ x, y, c: cols[Math.floor(r() * cols.length)], s: 0.8 + r() * 0.8 });
        }
        pts.sort((a, b) => a.y - b.y);
        for (const p of pts) {
            g.strokeStyle = '#2f7a2a'; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 4 * p.s); g.stroke();
            g.fillStyle = p.c; g.strokeStyle = 'rgba(40,10,20,0.45)'; g.lineWidth = 0.6;
            g.beginPath(); g.arc(p.x, p.y - 4.5 * p.s, 2.2 * p.s, 0, 7); g.fill(); g.stroke();
            g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(p.x, p.y - 4.5 * p.s, 0.8 * p.s, 0, 7); g.fill();
        }
        // a small topiary
        g.fillStyle = '#6a4a2a'; g.fillRect(-1.2, -H(12), 2.4, 7);
        leafBlob(g, 0, -H(18), 6, '#3f8a34', 4);
    };
    P.garden.up = 90;

    P.fountain = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk;
        geo.shadowAt(14, 8, fw * 1.7, fh * 1.7, 0.8);
        plate(g, geo, 1.0, '#9a948a', 3);
        const col = '#b8b2a2';
        cyl(g, { x: 0, y: 0, rx: fw * 0.8, ry: fh * 0.8, h: H(11), lift: H(3), color: col, courses: 2, top: false });
        g.beginPath(); g.ellipse(0, -H(14), fw * 0.8, fh * 0.8, 0, 0, 7); g.fillStyle = shade(col, 1.1); g.fill(); g.strokeStyle = A.EDGE; g.lineWidth = 1; g.stroke();
        g.beginPath(); g.ellipse(0, -H(13.5), fw * 0.66, fh * 0.66, 0, 0, 7);
        const wg = g.createRadialGradient(-fw * 0.2, -H(15), 2, 0, -H(13), fw * 0.7);
        wg.addColorStop(0, '#a8e8ff'); wg.addColorStop(0.7, '#4ab0e0'); wg.addColorStop(1, '#2a7ab0');
        g.fillStyle = wg; g.fill(); g.strokeStyle = 'rgba(20,60,90,0.6)'; g.lineWidth = 1; g.stroke();
        geo.anchor('ripple', 0, -H(13.5), { rx: fw * 0.62, ry: fh * 0.62 });
        // central column and bowls
        cyl(g, { x: 0, y: 0, rx: fw * 0.14, ry: fh * 0.14, h: H(22), lift: H(14), color: col, courses: 3, top: false });
        cyl(g, { x: 0, y: 0, rx: fw * 0.42, ry: fh * 0.42, h: H(5), lift: H(32), color: col, courses: 1, topColor: '#7ac8f0' });
        cyl(g, { x: 0, y: 0, rx: fw * 0.1, ry: fh * 0.1, h: H(12), lift: H(37), color: col, courses: 2, top: false });
        g.fillStyle = '#e8d890'; g.beginPath(); g.arc(0, -H(51), 3.4, 0, 7); g.fill(); g.strokeStyle = '#6a5410'; g.lineWidth = 0.8; g.stroke();
        geo.anchor('fountain', 0, -H(50), { bowl: -H(37) });
    };
    P.fountain.up = 190;

    P.statue = (g, geo, tier) => {
        const { fw, fh, hk } = geo, H = (n) => n * hk;
        geo.shadowAt(8, 5, fw * 1.2, fh * 1.2, 0.8);
        plate(g, geo, 0.8, '#a09a8e', 2);
        const col = '#a8aab6';
        box(g, { x: 0, y: 0, fw: fw * 0.46, fh: fh * 0.46, h: H(16), lift: H(2), L: T.stone(60, 50, shade(col, 0.95), { rows: 3, seed: 81, aspect: 1.6 }), R: T.stone(60, 50, shade(col, 0.95), { rows: 3, seed: 82, aspect: 1.6 }), top: shade(col, 1.05) });
        // plaque
        onFace(g, 'R', { x: 0, y: 0, fw: fw * 0.46, fh: fh * 0.46, h: H(16), lift: H(2) }, 16, (c, W, Hh) => {
            c.fillStyle = '#d9a21b'; c.fillRect(W * 0.28, Hh * 0.32, W * 0.44, Hh * 0.3);
            c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(W * 0.34, Hh * 0.44, W * 0.32, 2); c.fillRect(W * 0.34, Hh * 0.52, W * 0.2, 2);
        });
        // knight, hewn from grey stone
        const y0 = -H(18);
        const stone = (x0, x1, c0, c1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; };
        g.lineWidth = 1; g.strokeStyle = '#2a2c36';
        // legs
        g.fillStyle = stone(-6, 6, '#c6c8d4', '#7c7e8c');
        g.fillRect(-5, y0 - H(11), 4.4, H(11)); g.strokeRect(-5, y0 - H(11), 4.4, H(11));
        g.fillRect(0.6, y0 - H(11), 4.4, H(11)); g.strokeRect(0.6, y0 - H(11), 4.4, H(11));
        // torso
        g.fillStyle = stone(-8, 8, '#d0d2de', '#80828f');
        g.beginPath(); g.moveTo(-7, y0 - H(11)); g.lineTo(-8.4, y0 - H(25)); g.lineTo(8.4, y0 - H(25)); g.lineTo(7, y0 - H(11)); g.closePath(); g.fill(); g.stroke();
        // head and helm with plume
        g.fillStyle = stone(-5, 5, '#d8dae6', '#8a8c9a');
        g.beginPath(); g.arc(0, y0 - H(30), 5.4, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#2a2c36'; g.fillRect(-3.4, y0 - H(31), 6.8, 2);
        g.fillStyle = '#9a9cac'; g.beginPath(); g.moveTo(0, y0 - H(35)); g.quadraticCurveTo(7, y0 - H(40), 9, y0 - H(31)); g.lineTo(2, y0 - H(34)); g.closePath(); g.fill(); g.stroke();
        // sword raised and shield
        g.strokeStyle = '#2a2c36'; g.lineWidth = 3.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(9, y0 - H(21)); g.lineTo(13, y0 - H(46)); g.stroke();
        g.strokeStyle = '#d8dae6'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(9, y0 - H(21)); g.lineTo(13, y0 - H(46)); g.stroke();
        g.strokeStyle = '#8a8c9a'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, y0 - H(24)); g.lineTo(12, y0 - H(24)); g.stroke();
        g.fillStyle = stone(-14, -4, '#c0c2d0', '#7a7c8a'); g.strokeStyle = '#2a2c36'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-14, y0 - H(24)); g.lineTo(-5, y0 - H(24)); g.lineTo(-5, y0 - H(14)); g.lineTo(-9.5, y0 - H(9)); g.lineTo(-14, y0 - H(14)); g.closePath(); g.fill(); g.stroke();
    };
    P.statue.up = 170;
})(window.KOE = window.KOE || {});
