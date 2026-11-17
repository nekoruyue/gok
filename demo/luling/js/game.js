// ============================================================
// 《戈克世界·鹿铃亭》M2.1 主状态机
// 白天：选线屏 → 货摊 → 三回合砍价（两条线/天）
// 夜里：双锅并行 + 同时两位客人 → 打烊结算
// ============================================================

const $ = (sel) => document.querySelector(sel);

// 季节：每 7 天一季，四季 = 28 天一周目（必须放在 boot 之前，boot 会立刻 render）
const SEASON_NAMES = ['春', '夏', '秋', '冬'];
const DUSK_NAMES = ['晨', '午', '暮'];
function duskName() { return DUSK_NAMES[Math.max(0, Math.min(2, S.dusk || 0))]; }
const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_MULT = { spring: 1, summer: 1.05, autumn: 0.9, winter: 1.2 };
function seasonOf(day) { return Math.floor((day - 1) / 7) % 4; }
function seasonKey() { return SEASON_KEYS[seasonOf(S.day)]; }
function seasonName() { return SEASON_NAMES[seasonOf(S.day)]; }

// 天气（M5）：晴 / 雨 / 暴风，影响每晚来的客人数量与作物浇水
const WEATHER_NAMES = { sunny: '晴', rain: '雨', storm: '暴风' };
const WEATHER_GUESTS = { sunny: 3, rain: 2, storm: 1 };
function weatherName() { return WEATHER_NAMES[S.weather] || '晴'; }
function rollWeather() {
  const r = Math.random();
  S.weather = r < 0.6 ? 'sunny' : r < 0.9 ? 'rain' : 'storm';
}

// 节日（M5）：每季最后一天（day % 7 === 0）的晚上
function festivalForDay(day) {
  if (day % 7 !== 0) return null;
  return FESTIVALS[(seasonOf(day)) % FESTIVALS.length];
}

// 做菜：锅数随灶眼升级（M8.1）
function makePot(id) {
  return { id, stage: 'empty', recipeId: null, prepProgress: 0, cookProgress: 0, raf: null, result: null };
}
const Cook = {
  pots: [makePot(0), makePot(1)],
  modalPot: null   // 选菜模态当前给哪口锅
};

// M8.1 店铺家什：座位 / 灶眼 / 门面 / 口碑
function shopSeats() { return Math.max(2, Math.min(4, (S.shop && S.shop.seats) || 2)); }
function shopPots() { return Math.max(2, Math.min(3, (S.shop && S.shop.pots) || 2)); }
function decorBonus() {
  const lv = Math.max(0, Math.min(3, (S.shop && S.shop.decor) || 0));
  return (typeof DECOR_BONUS !== 'undefined' ? DECOR_BONUS[lv] : 0);
}
function hasWell() { return !!((S.shop && S.shop.yard) >= 1); }
function addFame(n) { S.fame = Math.max(0, Math.min(40, (S.fame || 0) + n)); }
function guestCount() {
  let n = 3 + Math.floor((S.fame || 0) / 10);
  if (S.weather === 'rain') n -= 1;
  else if (S.weather === 'storm') n -= 2;
  if (S.day % 7 === 0) n += 1;
  return Math.max(1, Math.min(6, n));
}
function guestPatience(g) {
  const sec = Math.max(0, (Date.now() - (g.seatedAt || Date.now())) / 1000);
  return { sec: Math.round(sec), ratio: Math.max(0, Math.min(1, 1 - sec / 90)) };
}
// ---------- 今日菜单与点单（M8.2） ----------
function menuList() {
  const saved = Array.isArray(S.menu) ? S.menu : [];
  return saved.filter(id => RECIPES[id]).slice(0, (S.shop && S.shop.menu) || 8);
}
function chooseOrder(cid) {
  const c = CUSTOMERS[cid];
  const menu = menuList();
  if (!menu.length) return { want: c.want, grumpy: false };
  const taste = (typeof CUSTOMER_TASTE !== 'undefined' && CUSTOMER_TASTE[c.id]) || '随便';
  const pool = taste === '随便' ? menu : menu.filter(id => RECIPE_TASTE[id] === taste);
  if (pool.length) return { want: pool[(S.day + cid) % pool.length], grumpy: false };
  // 菜单里没有合口味的：点最便宜的，并且不高兴
  const cheapest = menu.slice().sort((a, b) => RECIPES[a].price - RECIPES[b].price)[0];
  return { want: cheapest, grumpy: true };
}
function seatGuest(cid) {
  const o = chooseOrder(cid);
  return { cid, seatedAt: Date.now(), stage: 'waiting', bill: null, want: o.want, grumpy: o.grumpy };
}

function ensurePots(n) {
  n = Math.max(2, Math.min(3, n));
  while (Cook.pots.length < n) Cook.pots.push(makePot(Cook.pots.length));
  while (Cook.pots.length > n) {
    const p = Cook.pots.pop();
    if (p && p.raf) cancelAnimationFrame(p.raf);
  }
}

function resetPots() {
  ensurePots(shopPots());
  Cook.pots.forEach(pot => {
    if (pot.raf) cancelAnimationFrame(pot.raf);
    pot.stage = 'empty';
    pot.recipeId = null;
    pot.prepProgress = 0;
    pot.cookProgress = 0;
    pot.raf = null;
    pot.result = null;
  });
}

// 让地图/店内画布按 CW:CH 比例、整数倍缩放居中（像素不糊）
function fitCanvas() {
  const wrap = document.getElementById('scene');
  if (!wrap) return;
  const availW = wrap.clientWidth, availH = wrap.clientHeight;

  // 地图（M5.3）：画布逻辑尺寸跟着视口走，只选整数倍缩放 —— 手机横屏不再留大片黑边
  const pickScale = (w, h) => {
    let s = Math.min(Math.floor(availW / w), Math.floor(availH / h));
    if (s < 1) s = Math.min(availW / w, availH / h);
    return s;
  };
  const ms = pickScale(CW, CH);
  const lw = Math.ceil(availW / ms);
  const lh = Math.ceil(availH / ms);
  if (typeof MapScene !== 'undefined' && MapScene.resize) MapScene.resize(lw, lh);
  const m = document.getElementById('map');
  if (m) {
    m.style.width = Math.floor(lw * ms) + 'px';
    m.style.height = Math.floor(lh * ms) + 'px';
  }

  // 店内：房间大小固定，居中显示
  if (typeof SHOP_CW !== 'undefined') {
    const ss = pickScale(SHOP_CW, SHOP_CH);
    const sp = document.getElementById('shop');
    if (sp) {
      sp.style.width = Math.floor(SHOP_CW * ss) + 'px';
      sp.style.height = Math.floor(SHOP_CH * ss) + 'px';
    }
  }
}

// ---------- 启动 ----------
(function boot() {
  if (!load()) S = freshState();
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  render();

  // 浮层三件的轻量同步：收菜 / 卖货 / 浇水后库存和菜地会变，签名没变就不重建 DOM
  let hudSig = '';
  setInterval(() => {
    if (S.phase !== 'day' && S.phase !== 'night') return;
    const plots = (S.yard && S.yard.plots) || [];
    const sig = [
      S.phase, S.day, S.weather, S.money, S.debts,
      (S.yard && S.yard.vein) || '',
      (S.challenge && S.challenge.name) || '',
      plots.filter(p => p.state === 'growing').length,
      plots.filter(p => p.state === 'ready').length,
      plots.filter(p => p.state === 'growing' && !p.watered).length,
      JSON.stringify(S.stock || {})
    ].join('|');
    if (sig === hudSig) return;
    hudSig = sig;
    renderHudPieces();
  }, 700);
})();

// ---------- 工具 ----------
function runById(id) { return RUNS.find(r => r.id === id); }

function goodPrice(run, gid) {
  const g = GOODS[gid];
  let base = run.discount ? Math.floor(g.base * run.discount) : g.base;
  // 市集随季节涨跌：冬天帝国粮贩抬价，秋天收成便宜
  if (run.id === 'market') base = Math.max(1, Math.round(base * SEASON_MULT[seasonKey()]));
  return base;
}

// ---------- 渲染入口 ----------
function render() {
  updateHud();
  renderHudPieces();
  const isDay = S.phase === 'day';
  const isNight = S.phase === 'night';
  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.classList.toggle('hidden', !isDay);
  const shopEl = document.getElementById('shop');
  if (shopEl) shopEl.classList.toggle('hidden', !isNight);
  const domEl = document.getElementById('scene-dom');
  if (domEl) domEl.style.display = (isDay || isNight) ? 'none' : 'block';
  if (isNight) ShopScene.start(); else ShopScene.stop();
  if (S.phase === 'title') renderTitle();
  else if (S.phase === 'day') renderDay();
  else if (S.phase === 'night') renderNight();
  else if (S.phase === 'settle') renderSettle();
  else if (S.phase === 'ending') renderEnding();
  // 音乐：白天/夜里/节日各一段；标题与结算静音（M8.4）
  if (typeof Sfx !== 'undefined' && Sfx.startMusic) {
    if (S.phase === 'day') Sfx.startMusic(S.day % 7 === 0 ? 'festival' : 'day');
    else if (S.phase === 'night') Sfx.startMusic(S.day % 7 === 0 ? 'festival' : 'night');
    else Sfx.stopMusic();
  }
}

// ---------- HUD（M5.1 星露谷式：金币 / 日期 / 体力 + 日子卡 + 快捷栏 + 功能键） ----------
const GOOD_ICON = {
  smoked_fish: '🐟', seaweed: '🌿', sea_salt: '🧂', cheese: '🧀',
  potato: '🥔', honey: '🍯', wheat: '🌾', herb: '🍃'
};

// 自绘的 16px 物品图标（tools/build_items.py），没有对应图标的才退回 emoji
const GOOD_ICON_SRC = {
  smoked_fish: 'img/items/fish.png',
  seaweed: 'img/items/kelp.png',
  sea_salt: 'img/items/salt.png',
  cheese: 'img/items/cheese.png',
  potato: 'img/items/potato.png',
  honey: 'img/items/honey.png',
  wheat: 'img/tiles/items/wheat.png'
};

function updateHud() {
  const phaseWord = { title: '准备中', day: '白天', night: '夜里', settle: '打烊', ending: '结业' }[S.phase] || '';
  const $day = $('#hud-day'), $money = $('#hud-money'), $fame = $('#hud-fame');
  if ($money) $money.textContent = S.money;
  if ($day) $day.textContent = `第 ${S.day} 天 · ${seasonName()} · ${weatherName()} · ${S.phase === 'day' ? duskName() : phaseWord}`;
  if ($fame) $fame.innerHTML = `账 ${S.debts} · <button class="hud-btn" data-act="open-journal">店志 ${S.storyLog.length}</button>`;

  const mute = $('#hud-mute');
  if (mute && typeof Sfx !== 'undefined') {
    mute.textContent = Sfx.muted ? '🔇' : '🔊';
    mute.title = Sfx.muted ? '声音：关' : '声音：开';
  }

  // 体力条
  const fill = $('#hud-stam-fill'), txt = $('#hud-stam-text');
  const box = document.querySelector('.hud-stam');
  if (fill && txt) {
    const max = S.maxStamina || 100;
    const ratio = Math.max(0, Math.min(1, S.stamina / max));
    fill.style.width = `calc(${(ratio * 100).toFixed(1)}% - 2px)`;
    txt.textContent = `${S.stamina}/${max}`;
    if (box) box.classList.toggle('low', ratio <= 0.3);
  }
}

