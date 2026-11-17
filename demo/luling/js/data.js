// ============================================================
// 《戈克世界·鹿铃亭》M3.1 数据表
// 10 道菜 / 8 位常客（六方覆盖）/ 三条跑货线
// ============================================================

// ---------- 食材（9 种） ----------
const GOODS = {
  smoked_fish: { name: '熏鱼干', base: 6, desc: '腌过又熏的鲱鱼，咸得能顶一天活', line: '海风大，这鱼晒得正好。' },
  seaweed: { name: '海藻', base: 4, desc: '潮线边捡的，海族常吃', line: '潮线边捞的，熬杂烩能提鲜。' },
  sea_salt: { name: '海盐', base: 3, desc: '码头盐仓出的粗盐', line: '盐仓刚出的，腌鱼腌肉都离不了。' },
  cheese: { name: '干酪', base: 7, desc: '船来品，奶味重', line: '船上下来的干酪，放了半月，够味。' },
  smoked_meat: { name: '熏肉', base: 9, desc: '帝国商队的硬货，切厚片管饱', line: '帝国商队捎来的熏肉，切厚片，顶饿。' },
  potato: { name: '土豆', base: 3, desc: '帝国商队的主食，压得住饿', line: '刚从帝国商队车上卸下来的，还带着泥。' },
  honey: { name: '蜂蜜', base: 8, desc: '本地蜂场的好蜜，甜得干净', line: '本地蜂场的，甜得干净，做炖菜正好。' },
  wheat: { name: '麦', base: 4, desc: '磨面用的粗麦', line: '今年的新麦，磨出来面香。' },
  herb: { name: '香草', base: 5, desc: '提味去腥，一小把就够', line: '后山采的香草，炖菜提味。' },
  fresh_fish: { name: '鲜鱼', base: 6, desc: '码头刚钓上来的，还蹦着', line: '自己钓的鱼，新鲜。' },
  // ---- M6 采集/挖矿产物 ----
  berry: { name: '野果', base: 4, desc: '北林里摘的，酸里带甜', line: '北林摘的野果。' },
  mushroom: { name: '蘑菇', base: 5, desc: '树林背阴处的，鲜', line: '林子里采的蘑菇。' },
  wood: { name: '木材', base: 3, desc: '能烧能钉，什么都用得上', line: '捡的柴火。' },
  stone: { name: '石头', base: 2, desc: '矿洞里敲下来的', line: '矿洞里敲的石头。' },
  coal: { name: '煤', base: 5, desc: '烧火用的黑石头', line: '挖到的煤。' },
  copper: { name: '铜矿', base: 8, desc: '带铜锈的矿石，能卖钱', line: '铜矿，有分量。' },
  egg: { name: '鸡蛋', base: 6, desc: '牧场里捡的，还温着', line: '自家鸡下的蛋。' }
};

// 鱼种（钓鱼时随机）
const FISH = [
  { id: 'herring', name: '鲱鱼' },
  { id: 'bass', name: '鲈鱼' },
  { id: 'eel', name: '鳗鱼' },
  { id: 'flatty', name: '比目鱼' }
];

// 节日（M5）：每季最后一天（day % 7 === 0）的晚上
const FESTIVALS = [
  { name: '开渔节', desc: '春末，码头放灯，鱼价最热闹' },
  { name: '流脉灯会', desc: '夏末，镇上点灯看流脉' },
  { name: '丰收市', desc: '秋末，粮贩开秤收粮' },
  { name: '长夜宴', desc: '冬末，全镇摆长桌' }
];

// 镇上居民（M6）：白天站在镇上，走过去能聊两句
const TOWNSFOLK = [
  { id: 'mira', name: '米拉', x: 5, y: 6, color: '#b04a7a', color2: '#c8588a', hair: '#3a2a1e', hairHi: '#5a4a3a', lines: ['杂货铺今天进了新盐。', '粮价又涨了，唉。'] },
  { id: 'bruno', name: '布鲁诺', x: 15, y: 7, color: '#4a6a8a', color2: '#5a7a9a', hair: '#2a2a2a', hairHi: '#4a4a4a', lines: ['铁匠铺的火没灭过。', '谁的犁坏了拿来我看看。'] },
  { id: 'eline', name: '艾琳', x: 8, y: 4, color: '#8a5a9a', color2: '#9a6aaa', hair: '#6a4a2a', hairHi: '#8a6a4a', lines: ['教堂的钟今天响得早。', '愿流脉护着榆港。'] },
  { id: 'tomas', name: '托马斯', x: 16, y: 6, color: '#8a6a3a', color2: '#9a7a4a', hair: '#3a2a1e', hairHi: '#5a4a3a', lines: ['酒馆的招牌该换了。', '今晚有麦酒，来一杯？'] },
  { id: 'kaya', name: '卡雅', x: 2, y: 5, color: '#3a8a6a', color2: '#4a9a7a', hair: '#5a3a1e', hairHi: '#7a5a3a', lines: ['鱼市今天不景气。', '潮线又退了。'] }
];


