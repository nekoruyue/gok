/* 流脉防线 · 可玩原型 v0.1
   纯前端，无依赖。设计案见 ../设计案/。 */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const TILE = 84, COLS = 13, ROWS = 7, BW = 1092, BH = 588;
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const DIRNAME = ['上','右','下','左'];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const fmt = (s) => {
  s = Math.max(0, Math.ceil(s));
  return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
};
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const center = (x,y) => ({ x: x*TILE + TILE/2, y: y*TILE + TILE/2 });
const cheb = (a,b) => Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- assets / audio ---------------- */
const IMG = {};
const PORTRAITS = ['莱恩','艾德里克','莫纳克','希斯蒂娜','提蒙','维里欧斯','欧莉卡斯','深雪'];
for (const n of PORTRAITS) {
  const im = new Image();
  im.src = 'assets/units/' + n + '.webp';
  IMG[n] = im;
}
let audioCtx = null, soundOn = true;
function sfx(kind) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    const cfg = {
      click: [520, .05, .03], deploy: [130, .18, .06], skill: [880, .22, .05],
      heal: [1180, .12, .035], leak: [210, .3, .06], seal: [70, .8, .07],
      warn: [300, .18, .05], report: [660, .2, .04],
    }[kind] || [440, .08, .03];
    o.type = kind === 'seal' ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(cfg[0], t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, cfg[0] * .55), t + cfg[1]);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(cfg[2], t + .012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cfg[1]);
    o.start(t); o.stop(t + cfg[1] + .02);
  } catch (e) { /* ignore */ }
}

