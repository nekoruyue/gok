// ============================================================
// 《戈克世界·鹿铃亭》M4.1 小镇地图（Canvas 像素风）
// 24×10 格 · 30px/格 · 主角为像素小猫，点击/方向键走动
// 热区：B=王婶货摊  K=粮贩粮摊  L=灰港暗巷  D=鹿铃亭门  F=后院菜地
// ============================================================

const TILE = 48;                 // M5.6：16px 素材 ×3，视野 18×8 格
const MAP_W = 24, MAP_H = 10;
const CW = 896, CH = 320;        // 画布逻辑尺寸（MAP_H × TILE），整数倍缩放显示

// 材质贴图（即梦生成，见 tools/process_textures.py）
const TEX = {};
const TEX_SRC = {
  grass: 'img/tex/grass.png',
  stone: 'img/tex/stone.png',
  wood: 'img/tex/wood.png',
  water: 'img/tex/water.png',
  wall: 'img/tex/wall.png',
  soil: 'img/tex/soil.png'
};
for (const [k, src] of Object.entries(TEX_SRC)) {
  const img = new Image();
  img.onload = () => { TEX[k] = img; };
  img.src = src;
}

// sprite 贴图（即梦生成、抠透明底）
const SPRITE = {};
const SPRITE_SRC = { tree: 'img/sprite/tree.png' };
for (const [k, src] of Object.entries(SPRITE_SRC)) {
  const img = new Image();
  img.onload = () => { SPRITE[k] = img; };
  img.src = src;
}

// ---------- M5.2 冷调地形瓦片 ----------
// 素材：Cozy Farm Lite（Bramble & Byte，CC-BY 4.0），由 tools/build_tiles.py 重刷成榆港冷调
const GROUND_IMG = {};
const GROUND_KEYS = [
  'tile-grass-1', 'tile-grass-2', 'tile-grass-3',
  'tile-path-c', 'tile-path-n', 'tile-path-e', 'tile-path-s', 'tile-path-w',
  'tile-path-ne', 'tile-path-nw', 'tile-path-se', 'tile-path-sw',
  'tile-path-inner-ne', 'tile-path-inner-nw', 'tile-path-inner-se', 'tile-path-inner-sw',
  'tile-soil-c', 'tile-soil-n', 'tile-soil-e', 'tile-soil-s', 'tile-soil-w',
  'tile-soil-ne', 'tile-soil-nw', 'tile-soil-se', 'tile-soil-sw',
  'tile-soil-inner-ne', 'tile-soil-inner-nw', 'tile-soil-inner-se', 'tile-soil-inner-sw'
];
GROUND_KEYS.forEach(k => {
  const img = new Image();
  img.onload = () => { GROUND_IMG[k] = img; };
  img.src = `img/tiles/${k}.png`;
});

// 四季草地（tools/build_seasons.py 生成）：春青 / 夏浓 / 秋黄 / 冬雪
['spring', 'summer', 'autumn', 'winter'].forEach(sea => {
  [1, 2, 3].forEach(n => {
    const k = `tile-grass-${n}-${sea}`;
    const img = new Image();
    img.onload = () => { GROUND_IMG[k] = img; };
    img.src = `img/tiles/${k}.png`;
  });
});

// 海面与岸边（tools/build_water.py 手绘，跟 Cozy 那套笔触统一）
['water-1', 'water-2', 'water-3', 'shore-n', 'shore-e', 'shore-s', 'shore-w', 'r-rock'].forEach(k => {
  const img = new Image();
  img.onload = () => { GROUND_IMG[k] = img; };
  img.src = `img/tiles/${k}.png`;
});

// 草地散点：花丛 / 矮树（稀疏撒，别让空地太空）
// 花用**未压冷**的原色版本 —— 一屏全冷调，得留点暖色跳出来
const PROP_IMG = {};
[['flowers', 'img/tiles/raw/props/flowers.png'],
 ['bush', 'img/tiles/props/bush.png'],
 ['crate', 'img/tiles/props/crate.png'],
 ['barrel', 'img/tiles/props/barrel.png'],
 ['hay', 'img/tiles/props/hay-bale.png']].forEach(([k, src]) => {
  const img = new Image();
  img.onload = () => { PROP_IMG[k] = img; };
  img.src = src;
});

// 作物阶段图集：每张 64×16，横排 4 帧（种子 / 发芽 / 生长 / 成熟）
const CROP_SHEET = {};
['carrot', 'tomato', 'wheat'].forEach(k => {
  const img = new Image();
  img.onload = () => { CROP_SHEET[k] = img; };
  img.src = `img/tiles/crops/${k}-stages.png`;
});

// 游戏里的作物 -> 素材里画哪一种（形状对得上就行）
function cropArt(cropId) {
  if (cropId === 'wheat') return 'wheat';
  if (cropId === 'herb') return 'tomato';
  return 'carrot';
}

// 物品图标（tools/build_items.py），店内柜台陈列也用这套
const ITEM_IMG = {};
[['fish', 'img/items/fish.png'], ['honey', 'img/items/honey.png'],
 ['cheese', 'img/items/cheese.png'], ['kelp', 'img/items/kelp.png'],
 ['salt', 'img/items/salt.png'], ['potato', 'img/items/potato.png']].forEach(([k, src]) => {
  const img = new Image();
  img.onload = () => { ITEM_IMG[k] = img; };
  img.src = src;
});

// 建筑图元（tools/build_buildings.py 手绘：灰蓝板岩瓦 + 木板墙）
const BUILD_IMG = {};
['b-roof', 'b-roof-top', 'b-wall', 'b-wall-dark', 'b-window', 'b-door', 'b-floor', 'b-table', 'b-stove', 'b-brick', 'b-ore', 'b-counter'].forEach(k => {
  const img = new Image();
  img.onload = () => { BUILD_IMG[k] = img; };
  img.src = `img/tiles/b/${k}.png`;
});

// 树（Cozy Farm Lite 的橡树，16px 原生，只按 2x/3x 整数倍放大）
const TREE_IMG = new Image();
TREE_IMG.onload = () => { TREE_IMG.ready = true; };
TREE_IMG.src = 'img/tiles/trees/oak.png';

// 四季树 + 树种（tools/build_tree_seasons.py / build_trees.py）
const TREE_SEASON_IMG = {};
const TREE_KINDS = ['oak', 'birch', 'shrub', 'elder'];
TREE_KINDS.forEach(kind => {
  ['spring', 'summer', 'autumn', 'winter'].forEach(season => {
    const img = new Image();
    img.onload = () => { TREE_SEASON_IMG[`${season}-${kind}`] = img; };
    img.src = `img/tiles/trees/${kind}-${season}.png`;
  });
});

// 角色精灵（tools/build_char.py 生成，16×24，六个人共用骨架、只换配色）
const CHAR_IMG = {};
const CHAR_IDS = ['chie', 'mira', 'bruno', 'eline', 'tomas', 'kaya'];
const CHAR_FRAMES = ['down-0', 'down-1', 'up-0', 'up-1', 'left-0', 'left-1', 'side-0', 'side-1'];
CHAR_IDS.forEach(id => CHAR_FRAMES.forEach(f => {
  const img = new Image();
  img.onload = () => { CHAR_IMG[id + '-' + f] = img; };
  img.src = `img/char/${id}-${f}.png`;
}));

function mapStrOf(name) {
  return ((typeof MAPS !== 'undefined' && MAPS[name]) || (typeof MAPS !== 'undefined' && MAPS.town) || {}).str || '';
}

// 王棋式 autotile：同类地块按 8 邻居选边角片，路就能拐弯
function autoKey(same) {
  const { n, s, e, w, ne, nw, se, sw } = same;
  // 内角优先
  if (n && e && !ne) return 'inner-ne';
  if (n && w && !nw) return 'inner-nw';
  if (s && e && !se) return 'inner-se';
  if (s && w && !sw) return 'inner-sw';
  // 直通道一律用中心片（边界交给 drawEdges 画，避免每格自带草边）
  if (n && s && e && w) return 'c';
  if (e && w) return 'c';
  if (n && s) return 'c';
  // 角片只在「两条边正好相邻且没有第三边」时用
  if (s && e && !n && !w) return 'se';
  if (s && w && !n && !e) return 'sw';
  if (n && e && !s && !w) return 'ne';
  if (n && w && !s && !e) return 'nw';
  // 单边
  if (n) return 'n';
  if (s) return 's';
  if (e) return 'e';
  if (w) return 'w';
  return 'c';
}

function isHSelf(gx, gy) {
  const row = (MAPS.town && MAPS.town.str) ? MAPS.town.str[gy] : null;
  return !!row && row[gx] === 'H';
}

function neighOf(str, gx, gy, group) {
  const at = (x, y) => {
    const row = str[y];
    return !!row && group.includes(row[x]);
  };
  return {
    n: at(gx, gy - 1), s: at(gx, gy + 1), w: at(gx - 1, gy), e: at(gx + 1, gy),
    ne: at(gx + 1, gy - 1), nw: at(gx - 1, gy - 1),
    se: at(gx + 1, gy + 1), sw: at(gx - 1, gy + 1)
  };
}

// G=草 T=树 W=海 P=木栈道 S=石板路 H=墙 B=货摊 K=市集摊 L=暗巷 D=店门 F=后院 O=礁石
const MAP_STR = [
  'GTTGTGTGEGTGGGTGGGWWWWWW',
  'TGGTGGTGGGGGGGGGGGGWOWWW',
  'GTGTGPPPPPPGGGGGGGWWWWWW',
  'TTGTGPPBBBBGGGGGGJGWWOWW',
  'TGTTGPPPPPPGGGGGGGWWWWWW',
  'MGGGTGGGGSSGGTGGGHHHHHHG',
  'TTGKSSSSSSSSSSSSSHHHHHHG',
  'TTNSSSSSSSSSSSSSSHHDHHHG',
  'GGLSSSSSSSSSSSSSSFFFFFGA',
  'TTTGTGTGTGTGTGGTGFFFFFTT'
];

// 牧场（M6）：A 鸡舍 E 回城
const RANCH_STR = [
  'TTTTTTTTTTTTTTTTTTTTTTTT',
  'TTGGGGGGGGGGGGGGGGGGGGTT',
  'TTGGGGGGGGGGGGGGGGGGGGTT',
  'TTGGGAAAAAAGGGGGGGGGGGTT',
  'TTGGGGGGGGGGGGGGGGGGGGTT',
  'TTGGGGGGGGGGGGGGGGGGGGTT',
  'TTGGGGGGGGGGGGGGGGGGGGTT',
  'TTGGGGGGGGGGGGGGGGGGGGTT',
  'TTGGGGGGGGGGEGGGGGGGGGTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT'
];

// 家内部（M6）：H 墙 Z 床 E 出门
const HOUSE_STR = [
  'HHHHHHHHHHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHHHHHHHHHH',
  'HGGGGGGGGGGGGGGGGGGGGGGH',
  'HGGGGZZGGGGGGGGGGGGGGGGH',
  'HGGGGZZGGGGGGGGGGGGGGGGH',
  'HGGGGGGGGGGGGGGGGGGGGGGH',
  'HGGGGGGGGGGGGGGGGGGGGGGH',
  'HGGGGGGGGGGGGGGGGGGGGGGH',
  'HGGGGGGGGGGEGGGGGGGGGGGH',
  'HHHHHHHHHHHHHHHHHHHHHHHH'
];

// 北林（M6）：T 树墙 Y 采集点（野果丛） E 回城
const FOREST_STR = [
  'TTTTTTTTTTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT',
  'TGGGGGGGGGGGGGGGGGGGGGGT',
  'TGGGYYGGGGGGGGGYYGGGGGGT',
  'TGGGGGGGGGGGGGGGGGGGGGGT',
  'TGGGGGGGGGGGGGGGGGGGGGGT',
  'TGGGYYGGGGGGGGGYYGGGGGGT',
  'TGGGGGGGGGGGGGGGGGGGGGGT',
  'TGGGGGGGGGGEGGGGGGGGGGGT',
  'TTTTTTTTTTTTTTTTTTTTTTTT'
];

