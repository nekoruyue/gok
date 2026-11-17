/* 流脉防线 · 原型数据
   只服务于本地 Demo；正式数值以 设计案/02 为准。 */

const UNIT_TYPES = {
  aidric: {
    id: 'aidric', name: '艾德里克', code: '衡', cls: '壁垒', clsKey: 'bulwark',
    cost: 22, hp: 3000, atk: 400, def: 440, res: 15,
    range: 1, block: 3, interval: 1.6, redeploy: 45,
    portrait: 'assets/units/艾德里克.webp', color: '#d9c08a',
    skill: { name: '封场', cost: 60, desc: '朝向前方 1×3 格封锁 6 秒，格上敌人被推出 1 格' },
    passive: '每被命中 1 次回 1 配额（2 秒一次）；HP 首次 ≤30% 时 DEF +80',
  },
  monak: {
    id: 'monak', name: '莫纳克', code: '', cls: '锋刃', clsKey: 'blade',
    cost: 15, hp: 1850, atk: 740, def: 220, res: 5,
    range: 1, block: 2, interval: 1.15, redeploy: 28,
    portrait: 'assets/units/莫纳克.webp', color: '#d97b6c',
    skill: { name: '断线', cost: 60, desc: '对射程内 1 个目标造成 240% 物理；HP ≤30% 直接击杀（重量 4 无效）' },
    passive: '每击杀 1 个敌人 +1 配额；HP >80% 时 ATK +8%',
  },
  shex: {
    id: 'shex', name: '希斯蒂娜', code: '镜', cls: '救护', clsKey: 'medic',
    cost: 18, hp: 1250, atk: 300, heal: 360, def: 150, res: 15,
    range: 3, block: 0, interval: 1.8, redeploy: 32,
    portrait: 'assets/units/希斯蒂娜.webp', color: '#8fd3c7',
    skill: { name: '四色分诊', cost: 40, desc: '一次 3 个目标：红（受伤 +20%，8 秒／15 秒冷却）、黄（减速 40%，6 秒／10 秒冷却）、绿（放行，每关 4 次）、黑（3 秒后销掉，每关 3 次／25 秒冷却）' },
    passive: '治疗 HP 百分比最低的友军；每名友军首次濒死时拉到 1 HP（每关 1 次）',
  },
  timon: {
    id: 'timon', name: '提蒙', code: '瞬', cls: '调度', clsKey: 'dispatcher',
    cost: 10, hp: 1500, atk: 340, def: 200, res: 5,
    range: 2, block: 1, interval: 1.5, redeploy: 18,
    portrait: 'assets/units/提蒙.webp', color: '#e0b45c',
    skill: { name: '借秒', cost: 50, desc: '30 配额 → 窗口 +10 秒；配额不足时改付 +6 失稳' },
    passive: '在场时配额 +0.2/秒；全队再接入冷却 −20%',
  },
  verious: {
    id: 'verious', name: '维里欧斯', code: '锲', cls: '远哨', clsKey: 'recorder',
    cost: 20, hp: 1000, atk: 460, def: 130, res: 10,
    range: 4, block: 0, interval: 1.5, redeploy: 35,
    portrait: 'assets/units/维里欧斯.webp', color: '#b9a7e0',
    skill: { name: '记录', cost: 55, desc: '射程内 3 个目标各叠 1 层【记录】；满层者沉默 3 秒并破甲 30%' },
    passive: '连续命中叠【记录】（最多 3 层）；对满层目标普攻改为真实伤害',
  },
  /* 02 §4.5：引术·越权解析（v0.2 补） */
  ocaris: {
    id: 'ocaris', name: '欧莉卡斯', code: '慧', cls: '引术', clsKey: 'arcanist',
    cost: 26, hp: 1150, atk: 600, def: 150, res: 25,
    range: 5, block: 0, interval: 2.0, redeploy: 40, attackType: 'arts', platform: true,
    portrait: 'assets/units/欧莉卡斯.webp', color: '#b9a7e0',
    skill: { name: '越权解析', cost: 60, desc: '10 秒内自身伤害 ×2；每次命中 +2 失稳（本次累计上限 +8）；再按一次提前关闭' },
    passive: '普攻强制选 DEF 最高的目标；击杀精锐／重装时失稳 −3',
  },
  /* 02 §4.8：调度·冰面（v0.2 补，最小版） */
  shiser: {
    id: 'shiser', name: '深雪', code: '昭', cls: '调度', clsKey: 'dispatcher',
    cost: 12, hp: 1500, atk: 350, def: 190, res: 10,
    range: 2, block: 0, interval: 1.7, redeploy: 22, attackType: 'arts', platform: true,
    portrait: 'assets/units/深雪.webp', color: '#9fc9d6',
    skill: { name: '冰面', cost: 55, desc: '前方一格 8 秒：敌人减速 40%，期间失稳不扩张' },
    passive: '普攻附带 15% 减速 1 秒；站脉点时配额额外 +0.2/秒',
  },
};