// ---------- 镇民时段台词与支线（M8.3） ----------
const NPC_TALK = {
  mira: {
    '晨': ['杂货铺今天进了新盐。', '这么早，先喝口热的。', '码头那边今天卸什么？'],
    '午': ['日头正毒，盐价也跟着涨。', '午市人多，你店里也该备货了。', '账房的人刚过去，脚步急。'],
    '暮': ['收摊了，剩下的盐我留着。', '晚上风大，早点回。', '你要的盐，明天给你留着。']
  },
  bruno: {
    '晨': ['铁匠铺的火刚生起来。', '犁头我修好了，你来拿？'],
    '午': ['日头底下打铁，跟烤肉似的。', '谁家的犁坏了，拿来我看看。'],
    '暮': ['火要压了，明天再打。', '晚上别走暗巷，最近不太平。']
  },
  eline: {
    '晨': ['教堂的钟今天响得早。', '愿流脉护着榆港。'],
    '午': ['午后有人来点灯，我添了油。', '你店里的灯，也要常擦。'],
    '暮': ['暮色下来，灯就该亮了。', '流脉的事，别多问，也别不信。']
  },
  tomas: {
    '晨': ['酒馆昨夜散得晚。', '来一杯？不，你还要开店。'],
    '午': ['麦酒温着，等你打烊。', '粮价又涨，酒也得涨。'],
    '暮': ['今晚有麦酒，来一杯？', '招牌该换了，你帮我写个字？']
  },
  kaya: {
    '晨': ['鱼市今天不景气。', '潮水刚退，捡了点海藻。'],
    '午': ['潮线又退了，船不好靠。', '海货今天少，你省着用。'],
    '暮': ['收网了，剩下的我带回。', '夜里的海，比账本还安静。']
  }
};

// 五条两步支线：带齐东西再找他们说话
const NPC_QUESTS = {
  mira: {
    name: '米拉的盐账',
    need: [{ id: 'sea_salt', n: 2 }],
    intro: '帮我留两包盐，账房在查库存。',
    done: '对上了。这四十个铜板你拿着，别嫌少。',
    reward: 'money', amount: 40
  },
  bruno: {
    name: '布鲁诺的犁',
    need: [{ id: 'wood', n: 1 }, { id: 'stone', n: 1 }],
    intro: '犁把断了，给我一段木料和一块石头，我给你修。',
    done: '成了。以后你干活，能多扛一会儿。',
    reward: 'stamina', amount: 5
  },
  eline: {
    name: '艾琳的灯油',
    need: [{ id: 'herb', n: 1 }],
    intro: '灯油里掺一把香草，烟会干净些。',
    done: '愿灯照着你的灶台。',
    reward: 'fame', amount: 5
  },
  tomas: {
    name: '托马斯的酒粮',
    need: [{ id: 'wheat', n: 2 }],
    intro: '麦酒断了，给我两把麦，我给你留一笔酒钱。',
    done: '够酿一桶了。三十个铜板，拿去。',
    reward: 'money', amount: 30
  },
  kaya: {
    name: '卡雅的鲜鱼',
    need: [{ id: 'fresh_fish', n: 1 }],
    intro: '给我一条鲜鱼，我拿两条跟你换——今晚要祭潮。',
    done: '潮会记得的。两条鱼，拿好。',
    reward: 'fish', amount: 2
  }
};

// ---------- 跑货线 ----------
// charm：easy = 王婶实在 / sly = 粮贩滑头 / blunt = 灰港舌头不废话
const RUNS = [
  {
    id: 'dock', name: '榆港码头', owner: '王婶', charm: 'easy',
    desc: '海风咸腥，栈桥边支着货摊',
    goods: ['smoked_fish', 'seaweed', 'sea_salt', 'cheese', 'smoked_meat']
  },
  {
    id: 'market', name: '市集', owner: '粮贩', charm: 'sly',
    desc: '人声嘈杂，粮车刚卸，草垛边全是买卖',
    goods: ['potato', 'honey', 'wheat', 'herb']
  },
  {
    id: 'dark', name: '灰港暗线', owner: '灰港舌头', charm: 'blunt',
    desc: '后巷尽头，有人压着嗓子报货',
    goods: ['smoked_fish', 'seaweed', 'potato'],
    discount: 0.75,
    fakeChance: 0.2,
    needDebt: true
  }
];