// 矿洞（M6）：H 洞壁 R 矿石 E 回城
const MINE_STR = [
  'HHHHHHHHHHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHHHHHHHHHH',
  'HGGGGGGGGGGGGGGGGGGGGGGH',
  'HGGRRGGGGRRGGGGRRGGGGGGH',
  'HGGGGGGGGGGGGGGGGGGGGGGH',
  'HGGGRRGGGGGRRGGGGGRRGGGH',
  'HGGGGGGGGGGGGGGGGGGGGGGH',
  'HGGGRRGGGGGRRGGGGGRRGGGH',
  'HGGGGGGGGGGEGGGGGGGGGGGH',
  'HHHHHHHHHHHHHHHHHHHHHHHH'
];

const MAP_WALK = new Set(['G', 'S', 'P', 'B', 'K', 'L', 'D', 'F', 'J', 'N', 'E', 'M', 'R', 'Y', 'A', 'Z']);

// 多地图注册表（M6）：每张图有自己的字符串、热区、出生点
const MAPS = {
  town: {
    name: '榆港',
    str: MAP_STR,
    hot: { B: 'dock', K: 'market', L: 'dark', D: 'shop', J: 'fish', N: 'home', E: 'forest', M: 'mine', A: 'ranch' },
    spawn: [10, 6]
  },
  forest: {
    name: '北林',
    str: FOREST_STR,
    hot: { Y: 'forage', E: 'town' },
    spawn: [6, 5]
  },
  mine: {
    name: '矿洞',
    str: MINE_STR,
    hot: { R: 'rock', E: 'town' },
    spawn: [11, 6]
  },
  ranch: {
    name: '牧场',
    str: RANCH_STR,
    hot: { A: 'chicken', E: 'town' },
    spawn: [10, 5]
  },
  house: {
    name: '家里',
    str: HOUSE_STR,
    hot: { Z: 'bed', E: 'town' },
    spawn: [11, 7]
  }
};

const MAP_HOT_NAME = {
  dock: '王婶的海货摊',
  market: '粮贩的粮摊',
  dark: '灰港暗巷',
  shop: '鹿铃亭的大门',
  yard: '后院的菜地',
  forest: '北林',
  mine: '矿洞',
  forage: '树林里的野货',
  rock: '矿脉'
};

// 装饰物件（M6 美术）：不挡路，只是让地图里「有东西」
const DECOR = {
  town: [
    { type: 'boat', x: 20, y: 2 },
    { type: 'chimney', x: 18, y: 5 },
    { type: 'stall', x: 2, y: 5, hue: 0 },
    { type: 'stall', x: 6, y: 5, hue: 1 },
    { type: 'stall', x: 11, y: 5, hue: 2 },
    { type: 'signpost', x: 5, y: 5 },
    { type: 'signpost', x: 12, y: 5 },
    { type: 'hedge', x: 6, y: 5 },
    { type: 'hedge', x: 7, y: 5 },
    { type: 'hedge', x: 11, y: 5 },
    { type: 'hedge', x: 14, y: 5 },
    { type: 'hedge', x: 15, y: 9 },
    { type: 'hedge', x: 16, y: 9 },
    { type: 'piling', x: 19, y: 2 },
    { type: 'piling', x: 22, y: 4 },
    { type: 'piling', x: 23, y: 1 },
    { type: 'boat', x: 21, y: 4 },
    { type: 'well', x: 13, y: 5, block: true },
    { type: 'bench', x: 9, y: 5, block: true },
    { type: 'bench', x: 15, y: 5, block: true },
    { type: 'lamp', x: 4, y: 5, block: true },
    { type: 'lamp', x: 12, y: 5, block: true },
    { type: 'lamp', x: 16, y: 5, block: true },
    { type: 'crate', x: 6, y: 4, block: true },
    { type: 'crate', x: 13, y: 2, block: true },
    { type: 'bush', x: 7, y: 2 },
    { type: 'bush', x: 16, y: 2 },
    { type: 'flower', x: 5, y: 2, color: '#e8a0c0' },
    { type: 'flower', x: 14, y: 2, color: '#a0c8e8' },
    { type: 'rock', x: 4, y: 8, block: true },
    { type: 'rock', x: 2, y: 6, block: true },
    { type: 'fence', x: 18, y: 5, block: true },
    { type: 'fence', x: 19, y: 5, block: true },
    { type: 'flower', x: 2, y: 5, color: '#ffd27a' },
    { type: 'flower', x: 22, y: 6, color: '#a0e8a0' },
    { type: 'bush', x: 4, y: 9 },
    { type: 'bush', x: 13, y: 9 }
  ],
  house: [
    { type: 'crate', x: 3, y: 7, block: true },
    { type: 'bush', x: 17, y: 3 },
    { type: 'flower', x: 8, y: 2, color: '#ffd27a' }
  ],
  ranch: [
    { type: 'bush', x: 14, y: 3 },
    { type: 'bush', x: 18, y: 6 },
    { type: 'rock', x: 5, y: 7, block: true }
  ],
  forest: [
    { type: 'bush', x: 8, y: 2 },
    { type: 'bush', x: 15, y: 5 },
    { type: 'flower', x: 12, y: 3, color: '#e8a0c0' }
  ],
  mine: [
    { type: 'rock', x: 6, y: 5, block: true },
    { type: 'rock', x: 17, y: 5, block: true }
  ]
};

