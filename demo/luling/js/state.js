// ============================================================
// 状态与存档（M2.1 · v2）
// freshState() 是新档的唯一真相 —— 给 S 加字段必须同时加进这里
// ============================================================

const SAVE_KEY = 'luling_save_v2';

function freshState() {
  return {
    phase: 'title',        // title | day | night | settle
    day: 1,
    dusk: 0,               // 白天时段 0=晨 1=午 2=暮（跑一趟货推进一段）
    money: 500,
    stamina: 100,          // 体力（M6）：干活消耗，睡觉恢复
    maxStamina: 100,
    map: 'town',           // 当前地图（M6 多地图）：town | forest | mine
    oldDebts: 1,           // 旧的账，M2.1 当灰港暗线门票
    fame: 0,
    stock: {
      smoked_fish: 0, seaweed: 0, sea_salt: 0, cheese: 0,
      potato: 0, honey: 0, wheat: 0, herb: 0
    },
    storyLog: [],          // 店志「听来的话」
    todayStats: { revenue: 0, tips: 0, spent: 0 },
    runsDone: [],          // 白天已跑过的线路 id（最多两条）
    currentRun: null,      // 当前所在货摊 id；null = 在选线屏
    debts: 0,              // 账：灰港客人记账留下的信用，能在暗线花
    journal: {},           // 店志：eventId -> { versions: [{who,text,day}], judgment: who|null }
    people: {},            // 人名册（M8.2）：cid -> { first: bool, second: bool }
    eventDone: {},         // 事件二选一：eventId -> choiceId
    stats: { darkDeals: 0 },   // 统计：暗线成交次数（结局用）
    ended: false,          // 是否已经看过结局（继业后为 true）
    ending: null,          // 结局结果 { id, sc, day }
    achievements: [],      // 已解锁成就 id
    affection: {},         // 常客好感：cid -> 0~5 星
    weather: 'sunny',      // 天气：sunny | rain | storm
    records: { bestRevenue: 0 },   // 榜单：最佳单日流水（M4.4 预留）
    challenge: null,       // 每日挑战 { id, name, desc, done }
    yard: {                // 后院菜地（M4.2）
      plots: Array.from({ length: 10 }, () => ({ state: 'wild', cropId: null, daysLeft: 0, watered: false })),
      vein: 'calm'         // rich | calm | fade
    },
    menu: ['smoked_potato', 'honey_stew', 'grey_stew', 'smoked_meat_cake', 'salt_fish', 'herb_wheat', 'tide_salad', 'honey_weed'],   // 今日菜单（M8.2）
    shop: {                // 店铺家什（M8.1）
      seats: 2,            // 同屏客人上限 2~4
      pots: 2,             // 灶眼 2~3
      menu: 8,             // 菜单位 8~16（M8.2 接点单）
      yard: 0,             // 后院 0/1：1 = 有井
      decor: 0             // 门面 0~3：客单价加成
    },
    ranch: { chickens: 0, fed: 0, eggs: 0 },   // 牧场（M6）：买了鸡 / 今天喂了几只 / 待收的蛋
    quests: {},            // 镇民支线（M8.3）：npcId -> { stage }
    nodes: {},             // 采集点冷却（M8.3）：'map:x,y' -> 最后采集的天
    resumePhase: null,     // 从标题页「继续营业」要回到的阶段
    night: null            // 夜晚流程状态，见 game.js newNight()
  };
}

let S = freshState();

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 隐私模式等直接放弃 */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    S = Object.assign(freshState(), data);
    S.stock = Object.assign(freshState().stock, data.stock || {});
    S.todayStats = Object.assign(freshState().todayStats, data.todayStats || {});
    S.runsDone = Array.isArray(data.runsDone) ? data.runsDone : [];
    S.shop = Object.assign(freshState().shop, data.shop || {});
    if (S.yard && !Array.isArray(S.yard.plots)) S.yard = freshState().yard;
    if (S.yard && S.yard.plots.length < 10) S.yard = freshState().yard;
    // 读档先进标题页：把存档阶段交给 resumePhase
    if (S.phase !== 'title') {
      S.resumePhase = S.phase;
      S.phase = 'title';
    }
    return true;
  } catch (e) {
    return false;
  }
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}