// 浮层三件：日子卡 / 快捷栏 / 功能键（只在白天和夜里显示）
function renderHudPieces() {
  const onField = (S.phase === 'day' || S.phase === 'night');
  renderDayCard(onField);
  renderHotbar(onField);
  renderFnKeys(onField);
}

function renderDayCard(onField) {
  const el = $('#daycard');
  if (!el) return;
  el.classList.toggle('hidden', !onField);
  if (!onField) return;

  const wIcon = { sunny: '☀️', rain: '🌧️', storm: '⛈️' }[S.weather] || '☀️';
  const plots = (S.yard && S.yard.plots) || [];
  const growing = plots.filter(p => p.state === 'growing').length;
  const ready = plots.filter(p => p.state === 'ready').length;
  const thirsty = plots.filter(p => p.state === 'growing' && !p.watered).length;
  const vein = (typeof VEIN_NAME !== 'undefined' && VEIN_NAME[S.yard && S.yard.vein]) || '平稳';
  const ch = S.challenge;

  el.innerHTML = `
    <div class="dc-head">
      <span class="dc-date">第 ${S.day} 天 · ${seasonName()}</span>
      <span class="dc-weather" title="${weatherName()}">${wIcon}</span>
    </div>
    <div class="dc-row"><span>天气</span><b>${weatherName()}</b></div>
    <div class="dc-row"><span>流脉</span><b>${vein}</b></div>
    <div class="dc-row"><span>口碑</span><b>${S.fame || 0} · 今晚 ${guestCount()} 位</b></div>
    <div class="dc-row"><span>菜地</span><b>${growing} 长 · ${ready} 收</b></div>
    ${thirsty ? `<div class="dc-row warn"><span>待浇水</span><b>${thirsty} 块</b></div>` : ''}
    <div class="dc-foot">${ch ? ch.name : '今天还没有事'}</div>`;
}

function renderHotbar(onField) {
  const el = $('#hotbar');
  if (!el) return;
  el.classList.toggle('hidden', !onField);
  if (!onField) return;

  const entries = Object.entries(S.stock || {}).filter(([, n]) => n > 0);
  const slots = [];
  // 白天：2 格存货 + 6 道今日菜单；夜里：8 格存货（M8.4）
  const stockCap = S.phase === 'day' ? 2 : 8;
  for (let i = 0; i < stockCap; i++) {
    const e = entries[i];
    if (e) {
      const [id, n] = e;
      const name = (typeof GOODS !== 'undefined' && GOODS[id] && GOODS[id].name) || id;
      const src = GOOD_ICON_SRC[id];
      const ico = src
        ? `<img class="ico" src="${src}" alt="${name}">`
        : `<span class="ico">${GOOD_ICON[id] || '📦'}</span>`;
      slots.push(`<div class="slot filled" title="${name} ×${n}">
        ${ico}<span class="cnt">${n}</span></div>`);
    } else {
      slots.push('<div class="slot"><span class="empty-dot"></span></div>');
    }
  }
  if (S.phase === 'day') {
    const ids = Object.keys(RECIPES);
    const start = ((S.day - 1) * 5) % ids.length;
    for (let i = 0; i < 6; i++) {
      const id = ids[(start + i) % ids.length];
      const r = RECIPES[id];
      const firstMat = Object.keys(r.mats)[0];
      const src = GOOD_ICON_SRC[firstMat];
      const ico = src ? `<img class="ico" src="${src}" alt="">` : '<span class="ico">🍲</span>';
      slots.push(`<div class="slot menu" data-act="open-bag" title="今日菜单：${r.name} · ${r.price} 铜">
        ${ico}<span class="menu-name">${r.name.slice(0, 2)}</span></div>`);
    }
  }
  el.innerHTML = slots.join('');
}

function renderFnKeys(onField) {
  const el = $('#fnkeys');
  if (!el) return;
  el.classList.toggle('hidden', !onField);
  if (!onField) return;

  const keys = [
    '<button class="fnk" data-act="open-bag"><span class="ico">🎒</span>背包</button>',
    '<button class="fnk" data-act="open-journal"><span class="ico">📖</span>店志</button>',
    '<button class="fnk" data-act="open-achievements"><span class="ico">🏆</span>成就</button>'
  ];
  if (S.phase === 'day') {
    keys.push('<button class="fnk" data-act="open-ledger"><span class="ico">📒</span>账本</button>');
    keys.push('<button class="fnk" data-act="back-to-shop"><span class="ico">🏮</span>回店</button>');
  }
  el.innerHTML = keys.join('');
}

// ---------- 标题页 ----------
function renderTitle() {
  const scene = $('#scene-dom');
  scene.className = 'scene scene-title';
  scene.innerHTML = `
    <div class="title-wrap">
      <div class="lantern"></div>
      <h1 class="title-name">鹿铃亭</h1>
      <p class="title-sub">戈克世界 · 榆港 · 一家还没开张的小馆子</p>
      <p class="title-body">你初到榆港，盘下了街角这家「鹿铃亭」。<br>白天跑货，夜里开张。<br>六方的客人会走进来，把外面的世界一寸寸带进来。</p>
      <p class="title-credit">地形素材：Cozy Farm Lite © Bramble &amp; Byte（CC-BY 4.0）<br>其余像素素材与角色精灵为自制</p>
    </div>`;
  const canResume = !!S.resumePhase;
  $('#actions').innerHTML = canResume
    ? `<button class="btn btn-main" data-act="continue">继续营业</button>
       <button class="btn btn-ghost" data-act="new-day">重新开始</button>`
    : `<button class="btn btn-main" data-act="new-day">开张营业</button>`;
}

// ============================================================
// 白天：小镇地图
// ============================================================
const Yard = { cur: 0 };   // 当前站在哪块地（后院操作）

function renderDay() {
  const mapEl = document.getElementById('map');
  if (!MapScene.cv) MapScene.attach(mapEl);
  MapScene.mapName = S.map || 'town';   // 存档里的地图（M6）
  MapScene.onHot = onHotTile;
  MapScene.onStand = onStandTile;
  MapScene.start();
  renderDayActions();
}

function renderDayActions() {
  $('#actions').innerHTML = '<button class="btn btn-ghost" data-act="back-to-shop">回鹿铃亭</button>';
}

// 角色停在一格时：后院地块 → 出照顾菜单；镇民 → 聊一句；其他 → 默认
let _npcTalkT = 0;
function onStandTile(t, x, y) {
  if (S.phase !== 'day') return;   // 进店/结算后别动底部按钮
  const hot = (MAPS[MapScene.mapName] || MAPS.town).hot[t];
  if (hot) {
    // 站在热区上：底部出互动按钮（等同按空格）——M7 星露谷式交互
    const name = MAP_HOT_NAME[hot] || hot;
    $('#actions').innerHTML = `<button class="btn btn-main" data-act="interact">${name} · 空格互动</button>`;
    maybeTalkNpc(x, y);
    return;
  }
  if (t === 'F') {
    Yard.cur = yardPlotAt(x, y);
    renderYardActions();
  } else {
    renderDayActions();
  }
  maybeTalkNpc(x, y);
}

// 站到镇民身上聊一句（3 秒冷却，别刷屏）
function maybeTalkNpc(x, y) {
  if (MapScene.mapName !== 'town') return;
  const npc = TOWNSFOLK.find(n => n.x === x && n.y === y);
  if (!npc) return;
  const now = Date.now();
  if (now - _npcTalkT < 3000) return;
  _npcTalkT = now;
  if (!S.quests) S.quests = {};
  const quest = NPC_QUESTS[npc.id];
  const st = S.quests[npc.id] || { stage: 0 };
  if (quest && st.stage === 0) {
    const missing = quest.need.filter(k => (S.stock[k.id] || 0) < k.n);
    if (missing.length) {
      const needText = missing.map(k => `${GOODS[k.id].name}×${k.n - (S.stock[k.id] || 0)}`).join('、');
      toast(`${npc.name}：${quest.intro}（还差 ${needText}）`);
      return;
    }
    quest.need.forEach(k => { S.stock[k.id] -= k.n; });
    S.quests[npc.id] = { stage: 2 };
    giveQuestReward(quest);
    Sfx.play('unlock');
    save();
    updateHud();
    toast(`${npc.name}：${quest.done}`);
    return;
  }
  const talk = NPC_TALK[npc.id];
  const pool = (talk && talk[duskName()]) || npc.lines;
  toast(`${npc.name}：${pool[Math.floor(Math.random() * pool.length)]}`);
}

function giveQuestReward(q) {
  if (q.reward === 'money') S.money += q.amount;
  else if (q.reward === 'stamina') { S.maxStamina += q.amount; S.stamina = S.maxStamina; }
  else if (q.reward === 'fame') addFame(q.amount);
  else if (q.reward === 'fish') S.stock.fresh_fish = (S.stock.fresh_fish || 0) + q.amount;
}

function yardPlotAt(x, y) {
  return (y - 8) * 5 + (x - 17);   // 后院：列 17-21、行 8-9 的 5×2
}

function renderYardActions() {
  const p = S.yard.plots[Yard.cur];
  if (!p) { renderDayActions(); return; }
  const acts = [];
  const hint = `<span class="yard-hint">流脉：${VEIN_NAME[S.yard.vein] || '平稳'}</span>`;
  if (p.state === 'wild') {
    acts.push('<button class="btn btn-main" data-act="plot-till">锄地</button>');
  } else if (p.state === 'tilled') {
    acts.push('<button class="btn btn-main" data-act="plot-sow">播种</button>');
  } else if (p.state === 'growing') {
    if (p.watered) acts.push('<span class="btn btn-ghost" style="pointer-events:none">已浇水 · 明天见</span>');
    else acts.push('<button class="btn btn-main" data-act="plot-water">浇水</button>');
  } else if (p.state === 'ready') {
    acts.push('<button class="btn btn-main" data-act="plot-harvest">收获</button>');
  }
  acts.push('<button class="btn btn-ghost" data-act="back-to-shop">回鹿铃亭</button>');
  $('#actions').innerHTML = hint + acts.join('');
}

// ---------- 后院地块操作 ----------
function tillPlot() {
  const p = S.yard.plots[Yard.cur];
  if (!p || p.state !== 'wild') return;
  if (!spendStamina(3)) return;
  p.state = 'tilled';
  save();
  toast('锄好了，能下种了');
  renderYardActions();
}

