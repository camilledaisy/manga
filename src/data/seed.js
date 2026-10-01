// Prototype USER-GENERATED data: other readers, their libraries, reviews and lists,
// plus a believable reading history for the signed-in user so stats and feeds aren't empty.
// Generated relative to the moment of first launch, deterministically.
import { CATALOG } from './catalog.js';

const DAY = 864e5;
const byId = Object.fromEntries(CATALOG.map(m => [m.id, m]));

function rng(seed) { // mulberry32
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const USERS = [
  { id: 'u_daisy', username: 'daisy', name: 'Daisy', hue: 330, joinedDaysAgo: 720,
    bio: 'Josei apologist. Will cry over any manga with a good train scene. Currently fighting a Vagabond-sized reading slump.',
    favorites: ['nana', 'monster', 'paradise-kiss', 'vagabond', 'goodnight-punpun', 'honey-and-clover', 'mushishi'],
    favoriteCharacters: [{ name: 'Nana Osaki', mangaId: 'nana' }, { name: 'Johan Liebert', mangaId: 'monster' }, { name: 'Frieren', mangaId: 'frieren' }, { name: 'Senshi', mangaId: 'dungeon-meshi' }] },
  { id: 'u_kenji', username: 'kenji', name: 'Kenji Morita', hue: 210, joinedDaysAgo: 1100,
    bio: 'Seinen, historical epics, and anything Urasawa touches. Re-reading Vagabond every winter.',
    favorites: ['vagabond', 'vinland-saga', 'monster', '20th-century-boys', 'berserk', 'pluto'],
    favoriteCharacters: [{ name: 'Askeladd', mangaId: 'vinland-saga' }, { name: 'Miyamoto Musashi', mangaId: 'vagabond' }] },
  { id: 'u_mika', username: 'mika', name: 'Mika', hue: 350, joinedDaysAgo: 500,
    bio: 'Shoujo & josei forever. Ai Yazawa is my religion. Will talk your ear off about fashion in manga.',
    favorites: ['nana', 'paradise-kiss', 'fruits-basket', 'honey-and-clover', 'fragrant-flower'],
    favoriteCharacters: [{ name: 'Nana Komatsu', mangaId: 'nana' }, { name: 'Tohru Honda', mangaId: 'fruits-basket' }] },
  { id: 'u_sol', username: 'sol', name: 'Sol', hue: 100, joinedDaysAgo: 300,
    bio: 'Horror goblin. Junji Ito changed my brain chemistry. Read with the lights on.',
    favorites: ['uzumaki', 'tomie', 'summer-hikaru-died', 'goodnight-punpun', 'chainsaw-man'],
    favoriteCharacters: [{ name: 'Power', mangaId: 'chainsaw-man' }, { name: 'Tomie Kawakami', mangaId: 'tomie' }] },
  { id: 'u_ren', username: 'ren', name: 'Ren Park', hue: 260, joinedDaysAgo: 260,
    bio: 'Mostly manhwa and webtoons. Recommend me a hidden gem and I\'ll read it tonight.',
    favorites: ['omniscient-reader', 'the-horizon', 'tower-of-god', 'heaven-officials-blessing', 'solo-leveling'],
    favoriteCharacters: [{ name: 'Kim Dokja', mangaId: 'omniscient-reader' }] },
  { id: 'u_hana', username: 'hana', name: 'Hana', hue: 40, joinedDaysAgo: 640,
    bio: 'Slice of life and cozy reads, preferably with food in them.',
    favorites: ['dungeon-meshi', 'skip-and-loafer', 'mushishi', 'frieren', 'march-comes-in'],
    favoriteCharacters: [{ name: 'Senshi', mangaId: 'dungeon-meshi' }, { name: 'Mitsumi Iwakura', mangaId: 'skip-and-loafer' }] },
];

// [mangaId, status, chapter, rating, startedDaysAgo, endedDaysAgo (completed, or last read)]
const LIBRARIES = {
  u_daisy: [
    ['chainsaw-man', 'reading', 84, 0, 200, 1], ['frieren', 'reading', 112, 9, 150, 3], ['vagabond', 'reading', 212, 10, 120, 2],
    ['blue-period', 'reading', 41, 0, 60, 6], ['dandadan', 'reading', 97, 0, 90, 0.3], ['vinland-saga', 'reading', 160, 9, 240, 9],
    ['witch-hat-atelier', 'reading', 58, 0, 45, 4],
    ['monster', 'completed', 162, 10, 330, 290], ['nana', 'completed', 84, 10, 260, 225], ['paradise-kiss', 'completed', 48, 9, 222, 210],
    ['goodnight-punpun', 'completed', 147, 9, 200, 175], ['20th-century-boys', 'completed', 249, 8, 170, 130], ['pluto', 'completed', 65, 9, 128, 115],
    ['look-back', 'completed', 1, 9, 100, 100], ['a-silent-voice', 'completed', 62, 8, 95, 85], ['honey-and-clover', 'completed', 64, 9, 80, 62],
    ['uzumaki', 'completed', 20, 7, 55, 50], ['dungeon-meshi', 'completed', 97, 9, 48, 25], ['mushishi', 'completed', 50, 8, 30, 14],
    ['the-horizon', 'completed', 22, 8, 20, 19], ['insomniacs', 'completed', 123, 8, 400, 370], ['fruits-basket', 'completed', 136, 8, 600, 520],
    ['oshi-no-ko', 'completed', 166, 6, 700, 640],
    ['berserk', 'planning', 0, 0, 40], ['march-comes-in', 'planning', 0, 0, 70], ['skip-and-loafer', 'planning', 0, 0, 12],
    ['heaven-officials-blessing', 'planning', 0, 0, 25], ['summer-hikaru-died', 'planning', 0, 0, 5],
    ['one-piece', 'paused', 640, 0, 500, 280], ['solo-leveling', 'dropped', 70, 5, 380, 360],
  ],
  u_kenji: [['vagabond', 'completed', 327, 10, 90, 20], ['vinland-saga', 'completed', 220, 9, 60, 8], ['berserk', 'reading', 300, 10, 40, 1],
    ['20th-century-boys', 'completed', 249, 8, 30, 16], ['monster', 'completed', 162, 10, 200, 150], ['pluto', 'completed', 65, 9, 25, 12],
    ['blame', 'reading', 30, 0, 10, 2], ['march-comes-in', 'planning', 0, 0, 6]],
  u_mika: [['nana', 'completed', 84, 10, 300, 280], ['paradise-kiss', 'completed', 48, 10, 270, 260], ['fruits-basket', 'completed', 136, 8, 120, 90],
    ['fragrant-flower', 'reading', 139, 9, 40, 0.5], ['honey-and-clover', 'completed', 64, 9, 18, 4], ['skip-and-loafer', 'reading', 50, 0, 10, 3],
    ['insomniacs', 'planning', 0, 0, 5]],
  u_sol: [['uzumaki', 'completed', 20, 9, 200, 199], ['tomie', 'completed', 20, 8, 150, 140], ['summer-hikaru-died', 'reading', 44, 9, 30, 2],
    ['chainsaw-man', 'reading', 212, 8, 120, 1], ['goodnight-punpun', 'completed', 147, 10, 90, 60], ['dandadan', 'reading', 180, 0, 20, 0.2],
    ['kagurabachi', 'planning', 0, 0, 3]],
  u_ren: [['omniscient-reader', 'reading', 262, 9, 100, 4], ['solo-leveling', 'completed', 200, 7, 300, 250], ['tower-of-god', 'reading', 410, 8, 200, 6],
    ['the-horizon', 'completed', 22, 10, 14, 13], ['heaven-officials-blessing', 'reading', 120, 9, 50, 1], ['fox-spirit-matchmaker', 'planning', 0, 0, 9]],
  u_hana: [['dungeon-meshi', 'completed', 97, 10, 400, 300], ['skip-and-loafer', 'reading', 72, 9, 30, 7], ['mushishi', 'completed', 50, 9, 60, 21],
    ['frieren', 'reading', 146, 9, 90, 4], ['march-comes-in', 'reading', 150, 0, 25, 1.5], ['witch-hat-atelier', 'planning', 0, 0, 11]],
};

const FOLLOWS = { u_daisy: ['u_kenji', 'u_mika', 'u_sol'], u_kenji: ['u_daisy', 'u_hana'], u_mika: ['u_daisy', 'u_sol'],
  u_sol: ['u_daisy'], u_ren: ['u_hana'], u_hana: ['u_daisy', 'u_kenji', 'u_ren'] };

// [userId, mangaId, rating, spoiler, daysAgo, body]
const REVIEWS = [
  ['u_daisy', 'monster', 10, false, 288, 'Johan is the scariest villain I\'ve read because the book never raises its voice. Urasawa lets whole chapters be about side characters, a retired detective, a girl in a bakery, and every one of them earns its place. The ending is quieter than you\'d expect, and I thought about it for a month.'],
  ['u_daisy', 'nana', 10, true, 224, 'Volume 12 ruined me. Knowing from the flash-forwards that Nana and Hachi end up apart turns every happy scene in apartment 707 into a countdown. Ren\'s fate is telegraphed for chapters and it still hit like a truck.'],
  ['u_daisy', 'goodnight-punpun', 9, false, 174, 'I don\'t know if I liked it. I know I couldn\'t stop. Asano\'s backgrounds look like photographs of loneliness, and Punpun\'s shifting doodle body is the best picture of depression I\'ve seen in comics.'],
  ['u_daisy', 'paradise-kiss', 9, false, 209, 'Yazawa\'s fashion spreads are gorgeous, and the ending is braver than most romance manga dare to be. George is a terrible boyfriend and the book knows it.'],
  ['u_kenji', 'vagabond', 10, false, 19, 'The fight against the seventy Yoshioka swordsmen is the best action sequence in manga, and then Inoue spends the next arc on growing rice. Both arcs are about the same thing.'],
  ['u_kenji', 'vinland-saga', 9, true, 7, 'Farmland arc haters, I\'m sorry, but Thorfinn saying "I have no enemies" is the whole series. Askeladd\'s death at the royal court was the end of the prologue, not the peak.'],
  ['u_kenji', '20th-century-boys', 8, false, 15, 'Brilliant for eighteen volumes. Who Friend turns out to be is the least interesting thing about it. Read it for Kenji\'s song.'],
  ['u_mika', 'nana', 10, false, 279, 'Every girl I know who read Nana at 15 re-read it at 25 and found a completely different book.'],
  ['u_mika', 'fruits-basket', 8, false, 89, 'Starts as a cute zodiac gimmick and becomes a story about abuse and breaking cycles. Handled with more care than I expected.'],
  ['u_mika', 'fragrant-flower', 9, false, 2, 'The kindest romance running right now. Nobody is cruel just to manufacture drama, and it\'s still tense.'],
  ['u_sol', 'uzumaki', 9, false, 198, 'Read this in one sitting at 2am. Mistake. The snail chapter lives in my head rent free.'],
  ['u_sol', 'summer-hikaru-died', 9, false, 3, 'Best horror manga in years. The sound effects are drawn into the texture of the panels; you can almost hear the cicadas go quiet.'],
  ['u_sol', 'chainsaw-man', 8, true, 40, 'Part 1 ending with Denji eating Makima as an act of love is so unhinged that it loops back around to tender.'],
  ['u_ren', 'omniscient-reader', 9, false, 30, 'Finally a "regressor" story that\'s actually about why we read stories. Kim Dokja is a reader, not a hero, and that\'s the point.'],
  ['u_ren', 'solo-leveling', 7, false, 249, 'Pure popcorn. The art carries it. Don\'t come for the characters.'],
  ['u_ren', 'the-horizon', 10, false, 12, 'Twenty-two chapters, barely any dialogue, and I sat in silence after.'],
  ['u_hana', 'dungeon-meshi', 10, false, 299, 'The most thought-through fantasy world I\'ve read, and it\'s a cooking manga. Senshi deserves everything.'],
  ['u_hana', 'skip-and-loafer', 9, false, 6, 'Mitsumi is the protagonist I wish I\'d had in high school. Low stakes, huge heart.'],
];

// [reviewIndex, userId, daysAgo, body]
const COMMENTS = [
  [0, 'u_kenji', 280, 'The bakery chapter! Nobody talks about the bakery chapter.'],
  [0, 'u_mika', 270, 'Okay you finally convinced me. Adding it.'],
  [10, 'u_daisy', 50, 'The snail chapter is why I don\'t own a terrarium anymore.'],
  [5, 'u_hana', 6, 'Farmland arc defender reporting in.'],
  [5, 'u_daisy', 5, 'Saving this until I finish. Spoiler tag respected, thank you.'],
  [15, 'u_hana', 10, 'Adding this to my list right now.'],
];

// [userId, title, description, public, mangaIds, daysAgo]
const LISTS = [
  ['u_daisy', 'Psychological Manga That Destroyed Me', 'Read one, then go outside and touch grass before the next.', true, ['goodnight-punpun', 'monster', 'the-horizon', '20th-century-boys', 'oshi-no-ko'], 60],
  ['u_daisy', 'Comfort Reads', 'For sick days, rainy days and post-Punpun recovery.', true, ['honey-and-clover', 'dungeon-meshi', 'frieren', 'skip-and-loafer', 'fruits-basket'], 40],
  ['u_daisy', 'Best Manga Art', 'Pages I would hang on a wall.', true, ['vagabond', 'berserk', 'witch-hat-atelier', 'blame', 'mushishi'], 90],
  ['u_daisy', 'Need to Read ASAP', 'The guilt pile.', false, ['berserk', 'march-comes-in', 'skip-and-loafer', 'heaven-officials-blessing'], 12],
  ['u_daisy', '5-Star Manga', 'The ones I give a 10.', true, ['monster', 'nana', 'vagabond'], 200],
  ['u_kenji', 'Urasawa Starter Pack', 'Start with Monster. Then you will not need convincing.', true, ['monster', '20th-century-boys', 'pluto'], 30],
  ['u_mika', 'Ai Yazawa & Friends', 'Fashion, heartbreak, and girls who know what they want (mostly).', true, ['nana', 'paradise-kiss', 'honey-and-clover', 'fruits-basket'], 100],
  ['u_sol', 'Don\'t Read These at Night', 'I warned you.', true, ['uzumaki', 'tomie', 'summer-hikaru-died', 'goodnight-punpun'], 20],
  ['u_ren', 'Manhwa for Beginners', 'Where to start if you only read manga.', true, ['solo-leveling', 'tower-of-god', 'omniscient-reader', 'the-horizon'], 15],
  ['u_hana', 'Food Is Love', 'Manga that will make you hungry.', true, ['dungeon-meshi', 'skip-and-loafer', 'march-comes-in'], 50],
];

export function seed(now = Date.now()) {
  const rand = rng(20261001);
  const ago = (d) => Math.round(now - d * DAY);
  let n = 0;
  const id = (p) => `${p}_${(++n).toString(36)}`;
  const activity = [];
  const act = (userId, at, a) => activity.push({ id: id('a'), userId, at, ...a });

  const users = {}, library = {};
  for (const u of USERS) {
    const { joinedDaysAgo, ...rest } = u;
    users[u.id] = { ...rest, avatar: null, joinedAt: ago(joinedDaysAgo) };
    library[u.id] = {};
    for (const [mangaId, status, chapter, rating, started, ended] of LIBRARIES[u.id]) {
      const m = byId[mangaId];
      const total = m.chapters || m.latest;
      const volume = m.volumes && total ? Math.min(m.volumes, Math.floor(chapter / total * m.volumes)) : 0;
      const e = library[u.id][mangaId] = {
        status, chapter, volume: status === 'completed' && m.volumes ? m.volumes : volume, rating, notes: '',
        addedAt: ago(started + 2), updatedAt: ago(ended ?? started), startedAt: status === 'planning' ? null : ago(started),
        completedAt: status === 'completed' ? ago(ended) : null,
      };
      if (status === 'planning') { act(u.id, e.addedAt, { type: 'status', mangaId, status }); continue; }
      act(u.id, e.startedAt, { type: 'status', mangaId, status: 'reading' });
      // Reading sessions spread between start and end, evening-ish.
      const sessions = Math.max(1, Math.min(chapter, u.id === 'u_daisy' ? 24 : 4));
      const marks = Array.from({ length: sessions - 1 }, () => Math.floor(rand() * chapter)).concat(0, chapter).sort((a, b) => a - b);
      const times = Array.from({ length: sessions }, () => started - rand() * (started - ended)).sort((a, b) => b - a);
      marks.slice(1).forEach((to, i) => {
        if (to > marks[i]) act(u.id, ago(times[i]), { type: 'progress', mangaId, unit: 'chapter', from: marks[i], to });
      });
      if (status !== 'reading') act(u.id, ago(ended), { type: 'status', mangaId, status });
      if (rating) act(u.id, ago(ended) + 6e4, { type: 'rating', mangaId, rating });
    }
  }

  const reviews = REVIEWS.map(([userId, mangaId, rating, spoiler, daysAgo, body]) => {
    const likers = Object.keys(users).filter(u => u !== userId && rand() < 0.5);
    act(userId, ago(daysAgo), { type: 'review', mangaId, rating });
    return { id: id('r'), userId, mangaId, rating, spoiler, body, createdAt: ago(daysAgo), likes: likers, comments: [] };
  });
  for (const [i, userId, daysAgo, body] of COMMENTS) reviews[i].comments.push({ id: id('c'), userId, body, createdAt: ago(daysAgo) });

  const lists = LISTS.map(([userId, title, description, isPublic, mangaIds, daysAgo]) => {
    const listId = id('l');
    if (isPublic) act(userId, ago(daysAgo), { type: 'list', listId, title });
    return { id: listId, userId, title, description, public: isPublic, mangaIds, createdAt: ago(daysAgo), updatedAt: ago(daysAgo) };
  });

  activity.sort((a, b) => b.at - a.at);
  return { version: 1, session: { userId: 'u_daisy' }, users, follows: FOLLOWS, library, reviews, lists, activity };
}