// ---------- 菜谱（10 道） ----------
const RECIPES = {
  smoked_potato: {
    name: '熏鱼配土豆泥',
    mats: { smoked_fish: 1, potato: 1 },
    price: 16,
    desc: '咸口、顶饿，帝国商队的最爱'
  },
  honey_stew: {
    name: '蜂蜜炖菜',
    mats: { honey: 1, potato: 1 },
    price: 20,
    desc: '甜软，本地人讲究的那一口'
  },
  grey_stew: {
    name: '灰港杂烩',
    mats: { seaweed: 1, smoked_fish: 1 },
    price: 18,
    desc: '有什么煮什么，灰港人的招牌'
  },
  smoked_meat_cake: {
    name: '熏肉土豆饼',
    mats: { smoked_meat: 1, potato: 1 },
    price: 18,
    desc: '肉厚火大，西昭兽人的口味'
  },
  salt_fish: {
    name: '海盐烤鱼',
    mats: { smoked_fish: 1, sea_salt: 1 },
    price: 14,
    desc: '整条烤透，咸香下酒'
  },
  herb_wheat: {
    name: '香草炖麦',
    mats: { herb: 1, wheat: 1 },
    price: 15,
    desc: '清淡讲规矩，凯斯特来客的口味'
  },
  honey_wheat: {
    name: '蜂蜜烤麦',
    mats: { honey: 1, wheat: 1 },
    price: 16,
    desc: '甜口顶饿，账房人的拿手'
  },
  cheese_plate: {
    name: '干酪拼盘',
    mats: { cheese: 1, honey: 1 },
    price: 22,
    desc: '体面的一道，招待贵客用'
  },
  tide_salad: {
    name: '潮线凉拌',
    mats: { seaweed: 1, sea_salt: 1, herb: 1 },
    price: 17,
    desc: '生拌不落锅，海族的吃法'
  },
  grey_soup: {
    name: '灰港汤',
    mats: { seaweed: 1, cheese: 1, wheat: 1 },
    price: 20,
    desc: '有什么煮什么，灰港人的一锅汤'
  },
  // ---- M3.3 扩充：30 道菜谱的后 20 道 ----
  smoked_sea: { name: '熏肉海藻汤', mats: { smoked_meat: 1, seaweed: 1 }, price: 16, desc: '熏肉的咸香吊出海藻的鲜' },
  honey_fish: { name: '蜂蜜烤鱼', mats: { honey: 1, smoked_fish: 1 }, price: 18, desc: '甜口烤鱼，本地人下酒' },
  cheese_wheat: { name: '干酪烤麦', mats: { cheese: 1, wheat: 1 }, price: 17, desc: '干酪化在麦子上，管饱' },
  salt_potato: { name: '海盐土豆泥', mats: { sea_salt: 1, potato: 1 }, price: 12, desc: '粗盐压土豆，最顶饿的一口' },
  herb_fish: { name: '香草烤鱼', mats: { herb: 1, smoked_fish: 1 }, price: 16, desc: '香草盖住鱼腥，凯斯特人爱吃' },
  meat_wheat: { name: '熏肉麦饼', mats: { smoked_meat: 1, wheat: 1 }, price: 19, desc: '厚实的饼，加肉管一天' },
  honey_cake: { name: '蜂蜜土豆饼', mats: { honey: 1, potato: 1 }, price: 15, desc: '甜口的饼，小孩子的爱' },
  weed_soup: { name: '海藻汤', mats: { seaweed: 1, sea_salt: 1 }, price: 13, desc: '清汤寡水，海族说这才叫汤' },
  meat_cheese: { name: '熏肉干酪', mats: { smoked_meat: 1, cheese: 1 }, price: 20, desc: '重口下酒，猎户的最爱' },
  wheat_soup: { name: '麦芽汤', mats: { wheat: 1, potato: 1 }, price: 12, desc: '穷人的一顿，热乎' },
  fish_rice: { name: '熏鱼麦饭', mats: { smoked_fish: 1, wheat: 1 }, price: 15, desc: '鱼和麦一起焖，朴素' },
  honey_weed: { name: '蜂蜜海藻冻', mats: { honey: 1, seaweed: 1 }, price: 16, desc: '海族小姑娘喜欢的那种甜' },
  cheese_mash: { name: '干酪土豆泥', mats: { cheese: 1, potato: 1 }, price: 16, desc: '奶香压土豆，体面' },
  herb_honey: { name: '香草蜂蜜水', mats: { herb: 1, honey: 1 }, price: 13, desc: '解渴的甜水，能安神' },
  salt_meat: { name: '海盐熏肉', mats: { sea_salt: 1, smoked_meat: 1 }, price: 17, desc: '盐把肉腌透，越嚼越香' },
  fish_cheese_wheat: { name: '熏鱼干酪麦', mats: { smoked_fish: 1, cheese: 1, wheat: 1 }, price: 20, desc: '三样凑一锅，谁也不亏' },
  meat_weed_potato: { name: '熏肉海藻土豆', mats: { smoked_meat: 1, seaweed: 1, potato: 1 }, price: 19, desc: '码头人的一锅炖' },
  honey_herb_wheat: { name: '蜂蜜香草麦', mats: { honey: 1, herb: 1, wheat: 1 }, price: 18, desc: '甜里带草香，讲究' },
  salt_fish_wheat: { name: '海盐熏鱼麦', mats: { sea_salt: 1, smoked_fish: 1, wheat: 1 }, price: 17, desc: '鱼、盐、麦，出海人的饭' },
  cheese_herb_potato: { name: '干酪香草土豆', mats: { cheese: 1, herb: 1, potato: 1 }, price: 18, desc: '奶香草香压一块，软糯' },
  // ---- 鲜鱼菜谱（M5 钓鱼系统） ----
  fresh_soup: { name: '鲜鱼汤', mats: { fresh_fish: 1, sea_salt: 1 }, price: 14, desc: '刚钓的鱼熬汤，最鲜' },
  grilled_fish: { name: '烤鲜鱼', mats: { fresh_fish: 1, herb: 1 }, price: 15, desc: '香草盖住鱼腥，烤到焦香' },
  fish_stew: { name: '鲜鱼炖菜', mats: { fresh_fish: 1, potato: 1 }, price: 16, desc: '鱼和土豆一锅炖，码头人的晚饭' },
  // ---- 牧场菜谱（M6） ----
  fried_egg: { name: '煎蛋', mats: { egg: 1, sea_salt: 1 }, price: 13, desc: '盐一撒，蛋一煎，最省事的一口热' }
};