function openSowModal() {
  const box = $('#modal-box');
  box.innerHTML = `
    <div class="cook">
      <h3>种什么</h3>
      ${Object.entries(CROPS).map(([id, c]) => `
        <button class="recipe-btn" data-act="sow-crop" data-crop="${id}">
          <span class="recipe-name">${c.name}</span>
          <span class="recipe-mats">${c.days} 天成熟 · 收 ${c.minYield}~${c.maxYield} 份</span>
        </button>`).join('')}
      <button class="btn btn-ghost" data-act="close-modal">先不种</button>
    </div>`;
  showModal();
}

function sowCrop(cropId) {
  const p = S.yard.plots[Yard.cur];
  const c = CROPS[cropId];
  if (!p || !c || p.state !== 'tilled') return;
  if (!spendStamina(1)) return;
  p.state = 'growing';
  p.cropId = cropId;
  p.daysLeft = c.days;
  p.watered = false;
  save();
  closeModal();
  toast(`种下了${c.name}，记得每天浇水`);
  renderYardActions();
}

function waterPlot() {
  const p = S.yard.plots[Yard.cur];
  if (!p || p.state !== 'growing' || p.watered) return;
  if (!spendStamina(2)) return;
  p.watered = true;
  save();
  toast('浇过了');
  renderYardActions();
}

function harvestPlot() {
  const p = S.yard.plots[Yard.cur];
  if (!p || p.state !== 'ready' || !p.cropId) return;
  if (!spendStamina(2)) return;
  const c = CROPS[p.cropId];
  let n = c.minYield + Math.floor(Math.random() * (c.maxYield - c.minYield + 1));
  if (S.yard.vein === 'rich') n += 1;
  S.stock[p.cropId] = (S.stock[p.cropId] || 0) + n;
  p.state = 'tilled';
  p.cropId = null;
  p.daysLeft = 0;
  p.watered = false;
  save();
  Sfx.play('harvest');
  unlockAchievement('first_harvest');
  toast(`收了 ${n} 份${c.name}`);
  renderYardActions();
}

// ---------- 每日生长与流脉 ----------
function rollVein() {
  const r = Math.random();
  const richChance = hasWell() ? 0.4 : 0.3;   // 后院的水井让富集更容易
  S.yard.vein = r < richChance ? 'rich' : r < richChance + 0.5 ? 'calm' : 'fade';
}

function growYard() {
  const vein = S.yard.vein;
  const rain = S.weather === 'rain';   // 雨天作物免浇水
  // 有井：每天清早自动浇 2 块（M8.1）
  if (hasWell()) {
    S.yard.plots.filter(p => p.state === 'growing' && !p.watered).slice(0, 2).forEach(p => { p.watered = true; });
  }
  S.yard.plots.forEach(p => {
    if (p.state !== 'growing') return;
    if (vein === 'fade') { p.watered = false; return; }   // 衰竭：当天不长
    if (!p.watered && !rain) { p.watered = false; return; }        // 没浇水：不长
    p.daysLeft = Math.max(0, p.daysLeft - (vein === 'rich' ? 2 : 1));
    if (p.daysLeft === 0) p.state = 'ready';
    p.watered = false;
  });
}

// 热区触发：码头/市集/暗巷 → 货摊面板；店门 → 进店
// ---------- 钓鱼（M5 星露谷式） ----------
const Fishing = { stage: 'idle', msg: '', timer: null, timer2: null, biteAt: 0 };
// 咬钩后 1.2 秒的力度条：35%~65% 是完美，20%~85% 是普通，其余空竿
function fishQuality(t) {
  if (t >= 0.35 && t <= 0.65) return 2;
  if ((t >= 0.2 && t < 0.35) || (t > 0.65 && t <= 0.85)) return 1;
  return 0;
}

function openFishing() {
  Fishing.stage = 'idle';
  Fishing.msg = '';
  renderFishModal();
  showModal();
}

function renderFishModal() {
  const box = $('#modal-box');
  let body = '';
  if (Fishing.stage === 'idle') {
    body = `<p class="fish-line">海面很平静。把线甩出去？</p>
      <button class="btn btn-main" data-act="fish-cast">抛竿</button>`;
  } else if (Fishing.stage === 'casting') {
    body = `<p class="fish-line">……鱼漂在水面上晃。等它咬钩。收早了会空竿。</p>
      <button class="btn btn-ghost" data-act="fish-reel">收杆</button>`;
  } else if (Fishing.stage === 'bite') {
    body = `<p class="fish-line fish-bite">咬钩了！等光标进绿区再按「收杆」！</p>
      <div class="fish-bar"><span class="fish-zone"></span><i class="fish-marker"></i></div>
      <button class="btn btn-main fish-reel" data-act="fish-reel">收杆！</button>`;
  } else {
    body = `<p class="fish-line">${Fishing.msg}</p>
      <button class="btn btn-main" data-act="fish-cast">再来一杆</button>`;
  }
  box.innerHTML = `
    <div class="fish-panel">
      <h3>码头钓点</h3>
      ${body}
      <button class="btn btn-ghost" data-act="close-modal">收工</button>
    </div>`;
}

function fishCast() {
  clearTimeout(Fishing.timer);
  clearTimeout(Fishing.timer2);
  Fishing.stage = 'casting';
  Fishing.msg = '';
  renderFishModal();
  const wait = 800 + Math.random() * 1600;   // 0.8~2.4 秒后咬钩
  Fishing.timer = setTimeout(() => {
    if (Fishing.stage !== 'casting') return;
    Fishing.stage = 'bite';
    Fishing.biteAt = Date.now();
    renderFishModal();
    Sfx.play('click');
    // 1.2 秒内没点就跑了
    Fishing.timer2 = setTimeout(() => {
      if (Fishing.stage !== 'bite') return;
      Fishing.stage = 'done';
      Fishing.msg = '鱼跑了……';
      renderFishModal();
    }, 1200);
  }, wait);
}

function fishReel() {
  if (Fishing.stage === 'casting') {
    clearTimeout(Fishing.timer);
    clearTimeout(Fishing.timer2);
    Fishing.stage = 'done';
    Fishing.msg = '收早了，鱼还没咬钩';
    renderFishModal();
    return;
  }
  if (Fishing.stage !== 'bite') return;
  const t = (Date.now() - Fishing.biteAt) / 1200;
  const q = fishQuality(t);
  clearTimeout(Fishing.timer2);
  if (q === 0) {
    Fishing.stage = 'done';
    Fishing.msg = t < 0.2 ? '收太急，钩子还没咬稳……' : '手慢了，鱼跑了……';
    renderFishModal();
    return;
  }
  if (!spendStamina(5)) {
    clearTimeout(Fishing.timer2);
    Fishing.stage = 'done';
    Fishing.msg = '胳膊抬不起来了，鱼跑了';
    renderFishModal();
    return;
  }
  const fish = FISH[Math.floor(Math.random() * FISH.length)];
  S.stock.fresh_fish = (S.stock.fresh_fish || 0) + q;
  S.stats.fishCaught = (S.stats.fishCaught || 0) + q;
  if (S.stats.fishCaught >= 10) unlockAchievement('fisher10');
  Fishing.stage = 'done';
  Fishing.msg = q === 2 ? `完美收杆！两条${fish.name}（鲜鱼 +2）` : `钓到一条${fish.name}（鲜鱼 +1）`;
  Sfx.play('coin');
  save();
  updateHud();
  renderFishModal();
}

function onHotTile(hot) {
  if (hot === 'shop') { goNight(); return; }
  if (hot === 'fish') { openFishing(); return; }
  if (hot === 'home') { switchMap('house'); return; }
  if (hot === 'bed') { goSleep(); return; }
  if (hot === 'forest') { switchMap('forest'); return; }
  if (hot === 'mine') { switchMap('mine'); return; }
  if (hot === 'town') { switchMap('town'); return; }
  if (hot === 'ranch') { switchMap('ranch'); return; }
  if (hot === 'chicken') { openRanch(); return; }
  if (hot === 'forage') { doForage(); return; }
  if (hot === 'rock') { doMine(); return; }
  visitRun(hot);
}

// ---------- 多地图切换（M6）：榆港 / 北林 / 矿洞 ----------
function switchMap(name) {
  if (!MAPS[name] || name === MapScene.mapName) return;
  MapScene.mapName = name;
  S.map = name;
  MapScene.resetPos();
  save();
  render();
  toast(MAPS[name].name === '榆港' ? '回到榆港' : name === 'forest' ? '进了北林' : '钻进矿洞');
}

// 采集点冷却（M8.3）：每个点每天只能采一次
function nodeKey() { return `${MapScene.mapName}:${MapScene.cx},${MapScene.cy}`; }
function nodeUsed() {
  if (!S.nodes) S.nodes = {};
  return S.nodes[nodeKey()] === S.day;
}

// 采集（北林 Y 格）
function doForage() {
  if (nodeUsed()) { toast('这处今天已经采过了'); return; }
  if (!spendStamina(2)) return;
  const r = Math.random();
  const id = r < 0.12 ? 'herb' : r < 0.45 ? 'berry' : r < 0.8 ? 'mushroom' : 'wood';
  S.stock[id] = (S.stock[id] || 0) + 1;
  S.nodes[nodeKey()] = S.day;
  Sfx.play('harvest');
  save();
  updateHud();
  toast(`采到 1 份${GOODS[id].name}`);
}

// 挖矿（矿洞 R 格）
function doMine() {
  if (nodeUsed()) { toast('这处今天已经挖过了'); return; }
  if (!spendStamina(3)) return;
  const r = Math.random();
  const id = r < 0.5 ? 'stone' : r < 0.8 ? 'coal' : 'copper';
  S.stock[id] = (S.stock[id] || 0) + 1;
  S.nodes[nodeKey()] = S.day;
  Sfx.play('harvest');
  save();
  updateHud();
  toast(`挖到 1 份${GOODS[id].name}`);
}

// ---------- 牧场（M6）：买鸡 / 喂食 / 收蛋 ----------
function openRanch() {
  const r = S.ranch;
  const box = $('#modal-box');
  box.innerHTML = `
    <div class="ranch-panel">
      <h3>牧场 · 鸡舍</h3>
      <p class="fish-line">鸡舍里 ${r.chickens}/4 只鸡，今天喂了 ${r.fed} 只，待收的蛋 ${r.eggs} 个。</p>
      <div class="ranch-actions">
        <button class="btn btn-main" data-act="ranch-buy">买鸡（30 铜）</button>
        <button class="btn" data-act="ranch-feed">喂食（每只 5 铜）</button>
        <button class="btn" data-act="ranch-collect">收蛋（${r.eggs}）</button>
      </div>
      <button class="btn btn-ghost" data-act="close-modal">离开</button>
    </div>`;
  showModal();
}

function buyChicken() {
  const r = S.ranch;
  if (r.chickens >= 4) { toast('鸡舍满了'); return; }
  if (S.money < 30) { toast('铜板不够，买不起鸡'); return; }
  S.money -= 30;
  r.chickens += 1;
  Sfx.play('coin');
  save();
  updateHud();
  openRanch();
  toast('买了一只小鸡');
}

