// ============================================================
// 《戈克世界·鹿铃亭》M4.3 店内场景（Canvas）
// 客人坐桌、走到灶台做菜、走到桌边端菜/送客
// ============================================================

const SHOP_TILE = 32;      // 店内保持 32px 格子（地图改成 64 了）
const SHOP_W = 24, SHOP_H = 12;
const WALL_ROWS = 3;                       // 墙占几行（决定墙裙画在哪）
const SHOP_CW = 896, SHOP_CH = SHOP_H * 32; // 店内画布逻辑尺寸（12 行 = 384）
// H=墙 B=柜台 W=地板 C=灶台 T=桌子 D=门
const SHOP_MAP = [
  'HHHHHHHHHHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHHHHHHHHHH',
  'BBBBBBBBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBBBBBBBB',
  'WWCCWWTTWWTTWWTTWWTTWWWW',
  'WWCCWWTTWWTTWWTTWWTTWWWW',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWDDWWWWWWWWWWWW',
  'WWWWWWWWWWDDWWWWWWWWWWWW'
];
const SHOP_WALK = new Set(['W', 'C', 'T', 'D']);
const SHOP_HOT = { C: 'stove', T: 'table', D: 'door' };

const ShopScene = {
  cv: null,
  ctx: null,
  cx: 11, cy: 9,
  px: 0, py: 0,
  path: [],
  dir: 'down',
  walkT: 0,
  raf: null,
  running: false,
  last: 0,
  ox: 0, oy: 0,
  onHot: null,     // game.js 设置：(type, idx) => void
  triggered: false,
  _lastStand: null,

  attach(cv) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    cv.width = SHOP_CW;
    cv.height = SHOP_CH;
    this.ox = Math.round((SHOP_CW - SHOP_W * SHOP_TILE) / 2);
    this.oy = 0;
    this.resetPos();
  },

  resetPos() {
    this.cx = 11;
    this.cy = 9;      // 门内空地（原来 6 现在正好是桌子格）
    this.px = this.cx * SHOP_TILE + SHOP_TILE / 2;
    this.py = this.cy * SHOP_TILE + SHOP_TILE / 2;
    this.path = [];
    this.dir = 'down';
    this.triggered = false;
    this._lastStand = null;
  },

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= SHOP_W || y >= SHOP_H) return 'H';
    return SHOP_MAP[y][x];
  },

  walkable(x, y) { return SHOP_WALK.has(this.tileAt(x, y)); },

  findPath(sx, sy, tx, ty) {
    const key = (x, y) => x + ',' + y;
    const prev = new Map();
    const q = [[sx, sy]];
    const seen = new Set([key(sx, sy)]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) {
        const out = [];
        let cur = key(x, y);
        while (cur !== key(sx, sy)) {
          const parts = cur.split(',');
          out.unshift({ x: +parts[0], y: +parts[1] });
          cur = prev.get(cur);
        }
        return out;
      }
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (!this.walkable(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && (!this.walkable(x + dx, y) || !this.walkable(x, y + dy))) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, key(x, y));
        q.push([nx, ny]);
      }
    }
    return null;
  },

  moveTo(tx, ty) {
    if (!this.walkable(tx, ty)) return false;
    if (tx === this.cx && ty === this.cy) return false;
    const path = this.findPath(this.cx, this.cy, tx, ty);
    if (!path || !path.length) return false;
    this.path = path;
    return true;
  },

  step(dx, dy) {
    const nx = this.cx + dx, ny = this.cy + dy;
    if (!this.walkable(nx, ny)) return false;
    if (dx !== 0 && dy !== 0 && (!this.walkable(this.cx + dx, this.cy) || !this.walkable(this.cx, this.cy + dy))) return false;
    this.path = [{ x: nx, y: ny }];
    return true;
  },

  heldDir() {
    const h = this.held;
    let dx = 0, dy = 0;
    if (h.up) dy -= 1;
    if (h.down) dy += 1;
    if (h.left) dx -= 1;
    if (h.right) dx += 1;
    if (!dx && !dy) return null;
    return [dx, dy];
  },

  onEnter() {
    const t = this.tileAt(this.cx, this.cy);
    const k = this.cx + ',' + this.cy;
    const arrived = this.path.length === 0;
    if (!SHOP_HOT[t]) this.triggered = false;
    if (arrived && SHOP_HOT[t] && !this.triggered) {
      this.triggered = true;
      let idx = 0;
      // M8.1：四张桌，cx 6/10/14/18 → 0/1/2/3
      if (t === 'T') idx = Math.max(0, Math.min(3, Math.floor((this.cx - 6) / 4)));
      if (this.onHot) this.onHot(SHOP_HOT[t], idx);
    }
    if (!arrived) this._lastStand = null;
    else if (this._lastStand !== k) this._lastStand = k;
  },

  update(dt) {
    if (this.path.length) {
      const next = this.path[0];
      const tx = next.x * SHOP_TILE + SHOP_TILE / 2;
      const ty = next.y * SHOP_TILE + SHOP_TILE / 2;
      const dx = tx - this.px, dy = ty - this.py;
      const dist = Math.hypot(dx, dy);
      const step = 150 * dt;
      if (Math.abs(dx) > 0.1) this.dir = dx > 0 ? 'right' : 'left';
      else if (Math.abs(dy) > 0.1) this.dir = dy > 0 ? 'down' : 'up';
      this.walkT += dt;
      if (dist <= step) {
        this.px = tx;
        this.py = ty;
        this.cx = next.x;
        this.cy = next.y;
        this.path.shift();
        this.onEnter();
        if (this.path.length) this.walkT += 0.02;
        else this.walkT = 0;
      } else {
        this.px += dx / dist * step;
        this.py += dy / dist * step;
      }
    } else {
      this.walkT = 0;
      this.onEnter();
      const dir = this.heldDir();
      if (dir) this.step(dir[0], dir[1]);
    }
  },

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(t => this.loop(t));
  },

  start() {
    if (!this.cv) this.attach(document.getElementById('shop'));
    if (this.running) return;
    this.running = true;
    this.held = { up: false, down: false, left: false, right: false };
    this.last = performance.now();
    this.loop(this.last);
  },

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  },

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, 0, SHOP_CW, SHOP_CH);
    const ox = this.ox;
    for (let y = 0; y < SHOP_H; y++) {
      for (let x = 0; x < SHOP_W; x++) {
        this.drawTile(this.tileAt(x, y), ox + x * SHOP_TILE, y * SHOP_TILE, x, y);
      }
    }
    // 暗角
    const vig = ctx.createRadialGradient(SHOP_CW / 2, SHOP_CH * 0.5, 150, SHOP_CW / 2, SHOP_CH * 0.52, 560);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.36)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, SHOP_CW, SHOP_CH);
    // 油灯暖光（M6）：让夜里店里有点温度
    const warm = ctx.createRadialGradient(SHOP_CW / 2, 130, 40, SHOP_CW / 2, 130, 430);
    warm.addColorStop(0, 'rgba(255, 190, 110, 0.15)');
    warm.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, SHOP_CW, SHOP_CH);

    // 墙脚投影（M5.2）：墙往地板方向压一条渐变，房间才有进深
    {
      const wsy = WALL_ROWS * SHOP_TILE;
      const wsg = ctx.createLinearGradient(0, wsy, 0, wsy + 14);
      wsg.addColorStop(0, 'rgba(8, 10, 14, .32)');
      wsg.addColorStop(1, 'rgba(8, 10, 14, 0)');
      ctx.fillStyle = wsg;
      ctx.fillRect(ox, wsy, SHOP_W * SHOP_TILE, 14);
    }
    // 墙挂灯（M5.2）：四盏，带暖光晕
    [3, 9, 15, 21].forEach(gx => {
      const lx = ox + gx * SHOP_TILE + SHOP_TILE / 2;
      const ly = SHOP_TILE + 4;
      const lg = ctx.createRadialGradient(lx, ly + 2, 2, lx, ly + 2, 48);
      lg.addColorStop(0, 'rgba(255, 200, 120, .30)');
      lg.addColorStop(1, 'rgba(255, 200, 120, 0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 48, ly - 46, 96, 96);
      // 灯绳
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(lx - 1, ly - 12, 2, 10);
      // 灯罩
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(lx - 6, ly - 2, 12, 3);
      // 灯身
      ctx.fillStyle = '#e8b86a';
      ctx.fillRect(lx - 4, ly + 1, 8, 9);
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(lx - 2, ly + 2, 4, 6);
    });

    // 店内摆件（M5.2）：桶、箱、草垛靠墙摆，别让屋子空荡
    const deco = [
      [1, 5, 'barrel'], [2, 6, 'crate'], [21, 5, 'barrel'],
      [20, 6, 'barrel'], [1, 3, 'crate'], [22, 3, 'crate']
    ];
    deco.forEach(([dgx, dgy, kind]) => {
      const img = PROP_IMG[kind];
      if (!img) return;
      const dx = ox + dgx * SHOP_TILE, dy = dgy * SHOP_TILE;
      ctx.fillStyle = 'rgba(10, 20, 24, .22)';
      ctx.beginPath();
      ctx.ellipse(dx + SHOP_TILE / 2, dy + SHOP_TILE - 3, SHOP_TILE * 0.42, SHOP_TILE * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, dx, dy - 2, SHOP_TILE, SHOP_TILE);
    });

    // 墙酒架（M5.3）：墙上挂一块木架 + 几排酒瓶
    {
      const sx = ox + 3 * SHOP_TILE;
      const sy = 2 * SHOP_TILE - 14;
      const sw = 7 * SHOP_TILE;
      ctx.fillStyle = 'rgba(10, 8, 6, .28)';
      ctx.fillRect(sx + 3, sy + 4, sw, 18);
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(sx, sy, sw, 18);
      ctx.fillStyle = '#8a6238';
      ctx.fillRect(sx, sy, sw, 2);
      // 两层隔板
      ctx.fillStyle = '#5a3c24';
      ctx.fillRect(sx, sy + 17, sw, 2);
      // 酒瓶
      for (let i = 0; i < 9; i++) {
        const bx = sx + 8 + i * 24;
        const hue = ['#8a3a4a', '#3a6a4a', '#7a5a2a'][i % 3];
        ctx.fillStyle = hue;
        ctx.fillRect(bx, sy + 4, 6, 12);
        ctx.fillStyle = 'rgba(255, 240, 210, .25)';
        ctx.fillRect(bx, sy + 4, 2, 12);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(bx + 2, sy + 1, 2, 3);
      }
    }

    // 柜台陈列（M5.3）：台面上摆几样货，别让柜台空着
    {
      const shelf = [
        [5, 4, 'fish'], [8, 4, 'honey'], [12, 4, 'cheese'],
        [16, 4, 'kelp'], [19, 4, 'potato']
      ];
      shelf.forEach(([gx, gy, kind]) => {
        const img = ITEM_IMG[kind];
        if (!img) return;
        // 16px 图标按 2 倍画满一格（整数倍才不糊），底对齐格子
        const size = SHOP_TILE;
        const ix = ox + gx * SHOP_TILE;
        const iy = gy * SHOP_TILE + SHOP_TILE - size;
        // 台面承托影
        ctx.fillStyle = 'rgba(18, 10, 4, .30)';
        ctx.beginPath();
        ctx.ellipse(ix + SHOP_TILE / 2, iy + size - 4, SHOP_TILE * 0.42, SHOP_TILE * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(img, ix, iy - 4, size, size);
      });
    }


    // 桌椅与墙面细节（M8.4）：盘子、椅背、地毯、菜单板
    {
      const tables = [6, 10, 14, 18];
      tables.forEach(tx => {
        const cx = ox + tx * SHOP_TILE + SHOP_TILE;   // 两格桌的中心
        // 两只盘子
        ctx.fillStyle = 'rgba(240, 232, 214, .88)';
        ctx.beginPath(); ctx.ellipse(cx - 14, 196, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 14, 196, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(170, 90, 50, .75)';
        ctx.beginPath(); ctx.ellipse(cx - 14, 196, 2.5, 1.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 14, 196, 2.5, 1.2, 0, 0, Math.PI * 2); ctx.fill();
        // 椅背（客人坐下时正好挡住下半截）
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(cx - 20, 236, 40, 8);
        ctx.fillStyle = '#7a5432';
        ctx.fillRect(cx - 20, 236, 40, 3);
      });
    }
    {
      const rx = ox + 9 * SHOP_TILE, ry = 8 * SHOP_TILE + 6;
      ctx.fillStyle = 'rgba(110, 52, 42, .42)';
      ctx.fillRect(rx, ry, 6 * SHOP_TILE, 3 * SHOP_TILE - 12);
      ctx.strokeStyle = 'rgba(220, 180, 120, .35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx + 4, ry + 4, 6 * SHOP_TILE - 8, 3 * SHOP_TILE - 20);
    }
    {
      const bx = ox + 6 * SHOP_TILE, by = 10;
      const bw = 9 * SHOP_TILE, bh = 66;
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
      ctx.fillStyle = '#20272a';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(220, 200, 160, .35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 2.5, by + 2.5, bw - 5, bh - 5);
      ctx.fillStyle = '#e8d9be';
      ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('鹿铃亭 · 今日菜单', bx + bw / 2, by + 26);
      ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#b99a6b';
      ctx.fillText('熏鱼土豆泥 · 蜂蜜炖菜 · 灰港杂烩', bx + bw / 2, by + 48);
      ctx.textAlign = 'left';
    }

    // 客人（M8.1：四张桌，按座位数坐）
    const guests = S && S.night && S.night.guests ? S.night.guests : [];
    const TABLE_X = [6, 10, 14, 18];
    guests.forEach((g, i) => {
      const tx = TABLE_X[i] !== undefined ? TABLE_X[i] : TABLE_X[0];
      const ty = 7;   // 坐在桌前（桌在行 5-6，客人坐行 7）
      this.drawGuest(g, ox + tx * SHOP_TILE + SHOP_TILE / 2, ty * SHOP_TILE + 15);
    });

    // 主角
    this.drawPlayer();

    // 灶台/桌/门的热区提示
    const t = this.tileAt(this.cx, this.cy);
    if (SHOP_HOT[t]) {
      ctx.strokeStyle = 'rgba(255, 220, 120, .85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + this.cx * SHOP_TILE + 1, this.cy * SHOP_TILE + 1, SHOP_TILE - 2, SHOP_TILE - 2);
    }
  },

  drawTile(t, x, y, gx, gy) {
    const ctx = this.ctx;
    const T = SHOP_TILE;
    switch (t) {
      case 'W': {
        // 木地板（M5.2 手绘图元）
        const fl = BUILD_IMG['b-floor'];
        if (fl) ctx.drawImage(fl, x, y, T, T);
        else {
          ctx.fillStyle = '#8a6238';
          ctx.fillRect(x, y, T, T);
        }
        break;
      }
      case 'H': {
        // 墙（M5.2）：灰石砖墙体 + 下方木墙裙，跟木地板一眼分得开
        const wl = BUILD_IMG['b-brick'] || BUILD_IMG['b-wall'];
        if (wl) ctx.drawImage(wl, x, y, T, T);
        else {
          ctx.fillStyle = '#5a5e66';
          ctx.fillRect(x, y, T, T);
        }
        if (gy === WALL_ROWS - 1) {
          const wd = BUILD_IMG['b-wall'];
          if (wd) ctx.drawImage(wd, x, y + T - 10, T, 10);
          else {
            ctx.fillStyle = '#6b4a2e';
            ctx.fillRect(x, y + T - 10, T, 10);
          }
          ctx.fillStyle = 'rgba(8, 6, 4, .35)';
          ctx.fillRect(x, y + T - 2, T, 2);
        }
        break;
      }
      case 'C': {
        // 石灶（M5.2）：素材砌石灶体
        const st = BUILD_IMG['b-stove'];
        if (st) { ctx.drawImage(st, x, y, T, T); break; }
        if (typeof MapScene !== 'undefined' && MapScene.texFill) {
          MapScene.texFill('stone', x, y, T, T);
        } else {
          ctx.fillStyle = '#6e6e62';
          ctx.fillRect(x, y, T, T);
        }
        // 石灶台 + 灶眼
        ctx.fillStyle = '#5a5a50';
        ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
        ctx.fillStyle = '#2a2a26';
        ctx.fillRect(x + 6, y + 6, T - 12, T - 12);
        ctx.fillStyle = '#d2543f';
        ctx.fillRect(x + 9, y + 9, T - 18, T - 18);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(x + 12, y + 12, 6, 4);
        break;
      }
      case 'T': {
        // 木桌（M5.2）：素材桌面 + 桌沿投影
        const tb = BUILD_IMG['b-table'];
        if (tb) ctx.drawImage(tb, x, y, T, T);
        else {
          ctx.fillStyle = '#8a5c30';
          ctx.fillRect(x, y, T, T);
        }
        ctx.fillStyle = 'rgba(30, 18, 10, .20)';
        ctx.fillRect(x, y + T - 3, T, 3);
        break;
      }
      case 'B': {
        // 柜台（M5.2）
        const ct = BUILD_IMG['b-counter'];
        if (ct) ctx.drawImage(ct, x, y, T, T);
        else {
          ctx.fillStyle = '#7a5a3a';
          ctx.fillRect(x, y, T, T);
        }
        break;
      }
      case 'D':
        if (typeof MapScene !== 'undefined' && MapScene.texFill) {
          MapScene.texFill('wood', x, y, T, T);
        }
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
        ctx.fillStyle = '#c99a6a';
        ctx.fillRect(x + 5, y + 5, T - 10, T - 10);
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(x + T / 2 - 1, y + 5, 2, T - 10);
        break;
    }
  },

  drawGuest(g, x, y) {
    const ctx = this.ctx;
    const c = CUSTOMERS[g.cid];
    const P = (gx, gy, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + gx * 2, y + gy * 2, w * 2, h * 2);
    };
    // 身体颜色按顾客轮换
    const bodyCols = ['#c25a3a', '#4a7ab0', '#4a8a4a', '#8a5a9a', '#c98a3f', '#6a8ab0'];
    const body = bodyCols[g.cid % bodyCols.length];
    // 头
    P(-4, -8, 8, 7, '#f0c8a0');
    P(-4, -9, 8, 2, '#4a3a2a');
    // 眼
    P(-2, -5, 1, 2, '#1a1a2a');
    P(2, -5, 1, 2, '#1a1a2a');
    // 身体
    P(-4, 0, 8, 6, body);
    // 气泡
    const paying = g.stage === 'paying';
    const wantId = g.want || c.want;
    const label = paying ? '结账' : (RECIPES[wantId] ? RECIPES[wantId].name : '');
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
    const tw = ctx.measureText(label).width;
    const bw = Math.max(40, tw + 12);
    ctx.fillStyle = 'rgba(30, 20, 8, 0.85)';
    ctx.fillRect(x - bw / 2, y - 40, bw, 18);
    ctx.strokeStyle = paying ? '#ffd27a' : 'rgba(255, 220, 120, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - bw / 2 + 0.5, y - 39.5, bw - 1, 17);
    ctx.fillStyle = paying ? '#ffd27a' : '#f0e2c8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - 30.5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // 名字 + 好感星
    const aff = (typeof S !== 'undefined' && S.affection && S.affection[g.cid]) || 0;
    ctx.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#e8d9bd';
    ctx.textAlign = 'center';
    ctx.fillText(c.name + (aff > 0 ? ' ' + '★'.repeat(aff) : ''), x, y + 26);
    ctx.textAlign = 'left';
    // 耐心条（M8.1）：等得越久越短，90 秒走人
    if (g.stage === 'waiting' && typeof guestPatience === 'function') {
      const p = guestPatience(g);
      const bw = 28, bh = 4;
      const bx = x - bw / 2, by = y + 32;   // 放在名字下面，别盖到桌面上
      ctx.fillStyle = 'rgba(20, 14, 8, .72)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = p.ratio > 0.5 ? '#6fbf5a' : p.ratio > 0.25 ? '#e0b541' : '#d05a4a';
      ctx.fillRect(bx, by, bw * p.ratio, bh);
    }
  },

  drawPlayer() {
    const ctx = this.ctx;
    const x = this.ox + this.px;
    const y = this.py;
    ctx.fillStyle = 'rgba(0, 0, 0, .22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const P = (gx, gy, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + gx * 2, y + gy * 2, w * 2, h * 2);
    };
    const frame = Math.floor(this.walkT * 8) % 2;
    const dir = this.dir;

    if (frame) {
      P(-3, 7, 2, 2, '#3a4a6a');
      P(1, 7, 2, 2, '#3a4a6a');
    } else {
      P(-4, 7, 2, 2, '#3a4a6a');
      P(2, 7, 2, 2, '#3a4a6a');
    }
    P(-4, 9, 2, 1, '#4a2e1a');
    P(2, 9, 2, 1, '#4a2e1a');
    P(-4, 1, 8, 6, '#4a7ab0');
    P(-3, 2, 6, 3, '#5a8ac0');
    P(-5, 2, 1, 3, '#f0c8a0');
    P(4, 2, 1, 3, '#f0c8a0');
    P(-5, -8, 10, 9, '#f0c8a0');
    P(-5, -10, 10, 3, '#6b4a2a');
    P(-5, -7, 2, 4, '#6b4a2a');
    P(3, -7, 2, 4, '#6b4a2a');
    if (dir !== 'up') {
      P(-3, -6, 2, 3, '#f8f8f8');
      P(1, -6, 2, 3, '#f8f8f8');
      P(-3, -5, 2, 2, '#1a1a2a');
      P(1, -5, 2, 2, '#1a1a2a');
    }
    if (dir === 'down') P(0, -3, 1, 1, '#c08060');
  }
};