/* ---------------- meta ---------------- */
const META_KEY = 'veinline.meta.v1';
let meta = { truth: 0, order: 0, seal: 0, clears: {} };
try { Object.assign(meta, JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch (e) {}
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
function metaText() { return `真值 ${meta.truth} · 秩序 ${meta.order} · 隐秘 ${meta.seal}`; }
function refreshMeta() {
  $('#meta-truth').textContent = `真值 ${meta.truth}`;
  $('#meta-order').textContent = `秩序 ${meta.order}`;
  $('#meta-seal').textContent = `隐秘 ${meta.seal}`;
  if ($('#meta-truth-2')) {
    $('#meta-truth-2').textContent = `真值 ${meta.truth}`;
    $('#meta-order-2').textContent = `秩序 ${meta.order}`;
    $('#meta-seal-2').textContent = `隐秘 ${meta.seal}`;
  }
}

/* ---------------- demo ---------------- */
let demoMode = false;
try { demoMode = new URLSearchParams(location.search).get('demo') === '1'; } catch (e) { /* file:// 下没有 search 也无所谓 */ }

/* ---------------- game state ---------------- */
const G = {
  screen: 'title',
  state: 'idle',
  stage: null,
  tiles: null,
  elapsed: 0,
  windowLeft: 0,
  quota: 18,
  instability: 0,
  peak: 0,
  units: [],
  enemies: [],
  effects: [],
  floaters: [],
  cards: [],
  leaks: 0,
  losses: 0,
  lostUnits: [],
  selectedUnit: null,
  selectedCard: null,
  pendingDeploy: null,
  pendingStrong: null,
  hover: null,
  mouse: { x: 0, y: 0 },
  paused: false,
  speed: 1,
  ended: false,
  result: null,
  sealTimer: 0,
  gateOpen: false,
  gateCooldown: 0,
  escort: null,
  redRing: 0,
  redTiles: new Set(),
  redPatches: [],
  ice: [],
  barriers: [],
  commandUses: 3,
  commandLimits: { ask: 1, wait: 2, recall: 1 },
  tagCd: {},
  tagUses: {},
  strongUses: 0,
  greenPassed: 0,
  ledger: { black: 0, reroute: 0, borrow: 0, strong: 0 },
  windowLog: [],
  upkeepSec: 0,
  upkeepAcc: 0,
  upkeepLog: [],
  escortHold: null,
  uid: 1,
  lastTs: 0,
  toastUntil: 0,
  screenShake: 0,
};
window.VL = { G };

/* ---------------- parsing ---------------- */
function parseMap(stage) {
  const tiles = [];
  for (let y = 0; y < ROWS; y++) {
    tiles[y] = [];
    for (let x = 0; x < COLS; x++) {
      const ch = (stage.map[y] || '')[x] || '#';
      tiles[y][x] = {
        ch,
        ground: ch === '.' || ch === 'S' || ch === 'P' || ch === 'V' || ch === '*' || ch === 'X' || ch === 'E',
        platform: ch === '=',
        blocked: ch === '#',
        vein: ch === '*',
        gate: ch === 'V',
        spawn: ch === 'S' || ch === 'X',
        exit: ch === 'E' || ch === 'P',
      };
    }
  }
  return tiles;
}
const tileAt = (x,y) => (G.tiles && G.tiles[y] && G.tiles[y][x]) || null;
const isGroundDeploy = (x,y) => {
  const t = tileAt(x,y); if (!t || t.blocked || t.platform) return false;
  return t.ch === '.' || t.ch === '*' || t.ch === 'V';
};
const isPlatformDeploy = (x,y) => {
  const t = tileAt(x,y); if (!t) return false;
  return t.platform || t.vein;
};
function unitOnTile(x,y) { return G.units.find(u => !u.dead && u.x === x && u.y === y); }
function pathPos(path, t) {
  const tt = clamp(t, 0, path.length - 1.00001);
  const i = Math.floor(tt), f = tt - i;
  const a = path[i], b = path[Math.min(i+1, path.length-1)];
  return { x: (a[0] + (b[0]-a[0]) * f + .5) * TILE, y: (a[1] + (b[1]-a[1]) * f + .5) * TILE };
}
function enemyPos(e) { return pathPos(e.path, e.t); }

/* ---------------- screens / modal ---------------- */
function showScreen(name) {
  G.screen = name;
  for (const s of ['title','select','battle']) {
    $('#screen-' + s).classList.toggle('active', s === name);
  }
  $('#modal').classList.add('hidden');
  if (name === 'select') { renderStageSelect(); refreshMeta(); }
  if (name === 'title') refreshMeta();
}
function openModal(html, dismissible = true) {
  $('#modal-card').innerHTML = html;
  $('#modal').classList.remove('hidden');
  $('#modal').onclick = dismissible ? (e) => { if (e.target === $('#modal')) closeModal(); } : null;
}
function closeModal() { $('#modal').classList.add('hidden'); }
window.VL.closeModal = closeModal;

/* ---------------- title / select / briefing ---------------- */
function bindTitle() {
  $('#btn-start').onclick = () => { sfx('click'); showScreen('select'); };
  $('#btn-rules').onclick = () => { sfx('click'); helpWasPause = false; showHelp(); };
  $('#btn-auth').onclick = () => { sfx('click'); showAuth(); };
  $('#btn-back-title').onclick = () => { showScreen('title'); };
  refreshMeta();
}
/* ---------------- 授权表（05 §3.3 / 08 §3.5，MVP 只到第 3 节点） ---------------- */
function authState(line, node) {
  if (node.n > AUTH_MVP) return 'unbound';
  return (meta[line] || 0) >= node.at ? 'on' : 'off';
}
function nextNode(line) {
  const L = AUTH_LINES[line];
  if (!L) return null;
  const val = meta[line] || 0;
  for (const nd of L.nodes) {
    if (nd.n > AUTH_MVP) break;
    if (nd.at > val) return nd;
  }
  return null;
}
function nextNodeText(line) {
  const L = AUTH_LINES[line];
  if (!L) return '—';
  const nd = nextNode(line);
  return nd ? ('第 ' + nd.n + ' 节点「' + nd.name + '」（' + L.name + ' ' + nd.at + '）') : '未装订（MVP 只到第 3 节点）';
}
function showAuth() {
  const cols = ['truth', 'order', 'seal'].map(k => {
    const L = AUTH_LINES[k];
    const val = meta[k] || 0;
    const rows = L.nodes.map(nd => {
      const st = authState(k, nd);
      const right = st === 'unbound' ? '未装订' : st === 'on' ? '已解锁' : ('需 ' + nd.at);
      return '<div class="auth-node ' + st + '"><span class="an-n">' + nd.n + '</span><span class="an-name">' + esc(nd.name) + '</span><span class="an-at">' + right + '</span><span class="an-eff">' + esc(nd.eff) + '</span></div>';
    }).join('');
    return '<div class="auth-col"><h4 style="color:' + L.color + '">' + L.name + '线 <span>' + val + '</span></h4>' + rows + '</div>';
  }).join('');
  const body = '<div class="modal-kicker">协调部 · 授权表</div>'
    + '<h2 class="modal-title">三条线，各 6 个节点</h2>'
    + '<div class="modal-body">'
    + '<p>MVP 只装订到第 3 节点；第 4～6 是缺页（未装订），不是灰锁。</p>'
    + '<div class="auth-grid">' + cols + '</div>'
    + '<div class="auth-note">节点由案卷三选一累计：真值 3／6／9，秩序 3／6／9，隐秘 1／4／6。数值并列时按「真值 &gt; 秩序 &gt; 隐秘」判定最高线（05 §3.5）。</div>'
    + '</div>'
    + '<div class="modal-actions"><button class="btn primary" id="auth-close">知道了</button></div>';
  openModal(body, true);
  $('#auth-close').onclick = closeModal;
}

function stageStars(id) {
  const c = meta.clears && meta.clears[id];
  return c ? c.stars || 0 : 0;
}
function renderStageSelect() {
  const list = $('#stage-list');
  const cards = [
    { id: 's1', art: 'assets/units/艾德里克.webp', stars: 3, locked: false },
    { id: 's2', art: 'assets/units/莱恩.webp', stars: 5, locked: false },
    { id: 's3', art: 'assets/units/欧莉卡斯.webp', stars: 4, locked: true },
  ];
  list.innerHTML = cards.map(c => {
    if (c.locked) {
      return `<div class="stage-card locked">
        <div class="stage-art" style="background-image:url('${c.art}')"></div>
        <div class="lock-label">下一版</div>
        <div class="sc-kicker">第一章 · 规程之外</div>
        <h3>锅炉舱</h3>
        <div class="sc-quote">“二百一十秒。所有模型给同一个数。”<br>芯体·回应体 · 2 阶段 · 10 名港区人员</div>
        <div class="sc-meta"><span>210 秒</span><span>Boss</span><span>零遗留</span></div>
        <div class="sc-stars">★★★★</div>
      </div>`;
    }
    const st = STAGES[c.id];
    const got = stageStars(c.id);
    return `<div class="stage-card" data-stage="${c.id}">
      <div class="stage-art" style="background-image:url('${c.art}')"></div>
      <div class="sc-kicker">${esc(st.chapter)} · ${esc(st.code)}</div>
      <h3>${esc(st.title)}</h3>
      <div class="sc-quote">${esc(st.quote)}</div>
      <div class="sc-meta"><span>窗口 <b>${fmt(st.window)}</b></span><span>${st.units.length} 值守</span><span>${esc(st.objective)}</span><span>${got ? '最佳 ' + '★'.repeat(got) : '未复演'}</span></div>
      <div class="sc-stars">${'★'.repeat(c.stars)}${'☆'.repeat(5-c.stars)}</div>
    </div>`;
  }).join('');
  for (const el of list.querySelectorAll('[data-stage]')) {
    el.onclick = () => { sfx('click'); showBriefing(el.dataset.stage); };
  }
}
function showBriefing(stageId) {
  const st = STAGES[stageId];
  const units = st.units.map(id => {
    const u = UNIT_TYPES[id];
    return `<span class="brief-unit"><img src="${u.portrait}" alt=""><b>${u.name}</b><small>${u.cls} · ${u.cost}</small></span>`;
  }).join('');
  openModal(`
    <div class="modal-kicker">${esc(st.chapter)} · 窗口复演</div>
    <h2 class="modal-title">${esc(st.code)}「${esc(st.title)}」</h2>
    <div class="modal-quote">${esc(st.quote)}</div>
    <div class="modal-body">
      <p>${esc(st.brief)}</p>
      <h4>目标</h4>
      <div class="modal-box"><b>${esc(st.objective)}</b>　窗口 ${fmt(st.window)}　${st.instability ? '失稳开放' : '失稳关闭'}<br>${st.starText.map((s,i)=>`${'★'.repeat(i+1)} ${esc(s)}`).join('　')}</div>
      <h4>编组</h4>
      <div class="brief-units">${units}</div>
      <h4>值班提示</h4>
      <ul class="tut-list">${(st.tutorial||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" id="brief-back">返回窗口表</button>
      <button class="btn primary" id="brief-start">开始窗口</button>
    </div>
  `);
  $('#brief-back').onclick = closeModal;
  $('#brief-start').onclick = () => { sfx('click'); closeModal(); startStage(stageId); };
}
function showHelp() {
  openModal(`
    <div class="modal-kicker">值班手册 · 第一页</div>
    <h2 class="modal-title">怎么看这张沙盘</h2>
    <div class="modal-body">
      <p><b>接入</b>：点左侧值守 → 点地面/台面 → 点四向箭头。接入花<b>配额</b>，不花“能量”。</p>
      <p><b>拦截</b>：近战值守挡住敌人；敌人被拦下才会停下互殴。朝向决定他看得见哪一边。</p>
      <p><b>窗口</b>：顶部倒计时是<b>可花的钱</b>：强接 −8 秒、紧急撤离 −4 秒、改道 −15 秒。调度可以“借秒”：30 配额 → +10 秒。</p>
      <p><b>失稳</b>：越权、改道、黑签都会推高它；25/50/75 扩红区，100 强制封场。红区会烧台面。</p>
      <p><b>三签（四色）</b>：红签集火（+20% 受伤／15 秒冷却）、黄签迟滞（−40% 移速／10 秒冷却）、绿签放行（每关 4 次，只对训练假人／中立有效）、黑签销掉一个目标（每关 3 次／+5 失稳／不进击杀）。</p>
      <p><b>三星</b>：★ 完成主目标；★★ 零损员；★★★ 零遗留。别让名字变成余数。</p>
      <h4>操作</h4>
      <ul class="tut-list">
        <li>1–4 选值守；右键 / Esc 取消；空格暂停。</li>
        <li>点已接入的值守：撤除、紧急撤离、技能。</li>
        <li>提蒙站在脉闸旁：可改道；改道是双向的。</li>
      </ul>
    </div>
    <div class="modal-actions"><button class="btn primary" id="help-close">知道了</button></div>
  `, false);
  $('#help-close').onclick = () => {
    closeModal();
    if (helpWasPause) { G.paused = false; helpWasPause = false; }
  };
}
let helpWasPause = false;
window.VL.showHelp = showHelp;

/* ---------------- stage start ---------------- */
function startStage(stageId) {
  clearTimeout(resultTimer);
  const st = STAGES[stageId];
  G.stage = { ...st, waves: st.waves.map(w => ({ ...w, spawned: 0 })) };
  G.tiles = parseMap(st);
  G.elapsed = 0;
  G.windowLeft = st.window;
  G.quota = st.startQuota;
  G.instability = 0;
  G.peak = 0;
  G.units = [];
  G.enemies = [];
  G.effects = [];
  G.floaters = [];
  G.lostUnits = [];
  G.leaks = 0;
  G.losses = 0;
  G.selectedUnit = null;
  G.selectedCard = null;
  G.pendingDeploy = null;
  G.pendingStrong = null;
  G.hover = null;
  G.paused = false;
  G.speed = 1;
  G.ended = false;
  G.result = null;
  G.sealTimer = 0;
  G.gateOpen = false;
  G.gateCooldown = 0;
  G.redRing = 0;
  G.redTiles = new Set();
  G.redPatches = [];
  G.ice = [];
  G.barriers = [];
  G.commandUses = 3;
  G.commandLimits = { ask: 1, wait: 2, recall: 1 };
  G.uid = 1;
  G.state = 'playing';
  G.screenShake = 0;
  /* ?demo=1：补 5 种敌人的演示波（只在本机看效果，不改关卡数据） */
  if (demoMode) {
    const keys = Object.keys(st.spawns || { S1: [0, 0] });
    ['weaver', 'gunner', 'guard', 'gladi', 'oil'].forEach((type, i) => {
      G.stage.waves.push({ at: 10 + i * 6, spawn: keys[i % keys.length], type, count: 1, interval: 0, spawned: 0 });
    });
  }
  const roster = demoMode ? st.units.concat(['ocaris', 'shiser'].filter(id => st.units.indexOf(id) < 0)) : st.units;
  G.cards = roster.map(id => ({ id, onField: false, cd: 0, unitId: null }));
  G.tagCd = {}; G.tagUses = {};
  for (const k in TAG_RULES) { G.tagCd[k] = 0; G.tagUses[k] = TAG_RULES[k].uses; }
  G.strongUses = 0;
  G.greenPassed = 0;
  G.ledger = { black: 0, reroute: 0, borrow: 0, strong: 0 };
  G.windowLog = [];
  G.upkeepSec = 0; G.upkeepAcc = 0; G.upkeepLog = [];
  G.escortHold = null;
  G.escort = st.escort ? {
    ...st.escort, hp: st.escort.hp, maxHp: st.escort.hp,
    t: 0, path: st.escortPath, done: false, attackCd: 0, atDoor: false,
    pauses: (st.escort.pauses || []).map(p => ({ ...p, consumed: false })),
  } : null;
  /* 08 §3.6：训练假人（中立，只接受绿签） */
  for (const n of (st.neutrals || [])) spawnEnemy(n.spawn, 'dummy');
  $('#btn-speed').textContent = '1×';
  $('#stage-code').textContent = st.code;
  $('#stage-title').textContent = st.title;
  $('#instability').classList.toggle('hidden', !st.instability);
  $('#roster-count').textContent = `${roster.length}/${roster.length}`;
  $('#objective-chip').textContent = st.objective;  $('#star-chips').innerHTML = st.starText.map((s,i)=>`<span class="star-chip" data-star="${i+1}">${'★'.repeat(i+1)} ${s}</span>`).join('');
  $('#roster-note').innerHTML = st.instability
    ? '失稳会扩红区；红区专杀台面。改道/黑签都会记账。'
    : '接入不消耗“能量”，只占通道带宽。撤除返还 30%。';
  showScreen('battle');
  renderRoster();
  updateHud();
  updateActions();
  toast(st.instability ? '窗口开启：100 秒。第九十九秒封场。' : '窗口开启：180 秒。先接一个人，守住 L3。', 3200);
  sfx('seal');
  if (G.lastTs === 0) requestAnimationFrame(loop);
}

/* ---------------- roster ---------------- */
function renderRoster() {
  const box = $('#cards');
  box.innerHTML = G.cards.map((c, i) => {
    const u = UNIT_TYPES[c.id];
    return `<div class="unit-card" data-card="${c.id}" data-index="${i}">
      <img class="uc-portrait" src="${u.portrait}" alt="">
      <div class="uc-main">
        <div class="uc-name"><b>${u.name}</b><span>${u.code ? '「'+u.code+'」' : ''}</span></div>
        <div class="uc-class">${u.cls} · ${u.block} 拦截</div>
        <div class="uc-status" data-status>待接入</div>
      </div>
      <div class="uc-cost">${u.cost}</div>
    </div>`;
  }).join('');
  for (const el of box.querySelectorAll('[data-card]')) {
    el.onclick = () => onCardClick(el.dataset.card);
  }
}
function onCardClick(id) {
  if (G.state !== 'playing') return;
  const card = G.cards.find(c => c.id === id);
  if (!card) return;
  if (card.onField) {
    const u = G.units.find(x => x.id === card.unitId);
    if (u) { selectUnit(u); sfx('click'); }
    return;
  }
  if (card.cd > 0) { toast(`再接入还要 ${Math.ceil(card.cd)} 秒。`, 1600); return; }
  G.selectedCard = (G.selectedCard === id ? null : id);
  G.selectedUnit = null;
  G.pendingDeploy = null;
  G.pendingStrong = null;
  sfx('click');
  updateActions();
  if (G.selectedCard) toast('在地图上选一个合法格，然后选朝向。', 1800);
}
function selectUnit(u) {
  G.selectedUnit = u;
  G.selectedCard = null;
  G.pendingDeploy = null;
  G.pendingStrong = null;
  updateActions();
}

/* ---------------- loop ---------------- */
function loop(ts) {
  if (!G.lastTs) G.lastTs = ts;
  let dt = Math.min(.05, (ts - G.lastTs) / 1000);
  G.lastTs = ts;
  if (G.screen === 'battle') {
    if (!G.paused && G.state === 'playing') update(dt * G.speed);
    draw();
    updateHud();
    updateActions();
  }
  requestAnimationFrame(loop);
}

function quotaRate() {
  let r = .9;
  if (G.units.some(u => u.id === 'timon')) r += .2;
  /* 脉点：站上去配额 +0.3/秒（00 §7.2／02 §7.1）；多人站只算一次 */
  if (G.units.some(u => { const t = tileAt(u.x, u.y); return !!(t && t.vein); })) r += .3;
  return r;
}
/* 带宽占用（维持费）：每个在场值守 −0.1 配额/秒（08 §3.1） */
function upkeepRate() {
  return G.units.filter(u => !u.dead).length * ECON_RULES.upkeepPerUnit;
}
/* 秒账本：只记事件，不做二次计算（08 §3.2「数据来源」） */
function logWindow(action, sec, note) {
  G.windowLog.push({ t: +G.elapsed.toFixed(1), action: action, sec: sec, note: note || '' });
}
function showUpkeepLine(bill, broke) {
  const el = $('#upkeep-line');
  if (!el) return;
  el.textContent = broke
    ? '带宽占用 −' + bill + ' · 欠费 +' + ECON_RULES.debtInstability + ' 失稳'
    : '带宽占用 −' + bill;
  el.classList.toggle('debt', !!broke);
  el.classList.add('show');
  const panel = $('#quota-panel');
  if (panel) panel.classList.toggle('debt', !!broke);
  clearTimeout(showUpkeepLine._t);
  showUpkeepLine._t = setTimeout(() => {
    el.classList.remove('show');
    if (panel) panel.classList.remove('debt');
  }, 2600);
}
/* 每 30 秒结一次带宽账：账单 = 0.1 × 在场人数 × 30；缴不上就扣到 0 并 +2 失稳 */
function tickUpkeep(dt) {
  const up = upkeepRate();
  if (up > 0) { G.upkeepSec += dt; G.upkeepAcc += up * dt; }
  const due = G.upkeepSec >= ECON_RULES.upkeepCycle || (up <= 0 && G.upkeepAcc >= 0.5);
  if (!due) return;
  const bill = Math.round(G.upkeepAcc);
  G.upkeepSec = 0; G.upkeepAcc = 0;
  if (bill <= 0) return;
  const broke = G.quota < bill;
  G.quota = clamp(G.quota - bill, 0, 99);
  G.upkeepLog.push({ t: +G.elapsed.toFixed(1), amount: -bill, broke: broke });
  if (broke && G.stage.instability) addInstability(ECON_RULES.debtInstability);
  showUpkeepLine(bill, broke && !!G.stage.instability);
}
function update(dt) {
  if (G.ended) { updateEffects(dt); return; }
  G.elapsed += dt;
  G.windowLeft -= dt;
  G.quota = clamp(G.quota + quotaRate() * dt, 0, 99);
  tickUpkeep(dt);
  if (G.gateCooldown > 0) G.gateCooldown -= dt;
  for (const k in G.tagCd) if (G.tagCd[k] > 0) G.tagCd[k] = Math.max(0, G.tagCd[k] - dt);
  spawnWaves();
  updateEscort(dt);
  updateEnemies(dt);
  updateUnits(dt);
  updateBarriers(dt);
  updateRed(dt);
  if (G.redPatches.length) G.redPatches = G.redPatches.filter(p => p.until > G.elapsed);
  if (G.ice.length) G.ice = G.ice.filter(i => i.until > G.elapsed);
  updateEffects(dt);
  checkEnd(dt);
}

/* ---------------- spawning ---------------- */
function spawnWaves() {
  for (const w of G.stage.waves) {
    while (w.spawned < w.count && G.elapsed >= w.at + w.spawned * (w.interval || 0)) {
      spawnEnemy(w.spawn, w.type);
      w.spawned++;
    }
  }
}
function spawnEnemy(spawnKey, typeId) {
  const def = ENEMY_TYPES[typeId];
  let path, gateIndex = -1, pre = null;
  if (G.stage.pre) {
    pre = G.stage.pre[spawnKey];
    const post = G.gateOpen ? G.stage.post.outer : G.stage.post.inner;
    path = pre.concat(post);
    gateIndex = pre.length - 1;
  } else {
    path = G.stage.paths[spawnKey];
  }
  const e = {
    id: 'e' + (G.uid++), typeId, ...def,
    maxHp: def.hp, hp: def.hp, t: 0, path, pre, gateIndex, baseInterval: def.interval,
    blockedBy: null, attackCd: def.interval * .6,
    slowUntil: 0, silenceUntil: 0, armorBreakUntil: 0,
    redTagUntil: 0, yellowUntil: 0, blackAt: 0, redTagged: false, green: false,
    record: 0, escortCd: 0, isSplit: false, dead: false,
    spawnKey,
  };
  G.enemies.push(e);
}
function spawnSplit(e) {
  for (let i = 0; i < 2; i++) {
    const def = ENEMY_TYPES.shard;
    const child = {
      id: 'e' + (G.uid++), typeId: 'shard', ...def,
      name: '碎屑', maxHp: 200, hp: 200, atk: 60, speed: .85, radius: 8,
      reward: 0, t: e.t, path: e.path, pre: e.pre, gateIndex: e.gateIndex,
      blockedBy: null, attackCd: .4, slowUntil: 0, silenceUntil: 0,
      armorBreakUntil: 0, redTagUntil: 0, yellowUntil: 0, blackAt: 0, redTagged: false, green: false,
      record: 0, escortCd: 0, isSplit: true, dead: false,
    };
    G.enemies.push(child);
  }
}

/* ---------------- enemy update ---------------- */
function unitById(id) { return G.units.find(u => u.id === id) || null; }
function enemyCost(e) { return e.weight >= 3 ? 2 : 1; }
function inRed(x, y) {
  if (G.redTiles.has(x + ',' + y)) return true;
  return G.redPatches.some(p => p.x === x && p.y === y && p.until > G.elapsed);
}
function iceAt(x, y) { return G.ice.some(i => i.x === x && i.y === y && i.until > G.elapsed); }
function addRedPatch(px, py, dur) {
  const cx = Math.floor(px / TILE), cy = Math.floor(py / TILE);
  const t = tileAt(cx, cy);
  if (!t || t.blocked) return;
  G.redPatches.push({ x: cx, y: cy, until: G.elapsed + dur });
}
function barrierAt(x, y) { return G.barriers.find(b => b.x === x && b.y === y && b.until > G.elapsed); }

function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.hp <= 0) { killEnemy(e); continue; }
    if (e.blackAt && G.elapsed >= e.blackAt) { removeEnemy(e, true); continue; }
    if (e.record >= 3) e.silenceUntil = Math.max(e.silenceUntil, G.elapsed + .2);
    // blocked: keep fighting
    if (e.blockedBy) {
      const u = unitById(e.blockedBy);
      if (!u || u.dead) { e.blockedBy = null; }
      else {
        e.attackCd -= dt;
        if (e.attackCd <= 0 && G.elapsed >= e.silenceUntil) {
          if (e.ramp) e.interval = e.baseInterval * (1 - .08 * Math.min(4, Math.floor((1 - e.hp / e.maxHp) / .25)));
          e.attackCd = e.interval;
          damageUnit(u, e.atk, e.attackType || 'phys', e);
        }
        continue;
      }
    }
    // ranged enemy: stop and shoot platform operators
    if (e.ranged) {
      const target = rangedTarget(e);
      if (target) {
        e.attackCd -= dt;
        if (e.attackCd <= 0 && G.elapsed >= e.silenceUntil) {
          e.attackCd = e.interval;
          damageUnit(target, e.atk, e.attackType || 'arts', e);
        }
        continue;
      }
    }
    // escort aggro: if adjacent and no operator nearby (ranged enemies only shoot platforms)
    const ep = enemyPos(e);
    if (G.escort && !G.escort.done && !e.ranged) {
      const esp = pathPos(G.escort.path, G.escort.t);
      if (dist(ep, esp) < .85 * TILE && G.elapsed >= e.silenceUntil) {
        const near = G.units.some(u => u.block > 0 && !u.dead && dist(center(u.x,u.y), ep) < 1.15 * TILE);
        if (!near) {
          e.attackCd -= dt;
          if (e.attackCd <= 0) {
            e.attackCd = 1.5;
            damageEscort(e.atk, e);
          }
          continue;
        }
      }
    }
    // move
    const slow = (e.slowUntil > G.elapsed || e.yellowUntil > G.elapsed) ? .6 : 1;
    const cur = e.path[Math.min(e.path.length - 1, Math.floor(e.t))] || [-1, -1];
    const red = inRed(cur[0], cur[1]);
    const curTile = tileAt(cur[0], cur[1]);
    const onVein = !!(curTile && curTile.vein);   /* 脉点：敌人经过 −15% 速度（00 §7.2） */
    /* 冰面：该格 −40%（蹼行兽【踏浪】免疫，02 §5.2）；深雪普攻：−15% 1 秒 */
    const ice = (e.id !== 'fin' && iceAt(cur[0], cur[1])) ? .6 : 1;
    const chill = (e.chillUntil > G.elapsed) ? .85 : 1;
    const speed = e.speed * slow * (red ? 1.15 : 1) * (onVein ? .85 : 1) * ice * chill;
    let nextT = e.t + speed * dt;
    // barrier check
    const idx = Math.min(e.path.length - 1, Math.floor(nextT) + 1);
    const cell = e.path[idx];
    if (cell && barrierAt(cell[0], cell[1])) continue;
    // block check
    const nextPos = pathPos(e.path, nextT);
    const blocker = findBlocker(e, nextPos);
    if (blocker) {
      e.blockedBy = blocker.id;
      blocker.blocked.add(e.id);
      continue;
    }
    e.t = nextT;
    if (e.t >= e.path.length - 1) leakEnemy(e);
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}
function findBlocker(e, nextPos) {
  if (e.neutral || e.green) return null;        /* 中立／绿签：不拦截 */
  let best = null, bd = 1e9;
  for (const u of G.units) {
    if (u.dead || u.block <= 0) continue;
    if (u.blocked.size + enemyCost(e) > u.block) continue;
    const dv = DIRS[u.dir];
    const fp = center(u.x + dv[0], u.y + dv[1]);
    const d = dist(fp, nextPos);
    if (d < .95 * TILE && d < bd) { bd = d; best = u; }
  }
  return best;
}
function rangedTarget(e) {
  let best = null, bd = 1e9, ba = -1;
  for (const u of G.units) {
    if (u.dead || !u.platform) continue;
    const d = dist(enemyPos(e), center(u.x,u.y));
    if (d > e.ranged * TILE + 10) continue;
    if (e.pickHighestAtk) {
      /* 帝国工造铳手【压制】：专杀 ATK 最高的那个（02 §5.2） */
      if (u.atk > ba || (u.atk === ba && d < bd)) { ba = u.atk; bd = d; best = u; }
    } else if (d < bd) { bd = d; best = u; }
  }
  return best;
}
function leakEnemy(e) {
  e.dead = true;
  /* 训练假人／绿签：走完全程＝放行，不计漏、不计损（08 §3.6／00 §11） */
  if (e.neutral || e.green) {
    /* 只有被绿签标过的才算「训练目标放行」，没签的假人自己走掉、不计数 */
    if (e.green) {
      G.greenPassed = (G.greenPassed || 0) + 1;
      addEffect({ type: 'text', x: enemyPos(e).x, y: enemyPos(e).y, text: '放行', color: '#7fb87f', life: .9, maxLife: .9 });
      toast(`${e.neutral ? '训练假人' : e.name} 放行（${G.greenPassed}）——不计漏、不计损。`, 2000);
    }
    return;
  }
  G.leaks++;
  addEffect({ type: 'ring', x: enemyPos(e).x, y: enemyPos(e).y, color: '#d45a4c', radius: 30, life: .5, maxLife: .5 });
  toast(`漏怪：${e.name}（本窗口已漏 ${G.leaks}）`, 1800);
  sfx('leak');
  if (!G.stage.instability && G.leaks >= 3) failStage('漏怪 3 个，封锁线破了。');
}
function removeEnemy(e, black) {
  e.dead = true;
  if (black) {
    G.ledger.black = (G.ledger.black || 0) + 1;
    e.green = false;
    G.quota = clamp(G.quota + 6, 0, 99);
    addInstability(5);
    addEffect({ type: 'text', x: enemyPos(e).x, y: enemyPos(e).y, text: '销', color: '#c9b8d6', life: .8, maxLife: .8 });
    toast('黑签生效：+6 配额，失稳 +5。', 1800);
  }
  for (const u of G.units) u.blocked.delete(e.id);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  if (e.neutral) return;                         /* 训练假人不计击杀、不掉配额 */
  const p = enemyPos(e);
  G.quota = clamp(G.quota + (e.reward || 0), 0, 99);
  addEffect({ type: 'ring', x: p.x, y: p.y, color: '#d9b46a', radius: 20, life: .35, maxLife: .35 });
  /* 白烟织体【织雾】：死亡时脚下留 1 格失稳区 8 秒（02 §5.2） */
  if (e.onDeath === 'weave') {
    addRedPatch(p.x, p.y, 8);
    addEffect({ type: 'text', x: p.x, y: p.y - 22, text: '织雾', color: '#b5483e', life: 1.1, maxLife: 1.1 });
  }
  /* 走私火油车【爆燃】：周围 1 格 450 物理 + 脚下失稳区 6 秒（02 §5.2） */
  if (e.onDeath === 'oil') {
    addRedPatch(p.x, p.y, 6);
    addEffect({ type: 'ring', x: p.x, y: p.y, color: '#c07a3a', radius: 1.5 * TILE, life: .6, maxLife: .6 });
    for (const u of G.units) {
      if (u.dead) continue;
      if (dist(center(u.x,u.y), p) <= 1.5 * TILE) damageUnit(u, 450, 'phys', e);
    }
    if (G.escort && !G.escort.done && dist(pathPos(G.escort.path, G.escort.t), p) <= 1.5 * TILE) damageEscort(450, e);
    toast('火油车爆燃：周围 1 格 450 物理。', 2000);
  }
  if (e.split && !e.isSplit) spawnSplit(e);
  for (const u of G.units) u.blocked.delete(e.id);
}
function damageEnemy(e, amount, opts = {}) {
  if (e.dead || e.neutral) return;
  let dmg = amount;
  const type = opts.type || 'phys';
  const isPhys = type === 'phys';
  const isTrue = type === 'true';
  if (e.redTagUntil > G.elapsed) dmg *= 1.2;
  /* 帝国禁卫【铆甲】：物理 −40%、法术 +10%（02 §5.2） */
  if (e.riveted && !isTrue) dmg *= isPhys ? .6 : 1.1;
  if (!isTrue) {
    if (isPhys && e.armorBreakUntil > G.elapsed) dmg *= 1.3;
    if (isPhys) dmg = Math.max(dmg - e.def, dmg * .05);
    else dmg = Math.max(dmg * (1 - e.res / 100), dmg * .05);
  }
  e.hp -= dmg;
  addFloater(enemyPos(e).x, enemyPos(e).y - 18, Math.round(dmg), isTrue ? '#f0d49a' : isPhys ? '#f0d49a' : '#9fc9d6');
  if (e.hp <= 0) killEnemy(e);
}
function addInstability(v) {
  G.instability = clamp(G.instability + v, 0, 100);
  G.peak = Math.max(G.peak, G.instability);
  if (G.stage && G.stage.instability) updateRedZone();
  if (G.instability >= 100) failStage('失稳 100，强制封场。');
}