function feedChickens() {
  const r = S.ranch;
  const need = r.chickens - r.fed;
  if (need <= 0) { toast(r.chickens ? '都喂过了' : '鸡舍里还没有鸡'); return; }
  const cost = need * 5;
  if (S.money < cost) { toast(`饲料要 ${cost} 铜，不够`); return; }
  S.money -= cost;
  r.fed = r.chickens;
  Sfx.play('coin');
  save();
  updateHud();
  openRanch();
  toast(`喂了 ${need} 只鸡，花了 ${cost} 铜`);
}

function collectEggs() {
  const r = S.ranch;
  if (r.eggs <= 0) { toast('还没下蛋'); return; }
  const n = r.eggs;
  S.stock.egg = (S.stock.egg || 0) + n;
  r.eggs = 0;
  Sfx.play('harvest');
  save();
  updateHud();
  openRanch();
  toast(`收了 ${n} 个蛋`);
}

// ---------- 自己的家（M6） ----------
// 走进去是屋子地图（能走），走到床边睡觉；旧弹窗 openHome 保留给老测试
function goSleep() {
  S.phase = 'settle';
  S.night = null;
  closeModal();
  render();
}

function openHome() {
  const box = $('#modal-box');
  box.innerHTML = `
    <div class="home-panel">
      <h3>你的小屋</h3>
      <p class="fish-line">屋里一张床、一口箱。灰港带来的东西还在箱底。</p>
      <p class="fish-line">体力 ${S.stamina}/${S.maxStamina}</p>
      <button class="btn btn-main" data-act="home-sleep">睡觉（结束今天）</button>
      <button class="btn btn-ghost" data-act="close-modal">再待会儿</button>
    </div>`;
  showModal();
}

function goNight() {
  MapScene.stop();
  S.phase = 'night';
  S.night = newNight();
  resetPots();
  S.currentRun = null;
  S.stallRun = null;
  closeModal();
  if (ShopScene.cv) ShopScene.resetPos();
  save();
  render();
}

// 货摊面板（模态）
function openStallPanel(runId) {
  const run = runById(runId);
  S.stallRun = run.id;
  S.currentRun = run.id;
  renderStallPanel();
  showModal();
}

function renderStallPanel() {
  const run = runById(S.stallRun);
  if (!run) return;
  const box = $('#modal-box');
  const goods = run.goods.map(gid => {
    const g = GOODS[gid];
    const price = goodPrice(run, gid);
    return `<button class="goods-card" data-act="open-deal" data-good="${gid}">
      <span class="goods-name">${g.name}</span>
      <span class="goods-price">${price} 铜</span>
      <span class="goods-desc">${g.desc}</span>
      <span class="goods-owned">已有 ${S.stock[gid] || 0}</span>
    </button>`;
  }).join('');
  box.innerHTML = `
    <div class="stall-panel">
      <h3>${run.name} · ${run.owner}</h3>
      <p class="stall-sub">${run.desc}。${run.id === 'dark' ? `暗线便宜，但两成假货。账：${S.debts}（暗线可直接划账）` : ''}</p>
      <div class="goods-list">${goods}</div>
      ${run.id === 'market' ? '<button class="btn" data-act="open-sell">卖东西给粮贩</button>' : ''}
      <button class="btn btn-ghost" data-act="close-modal">离开</button>
    </div>`;
}

// ---------- 卖货（M5 星露谷式） ----------
function openSellPanel() {
  const box = $('#modal-box');
  const run = runById('market');
  const items = Object.entries(S.stock).filter(([id, n]) => n > 0 && GOODS[id]);
  box.innerHTML = `
    <div class="stall-panel">
      <h3>卖东西 · 粮贩收购</h3>
      <p class="stall-sub">粮贩眯着眼：「收是收，价嘛，好商量。」</p>
      ${items.length ? items.map(([id, n]) => {
        const price = Math.max(1, Math.round(goodPrice(run, id) * 0.6));
        return `<div class="sell-row">
          <span class="sell-name">${GOODS[id].name} ×${n}</span>
          <button class="btn btn-small" data-act="sell-good" data-good="${id}">卖 1（${price} 铜）</button>
          ${n >= 2 ? `<button class="btn btn-small" data-act="sell-good" data-good="${id}" data-qty="5">卖 5（${price * 5} 铜）</button>` : ''}
        </div>`;
      }).join('') : '<p class="story-empty">没有能卖的货。</p>'}
      <button class="btn btn-ghost" data-act="close-modal">离开</button>
    </div>`;
  showModal();
}

function sellGood(gid, qty = 1) {
  const have = S.stock[gid] || 0;
  if (have <= 0) return;
  const n = Math.max(1, Math.min(qty, have));
  if (!spendStamina(1)) return;
  const run = runById('market');
  const price = Math.max(1, Math.round(goodPrice(run, gid) * 0.6));
  S.stock[gid] -= n;
  S.money += price * n;
  Sfx.play('coin');
  save();
  updateHud();
  toast(`卖了 ${n} 份${GOODS[gid].name}，${price * n} 铜`);
  openSellPanel();
}

function visitRun(runId) {
  const run = runById(runId);
  if (S.runsDone.includes(runId)) { toast('今天已经去过这儿了'); return; }
  if (S.runsDone.length >= 2) { toast('今天已经跑满两处了'); return; }
  if (run.needDebt) {
    if (S.oldDebts <= 0) { toast('没有旧账，舌头不让你进'); return; }
    S.oldDebts -= 1;
    toast('拿一笔旧账抵了门钱');
  }
  S.runsDone.push(runId);
  S.currentRun = runId;
  // 跑一趟货，时间往前走一段（晨→午→暮）
  S.dusk = Math.min(2, (S.dusk || 0) + 1);
  save();
  updateHud();
  openStallPanel(runId);
}

// ---------- 三回合砍价 ----------
// S.deal = { runId, goodId, base, round, quote }
function openDeal(gid, qty = 1) {
  const run = runById(S.stallRun || S.currentRun);
  S.deal = { runId: run.id, goodId: gid, base: goodPrice(run, gid), round: 0, quote: null, qty: Math.max(1, Math.min(5, qty | 0)) };
  renderDealModal();
  showModal();
}

function renderDealModal() {
  const d = S.deal;
  if (!d) return;
  const g = GOODS[d.goodId];
  const run = runById(d.runId);
  const charm = run.charm;
  const box = $('#modal-box');
  const roundWord = `第 ${d.round + 1} 轮 / 共 3 轮`;
  let body;
  if (d.quote) {
    body = `
      <p class="deal-line">${CHARM_WORD[charm].counter}</p>
      <div class="deal-actions two">
        <button class="btn btn-main" data-act="accept-quote">接受 ${d.quote} 铜</button>
        ${d.round < 3 ? `<button class="btn" data-act="keep-bid">再压一压</button>` : ''}
      </div>`;
  } else {
    body = `
      <p class="deal-line">「${g.line}」</p>
      <div class="deal-actions four">
        <button class="btn btn-main" data-act="bid" data-n="0">原价 ${d.base}</button>
        <button class="btn" data-act="bid" data-n="1">减 1（${Math.max(1, d.base - 1)}）</button>
        <button class="btn" data-act="bid" data-n="2">减 2（${Math.max(1, d.base - 2)}）</button>
        <button class="btn" data-act="bid" data-n="3">减 3（${Math.max(1, d.base - 3)}）</button>
      </div>`;
  }
  box.innerHTML = `
    <div class="deal">
      <h3>${g.name} · ${run.owner}的摊</h3>
      <div class="deal-qty">要几份
        <button class="btn btn-small ${d.qty === 1 ? 'on' : ''}" data-act="deal-qty" data-qty="1">1</button>
        <button class="btn btn-small ${d.qty === 5 ? 'on' : ''}" data-act="deal-qty" data-qty="5">5</button>
        <span class="deal-total">合计 ${d.base * d.qty} 铜</span>
      </div>
      ${body}
      <div class="deal-meta">报价 ${d.base} 铜/份 · ${roundWord}</div>
      <button class="btn btn-ghost" data-act="deal-walk">走人</button>
    </div>`;
}

// 老板回应：n = 减价铜数；round = 当前轮次（0 起）
function bossReply(charm, n, round, base) {
  if (round >= 2) {  // 最后一轮：只认很小让步
    if (n <= 1) return { type: 'deal', price: Math.max(1, base - n) };
    return { type: 'no' };
  }
  if (n === 0) return { type: 'deal', price: base };
  if (charm === 'easy') {
    if (n <= 1) return { type: 'deal', price: base - n };
    return { type: 'counter', price: base - 1 };
  }
  if (charm === 'sly') {
    if (n === 1) return { type: 'counter', price: base - 1 };
    return { type: 'no' };
  }
  // blunt
  if (n === 1) return { type: 'deal', price: base - 1 };
  return { type: 'no' };
}

function bidDeal(n) {
  const d = S.deal;
  if (!d) return;
  const run = runById(d.runId);
  const reply = bossReply(run.charm, n, d.round, d.base);
  if (reply.type === 'deal') {
    const gid = d.goodId;
    const qty = d.qty || 1;
    S.deal = null;
    completeBuy(run, gid, reply.price, qty);
    return;
  }
  if (reply.type === 'counter') {
    d.quote = reply.price;
    d.round += 1;
    renderDealModal();
    return;
  }
  // 摇头
  d.quote = null;
  d.round += 1;
  if (d.round >= 3) {
    S.deal = null;
    renderStallPanel();
    showModal();
    toast('谈不拢，老板把货收了回去');
    return;
  }
  toast('老板摇头，不松口');
  renderDealModal();
}

function acceptQuote() {
  const d = S.deal;
  if (!d || !d.quote) return;
  const run = runById(d.runId);
  const gid = d.goodId;
  const price = d.quote;
  const qty = d.qty || 1;
  S.deal = null;
  completeBuy(run, gid, price, qty);
}

function dealWalk() {
  S.deal = null;
  if (S.stallRun) {
    renderStallPanel();
    showModal();
  } else {
    closeModal();
  }
  toast('谈不拢，不买了');
}

function completeBuy(run, gid, price, qty = 1) {
  qty = Math.max(1, Math.min(5, qty | 0));
  const total = price * qty;
  if (!spendStamina(3)) { renderStallPanel(); showModal(); return; }
  const isDark = run.id === 'dark';
  if (isDark && S.debts >= total) {
    S.debts -= total;
  } else if (S.money >= total) {
    S.money -= total;
  } else if (isDark && S.debts >= price) {
    toast(`账只够付一份的，先划一份`);
    return completeBuy(run, gid, price, 1);
  } else {
    toast(isDark ? '铜板不够，账也不够' : '铜板不够了');
    renderStallPanel();
    showModal();
    return;
  }
  S.todayStats.spent += total;
  let fake = 0;
  if (run.fakeChance) {
    for (let i = 0; i < qty; i++) if (Math.random() < run.fakeChance) fake++;
  }
  const real = qty - fake;
  if (real > 0) S.stock[gid] = (S.stock[gid] || 0) + real;
  save();
  updateHud();
  Sfx.play('coin');
  if (isDark) {
    unlockAchievement('dark_deal');
    S.stats.darkDeals = (S.stats.darkDeals || 0) + qty;
  }
  const fakeText = fake ? `，其中 ${fake} 份是假货` : '';
  toast(`成交，${GOODS[gid].name} +${real} · ${total} 铜${isDark ? '（划账）' : ''}${fakeText}`);
  renderStallPanel();
  showModal();
}