const ENEMY_TYPES = {
  wisp: {
    id: 'wisp', name: '白烟游体', hp: 520, atk: 120, def: 20, res: 0,
    speed: 0.9, weight: 1, reward: 1, interval: 1.4, radius: 13,
    color: '#dfe6e4', shape: 'smoke',
  },
  frost: {
    id: 'frost', name: '凝霜肢', hp: 780, atk: 160, def: 40, res: 0,
    speed: 0.8, weight: 1, reward: 1, interval: 1.8, radius: 14,
    color: '#9fc9d6', shape: 'shard', attackType: 'arts', effect: 'slow',
  },
  fog: {
    id: 'fog', name: '巡雾者', hp: 1200, atk: 280, def: 60, res: 20,
    speed: 0.6, weight: 1, reward: 2, interval: 2.0, radius: 15,
    color: '#c9c2b8', shape: 'diamond', attackType: 'arts', ranged: 3,
  },
  fin: {
    id: 'fin', name: '蹼行兽', hp: 2400, atk: 320, def: 180, res: 10,
    speed: 0.7, weight: 2, reward: 2, interval: 1.8, radius: 18,
    color: '#6f9a8a', shape: 'beast',
  },
  shard: {
    id: 'shard', name: '碎屑簇', hp: 600, atk: 90, def: 0, res: 0,
    speed: 1.0, weight: 1, reward: 1, interval: 1.2, radius: 12,
    color: '#b9a27e', shape: 'cluster', split: true,
  },
  /* ---- 02 §5.1 补的 5 种（v0.2） ---- */
  weaver: {
    id: 'weaver', name: '白烟织体', hp: 1800, atk: 260, def: 120, res: 15,
    speed: 0.75, weight: 2, reward: 2, interval: 1.5, radius: 16,
    color: '#cfd8d4', shape: 'weave', elite: true, onDeath: 'weave',
  },
  gunner: {
    id: 'gunner', name: '帝国工造铳手', hp: 1100, atk: 300, def: 100, res: 0,
    speed: 0.7, weight: 1, reward: 2, interval: 2.2, radius: 15,
    color: '#c8a06a', shape: 'gun', ranged: 3, pickHighestAtk: true,
  },
  guard: {
    id: 'guard', name: '帝国禁卫', hp: 4200, atk: 420, def: 400, res: 10,
    speed: 0.5, weight: 3, reward: 3, interval: 2.0, radius: 20,
    color: '#9a8f7a', shape: 'guard', riveted: true, blunt: true,
  },
  gladi: {
    id: 'gladi', name: '义肢角斗士', hp: 3400, atk: 460, def: 320, res: 5,
    speed: 0.55, weight: 3, reward: 3, interval: 1.7, radius: 18,
    color: '#b07a5a', shape: 'gladi', ramp: true,
  },
  oil: {
    id: 'oil', name: '走私火油车', hp: 1200, atk: 220, def: 80, res: 0,
    speed: 0.9, weight: 2, reward: 3, interval: 2.0, radius: 17,
    color: '#c07a3a', shape: 'oil', onDeath: 'oil',
  },
  /* 训练假人：08 §3.6 的绿签载体。中立单位，只接受绿签，不计任何目标 */
  dummy: {
    id: 'dummy', name: '训练假人', hp: 9999, atk: 0, def: 0, res: 0,
    speed: 0.35, weight: 5, reward: 0, interval: 9, radius: 16,
    color: '#8a8f88', shape: 'dummy', neutral: true,
  },
};