/* ---------------- units update ---------------- */
function updateUnits(dt) {
  for (const u of G.units) {
    if (u.dead) continue;
    u.charge = clamp(u.charge + 4 * dt, 0, 100);
    u.attackCd -= dt * (u.slowUntil > G.elapsed ? .85 : 1);
    if (u.attackCd > 0) continue;
    const target = findUnitTarget(u);
    if (u.clsKey === 'medic') {
      const ally = lowestHpAlly(u);
      if (ally && ally.hp < ally.maxHp) {
        healUnit(ally, u.heal);
        u.attackCd = u.interval;
        u.charge = clamp(u.charge + 2, 0, 100);
        continue;
      }
    }
    if (target) {
      u.attackCd = u.interval;
      u.charge = clamp(u.charge + 3, 0, 100);
      unitHit(u, target);
    }
  }
  for (const c of G.cards) {
    if (!c.onField && c.cd > 0) c.cd = Math.max(0, c.cd - dt);
  }
  // clean dead
  G.units = G.units.filter(u => !u.dead);
  if (G.selectedUnit && G.selectedUnit.dead) { G.selectedUnit = null; updateActions(); }
}
function lowestHpAlly(u) {
  let best = null, bp = 2;
  for (const a of G.units) {
    if (a.dead) continue;
    if (dist(center(a.x,a.y), center(u.x,u.y)) > u.range * TILE + 8) continue;
    const p = a.hp / a.maxHp;
    if (p < bp) { bp = p; best = a; }
  }
  return best;
}
function inFrontArc(u, e) {
  const c = center(u.x,u.y), ep = enemyPos(e);
  const dx = ep.x - c.x, dy = ep.y - c.y;
  const d = Math.hypot(dx,dy) || 1;
  const dv = DIRS[u.dir];
  return (dx * dv[0] + dy * dv[1]) / d > .15;
}
function findUnitTarget(u) {
  const c = center(u.x,u.y);
  const dir = DIRS[u.dir];
  let best = null, bs = -1;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.neutral || e.green) continue;         /* 中立／绿签：不攻击、不计数 */
    const ep = enemyPos(e);
    const d = dist(c, ep);
    if (!u.platform) {
      // 近战：先打自己被拦的，再打朝向那一格
      if (e.blockedBy === u.id) return e;
      const front = { x: c.x + dir[0] * TILE, y: c.y + dir[1] * TILE };
      if (dist(front, ep) < .95 * TILE && dist(c, ep) < 1.7 * TILE) {
        if (best === null || e.hp < best.hp) best = e;
      }
    } else {
      if (d > u.range * TILE + 8) continue;
      if (!inFrontArc(u, e)) continue;
      if (u.clsKey === 'arcanist') {
        /* 引术：强制选 DEF 最高的可达目标（02 §4.5） */
        if (e.def > bs || (e.def === bs && e.t > (best ? best.t : -1))) { bs = e.def; best = e; }
        continue;
      }
      const score = e.t;
      if (score > bs) { bs = score; best = e; }
    }
  }
  return best;
}
function unitHit(u, e) {
  let dmg = u.atk;
  if (u.id === 'monak' && u.hp / u.maxHp > .8) dmg *= 1.08;
  let type = u.attackType === 'arts' ? 'arts' : 'phys';
  /* 欧莉卡斯「越权解析」：10 秒内伤害 ×2，每次命中 +2 失稳（累计上限 +8，02 §4.5） */
  if (u.id === 'ocaris' && u.overclockUntil > G.elapsed) {
    dmg *= 2;
    if ((u.overclockInst || 0) < 8) {
      u.overclockInst = (u.overclockInst || 0) + 2;
      addInstability(2);
    }
  }
  /* 深雪普攻：附带 15% 减速 1 秒（02 §4.8） */
  if (u.id === 'shiser') e.chillUntil = Math.max(e.chillUntil || 0, G.elapsed + 1);
  if (u.clsKey === 'recorder') {
    e.record = Math.min(3, (e.record || 0) + 1);
    if (e.record >= 3) {
      type = 'true';
      e.silenceUntil = Math.max(e.silenceUntil, G.elapsed + 2);
      e.armorBreakUntil = Math.max(e.armorBreakUntil, G.elapsed + 6);
    }
  }
  if (u.clsKey === 'medic' && !lowestHpAlly(u)) dmg *= .8, type = 'arts';
  damageEnemy(e, dmg, { type });
  addEffect({ type: 'line', x: center(u.x,u.y).x, y: center(u.x,u.y).y, x2: enemyPos(e).x, y2: enemyPos(e).y, color: u.color, life: .16, maxLife: .16 });
  if (e.dead) {
    if (u.id === 'monak') G.quota = clamp(G.quota + 1, 0, 99);
  }
}
function healUnit(target, amount) {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = Math.round(target.hp - before);
  if (healed > 0) addFloater(center(target.x,target.y).x, center(target.x,target.y).y - 24, '+' + healed, '#8fd3c7');
  addEffect({ type: 'ring', x: center(target.x,target.y).x, y: center(target.x,target.y).y, color: '#8fd3c7', radius: 24, life: .35, maxLife: .35 });
  sfx('heal');
}
function damageUnit(u, amount, type, source) {
  if (u.dead) return;
  let dmg;
  if (type === 'arts') dmg = Math.max(amount * (1 - u.res / 100), amount * .05);
  else dmg = Math.max(amount - u.def, amount * .05);
  if (u.invulnUntil > G.elapsed) dmg = Math.min(dmg, Math.max(0, u.hp - 1));
  u.hp -= dmg;
  if (u.clsKey === 'bulwark') {
    if (!u.lastPassive || G.elapsed > u.lastPassive + 2) {
      u.lastPassive = G.elapsed;
      G.quota = clamp(G.quota + 1, 0, 99);
    }
    if (u.hp / u.maxHp <= .3 && !u.defBoost) { u.defBoost = true; u.def += 80; }
  }
  if (source && source.effect === 'slow') u.slowUntil = G.elapsed + 2;
  /* 帝国禁卫【钝击】：结算时目标 DEF 减半（每人一次，02 §5.2） */
  if (source && source.blunt && !u.blunted) {
    u.blunted = true;
    u.def = Math.round(u.def * .5);
    addFloater(center(u.x,u.y).x, center(u.x,u.y).y - 34, '钝击 DEF↓', '#b9a7e0');
  }
  addFloater(center(u.x,u.y).x, center(u.x,u.y).y - 20, '-' + Math.round(dmg), '#e08a72');
  if (u.hp <= 0) {
    const shex = G.units.find(x => x.id === 'shex' && !x.dead);
    if (shex && !u.saved && dist(center(shex.x,shex.y), center(u.x,u.y)) <= shex.range * TILE + 8) {
      u.saved = true; u.hp = 1;
      addEffect({ type: 'ring', x: center(u.x,u.y).x, y: center(u.x,u.y).y, color: '#8fd3c7', radius: 34, life: .6, maxLife: .6 });
      toast(`${u.name}：濒死止损（每关 1 次）`, 1800);
    } else {
      killUnit(u);
    }
  }
}
function killUnit(u) {
  if (u.dead) return;
  u.dead = true;
  G.losses++;
  const card = G.cards.find(c => c.id === u.id);
  if (card) { card.onField = false; card.unitId = null; card.cd = u.redeploy; }
  G.lostUnits.push({ id: u.id, x: u.x, y: u.y, dir: u.dir });
  for (const e of G.enemies) if (e.blockedBy === u.id) e.blockedBy = null;
  addEffect({ type: 'ring', x: center(u.x,u.y).x, y: center(u.x,u.y).y, color: '#b5483e', radius: 40, life: .7, maxLife: .7 });
  addEffect({ type: 'text', x: center(u.x,u.y).x, y: center(u.x,u.y).y - 30, text: '失联', color: '#e08a72', life: 1.2, maxLife: 1.2 });
  toast(`${u.name} 失联（${G.losses} 人）——撤除不算损员。`, 2200);
  sfx('leak');
  if (G.selectedUnit === u) { G.selectedUnit = null; updateActions(); }
}
function damageEscort(amount, source) {
  if (!G.escort || G.escort.done) return;
  G.escort.hp -= amount;
  const p = pathPos(G.escort.path, G.escort.t);
  const ep = source ? enemyPos(source) : null;
  G.lastEscortHit = {
    type: source && source.name, at: +G.elapsed.toFixed(1),
    ex: ep && +(ep.x / TILE - .5).toFixed(1), ey: ep && +(ep.y / TILE - .5).toFixed(1),
    blockedBy: source && source.blockedBy, ranged: source && source.ranged,
    escortT: +G.escort.t.toFixed(1), hp: Math.round(G.escort.hp),
  };
  addFloater(p.x, p.y - 22, '-' + Math.round(amount), '#e08a72');
  if (G.escort.hp <= 0) failStage('莱恩 HP 归零。他被留在了船里。');
}