// ---------- 夜里 ----------
// 每天 3 位常客，按日期确定性轮转：第 1 天 0/1/2、第 2 天 3/4/5、第 3 天 6/7/0……
function todaysCustomers(day, n = 3) {
  const start = ((day - 1) * 3) % CUSTOMERS.length;
  const out = [];
  for (let i = 0; i < n; i++) out.push((start + i) % CUSTOMERS.length);
  return out;
}

function newNight() {
  const n = guestCount();                       // 口碑 + 天气 + 节日（M8.1）
  const base = eventQueue(S.day, Math.max(n, 3));   // 事件季保证不同阵营到场（M8.2）
  return {
    stage: 'closed',                 // closed | serving | done
    queue: base.slice(0, n),         // 还没进店的客人
    guests: []                       // 店内客人 { cid, seatedAt, stage, bill }
  };
}

function renderNight() {
  const n = S.night;
  if (!ShopScene.cv) ShopScene.attach(document.getElementById('shop'));
  ShopScene.onHot = onShopHot;
  ShopScene.start();
  if (n.stage === 'closed') {
    $('#actions').innerHTML = '<button class="btn btn-main" data-act="open-shop">挂灯开业</button>';
  } else if (n.stage === 'serving') {
    $('#actions').innerHTML = '';
  } else {
    $('#actions').innerHTML = '<button class="btn btn-main" data-act="close-shop">打烊</button>';
  }
}

// 店里热区：灶台→做菜面板；桌→上菜/送客；门→打烊
function onShopHot(type, idx) {
  if (type === 'stove') { openShopCook(); return; }
  if (type === 'table') {
    const g = S.night.guests[idx];
    if (!g) return;
    if (g.stage === 'waiting') serveTo(g.cid);
    else if (g.stage === 'paying') sendOff(g.cid);
    return;
  }
  if (type === 'door' && S.night.stage === 'done') finishNight();
}

// 灶台面板：两口锅的状态（空锅点选菜）
function renderShopCookPanel() {
  const box = $('#modal-box');
  box.innerHTML = `
    <div class="cook">
      <h3>灶台 · 两口锅</h3>
      ${Cook.pots.map(p => potCard(p)).join('')}
      <button class="btn btn-ghost" data-act="close-modal">回去看客</button>
    </div>`;
}

function openShopCook() {
  renderShopCookPanel();
  showModal();
}

// 锅状态一变就刷新灶台面板（备料→下锅→出锅）
function refreshShopCookPanel() {
  const m = $('#modal');
  if (m && !m.classList.contains('hidden')) renderShopCookPanel();
}

function stockLine() {
  const parts = Object.entries(GOODS).map(([id, g]) => `${g.name}×${S.stock[id] || 0}`);
  return `库存：${parts.join('　')}`;
}

function guestCard(g) {
  const c = CUSTOMERS[g.cid];
  if (g.stage === 'paying') {
    const b = g.bill;
    const stars = '★'.repeat(b.satisfied) + '☆'.repeat(5 - b.satisfied);
    return `<div class="guest-card paying">
      <div class="guest-name">${c.name} <span>${c.from}</span></div>
      <div class="stars">${stars}</div>
      <p class="guest-done">「${c.done}」</p>
      <p class="guest-bill">${b.recipeName} · ${b.cookWord}${b.wrong ? ' · 上错了菜' : ''}<br>${b.price} 铜${b.tip ? ` · 小费 ${b.tip} 铜` : ''}</p>
      <button class="btn btn-small" data-act="send-off" data-cid="${g.cid}">送客</button>
    </div>`;
  }
  const r = RECIPES[c.want];
  return `<div class="guest-card">
    <div class="guest-name">${c.name} <span>${c.from}</span></div>
    <div class="guest-order">点单：${r.name}</div>
    <div class="guest-wait" data-wait="${g.cid}">等着</div>
    <button class="btn btn-small" data-act="serve" data-cid="${g.cid}">上菜</button>
  </div>`;
}

function potCard(p) {
  const r = p.recipeId ? RECIPES[p.recipeId] : null;
  if (p.stage === 'empty') {
    return `<button class="pot" data-pot="${p.id}" data-act="pot-select">
      <span class="pot-name">灶眼 ${p.id + 1}</span>
      <span class="pot-state">空着 · 点我下菜</span>
    </button>`;
  }
  if (p.stage === 'prep') {
    return `<div class="pot busy" data-pot="${p.id}">
      <span class="pot-name">${r.name}</span>
      <div class="mini-bar"><div class="fill" style="width:${p.prepProgress}%"></div></div>
      <span class="pot-state">备料中…</span>
    </div>`;
  }
  if (p.stage === 'cook') {
    return `<div class="pot busy" data-pot="${p.id}">
      <span class="pot-name">${r.name}</span>
      <div class="mini-bar"><div class="fill" style="width:${p.cookProgress}%"></div><div class="zone"></div></div>
      <button class="btn btn-small" data-act="flip" data-pot="${p.id}">起锅！</button>
    </div>`;
  }
  return `<div class="pot ready" data-pot="${p.id}">
    <span class="pot-name">${r.name}</span>
    <span class="pot-state">${COOK_WORD[p.result]}</span>
    <span class="pot-hint">点客人的「上菜」端过去</span>
  </div>`;
}

function openShop() {
  const n = S.night;
  n.stage = 'serving';
  n.guests = [];
  const cap = shopSeats();
  for (let i = 0; i < cap && n.queue.length; i++) {
    n.guests.push(seatGuest(n.queue.shift()));
  }
  if (n.guests.length >= 4) unlockAchievement('full_house');
  save();
  render();
}

// ---------- 做菜（双锅） ----------
function canCook(r) {
  return Object.entries(r.mats).every(([id, n]) => (S.stock[id] || 0) >= n);
}

function matsText(r) {
  return Object.entries(r.mats).map(([id, n]) => {
    const g = GOODS[id];
    const have = S.stock[id] || 0;
    const missing = have < n ? `（缺 ${n - have}）` : '';
    return `${g.name}×${n}${missing}`;
  }).join('　');
}

function openPotSelect(potId) {
  Cook.modalPot = potId;
  renderCookSelect();
  showModal();
}

function renderCookSelect() {
  const box = $('#modal-box');
  box.innerHTML = `
    <div class="cook">
      <h3>灶眼 ${Cook.modalPot + 1} · 做什么</h3>
      <div class="recipe-grid">
        ${Object.entries(RECIPES).map(([id, r]) => {
          const ok = canCook(r);
          return `<button class="recipe-btn ${ok ? '' : 'disabled'}" data-act="pick-recipe" data-recipe="${id}" ${ok ? '' : 'disabled'}>
            <span class="recipe-name">${r.name}</span>
            <span class="recipe-mats">${matsText(r)}</span>
            <span class="recipe-price">卖 ${r.price} 铜</span>
          </button>`;
        }).join('')}
      </div>
      <button class="btn btn-ghost" data-act="close-modal">先不做</button>
    </div>`;
}

function pickRecipe(id) {
  const r = RECIPES[id];
  if (!canCook(r)) return;
  Object.entries(r.mats).forEach(([mid, n]) => { S.stock[mid] -= n; });
  const pot = Cook.pots[Cook.modalPot];
  pot.recipeId = id;
  closeModal();
  startPrep(pot);
  openShopCook();   // 回到灶台面板，能看着锅
}

function updatePotFill(pot) {
  const el = document.querySelector(`.pot[data-pot="${pot.id}"] .fill`);
  if (el) el.style.width = (pot.stage === 'prep' ? pot.prepProgress : pot.cookProgress) + '%';
}

function startPrep(pot) {
  pot.stage = 'prep';
  pot.prepProgress = 0;
  render();
  refreshShopCookPanel();
  const t0 = performance.now();
  const DUR = 1200;
  function frame(now) {
    const p = Math.min(1, (now - t0) / DUR);
    pot.prepProgress = p * 100;
    updatePotFill(pot);
    if (p < 1) pot.raf = requestAnimationFrame(frame);
    else startCook(pot);
  }
  pot.raf = requestAnimationFrame(frame);
}

function startCook(pot) {
  pot.stage = 'cook';
  pot.cookProgress = 0;
  render();
  refreshShopCookPanel();
  const t0 = performance.now();
  const DUR = 3500;
  function frame(now) {
    const p = Math.min(1, (now - t0) / DUR);
    pot.cookProgress = p * 100;
    updatePotFill(pot);
    if (p < 1) pot.raf = requestAnimationFrame(frame);
    else finishCook(pot, 100);
  }
  pot.raf = requestAnimationFrame(frame);
}

function flipPot(potId) {
  const pot = Cook.pots[potId];
  if (pot.stage !== 'cook') return;
  cancelAnimationFrame(pot.raf);
  finishCook(pot, pot.cookProgress);
}

function finishCook(pot, p) {
  pot.stage = 'done';
  pot.prepProgress = 0;
  if (p >= 55 && p <= 80) pot.result = 'perfect';
  else if (p > 80) pot.result = 'burnt';
  else pot.result = 'raw';
  if (pot.result === 'perfect') {
    Sfx.play('perfect');
    unlockAchievement('first_perfect');
    S.todayStats.perfect = (S.todayStats.perfect || 0) + 1;
  } else {
    Sfx.play('fail');
  }
  render();
  refreshShopCookPanel();
}

function clearPot(pot) {
  if (pot.raf) cancelAnimationFrame(pot.raf);
  pot.stage = 'empty';
  pot.recipeId = null;
  pot.prepProgress = 0;
  pot.cookProgress = 0;
  pot.raf = null;
  pot.result = null;
}

// ---------- 上菜 / 结账 ----------
function billFor(c, g, pot) {
  const want = (g && g.want) || c.want;
  const wrong = pot.recipeId !== want;
  const cookVal = { perfect: 1, ok: 0, burnt: -1, raw: -1 }[pot.result];
  let satisfied = 3 + (wrong ? -2 : 1) + cookVal - ((g && g.grumpy) ? 1 : 0);
  const waited = (Date.now() - g.seatedAt) / 1000;
  if (waited > 60) satisfied -= 2;
  else if (waited > 45) satisfied -= 1;
  satisfied = Math.max(0, Math.min(5, satisfied));
  const price = Math.round(RECIPES[pot.recipeId].price * (1 + decorBonus()) * (wrong ? 0.7 : 1.2));
  const tip = Math.max(0, satisfied - 2) * 2;
  return { satisfied, price, tip, wrong, recipeName: RECIPES[pot.recipeId].name, cookWord: COOK_WORD[pot.result] };
}