/* 三签（红／黄／绿／黑）的次数与冷却：02 §8.1（08 §4.2 #4 回写）
   黑签额外代价：+5 失稳、结算真值 −1（01 §7.2、00 §11） */
const TAG_RULES = {
  red:    { id: 'red',    name: '红签', color: '#e08a72', dur: 8,   cd: 15, uses: null, hint: '受伤 +20%，8 秒；每目标每关 1 次；全队 15 秒冷却' },
  yellow: { id: 'yellow', name: '黄签', color: '#e0c06a', dur: 6,   cd: 10, uses: null, hint: '移速 −40%，6 秒；全队 10 秒冷却' },
  green:  { id: 'green',  name: '绿签', color: '#7fb87f', dur: 999, cd: 0,  uses: 4,    hint: '放行：不拦截、不攻击、不计数；每关 4 次' },
  black:  { id: 'black',  name: '黑签', color: '#c9b8d6', dur: 3,   cd: 25, uses: 3,    hint: '3 秒后销掉；+6 配额、+5 失稳、结算真值 −1；每关 3 次' },
};

/* 配额经济（08 §3.1）：维持费 = 在场值守每秒扣的配额 */
const ECON_RULES = { upkeepPerUnit: 0.1, upkeepCycle: 30, debtInstability: 2 };