/* ---------------- escort ---------------- */
function escortArrival() {
  if (!G.escort) return 0;
  const travel = (G.escort.path.length - 1) / G.escort.speed;
  const hold = (G.escort.pauses || []).reduce((a, p) => a + (p.dur || 0), 0);
  return travel + hold;
}
function updateEscort(dt) {
  if (!G.escort || G.escort.done) return;
  /* 医疗包 3 秒／舱内转向 2 秒：到点停一下（03 §3.3 → 全程 85 秒） */
  if (G.escortHold) {
    G.escortHold.left -= dt;
    if (G.escortHold.left > 0) return;
    G.escortHold = null;
  }
  const next = (G.escort.pauses || []).find(p => !p.consumed && G.escort.t >= p.at);
  if (next) {
    next.consumed = true;
    G.escortHold = { left: next.dur, total: next.dur, label: next.label };
    toast(`莱恩：${next.label} −${next.dur} 秒`, 1800);
    return;
  }
  const p = pathPos(G.escort.path, G.escort.t);
  if (inRed(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) {
    G.escort.hp -= 30 * dt;
  }
  G.escort.t += G.escort.speed * dt;
  if (G.escort.t >= G.escort.path.length - 1) {
    /* 08 §4.2 #3：只改道不借秒＝100−85−15＝0；与封场同帧算被封在门里 */
    if (G.windowLeft > 0.05) {
      G.escort.done = true;
      G.escort.t = G.escort.path.length - 1;
      const q = pathPos(G.escort.path, G.escort.t);
      addEffect({ type: 'ring', x: q.x, y: q.y, color: '#f0d49a', radius: 48, life: .9, maxLife: .9 });
      toast('莱恩抵达右舷破口。封场前，他出来了。', 3000);
      sfx('seal');
    } else {
      G.escort.t = G.escort.path.length - 1;
      if (!G.escort.atDoor) { G.escort.atDoor = true; toast('莱恩到了门口——门已经关了。', 2600); }
    }
  }
  if (G.escort.hp <= 0) failStage('莱恩 HP 归零。他被留在了船里。');
}

/* ---------------- red zone / barriers ---------------- */
function updateRedZone() {
  if (!G.stage || !G.stage.instability) return;
  /* 深雪「冰面」：冰在场上时不扩张（02 §4.8） */
  if (G.ice && G.ice.some(i => i.until > G.elapsed)) return;
  const src = G.stage.spawns.X;
  if (!src) return;
  let ring = 0;
  if (G.instability >= 75) ring = 3;
  else if (G.instability >= 50) ring = 2;
  else if (G.instability >= 25) ring = 1;
  if (ring <= G.redRing) return;
  G.redRing = ring;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tileAt(x,y);
      if (!t || t.blocked) continue;
      if (Math.max(Math.abs(x - src[0]), Math.abs(y - src[1])) <= ring) G.redTiles.add(x + ',' + y);
    }
  }
  addEffect({ type: 'text', x: 0, y: 0, text: '失稳 ' + G.instability, color: '#b5483e', life: 1.2, maxLife: 1.2 });
}
function updateRed(dt) {
  if (!G.stage || !G.stage.instability) return;
  for (const u of G.units) {
    if (u.dead) continue;
    if (inRed(u.x,u.y)) {
      u.hp -= 30 * dt;
      if (u.hp <= 0) killUnit(u);
    }
  }
  if (G.escort && !G.escort.done) {
    const p = pathPos(G.escort.path, G.escort.t);
    if (inRed(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) G.escort.hp -= 30 * dt;
    if (G.escort.hp <= 0) failStage('莱恩倒在了红区。');
  }
}
function updateBarriers(dt) {
  G.barriers = G.barriers.filter(b => b.until > G.elapsed);
}

/* ---------------- effects ---------------- */
function addEffect(o) { G.effects.push({ ...o, t: 0 }); }
function addFloater(x, y, text, color) {
  if (text === '') return;
  G.floaters.push({ x, y, text: String(text), color, t: 0, life: .8 });
}
function updateEffects(dt) {
  for (const e of G.effects) e.t += dt;
  G.effects = G.effects.filter(e => e.t < e.life);
  for (const f of G.floaters) { f.t += dt; f.y -= 22 * dt; }
  G.floaters = G.floaters.filter(f => f.t < f.life);
}

/* ---------------- end / result ---------------- */
function checkEnd(dt) {
  if (G.ended) return;
  if (G.escort && !G.escort.done && G.escort.hp <= 0) { failStage('莱恩 HP 归零。'); return; }
  if (G.stage.instability && G.instability >= 100) { failStage('失稳 100，强制封场。'); return; }
  if (G.windowLeft <= 0) {
    if (G.escort) {
      if (G.escort.done) winStage('封场前，莱恩已到破口。');
      else failStage('窗口归零。第九十九秒，门关上了。');
    } else {
      if (G.leaks >= 3) failStage('漏怪 3 个，封锁线破了。');
      else winStage('窗口归零，封锁线还在。');
    }
    return;
  }
  const allSpawned = G.stage.waves.every(w => w.spawned >= w.count);
  if (!G.escort && allSpawned && G.enemies.length === 0) {
    G.sealTimer += dt;
    if (G.sealTimer > 1.2) winStage('清场。窗口提前封场。');
  }
  if (G.escort && G.escort.done) {
    G.sealTimer += dt;
    if (G.sealTimer > 1.5) winStage('莱恩已到破口。');
  }
}
let resultTimer = null;
function starsFor(success) {
  if (!success) return 0;
  let s = 1;
  if (G.losses === 0) s++;
  if (G.leaks === 0 && (!G.escort || G.escort.done)) s++;
  return s;
}
function winStage(reason) {
  if (G.ended) return;
  G.ended = true;
  G.state = 'ended';
  const stars = starsFor(true);
  G.result = { success: true, stars, reason, leaks: G.leaks, losses: G.losses, peak: G.peak, windowLeft: G.windowLeft };
  if (meta.clears[G.stage.id] == null || stars > (meta.clears[G.stage.id].stars || 0)) {
    meta.clears[G.stage.id] = { stars };
  }
  saveMeta();
  sfx('seal');
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => { if (G.result) showResult(true); }, 550);
}
function failStage(reason) {
  if (G.ended) return;
  G.ended = true;
  G.state = 'ended';
  G.result = { success: false, stars: 0, reason, leaks: G.leaks, losses: G.losses, peak: G.peak, windowLeft: G.windowLeft };
  sfx('leak');
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => { if (G.result) showResult(false); }, 550);
}
/* 秒账本（08 §3.2）：固定四行 + 时间轴 + 一句话；数据只读本局 windowLog，不做二次模拟 */
function ledgerHTML(r) {
  const st = G.stage;
  const log = G.windowLog || [];
  const by = { strong: [], emergency: [], reroute: [], borrow: [] };
  for (const e of log) { if (by[e.action]) by[e.action].push(e); }
  const sum = (k) => by[k].reduce((a, e) => a + Math.abs(e.sec), 0);
  const borrows = by.borrow.filter(e => !e.note);
  const commands = by.borrow.filter(e => e.note === '再等十五秒');
  const gained = by.borrow.reduce((a, e) => a + e.sec, 0);
  const availParts = [st.window + ' 秒（窗口）'];
  if (borrows.length) availParts.push((borrows.length * 10) + ' 秒（借秒 ' + borrows.length + ' 次）');
  if (commands.length) availParts.push((commands.length * 15) + ' 秒（再等十五秒 ' + commands.length + ' 次）');
  const availText = gained ? (availParts.join(' ＋ ') + ' ＝ ' + (st.window + gained) + ' 秒') : availParts.join(' ＋ ');
  const spentParts = [];
  if (by.strong.length) spentParts.push('强接 ' + by.strong.length + ' 次 −' + sum('strong'));
  if (by.emergency.length) spentParts.push('紧急撤离 ' + by.emergency.length + ' 次 −' + sum('emergency'));
  if (by.reroute.length) spentParts.push('改道 ' + by.reroute.length + ' 次 −' + sum('reroute'));
  const spent = sum('strong') + sum('emergency') + sum('reroute');
  const spentText = spentParts.length ? spentParts.join('　') : '一秒没花';
  const remain = Math.max(0, Math.round(r.windowLeft || 0));
  const denom = Math.max(1, st.window + gained);
  const groups = {};
  for (const e of log) {
    const k = e.action + '@' + Math.floor(e.t);
    if (!groups[k]) groups[k] = { action: e.action, t: e.t, n: 0 };
    groups[k].n++;
  }
  const marks = Object.keys(groups).map(k => {
    const g = groups[k];
    const color = g.action === 'strong' ? '#e08a72' : g.action === 'emergency' ? '#e0c06a' : g.action === 'reroute' ? '#7fb8ae' : '#8fd3a0';
    const ch = g.action === 'borrow' ? '◇' : '▲';
    const left = Math.max(1, Math.min(99, g.t / denom * 100));
    return '<i class="ledger-mark" style="left:' + left.toFixed(1) + '%;color:' + color + '" title="' + g.action + ' @' + g.t + 's">' + ch + (g.n > 1 ? '×' + g.n : '') + '</i>';
  }).join('');
  const faces = (st.waves || []).reduce((a, w) => a + w.count, 0);
  const leaks = r.leaks || 0;
  let say;
  if (spent === 0) say = '你一秒没花。这一局没有需要买的东西。';
  else if (r.success) say = '你花了 ' + spent + ' 秒，换来 ' + Math.max(0, faces - leaks) + ' 个没漏的口子。';
  else say = '你花了 ' + spent + ' 秒。最后还是差 ' + Math.max(1, st.escort ? 1 : leaks) + ' 个。';
  return '<div class="ledger-card" id="ledger-card">'
    + '<div class="ledger-title">秒账本</div>'
    + '<div class="ledger-row"><b>可用</b><span>' + availText + '</span></div>'
    + '<div class="ledger-row"><b>花掉</b><span>' + spentText + '</span></div>'
    + '<div class="ledger-row"><b>封场时剩余</b><span>' + remain + ' 秒</span></div>'
    + '<div class="ledger-bar">' + marks + '</div>'
    + '<div class="ledger-ends"><span>0s</span><span>' + denom + 's</span></div>'
    + '<div class="ledger-say">' + say + '</div>'
    + '</div>';
}
function showResult(success) {
  if (!G.result) return;
  const r = G.result;
  const st = G.stage;
  const stars = success ? `<div class="stars">${'★'.repeat(r.stars)}<span class="off">${'★'.repeat(3-r.stars)}</span></div>` : '';
  const blackCount = (G.ledger && G.ledger.black) || 0;
  const blackMetric = blackCount ? `<div class="metric">黑签<b>${blackCount}</b></div>` : '';
  const greenCount = G.greenPassed || 0;
  const greenMetric = greenCount ? `<div class="metric">训练目标放行<b>${greenCount}</b></div>` : '';
  const metrics = `<div class="result-metrics">
    <div class="metric">漏怪<b>${r.leaks}</b></div>
    <div class="metric">损员<b>${r.losses}</b></div>
    <div class="metric">失稳峰值<b>${Math.round(r.peak)}</b></div>
    ${blackMetric}${greenMetric}
  </div>`;
  if (!success) {
    openModal(`
      <div class="modal-kicker">窗口复演 · 失败</div>
      <h2 class="modal-title">${esc(st.code)}「${esc(st.title)}」</h2>
      <div class="fail-lines">
        <div>${esc(r.reason)}</div>
        <div>漏怪 <b>${r.leaks}</b> · 损员 <b>${r.losses}</b> · 窗口剩余 <b>${fmt(r.windowLeft)}</b></div>
        <div>本窗口为复演，未写入正史。</div>
      </div>
      ${ledgerHTML(r)}
      <div class="modal-actions">
        <button class="btn ghost" id="res-quit">回窗口表</button>
        <button class="btn primary" id="res-retry">重开窗口</button>
      </div>
    `, false);
    $('#res-quit').onclick = () => { closeModal(); showScreen('select'); };
    $('#res-retry').onclick = () => { closeModal(); startStage(st.id); };
    return;
  }
  const reports = REPORTS.map(rep => {
    const gains = Object.entries(rep.gain).map(([k,v]) => `${k==='truth'?'真值':k==='order'?'秩序':'隐秘'} ${v>0?'+':''}${v}`).join(' · ');
    return `<div class="report" data-report="${rep.id}" data-line="${rep.authLine}">
      <div class="r-name" style="color:${rep.color}">${rep.name}</div>
      <div class="r-line">${rep.line}</div>
      <div class="r-body">${rep.body}</div>
      <div class="r-gain">${gains}</div>
      <div class="r-unlock">选择后将解锁：<b>${nextNodeText(rep.authLine)}</b></div>
    </div>`;
  }).join('');
  openModal(`
    <div class="modal-kicker">封场 · 结算</div>
    <h2 class="modal-title">${esc(st.code)}「${esc(st.title)}」</h2>
    ${stars}
    ${metrics}
    ${ledgerHTML(r)}
    <div class="modal-body">
      <p>${esc(r.reason)}</p>
      <h4>案卷 · 三份报告，选一份签字</h4>
      <div class="reports">${reports}</div>
      <div class="report-hint" id="report-hint">三份纸等重；预览只写解锁，不评价。</div>
      <p style="font-size:10px;color:var(--dim)">三星在封场那一刻就定了；案卷只决定你明天能翻开哪一页。</p>
    </div>
  `, false);
  for (const el of document.querySelectorAll('[data-report]')) {
    el.onclick = () => chooseReport(el.dataset.report);
    el.onmouseenter = () => {
      const hint = $('#report-hint');
      if (!hint) return;
      const L = AUTH_LINES[el.dataset.line];
      hint.textContent = (L ? L.name + '线 → ' : '') + nextNodeText(el.dataset.line);
    };
  }
}
function chooseReport(id) {
  const rep = REPORTS.find(r => r.id === id);
  if (!rep) return;
  for (const [k,v] of Object.entries(rep.gain)) meta[k] = Math.max(0, (meta[k]||0) + v);
  saveMeta();
  refreshMeta();
  sfx('report');
  toast(`案卷已归档：${rep.name}`, 2200);
  closeModal();
  showScreen('select');
}