const MapScene = {
  cv: null,
  ctx: null,
  mapName: 'town',    // 当前地图（M6 多地图）：town | forest | mine
  cx: 10, cy: 6,      // 角色所在格（起点：鹿铃亭前广场）
  px: 0, py: 0,       // 角色像素坐标（格中心）
  path: [],
  dir: 'down',
  walkT: 0,
  raf: null,
  running: false,
  last: 0,
  triggered: false,
  interactable: null,   // 当前脚下可互动热区（M7：走到热区不自动触发）
  pendingInteract: false, // 点击热区格时：到达后自动触发一次
  onHot: null,        // game.js 设置：热区触发
  onStand: null,      // game.js 设置：落脚回调
  held: { up: false, down: false, left: false, right: false },  // 方向键按住状态
  ox: 0, oy: 0,

  attach(cv) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.resize(this.cw || CW, this.ch || CH);
    this.oy = 0;
    this.resetPos();
  },

  // 画布逻辑尺寸跟着视口走（M5.3）：铺满屏幕，不留黑边
  resize(lw, lh) {
    const baseW = (typeof CW === 'number') ? CW : 896;
    const baseH = (typeof CH === 'number') ? CH : 320;
    this.cw = Math.max(baseW, Math.round(Number(lw) || baseW));
    this.ch = Math.max(baseH, Math.round(Number(lh) || baseH));
    if (this.cv) {
      this.cv.width = this.cw;
      this.cv.height = this.ch;
    }
    this.updateCamera();
  },

  // 摄像机：玩家居中，卡在地图边界内；地图比画布小就居中（M5.6）
  updateCamera() {
    const cw = this.cw || CW, ch = this.ch || CH;
    const mapW = MAP_W * TILE, mapH = MAP_H * TILE;
    const px = (typeof this.px === 'number') ? this.px : mapW / 2;
    const py = (typeof this.py === 'number') ? this.py : mapH / 2;
    let cx, cy;
    if (mapW > cw) cx = Math.max(0, Math.min(mapW - cw, px - cw / 2));
    else cx = (mapW - cw) / 2;          // 地图比画布小：负偏移，把地图推到中间
    if (mapH > ch) cy = Math.max(0, Math.min(mapH - ch, py - ch / 2));
    else cy = (mapH - ch) / 2;
    this.camX = Math.round(cx);
    this.camY = Math.round(cy);
    // 绘制偏移 = 摄像机位置取负（screen = world - camera）
    this.ox = -this.camX;
    this.oy = -this.camY;
  },

  resetPos(sx, sy) {
    const sp = (MAPS[this.mapName] || MAPS.town).spawn;
    this.cx = sx !== undefined ? sx : sp[0];
    this.cy = sy !== undefined ? sy : sp[1];
    this.px = this.cx * TILE + TILE / 2;
    this.py = this.cy * TILE + TILE / 2;
    this.path = [];
    this.triggered = false;
    this._lastStand = null;
    this.dir = 'down';
  },

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 'H';
    return (MAPS[this.mapName] || MAPS.town).str[y][x];
  },

  walkable(x, y) {
    if (!MAP_WALK.has(this.tileAt(x, y))) return false;
    // 装饰物挡路（M7）：水井/木箱/石头/路灯/长椅不能穿
    const list = (typeof DECOR !== 'undefined' && DECOR[this.mapName]) || null;
    if (list && list.some(d => d.block && d.x === x && d.y === y)) return false;
    return true;
  },

  findPath(sx, sy, tx, ty) {
    const key = (x, y) => x + ',' + y;
    const prev = new Map();
    const q = [[sx, sy]];
    const seen = new Set([key(sx, sy)]);
    // 八方向：先试对角再走直角，路径自然斜着走
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
        // 对角步不允许穿角
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
    // 点击热区格 → 到达后自动触发（M7）
    const hot = (MAPS[this.mapName] || MAPS.town).hot[this.tileAt(tx, ty)];
    this.pendingInteract = !!hot;
    return true;
  },

  step(dx, dy) {
    const nx = this.cx + dx, ny = this.cy + dy;
    if (!this.walkable(nx, ny)) return false;
    // 对角步不允许穿角
    if (dx !== 0 && dy !== 0 && (!this.walkable(this.cx + dx, this.cy) || !this.walkable(this.cx, this.cy + dy))) return false;
    this.path = [{ x: nx, y: ny }];
    return true;
  },

  // 按住方向键时返回方向（八方向：同时按两个就是斜走）
  getHeldDir() {
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
    const hot = (MAPS[this.mapName] || MAPS.town).hot;
    // 交互（M7）：走到热区只标记「可互动」，按空格/点击才触发
    if (arrived) {
      this.interactable = hot[t] || null;
      if (this._lastStand !== k) {
        this._lastStand = k;
        if (typeof this.onStand === 'function') this.onStand(t, this.cx, this.cy);
      }
      // 点击热区格 → 走到后自动触发一次
      if (this.interactable && this.pendingInteract) {
        this.pendingInteract = false;
        if (this.onHot) this.onHot(this.interactable);
      }
    }
  },

  update(dt) {
    if (this.path.length) {
      const next = this.path[0];
      const tx = next.x * TILE + TILE / 2;
      const ty = next.y * TILE + TILE / 2;
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
      // 按住方向键 → 走完一格接着走下一格（连续走，不等系统按键重复）
      const dir = this.getHeldDir();
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
    if (!this.cv) this.attach(document.getElementById('map'));
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

  // ---------- 绘制 ----------
  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    // 镇民走动计时（M5.3）
    this.initNpcMotion();
    const nowMs = performance.now();
    const dt = Math.min(0.1, (nowMs - (this._npcLast || nowMs)) / 1000);
    this._npcLast = nowMs;
    this.npcTick(dt);
    this.updateCamera();
    ctx.fillStyle = '#16241a';
    ctx.fillRect(0, 0, (this.cw || CW), (this.ch || CH));
    const ox = this.ox;
    const str = mapStrOf(this.mapName);

    // ① 地面层（M5.2）：草地随机三变体 + 土路 autotile
    this.drawGroundLayer(ox, str);

    // ② 物件层：逐行绘制，角色插进自己那一行 —— 走到树/房子后面会被挡住（M5.2 Y 排序）
    this.drawShadows(str, ox);   // 物件脚下投影先铺一层，物件才「站得住」
    const pRow = this.cy;
    const npcs = (this.mapName === 'town' && typeof TOWNSFOLK !== 'undefined') ? TOWNSFOLK : [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.drawTile(this.tileAt(x, y), ox + x * TILE, (this.oy || 0) + y * TILE, x, y);
      }
      // 走动的人可能跨行，这里按「当前行或正在走向的行」都画一次（避免掉帧消失）
      npcs.filter(n => Math.round(n.py) === y || n.y === y).forEach(n => {
        const nx2 = (typeof n.px === 'number') ? n.px : n.x;
        const ny2 = (typeof n.py === 'number') ? n.py : n.y;
        this.drawTownsperson(n, ox + nx2 * TILE + TILE / 2, (this.oy || 0) + ny2 * TILE + TILE / 2);
      });
      if (y === pRow) this.drawPlayer();
    }
    if (pRow >= MAP_H) this.drawPlayer();
    // 海岸沙滩（M5.10）：紧贴海的草格铺一条沙带，硬边就不见了
    {
      const SAND_W = TILE * 0.42;
      for (let gy = 0; gy < MAP_H; gy++) {
        const row = str[gy] || '';
        for (let gx = 0; gx < MAP_W; gx++) {
          const ch = row[gx];
          if (ch !== 'G' && ch !== 'S') continue;
          const upRow = str[gy - 1], dnRow = str[gy + 1];
          const up = upRow ? upRow[gx] : '';
          const dn = dnRow ? dnRow[gx] : '';
          const lf = row[gx - 1] || '';
          const rt = row[gx + 1] || '';
          const touchW = (c) => c === 'W' || c === 'O';
          const px2 = ox + gx * TILE;
          const py2 = (this.oy || 0) + gy * TILE;

          const grad = (x0, y0, x1, y1, dir) => {
            const g2 = dir === 'v'
              ? ctx.createLinearGradient(x0, y0, x0, y1)
              : ctx.createLinearGradient(x0, y0, x1, y0);
            g2.addColorStop(0, 'rgba(228, 216, 178, .78)');
            g2.addColorStop(0.65, 'rgba(226, 214, 176, .42)');
            g2.addColorStop(1, 'rgba(226, 214, 176, 0)');
            return g2;
          };

          if (touchW(up)) { ctx.fillStyle = grad(0, py2, 0, py2 + SAND_W, 'v'); ctx.fillRect(px2, py2, TILE, SAND_W); }
          if (touchW(dn)) { ctx.fillStyle = grad(0, py2 + TILE, 0, py2 + TILE - SAND_W, 'v'); ctx.fillRect(px2, py2 + TILE - SAND_W, TILE, SAND_W); }
          if (touchW(lf)) { ctx.fillStyle = grad(px2, 0, px2 + SAND_W, 0, 'h'); ctx.fillRect(px2, py2, SAND_W, TILE); }
          if (touchW(rt)) { ctx.fillStyle = grad(px2 + TILE, 0, px2 + TILE - SAND_W, 0, 'h'); ctx.fillRect(px2 + TILE - SAND_W, py2, SAND_W, TILE); }
        }
      }
    }

    // 水面倒影：物件画完了才映得进去
    this.drawReflections(str, ox);
    // 后院木栏：画在物件层之后，否则会被菜地格子盖掉
    this.drawYardFence(str, ox);
    // 图块边缘过渡（M7）：草地/石板/水/建筑交界处不硬拼
    this.drawEdges();
    // 装饰物件（M6 美术）：路灯/水井/长椅/木箱/灌木/花/石头
    this.drawDecor();
    // 阳光：左上暖、右下冷，给画面一层方向感（不再是均匀叠一层黄）
    const sun = ctx.createLinearGradient(0, 0, (this.cw || CW) * 0.9, (this.ch || CH) * 1.2);
    sun.addColorStop(0, 'rgba(255, 238, 194, .13)');
    sun.addColorStop(0.45, 'rgba(255, 224, 176, .03)');
    sun.addColorStop(1, 'rgba(22, 50, 64, .17)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, (this.cw || CW), (this.ch || CH));
    // 天气色温（M5.2）：雨天压暗偏青，暴风更沉
    const wx = (typeof S !== 'undefined' && S.weather) || 'sunny';
    if (wx === 'rain') {
      ctx.fillStyle = 'rgba(58, 92, 122, .15)';
      ctx.fillRect(0, 0, (this.cw || CW), (this.ch || CH));
    } else if (wx === 'storm') {
      ctx.fillStyle = 'rgba(34, 56, 84, .26)';
      ctx.fillRect(0, 0, (this.cw || CW), (this.ch || CH));
    }
    // 时段色温（M5.3，纯视觉）：读游戏内的 S.dusk，晨偏青白 / 午最亮 / 暮偏橙
    {
      const dusk = (typeof S !== 'undefined' && typeof S.dusk === 'number') ? S.dusk : 1;
      const tint = dusk === 0 ? 'rgba(168, 206, 220, .10)'
        : dusk === 2 ? 'rgba(242, 158, 96, .17)'
          : null;
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, (this.cw || CW), (this.ch || CH));
      }
      // 暮色再压一点暖影，跟晨光拉开
      if (dusk === 2) {
        const wg = ctx.createLinearGradient(0, (this.ch || CH), (this.cw || CW), 0);
        wg.addColorStop(0, 'rgba(120, 60, 40, .16)');
        wg.addColorStop(1, 'rgba(120, 60, 40, 0)');
        ctx.fillStyle = wg;
        ctx.fillRect(0, 0, (this.cw || CW), (this.ch || CH));
      }
    }
    // 云影（M5.2）：几片慢速移动的暗斑，画面就不死了
    {
      const ct = performance.now() / 1000;
      const cloudA = wx === 'storm' ? .15 : wx === 'rain' ? .10 : .08;
      for (let i = 0; i < 3; i++) {
        const cx = ((ct * (12 + i * 6) + i * 420) % ((this.cw || CW) + 520)) - 260;
        const cy = 66 + i * 96 + Math.sin(ct * 0.35 + i * 2) * 22;
        const r = 150 + i * 42;
        const cg = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
        cg.addColorStop(0, `rgba(18, 44, 56, ${cloudA})`);
        cg.addColorStop(1, 'rgba(18, 44, 56, 0)');
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, (this.cw || CW), (this.ch || CH));
      }
    }
    // 暗角（地心护核者那种压一层暗的感觉）
    // 远景雾化（M5.10）：暗角从纯黑改成偏蓝灰的「空气透视」，
    // 边缘不是变黑而是被雾吞掉，远处物件自然退到背景
    {
      const cwv = this.cw || CW, chv = this.ch || CH;
      const cxv = cwv / 2, cyv = chv / 2;
      const rIn = TILE * 3.2, rOut = TILE * 11;
      const vig = ctx.createRadialGradient(cxv, cyv, rIn, cxv, cyv, rOut);
      vig.addColorStop(0, 'rgba(90, 126, 140, 0)');
      vig.addColorStop(0.55, 'rgba(78, 112, 128, .06)');
      vig.addColorStop(0.82, 'rgba(62, 96, 112, .15)');
      vig.addColorStop(1, 'rgba(48, 78, 94, .26)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, cwv, chv);
    }
    const vig = null;

    const t = this.tileAt(this.cx, this.cy);
    const hotNow = (MAPS[this.mapName] || MAPS.town).hot;
    if (hotNow[t]) this.drawHotGlow(ox + this.cx * TILE, this.cy * TILE);
    // 镇民与玩家已经在物件层里按行插过了（M5.2 Y 排序）
    // 雨（M6 天气视觉）：雨天细密雨丝，暴风更急
    if (typeof S !== 'undefined' && (S.weather === 'rain' || S.weather === 'storm')) {
      const n = S.weather === 'storm' ? 90 : 50;
      const t = performance.now() / 1000;
      ctx.strokeStyle = 'rgba(190, 210, 235, .32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const rx = (i * 137.5 + t * 60) % (this.cw || CW);
        const ry = (i * 71.3 + t * 900) % (this.ch || CH);
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 7);
      }
      ctx.stroke();
    }
  },

  // 从材质图取一块贴到格子上（各格按坐标偏移取不同块，避免千篇一律）
  texBlock(key, gx, gy, x, y) {
    const img = TEX[key];
    if (!img || !this.ctx) return false;
    const seed = gx * 53 + gy * 97;
    const maxX = Math.max(1, img.width - TILE);
    const maxY = Math.max(1, img.height - TILE);
    const bx = (seed * 17) % maxX;
    const by = (seed * 29) % maxY;
    this.ctx.drawImage(img, bx, by, TILE, TILE, x, y, TILE, TILE);
    return true;
  },

  // 平铺材质：纹理连续（画布全局对齐，格子之间没有拼贴断裂）
  texFill(key, x, y, w, h) {
    const img = TEX[key];
    if (!img || !this.ctx) return false;
    if (!this._pats) this._pats = {};
    if (!this._pats[key]) this._pats[key] = this.ctx.createPattern(img, 'repeat');
    this.ctx.fillStyle = this._pats[key];
    this.ctx.fillRect(x, y, w, h);
    return true;
  },

  // ---------- 装饰物件（M6 美术） ----------
  drawDecor() {
    const list = (typeof DECOR !== 'undefined' && DECOR[this.mapName]) || null;
    if (!list) return;
    const sKey = (typeof seasonKey === 'function') ? seasonKey() : 'spring';
    list.forEach(d => {
      // 冬天不长花草：灌木和花直接跳过（枯枝以后再说）
      if (sKey === 'winter' && (d.type === 'bush' || d.type === 'flower')) return;
      this.drawDecorItem(d);
    });
  },

  drawDecorItem(d) {
    const ctx = this.ctx;
    const x = this.ox + d.x * TILE + TILE / 2;
    const y = (this.oy || 0) + d.y * TILE + TILE;
    switch (d.type) {
      case 'stall': {
        // 街边摊位（M5.10）：条纹顶棚 + 四柱 + 桌面
        const sw = Math.round(TILE * 1.16);
        const sx = x - sw / 2;
        const roofY = y - Math.round(TILE * 1.38);
        const roofH = Math.round(TILE * 0.34);
        const tableY = y - Math.round(TILE * 0.50);
        const palettes = [
          ['#b8524a', '#efe6d6'],
          ['#4a6a8a', '#e8eef0'],
          ['#6a8a4a', '#efe6d6']
        ];
        const pal = palettes[(d.hue || 0) % 3];

        // 影
        ctx.fillStyle = 'rgba(10, 20, 18, .24)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, sw * 0.52, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 柱子
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(sx + 2, roofY + roofH, 3, Math.round(TILE * 0.82));
        ctx.fillRect(sx + sw - 5, roofY + roofH, 3, Math.round(TILE * 0.82));

        // 顶棚：条纹
        const stripes = 6;
        const step = sw / stripes;
        for (let i = 0; i < stripes; i++) {
          ctx.fillStyle = i % 2 ? pal[1] : pal[0];
          ctx.fillRect(sx + i * step, roofY, Math.ceil(step), roofH);
        }
        // 棚沿阴影
        ctx.fillStyle = 'rgba(10, 16, 14, .28)';
        ctx.fillRect(sx, roofY + roofH - 2, sw, 3);
        // 顶棚高光
        ctx.fillStyle = 'rgba(255, 250, 236, .22)';
        ctx.fillRect(sx, roofY, sw, 2);

        // 桌面
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(sx + 1, tableY, sw - 2, Math.round(TILE * 0.16));
        ctx.fillStyle = 'rgba(20, 12, 6, .30)';
        ctx.fillRect(sx + 1, tableY + Math.round(TILE * 0.14), sw - 2, 2);
        // 桌上的货（两个小方块示意）
        ctx.fillStyle = '#c9a05a';
        ctx.fillRect(sx + Math.round(sw * 0.20), tableY - 5, 7, 6);
        ctx.fillStyle = '#7a9a5a';
        ctx.fillRect(sx + Math.round(sw * 0.56), tableY - 4, 6, 5);
        break;
      }
      case 'signpost': {
        // 告示牌（M5.9）：两根立柱 + 一块带字的木牌
        const sw = Math.round(TILE * 0.62);
        const sh = Math.round(TILE * 0.34);
        const sx = x - sw / 2;
        const sy = y - Math.round(TILE * 0.92);
        // 影
        ctx.fillStyle = 'rgba(10, 20, 18, .22)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, sw * 0.44, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // 立柱
        ctx.fillStyle = '#5a3c24';
        ctx.fillRect(x - Math.round(sw * 0.28), sy + sh, 3, Math.round(TILE * 0.58));
        ctx.fillRect(x + Math.round(sw * 0.22), sy + sh, 3, Math.round(TILE * 0.58));
        // 牌面
        ctx.fillStyle = '#2a1c10';
        ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = '#a8814f';
        ctx.fillRect(sx, sy, sw, 2);
        ctx.fillStyle = 'rgba(20, 14, 8, .30)';
        ctx.fillRect(sx, sy + sh - 2, sw, 2);
        // 字（用横线示意，不写具体内容）
        ctx.fillStyle = 'rgba(40, 28, 16, .75)';
        const lw = Math.round(sw * 0.62);
        ctx.fillRect(sx + Math.round(sw * 0.18), sy + Math.round(sh * 0.34), lw, 2);
        ctx.fillRect(sx + Math.round(sw * 0.18), sy + Math.round(sh * 0.62), Math.round(lw * 0.7), 2);
        break;
      }
      case 'hedge': {
        // 矮篱笆（M5.3 改）：直边 + 平顶 + 竖向修剪纹，看得出是修过的
        const hw = TILE - 2;
        const hx = x - hw / 2;
        const hh = 14;
        const hy = y - hh - 3;

        // 底影
        ctx.fillStyle = 'rgba(12, 30, 24, .30)';
        ctx.beginPath();
        ctx.ellipse(x + 1, y - 2, hw * 0.52, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 体（暗底）
        ctx.fillStyle = '#274c3c';
        ctx.fillRect(hx, hy, hw, hh);
        // 亮面
        ctx.fillStyle = '#356048';
        ctx.fillRect(hx, hy, hw, hh - 5);
        // 平顶（修剪线）
        ctx.fillStyle = '#4f8a64';
        ctx.fillRect(hx, hy, hw, 2);
        ctx.fillStyle = 'rgba(150, 200, 160, .45)';
        ctx.fillRect(hx, hy, hw, 1);
        // 竖向修剪纹
        ctx.fillStyle = 'rgba(20, 46, 34, .40)';
        for (let i = 1; i < 4; i++) {
          ctx.fillRect(Math.round(hx + i * (hw / 4)), hy + 3, 1, hh - 5);
        }
        // 底边压暗
        ctx.fillStyle = 'rgba(14, 34, 26, .45)';
        ctx.fillRect(hx, hy + hh - 3, hw, 3);
        // 零星叶点
        ctx.fillStyle = 'rgba(140, 190, 150, .5)';
        for (let i = 0; i < 5; i++) {
          const lx = hx + 2 + ((i * 41) % (hw - 4));
          const ly = hy + 3 + ((i * 19) % (hh - 6));
          ctx.fillRect(lx, ly, 1, 1);
        }
        break;
      }
      case 'chimney': {
        // 烟囱（M5.3）：砖砌方柱 + 顶盖 + 缓缓升起的炊烟
        const cw = 12, chh = 20;
        const cx0 = x - cw / 2;
        const cy0 = y - TILE - chh + 6;
        // 柱身
        ctx.fillStyle = '#5c6670';
        ctx.fillRect(cx0, cy0, cw, chh);
        ctx.fillStyle = 'rgba(30, 38, 44, .35)';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(cx0, cy0 + 4 + i * 5, cw, 1);
        }
        ctx.fillStyle = 'rgba(180, 196, 206, .35)';
        ctx.fillRect(cx0, cy0, 2, chh);
        // 顶盖
        ctx.fillStyle = '#3a444e';
        ctx.fillRect(cx0 - 2, cy0 - 4, cw + 4, 4);
        ctx.fillStyle = '#7a848e';
        ctx.fillRect(cx0 - 2, cy0 - 4, cw + 4, 1);
        // 炊烟
        const t = performance.now() / 1000;
        for (let i = 0; i < 5; i++) {
          const ph = (t * 0.32 + i * 0.2) % 1;
          const r = 4 + ph * 11;
          const a = (1 - ph) * 0.5;
          if (a < 0.03) continue;
          const sx = x + Math.sin(ph * 3.2 + i) * 8 + ph * 16;
          const sy = cy0 - 10 - ph * 50;
          // 外圈浅灰让烟在浅墙上也能看出来
          ctx.fillStyle = `rgba(196, 204, 210, ${(a * 0.55).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r + 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(240, 244, 247, ${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'piling': {
        // 半沉木桩（M5.3）：桩身 + 顶端 + 水波环
        ctx.fillStyle = 'rgba(20, 40, 48, .22)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + 2, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#42301f';
        ctx.fillRect(x - 3, y - 26, 6, 28);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x - 3, y - 26, 2, 28);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(x + 1, y - 26, 2, 28);
        // 顶端（断口）
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(x - 4, y - 29, 8, 3);
        ctx.fillStyle = '#a07a4c';
        ctx.fillRect(x - 3, y - 28, 6, 1);
        // 水线波纹
        ctx.strokeStyle = 'rgba(206, 236, 244, .40)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y + 1, 7, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'boat': {
        // 小船（M5.3）：船身 + 内舱 + 桅杆 + 帆，脚下带倒影
        const bw = 22, bh = 9;
        // 倒影（M5.3 改）：竖向拉长的糊影 + 水波撕条，别再是个圆盘
        {
          const grd = ctx.createLinearGradient(0, y + 1, 0, y + 20);
          grd.addColorStop(0, 'rgba(22, 48, 58, .36)');
          grd.addColorStop(0.5, 'rgba(24, 54, 64, .18)');
          grd.addColorStop(1, 'rgba(24, 54, 64, 0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.ellipse(x, y + 5, bw - 4, bh * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
          // 撕条
          ctx.fillStyle = 'rgba(62, 110, 124, .26)';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(x - bw + 6, y + 6 + i * 5, (bw - 6) * 2, 2);
          }
        }
        // 船身（M5.3 改）：船形剖面，上宽下窄、两头微翘，别再像木盆
        ctx.fillStyle = '#4a3220';
        ctx.beginPath();
        ctx.moveTo(x - bw, y - 12);
        ctx.quadraticCurveTo(x - bw + 5, y + 4, x, y + 5);
        ctx.quadraticCurveTo(x + bw - 5, y + 4, x + bw, y - 12);
        ctx.closePath();
        ctx.fill();
        // 船舷（上沿亮木）
        ctx.fillStyle = '#7a5836';
        ctx.beginPath();
        ctx.moveTo(x - bw, y - 12);
        ctx.quadraticCurveTo(x, y - 17, x + bw, y - 12);
        ctx.quadraticCurveTo(x, y - 7, x - bw, y - 12);
        ctx.closePath();
        ctx.fill();
        // 舱内暗
        ctx.fillStyle = 'rgba(28, 18, 10, .55)';
        ctx.beginPath();
        ctx.ellipse(x, y - 11, bw - 7, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // 桅杆
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(x - 1, y - 42, 3, 32);
        // 帆
        ctx.fillStyle = 'rgba(234, 238, 238, .92)';
        ctx.beginPath();
        ctx.moveTo(x + 2, y - 40);
        ctx.lineTo(x + 18, y - 16);
        ctx.lineTo(x + 2, y - 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(196, 210, 214, .9)';
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 38);
        ctx.lineTo(x - 14, y - 16);
        ctx.lineTo(x - 2, y - 16);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'lamp': {
        // 影子
        ctx.fillStyle = 'rgba(0, 0, 0, .22)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // 杆
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(x - 1, y - 32, 2, 30);
        // 灯罩
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(x - 5, y - 38, 10, 7);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(x - 4, y - 36, 8, 4);
        // 暖光
        const g = ctx.createRadialGradient(x, y - 34, 2, x, y - 34, 26);
        g.addColorStop(0, 'rgba(255, 210, 122, .30)');
        g.addColorStop(1, 'rgba(255, 210, 122, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 26, y - 60, 52, 52);
        break;
      }
      case 'bush': {
        ctx.fillStyle = 'rgba(0, 0, 0, .18)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2f6a2f';
        ctx.beginPath();
        ctx.ellipse(x, y - 10, 11, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3f7f3f';
        ctx.beginPath();
        ctx.ellipse(x - 3, y - 12, 7, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'flower': {
        ctx.fillStyle = '#3f7f3f';
        ctx.fillRect(x - 1, y - 8, 2, 6);
        ctx.fillStyle = d.color || '#e8a0c0';
        ctx.fillRect(x - 3, y - 12, 6, 4);
        ctx.fillStyle = '#ffe8a0';
        ctx.fillRect(x - 1, y - 11, 2, 2);
        break;
      }
      case 'rock': {
        ctx.fillStyle = 'rgba(0, 0, 0, .18)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 9, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6a6a60';
        ctx.beginPath();
        ctx.ellipse(x, y - 7, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a8a80';
        ctx.beginPath();
        ctx.ellipse(x - 2, y - 9, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'crate': {
        ctx.fillStyle = 'rgba(0, 0, 0, .20)';
        ctx.fillRect(x - 9, y - 3, 18, 4);
        ctx.fillStyle = '#8a5c30';
        ctx.fillRect(x - 9, y - 18, 18, 16);
        ctx.fillStyle = '#a07040';
        ctx.fillRect(x - 8, y - 17, 16, 14);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x - 8, y - 10, 16, 2);
        break;
      }
      case 'bench': {
        ctx.fillStyle = 'rgba(0, 0, 0, .18)';
        ctx.fillRect(x - 12, y - 2, 24, 3);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x - 12, y - 12, 24, 3);
        ctx.fillRect(x - 12, y - 6, 24, 3);
        ctx.fillStyle = '#4a2e1a';
        ctx.fillRect(x - 11, y - 14, 2, 12);
        ctx.fillRect(x + 9, y - 14, 2, 12);
        break;
      }
      case 'well': {
        ctx.fillStyle = 'rgba(0, 0, 0, .20)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6a6a60';
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a3a34';
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // 屋顶架
        ctx.fillStyle = '#8a5c30';
        ctx.fillRect(x - 10, y - 24, 2, 16);
        ctx.fillRect(x + 8, y - 24, 2, 16);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x - 12, y - 27, 24, 3);
        break;
      }
      case 'fence': {
        ctx.fillStyle = 'rgba(0, 0, 0, .18)';
        ctx.fillRect(x - 13, y - 2, 26, 3);
        ctx.fillStyle = '#8a5c30';
        ctx.fillRect(x - 13, y - 12, 26, 3);
        ctx.fillStyle = '#a07040';
        ctx.fillRect(x - 13, y - 7, 26, 3);
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(x - 13, y - 16, 3, 18);
        ctx.fillRect(x + 10, y - 16, 3, 18);
        break;
      }
    }
  },

  // ---------- 图块边缘（M7）：草地/石板/水/建筑交界处做过渡，别硬拼接 ----------
  drawEdges() {
    const ctx = this.ctx;
    const isHard = v => v === 'S' || v === 'H' || v === 'P' || v === 'B' || v === 'K';
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = this.tileAt(x, y);
        if (t !== 'G' && t !== 'S') continue;
        const px = this.ox + x * TILE;
        const py = (this.oy || 0) + y * TILE;
        const up = this.tileAt(x, y - 1);
        const dn = this.tileAt(x, y + 1);
        const lf = this.tileAt(x - 1, y);
        const rt = this.tileAt(x + 1, y);
        if (t === 'G') {
          // 草地贴着硬地/建筑：草根阴影
          if (isHard(up)) { ctx.fillStyle = 'rgba(22, 30, 26, .30)'; ctx.fillRect(px, py, TILE, 3); }
          if (isHard(dn)) { ctx.fillStyle = 'rgba(22, 30, 26, .30)'; ctx.fillRect(px, py + TILE - 3, TILE, 3); }
          if (isHard(lf)) { ctx.fillStyle = 'rgba(22, 30, 26, .30)'; ctx.fillRect(px, py, 3, TILE); }
          if (isHard(rt)) { ctx.fillStyle = 'rgba(22, 30, 26, .30)'; ctx.fillRect(px + TILE - 3, py, 3, TILE); }
          // 草地贴水：浅蓝水线
          if (up === 'W' || dn === 'W' || lf === 'W' || rt === 'W') {
            ctx.fillStyle = 'rgba(150, 190, 220, .35)';
            if (up === 'W') ctx.fillRect(px, py, TILE, 2);
            if (dn === 'W') ctx.fillRect(px, py + TILE - 2, TILE, 2);
            if (lf === 'W') ctx.fillRect(px, py, 2, TILE);
            if (rt === 'W') ctx.fillRect(px + TILE - 2, py, 2, TILE);
          }
        } else {
          // 石板贴着草地：1px 暗边（石板铺在草地上）
          if (up === 'G') { ctx.fillStyle = 'rgba(0, 0, 0, .22)'; ctx.fillRect(px, py, TILE, 2); }
          if (dn === 'G') { ctx.fillStyle = 'rgba(0, 0, 0, .22)'; ctx.fillRect(px, py + TILE - 2, TILE, 2); }
          if (lf === 'G') { ctx.fillStyle = 'rgba(0, 0, 0, .22)'; ctx.fillRect(px, py, 2, TILE); }
          if (rt === 'G') { ctx.fillStyle = 'rgba(0, 0, 0, .22)'; ctx.fillRect(px + TILE - 2, py, 2, TILE); }
        }
      }
    }
  },

  // ---------- M5.2 地面层：草地变体 + 土路 autotile ----------
  grassKey(gx, gy) {
    const sk = (typeof seasonKey === 'function') ? seasonKey() : 'spring';
    const n = Math.abs((gx * 73856093) ^ (gy * 19349663)) % 3;
    // 四季有独立瓦片就按季节取，没有就退回春
    const key = `tile-grass-${n + 1}-${sk}`;
    return GROUND_IMG[key] ? key : `tile-grass-${n + 1}`;
  },

  drawGroundLayer(ox, str) {
    const ctx = this.ctx;
    const isMine = this.mapName === 'mine';
    // 整块画布先铺底：地面用草（室外）或土石（矿洞）
    // 草地也走「格子坐标」：跟路面共用一套网格。
    // 原来按屏幕坐标铺，摄像机偏移不是 48 的整数倍时两套网格错开，路右侧会露出一条草
    {
      const cwv = this.cw || CW, chv = this.ch || CH;
      const oyv = this.oy || 0;
      const gx0 = Math.floor(-ox / TILE) - 1;
      const gx1 = Math.ceil((cwv - ox) / TILE) + 1;
      const gy0 = Math.floor(-oyv / TILE) - 1;
      const gy1 = Math.ceil((chv - oyv) / TILE) + 1;
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          const img = GROUND_IMG[isMine ? 'tile-soil-c' : this.grassKey(gx, gy)];
          const px = ox + gx * TILE;
          const py = oyv + gy * TILE;
          if (img) ctx.drawImage(img, px, py, TILE, TILE);
          else {
            ctx.fillStyle = '#3f6455';
            ctx.fillRect(px, py, TILE, TILE);
          }
          // 低频明暗（M5.11）：3~4 格一个大块的深浅起伏，草地看着才不像平铺的纸
          if (!isMine) {
            const bx = Math.floor(gx / 3), by = Math.floor(gy / 3);
            const ln = Math.sin((bx * 0.9 + by * 1.7) * 1.3) * Math.cos((by * 0.8 - bx * 1.1) * 1.1);
            const k = (ln + 1) / 2;            // 0..1
            if (k > 0.62) {
              ctx.fillStyle = `rgba(24, 58, 46, ${((k - 0.62) * 0.34).toFixed(3)})`;
              ctx.fillRect(px, py, TILE, TILE);
            } else if (k < 0.36) {
              ctx.fillStyle = `rgba(186, 214, 172, ${((0.36 - k) * 0.26).toFixed(3)})`;
              ctx.fillRect(px, py, TILE, TILE);
            }
          }
        }
      }
    }
    // 土路：按邻居自动选边角，拐弯处不再是硬直角
    const PATH = 'S';
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const row = str[gy] || '';
        if (!PATH.includes(row[gx] || '')) continue;
        const key = 'tile-path-' + autoKey(neighOf(str, gx, gy, PATH));
        const img = GROUND_IMG[key];
        if (img) ctx.drawImage(img, ox + gx * TILE, (this.oy || 0) + gy * TILE, TILE, TILE);
        // 路面杂物（M5.6）：车辙 + 碎石子，别让路是一块块纯色砖
        {
          const ph = Math.abs(((gx * 2654435761) ^ (gy * 40503)) % 1000);
          const px2 = ox + gx * TILE, py2 = (this.oy || 0) + gy * TILE;
          const nb = neighOf(str, gx, gy, PATH);
          const horiz = nb.e && nb.w;
          const vert = nb.n && nb.s;
          const rw = Math.max(2, Math.round(TILE * 0.055));
          ctx.fillStyle = 'rgba(118, 94, 68, .18)';
          if (vert) {
            // 纵向路段：两道竖车辙，贯通整格
            ctx.fillRect(px2 + Math.round(TILE * 0.26), py2, rw, TILE);
            ctx.fillRect(px2 + Math.round(TILE * 0.66), py2, rw, TILE);
          } else if (horiz) {
            // 横向路段：改成两道横车辙，跟路平行
            ctx.fillRect(px2, py2 + Math.round(TILE * 0.26), TILE, rw);
            ctx.fillRect(px2, py2 + Math.round(TILE * 0.66), TILE, rw);
          }
          // 石子按「世界坐标」撒，跨格连续 —— 按格子撒会在边界突变，看着还是网格
          const cell = 12;
          for (let oy2 = 0; oy2 < TILE; oy2 += cell) {
            for (let ox2 = 0; ox2 < TILE; ox2 += cell) {
              const wx = gx * TILE + ox2, wy = gy * TILE + oy2;
              const hh2 = Math.abs(((Math.floor(wx / cell) * 73856093) ^ (Math.floor(wy / cell) * 19349663)) % 1000);
              if (hh2 % 100 >= 55) continue;
              const jx2 = hh2 % 7, jy2 = (hh2 >> 3) % 7;
              const sz = 2 + (hh2 % 2);
              ctx.fillStyle = (hh2 % 3 === 0) ? 'rgba(92, 74, 54, .30)' : 'rgba(158, 146, 128, .38)';
              ctx.fillRect(px2 + ox2 + jx2, py2 + oy2 + jy2, sz, sz);
            }
          }
        }
        // 冬天路上积一层雪（保留路形，只压上冷白色）
        if (((typeof seasonKey === 'function') ? seasonKey() : 'spring') === 'winter') {
          ctx.fillStyle = 'rgba(222, 234, 238, .42)';
          ctx.fillRect(ox + gx * TILE, (this.oy || 0) + gy * TILE, TILE, TILE);
        }
      }
    }

    // 海面：3 帧波纹。先整片铺水，再单独铺岸边浪花，免得被邻居水格盖掉
    const WATER = 'W';
    const wf = (Math.floor(performance.now() / 420) % 3) + 1;
    const wimg = GROUND_IMG['water-' + wf];
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const row = str[gy] || '';
        if (row[gx] !== 'W' && row[gx] !== 'O') continue;
        const px = ox + gx * TILE, py = (this.oy || 0) + gy * TILE;
        if (wimg) ctx.drawImage(wimg, px, py, TILE, TILE);
        else {
          ctx.fillStyle = '#1c4652';
          ctx.fillRect(px, py, TILE, TILE);
        }
        // 反光条（M5.3）：两道横向亮光缓慢上浮，海面才不是死水
        {
          const ph = performance.now() / 1000;
          for (let i = 0; i < 2; i++) {
            const yy = (ph * 5 + i * 15 + gx * 7 + gy * 3) % TILE;
            ctx.fillStyle = i === 0 ? 'rgba(214, 240, 248, .13)' : 'rgba(198, 230, 240, .09)';
            ctx.fillRect(px, py + Math.floor(yy), TILE, 1);
          }
        }
        // 雨点涟漪（M5.3）：雨天才砸圈
        {
          const wet = (typeof S !== 'undefined' && (S.weather === 'rain' || S.weather === 'storm'));
          if (wet) {
            const storm = S.weather === 'storm';
            const t = performance.now() / 1000;
            const n = storm ? 2 : 1;
            for (let i = 0; i < n; i++) {
              const seed = (gx * 37 + gy * 71 + i * 53) % 97;
              const speed = storm ? 1.15 : 0.75;
              const phase = (t * speed + seed / 97) % 1;
              const cx = px + 5 + (seed % 22);
              const cy = py + 5 + ((seed * 7) % 22);
              const r = 2 + phase * (storm ? 11 : 8);
              const alpha = (1 - phase) * (storm ? 0.40 : 0.30);
              if (alpha < 0.02) continue;
              ctx.strokeStyle = `rgba(214, 242, 250, ${alpha.toFixed(3)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }
    }
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const row = str[gy] || '';
        if (row[gx] !== 'W' && row[gx] !== 'O') continue;
        const px = ox + gx * TILE, py = (this.oy || 0) + gy * TILE;
        const nb = neighOf(str, gx, gy, 'WO');
        ['n', 'e', 's', 'w'].forEach(side => {
          if (nb[side]) return;
          const img = GROUND_IMG['shore-' + side];
          if (img) ctx.drawImage(img, px, py, TILE, TILE);
        });
      }
    }

    // 雨天积水（M5.3）：路面上撒水洼，位置按格哈希固定，不会闪
    const wetWx = (typeof S !== 'undefined' && S.weather) || 'sunny';
    if (wetWx === 'rain' || wetWx === 'storm') {
      const PATH2 = 'S';
      for (let gy = 0; gy < MAP_H; gy++) {
        const row = str[gy] || '';
        for (let gx = 0; gx < MAP_W; gx++) {
          if (!PATH2.includes(row[gx] || '')) continue;
          const h = Math.abs(((gx * 2654435761) ^ (gy * 40503)) % 1000);
          if (h % 100 >= 28) continue;                 // 约三成路面有水
          const px = ox + gx * TILE + (h % 9) + 6;
          const py = (this.oy || 0) + gy * TILE + ((h >> 3) % 11) + 8;
          ctx.fillStyle = 'rgba(150, 196, 214, .38)';
          ctx.beginPath();
          ctx.ellipse(px, py, 9 + (h % 4), 4 + ((h >> 4) % 3), 0, 0, Math.PI * 2);
          ctx.fill();
          // 反光点
          ctx.fillStyle = 'rgba(226, 244, 250, .45)';
          ctx.fillRect(px - 3, py - 2, 4, 1);
        }
      }
    }

    // 冬季：海面压一层冰色（不换瓦片，省一套素材）
    const seaSeason = (typeof seasonKey === 'function') ? seasonKey() : 'spring';
    if (seaSeason === 'winter') {
      ctx.fillStyle = 'rgba(212, 236, 244, .58)';
      for (let gy = 0; gy < MAP_H; gy++) {
        const row = str[gy] || '';
        for (let gx = 0; gx < MAP_W; gx++) {
          if (row[gx] !== 'W' && row[gx] !== 'O') continue;
          ctx.fillRect(ox + gx * TILE, (this.oy || 0) + gy * TILE, TILE, TILE);
        }
      }
    }

    // 草地散点：花丛 / 矮树 / 石子，按格子哈希稀疏撒（约 9%）
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const row = str[gy] || '';
        if (row[gx] !== 'G' || isMine) continue;
        const h = Math.abs(((gx * 2654435761) ^ (gy * 40503)) % 1000);
        if (h % 100 >= 18) continue;
        // 散点按季节选池：草丛 / 碎石 / 木桩是程序化画的，花和灌木用素材
        const sKey = (typeof seasonKey === 'function') ? seasonKey() : 'spring';
        const pool = sKey === 'winter'
          ? ['tuft', 'pebble', 'rock', 'pebble', 'tuft']
          : sKey === 'autumn'
            ? ['tuft', 'bush', 'pebble', 'flowers', 'stump']
            : ['tuft', 'flowers', 'tuft', 'bush', 'pebble', 'stump'];
        const kind = pool[h % pool.length];
        const px2 = ox + gx * TILE;
        const py2 = (this.oy || 0) + gy * TILE;

        if (kind === 'tuft') {
          const baseX = px2 + 6 + (h % Math.max(1, Math.floor(TILE * 0.45)));
          const baseY = py2 + Math.round(TILE * 0.72);
          ctx.strokeStyle = sKey === 'winter' ? 'rgba(150, 176, 168, .60)' : 'rgba(96, 158, 96, .85)';
          ctx.lineWidth = Math.max(1, Math.round(TILE * 0.035));
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const bx = baseX + i * Math.round(TILE * 0.10);
            const bh = Math.round(TILE * (0.14 + ((h >> i) % 5) * 0.03));
            ctx.moveTo(bx, baseY);
            ctx.lineTo(bx + (i % 2 ? 2 : -2), baseY - bh);
          }
          ctx.stroke();
          continue;
        }
        if (kind === 'pebble') {
          for (let i = 0; i < 3; i++) {
            const sx = px2 + 8 + ((h * (i + 3) * 7) % Math.floor(TILE * 0.62));
            const sy = py2 + 12 + ((h * (i + 5) * 11) % Math.floor(TILE * 0.45));
            const sz = 2 + (i % 2);
            ctx.fillStyle = i % 2 ? 'rgba(126, 132, 128, .72)' : 'rgba(168, 172, 166, .68)';
            ctx.fillRect(sx, sy, sz, sz);
          }
          continue;
        }
        if (kind === 'stump') {
          const sx = px2 + Math.floor(TILE * 0.34);
          const sy = py2 + Math.floor(TILE * 0.46);
          const sw = Math.round(TILE * 0.30);
          const sh = Math.round(TILE * 0.22);
          ctx.fillStyle = 'rgba(10, 24, 20, .22)';
          ctx.beginPath();
          ctx.ellipse(sx + sw / 2, sy + sh, sw * 0.62, sh * 0.36, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#5a3f26';
          ctx.fillRect(sx, sy, sw, sh);
          ctx.fillStyle = '#8a6238';
          ctx.beginPath();
          ctx.ellipse(sx + sw / 2, sy, sw / 2, sh * 0.40, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(90, 63, 38, .55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(sx + sw / 2, sy, sw * 0.24, sh * 0.18, 0, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }

        const img = kind === 'rock' ? GROUND_IMG['r-rock'] : PROP_IMG[kind];
        if (!img) continue;
        const jx = (h % 7) - 3;
        const jy = ((h >> 3) % 7) - 3;
        ctx.drawImage(img, px2 + jx, py2 + jy, TILE, TILE);
      }
    }
  },

  // ---------- M5.3 镇民走动 ----------
  initNpcMotion() {
    if (this._npcInit) return;
    this._npcInit = true;
    const npcs = (typeof TOWNSFOLK !== 'undefined') ? TOWNSFOLK : [];
    npcs.forEach(n => {
      n.px = n.x; n.py = n.y;
      n.tx = n.x; n.ty = n.y;
      n.waitT = (n.x * 1.3 + n.y * 0.7) % 4;
      n.face = 'down-0';
    });
  },

  npcTick(dt) {
    if (this.mapName !== 'town') return;
    const npcs = (typeof TOWNSFOLK !== 'undefined') ? TOWNSFOLK : [];
    const hot = (MAPS.town || {}).hot || {};
    npcs.forEach(n => {
      const moving = n.tx !== n.x || n.ty !== n.y;
      if (moving) {
        const k = Math.min(1, dt * 5);
        n.px += (n.tx - n.px) * k;
        n.py += (n.ty - n.py) * k;
        n.face = n.tx > n.x ? 'right-0' : n.tx < n.x ? 'left-0'
          : n.ty > n.y ? 'down-0' : 'up-0';
        if (Math.abs(n.px - n.tx) < 0.03 && Math.abs(n.py - n.ty) < 0.03) {
          n.px = n.tx; n.py = n.ty;
          n.x = n.tx; n.y = n.ty;
        }
        return;
      }
      n.waitT += dt;
      if (n.waitT < 4) return;
      n.waitT = 0;
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const order = dirs.sort(() => Math.random() - 0.5);
      for (const [dx, dy] of order) {
        const nx = n.x + dx, ny = n.y + dy;
        if (!this.walkable(nx, ny)) continue;
        const ch = this.tileAt(nx, ny);
        if (hot[ch]) continue;                       // 别占热区
        if (nx === this.cx && ny === this.cy) continue;  // 别踩玩家
        if (npcs.some(o => o !== n && o.x === nx && o.y === ny)) continue;
        n.tx = nx; n.ty = ny;
        break;
      }
    });
  },

  // ---------- 画一棵树（地图内、边界林都用它） ----------
  drawTreeAt(x, y, gx, gy) {
    const ctx = this.ctx;
    const skey = (typeof seasonKey === 'function') ? seasonKey() : 'spring';
    const hsel = Math.abs(((gx * 2654435761) ^ (gy * 40503)) % 1000);
    // 树种比例：橡树 50% / 白桦 20% / 灌木 20% / 老树 10%
    const r10 = hsel % 10;
    const kind = r10 < 5 ? 'oak' : r10 < 7 ? 'birch' : r10 < 9 ? 'shrub' : 'elder';
    const timg = (typeof TREE_SEASON_IMG !== 'undefined' && TREE_SEASON_IMG[`${skey}-${kind}`])
      || (typeof TREE_SEASON_IMG !== 'undefined' && TREE_SEASON_IMG[skey])
      || TREE_IMG;
    if (!(timg && timg.complete && timg.naturalWidth)) {
      ctx.fillStyle = '#2f6a2f';
      ctx.fillRect(x + 6, y + 5, TILE - 12, TILE - 10);
      return;
    }
    const hsh = Math.abs(((gx * 2654435761) ^ (gy * 40503)) % 1000);
    const dw = timg.naturalWidth || 32;
    const dh = timg.naturalHeight || 48;
    const base = TILE / 32;                 // TILE=64 → 2 倍
    const k = (hsh % 13 === 0 ? 2 : 1) * base;
    const w = dw * k, h = dh * k;
    const jx = (hsh % 9) - 4;
    const jy = ((hsh >> 4) % 5) - 2;
    // 灌木矮，贴格子底部；其它树留一点根
    const lift = (kind === 'shrub') ? 2 : 10;
    ctx.drawImage(timg, Math.round(x + TILE / 2 - w / 2 + jx), Math.round(y + TILE - h + lift + jy), w, h);
  },

  // ---------- M5.3 水面倒影：岸上的树/房子往水里拖一条影子 ----------
  drawReflections(str, ox) {
    const ctx = this.ctx;
    for (let gy = 0; gy < MAP_H; gy++) {
      const row = str[gy] || '';
      for (let gx = 0; gx < MAP_W; gx++) {
        if (row[gx] !== 'W') continue;
        const upRow = str[gy - 1];
        const up = upRow ? upRow[gx] : '';
        if (up !== 'T' && up !== 'H' && up !== 'B') continue;

        const px = ox + gx * TILE;
        const py = (this.oy || 0) + gy * TILE;
        const h = Math.round(TILE * 0.85);
        const g = ctx.createLinearGradient(0, py, 0, py + h);
        g.addColorStop(0, up === 'T' ? 'rgba(28, 54, 62, .34)' : 'rgba(24, 42, 50, .34)');
        g.addColorStop(0.55, 'rgba(26, 48, 56, .16)');
        g.addColorStop(1, 'rgba(26, 48, 56, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(px, py, TILE, h);

        // 水波把倒影撕成几条
        ctx.fillStyle = 'rgba(52, 96, 110, .22)';
        for (let i = 1; i < 5; i++) {
          const yy = py + Math.round(h * i / 5);
          ctx.fillRect(px, yy, TILE, 2);
        }
      }
    }
  },

  // ---------- M5.3 后院栅栏：围着菜地的木栏，不占格（只是画在格边上） ----------
  drawYardFence(str, ox) {
    const ctx = this.ctx;
    if (this.mapName !== 'town') return;
    const isF = (gx, gy) => {
      const row = str[gy];
      return !!row && row[gx] === 'F';
    };

    // 北侧横栏：贴格子最上沿
    const hRail = (px, py) => {
      ctx.fillStyle = '#5a3c24';
      ctx.fillRect(px, py + 2, TILE, 2);
      ctx.fillRect(px, py + 8, TILE, 2);
      ctx.fillStyle = '#8a6238';
      ctx.fillRect(px, py + 2, TILE, 1);
      ctx.fillRect(px, py + 8, TILE, 1);
      // 两根立柱
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(px + 3, py, 3, 13);
      ctx.fillRect(px + TILE - 6, py, 3, 13);
    };

    // 西侧竖栏：贴格子最左沿
    const vRail = (px, py) => {
      ctx.fillStyle = '#5a3c24';
      ctx.fillRect(px + 2, py, 2, TILE);
      ctx.fillRect(px + 8, py, 2, TILE);
      ctx.fillStyle = '#8a6238';
      ctx.fillRect(px + 2, py, 1, TILE);
      ctx.fillRect(px + 8, py, 1, TILE);
    };

    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        if (!isF(gx, gy)) continue;
        const px = ox + gx * TILE;
        const py = (this.oy || 0) + gy * TILE;
        if (!isF(gx, gy - 1)) hRail(px, py - 12);
        if (!isF(gx - 1, gy)) vRail(px, py);
        // 东侧：贴着右沿画两道竖杆
        if (!isF(gx + 1, gy)) {
          ctx.fillStyle = '#5a3c24';
          ctx.fillRect(px + TILE - 4, py, 2, TILE);
          ctx.fillRect(px + TILE - 10, py, 2, TILE);
        }
      }
    }
  },

  // ---------- M5.2 物件投影：统一光从左上来，影子压右下 ----------
  // 影子参数跟着时段走：晨长偏右、午短贴脚、暮长偏左
  shadowParams() {
    const dusk = (typeof S !== 'undefined' && typeof S.dusk === 'number') ? S.dusk : 1;
    if (dusk === 0) return { rx: 0.62, ry: 0.19, dx: 0.24, rot: 0.18, a: 0.26 };
    if (dusk === 2) return { rx: 0.66, ry: 0.20, dx: -0.20, rot: -0.20, a: 0.34 };
    return { rx: 0.50, ry: 0.20, dx: 0.10, rot: 0, a: 0.30 };
  },

  drawShadows(str, ox) {
    const ctx = this.ctx;
    const BLOCKS = 'THBKDL';
    const sp = this.shadowParams();
    for (let gy = 0; gy < MAP_H; gy++) {
      const row = str[gy] || '';
      for (let gx = 0; gx < MAP_W; gx++) {
        if (!BLOCKS.includes(row[gx] || '')) continue;
        const cx = ox + gx * TILE + TILE / 2 + TILE * sp.dx;
        const cy = (this.oy || 0) + gy * TILE + TILE - 3;
        ctx.beginPath();
        ctx.fillStyle = `rgba(10, 28, 24, ${sp.a})`;
        ctx.ellipse(cx, cy, TILE * sp.rx, TILE * sp.ry, sp.rot, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  drawTile(t, x, y, gx, gy) {
    const ctx = this.ctx;
    const T = TILE;
    switch (t) {
      case 'G':
        break;   // 地面层已铺（M5.2）
      case 'J':
        // 钓竿
        ctx.strokeStyle = '#8a5c30';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 24);
        ctx.lineTo(x + 20, y + 6);
        ctx.stroke();
        ctx.fillStyle = '#d2543f';
        ctx.fillRect(x + 21, y + 4, 4, 4);
        ctx.fillStyle = '#6ab0e8';
        ctx.fillRect(x + 16, y + 24, 4, 3);
        break;
      case 'T': {
        // 树：素材橡树，按格哈希做 2x/3x 大小差 + ±4px 抖动，不再是整齐的方阵
        this.drawTreeAt(x, y, gx, gy);
        if (false) {
          const sw = 60, sh = 74;
          this.ctx.drawImage(SPRITE.tree, x + T / 2 - sw / 2, y + T - sh + 10, sw, sh);
        } else {
          ctx.fillStyle = '#2f6a2f';
          ctx.fillRect(x + 6, y + 5, 18, 7);
          ctx.fillRect(x + 4, y + 10, 22, 8);
        }
        break;
      }
      case 'N':
        // 小屋（自己的家）
        ctx.fillStyle = '#8a5c30';
        ctx.fillRect(x + 3, y + 12, T - 6, T - 14);
        ctx.fillStyle = '#a07040';
        ctx.fillRect(x + 5, y + 14, T - 10, T - 18);
        ctx.fillStyle = '#b04a3a';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 13);
        ctx.lineTo(x + T / 2, y + 2);
        ctx.lineTo(x + T - 1, y + 13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(x + T / 2 - 4, y + 18, 8, T - 20);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(x + 6, y + 16, 5, 5);
        // 招牌（家）
        ctx.fillStyle = '#3a2415';
        ctx.fillRect(x - 2, y - 6, T + 4, 6);
        ctx.fillStyle = '#c99a6a';
        ctx.fillRect(x - 1, y - 5, T + 2, 4);
        ctx.font = '5px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#3a2415';
        ctx.textAlign = 'center';
        ctx.fillText('家', x + T / 2, y - 1);
        ctx.textAlign = 'left';
        // 门口花盆
        ctx.fillStyle = '#b04a3a';
        ctx.fillRect(x + 1, y + T - 7, 7, 6);
        ctx.fillStyle = '#3f7f3f';
        ctx.fillRect(x + 2, y + T - 11, 5, 5);
        break;
      case 'Y':
        // 野果丛
        ctx.fillStyle = '#3f7f3f';
        ctx.fillRect(x + 5, y + 12, 20, 12);
        ctx.fillRect(x + 8, y + 8, 14, 8);
        ctx.fillStyle = '#c24a4a';
        ctx.fillRect(x + 9, y + 13, 3, 3);
        ctx.fillRect(x + 17, y + 15, 3, 3);
        ctx.fillRect(x + 13, y + 9, 3, 3);
        break;
      case 'E':
        // 路牌（出口）
        ctx.fillStyle = '#8a5c30';
        ctx.fillRect(x + 8, y + 8, 14, 18);
        ctx.fillStyle = '#d8c9a8';
        ctx.fillRect(x + 10, y + 10, 10, 6);
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(x + 11, y + 12, 8, 2);
        break;
      case 'M':
        this.texFill('stone', x, y, T, T);
        // 山洞洞口
        ctx.fillStyle = '#2a1a10';
        ctx.fillRect(x + 8, y + 12, 14, 16);
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 12, 7, 5, 0, Math.PI, 0);
        ctx.fill();
        break;
      case 'R': {
        // 矿石（M5.2）：素材岩块 + 矿脉亮点
        const or = BUILD_IMG['b-ore'];
        if (or) ctx.drawImage(or, x, y, T, T);
        else {
          ctx.fillStyle = '#4a4a44';
          ctx.fillRect(x + 4, y + 10, T - 8, T - 14);
        }
        break;
      }
      case 'A':
        // 鸡舍
        ctx.fillStyle = '#f0e8d8';
        ctx.fillRect(x + 4, y + 12, 22, 16);
        ctx.fillStyle = '#b04a3a';
        ctx.fillRect(x + 2, y + 6, 26, 8);
        ctx.fillStyle = '#8a3a2a';
        ctx.fillRect(x + 2, y + 6, 26, 2);
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(x + 12, y + 18, 6, 10);
        break;
      case 'Z':
        this.texFill('wood', x, y, T, T);
        // 床
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(x + 2, y + 4, T - 4, T - 8);
        ctx.fillStyle = '#f0e8d8';
        ctx.fillRect(x + 4, y + 6, T - 8, T - 14);
        ctx.fillStyle = '#c24a4a';
        ctx.fillRect(x + 5, y + 7, T - 10, 8);
        ctx.fillStyle = '#f8f4ec';
        ctx.fillRect(x + 6, y + 18, T - 12, 6);
        break;
      case 'W':
        break;   // 地面层已画水与岸边（M5.2）
      case 'O': {
        // 礁石：水里冒出来的一块，压住水面
        const rk = GROUND_IMG['r-rock'];
        if (rk) ctx.drawImage(rk, x, y, T, T);
        break;
      }
      case 'P': {
        // 码头木栈道（M5.3）：换新木地板图元，别再铺旧的 512 木纹理
        const pf = BUILD_IMG['b-floor'];
        if (pf) {
          ctx.drawImage(pf, x, y, T, T);
          // 板缝压暗，跟泥土地面拉开
          ctx.fillStyle = 'rgba(12, 8, 4, .18)';
          ctx.fillRect(x, y + T - 2, T, 2);
        } else {
          ctx.fillStyle = '#8a6238';
          ctx.fillRect(x, y, T, T);
        }
        break;
      }
      case 'S':
        break;   // 地面层已用 autotile 画（M5.2）
      case 'H': {
        if (this.mapName === 'mine') {
          // 矿洞洞壁（M5.2）：素材砖石压暗成岩体 + 朝地面的那几条边做受光/投影过渡
          const rk = BUILD_IMG['b-brick'];
          if (rk) ctx.drawImage(rk, x, y, T, T);
          else this.texFill('stone', x, y, T, T);
          ctx.fillStyle = 'rgba(12, 16, 22, .52)';
          ctx.fillRect(x, y, T, T);

          const isRock = (dx, dy) => this.tileAt(gx + dx, gy + dy) === 'H';
          // 岩壁受光边（朝洞内的那一侧）
          ctx.fillStyle = 'rgba(150, 172, 184, .22)';
          if (!isRock(0, -1)) ctx.fillRect(x, y, T, 3);
          if (!isRock(0, 1)) ctx.fillRect(x, y + T - 3, T, 3);
          if (!isRock(-1, 0)) ctx.fillRect(x, y, 3, T);
          if (!isRock(1, 0)) ctx.fillRect(x + T - 3, y, 3, T);
          // 岩壁往下压的投影
          ctx.fillStyle = 'rgba(0, 0, 0, .30)';
          if (!isRock(0, 1)) ctx.fillRect(x, y + T, T, 6);
          break;
        }
        const above = this.tileAt(gx, gy - 1);
        if (above !== 'H') {
          // 屋顶行：灰蓝板岩瓦，最上一排带屋脊（M5.2 手绘图元）
          const roofImg = BUILD_IMG['b-roof-top'] || BUILD_IMG['b-roof'];
          if (roofImg) ctx.drawImage(roofImg, x, y, T, T);
          else {
            ctx.fillStyle = '#4e6070';
            ctx.fillRect(x, y, T, T);
          }
          // 屋脊高光（最上一排才有）
          if (!isHSelf(gx, gy - 1)) {
            ctx.fillStyle = 'rgba(210, 226, 236, .28)';
            ctx.fillRect(x, y, T, 3);
          }
          // 屋顶两侧收暗（M5.7）：左边压深、右边提亮，坡面才有方向
          if (!isHSelf(gx - 1, gy)) {
            ctx.fillStyle = 'rgba(12, 20, 26, .26)';
            ctx.fillRect(x, y, Math.round(T * 0.10), T);
          }
          if (!isHSelf(gx + 1, gy)) {
            ctx.fillStyle = 'rgba(220, 236, 244, .12)';
            ctx.fillRect(x + T - Math.round(T * 0.10), y, Math.round(T * 0.10), T);
          }
          // 檐口投影：屋顶最下一排往下压一条渐变，投到墙上
          if (!isHSelf(gx, gy + 1)) {
            const eg = ctx.createLinearGradient(0, y + T - 8, 0, y + T);
            eg.addColorStop(0, 'rgba(8, 14, 18, 0)');
            eg.addColorStop(1, 'rgba(8, 14, 18, .34)');
            ctx.fillStyle = eg;
            ctx.fillRect(x, y + T - 8, T, 8);
          }
          // 檐下一道暗影，让屋顶「压」在墙上
          ctx.fillStyle = 'rgba(10, 20, 26, .22)';
          ctx.fillRect(x, y + T - 5, T, 5);
        } else {
          // 墙面行：横木板墙，隔三格开一扇窗
          const isWin = (gx % 3 === 1);
          const wallImg = BUILD_IMG[isWin ? 'b-window' : 'b-wall'];
          if (wallImg) ctx.drawImage(wallImg, x, y, T, T);
          else {
            ctx.fillStyle = '#6b4f38';
            ctx.fillRect(x, y, T, T);
          }
          // 墙角明暗（M5.7）：左边缘压暗、右边缘提亮
          if (!isHSelf(gx - 1, gy)) {
            ctx.fillStyle = 'rgba(10, 16, 20, .22)';
            ctx.fillRect(x, y, Math.round(T * 0.08), T);
          }
          if (!isHSelf(gx + 1, gy)) {
            ctx.fillStyle = 'rgba(232, 244, 248, .10)';
            ctx.fillRect(x + T - Math.round(T * 0.08), y, Math.round(T * 0.08), T);
          }
          // 墙面明暗：上亮下暗，砖墙也有厚度（M5.3）
          {
            const wg = ctx.createLinearGradient(0, y, 0, y + T);
            wg.addColorStop(0, 'rgba(255, 244, 226, .12)');
            wg.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
            wg.addColorStop(1, 'rgba(8, 12, 16, .20)');
            ctx.fillStyle = wg;
            ctx.fillRect(x, y, T, T);
          }
          // 墙脚压暗，接地
          ctx.fillStyle = 'rgba(8, 16, 20, .28)';
          ctx.fillRect(x, y + T - 4, T, 4);
        }
        break;
      }
      case 'B': {
        // 海货摊（M5.2）：木台 + 素材箱子/桶，按格哈希摆不同货
        const bw = PROP_IMG.crate, bb = PROP_IMG.barrel;
        const bh = Math.abs(((gx * 2654435761) ^ (gy * 40503)) % 97);
        // 台面：横向木板
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(x, y + T - 10, T, 10);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x, y + T - 10, T, 2);
        if (bh % 3 === 0 && bb) ctx.drawImage(bb, x, y - 2, T, T);
        else if (bw) ctx.drawImage(bw, x, y - 1, T, T);
        break;
      }
      case 'K': {
        // 粮摊：麻袋堆 + 木台
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(x, y + T - 10, T, 10);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x, y + T - 10, T, 2);
        const hb = PROP_IMG.hay;
        const kh = Math.abs(((gx * 73856093) ^ (gy * 19349663)) % 89);
        if (hb) ctx.drawImage(hb, x, y - 1, T, T);
        ctx.fillStyle = kh % 2 ? '#c25a3a' : '#b04a3a';
        ctx.fillRect(x + 6, y + T - 14, T - 12, 3);
        break;
      }
      case 'L':
        this.texFill('stone', x, y, T, T);
        ctx.fillStyle = 'rgba(18, 18, 26, 0.55)';
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(x + 6, y + 18, T - 12, 3);
        break;
      case 'D':
        if (!this.texFill('wall', x, y, T, T)) {
          ctx.fillStyle = '#5a3a20';
          ctx.fillRect(x, y, T, T);
        }
        // 门头瓦（M5.3）：跟主屋统一的灰蓝板岩，不再是红瓦
        const doorRoof = BUILD_IMG['b-roof'];
        if (doorRoof) ctx.drawImage(doorRoof, 0, 0, 16, 5, x, y, T, 10);
        else {
          ctx.fillStyle = '#4e6070';
          ctx.fillRect(x, y, T, 10);
        }
        ctx.fillStyle = 'rgba(10, 18, 24, .28)';
        ctx.fillRect(x, y + 8, T, 2);
        // 门
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(x + 3, y + 10, T - 6, T - 10);
        ctx.fillStyle = '#8a5c30';
        ctx.fillRect(x + 5, y + 13, T - 10, T - 14);
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(x + T / 2 - 1, y + 13, 2, T - 14);
        // 门楣招牌
        ctx.fillStyle = '#c99a6a';
        ctx.fillRect(x + 4, y + 10, T - 8, 3);
        // 灯笼
        ctx.fillStyle = '#d2543f';
        ctx.fillRect(x + T - 6, y + 2, 6, 6);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(x + T - 5, y + 3, 4, 4);
        // 招牌（M5.3）：冷调木牌 + 吊绳 + 高光边
        // 吊绳
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 3, y - 12);
        ctx.lineTo(x + 1, y - 9);
        ctx.moveTo(x + T - 3, y - 12);
        ctx.lineTo(x + T - 1, y - 9);
        ctx.stroke();
        // 牌底 + 牌面（M5.3 加高放字）
        ctx.fillStyle = '#241a10';
        ctx.fillRect(x - 16, y - 17, T + 32, 16);
        ctx.fillStyle = '#8a6238';
        ctx.fillRect(x - 15, y - 16, T + 30, 14);
        ctx.fillStyle = '#a8814f';
        ctx.fillRect(x - 15, y - 16, T + 30, 2);
        ctx.fillStyle = 'rgba(20, 14, 8, .35)';
        ctx.fillRect(x - 15, y - 5, T + 30, 3);
        // 字（8px，加一圈浅色描边让它从木纹里跳出来）
        ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#241a10';
        ctx.fillText('鹿铃亭', x + T / 2, y - 5);
        ctx.textAlign = 'left';
        // 台阶
        ctx.fillStyle = '#9a9a90';
        ctx.fillRect(x - 2, y + T - 3, T + 4, 3);
        break;
      case 'F': {
        // 后院菜地（M5.3）：土用新图元、作物用四阶段素材图
        const pi = (gy - 8) * 5 + (gx - 17);
        let st = 'wild', cropId = null, daysLeft = 0, watered = false;
        if (typeof S !== 'undefined' && S.yard && S.yard.plots && S.yard.plots[pi]) {
          const p = S.yard.plots[pi];
          st = p.state;
          cropId = p.cropId;
          daysLeft = p.daysLeft;
          watered = p.watered;
        }

        if (st === 'wild') {
          const g = GROUND_IMG[this.grassKey(gx, gy)];
          if (g) ctx.drawImage(g, x, y, T, T);
          else {
            ctx.fillStyle = '#3f6455';
            ctx.fillRect(x, y, T, T);
          }
          break;
        }

        // 翻过的土：湿土用另一张
        const sk = GROUND_IMG[watered ? 'tile-soil-wet-c' : 'tile-soil-c'];
        if (sk) ctx.drawImage(sk, x, y, T, T);
        else {
          ctx.fillStyle = '#6b4a2e';
          ctx.fillRect(x, y, T, T);
        }
        // 畦沟
        ctx.fillStyle = 'rgba(0, 0, 0, .16)';
        ctx.fillRect(x + 2, y + T - 4, T - 4, 2);

        if (cropId && typeof CROPS !== 'undefined' && CROPS[cropId]) {
          const c = CROPS[cropId];
          let stage = 1;
          if (st === 'ready') stage = 4;
          else if (st === 'growing') {
            const ratio = 1 - (daysLeft / Math.max(1, c.days));
            stage = ratio < 0.34 ? 1 : ratio < 0.7 ? 2 : 3;
          }
          const sheet = CROP_SHEET[cropArt(cropId)];
          if (sheet && sheet.complete && sheet.naturalWidth) {
            const fw = sheet.naturalWidth / 4;
            const fh = sheet.naturalHeight;
            ctx.drawImage(sheet, (stage - 1) * fw, 0, fw, fh, x, y, T, T);
          }
        }
        break;
      }
    }
  },

  drawHotGlow(x, y) {
    const ctx = this.ctx;
    const T = TILE;
    ctx.strokeStyle = 'rgba(255, 220, 120, .85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
    ctx.fillStyle = 'rgba(255, 220, 120, .25)';
    ctx.fillRect(x, y, T, T);
  },

  // ---------- 镇民模型（M7）：和主角同一套分层像素画法，颜色/发型按人区分 ----------
  drawTownsperson(n, x, y) {
    const ctx = this.ctx;
    // M5.2：镇民也用同一套精灵（tools/build_char.py 按 id 生成）
    // 待机时左右张望：每 3 秒换一次朝向，画面就不死板
    // 走动时用行进方向的脸，站定才左右张望
    const walkingNpc = (n.tx !== n.x || n.ty !== n.y);
    const look = Math.floor(performance.now() / 3000 + (n.x || 0) * 7 + (n.y || 0) * 3) % 3;
    const lookKey = walkingNpc ? (n.face || 'down-0') : ['down-0', 'left-0', 'right-0'][look];
    const img = CHAR_IMG[(n.id || 'mira') + '-' + lookKey];
    if (img && img.complete && img.naturalWidth) {
      {
        const sp = this.shadowParams();
        ctx.fillStyle = `rgba(10, 26, 24, ${sp.a})`;
        ctx.beginPath();
        ctx.ellipse(x + TILE * sp.dx * 0.5, y + 16, 10 * sp.rx * 1.1, 4, sp.rot, 0, Math.PI * 2);
        ctx.fill();
      }
      {
        const pw = TILE, ph = Math.round(TILE * 1.5);
        ctx.drawImage(img, Math.round(x - pw / 2), Math.round(y + TILE / 2 - ph), pw, ph);
      }
      ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(240, 226, 200, .60)';
      ctx.textAlign = 'center';
      ctx.fillText(n.name, x, y + TILE * 0.62);
      // 支线标记（M8.3）：没交过 !，带齐东西了 ?
      if (typeof NPC_QUESTS !== 'undefined' && this.mapName === 'town' && NPC_QUESTS[n.id]) {
        const q = NPC_QUESTS[n.id];
        const st = (S && S.quests && S.quests[n.id]) || { stage: 0 };
        if (st.stage === 0) {
          const ready = q.need.every(k => ((S.stock && S.stock[k.id]) || 0) >= k.n);
          ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillStyle = ready ? '#ffd27a' : '#e8d9be';
          ctx.fillText(ready ? '?' : '!', x, y - TILE * 0.72);
        }
      }
      ctx.textAlign = 'left';
      return;
    }
    const P = (gx, gy, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + gx * 2, y + gy * 2, w * 2, h * 2);
    };
    // 影子
    ctx.fillStyle = 'rgba(0, 0, 0, .22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 15, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 腿 + 鞋
    P(-3, 8, 3, 4, '#4a3a2a');
    P(1, 8, 3, 4, '#4a3a2a');
    P(-4, 12, 4, 2, '#2a1a10');
    P(0, 12, 4, 2, '#2a1a10');
    // 身体
    P(-5, 1, 10, 7, n.color);
    P(-4, 2, 8, 5, n.color2 || n.color);
    // 手臂
    P(-6, 2, 1, 3, n.color);
    P(5, 2, 1, 3, n.color);
    P(-6, 5, 1, 1, '#f0c8a0');
    P(5, 5, 1, 1, '#f0c8a0');
    // 头
    P(-6, -9, 12, 10, '#f0c8a0');
    // 头发
    P(-6, -11, 12, 3, n.hair || '#4a3a2a');
    P(-7, -8, 2, 5, n.hair || '#4a3a2a');
    P(5, -8, 2, 5, n.hair || '#4a3a2a');
    P(-6, -10, 4, 1, n.hairHi || '#7a5a3a');
    // 眼睛
    P(-4, -6, 2, 3, '#f8f8f8');
    P(2, -6, 2, 3, '#f8f8f8');
    P(-4, -5, 2, 2, '#1a1a2a');
    P(2, -5, 2, 2, '#1a1a2a');
    // 嘴
    P(0, -2, 1, 1, '#c08060');
    // 名字
    ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#f0e2c8';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, x, y + 27);
    ctx.textAlign = 'left';
  },

  drawPlayer() {
    const ctx = this.ctx;
    const x = this.ox + this.px;
    const y = (this.oy || 0) + this.py;
    const dir = this.dir;
    const walking = this.path.length > 0;
    const frame = walking ? (Math.floor(this.walkT * 6) % 2) : 0;

    // M5.2：优先用真精灵（16×24，2 倍显示），程序化色块只当兜底
    const key = (dir === 'right' ? 'side' : dir) + '-' + frame;
    const img = CHAR_IMG['chie-' + key];
    if (img && img.complete && img.naturalWidth) {
      {
        const sp = this.shadowParams();
        ctx.fillStyle = `rgba(10, 26, 24, ${sp.a})`;
        ctx.beginPath();
        ctx.ellipse(x + TILE * sp.dx * 0.5, y + 15, 11 * sp.rx * 1.1, 4, sp.rot, 0, Math.PI * 2);
        ctx.fill();
      }
      {
        const pw = TILE, ph = Math.round(TILE * 1.5);
        ctx.drawImage(img, Math.round(x - pw / 2), Math.round(y + TILE / 2 - ph), pw, ph);
      }
      return;
    }

    // 影子
    ctx.fillStyle = 'rgba(0, 0, 0, .25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 15, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const P = (gx, gy, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + gx * 2, y + gy * 2, w * 2, h * 2);
    };
    const legOff = walking ? (frame ? 1 : -1) : 0;
    const armOff = walking ? (frame ? 1 : -1) : 0;
    const tailSwing = walking ? (frame ? 1 : -1) : 0;

    // 尾巴（朝上走看不见；朝右走时藏在身后）
    if (dir !== 'up' && dir !== 'right') {
      P(6, 3 + tailSwing, 1, 5, '#6b4a2a');
      P(7, 7 + tailSwing, 1, 4, '#6b4a2a');
      P(7, 10 + tailSwing, 1, 1, '#8a6a4a');
    }

    // 腿（走路交替）
    P(-4 + legOff, 8, 3, 4, '#3a4a6a');
    P(1 - legOff, 8, 3, 4, '#3a4a6a');
    // 鞋
    P(-5 + legOff, 12, 4, 2, '#4a2e1a');
    P(0 - legOff, 12, 4, 2, '#4a2e1a');
    // 身体（衬衫三层：暗边、亮面、衣摆）
    P(-5, 1, 10, 7, '#4a7ab0');
    P(-4, 2, 8, 5, '#5a8ac0');
    P(-5, 6, 10, 2, '#3a6a9a');
    // 领口
    P(-2, 1, 4, 1, '#f0e8d8');
    // 手臂（摆动）
    P(-6, 2 + armOff, 1, 3, '#4a7ab0');
    P(5, 2 - armOff, 1, 3, '#4a7ab0');
    P(-6, 5 + armOff, 1, 1, '#f0c8a0');
    P(5, 5 - armOff, 1, 1, '#f0c8a0');
    // 头（大头 Q 版）
    P(-6, -9, 12, 10, '#f0c8a0');
    // 猫耳（雪村千绘莉是猫，得有耳朵）
    P(-6, -13, 3, 3, '#6b4a2a');
    P(-5, -14, 2, 1, '#6b4a2a');
    P(3, -13, 3, 3, '#6b4a2a');
    P(2, -14, 2, 1, '#6b4a2a');
    P(-5, -12, 1, 1, '#e8a0a0');     // 耳内粉
    P(4, -12, 1, 1, '#e8a0a0');
    // 头发：后脑 + 刘海 + 鬓角 + 高光
    P(-6, -11, 12, 3, '#6b4a2a');
    P(-7, -8, 2, 5, '#6b4a2a');
    P(5, -8, 2, 5, '#6b4a2a');
    P(-6, -10, 4, 1, '#8a6a4a');
    P(2, -10, 3, 1, '#7a5a3a');
    if (dir === 'down') P(-2, -9, 4, 1, '#6b4a2a');
    // 眼睛（朝上不画）
    if (dir !== 'up') {
      P(-4, -6, 2, 3, '#f8f8f8');
      P(2, -6, 2, 3, '#f8f8f8');
      P(-4, -5, 2, 2, '#1a1a2a');
      P(2, -5, 2, 2, '#1a1a2a');
      P(-4, -6, 1, 1, '#ffffff');
      P(2, -6, 1, 1, '#ffffff');
      // 腮红
      P(-5, -3, 1, 1, '#e8a0a0');
      P(4, -3, 1, 1, '#e8a0a0');
    }
    // 嘴
    if (dir === 'down') P(0, -2, 1, 1, '#c08060');
  }
};