// ---------- 口味与菜单（M8.2 点单） ----------
const RECIPE_TASTE = {
  smoked_potato: '咸', honey_stew: '甜', grey_stew: '咸', smoked_meat_cake: '重口',
  salt_fish: '咸', herb_wheat: '清淡', honey_wheat: '甜', cheese_plate: '甜',
  tide_salad: '鲜', grey_soup: '咸', smoked_sea: '咸', honey_fish: '甜',
  cheese_wheat: '甜', salt_potato: '咸', herb_fish: '清淡', meat_wheat: '重口',
  honey_cake: '甜', weed_soup: '鲜', meat_cheese: '重口', wheat_soup: '清淡',
  fish_rice: '咸', honey_weed: '甜', cheese_mash: '甜', herb_honey: '清淡',
  salt_meat: '咸', fish_cheese_wheat: '咸', meat_weed_potato: '重口', honey_herb_wheat: '甜',
  salt_fish_wheat: '咸', cheese_herb_potato: '清淡', fresh_soup: '鲜', grilled_fish: '鲜',
  fish_stew: '鲜', fried_egg: '咸'
};
const CUSTOMER_TASTE = {
  vasily: '咸', marta: '甜', otto: '随便', lug: '重口', sevein: '鲜', leina: '清淡',
  barto: '咸', vila: '甜', katya: '咸', oldlim: '咸', vika: '随便', agu: '重口',
  ting: '鲜', sorin: '清淡', xiaoman: '随便', baran: '咸'
};
// 开局菜单（八道，六个口味都覆盖）
const DEFAULT_MENU = [
  'smoked_potato', 'honey_stew', 'grey_stew', 'smoked_meat_cake',
  'salt_fish', 'herb_wheat', 'tide_salad', 'honey_weed'
];