/* ---------------- skills ---------------- */
function useSkill(u) {
  if (!u || u.dead) return;
  /* 越权解析：再按一次 = 提前关闭，不额外扣槽（02 §4.5「可提前关闭以止损」） */
  if (u.id === 'ocaris' && u.overclockUntil > G.elapsed) {
    u.overclockUntil = 0;
    toast('越权解析：提前关闭。', 1600);
    updateActions();
    return;
  }
  if (u.charge < u.skill.cost) return;
  if (u.id === 'aidric') castBarrier(u);
  else if (u.id === 'monak') castExecute(u);
  else if (u.id === 'verious') castRecord(u);
  else if (u.id === 'timon') castBorrow(u);
  else if (u.id === 'ocaris') castOverclock(u);
  else if (u.id === 'shiser') castIce(u);
  u.charge = Math.max(0, u.charge - u.skill.cost);
  sfx('skill');
  updateActions();
}
function castOverclock(u) {
  u.overclockUntil = G.elapsed + 10;
  u.overclockInst = 0;
  addEffect({ type: 'ring', x: center(u.x,u.y).x, y: center(u.x,u.y).y, color: '#b9a7e0', radius: 2.4 * TILE, life: .7, maxLife: .7 });
  toast('越权解析：10 秒伤害 ×2；每次命中 +2 失稳（上限 +8）。', 2400);
}
function castIce(u) {
  const d = DIRS[u.dir];
  let x = u.x + d[0], y = u.y + d[1];
  if (!tileAt(x, y) || tileAt(x, y).blocked) { x = u.x; y = u.y; }
  G.ice.push({ x, y, until: G.elapsed + 8 });
  addEffect({ type: 'ring', x: center(x,y).x, y: center(x,y).y, color: '#9fc9d6', radius: 1.2 * TILE, life: .7, maxLife: .7 });
  toast('冰面：8 秒内该格敌人减速 40%，失稳暂停扩张。', 2400);
}
function castBarrier(u) {
  const d = DIRS[u.dir];
  let count = 0;
  for (let i = 1; i <= 3; i++) {
    const x = u.x + d[0]*i, y = u.y + d[1]*i;
    const t = tileAt(x,y);
    if (!t || t.blocked || t.platform) continue;
    G.barriers.push({ x, y, until: G.elapsed + 6 });
    count++;
    for (const e of G.enemies) {
      const p = enemyPos(e);
      if (dist(p, center(x,y)) < .75 * TILE && e.t > 1) { e.t = Math.max(0, e.t - 1); }
    }
  }
  if (!count) { toast('前方没有可封的格子。', 1200); return; }
  addEffect({ type: 'ring', x: center(u.x,u.y).x, y: center(u.x,u.y).y, color: '#d9c08a', radius: 3.2*TILE, life: .6, maxLife: .6 });
  toast('封场：朝向前方 3 格封锁 6 秒。', 1600);
}
function castExecute(u) {
  const target = findUnitTarget(u);
  if (!target) { toast('断线：射程内没有目标。', 1200); return; }
  const p = enemyPos(target);
  addEffect({ type: 'slash', x: p.x, y: p.y, color: '#f0d49a', life: .35, maxLife: .35 });
  if (target.hp / target.maxHp <= .3 && target.weight < 4) {
    damageEnemy(target, 99999, { type: 'true' });
  } else {
    damageEnemy(target, u.atk * 2.4, { type: 'phys' });
  }
  if (target.dead) G.quota = clamp(G.quota + 3, 0, 99);
  toast('断线：一刀。', 1200);
}
function castRecord(u) {
  const targets = G.enemies.filter(e => !e.dead && dist(center(u.x,u.y), enemyPos(e)) <= u.range * TILE + 8 && inFrontArc(u,e))
    .sort((a,b) => (a.record||0) - (b.record||0)).slice(0,3);
  if (!targets.length) { toast('记录：射程内没有目标。', 1200); return; }
  for (const e of targets) {
    e.record = Math.min(3, (e.record||0) + 1);
    if (e.record >= 3) {
      e.silenceUntil = Math.max(e.silenceUntil, G.elapsed + 3);
      e.armorBreakUntil = Math.max(e.armorBreakUntil, G.elapsed + 6);
    }
    const p = enemyPos(e);
    addEffect({ type: 'text', x: p.x, y: p.y - 20, text: '记录', color: '#b9a7e0', life: .7, maxLife: .7 });
  }
  toast('记录：名字记下了。', 1400);
}
function castBorrow(u) {
  if (G.quota >= 30) {
    G.quota -= 30;
    G.windowLeft += 10;
    addEffect({ type: 'text', x: center(u.x,u.y).x, y: center(u.x,u.y).y - 30, text: '+10 秒', color: '#f0d49a', life: 1, maxLife: 1 });
    toast('借秒：−30 配额，窗口 +10 秒。', 1800);
  } else {
    addInstability(6);
    G.windowLeft += 10;
    addEffect({ type: 'text', x: center(u.x,u.y).x, y: center(u.x,u.y).y - 30, text: '+10 秒 / 失稳 +6', color: '#e0b45c', life: 1, maxLife: 1 });
    toast('借秒：配额不够，记在失稳账上。', 1800);
  }
  logWindow('borrow', 10);
}
function tagBlocked(rule) {
  if (!rule) return '没有这张签。';
  if (G.tagCd[rule.id] > 0) return `${rule.name}还在冷却（${Math.ceil(G.tagCd[rule.id])} 秒）。`;
  if (rule.uses != null && G.tagUses[rule.id] <= 0) return `${rule.name}本关已经用完（${rule.uses} 次）。`;
  return '';
}
function useTag(color) {
  const rule = TAG_RULES[color];
  const u = G.units.find(x => x.id === 'shex' && !x.dead);
  if (!u) { toast('希斯蒂娜不在场上。', 1200); return; }
  if (u.charge < u.skill.cost) { toast('分诊槽还没满。', 1200); return; }
  const blocked = tagBlocked(rule);
  if (blocked) { toast(blocked, 1800); return; }
  /* 03 §3.1：教学楔子不开放黑签（失稳条关闭的窗口没有这张签） */
  if (color === 'black' && !G.stage.instability) { toast('这个窗口不签黑签。', 1800); return; }
  const inRange = G.enemies.filter(e => !e.dead && dist(center(u.x,u.y), enemyPos(e)) <= u.range * TILE + 8);
  /* 训练假人只接受绿签（08 §3.6） */
  const targets = inRange.filter(e => !e.neutral || color === 'green');
  if (!targets.length) {
    toast(inRange.length ? '训练目标只接受绿签。' : '射程内没有目标。', 1600);
    return;
  }
  let used = 0;
  if (color === 'red') {
    targets.filter(e => !e.redTagged).sort((a,b)=>b.hp-a.hp).slice(0,3).forEach(e => {
      e.redTagged = true;
      e.redTagUntil = G.elapsed + rule.dur;
      used++;
      const p = enemyPos(e); addEffect({ type: 'text', x: p.x, y: p.y - 20, text: '红', color: rule.color, life: .8, maxLife: .8 });
    });
    if (!used) { toast('这些目标本关已经吃过红签了。', 1600); return; }
    toast(`红签：集火。受伤 +20%，${rule.dur} 秒；全队 ${rule.cd} 秒冷却。`, 1800);
  } else if (color === 'yellow') {
    targets.sort((a,b)=>b.speed-a.speed).slice(0,3).forEach(e => {
      e.yellowUntil = G.elapsed + rule.dur;
      used++;
      const p = enemyPos(e); addEffect({ type: 'text', x: p.x, y: p.y - 20, text: '黄', color: rule.color, life: .8, maxLife: .8 });
    });
    toast(`黄签：迟滞。移速 −40%，${rule.dur} 秒；全队 ${rule.cd} 秒冷却。`, 1600);
  } else if (color === 'green') {
    const e = targets.filter(t => !t.green).sort((a,b)=>b.hp-a.hp)[0];
    if (!e) { toast('没有可以放行的目标。', 1400); return; }
    e.green = true;
    used++;
    const p = enemyPos(e); addEffect({ type: 'text', x: p.x, y: p.y - 20, text: '绿', color: rule.color, life: 1, maxLife: 1 });
    toast(e.neutral ? '绿签：训练目标放行——不计成绩。' : '绿签：放过去。不拦截、不攻击、不计数。', 2200);
  } else {
    const e = targets.sort((a,b)=>a.hp-b.hp)[0];
    e.blackAt = G.elapsed + 3;
    e.green = false;
    used++;
    const p = enemyPos(e); addEffect({ type: 'text', x: p.x, y: p.y - 20, text: '销', color: rule.color, life: 1, maxLife: 1 });
    toast('黑签：3 秒后销掉。+5 失稳，本窗口黑签记 1 笔。', 2200);
  }
  if (!used) return;
  u.charge -= u.skill.cost;
  G.tagCd[color] = rule.cd || 0;
  if (rule.uses != null) G.tagUses[color] = Math.max(0, G.tagUses[color] - 1);
  sfx('skill');
  updateActions();
}
function canReroute() {
  if (!G.stage || !G.stage.gate) return false;
  if (G.gateCooldown > 0) return false;
  const gate = G.stage.gate;
  return G.units.some(u => !u.dead && u.clsKey === 'dispatcher' && cheb([u.x,u.y], gate) <= 1);
}
function doReroute() {
  if (!canReroute()) { toast('需要一名调度站在脉闸旁。', 1600); return; }
  G.windowLeft -= 15;
  logWindow('reroute', -15);
  addInstability(5);
  G.gateOpen = !G.gateOpen;
  G.gateCooldown = 2;
  const post = G.gateOpen ? G.stage.post.outer : G.stage.post.inner;
  for (const e of G.enemies) {
    if (e.dead || !e.pre) continue;
    if (e.t < e.gateIndex) {
      e.path = e.pre.concat(post);
      e.gateIndex = e.pre.length - 1;
    }
  }
  addEffect({ type: 'ring', x: center(G.stage.gate[0], G.stage.gate[1]).x, y: center(G.stage.gate[0], G.stage.gate[1]).y, color: G.gateOpen ? '#7fb8ae' : '#d9b46a', radius: 54, life: .8, maxLife: .8 });
  toast(`改道：${G.gateOpen ? '外线（避开莱恩）' : '内线（从莱恩身边过）'}。−15 秒，失稳 +5。`, 2600);
  sfx('skill');
  updateActions();
}

/* ---------------- command ---------------- */
function useCommand(kind) {
  if (!G.stage || !G.stage.command) { toast('这一关，莱恩在窗口里。指挥技能不可用。', 2000); return; }
  if (G.commandUses <= 0) { toast('「协调」已经用完了。', 1400); return; }
  if (G.commandLimits[kind] <= 0) { toast('这个用法本关已经用过了。', 1400); return; }
  if (kind === 'ask') {
    const u = G.selectedUnit || G.units.slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if (!u) { toast('场上还没有值守。', 1400); return; }
    u.invulnUntil = G.elapsed + 8;
    addEffect({ type: 'ring', x: center(u.x,u.y).x, y: center(u.x,u.y).y, color: '#f0d49a', radius: 36, life: .8, maxLife: .8 });
    toast(`先问名字：${u.name} 8 秒内不会低于 1 HP。`, 2000);
  } else if (kind === 'wait') {
    G.windowLeft += 15;
    logWindow('borrow', 15, '再等十五秒');
    addInstability(5);
    toast('再等十五秒：窗口 +15 秒，失稳 +5。', 2200);
  } else if (kind === 'recall') {
    const lost = G.lostUnits.shift();
    if (!lost) { toast('名单上没有失联的人。', 1400); return; }
    const def = UNIT_TYPES[lost.id];
    const u = makeUnit(lost.id, lost.x, lost.y, lost.dir);
    u.hp = Math.round(u.maxHp * .5);
    G.units.push(u);
    const card = G.cards.find(c => c.id === lost.id);
    if (card) { card.onField = true; card.unitId = u.id; card.cd = 0; }
    toast(`名单上还有一个人：${u.name} 回到窗口。零损员星不追回。`, 2600);
  }
  G.commandUses--;
  G.commandLimits[kind]--;
  sfx('skill');
  updateActions();
}

/* ---------------- deploy / retreat ---------------- */
function makeUnit(typeId, x, y, dir) {
  const def = UNIT_TYPES[typeId];
  return {
    ...def, typeId, id: def.id, x, y, dir,
    hp: def.hp, maxHp: def.hp, charge: 30, attackCd: .5,
    blocked: new Set(), dead: false, saved: false,
    slowUntil: 0, invulnUntil: 0, lastPassive: 0,
    platform: isPlatformDef(def),
  };
}
const STRONG_LIMIT = 3;   /* 强接每关上限（00 §8.1／02 §7.1） */
function isPlatformDef(def) {
  return def.platform === true || def.clsKey === 'recorder' || def.clsKey === 'medic';
}
function canDeployAt(typeId, x, y) {
  const def = UNIT_TYPES[typeId];
  if (!def || !tileAt(x, y)) return false;
  const valid = isPlatformDef(def) ? isPlatformDeploy(x,y) : isGroundDeploy(x,y);
  return valid && !unitOnTile(x, y);
}
function placeUnit(typeId, x, y, dir) {
  const def = UNIT_TYPES[typeId];
  const card = G.cards.find(c => c.id === typeId);
  if (!card || card.onField || card.cd > 0) return false;
  if (!canDeployAt(typeId, x, y)) { toast('这个格子不能接入。', 1400); return false; }
  const u = makeUnit(typeId, x, y, dir);
  G.units.push(u);
  card.onField = true;
  card.unitId = u.id;
  card.cd = 0;
  G.selectedCard = null;
  G.pendingDeploy = null;
  G.pendingStrong = null;
  G.selectedUnit = u;
  addEffect({ type: 'ring', x: center(x,y).x, y: center(x,y).y, color: def.color, radius: 34, life: .5, maxLife: .5 });
  sfx('deploy');
  updateActions();
  return true;
}
function tryDeploy(typeId, x, y, dir) {
  const def = UNIT_TYPES[typeId];
  const card = G.cards.find(c => c.id === typeId);
  if (!card || card.onField || card.cd > 0) return false;
  if (!canDeployAt(typeId, x, y)) { toast('这个格子不能接入。', 1400); return false; }
  if (G.quota < def.cost) {
    const diff = def.cost - G.quota;
    if (G.strongUses >= STRONG_LIMIT) { toast(`强接本关已经用完（${STRONG_LIMIT} 次）。`, 2200); return false; }
    if (diff <= 10) {
      G.pendingStrong = { typeId, x, y, dir, deficit: diff };
      toast(`配额不足 ${diff}。可以强接：只补差额，代价 −8 秒。`, 2600);
      updateActions();
    } else {
      toast('配额不足。', 1200);
    }
    return false;
  }
  G.quota -= def.cost;
  return placeUnit(typeId, x, y, dir);
}
function confirmStrong() {
  if (!G.pendingStrong) return;
  const { typeId, x, y, dir } = G.pendingStrong;
  const def = UNIT_TYPES[typeId];
  const card = G.cards.find(c => c.id === typeId);
  G.pendingStrong = null;
  /* 先校验落点／卡状态，再扣秒：非法格或被抢格不扣 8 秒（08 §4.2 #2） */
  if (!card || card.onField || card.cd > 0 || !canDeployAt(typeId, x, y)) {
    toast('这个格子不能接入——这次不扣秒。', 2000);
    updateActions();
    return;
  }
  if (G.strongUses >= STRONG_LIMIT) { toast(`强接本关已经用完（${STRONG_LIMIT} 次）。`, 2200); updateActions(); return; }
  const deficit = Math.max(0, Math.ceil(def.cost - G.quota));
  G.windowLeft -= 8;
  logWindow('strong', -8, '补 ' + deficit);
  G.strongUses++;
  G.ledger.strong++;
  G.quota = Math.max(0, G.quota - deficit);   /* 只付差额（01 §5.4），余额不清零 */
  placeUnit(typeId, x, y, dir);
  addEffect({ type: 'text', x: center(x,y).x, y: center(x,y).y - 30, text: `强接 −8 秒 · 补 ${deficit}`, color: '#e08a72', life: 1.2, maxLife: 1.2 });
  updateActions();
}
function retreatUnit(u, emergency) {
  if (!u || u.dead) return;
  const refund = Math.round(u.cost * (emergency ? .5 : .3));
  G.quota = clamp(G.quota + refund, 0, 99);
  u.dead = true;
  const card = G.cards.find(c => c.id === u.id);
  if (card) {
    card.onField = false;
    card.unitId = null;
    card.cd = emergency ? 0 : u.redeploy * (G.units.some(x => x.id === 'timon' && x !== u) ? .8 : 1);
  }
  for (const e of G.enemies) if (e.blockedBy === u.id) e.blockedBy = null;
  if (emergency) { G.windowLeft -= 4; logWindow('emergency', -4); }
  addEffect({ type: 'ring', x: center(u.x,u.y).x, y: center(u.x,u.y).y, color: '#7fb8ae', radius: 34, life: .6, maxLife: .6 });
  addEffect({ type: 'text', x: center(u.x,u.y).x, y: center(u.x,u.y).y - 28, text: emergency ? '紧急撤离' : '撤除', color: '#8fd3c7', life: 1, maxLife: 1 });
  toast(emergency ? `${u.name} 紧急撤离：−4 秒，返还 50%。` : `${u.name} 撤除：返还 ${refund} 配额（30%）。`, 2000);
  G.selectedUnit = null;
  sfx('click');
  updateActions();
}