// 点击地图：换算格子
function mapCanvasClick(e) {
  const cv = MapScene.cv;
  if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const sx = (e.clientX - rect.left) / rect.width;   // 0~1
  const sy = (e.clientY - rect.top) / rect.height;
  const px = sx * MapScene.cw, py = sy * MapScene.ch;
  const gx = Math.floor((px - MapScene.ox) / TILE);
  const gy = Math.floor((py - (MapScene.oy || 0)) / TILE);
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return;
  MapScene.moveTo(gx, gy);
}

// 键盘走动：按住方向键连续走（keydown/keyup 维护按住状态，update 里驱动）
const MAP_KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right'
};
const MAP_KEYS_MV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function mapKeyDown(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dir = MAP_KEYS[k];
  if (!dir) return;
  e.preventDefault();
  MapScene.held[dir] = true;
  // 立即走第一格，按住时由 update 接着连续走
  if (MapScene.running && MapScene.path.length === 0 && (typeof S === 'undefined' || S.phase === 'day')) {
    const mv = MAP_KEYS_MV[dir];
    MapScene.step(mv[0], mv[1]);
  }
}

function mapKeyUp(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dir = MAP_KEYS[k];
  if (!dir) return;
  MapScene.held[dir] = false;
}

function mapClearHeld() {
  MapScene.held = { up: false, down: false, left: false, right: false };
}