function serveTo(cid) {
  const n = S.night;
  const g = n.guests.find(x => x.cid === cid);
  if (!g || g.stage !== 'waiting') return;
  const c = CUSTOMERS[cid];
  // 等太久：菜还没端就起身走（M8.1）
  if (guestPatience(g).sec > 90) {
    dropGuest(cid);
    addFame(-3);
    Sfx.play('fail');
    toast(`${c.name}等太久，起身走了（口碑 -3）`);
    save();
    render();
    return;
  }
  // 优先上客人点的那道；没有就上第一口出锅的
  const want = g.want || c.want;
  let pot = Cook.pots.find(p => p.stage === 'done' && p.recipeId === want);
  if (!pot) pot = Cook.pots.find(p => p.stage === 'done');
  if (!pot) { toast('锅里还没有做好的菜'); return; }
  const bill = billFor(c, g, pot);
  clearPot(pot);
  if (bill.satisfied === 0) {
    // 摔门走：一铜不收
    dropGuest(cid);
    addFame(-3);
    Sfx.play('fail');
    unlockAchievement('first_slam');
    toast(`${c.name}摔门走了，一铜没付（口碑 -3）`);
    return;
  }
  g.stage = 'paying';
  g.bill = bill;
  // 好感：吃对菜且满意（4 星以上）→ +1，封顶 5
  if (!bill.wrong && bill.satisfied >= 4) {
    if (!S.affection) S.affection = {};
    const cur = S.affection[cid] || 0;
    if (cur < 5) {
      S.affection[cid] = cur + 1;
      if (cur + 1 >= 5) unlockAchievement('first_friend');
      toast(`${c.name}对你更熟络了（好感 ${cur + 1}/5）`);
    }
  }
  // 满五星的老主顾，小费 ×1.5
  if ((S.affection && S.affection[cid] || 0) >= 5 && bill.tip > 0) {
    bill.tip = Math.round(bill.tip * 1.5);
  }
  // 节日夜小费慷慨（×1.5）
  if (S.day % 7 === 0 && bill.tip > 0) {
    bill.tip = Math.round(bill.tip * 1.5);
  }
  // 灰港掮客只记账不付现：账进 debts，铜不进
  if (c.from.includes('灰港')) {
    S.debts += bill.price + bill.tip;
    S.todayStats.debt = (S.todayStats.debt || 0) + bill.price + bill.tip;
    toast(`老奥托记在账上：${bill.price + bill.tip} 铜`);
  } else {
    S.money += bill.price + bill.tip;
  }
  S.todayStats.revenue += bill.price;
  S.todayStats.tips += bill.tip;
  S.todayStats.served = (S.todayStats.served || 0) + 1;
  addFame(bill.satisfied >= 5 ? 2 : bill.satisfied >= 4 ? 1 : 0);
  recordCustomerStory(c, cid);
  maybeHearEvent(c, bill.satisfied);
  if (S.day % 7 === 0 && bill.satisfied >= 5) unlockAchievement('festival_full');
  if (S.money >= 2000) unlockAchievement('rich2000');
  if (S.money >= 1000) unlockAchievement('rich');
  Sfx.play('serve');
  save();
  render();
}

function dropGuest(cid) {
  const n = S.night;
  n.guests = n.guests.filter(g => g.cid !== cid);
  while (n.guests.length < shopSeats() && n.queue.length) {
    n.guests.push(seatGuest(n.queue.shift()));
  }
  if (n.guests.length === 0 && n.queue.length === 0) n.stage = 'done';
}

function sendOff(cid) {
  dropGuest(cid);
  save();
  render();
}

// ---------- 结算 ----------
function finishNight() {
  S.phase = 'settle';
  save();
  render();
}

// ---------- 六方事件 + 店志（M3.2 / M8.2 改成季内收集） ----------
function eventForDay(day) {
  if (day % 7 !== 0 || day > 28) return null;
  return EVENTS[(day / 7 - 1) % 4];
}
// 客人阵营 → 事件里的六方叫法（榆港本地 = 共和国本地）
function factionOf(c) {
  if (!c) return '';
  return c.from === '榆港本地' ? '共和国本地' : c.from;
}
// 当前季节的事件：整季都在「听」的窗口里（第 1~28 天）
function activeEvent() {
  const idx = Math.floor((S.day - 1) / 7);
  if (idx < 0 || idx > 3) return null;
  return EVENTS[idx];
}
// 事件季的客流：先保证 3 个不同阵营到场，才听得到不同说法
function eventQueue(day, n) {
  const idx = Math.floor((day - 1) / 7);
  const ev = idx >= 0 && idx <= 3 ? EVENTS[idx] : null;
  const out = [];
  if (ev) {
    const used = new Set();
    for (let k = 0; k < CUSTOMERS.length && out.length < Math.min(3, n); k++) {
      const i = ((day - 1) * 3 + k) % CUSTOMERS.length;
      const f = CUSTOMERS[i].from;
      if (!used.has(f)) { used.add(f); out.push(i); }
    }
  }
  for (let k = 0; out.length < n && k < CUSTOMERS.length * 2; k++) {
    const i = ((day - 1) * 3 + k) % CUSTOMERS.length;
    if (!out.includes(i)) out.push(i);
  }
  return out.slice(0, n);
}
// 上菜：第一次记住这个人（第一段）；五星再记第二段
function recordCustomerStory(c, cid) {
  if (!S.people) S.people = {};
  const key = c.id;   // 人名册按角色 id 存，好感仍按数组下标（老存档兼容）
  const rec = S.people[key] || (S.people[key] = { first: false, second: false });
  if (!rec.first) {
    rec.first = true;
    S.storyLog.push({ who: c.name, text: c.story, day: S.day, cid: key, part: 1 });
  }
  const stars = (S.affection && S.affection[cid]) || 0;
  if (!rec.second && stars >= 5 && typeof CUSTOMER_STORY2 !== 'undefined' && CUSTOMER_STORY2[key]) {
    rec.second = true;
    S.storyLog.push({ who: c.name, text: CUSTOMER_STORY2[key], day: S.day, cid: key, part: 2 });
    unlockAchievement('second_story');
    toast(`${c.name}说了段更私人的话（店志 · 人名册）`);
  }
}
// 季内给对应阵营上菜且满意 → 听到那一方的说法
function maybeHearEvent(c, satisfied) {
  if (satisfied < 4) return;
  const ev = activeEvent();
  if (!ev) return;
  const v = ev.versions.find(x => x.who === factionOf(c));
  if (!v) return;
  if (!S.journal[ev.id]) S.journal[ev.id] = { versions: [], judgment: null };
  const j = S.journal[ev.id];
  if (j.versions.some(x => x.who === v.who)) return;
  j.versions.push({ who: v.who, text: v.text, day: S.day });
  if (j.versions.length >= Math.min(4, ev.versions.length)) unlockAchievement('first_event');
  if (j.versions.length >= ev.versions.length) unlockAchievement('six_sides');
  toast(`听来一句「${v.who}」的说法（${j.versions.length}/${ev.versions.length}）`);
}

// ---------- 背包（M5 星露谷式） ----------
function openBag() {
  const box = $('#modal-box');
  const items = Object.entries(S.stock).filter(([id, n]) => n > 0 && GOODS[id]);
  box.innerHTML = `
    <div class="bag-panel">
      <h3>背包 · 存货</h3>
      ${items.length ? items.map(([id, n]) => `
        <div class="bag-row">
          <span class="bag-name">${GOODS[id].name}</span>
          <span class="bag-count">×${n}</span>
        </div>`).join('') : '<p class="story-empty">背包是空的。</p>'}
      <div class="bag-sub">铜 ${S.money} · 账 ${S.debts} · 常客 ${Object.keys(S.affection || {}).length} 位熟人</div>
      <button class="btn btn-ghost" data-act="close-modal">合上</button>
    </div>`;
  showModal();
}

function openEventModal(eventId) {
  const ev = EVENTS.find(e => e.id === eventId);
  if (!ev) return;
  renderEventModal(ev);
  showModal();
}

function renderEventModal(ev) {
  const box = $('#modal-box');
  const done = S.eventDone[ev.id];
  const chosen = done ? ev.choices.find(c => c.id === done) : null;
  const j = S.journal[ev.id] || { versions: [], judgment: null };
  const need = Math.min(4, ev.versions.length);
  const canJudge = j.versions.length >= need;
  box.innerHTML = `
    <div class="event-panel">
      <h3>${ev.name}</h3>
      <p class="event-intro">${ev.intro}</p>
      <p class="event-hint">季内在店里给对应阵营上菜（满意度 4 星以上），他们才会把话说给你听。</p>
      ${done
        ? `<p class="event-done">${chosen ? chosen.result : ''}</p>`
        : `<div class="event-choices">
            ${ev.choices.map(c => `<button class="btn btn-main" data-act="event-choose" data-event="${ev.id}" data-choice="${c.id}">${c.label}</button>`).join('')}
          </div>`}
      <div class="event-versions">
        <div class="event-sub">听来的话（${j.versions.length}/${ev.versions.length}）</div>
        ${ev.versions.map(v => {
          const got = j.versions.some(x => x.who === v.who);
          return `<div class="version-row ${got ? 'got' : ''}">
            <span class="version-who">${v.who}</span>
            <span class="version-text">${got ? v.text : '还没听到这一方的说法'}</span>
            <span class="version-got">${got ? '已记下' : '—'}</span>
          </div>`;
        }).join('')}
      </div>
      ${canJudge ? (j.judgment
        ? `<div class="event-judge">你信了：<strong>${j.judgment}</strong></div>`
        : `<div class="event-judge">
            <div class="event-sub">听了 ${j.versions.length} 方。你信谁？</div>
            <div class="judge-choices">
              ${j.versions.map(v => `<button class="btn btn-small" data-act="event-judge" data-event="${ev.id}" data-who="${v.who}">${v.who}</button>`).join('')}
            </div>
          </div>`)
        : `<div class="event-judge"><div class="event-sub">再听 ${need - j.versions.length} 方就能判了。</div></div>`}
      <button class="btn btn-ghost" data-act="close-modal">合上</button>
    </div>`;
}

function chooseEvent(eventId, choiceId) {
  const ev = EVENTS.find(e => e.id === eventId);
  if (!ev) return;
  S.eventDone[ev.id] = choiceId;
  save();
  renderEventModal(ev);
  Sfx.play('event');
  toast('事件记下了');
}

function eventJudge(eventId, who) {
  const ev = EVENTS.find(e => e.id === eventId);
  if (!ev || !S.journal[ev.id]) return;
  S.journal[ev.id].judgment = who;
  save();
  Sfx.play('unlock');
  unlockAchievement('first_judge');
  renderEventModal(ev);
  toast(`记下你的判断：你信了${who}`);
}

// ---------- 成就面板（M8.4） ----------
function openAchievements() {
  const box = $('#modal-box');
  const got = new Set(S.achievements || []);
  box.innerHTML = `
    <div class="ach-panel">
      <h3>成就 · ${got.size}/${ACHIEVEMENTS.length}</h3>
      <div class="ach-grid">
      ${ACHIEVEMENTS.map(a => `<div class="ach-row ${got.has(a.id) ? 'got' : ''}">
        <span class="ach-name">${got.has(a.id) ? '★' : '☆'} ${a.name}</span>
        <span class="ach-desc">${a.desc}</span>
      </div>`).join('')}
      </div>
      <button class="btn btn-ghost" data-act="close-modal">合上</button>
    </div>`;
  showModal();
}