/* ---------------- HUD ---------------- */
function updateHud() {
  if (G.screen !== 'battle' || !G.stage) return;
  const wl = Math.max(0, G.windowLeft);
  const timer = $('#timer');
  timer.textContent = fmt(wl);
  timer.classList.toggle('warn', wl <= 30 && wl > 15);
  timer.classList.toggle('danger', wl <= 15);
  $('#window-fill').style.width = clamp(wl / G.stage.window * 100, 0, 100) + '%';
  $('#quota-num').textContent = Math.floor(G.quota);
  $('#quota-fill').style.width = clamp(G.quota / 99 * 100, 0, 100) + '%';
  const upNow = upkeepRate();
  const rateEl = $('#quota-rate');
  rateEl.textContent = '+' + quotaRate().toFixed(1) + '/s' + (upNow > 0 ? ' · 占 ' + upNow.toFixed(1) + '/s' : '');
  rateEl.classList.toggle('full', G.quota >= 99);
  const spawned = G.stage.waves.reduce((a,w)=>a+w.spawned,0);
  const total = G.stage.waves.reduce((a,w)=>a+w.count,0);
  const escortHp = G.escort ? ` ｜ 莱恩 ${Math.max(0,Math.round(G.escort.hp))}` : '';
  $('#objective-chip').textContent = `${G.stage.objective} ｜ 已出 ${spawned}/${total} ｜ 场上 ${G.enemies.length}${escortHp}`;
  updateGuide();
  if (G.stage.instability) {
    $('#instability').classList.remove('hidden');
    $('#instability-fill').style.width = G.instability + '%';
    $('#instability-num').textContent = Math.round(G.instability);
    $('#instability').classList.toggle('hot', G.instability >= 75);
  }
  // cards
  for (const el of document.querySelectorAll('[data-card]')) {
    const c = G.cards.find(x => x.id === el.dataset.card);
    if (!c) continue;
    const u = UNIT_TYPES[c.id];
    el.classList.toggle('onfield', c.onField);
    el.classList.toggle('selected', G.selectedCard === c.id || (G.selectedUnit && G.selectedUnit.id === c.id && c.onField));
    el.classList.toggle('disabled', !c.onField && c.cd > 0);
    const status = el.querySelector('[data-status]');
    if (c.onField) { status.textContent = '在场 · 点击选中'; status.className = 'uc-status live'; }
    else if (c.cd > 0) { status.textContent = `再接入 ${Math.ceil(c.cd)}s`; status.className = 'uc-status cd'; }
    else if (G.quota < u.cost) { status.textContent = `配额不足 ${u.cost - Math.floor(G.quota)}`; status.className = 'uc-status cd'; }
    else { status.textContent = '待接入'; status.className = 'uc-status'; }
  }
  // stars
  for (const el of document.querySelectorAll('[data-star]')) {
    const n = +el.dataset.star;
    const ok = n === 1 ? true : n === 2 ? G.losses === 0 : G.leaks === 0;
    el.classList.toggle('done', ok);
    el.classList.toggle('lost', !ok);
  }
  updateCommand();
}
function updateGuide() {
  const el = $('#guide');
  if (!el || !G.stage) return;
  let text = '';
  if (G.stage.id === 's1') {
    const has = G.units.some(u => u.id === 'monak' && !u.dead);
    if (!has && G.selectedCard === 'monak') text = '② 点 <b>L3</b>（第 12 列、第 3 行），再点向下的箭头。';
    else if (!has) text = '① 点左侧「<b>莫纳克</b>」，再点地图上的 <b>L3</b>。';
    else if (G.elapsed < 20) text = '① 已接入。等 <b>0:15</b> 第一只从 S1 来，看他挡住。';
    else if (G.elapsed < 100) text = '② 盯住 L3。两条线在汇合，一个人能守两条。';
    else text = '③ <b>1:40</b> 上路来第二波：把「<b>艾德里克</b>」接到 <b>L2</b>，朝左；别把莫纳克撤走。';
  } else if (G.stage.id === 's2') {
    const timon = G.units.some(u => u.id === 'timon' && !u.dead);
    const monak = G.units.some(u => u.id === 'monak' && !u.dead);
    if (!monak) text = '① 先接「<b>莫纳克</b>」到 <b>E4</b>，朝左——挡 W1／W2，也守住内线入口。';
    else if (!timon) text = '② 再接「<b>提蒙</b>」到 <b>F3</b>（脉闸旁）；她管秒，也管改道。';
    else if (!G.gateOpen) text = G.elapsed < 48
      ? '③ <b>0:48</b> 改道（−15 秒）：外线走北侧、另开 <b>M3</b> 出口，不再贴着莱恩。'
      : '③ 现在就改道（−15 秒）：外线走北侧、另开 <b>M3</b> 出口。';
    else if (G.escort && !G.escort.done) text = '④ 还差 15 秒：<b>1:05</b> 和 <b>1:10</b> 各借一次秒（60 配额 → +20 秒）。不借就是 100−85−15＝0。';
    else text = '⑤ 莱恩已到破口。等封场。';
  }
  el.innerHTML = text;
  el.classList.toggle('hidden', !text);
}

/* ---------------- actions panel ---------------- */
let lastActionsKey = '';
function updateActions() {
  if (G.screen !== 'battle' || !G.stage) return;
  const box = $('#actions');
  const key = [
    G.selectedUnit && G.selectedUnit.id, G.selectedUnit && Math.floor(G.selectedUnit.charge/10),
    G.selectedUnit && Math.round(G.selectedUnit.hp/80), G.selectedUnit && G.selectedUnit.blocked.size,
    Math.floor(G.quota/4),
    G.selectedCard, G.pendingStrong && G.pendingStrong.typeId, G.commandUses,
    G.gateCooldown > 0, canReroute(), G.lostUnits.length, G.strongUses,
    Object.entries(G.tagCd || {}).map(([k, v]) => k + Math.ceil(v)).join(','),
    Object.entries(G.tagUses || {}).map(([k, v]) => k + v).join(','),
  ].join('|');
  if (key === lastActionsKey) return;
  lastActionsKey = key;
  if (G.pendingStrong) {
    const u = UNIT_TYPES[G.pendingStrong.typeId];
    box.innerHTML = `<div class="sel-unit"><div class="sel-info"><div class="sn"><b>${u.name}</b><small>强接</small></div><div class="sh">配额差 ${Math.ceil(Math.max(0, u.cost - G.quota))} · 只补差额 · 本关 ${G.strongUses}/3</div></div>
      <div class="sel-actions"><button class="act-btn danger" data-act="strong" ${G.strongUses >= STRONG_LIMIT ? 'disabled' : ''}>强接（−8 秒）</button><button class="act-btn" data-act="cancel">取消</button></div></div>`;
    return;
  }
  if (G.selectedCard) {
    const u = UNIT_TYPES[G.selectedCard];
    box.innerHTML = `<div class="sel-unit"><img src="${u.portrait}" alt=""><div class="sel-info"><div class="sn"><b>${u.name}</b><small>${u.cls}</small></div><div class="sh">配额 ${u.cost} · ${u.block} 拦截 · ${(u.clsKey==='recorder'||u.clsKey==='medic')?'台面':'地面'}</div></div>
      <div class="sel-actions"><span style="font-size:10px;color:var(--dim)">点地图上的合法格，再选朝向。</span><button class="act-btn" data-act="cancel">取消</button></div></div>`;
    return;
  }
  if (!G.selectedUnit) {
    box.innerHTML = `<div id="action-empty">${G.stage.instability ? '点左侧值守 → 点格子 → 选朝向。提蒙站到脉闸旁可以改道。' : '点左侧值守 → 点格子 → 选朝向。L3 是两条线的汇合点。'}</div>`;
    return;
  }
  const u = G.selectedUnit;
  /* 四色签：红／黄／绿／黑，按钮上直接写冷却与剩余次数（02 §8.1） */
  const tagBtns = u.id === 'shex' ? Object.values(TAG_RULES).map(r => {
    const cd = Math.ceil(G.tagCd[r.id] || 0);
    const left = r.uses == null ? '' : ` ${G.tagUses[r.id]}`;
    const closed = r.id === 'black' && !G.stage.instability;
    const blocked = closed ? '未开放' : cd > 0 ? `${cd}s` : u.charge < u.skill.cost ? '槽不足' : (r.uses != null && G.tagUses[r.id] <= 0) ? '用完' : '';
    const label = (blocked && blocked !== '用完') ? `${r.name} ${blocked}` : `${r.name}${left}`;
    return `<button class="act-btn${r.id === 'red' ? ' primary' : ''}" data-act="tag" data-tag="${r.id}" ${blocked ? 'disabled' : ''} title="${r.hint}">${label}</button>`;
  }).join('') : '';
  const skillBtn = u.id === 'shex' ? tagBtns
    : `<button class="act-btn primary" data-act="skill" ${u.charge < u.skill.cost ? 'disabled' : ''}>${u.skill.name} ${Math.floor(u.charge)}/${u.skill.cost}</button>`;
  const reroute = u.id === 'timon' && G.stage.gate
    ? `<button class="act-btn ${canReroute() ? 'primary' : ''}" data-act="reroute" ${canReroute() ? '' : 'disabled'}>改道 −15s</button>`
    : '';
  box.innerHTML = `<div class="sel-unit">
    <img src="${u.portrait}" alt="">
    <div class="sel-info"><div class="sn"><b>${u.name}</b><small>${u.cls}${u.code?'「'+u.code+'」':''}</small></div>
      <div class="sh">HP ${Math.max(0,Math.round(u.hp))}/${u.maxHp} · 拦截 ${u.blocked.size}/${u.block} · 槽 ${Math.floor(u.charge)}</div>
      <div class="sh" style="font-size:8px;color:var(--dim);max-width:300px;white-space:normal;line-height:1.5">${u.passive}</div></div>
    <div class="sel-actions">${skillBtn}${reroute}
      <button class="act-btn" data-act="retreat">撤除</button>
      <button class="act-btn danger" data-act="emergency">紧急撤离 −4s</button>
    </div></div>`;
}
/* fix event binding for non-selected panels */
$('#actions').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'strong') confirmStrong();
  else if (act === 'cancel') { G.selectedCard = null; G.pendingDeploy = null; G.pendingStrong = null; updateActions(); }
  else if (act === 'reroute') doReroute();
  else if (act === 'retreat' && G.selectedUnit) retreatUnit(G.selectedUnit, false);
  else if (act === 'emergency' && G.selectedUnit) retreatUnit(G.selectedUnit, true);
  else if (act === 'skill' && G.selectedUnit) useSkill(G.selectedUnit);
  else if (act === 'tag' && G.selectedUnit) useTag(btn.dataset.tag);
});

let lastCommandKey = '';
function updateCommand() {
  const box = $('#command-buttons');
  if (!G.stage) return;
  const key = [G.stage.id, G.commandUses, G.commandLimits.ask, G.commandLimits.wait, G.commandLimits.recall, G.lostUnits.length, G.gateCooldown > 0, canReroute(), G.gateOpen].join('|');
  if (key === lastCommandKey) return;
  lastCommandKey = key;
  if (!G.stage.command) {
    box.innerHTML = `<div class="cmd-note">${G.stage.gate ? '莱恩在窗口里，指挥技能不可用。<br>提蒙站到脉闸旁 8 格内可以改道（E4／G4／F3／F5 与四个斜角）。' : '本窗口指挥技能不可用。'}</div>`;
    return;
  }
  const limit = G.commandLimits;
  const dis = (k) => (G.commandUses <= 0 || limit[k] <= 0) ? 'disabled' : '';
  box.innerHTML = `
    <button class="cmd-btn" data-cmd="ask" ${dis('ask')}><b>先问名字 <span class="uses">${limit.ask}</span></b><small>8 秒内 HP 不低于 1</small></button>
    <button class="cmd-btn" data-cmd="wait" ${dis('wait')}><b>再等十五秒 <span class="uses">${limit.wait}</span></b><small>窗口 +15 秒，失稳 +5</small></button>
    <button class="cmd-btn" data-cmd="recall" ${dis('recall')}><b>名单上还有一个人 <span class="uses">${limit.recall}</span></b><small>${G.lostUnits.length ? '让一名失联者回归' : '没有失联者'}</small></button>
    <div class="cmd-note">共享 3 次 · 不占部署位</div>`;
}
$('#command-buttons').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cmd]');
  if (b) useCommand(b.dataset.cmd);
});

/* ---------------- board input ---------------- */
const canvas = $('#board');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = BW * dpr;
  canvas.height = BH * dpr;
  canvas.style.width = '1090px';
  canvas.style.height = '586px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