// ---------- 常客（8 位，六方覆盖） ----------
const CUSTOMERS = [
  {
    id: 'vasily', name: '瓦西里', from: '帝国商队',
    mood: '咸、硬、管饱',
    want: 'smoked_potato',
    intro: '俺是跑帝国线的货郎瓦西里。一路风吹日晒，就想口扎实的。',
    order: '来盘熏鱼配土豆泥，管饱就行。',
    done: '实在。这年头，能让人踏实吃一顿的地方不多了。',
    story: '南边路上听来的——征调令的名册对不上数。贵族出钱买替身，穷人家的儿子顶名额去前线。你当风声听，别外传。'
  },
  {
    id: 'marta', name: '玛尔塔', from: '榆港本地',
    mood: '甜、软、体面',
    want: 'honey_stew',
    intro: '我是巷口开杂货摊的玛尔塔，老主顾了，别嫌我嘴刁。',
    order: '今天要口甜的，蜂蜜炖菜。',
    done: '啧，还是你家的味道正。隔壁街新开那家，甜得发腻。',
    story: '鹿铃亭这招牌，我小时候就见过。换过几任掌柜，再往前听说是个外地姑娘在这儿打过工，人走了，再没回来。'
  },
  {
    id: 'otto', name: '老奥托', from: '灰港掮客',
    mood: '不挑，什么都吃',
    want: 'grey_stew',
    intro: '老奥托，灰港来的。不挑食，能填肚子就行。',
    order: '有什么吃什么，剩下的照着老规矩倒进杂烩。',
    done: '够意思。灰港那边，一顿热乎饭得先讲清楚这顿饭记谁的账。',
    story: '码头上那些仓库，最近进出的人不对。帝国粮贩子包了半边码头，说是做生意，我闻着像在做账。这世道，生意和账搅在一起，就说不清了。'
  },
  {
    id: 'lug', name: '鲁格', from: '西昭兽人',
    mood: '烤肉、重口',
    want: 'smoked_meat_cake',
    intro: '俺是西昭的鲁格，赶着牲口来榆港换盐。有肉没有？',
    order: '来份熏肉土豆饼，肉要厚，火要大。',
    done: '够劲。西昭那边，一顿没肉的饭不算饭。',
    story: '草原上来的人说，潮线往西退了半里。海族不认潮神了，说潮是账，不是神。这话传回西昭，猎户们当笑话听。'
  },
  {
    id: 'sevein', name: '赛雯', from: '海族·洛斯汰',
    mood: '生鲜',
    want: 'tide_salad',
    intro: '赛雯，洛斯汰来的。海上的船刚靠岸，闻着这儿有刀腥味。',
    order: '潮线凉拌，要生的，别下锅。',
    done: '……干净。陆上人愿意把生的东西做干净，难得。',
    story: '海底下最近不太平。洛斯汰的礁脉出了岔子，有人说是流脉改道，有人说是有人动了手脚。我们海族只管一样：潮落之后，谁家都别赖账。'
  },
  {
    id: 'leina', name: '莱娜', from: '凯斯特来客',
    mood: '清淡、讲规矩',
    want: 'herb_wheat',
    intro: '莱娜，从凯斯特来的。先看菜单再点，规矩得先讲清楚。',
    order: '香草炖麦，清淡些，按规矩的做。',
    done: '做法正。凯斯特的馆子讲究先问来处，你这店做得比有些大馆还规矩。',
    story: '普卫岛的学院最近在查一件事：有人把「声音」写进了账本里。学院不管这事，但凯斯特的船都绕着那片海走。'
  },
  {
    id: 'barto', name: '巴托', from: '榆港本地',
    mood: '咸香下酒',
    want: 'salt_fish',
    intro: '巴托，青石巷酒馆跑堂的。下了工才敢来吃点好的。',
    order: '海盐烤鱼，鱼要整条，别切。',
    done: '香。我们掌柜的要是肯学你这道，酒馆能多卖三成。',
    story: '巷子里都在传，帝国粮贩包了码头半边的仓库。我们酒馆的麦价涨了两成，掌柜的骂了一晚上。'
  },
  {
    id: 'vila', name: '薇拉', from: '榆港本地',
    mood: '甜口顶饿',
    want: 'honey_wheat',
    intro: '薇拉，码头账房的。对账对到半夜，饿得前胸贴后背。',
    order: '蜂蜜烤麦，甜口，顶饿就行。',
    done: '甜度正好。账房的人就好这一口，甜的压饿，也压心里的闷。',
    story: '码头的账最近对不上。货单上多出来的那一笔，没人认领，像有人拿它当幌子。我核了三遍，数字没毛病，名字有。'
  },
  // ---- M3.3 扩充：其余 8 位常客 ----
  {
    id: 'katya', name: '卡佳', from: '帝国商队',
    mood: '咸、硬、管饱',
    want: 'meat_wheat',
    intro: '卡佳，帝国商队管账的。车队的账和胃，都得有人喂。',
    order: '来份熏肉麦饼，饼要厚。',
    done: '实在。商队的人就认这个。',
    story: '商队里最近在传，帝国粮仓的账对不上。管账的都知道，只是没人敢往上递。'
  },
  {
    id: 'oldlim', name: '老瘸子', from: '榆港本地',
    mood: '咸香、顶饿',
    want: 'salt_potato',
    intro: '老瘸子。打了一辈子鱼，腿不行了，嘴还行。',
    order: '海盐土豆泥，盐放足。',
    done: '嗯。这口下去，像回到了船上。',
    story: '潮线往海里退了。老辈人说，那是海在收自己的账。'
  },
  {
    id: 'vika', name: '薇卡', from: '灰港掮客',
    mood: '不挑，什么都吃',
    want: 'grey_soup',
    intro: '薇卡，灰港跑单的。跑了一夜，还没吃口热乎的。',
    order: '灰港汤，有什么放什么。',
    done: '暖和。跑单的人就缺这一口。',
    story: '灰港的册子又厚了一页。这一页记的，是谁家欠谁的命。'
  },
  {
    id: 'agu', name: '阿骨', from: '西昭兽人',
    mood: '烤肉、重口',
    want: 'meat_cheese',
    intro: '阿骨，西昭猎户。跟着兽群下来的，找肉吃。',
    order: '熏肉干酪，肉要厚，别小气。',
    done: '够味。西昭人就这么吃。',
    story: '草原上的兽群往南挪了。猎户们说，是地脉在动。'
  },
  {
    id: 'ting', name: '汀', from: '海族·洛斯汰',
    mood: '生鲜',
    want: 'honey_weed',
    intro: '汀，洛斯汰的。姐姐让我上岸买点甜的。',
    order: '蜂蜜海藻冻，要凉的。',
    done: '甜的……跟海底的盐不一样。',
    story: '礁脉又断了一截。海底的房子，有一半空了。'
  },
  {
    id: 'sorin', name: '索林', from: '凯斯特来客',
    mood: '清淡、讲规矩',
    want: 'herb_fish',
    intro: '索林，凯斯特的文书。路过榆港，歇个脚。',
    order: '香草烤鱼，草味要轻。',
    done: '规矩，干净。凯斯特的馆子也就这水准。',
    story: '凯斯特的船最近绕着北港走。那片海，连学院都不愿提。'
  },
  {
    id: 'xiaoman', name: '小满', from: '榆港本地',
    mood: '随便，管饱',
    want: 'wheat_soup',
    intro: '小满，巷子里打零工的。今天没活干，来蹭口热汤。',
    order: '麦芽汤，最便宜的那个。',
    done: '热乎。这就够了。',
    story: '巷子里都说，鹿铃亭的掌柜是个外地人。外地人好，不晓得那么多规矩。'
  },
  {
    id: 'baran', name: '巴兰', from: '帝国商队',
    mood: '咸、硬、管饱',
    want: 'smoked_sea',
    intro: '巴兰，帝国粮贩。粮价的事，码头上一半人恨我。',
    order: '熏肉海藻汤，热一点。',
    done: '哎，这汤里的海腥味，像老家。',
    story: '粮仓的账，我核了三遍。少的那部分，不在账上，在人的嘴里。'
  }
];

