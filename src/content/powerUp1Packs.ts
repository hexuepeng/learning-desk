/** Power Up 1 家庭单元包。主题对齐教材，词和句是家里自己准备的。不是上架商品，不主张剑桥授权。 */
export const POWER_UP_1_NOTE =
  '家里自用的 Power Up 1 家庭单元包，主题对齐教材；词和短句来自家庭 EnglishStudy 词表。只留本机，不是上架商品，不主张剑桥授权。';

export const POWER_UP_1_UNIT_COUNT = 11;
export const POWER_UP_1_WORD_COUNT = 186;
export const POWER_UP_1_SENTENCE_COUNT = 186;

export type PowerUp1Unit = {
  unitId: number;
  slug: string;
  name: string;
  nameZh: string;
  label: string;
  wordCount: number;
  wordsFile: string;
  sentencesFile: string;
  wordsText: string;
  sentencesText: string;
};

export const POWER_UP_1_UNITS: PowerUp1Unit[] = [
  {
    "unitId": 0,
    "slug": "hello",
    "name": "Hello!",
    "nameZh": "问好",
    "label": "Hello! · 问好",
    "wordCount": 18,
    "wordsFile": "power-up-1/unit-00-hello.txt",
    "sentencesFile": "power-up-1/unit-00-hello-sentences.txt",
    "wordsText": "name,名字\none,一\ntwo,二\nthree,三\nfour,四\nfive,五\nsix,六\nseven,七\neight,八\nnine,九\nten,十\nred,红色\nblue,蓝色\ngreen,绿色\nyellow,黄色\norange,橙色\npink,粉色\npurple,紫色\n",
    "sentencesText": "My name is Zichen.|我的名字叫子宸\nI have one apple.|我有一个苹果\nI have two pens.|我有两支笔\nThree little pigs.|三只小猪\nFour legs on a chair.|椅子有四条腿\nFive fingers on a hand.|一只手有五个手指\nI see six birds.|我看见六只鸟\nSeven days in a week.|一周有七天\nThe spider has eight legs.|蜘蛛有八条腿\nNine balloons in the sky.|天上有九个气球\nI have ten toes.|我有十个脚趾头\nThe apple is red.|苹果是红色的\nThe sky is blue.|大海是蓝色的\nThe grass is green.|草地是绿色的\nThe sun is yellow.|太阳是黄色的\nI like orange juice.|我喜欢橙汁\nShe has a pink bag.|她有一个粉色的书包\nGrapes are purple.|葡萄是紫色的\n"
  },
  {
    "unitId": 1,
    "slug": "school",
    "name": "Unit 1: School",
    "nameZh": "学校",
    "label": "Unit 1: School · 学校",
    "wordCount": 24,
    "wordsFile": "power-up-1/unit-01-unit-1-school.txt",
    "sentencesFile": "power-up-1/unit-01-unit-1-school-sentences.txt",
    "wordsText": "book,书\npen,笔\npencil,铅笔\nrubber,橡皮\nruler,尺子\ndesk,课桌\nchair,椅子\nbookcase,书架\ncupboard,柜子\ncomputer,电脑\nboard,黑板\nmap,地图\nwall,墙壁\nfloor,地板\nwindow,窗户\ndoor,门\nteacher,老师\nstudent,学生\npencil case,铅笔盒\nbag,书包\nin the bag,在书包里\non the desk,在桌子上\nunder the chair,在椅子下面\nnext to the bookcase,在书架旁边\n",
    "sentencesText": "This is my book.|这是我的书\nI have a pen.|我有一支笔\nThe pencil is yellow.|铅笔是黄色的\nCan I use your rubber?|我能用你的橡皮吗？\nThe ruler is long.|尺子很长\nSit at your desk.|坐在你的课桌旁\nThe chair is red.|椅子是红色的\nThe books are in the bookcase.|书在书架里\nPut it in the cupboard.|把它放进柜子里\nWe use the computer.|我们使用电脑\nLook at the board.|看黑板\nThis is a map of China.|这是一张中国地图\nThe wall is white.|墙是白色的\nSit on the floor.|坐在地板上\nOpen the window.|打开窗户\nClose the door.|关上门\nShe is my teacher.|她是我的老师\nI am a student.|我是一名学生\nMy pencil is in the pencil case.|我的铅笔在铅笔盒里\nMy bag is blue.|我的书包是蓝色的\nThe book is in the bag.|书在书包里\nThe pen is on the desk.|笔在桌子上\nThe cat is under the chair.|猫在椅子下面\nThe chair is next to the bookcase.|椅子在书架旁边\n"
  },
  {
    "unitId": 2,
    "slug": "about-us",
    "name": "Unit 2: About Us",
    "nameZh": "关于我们",
    "label": "Unit 2: About Us · 关于我们",
    "wordCount": 23,
    "wordsFile": "power-up-1/unit-02-unit-2-about-us.txt",
    "sentencesFile": "power-up-1/unit-02-unit-2-about-us-sentences.txt",
    "wordsText": "mom,妈妈\ndad,爸爸\nsister,姐妹\nbrother,兄弟\ngrandma,奶奶\ngrandpa,爷爷\nhead,头\nshoulders,肩膀\nknees,膝盖\ntoes,脚趾\neyes,眼睛\nears,耳朵\nmouth,嘴巴\nnose,鼻子\narms,手臂\nlegs,腿\nhands,手\nfingers,手指\nfeet,脚\nstomach,肚子\nback,背部\nhair,头发\nface,脸\n",
    "sentencesText": "I love my mom.|我爱我妈妈\nMy dad is tall.|我的爸爸很高\nI have a little sister.|我有一个小妹妹\nMy brother is funny.|我的哥哥很有趣\nGrandma is kind.|奶奶很和蔼\nGrandpa tells stories.|爷爷讲故事\nTouch your head.|摸摸你的头\nTwo shoulders.|两个肩膀\nTouch your knees.|摸摸你的膝盖\nWiggle your toes.|扭扭你的脚趾\nI have two eyes.|我有两只眼睛\nI hear with my ears.|我用耳朵听声音\nOpen your mouth.|张开你的嘴\nTouch your nose.|摸摸你的鼻子\nWave your arms.|挥动你的手臂\nI have long legs.|我有长腿\nClap your hands.|拍拍手\nPoint with your fingers.|用手指着\nStamp your feet.|跺跺脚\nMy stomach is full.|我的肚子饱了\nMy back is straight.|我的背很直\nMy hair is black.|我的头发是黑色的\nWash your face.|洗洗脸\n"
  },
  {
    "unitId": 3,
    "slug": "farm",
    "name": "Unit 3: Farm",
    "nameZh": "农场",
    "label": "Unit 3: Farm · 农场",
    "wordCount": 16,
    "wordsFile": "power-up-1/unit-03-unit-3-farm.txt",
    "sentencesFile": "power-up-1/unit-03-unit-3-farm-sentences.txt",
    "wordsText": "cow,奶牛\nduck,鸭子\ngoat,山羊\nhorse,马\nsheep,绵羊\nchicken,鸡\npig,猪\ndonkey,驴\nbig,大的\nsmall,小的\nold,旧的/老的\nnew,新的\nlong,长的\nshort,短的/矮的\nclean,干净的\ndirty,脏的\n",
    "sentencesText": "The cow says moo.|奶牛哞哞叫\nThe duck swims in the water.|鸭子在水里游泳\nThe goat likes grass.|山羊喜欢吃草\nCan you ride a horse?|你会骑马吗？\nThe sheep is white and soft.|绵羊白白软软的\nThe chicken lays eggs.|母鸡下蛋\nThe pig is pink and fat.|小猪粉粉胖胖的\nThe donkey is gray.|驴子是灰色的\nThe elephant is big.|大象很大\nThe mouse is small.|老鼠很小\nThis is an old car.|这是一辆旧车\nI have a new bike.|我有一辆新自行车\nThe snake is long.|蛇很长\nThe pencil is short.|铅笔很短\nMy hands are clean.|我的手很干净\nThe dog is dirty.|小狗脏兮兮的\n"
  },
  {
    "unitId": 4,
    "slug": "food",
    "name": "Unit 4: Food",
    "nameZh": "食物",
    "label": "Unit 4: Food · 食物",
    "wordCount": 18,
    "wordsFile": "power-up-1/unit-04-unit-4-food.txt",
    "sentencesFile": "power-up-1/unit-04-unit-4-food-sentences.txt",
    "wordsText": "apple,苹果\nbanana,香蕉\ncake,蛋糕\ncheese,奶酪\nmilk,牛奶\njuice,果汁\nwater,水\nbread,面包\negg,鸡蛋\nfish,鱼\nfruit,水果\nmeat,肉\nrice,米饭\ncarrots,胡萝卜\npeas,豌豆\npotatoes,土豆\ntomatoes,西红柿\nbeans,豆子\n",
    "sentencesText": "An apple a day.|一天一个苹果\nThe banana is yellow.|香蕉是黄色的\nI like chocolate cake.|我喜欢巧克力蛋糕\nMice love cheese.|老鼠爱奶酪\nDrink your milk.|喝掉你的牛奶\nApple juice is sweet.|苹果汁很甜\nI am thirsty. Water, please.|我渴了，请给我水\nButter on the bread.|面包上抹黄油\nOne egg for breakfast.|早餐吃一个鸡蛋\nThe fish can swim.|鱼会游泳\nFruit is healthy.|水果很健康\nI like to eat meat.|我喜欢吃肉\nWe eat rice every day.|我们每天吃米饭\nRabbits like carrots.|兔子喜欢胡萝卜\nPeas are green.|豌豆是绿色的\nI like mashed potatoes.|我喜欢土豆泥\nTomatoes are red.|西红柿是红色的\nJump like a bean!|像豆子一样跳！\n"
  },
  {
    "unitId": 5,
    "slug": "toys",
    "name": "Unit 5: Toys",
    "nameZh": "玩具",
    "label": "Unit 5: Toys · 玩具",
    "wordCount": 14,
    "wordsFile": "power-up-1/unit-05-unit-5-toys.txt",
    "sentencesFile": "power-up-1/unit-05-unit-5-toys-sentences.txt",
    "wordsText": "ball,球\ncar,小汽车\ndoll,洋娃娃\nbike,自行车\nboat,小船\ntrain,火车\nplane,飞机\nrobot,机器人\nkite,风筝\nmonster,小怪物\nteddy bear,泰迪熊\ngame,游戏\npuzzle,拼图\nscooter,滑板车\n",
    "sentencesText": "Kick the ball.|踢球\nA fast red car.|一辆很快的红赛车\nThe doll is pretty.|洋娃娃很漂亮\nRide your bike.|骑你的自行车\nThe boat is on the water.|小船在水面上\nChoo-choo! The train is coming.|呜呜！火车来了\nThe plane is in the sky.|飞机在天上\nMy robot can walk.|我的机器人会走路\nFly a kite.|放风筝\nA friendly monster.|一个友好的小怪物\nSleep with my teddy bear.|和泰迪熊一起睡觉\nLet's play a game.|我们来玩个游戏吧\nDo a puzzle.|玩拼图\nI have a blue scooter.|我有一个蓝色的滑板车\n"
  },
  {
    "unitId": 6,
    "slug": "day-out",
    "name": "Unit 6: Day Out",
    "nameZh": "外出",
    "label": "Unit 6: Day Out · 外出",
    "wordCount": 16,
    "wordsFile": "power-up-1/unit-06-unit-6-day-out.txt",
    "sentencesFile": "power-up-1/unit-06-unit-6-day-out-sentences.txt",
    "wordsText": "bus,公共汽车\nhelicopter,直升机\nmotorbike,摩托车\nlorry,大货车\ntruck,卡车\nelephant,大象\ngiraffe,长颈鹿\nhippo,河马\nlion,狮子\nmonkey,猴子\nsnake,蛇\ntiger,老虎\nzebra,斑马\ncrocodile,鳄鱼\nzoo,动物园\npark,公园\n",
    "sentencesText": "Go to school by bus.|坐公共汽车上学\nThe helicopter flies high.|直升机飞得很高\nA loud motorbike.|一辆声音很大的摩托车\nThe lorry is very big.|大货车非常大\nA red truck.|一辆红色的卡车\nThe elephant has a long nose.|大象长鼻子\nThe giraffe is very tall.|长颈鹿很高\nThe hippo is in the water.|河马在水里\nThe lion is the king.|狮子是森林之王\nThe monkey likes bananas.|猴子喜欢香蕉\nThe snake has no legs.|蛇没有腿\nThe tiger has stripes.|老虎有条纹\nThe zebra is black and white.|斑马是黑白相间的\nLook at the big crocodile.|看那只大鳄鱼\nLet's go to the zoo.|我们去动物园吧\nPlay in the park.|在公园里玩\n"
  },
  {
    "unitId": 7,
    "slug": "sports",
    "name": "Unit 7: Sports",
    "nameZh": "运动",
    "label": "Unit 7: Sports · 运动",
    "wordCount": 16,
    "wordsFile": "power-up-1/unit-07-unit-7-sports.txt",
    "sentencesFile": "power-up-1/unit-07-unit-7-sports-sentences.txt",
    "wordsText": "baseball,棒球\nbasketball,篮球\nfootball,足球\nhockey,曲棍球\ntennis,网球\ncatch,抓/接\nfly,飞/放风筝\nhit,打/击\njump,跳\nkick,踢\nrun,跑\nswim,游泳\nthrow,扔/投\nskate,滑冰\nsing,唱歌\ndance,跳舞\n",
    "sentencesText": "Play baseball.|打棒球\nThrow the basketball.|投篮\nPlay football together.|一起踢足球\nHockey is fun.|曲棍球很有趣\nHit the tennis ball.|打网球\nCatch the ball!|接球！\nFly a kite in the wind.|在风里放风筝\nHit the ball with a bat.|用球棒击球\nJump high!|跳高！\nKick the ball to me.|把球踢给我\nRun fast.|跑快点\nI can swim like a fish.|我会像鱼一样游泳\nThrow the ball.|扔球\nI can skate on ice.|我会在冰上滑冰\nI like to sing.|我喜欢唱歌\nLet's dance!|我们跳舞吧！\n"
  },
  {
    "unitId": 8,
    "slug": "home",
    "name": "Unit 8: Home",
    "nameZh": "家",
    "label": "Unit 8: Home · 家",
    "wordCount": 14,
    "wordsFile": "power-up-1/unit-08-unit-8-home.txt",
    "sentencesFile": "power-up-1/unit-08-unit-8-home-sentences.txt",
    "wordsText": "bathroom,浴室\nbedroom,卧室\nkitchen,厨房\nliving room,客厅\nbed,床\nclock,时钟\nlamp,台灯\nmirror,镜子\nphone,电话\nsofa,沙发\ntable,桌子\ntelevision,电视\nfridge,冰箱\nshower,淋浴\n",
    "sentencesText": "Wash your hands in the bathroom.|在浴室洗手\nSleep in my bedroom.|在我的卧室睡觉\nMom is in the kitchen.|妈妈在厨房\nWatch TV in the living room.|在客厅看电视\nMy bed is soft.|我的床很软\nLook at the clock.|看时钟\nTurn on the lamp.|开灯\nLook in the mirror.|照镜子\nTalk on the phone.|打电话\nSit on the sofa.|坐在沙发上\nEat dinner at the table.|在桌子旁吃晚饭\nI like watching television.|我喜欢看电视\nMilk is in the fridge.|牛奶在冰箱里\nTake a shower.|洗个澡\n"
  },
  {
    "unitId": 9,
    "slug": "holidays",
    "name": "Unit 9: Holidays",
    "nameZh": "假期",
    "label": "Unit 9: Holidays · 假期",
    "wordCount": 16,
    "wordsFile": "power-up-1/unit-09-unit-9-holidays.txt",
    "sentencesFile": "power-up-1/unit-09-unit-9-holidays-sentences.txt",
    "wordsText": "shirt,衬衫\njacket,夹克\ndress,连衣裙\nskirt,裙子\nsocks,袜子\ntrousers,长裤\nT-shirt,T恤\nshoes,鞋子\nhat,帽子\nsand,沙子\nsea,大海\nshells,贝壳\nsun,太阳\nbeach,沙滩\nsunglasses,太阳镜\nice cream,冰淇淋\n",
    "sentencesText": "Put on your shirt.|穿上你的衬衫\nIt is cold. Wear a jacket.|很冷，穿上夹克\nA beautiful pink dress.|一条漂亮的粉色连衣裙\nI like your skirt.|我喜欢你的裙子\nTwo blue socks.|两只蓝袜子\nMy trousers are brown.|我的裤子是棕色的\nI wear a T-shirt in summer.|我夏天穿T恤\nTie your shoes.|系鞋带\nWear a hat in the sun.|太阳底下戴帽子\nPlay with sand.|玩沙子\nThe sea is blue.|大海是蓝色的\nI find some shells.|我捡到一些贝壳\nThe sun is hot.|太阳很烫\nLet's go to the beach.|我们去沙滩吧\nWear your sunglasses.|戴上你的太阳镜\nI love ice cream.|我爱冰淇淋\n"
  },
  {
    "unitId": 10,
    "slug": "people",
    "name": "Unit 10: People",
    "nameZh": "人物",
    "label": "Unit 10: People · 人物",
    "wordCount": 11,
    "wordsFile": "power-up-1/unit-10-unit-10-people.txt",
    "sentencesFile": "power-up-1/unit-10-unit-10-people-sentences.txt",
    "wordsText": "doctor,医生\nfarmer,农民\npilot,飞行员\npoliceman,警察\nsinger,歌手\nyoung,年轻的\nbeautiful,美丽的\nfunny,有趣的\nhappy,开心的\nsad,伤心的\nangry,生气的\n",
    "sentencesText": "The doctor helps people.|医生帮助人们\nThe farmer grows food.|农民种粮食\nThe pilot flies the plane.|飞行员开飞机\nThe policeman is brave.|警察很勇敢\nThe singer sings well.|歌手唱歌很好听\nThe baby is young.|宝宝很年轻\nThe flower is beautiful.|花朵很美丽\nThe clown is funny.|小丑很有趣\nI am very happy.|我很开心\nDon't be sad.|别伤心\nDad is angry.|爸爸生气了\n"
  }
];

export function getPowerUp1Unit(unitId: number): PowerUp1Unit | undefined {
  return POWER_UP_1_UNITS.find((unit) => unit.unitId === unitId);
}