function eventPos(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * BW;
  const y = (e.clientY - r.top) / r.height * BH;
  return { x, y };
}
function eventTile(e) {
  const p = eventPos(e);
  return { x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE), px: p.x, py: p.y };
}
function tileUnderMouse(e) {
  const t = eventTile(e);
  if (t.x < 0 || t.x >= COLS || t.y < 0 || t.y >= ROWS) return null;
  return t;
}
canvas.addEventListener('mousemove', (e) => {
  G.mouse = eventPos(e);
  const t = tileUnderMouse(e);
  G.hover = t;
  showTooltip(e, t);
});
canvas.addEventListener('mouseleave', () => { G.hover = null; $('#tooltip').style.display = 'none'; });
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  G.pendingDeploy = null; G.selectedCard = null; G.pendingStrong = null; G.selectedUnit = null;
  updateActions(); $('#deploy-hint').classList.add('hidden');
});
canvas.addEventListener('click', (e) => {
  if (G.state !== 'playing') return;
  const t = eventTile(e);
  if (t.x < 0 || t.x >= COLS || t.y < 0 || t.y >= ROWS) return;
  // direction picker
  if (G.pendingDeploy) {
    const dir = pickDirection(eventPos(e));
    if (dir >= 0) {
      tryDeploy(G.pendingDeploy.typeId, G.pendingDeploy.x, G.pendingDeploy.y, dir);
      G.pendingDeploy = null;
      $('#deploy-hint').classList.add('hidden');
    } else {
      toast('点四个箭头之一，选择朝向。', 1200);
    }
    return;
  }
  // unit select
  const hit = G.units.find(u => dist(center(u.x,u.y), { x: t.px, y: t.py }) < 30);
  if (hit) { selectUnit(hit); sfx('click'); return; }
  // deploy
  if (G.selectedCard) {
    if (!canDeployAt(G.selectedCard, t.x, t.y)) { toast('这个格子不能接入。', 1200); return; }
    G.pendingDeploy = { typeId: G.selectedCard, x: t.x, y: t.y };
    G.pendingStrong = null;
    $('#deploy-hint').classList.remove('hidden');
    sfx('click');
    updateActions();
    return;
  }
  G.selectedUnit = null;
  updateActions();
});
function pickDirection(p) {
  const c = center(G.pendingDeploy.x, G.pendingDeploy.y);
  for (let d = 0; d < 4; d++) {
    const dv = DIRS[d];
    const ax = c.x + dv[0] * 46, ay = c.y + dv[1] * 46;
    if (Math.hypot(p.x - ax, p.y - ay) < 26) return d;
  }
  return -1;
}
function showTooltip(e, t) {
  const tip = $('#tooltip');
  if (!t) { tip.style.display = 'none'; return; }
  const u = G.units.find(x => dist(center(x.x,x.y), { x: t.px, y: t.py }) < 30);
  const en = G.enemies.find(x => dist(enemyPos(x), { x: t.px, y: t.py }) < x.radius + 8);
  let html = '';
  if (u) {
    html = `<b>${u.name}</b> ${u.cls}<br>HP ${Math.max(0,Math.round(u.hp))}/${u.maxHp}<br>ATK ${u.atk} · DEF ${u.def} · 拦截 ${u.blocked.size}/${u.block}<br>朝向 ${DIRNAME[u.dir]} · 调用 ${Math.floor(u.charge)}/100`;
  } else if (en) {
    html = `<b>${en.name}</b><br>HP ${Math.max(0,Math.round(en.hp))}/${Math.max(1,Math.round(en.maxHp))}<br>ATK ${en.atk} · DEF ${en.def} · 重量 ${en.weight}<br>${en.neutral ? '训练目标：只接受绿签' : en.ranged ? '远程 · 专打台面' : '近战'}${en.effect==='slow'?' · 霜触':''}${en.green ? '<br><span style="color:#7fb87f">绿签：放行中（不计漏）</span>' : ''}`;
  } else {
    const tile = tileAt(t.x,t.y);
    const names = { '#':'封锁','.':'地面','=':'台面','S':'生成点','P':'目标','V':'脉闸','*':'脉点','X':'失稳源','E':'撤离点' };
    html = `<b>${String.fromCharCode(65+t.x)}${t.y+1}</b> · ${names[tile.ch] || '?'}${tile.ch==='='?'<br>只能接入远哨/引术/救护':''}${tile.ch==='*'?'<br>配额 +0.3/秒；敌人 −15% 速度':''}${tile.ch==='V'?'<br>调度站在相邻格可改道':''}`;
  }
  tip.innerHTML = html;
  const r = $('#board-wrap').getBoundingClientRect();
  let x = e.clientX - r.left + 16, y = e.clientY - r.top + 14;
  x = Math.min(x, r.width - 250); y = Math.min(y, r.height - 110);
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.display = 'block';
}