// 做菜结果文字
const COOK_WORD = {
  perfect: '火候正好！',
  ok: '熟了，还凑合',
  burnt: '焦了……味道不对',
  raw: '生的，没法吃'
};

// ---------- 作物（M4.2 后院种地） ----------
const CROPS = {
  potato: { name: '土豆', days: 3, minYield: 2, maxYield: 3, color: '#c99a6a' },
  wheat: { name: '麦', days: 3, minYield: 2, maxYield: 3, color: '#d8b84a' },
  herb: { name: '香草', days: 2, minYield: 1, maxYield: 2, color: '#7cb85a' }
};

// 流脉三态
const VEIN_NAME = { rich: '富集', calm: '平稳', fade: '衰竭' };

// ---------- 店铺家什（M8.1） ----------
// 价格曲线：一周目（28 天）大概能买 4~5 项，故意买不全
const SHOP_UPGRADES = [
  {
    id: 'seats', name: '座位', unit: '座',
    desc: '同屏能多坐一位，等菜的客人不用挤在门口',
    levels: [
      { cost: 180, value: 3, text: '加一张桌：同屏 3 位' },
      { cost: 520, value: 4, text: '再加一张桌：同屏 4 位' }
    ]
  },
  {
    id: 'pots', name: '灶眼', unit: '眼',
    desc: '多一口锅，就能把两道菜一起做',
    levels: [
      { cost: 260, value: 3, text: '加一口灶：三锅并行' }
    ]
  },
  {
    id: 'menu', name: '菜单', unit: '道',
    desc: '能写进菜单的菜越多，越不怕客人挑口味（M8.2 开放点单）',
    levels: [
      { cost: 200, value: 12, text: '菜单位 12 道' },
      { cost: 480, value: 16, text: '菜单位 16 道' }
    ]
  },
  {
    id: 'yard', name: '后院', unit: '',
    desc: '打一口井：每天清早自动浇 2 块地，流脉更容易富集',
    levels: [
      { cost: 300, value: 1, text: '打井：自动浇 2 块，富集率 +10%' }
    ]
  },
  {
    id: 'decor', name: '门面', unit: '级',
    desc: '招牌、灯笼、花箱——客人愿意为体面多付一点',
    levels: [
      { cost: 150, value: 1, text: '换新招牌：客单价 +4%' },
      { cost: 400, value: 2, text: '挂两盏灯笼：客单价 +8%' },
      { cost: 900, value: 3, text: '整修门面：客单价 +12%' }
    ]
  }
];
const DECOR_BONUS = [0, 0.04, 0.08, 0.12];

// ---------- 成就（M4.4） ----------
const ACHIEVEMENTS = [
  { id: 'first_perfect', name: '火候正好', desc: '第一次做出完美火候的菜' },
  { id: 'first_harvest', name: '第一茬', desc: '第一次从后院收一茬作物' },
  { id: 'first_event', name: '听来的话', desc: '第一次收齐一个事件的四方说法' },
  { id: 'first_judge', name: '你信了谁', desc: '第一次在店志上记下自己的判断' },
  { id: 'dark_deal', name: '暗线', desc: '第一次在灰港暗线买货' },
  { id: 'rich', name: '铜板满袋', desc: '铜币攒到 1000 以上' },
  { id: 'first_slam', name: '摔门', desc: '第一次把客人气走' },
  { id: 'first_friend', name: '老主顾', desc: '把一位常客的好感养到五星' },
  { id: 'first_upgrade', name: '添置家什', desc: '第一次升级店铺' },
  { id: 'full_house', name: '满堂', desc: '四张桌同时坐满' },
  { id: 'six_sides', name: '六方', desc: '收齐一个事件的六方说法' },
  { id: 'second_story', name: '更深的交情', desc: '听到一位常客的第二段故事' },
  { id: 'ending_seen', name: '一年', desc: '第一次看到结局' },
  { id: 'festival_full', name: '节日满座', desc: '节日夜做出一盘五星菜' },
  { id: 'fisher10', name: '十条鱼', desc: '累计钓到 10 条鱼' },
  { id: 'rich2000', name: '铜板两千', desc: '铜币攒到 2000 以上' }
];