function openJournal() {
  const box = $('#modal-box');
  const evs = EVENTS.filter(ev => S.journal[ev.id] && S.journal[ev.id].versions.length);
  const people = Object.keys(S.people || {});
  box.innerHTML = `
    <div class="journal-panel">
      <h3>店志 · 听来的话</h3>
      ${evs.length ? evs.map(ev => {
        const j = S.journal[ev.id];
        return `<div class="journal-event">
          <div class="journal-title">${ev.name}（${j.versions.length}/${ev.versions.length}）</div>
          ${j.versions.map(v => `<div class="journal-row"><span class="journal-who">${v.who}</span>${v.text}</div>`).join('')}
          ${j.judgment ? `<div class="journal-judge">你信了：${j.judgment}</div>` : ''}
        </div>`;
      }).join('') : '<p class="journal-empty">还没听到什么。</p>'}
      <h3 class="journal-sub-title">人名册 · 常客</h3>
      ${people.length ? people.map(cid => {
        const c = CUSTOMERS.find(x => x.id === cid);
        if (!c) return '';
        const rec = S.people[cid] || {};
        const first = ((S.storyLog || []).find(x => x.cid === cid && x.part === 1) || {}).text || c.story;
        const second = rec.second ? (((S.storyLog || []).find(x => x.cid === cid && x.part === 2) || {}).text || '') : '';
        const idx = CUSTOMERS.indexOf(c);
        const stars = (S.affection && S.affection[idx]) || 0;
        return `<div class="journal-event">
          <div class="journal-title">${c.name} · ${c.from}${stars ? ' ' + '★'.repeat(stars) : ''}</div>
          <div class="journal-row">${first}</div>
          ${second ? `<div class="journal-row journal-second">${second}</div>` : ''}
        </div>`;
      }).join('') : '<p class="journal-empty">还没记住谁的名字。</p>'}
      <button class="btn btn-ghost" data-act="close-modal">合上</button>
    </div>`;
  showModal();
}

function renderSettle() {
  const t = S.todayStats;
  const net = t.revenue + t.tips - t.spent;
  const todayLog = S.storyLog.filter(x => x.day === S.day);
  // 今日挑战判定
  let challengeLine = '';
  if (S.challenge) {
    let done = false;
    if (S.challenge.id === 'serve3') done = (t.served || 0) >= 3;
    else if (S.challenge.id === 'tip5') done = (t.tips || 0) >= 5;
    else if (S.challenge.id === 'perfect2') done = (t.perfect || 0) >= 2;
    if (done && !S.challenge.done) {
      S.challenge.done = true;
      S.money += 10;
      toast('今日挑战完成：+10 铜');
    }
    challengeLine = `<div class="settle-row"><span>今日挑战 · ${S.challenge.name}</span><span>${S.challenge.done ? '完成 +10 铜' : '未完成'}</span></div>`;
  }
  // 榜单：最佳单日流水
  const isNewRecord = t.revenue > (S.records.bestRevenue || 0);
  if (isNewRecord) S.records.bestRevenue = t.revenue;
  save();
  const scene = $('#scene-dom');
  const fest = festivalForDay(S.day);
  scene.className = 'scene scene-settle';
  scene.innerHTML = `
    <div class="settle">
      <h2>打烊结算</h2>
      ${fest ? `<div class="settle-fest"><strong>${fest.name}</strong> · ${fest.desc}</div>` : ''}
      <div class="settle-row"><span>今日流水</span><span>${t.revenue} 铜</span></div>
      <div class="settle-row"><span>小费</span><span>${t.tips} 铜</span></div>
      <div class="settle-row"><span>进货支出</span><span>${t.spent} 铜</span></div>
      ${t.debt ? `<div class="settle-row"><span>今日记账</span><span>${t.debt} 铜（账 ${S.debts}）</span></div>` : ''}
      <div class="settle-row total"><span>净收入</span><span>${net} 铜</span></div>
      ${challengeLine}
      <div class="settle-row"><span>最佳单日流水</span><span>${S.records.bestRevenue || 0} 铜${isNewRecord && t.revenue > 0 ? ' · 新纪录！' : ''}</span></div>
      <h3>店志 · 今晚听来的话</h3>
      ${todayLog.length
        ? todayLog.map(x => `<div class="story-item"><span class="story-who">${x.who}</span>${x.text}</div>`).join('')
        : '<p class="story-empty">今晚没听到什么。</p>'}
      <p class="settle-note">存档已自动保存。</p>
      ${S.day % 7 === 0 ? `
      <div class="quarter-report">
        <h3>季度报告 · ${seasonName()}</h3>
        <p class="quarter-line">本季最后一天。下季：${SEASON_NAMES[(seasonOf(S.day) + 1) % 4]}</p>
        <p class="quarter-line">店志累计 ${S.storyLog.length} 条 · 账 ${S.debts}</p>
      </div>` : ''}
    </div>`;
  const ev = eventForDay(S.day);
  const yearEnd = S.day >= 28 && !S.ended;
  $('#actions').innerHTML = `
    ${ev && !S.eventDone[ev.id] ? `<button class="btn" data-act="open-event" data-event="${ev.id}">本季事件：${ev.name}</button>` : ''}
    ${yearEnd
      ? '<button class="btn btn-main" data-act="year-end">年终结算 · 看看这一年</button>'
      : '<button class="btn btn-main" data-act="next-day">明天继续营业</button>'}`;
}

// ---------- 三向结局（M8.2） ----------
const LOCAL_IDS = ['marta', 'barto', 'vila', 'oldlim', 'xiaoman'];
const GREY_IDS = ['otto', 'vika'];

function endingScores() {
  const e = S.eventDone || {};
  const j = S.journal || {};
  let stay = 0, ledger = 0, leave = 0;
  const is = (k, v) => e[k] === v;
  const affOf = id => {
    const i = CUSTOMERS.findIndex(c => c.id === id);
    const byIdx = i >= 0 ? ((S.affection && S.affection[i]) || 0) : 0;
    const byId = (S.affection && S.affection[id]) || 0;
    return Math.max(byIdx, byId);
  };
  if (is('spring_call', 'silent')) stay += 2;
  if (is('spring_call', 'speak')) leave += 1;
  if (is('summer_grain', 'wait')) stay += 2;
  if (is('summer_grain', 'buy')) ledger += 2;
  if (is('autumn_vein', 'dim')) stay += 2;
  if (is('autumn_vein', 'lamp')) ledger += 2;
  if (is('winter_debt', 'grace')) stay += 2;
  if (is('winter_debt', 'pay')) ledger += 2;
  LOCAL_IDS.forEach(id => { stay += affOf(id); });
  GREY_IDS.forEach(id => { ledger += affOf(id); });
  Object.keys(j).forEach(k => {
    const x = j[k];
    if (!x || !x.judgment) return;
    if (x.judgment === '共和国本地') stay += 2;
    else if (x.judgment === '灰港掮客') ledger += 2;
    else if (x.judgment === '帝国商队') ledger += 1;
    else leave += 2;
  });
  ledger += Math.min(10, (S.stats && S.stats.darkDeals) || 0);
  ledger += Math.floor((S.debts || 0) / 100);
  leave += Object.values(S.affection || {}).filter(v => v >= 5).length;
  if ((S.money || 0) >= 1200) leave += 3;
  return { stay, ledger, leave };
}

function axisOfWho(who) {
  if (who === '共和国本地') return 'stay';
  if (who === '灰港掮客' || who === '帝国商队') return 'ledger';
  return 'leave';
}

function lastJudgmentAxis() {
  for (let i = EVENTS.length - 1; i >= 0; i--) {
    const j = S.journal[EVENTS[i].id];
    if (j && j.judgment) return axisOfWho(j.judgment);
  }
  return null;
}

function pickEnding() {
  const sc = endingScores();
  const max = Math.max(sc.stay, sc.ledger, sc.leave);
  const tied = ['stay', 'ledger', 'leave'].filter(k => sc[k] === max);
  let id = tied.includes('stay') ? 'stay' : tied[0];
  if (tied.length > 1) {
    const last = lastJudgmentAxis();
    if (last && tied.includes(last)) id = last;
  }
  return { id, sc };
}

function openYearEnd() {
  unlockAchievement('ending_seen');
  const pick = pickEnding();
  S.ending = { id: pick.id, sc: pick.sc, day: S.day };
  S.phase = 'ending';
  save();
  render();
}

function renderEnding() {
  const e = ENDINGS.find(x => x.id === (S.ending && S.ending.id)) || ENDINGS[0];
  const sc = (S.ending && S.ending.sc) || endingScores();
  const scene = $('#scene-dom');
  scene.className = 'scene scene-ending';
  scene.innerHTML = `
    <div class="ending">
      <div class="ending-kicker">第 ${S.day} 天 · 一年的最后一晚</div>
      <h2 class="ending-name">${e.name}</h2>
      <div class="ending-axis">守 ${sc.stay} · 账 ${sc.ledger} · 走 ${sc.leave}</div>
      <p class="ending-text">${e.text}</p>
      <p class="ending-egg">${e.egg}</p>
      <p class="ending-note">三个数：守 = 留在榆港，账 = 把自己写进灰港的册子，走 = 把店交给别人。</p>
    </div>`;
  $('#actions').innerHTML = `
    <button class="btn btn-main" data-act="keep-going">继业（自由模式）</button>
    <button class="btn" data-act="restart-year">重开一年</button>`;
}

function keepGoing() {
  S.ended = true;
  S.ending = null;
  nextDay();
  toast('第二年，店还开着');
}

function restartYear() {
  clearSave();
  S = freshState();
  S.phase = 'day';
  rollChallenge();
  rollWeather();
  resetPots();
  MapScene.resetPos();
  save();
  render();
}

function nextDay() {
  growYard();               // 用今天的流脉结算生长
  S.day += 1;
  rollVein();               // 新的一天流脉重抽
  rollChallenge();          // 新的一天挑战重抽
  rollWeather();            // 新的一天天气重抽
  S.stamina = S.maxStamina; // 睡一觉体力回满（M6）
  S.ranch.eggs += S.ranch.fed;   // 喂过的鸡下蛋（M6）
  S.ranch.fed = 0;
  S.phase = 'day';
  S.todayStats = { revenue: 0, tips: 0, spent: 0 };
  S.runsDone = [];
  S.dusk = 0;               // 新一天从早上开始
  S.currentRun = null;
  S.stallRun = null;
  S.night = null;
  resetPots();
  MapScene.resetPos();
  save();
  render();
  toast(`今日流脉：${VEIN_NAME[S.yard.vein]}`);
}

// ---------- 模态 / toast ----------
function showModal() { $('#modal').classList.remove('hidden'); }

function closeModal() {
  clearTimeout(Fishing.timer);
  clearTimeout(Fishing.timer2);
  Fishing.stage = 'idle';
  $('#modal').classList.add('hidden');
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 1800);
}