/* ---------------- draw ---------------- */
function draw() {
  if (!G.stage || !G.tiles) return;
  const t = performance.now() / 1000;
  ctx.clearRect(0, 0, BW, BH);
  // background
  ctx.fillStyle = '#12100c';
  ctx.fillRect(0, 0, BW, BH);
  // tiles
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) drawTile(x, y, t);
  }
  drawPaths(t);
  drawRed(t);
  drawBarriers(t);
  drawGate(t);
  drawMarkers(t);
  drawEscortLine(t);
  ctx.save();
  ctx.strokeStyle = 'rgba(217,180,106,.20)';
  ctx.lineWidth = 1;
  ctx.strokeRect(1.5, 1.5, BW-3, BH-3);
  ctx.restore();
  // units/enemies
  for (const u of G.units) if (!u.dead) drawUnit(u, t);
  if (G.escort && !G.escort.done) drawEscort(t);
  for (const e of G.enemies) if (!e.dead) drawEnemy(e, t);
  drawEffects(t);
  drawSelection(t);
  drawValidTiles();
  drawHover(t);
  if (G.pendingDeploy) drawDeployPicker(t);
  // screen shake
  if (G.screenShake > 0) {
    G.screenShake -= .02;
    ctx.save();
    ctx.translate((Math.random()-.5)*G.screenShake*8, (Math.random()-.5)*G.screenShake*8);
    ctx.restore();
  }
}
function drawTile(x, y, t) {
  const tile = tileAt(x,y);
  const px = x*TILE, py = y*TILE;
  let fill = '#2d261d';
  if (tile.blocked) fill = '#0b0907';
  else if (tile.platform) fill = '#4a3b2a';
  else if (tile.vein) fill = '#1f3b38';
  else if (tile.gate) fill = '#4a3a22';
  else if (tile.spawn) fill = '#3a1c1a';
  else if (tile.ch === 'P' || tile.ch === 'E') fill = '#1d352a';
  else fill = (x + y) % 2 === 0 ? '#2f2820' : '#2b241c';
  ctx.fillStyle = fill;
  ctx.fillRect(px+1, py+1, TILE-2, TILE-2);
  if (tile.platform) {
    ctx.strokeStyle = 'rgba(236,223,200,.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px+3.5, py+3.5, TILE-7, TILE-7);
    ctx.fillStyle = 'rgba(236,223,200,.10)';
    ctx.fillRect(px+6, py+6, TILE-12, 3);
    ctx.fillStyle = 'rgba(236,223,200,.22)';
    ctx.font = '9px "Noto Serif SC",serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('台', px+TILE-7, py+TILE-5);
  }
  if (tile.blocked) {
    ctx.strokeStyle = 'rgba(236,223,200,.045)';
    ctx.beginPath();
    for (let i = -TILE; i < TILE; i += 12) {
      ctx.moveTo(px+i, py+TILE); ctx.lineTo(px+i+TILE, py);
    }
    ctx.stroke();
  }
  if (tile.vein) {
    ctx.strokeStyle = 'rgba(127,184,174,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 16 + Math.sin(t*2+x)*2, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(127,184,174,.16)';
    ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 23, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(236,223,200,.45)'; ctx.font='9px "Noto Serif SC",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('脉', px+TILE/2, py+TILE/2);
  }
  if (tile.spawn && tile.ch === 'X') {
    ctx.fillStyle = 'rgba(181,72,62,.20)';
    ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 23 + Math.sin(t*3)*3, 0, Math.PI*2); ctx.fill();
  }
  if (tile.ch === 'E') {
    ctx.strokeStyle = 'rgba(143,211,199,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 18, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(143,211,199,.18)';
    ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 18, 0, Math.PI*2); ctx.fill();
  }
  // grid
  ctx.strokeStyle = 'rgba(236,223,200,.075)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px+.5, py+.5, TILE-1, TILE-1);
  // coordinates
  if (y === 0) {
    ctx.fillStyle = 'rgba(236,223,200,.22)'; ctx.font = '8px "Consolas",monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(String.fromCharCode(65+x), px+5, py+4);
  }
  if (x === 0) {
    ctx.fillStyle = 'rgba(236,223,200,.22)'; ctx.font = '8px "Consolas",monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(String(y+1), px+5, py+16);
  }
}
function drawPaths(t) {
  const s = G.stage;
  const draw = (path, color, width, dash, alpha=1) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.setLineDash(dash); ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const c = center(path[i][0], path[i][1]);
      if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y);
    }
    ctx.stroke(); ctx.restore();
  };
  if (s.pre) {
    draw(s.pre.X, '#a06a52', 2, [4,8], .32);
    draw(s.pre.S, '#a06a52', 2, [4,8], .26);
    const active = G.gateOpen ? s.post.outer : s.post.inner;
    const inactive = G.gateOpen ? s.post.inner : s.post.outer;
    draw(active, '#e2c07a', 7, [7,7], .07);
    draw(active, '#e2c07a', 3, [7,7], .85);
    draw(inactive, '#7fb8ae', 1.5, [3,10], .18);
  } else {
    for (const k in s.paths) {
      draw(s.paths[k], '#e2c07a', 7, [6,8], .06);
      draw(s.paths[k], '#e2c07a', 2.5, [6,8], .55);
    }
  }
  // animated chevrons on active path
  const path = s.pre ? (G.gateOpen ? s.pre.X.concat(s.post.outer) : s.pre.X.concat(s.post.inner)) : s.paths.S1;
  ctx.save(); ctx.fillStyle = 'rgba(242,215,158,.55)';
  for (let i = 1; i < path.length-1; i++) {
    const a = center(path[i][0], path[i][1]), b = center(path[i+1][0], path[i+1][1]);
    const ang = Math.atan2(b.y-a.y, b.x-a.x);
    const off = (t*22 + i*30) % 40 - 20;
    const cx = a.x + Math.cos(ang)*off, cy = a.y + Math.sin(ang)*off;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(-3,4); ctx.lineTo(-3,-4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
function drawRed(t) {
  for (const key of G.redTiles) {
    const [x,y] = key.split(',').map(Number);
    const px = x*TILE, py = y*TILE;
    ctx.fillStyle = 'rgba(181,72,62,.14)';
    ctx.fillRect(px+2, py+2, TILE-4, TILE-4);
    ctx.strokeStyle = 'rgba(181,72,62,.22)';
    ctx.strokeRect(px+4, py+4, TILE-8, TILE-8);
    if (Math.random() < .15) {
      ctx.fillStyle = 'rgba(181,72,62,.35)';
      ctx.fillRect(px+8+Math.random()*60, py+8+Math.random()*60, 2, 2);
    }
  }
}
function drawBarriers(t) {
  for (const b of G.barriers) {
    if (b.until <= G.elapsed) continue;
    const c = center(b.x,b.y);
    ctx.save();
    ctx.strokeStyle = 'rgba(217,180,106,.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x-30, c.y-30, 60, 60);
    ctx.beginPath(); ctx.moveTo(c.x-24,c.y-24); ctx.lineTo(c.x+24,c.y+24); ctx.moveTo(c.x+24,c.y-24); ctx.lineTo(c.x-24,c.y+24); ctx.stroke();
    ctx.restore();
  }
}
function drawGate(t) {
  const s = G.stage; if (!s.gate) return;
  const c = center(s.gate[0], s.gate[1]);
  ctx.save();
  ctx.translate(c.x,c.y);
  ctx.rotate(G.gateOpen ? .35 : 0);
  ctx.fillStyle = G.gateOpen ? 'rgba(127,184,174,.25)' : 'rgba(217,180,106,.18)';
  ctx.strokeStyle = G.gateOpen ? '#7fb8ae' : '#d9b46a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i=0;i<6;i++){ const a = Math.PI/3*i - Math.PI/6; const r = 27; const x = Math.cos(a)*r, y = Math.sin(a)*r; if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(G.gateOpen ? -.35 : 0);
  ctx.fillStyle = '#f0d49a'; ctx.font = 'bold 12px "Noto Serif SC",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('闸',0,1);
  ctx.restore();
  if (G.gateCooldown > 0) {
    ctx.fillStyle = 'rgba(236,223,200,.5)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText('切换中…', c.x, c.y+42);
  }
}
function drawMarkers(t) {
  const s = G.stage;
  for (const [k, p] of Object.entries(s.spawns || {})) {
    const c = center(p[0],p[1]);
    ctx.save();
    ctx.strokeStyle = 'rgba(181,72,62,.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(c.x,c.y,12+Math.sin(t*2)*2,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='rgba(181,72,62,.8)'; ctx.font='bold 11px "Consolas",monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(k==='S1'?'S':k==='S2'?'S':k, c.x, c.y+1);
    ctx.restore();
  }
  if (s.goal) {
    const c = center(s.goal[0], s.goal[1]);
    ctx.save(); ctx.strokeStyle='rgba(143,211,199,.65)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(c.x,c.y,14,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='rgba(143,211,199,.85)'; ctx.font='bold 12px "Consolas",monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(s.goal[0]===12&&s.goal[1]===2?'P':'E', c.x, c.y+1);
    ctx.restore();
  }
}
function drawEscortLine(t) {
  if (!G.escort || G.escort.done) return;
  const path = G.escort.path;
  ctx.save(); ctx.strokeStyle='rgba(240,212,154,.28)'; ctx.lineWidth=2; ctx.setLineDash([3,10]);
  ctx.beginPath();
  for (let i=0;i<path.length;i++){ const c=center(path[i][0],path[i][1]); if(i===0)ctx.moveTo(c.x,c.y);else ctx.lineTo(c.x,c.y); }
  ctx.stroke(); ctx.restore();
}
function drawUnit(u, t) {
  const c = center(u.x,u.y);
  const bob = Math.sin(t*2 + u.id.length)*1.2;
  const selected = G.selectedUnit === u;
  // range preview
  if (selected) {
    ctx.save();
    ctx.fillStyle = 'rgba(217,180,106,.055)';
    ctx.strokeStyle = 'rgba(217,180,106,.18)';
    ctx.beginPath();
    if (u.range >= 2) {
      const dv = DIRS[u.dir]; const ang = Math.atan2(dv[1],dv[0]);
      ctx.moveTo(c.x,c.y); ctx.arc(c.x,c.y, u.range*TILE+8, ang-.8, ang+.8); ctx.closePath();
    } else {
      const dv = DIRS[u.dir]; ctx.arc(c.x+dv[0]*TILE, c.y+dv[1]*TILE, 34, 0, Math.PI*2);
    }
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.ellipse(0, 24, 24, 7, 0, 0, Math.PI*2); ctx.fill();
  // ring
  ctx.beginPath(); ctx.arc(0,0,27,0,Math.PI*2);
  ctx.fillStyle = '#0e0b08'; ctx.fill();
  const im = IMG[u.name];
  if (im && im.complete && im.naturalWidth) {
    ctx.save(); ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.clip();
    ctx.drawImage(im, -26, -26, 52, 52); ctx.restore();
  } else {
    ctx.fillStyle = u.color; ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1b1712'; ctx.font='bold 18px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(u.name[0],0,1);
  }
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? '#f0d49a' : u.color;
  ctx.beginPath(); ctx.arc(0,0,25,0,Math.PI*2); ctx.stroke();
  // charge arc
  ctx.strokeStyle = 'rgba(127,184,174,.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0,0,30, -Math.PI/2, -Math.PI/2 + Math.PI*2*(u.charge/100)); ctx.stroke();
  // facing arrow
  const dv = DIRS[u.dir];
  ctx.save(); ctx.rotate(Math.atan2(dv[1],dv[0]));
  ctx.fillStyle = selected ? '#f0d49a' : 'rgba(236,223,200,.65)';
  ctx.beginPath(); ctx.moveTo(36,0); ctx.lineTo(27,6); ctx.lineTo(27,-6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // class icon
  drawClassIcon(u.clsKey, 18, 18, 9);
  // block pips
  for (let i=0;i<u.block;i++){
    ctx.fillStyle = i < u.blocked.size ? '#e08a72' : 'rgba(236,223,200,.35)';
    ctx.beginPath(); ctx.arc(-12+i*8, -32, 2.5, 0, Math.PI*2); ctx.fill();
  }
  // hp
  const w = 44;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-w/2, 30, w, 4);
  ctx.fillStyle = u.hp/u.maxHp > .5 ? '#8fd3c7' : u.hp/u.maxHp > .25 ? '#e0c06a' : '#e08a72';
  ctx.fillRect(-w/2, 30, w*clamp(u.hp/u.maxHp,0,1), 4);
  ctx.restore();
}
function drawClassIcon(key, x, y, r) {
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle = 'rgba(14,11,8,.9)'; ctx.beginPath(); ctx.arc(0,0,r+2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(236,223,200,.25)'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle = '#ecdfc8';
  if (key === 'bulwark') { ctx.beginPath(); ctx.moveTo(-4,-5); ctx.lineTo(4,-5); ctx.lineTo(4,1); ctx.lineTo(0,6); ctx.lineTo(-4,1); ctx.closePath(); ctx.fill(); }
  else if (key === 'blade') { ctx.fillRect(-1,-6,2,9); ctx.beginPath(); ctx.moveTo(-4,5); ctx.lineTo(4,5); ctx.lineTo(1,2); ctx.lineTo(-1,2); ctx.closePath(); ctx.fill(); }
  else if (key === 'medic') { ctx.fillRect(-2,-5,4,10); ctx.fillRect(-5,-2,10,4); }
  else if (key === 'dispatcher') { ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.strokeStyle='#ecdfc8'; ctx.lineWidth=1.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-3); ctx.moveTo(0,0); ctx.lineTo(3,1); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-5,4); ctx.lineTo(-1,-4); ctx.lineTo(2,-1); ctx.lineTo(5,4); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawEscort(t) {
  const e = G.escort;
  const p = pathPos(e.path, e.t);
  const bob = Math.sin(t*2.4)*1.4;
  ctx.save(); ctx.translate(p.x, p.y+bob);
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0,24,24,7,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(0,0,25,0,Math.PI*2); ctx.fillStyle='#0e0b08'; ctx.fill();
  const im = IMG['莱恩'];
  if (im && im.complete && im.naturalWidth) {
    ctx.save(); ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.clip(); ctx.drawImage(im,-24,-24,48,48); ctx.restore();
  }
  ctx.strokeStyle='#f0d49a'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(0,0,23,0,Math.PI*2); ctx.stroke();
  const w=52; ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(-w/2,28,w,5);
  ctx.fillStyle = e.hp/e.maxHp>.5?'#f0d49a':e.hp/e.maxHp>.25?'#e0c06a':'#e08a72';
  ctx.fillRect(-w/2,28,w*clamp(e.hp/e.maxHp,0,1),5);
  const tag = (G.escortHold && G.escortHold.left > 0) ? `莱恩 · ${G.escortHold.label} ${G.escortHold.left.toFixed(1)}s` : '莱恩 · 护送';
  ctx.fillStyle='rgba(236,223,200,.7)'; ctx.font='8px sans-serif'; ctx.fillText(tag,0,-36);
  ctx.restore();
}
function drawEnemy(e, t) {
  const p = enemyPos(e);
  const bob = Math.sin(t*3 + e.id.length)*1.5;
  ctx.save(); ctx.translate(p.x, p.y + bob);
  const r = e.radius;
  if (e.shape === 'smoke') {
    ctx.fillStyle = 'rgba(223,230,228,.12)';
    ctx.beginPath(); ctx.arc(0,0,r+8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.arc(-r*.4,-r*.3,r*.35,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(223,230,228,.18)';
    ctx.beginPath(); ctx.arc(-r*.9, r*.5, r*.5,0,Math.PI*2); ctx.fill();
  } else if (e.shape === 'shard') {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r*.7,-r*.2); ctx.lineTo(r*.3,r); ctx.lineTo(-r*.5,r*.7); ctx.lineTo(-r*.7,-r*.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth=1; ctx.stroke();
  } else if (e.shape === 'diamond') {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r*.8,0); ctx.lineTo(0,r); ctx.lineTo(-r*.8,0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.stroke();
  } else if (e.shape === 'beast') {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(0,0,r,r*.75,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r*.8,-r*.2); ctx.lineTo(-r*1.5,-r*.7); ctx.lineTo(-r*.9,r*.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r*.8,-r*.2); ctx.lineTo(r*1.5,-r*.7); ctx.lineTo(r*.9,r*.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-r*.3,-r*.2,r*.22,0,Math.PI*2); ctx.fill();
  } else if (e.shape === 'dummy') {
    ctx.fillStyle = 'rgba(138,143,136,.85)';
    ctx.fillRect(-r*.55, -r*.9, r*1.1, r*1.6);
    ctx.fillStyle = '#2b241c';
    ctx.fillRect(-r*.28, -r*.62, r*.16, r*.16);
    ctx.fillRect(r*.12, -r*.62, r*.16, r*.16);
    ctx.fillStyle = 'rgba(236,223,200,.55)'; ctx.font = '9px "Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('训', 0, r*.15);
  } else {
    ctx.fillStyle = e.color;
    for (let i=0;i<3;i++){ const a = i*2.1; ctx.beginPath(); ctx.arc(Math.cos(a)*r*.4, Math.sin(a)*r*.4, r*.48, 0, Math.PI*2); ctx.fill(); }
  }
  if (e.green) { ctx.strokeStyle = '#7fb87f'; ctx.lineWidth = 2.5; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.arc(0,0,r+6,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
  // status
  if (e.yellowUntil > G.elapsed) { ctx.strokeStyle='#e0c06a'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,r+4,0,Math.PI*2); ctx.stroke(); }
  if (e.redTagUntil > G.elapsed) { ctx.fillStyle='#e08a72'; ctx.fillRect(-r*.6,-r-10,7,7); }
  if (e.blackAt) { ctx.strokeStyle='#c9b8d6'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-r*.5,-r*.5); ctx.lineTo(r*.5,r*.5); ctx.moveTo(r*.5,-r*.5); ctx.lineTo(-r*.5,r*.5); ctx.stroke(); }
  if (e.silenceUntil > G.elapsed) { ctx.strokeStyle='#b9a7e0'; ctx.setLineDash([2,3]); ctx.beginPath(); ctx.arc(0,0,r+3,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
  if (e.record > 0) { ctx.fillStyle='#b9a7e0'; for(let i=0;i<e.record;i++) ctx.fillRect(-r+i*5,-r-8,3,4); }
  // hp
  const w = Math.max(22, r*2);
  ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(-w/2, r+5, w, 3);
  ctx.fillStyle = e.hp/e.maxHp>.5?'#c9d6cf':e.hp/e.maxHp>.25?'#e0c06a':'#e08a72';
  ctx.fillRect(-w/2, r+5, w*clamp(e.hp/e.maxHp,0,1), 3);
  ctx.restore();
}
function drawEffects(t) {
  for (const e of G.effects) {
    const k = 1 - e.t/e.life;
    ctx.save(); ctx.globalAlpha = Math.max(0, k);
    if (e.type === 'ring') {
      ctx.strokeStyle = e.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, (e.radius||24)*(1 + (1-k)*.6), 0, Math.PI*2); ctx.stroke();
    } else if (e.type === 'text') {
      ctx.fillStyle = e.color; ctx.font = 'bold 13px "Noto Serif SC",serif'; ctx.textAlign='center';
      ctx.fillText(e.text, e.x, e.y - (1-k)*18);
    } else if (e.type === 'line') {
      ctx.strokeStyle = e.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.x2,e.y2); ctx.stroke();
    } else if (e.type === 'slash') {
      ctx.strokeStyle = e.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(e.x-18,e.y-18); ctx.lineTo(e.x+18,e.y+18); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x+14,e.y-18); ctx.lineTo(e.x-14,e.y+18); ctx.stroke();
    }
    ctx.restore();
  }
  for (const f of G.floaters) {
    const k = 1 - f.t/f.life;
    ctx.save(); ctx.globalAlpha = Math.max(0,k); ctx.fillStyle = f.color;
    ctx.font = 'bold 12px "Consolas",monospace'; ctx.textAlign='center';
    ctx.fillText(f.text, f.x, f.y - (1-k)*6);
    ctx.restore();
  }
}
function drawSelection(t) {
  if (!G.selectedUnit) return;
  const u = G.selectedUnit;
  if (u.dead) return;
  const c = center(u.x,u.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(240,212,154,.8)'; ctx.lineWidth = 2;
  ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(c.x,c.y,36,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}
function drawValidTiles() {
  if (!G.selectedCard) return;
  for (let yy=0; yy<ROWS; yy++) for (let xx=0; xx<COLS; xx++) {
    if (canDeployAt(G.selectedCard, xx, yy)) {
      ctx.fillStyle='rgba(127,184,174,.10)'; ctx.fillRect(xx*TILE+4,yy*TILE+4,TILE-8,TILE-8);
      ctx.strokeStyle='rgba(127,184,174,.35)'; ctx.lineWidth=1; ctx.strokeRect(xx*TILE+4,yy*TILE+4,TILE-8,TILE-8);
    }
  }
}
function drawHover(t) {
  if (!G.hover) return;
  const {x,y} = G.hover;
  if (x<0||x>=COLS||y<0||y>=ROWS) return;
  const px=x*TILE, py=y*TILE;
  ctx.save(); ctx.strokeStyle='rgba(240,212,154,.5)'; ctx.lineWidth=1.5; ctx.strokeRect(px+2,py+2,TILE-4,TILE-4); ctx.restore();
}
function drawDeployPicker(t) {
  const {x,y} = G.pendingDeploy;
  const c = center(x,y);
  ctx.save();
  ctx.strokeStyle = 'rgba(240,212,154,.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(c.x,c.y,34,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(240,212,154,.07)'; ctx.beginPath(); ctx.arc(c.x,c.y,34,0,Math.PI*2); ctx.fill();
  for (let d=0; d<4; d++) {
    const dv=DIRS[d]; const ax=c.x+dv[0]*48, ay=c.y+dv[1]*48;
    const active = Math.hypot(G.mouse.x-ax, G.mouse.y-ay) < 26;
    ctx.save(); ctx.translate(ax,ay); ctx.rotate(Math.atan2(dv[1],dv[0]));
    ctx.fillStyle = active ? '#f0d49a' : 'rgba(236,223,200,.7)';
    ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-7,7); ctx.lineTo(-7,-7); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------- loop start ---------------- */
function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  $('#app').style.transform = `translate(-50%,-50%) scale(${s})`;
}
window.addEventListener('resize', fit);
fit();
bindTitle();
refreshMeta();
requestAnimationFrame(loop);

/* ---------------- keyboard ---------------- */
window.addEventListener('keydown', (e) => {
  if (G.screen !== 'battle') return;
  /* 结算页：Esc 必须有出口，不能关掉弹窗就卡死（08 §4.2 #1） */
  if (G.state !== 'playing') {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearTimeout(resultTimer);
      G.result = null;
      closeModal();
      showScreen('select');
    }
    return;
  }
  if (e.key === 'Escape') {
    if (G.pendingDeploy) { G.pendingDeploy = null; $('#deploy-hint').classList.add('hidden'); return; }
    if (G.selectedCard || G.selectedUnit) { G.selectedCard = null; G.selectedUnit = null; updateActions(); return; }
    closeModal();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
    return;
  }
  if (e.key >= '1' && e.key <= '4') {
    const c = G.cards[+e.key-1];
    if (c) onCardClick(c.id);
  }
  if (G.pendingDeploy && ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','w','d','s','a'].includes(e.key)) {
    e.preventDefault();
    const map = { ArrowUp:0, w:0, ArrowRight:1, d:1, ArrowDown:2, s:2, ArrowLeft:3, a:3 };
    tryDeploy(G.pendingDeploy.typeId, G.pendingDeploy.x, G.pendingDeploy.y, map[e.key]);
    G.pendingDeploy = null; $('#deploy-hint').classList.add('hidden');
  }
});
function togglePause() {
  if (G.state !== 'playing') return;
  G.paused = !G.paused;
  if (G.paused) {
    openModal(`
      <div class="modal-kicker">窗口暂停</div>
      <h2 class="modal-title">${esc(G.stage.code)}「${esc(G.stage.title)}」</h2>
      <div class="modal-body"><p>暂停时不能下令。秒不会因为你停下来就不走。</p></div>
      <div class="modal-actions">
        <button class="btn ghost" id="p-quit">放弃窗口</button>
        <button class="btn ghost" id="p-restart">重开</button>
        <button class="btn primary" id="p-resume">继续</button>
      </div>`, false);
    $('#p-resume').onclick = () => { closeModal(); G.paused = false; };
    $('#p-restart').onclick = () => { closeModal(); G.paused = false; startStage(G.stage.id); };
    $('#p-quit').onclick = () => { closeModal(); G.paused = false; G.state = 'idle'; showScreen('select'); };
  } else closeModal();
}
$('#btn-pause').onclick = togglePause;
$('#btn-speed').onclick = () => {
  G.speed = G.speed === 1 ? 2 : 1;
  $('#btn-speed').textContent = G.speed + '×';
  sfx('click');
};
$('#btn-sound').onclick = () => {
  soundOn = !soundOn;
  $('#btn-sound').textContent = soundOn ? '♪' : '×';
  if (soundOn) sfx('click');
};
$('#btn-help').onclick = () => {
  if (G.screen === 'battle' && G.state === 'playing') { G.paused = true; helpWasPause = true; }
  showHelp();
};

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(text, ms = 1800) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ---------------- debug helpers ---------------- */
window.VL.startStage = startStage;
window.VL.tryDeploy = tryDeploy;
window.VL.canDeployAt = canDeployAt;
window.VL.canReroute = canReroute;
window.VL.meta = meta;
window.VL.placeUnit = placeUnit;
window.VL.quotaRate = quotaRate;
window.VL.upkeepRate = upkeepRate;
window.VL.ledgerHTML = ledgerHTML;
window.VL.escortArrival = escortArrival;
window.VL.TAG_RULES = TAG_RULES;
window.VL.STRONG_LIMIT = STRONG_LIMIT;
window.VL.tick = (dt) => { if (G.state === 'playing') update(dt); };
window.VL.useSkill = useSkill;
window.VL.useTag = useTag;
window.VL.doReroute = doReroute;
window.VL.retreatUnit = retreatUnit;
window.VL.useCommand = useCommand;
window.VL.confirmStrong = confirmStrong;
window.VL.chooseReport = chooseReport;
window.VL.togglePause = togglePause;
window.VL.spawnEnemy = spawnEnemy;
window.VL.addInstability = addInstability;
window.VL.damageEnemy = damageEnemy;
window.VL.setDemo = (v) => { demoMode = !!v; };
window.VL.showAuth = showAuth;
window.VL.nextNodeText = nextNodeText;
window.VL.AUTH_LINES = AUTH_LINES;
window.VL.winStage = winStage;
window.VL.failStage = failStage;
window.VL.showScreen = showScreen;
window.VL.showBriefing = showBriefing;
window.VL.G = G;
window.VL.toast = toast;
})();