// ---------- 每日挑战（M4.4 榜单预留） ----------
const CHALLENGES = [
  { id: 'serve3', name: '卖出三道菜', desc: '今天卖出三道菜' },
  { id: 'tip5', name: '小费五铜', desc: '今天小费收到 5 铜以上' },
  { id: 'perfect2', name: '两道完美', desc: '今天做出两道完美火候' }
];

// ---------- 六方事件（M3.2，每季末触发一个） ----------
const EVENTS = [
  {
    id: 'spring_call',
    name: '征调令的传闻',
    intro: '春天到了。码头的风里混进南边来的消息：征调令的名册，对不上数。',
    choices: [
      { id: 'speak', label: '替那户人家去码头问一声', result: '你在码头替他们问了一圈，没问出结果，但记住了这户人家的名字。' },
      { id: 'silent', label: '不掺和，把锅烧热', result: '你守住自己的灶台。消息在门外飘，不进你的锅。' }
    ],
    versions: [
      { who: '帝国商队', text: '名册是共和国自己编的，跟帝国没干系。帝国只买粮，不买人。' },
      { who: '共和国本地', text: '贵族出钱买替身？那是帝国商队往我们脸上抹的脏水。' },
      { who: '灰港掮客', text: '账上多出来的名字，我见多了。替身也是一笔生意，只是有人不认账。' },
      { who: '西昭兽人', text: '草原上不兴替身，能打的留下，打不了的自己走。你们城里人真绕。' },
      { who: '海族·洛斯汰', text: '名字？海底不记名字，只记潮。你们的名册，在我们那儿是账单。' },
      { who: '凯斯特来客', text: '征调要盖学院的印。没有印的征调，在我们那儿叫掳人。' }
    ]
  },
  {
    id: 'summer_grain',
    name: '帝国粮贩包下码头',
    intro: '夏天，帝国粮贩包了码头半边仓库。粮价一天一个样。',
    choices: [
      { id: 'buy', label: '趁价还没涨疯，囤一批', result: '你咬牙囤了一批粮。钱袋瘪了，米缸满了。' },
      { id: 'wait', label: '不囤，等它自己落', result: '你看了一眼粮价，转身回了店里。' }
    ],
    versions: [
      { who: '帝国商队', text: '帝国缺粮，这是明面上的事。粮贩包码头，是为了把船排上队。' },
      { who: '共和国本地', text: '缺粮？缺的是他们贵族的粮仓吧。我们这儿的粮车天天有。' },
      { who: '灰港掮客', text: '仓库进出的人不对。粮贩子说是做生意，我看见的是做账。' },
      { who: '西昭兽人', text: '粮不够就换肉。你们的粮价，跟我草原上的牛没关系。' },
      { who: '海族·洛斯汰', text: '粮价涨，鱼价没涨。海里不缺吃的，缺的是能靠岸的地方。' },
      { who: '凯斯特来客', text: '粮是战略物资。学院记过一笔：缺粮的地方，先乱的是账。' }
    ]
  },
  {
    id: 'autumn_vein',
    name: '流脉改道，北港的灯暗了三分',
    intro: '秋天。北港的灯暗了三分，流脉改道了。',
    choices: [
      { id: 'lamp', label: '给自家灯多加一勺戈克', result: '灯亮了一点。你知道这份亮，是从别处借来的。' },
      { id: 'dim', label: '熄一盏，省着用', result: '店里暗下去半边。客人的脸在灯影里，看不清。' }
    ],
    versions: [
      { who: '帝国商队', text: '流脉改道是天象，跟开矿没关系。帝国矿场还开着，灯也亮着。' },
      { who: '共和国本地', text: '北港的灯暗了，是海里的事。老一辈说，潮线挪了，地下的脉也跟着挪。' },
      { who: '灰港掮客', text: '戈克灯一盏亮十年，十年之后呢？没人算过这笔账。' },
      { who: '西昭兽人', text: '草原上的灯用的是油，不靠地底下那些东西。你们信灯，我信火。' },
      { who: '海族·洛斯汰', text: '礁脉断了一截，海底的房子空了一半。你们叫流脉，我们叫潮的骨头。' },
      { who: '凯斯特来客', text: '流脉改道没有先例。学院把它记为「不可解释」——这四个字比任何解释都贵。' }
    ]
  },
  {
    id: 'winter_debt',
    name: '灰港收账人上门',
    intro: '冬天。一个裹着斗篷的人坐到柜台前，把一本册子放在你面前。',
    choices: [
      { id: 'pay', label: '把账结清', result: '你数出铜板，一本一本地结。收账人合上册子，走了。' },
      { id: 'grace', label: '求一个宽限', result: '收账人看了你一眼，册子上多添了一笔。' }
    ],
    versions: [
      { who: '灰港掮客', text: '这世上没有神，只有还没结清的账。收账人只认账，不认人。' },
      { who: '共和国本地', text: '灰港的账本，我们这边也听过。镇上老人说，那是他们自己立的规矩。' },
      { who: '帝国商队', text: '帝国的账目是官家的，灰港那种册子，我们碰都不碰。' },
      { who: '西昭兽人', text: '账？草原上只认谁欠谁一顿肉。你们的册子，比刀子还重。' },
      { who: '海族·洛斯汰', text: '收账人上过我们的礁。海族不赖账，我们只记潮汐，不记名字。' },
      { who: '凯斯特来客', text: '账本是一种宪法。凯斯特不认灰港的册子，但我们承认：写下来的比说出来的重。' }
    ]
  }
];