/* 13×7 地图：# 封锁  · 地面  = 台面  S 生成点  P 目标/入口  V 脉闸  * 脉点  X 失稳源  E 撤离点 */
const STAGES = {
  s1: {
    id: 's1', code: '序-1', title: '值班表', chapter: '序章 · 值班',
    difficulty: 1,
    quote: '提蒙把沙盘推过来：“拖上去，朝右。它从那边来。”',
    brief: '训练沙盘。两条流脉在 L3 汇合，8 个白烟游体。两个训练假人会自己走过去——绿签放行，别去拦。没有失稳，没有改道：先把“接入”和“朝向”弄对。',
    objective: '隔离：漏怪 ≤ 2',
    starText: ['完成主目标', '零损员', '零遗留（0 漏怪）'],
    window: 180,
    startQuota: 18,
    instability: false,
    command: true,
    units: ['aidric', 'monak', 'shex'],
    /* 08 §3.6：绿签载体。序-3 未做，先放序-1（2 个） */
    neutrals: [{ spawn: 'S1' }, { spawn: 'S2' }],
    map: [
      '#############',
      'S............',
      '...==....==.P',
      'S............',
      '...==....==..',
      '.............',
      '#############',
    ],
    spawns: { S1: [0, 3], S2: [0, 1] },
    goal: [12, 2],
    paths: {
      S1: [[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[11,2],[12,2]],
      S2: [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[11,2],[12,2]],
    },
    waves: [
      { at: 15, spawn: 'S1', type: 'wisp', count: 1, interval: 0 },
      { at: 45, spawn: 'S1', type: 'wisp', count: 1, interval: 0 },
      { at: 65, spawn: 'S1', type: 'wisp', count: 2, interval: 4 },
      { at: 100, spawn: 'S2', type: 'wisp', count: 2, interval: 3 },
      { at: 130, spawn: 'S2', type: 'wisp', count: 2, interval: 1 },
    ],
    tutorial: [
      '点左侧「莫纳克」→ 点 L3（第 12 列、第 3 行）→ 选朝上或朝下。',
      '两条线在 L3 汇合，一个人可以守两条；但朝向错了，他会看不见另一条。',
      '1:40 上路来第二波：把艾德里克补到 L2，朝左；别撤莫纳克——28 秒冷却不够你换人。',
    ],
  },
  s2: {
    id: 's2', code: '二-3', title: '一百秒', chapter: '第二章 · 一百秒',
    difficulty: 5,
    quote: '“一百秒，从现在起计时。第九十九秒我下令封场——封场令一落，谁也别想再进去。”',
    brief: '护送莱恩（背负阿砾）走到右舷破口。100 秒。改道是双向的，借秒是要还的。你只能带 4 个人。',
    objective: '撤离：把莱恩送到 E',
    starText: ['完成主目标', '零损员', '零遗留（莱恩 1/1）'],
    window: 100,
    startQuota: 18,
    instability: true,
    command: false,
    units: ['timon', 'monak', 'verious', 'shex'],
    map: [
      '#############',
      'X............',
      '.........==.E',
      'P....V......E',
      '...==.....*..',
      'S............',
      '#############',
    ],
    spawns: { X: [0, 1], S: [0, 5] },
    goal: [12, 3],
    gate: [5, 3],
    gateNeighbors: [[4,3],[6,3],[5,2],[5,4]],
    gateBrief: '内线（默认）从莱恩身边过；外线（改道）走北侧、另开 M3 出口，完全避开莱恩。',
    pre: {
      X: [[0,1],[1,1],[2,1],[3,1],[4,1],[5,2],[5,3]],
      S: [[0,5],[0,4],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3]],
    },
    post: {
      inner: [[5,4],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[10,4],[10,3],[11,3],[12,3]],
      /* 外线：北侧另开出口（M3）。绕开台面 J3/K3，与护送路线 K4/L4/M4 零重合 */
      outer: [[5,2],[6,2],[7,2],[8,2],[8,1],[9,1],[10,1],[11,1],[12,1],[12,2]],
    },
    escortPath: [[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[5,4],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[10,4],[10,3],[11,3],[12,3]],
    /* 80 秒路程 + 医疗包 3 秒 + 舱内转向 2 秒 = 85 秒（03 §3.3／08 §4.2 #3） */
    escort: { name: '莱恩', code: '序', hp: 3000, speed: 0.2, portrait: 'assets/units/莱恩.webp',
      pauses: [{ at: 5, dur: 3, label: '医疗包' }, { at: 6, dur: 2, label: '舱内转向' }] },
    waves: [
      { at: 4, spawn: 'X', type: 'wisp', count: 2, interval: 2 },
      { at: 12, spawn: 'X', type: 'wisp', count: 1, interval: 0 },
      { at: 20, spawn: 'X', type: 'fog', count: 1, interval: 0 },
      { at: 30, spawn: 'S', type: 'wisp', count: 2, interval: 2 },
      { at: 38, spawn: 'X', type: 'frost', count: 1, interval: 0 },
      { at: 48, spawn: 'X', type: 'fog', count: 1, interval: 0 },
      { at: 48.6, spawn: 'X', type: 'wisp', count: 1, interval: 0 },
      { at: 58, spawn: 'S', type: 'fin', count: 1, interval: 0 },
      { at: 66, spawn: 'X', type: 'frost', count: 2, interval: 3 },
      { at: 68, spawn: 'S', type: 'wisp', count: 1, interval: 0 },
      { at: 68.6, spawn: 'S', type: 'shard', count: 1, interval: 0 },
      { at: 74, spawn: 'X', type: 'frost', count: 1, interval: 0 },
    ],
    tutorial: [
      '先接莫纳克在 E4，朝左；再接提蒙在 F3（脉闸旁边）。',
      '0:48 改道（−15 秒）：外线走北侧、另开 M3 出口，不再贴着莱恩。',
      '改完道还差 15 秒：1:05 和 1:10 各借一次秒（60 配额 → +20 秒）。不借就是 100−85−15＝0。',
      '1:10 莱恩过 K4：把莫纳克紧急撤离（−4 秒）改接 K4 朝西——那道口子必须有人。',
    ],
  },
};


/* 三条授权线（05 §3.3 节点名 ＋ 08 §3.5 的 MVP 口径：只到第 3 节点，4～6「未装订」） */
const AUTH_MVP = 3;
const AUTH_LINES = {
  truth: {
    key: 'truth', name: '真值', owner: '记录者', color: '#d9c08a',
    nodes: [
      { n: 1, at: 3,  name: '失稳预警', eff: '关前显示红区扩圈位置' },
      { n: 2, at: 6,  name: '样本分析', eff: '结算多一栏「样本清单」' },
      { n: 3, at: 9,  name: '隐藏窗口·二号仓棚北', eff: '每章 1 个隐藏窗口' },
      { n: 4, at: 12, name: '莱恩对话', eff: '每章一次「问一句」' },
      { n: 5, at: 16, name: '欧莉卡斯的档案', eff: '越权失稳上限 +8→+6' },
      { n: 6, at: 20, name: '「记录者」结局钥匙', eff: '终局把档并成一份册子' },
    ],
  },
  order: {
    key: 'order', name: '秩序', owner: '守门人', color: '#8fb4c9',
    nodes: [
      { n: 1, at: 3,  name: '配额上限', eff: '上限 99→120，开局 +4' },
      { n: 2, at: 6,  name: '防线强化', eff: '壁垒接入 −2；红区 30→26' },
      { n: 3, at: 9,  name: '基建加速', eff: '改道 −15→−12 秒' },
      { n: 4, at: 12, name: '玛尔塔信任', eff: '每章一次失败改判' },
      { n: 5, at: 16, name: '奎因归档权限', eff: '花三道签调阅一份封存档' },
      { n: 6, at: 20, name: '「守门人」结局钥匙', eff: '把册子锁进库里' },
    ],
  },
  seal: {
    key: 'seal', name: '隐秘', owner: '封存者', color: '#a99bb5',
    nodes: [
      { n: 1, at: 1, name: '黑市补给', eff: '局外商店；开局 +8 配额' },
      { n: 2, at: 4, name: '血祭装备', eff: '−4 秒换 +15 配额，每关 1 次' },
      { n: 3, at: 6, name: '禁咒', eff: '引术清场 8 格，失稳 +12' },
      { n: 4, at: 8, name: '墨兰交易', eff: '每章一次「不该有的窗口」' },
      { n: 5, at: 10, name: '西昭档案', eff: '解锁「雪都」三份记载' },
      { n: 6, at: 12, name: '「封存者」结局钥匙', eff: '登记为「不予折损」' },
    ],
  },
};

const REPORTS = [
  {
    id: 'truth', authLine: 'truth', name: '如实上报', color: '#d9c08a',
    line: '“这份东西，三十年不动。”',
    body: '把越权、黑签、伤者与未撤离人员原样写进去。',
    gain: { truth: 2, order: -1 },
  },
  {
    id: 'order', authLine: 'order', name: '按规程归档', color: '#8fb4c9',
    line: '“让明年这个时候，这座港口还能运转。”',
    body: '只写规程要求的三行：事故、处置、已结案。',
    gain: { order: 2, truth: -1 },
  },
  {
    id: 'seal', authLine: 'seal', name: '封存', color: '#a99bb5',
    line: '“您别当真——也别不当真。”',
    body: '登记为“不予折损”，锁进库里，三十年后再看。',
    gain: { seal: 1, truth: -1, order: -1 },
  },
];