// ---------- 体力（M6） ----------
function spendStamina(n) {
  if (S.stamina < n) {
    toast('没力气了，回家睡一觉吧');
    return false;
  }
  S.stamina -= n;
  updateHud();
  return true;
}

// ---------- 账本 · 家什（M8.1） ----------
function upgradeLevel(id) {
  if (id === 'seats') return Math.max(0, (S.shop.seats || 2) - 2);
  if (id === 'pots') return Math.max(0, (S.shop.pots || 2) - 2);
  if (id === 'menu') return Math.max(0, Math.round(((S.shop.menu || 8) - 8) / 4));
  if (id === 'yard') return S.shop.yard || 0;
  if (id === 'decor') return S.shop.decor || 0;
  return 0;
}
function upgradeCurrentText(id) {
  if (id === 'seats') return `${S.shop.seats} 座`;
  if (id === 'pots') return `${S.shop.pots} 眼`;
  if (id === 'menu') return `${S.shop.menu} 道`;
  if (id === 'yard') return S.shop.yard ? '有井' : '没井';
  if (id === 'decor') return `${S.shop.decor} 级`;
  return '';
}
function openLedger() {
  const box = $('#modal-box');
  const rows = SHOP_UPGRADES.map(u => {
    const lv = upgradeLevel(u.id);
    const next = u.levels[lv];
    const max = lv >= u.levels.length;
    const locked = !!u.locked;
    return `<div class="ledger-row">
      <div class="ledger-info">
        <div class="ledger-name">${u.name}<span>${upgradeCurrentText(u.id)}</span></div>
        <div class="ledger-desc">${next ? next.text : `${u.desc}（已到顶）`}</div>
      </div>
      <span class="ledger-btns">
        ${u.id === 'menu' ? '<button class="btn btn-small" data-act="open-menu">配置</button>' : ''}
        ${max ? '<span class="ledger-lock">已到顶</span>' : `<button class="btn btn-small" data-act="upgrade" data-id="${u.id}">${next.cost} 铜</button>`}
      </span>
    </div>`;
  }).join('');
  box.innerHTML = `<div class="ledger">
    <h3>账本 · 家什</h3>
    <p class="ledger-sub">铜 ${S.money} · 账 ${S.debts} · 口碑 ${S.fame || 0}</p>
    ${rows}
    <button class="btn btn-ghost" data-act="close-modal">合上账本</button>
  </div>`;
  showModal();
}
// ---------- 今日菜单配置（M8.2） ----------
function openMenuConfig() {
  const box = $('#modal-box');
  const cur = menuList();
  box.innerHTML = `
    <div class="menu-panel">
      <h3>今日菜单 · ${cur.length}/${S.shop.menu}</h3>
      <p class="ledger-sub">客人按口味从这上面点；菜单里没有合口味的，会挑最便宜的，还扣一星。</p>
      <div class="menu-grid">
        ${Object.entries(RECIPES).map(([id, r]) => {
          const on = cur.includes(id);
          return `<button class="menu-item ${on ? 'on' : ''}" data-act="toggle-menu" data-recipe="${id}">
            <b>${r.name}</b><span>${RECIPE_TASTE[id] || '随便'} · ${r.price} 铜</span>
          </button>`;
        }).join('')}
      </div>
      <button class="btn btn-ghost" data-act="close-modal">合上</button>
    </div>`;
  showModal();
}
function toggleMenu(id) {
  if (!RECIPES[id]) return;
  const cur = menuList().slice();
  const i = cur.indexOf(id);
  if (i >= 0) cur.splice(i, 1);
  else if (cur.length < S.shop.menu) cur.push(id);
  else { toast('菜单位满了，先拿下一道'); return; }
  S.menu = cur;
  save();
  openMenuConfig();
}

function applyUpgrade(id) {
  const def = SHOP_UPGRADES.find(u => u.id === id);
  if (!def || def.locked) return;
  const lv = upgradeLevel(id);
  const next = def.levels[lv];
  if (!next) { toast('已经到顶了'); return; }
  if (S.money < next.cost) { toast(`还差 ${next.cost - S.money} 铜`); return; }
  S.money -= next.cost;
  if (id === 'seats') S.shop.seats = next.value;
  else if (id === 'pots') { S.shop.pots = next.value; ensurePots(next.value); }
  else if (id === 'menu') S.shop.menu = next.value;
  else if (id === 'yard') S.shop.yard = next.value;
  else if (id === 'decor') S.shop.decor = next.value;
  save();
  Sfx.play('coin');
  unlockAchievement('first_upgrade');
  toast(`${def.name}升级：${next.text}`);
  render();
  openLedger();
}

// ---------- 成就（M4.4） ----------
function unlockAchievement(id) {
  if (!S.achievements) S.achievements = [];
  if (S.achievements.includes(id)) return;
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  S.achievements.push(id);
  save();
  Sfx.play('unlock');
  toast(`成就解锁：${a.name}`);
}

// ---------- 每日挑战（M4.4 榜单预留） ----------
function rollChallenge() {
  const ch = CHALLENGES[(S.day - 1) % CHALLENGES.length];
  S.challenge = { id: ch.id, name: ch.name, desc: ch.desc, done: false };
}

// 客人耐心（M8.1）：等满 90 秒自动起身走人，口碑 -3
setInterval(() => {
  if (!S.night || S.night.stage !== 'serving') return;
  const expired = S.night.guests.filter(g => g.stage === 'waiting' && guestPatience(g).sec >= 90);
  if (!expired.length) return;
  expired.forEach(g => {
    const c = CUSTOMERS[g.cid];
    dropGuest(g.cid);
    addFame(-3);
    toast(`${c.name}等太久，起身走了（口碑 -3）`);
  });
  save();
  render();
}, 1000);

// ---------- 事件 ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const d = el.dataset;
  switch (act) {
    case 'new-game':
    case 'new-day':
      clearSave();
      S = freshState();
      S.resumePhase = null;
      S.phase = 'day';
      rollChallenge();
      rollWeather();
      resetPots();
      MapScene.resetPos();
      save();
      render();
      break;
    case 'continue':
      S.phase = S.resumePhase || 'day';
      S.resumePhase = null;
      save();
      render();
      break;
    case 'toggle-muted':
      if (typeof Sfx !== 'undefined') {
        Sfx.setMuted(!Sfx.muted);
        updateHud();
        if (!Sfx.muted) render();
      }
      break;
    case 'quit':
      if (S.phase !== 'title') {
        S.resumePhase = S.phase;
        S.phase = 'title';
      }
      MapScene.stop();
      closeModal();
      save();
      render();
      break;
    case 'visit-run': visitRun(d.run); break;
    case 'run-select': break;
    case 'back-to-shop': goNight(); break;
    case 'open-deal': openDeal(d.good, Number(d.qty) || 1); break;
    case 'deal-qty':
      if (S.deal) { S.deal.qty = Number(d.qty) || 1; S.deal.quote = null; S.deal.round = 0; renderDealModal(); }
      break;
    case 'bid': bidDeal(Number(d.n)); break;
    case 'accept-quote': acceptQuote(); break;
    case 'deal-walk': dealWalk(); break;
    case 'plot-till': tillPlot(); break;
    case 'plot-sow': openSowModal(); break;
    case 'sow-crop': sowCrop(d.crop); break;
    case 'plot-water': waterPlot(); break;
    case 'plot-harvest': harvestPlot(); break;
    case 'fish-cast': fishCast(); break;
    case 'fish-reel': fishReel(); break;
    case 'open-sell': openSellPanel(); break;
    case 'sell-good': sellGood(d.good, Number(d.qty) || 1); break;
    case 'open-bag': openBag(); break;
    case 'open-ledger': openLedger(); break;
    case 'open-menu': openMenuConfig(); break;
    case 'toggle-menu': toggleMenu(d.recipe); break;
    case 'upgrade': applyUpgrade(d.id); break;
    case 'interact':
      if (MapScene.interactable) onHotTile(MapScene.interactable);
      break;
    case 'ranch-buy': buyChicken(); break;
    case 'ranch-feed': feedChickens(); break;
    case 'ranch-collect': collectEggs(); break;
    case 'home-sleep':
      S.phase = 'settle';
      S.night = null;
      closeModal();
      render();
      break;
    case 'open-event': openEventModal(d.event); break;
    case 'event-choose': chooseEvent(d.event, d.choice); break;
    case 'event-judge': eventJudge(d.event, d.who); break;
    case 'open-journal': openJournal(); break;
    case 'open-achievements': openAchievements(); break;
    case 'close-modal': closeModal(); break;
    case 'open-shop': openShop(); break;
    case 'pot-select': openPotSelect(Number(d.pot)); break;
    case 'pick-recipe': pickRecipe(d.recipe); break;
    case 'flip': flipPot(Number(d.pot)); break;
    case 'serve': serveTo(Number(d.cid)); break;
    case 'send-off': sendOff(Number(d.cid)); break;
    case 'close-shop': finishNight(); break;
    case 'year-end': openYearEnd(); break;
    case 'keep-going': keepGoing(); break;
    case 'restart-year': restartYear(); break;
    case 'next-day': nextDay(); break;
    case 'restart':
      clearSave();
      S = freshState();
      resetPots();
      render();
      break;
  }
});

// ---------- 地图/店内输入：点击走 + 方向键（按住连续走） ----------
document.getElementById('map').addEventListener('click', mapCanvasClick);
document.getElementById('shop').addEventListener('click', shopCanvasClick);

function shopCanvasClick(e) {
  const cv = ShopScene.cv;
  if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const sx = (e.clientX - rect.left) / rect.width;
  const sy = (e.clientY - rect.top) / rect.height;
  const px = sx * SHOP_CW, py = sy * SHOP_CH;
  const gx = Math.floor((px - ShopScene.ox) / SHOP_TILE);
  const gy = Math.floor(py / SHOP_TILE);
  if (gx < 0 || gy < 0 || gx >= SHOP_W || gy >= SHOP_H) return;
  ShopScene.moveTo(gx, gy);
}

document.addEventListener('keydown', (e) => {
  // 空格：与脚下的热区互动（M7 星露谷式）
  if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
    const scene0 = S.phase === 'day' ? MapScene : (S.phase === 'night' ? ShopScene : null);
    if (scene0 && scene0.running && scene0.interactable) {
      e.preventDefault();
      onHotTile(scene0.interactable);
    }
    return;
  }
  const scene = S.phase === 'day' ? MapScene : (S.phase === 'night' ? ShopScene : null);
  if (!scene || !scene.running) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dir = MAP_KEYS[k];
  if (!dir) return;
  e.preventDefault();
  scene.held[dir] = true;
  if (scene.path.length === 0) {
    const mv = MAP_KEYS_MV[dir];
    scene.step(mv[0], mv[1]);
  }
});
document.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dir = MAP_KEYS[k];
  if (!dir) return;
  if (MapScene.held) MapScene.held[dir] = false;
  if (ShopScene.held) ShopScene.held[dir] = false;
});
window.addEventListener('blur', () => {
  mapClearHeld();
  if (ShopScene.held) ShopScene.held = { up: false, down: false, left: false, right: false };
});