// ---------- 常客第二段（M8.2：好感 5 星才说） ----------
const CUSTOMER_STORY2 = {
  vasily: '那本名册上，有我弟弟的名字。我跑帝国线，就是想离那页纸远一点。',
  marta: '鹿铃亭换过几任掌柜，我都记得。你别学他们——他们都想着把店做大，最后都走了。',
  otto: '我年轻时也开过店。灰港的册子上，我那一页还空着。你猜为什么。',
  lug: '潮线退了半里，兽群往南挪。我们不是来换盐的，是来看海的。',
  sevein: '礁脉断的那天，我妹妹没回来。你们陆上人说潮是账，我信了一半。',
  leina: '学院查的那本账，最后一页是空白。空白页比写满的更让人睡不着。',
  barto: '掌柜说等麦价落了给我涨工钱。麦价没落，他先病了。',
  vila: '码头多出来的那一笔，名字是我写的。我核了三遍，还是写了。',
  katya: '商队的账对不上，管账的都知道。可谁先说出来，谁就先被记上一笔。',
  oldlim: '海在收账。我爷爷那辈人说过，潮退到某个地方，就该有人还了。',
  vika: '册子又厚了一页。这一页记的是我。',
  agu: '地脉在动。猎户不挖地，可我们知道地下有东西在挪。',
  ting: '姐姐让我上岸买甜的。她没说，礁脉断的那晚，她哭了。',
  sorin: '凯斯特的船绕着北港走。船长说，那片海连学院都不愿提。',
  xiaoman: '外地人好。你不晓得规矩，才会问我叫什么名字。',
  baran: '粮仓少的那部分，在人的嘴里。我就是那张嘴。'
};

// ---------- 三向结局（M8.2） ----------
const ENDINGS = [
  {
    id: 'stay', name: '灯还亮着', axis: '守',
    text: '你把最后一盏灯留在灶台上。榆港的夜里，只有鹿铃亭还亮着。招牌旧了，门槛被踩得发亮，账本上没多出什么，也没少什么。第二年开春，有人敲窗，说还是这口热汤对。',
    egg: '柜子底下那本没署名的菜谱，最后一页还是空白。'
  },
  {
    id: 'ledger', name: '册子上多了一页', axis: '账',
    text: '收账人合上册子的时候，你的名字已经写在上面了。店还在，只是每盏灯亮起来之前，你都要先算一遍这份亮是谁给的。灰港的规矩你学会了：先把账记清楚，再谈别的。',
    egg: '册子最后一页，有人用铅笔写了一个「鹿」字，又被擦掉了。'
  },
  {
    id: 'leave', name: '往南的路', axis: '走',
    text: '你把钥匙交给下一个人，背包里只带了一本没署名的菜谱和半袋盐。往南的路沿着海岸走，走到哪里都能支一口锅。榆港的灯在身后小下去，像有人在夜里替你关了门。',
    egg: '海面上有一盏灯，不在北港，也不在灰港。'
  }
];

// 砍价里老板回应的台词
const CHARM_WORD = {
  easy: {
    deal: '王婶点点头：「行，拿去吧。」',
    counter: '王婶皱眉：「再添一点，这个价给你。」',
    no: '王婶摆摆手：「这价，我连筐都不卖。」',
    greet: '王婶拍了拍鱼干：「看看点什么？」'
  },
  sly: {
    deal: '粮贩眯眼一笑：「成交，算你会还价。」',
    counter: '粮贩摆摆手：「这个数，不二价。」',
    no: '粮贩把货往回收：「你当我是批发商？」',
    greet: '粮贩往粮垛上一靠：「看看要多少？」'
  },
  blunt: {
    deal: '灰港舌头不废话：「拿货。」',
    counter: '灰港舌头冷笑：「这个数，爱拿不拿。」',
    no: '灰港舌头盯着你：「这个价，没得谈。」',
    greet: '灰港舌头压着嗓子：「要什么，快说。」'
  }
};
