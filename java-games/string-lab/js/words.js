/* String Lab — authored word and phrase source data.
 * All text is lowercase/ASCII, familiar, and safe for high-school classrooms.
 * One displayed character == one UTF-16 code unit == one index position. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});

  // Everyday words, 4-11 letters. Repetition is computed, not authored.
  var WORDS = (
    'planet robot comet rocket orbit galaxy cloud storm river ocean beach island forest desert valley mountain ' +
    'garden flower grass bridge castle window mirror pencil marker eraser folder ruler binder button screen ' +
    'keyboard monitor laptop cable battery signal circuit pixel python coding program method string number ' +
    'puzzle riddle puppet guitar piano violin drums trumpet flute melody rhythm chorus singer dancer ' +
    'apple banana orange grape lemon cherry peach mango melon berry carrot potato tomato pepper onion bread ' +
    'butter cheese pizza pasta salad cookie candy cereal coffee pancake waffle muffin yogurt ' +
    'tiger zebra monkey rabbit turtle spider parrot dolphin penguin giraffe panda koala otter beaver donkey ' +
    'basket bottle jacket pocket ticket rocket helmet hammer ladder bucket candle blanket pillow carpet ' +
    'school teacher student lesson science history reading writing project question answer coach player ' +
    'soccer tennis hockey bowling skating surfing racing jumping running swimming climbing hiking ' +
    'purple yellow orange silver golden copper bronze shadow bright shiny smooth rough gentle quiet ' +
    'summer winter spring autumn season sunset sunrise morning evening weekend holiday ' +
    'ballon balloon letter pattern little middle summit puppy kitten ribbon button mitten lemon melon ' +
    'computer internet website browser network server memory storage printer speaker camera battery ' +
    'library museum market station airport harbor village county kitchen bedroom hallway doorway ' +
    'wonder travel adventure journey explore discover create imagine invent design'
  ).split(/\s+/).filter(function (w) { return w && w !== 'ballon'; });

  var MORE_WORDS = (
    'eagle shark whale snake lizard horse sheep goat chicken goose camel rhino hippo moose gorilla cheetah leopard falcon salmon lobster oyster crab squid ' +
    'sunny rainy windy snowy cloudy breeze thunder lightning volcano glacier canyon meadow jungle swamp pond creek waterfall ' +
    'notebook backpack recess homework algebra geometry quiz grade lunch chalk ' +
    'mouse tablet router modem cursor domain upload download android update backup theme font icon emoji ' +
    'sandwich burger noodle soup rice bagel pretzel cupcake brownie pudding honey syrup jelly peanut almond walnut strawberry blueberry cucumber lettuce celery pumpkin ' +
    'baseball football golf rugby archery fencing boxing karate marathon sprint relay goalie referee trophy stadium ' +
    'bicycle skateboard scooter wagon sailboat jetpack engine wheel pedal whistle compass anchor treasure pirate dragon wizard knight kingdom crystal ' +
    'borrow gather launch measure paddle polish rescue search sketch tickle wander ' +
    'happy brave clever friendly honest humble jolly lively mighty proud sleepy ' +
    'tomato papaya coconut cocoa pepper murmur bonbon mammal ananas couscous mississippi tartar banana'
  ).split(/\s+/);

  var STEMS = 'jump walk play paint cook help kick look pick talk want work climb count plant print clean fill laugh learn listen march open pull push roll rush splash stamp start stay thank touch train turn visit wait wash watch wish yell zoom'.split(' ');
  var ER_STEMS = 'jump walk play paint cook help kick talk work climb count plant print clean learn listen train visit wash watch'.split(' ');
  var DERIVED = [];
  STEMS.forEach(function (st) {
    DERIVED.push(st + 'ed', st + 'ing', st + 's');
    if (ER_STEMS.indexOf(st) >= 0) DERIVED.push(st + 'er');
  });

  // Real compound words: [first, second]. Joined value is a real word.
  var COMPOUNDS = [
    ['sun', 'flower'], ['sun', 'shine'], ['foot', 'ball'], ['base', 'ball'], ['basket', 'ball'], ['rain', 'bow'],
    ['note', 'book'], ['star', 'fish'], ['snow', 'man'], ['snow', 'flake'], ['book', 'shelf'], ['moon', 'light'],
    ['honey', 'bee'], ['sail', 'boat'], ['door', 'bell'], ['fire', 'fly'], ['air', 'plane'], ['back', 'pack'],
    ['butter', 'fly'], ['cup', 'cake'], ['day', 'light'], ['eye', 'brow'], ['pop', 'corn'], ['pan', 'cake'],
    ['sea', 'shell'], ['tooth', 'brush'], ['water', 'melon'], ['tree', 'house'], ['play', 'ground'], ['rail', 'road'],
    ['class', 'room'], ['bed', 'room'], ['news', 'paper'], ['sand', 'castle'], ['light', 'house'], ['gold', 'fish'],
    ['bird', 'house'], ['home', 'work'], ['green', 'house'], ['paint', 'brush'], ['skate', 'board'], ['sky', 'line'],
    ['hand', 'shake'], ['over', 'time'], ['under', 'ground'], ['out', 'side'], ['week', 'end'], ['black', 'board']
  ];

  // Short words for building two-variable concatenation / reassembly tasks.
  var SHORT = ['cat', 'dog', 'sun', 'sky', 'red', 'box', 'map', 'pen', 'cup', 'hat', 'bag', 'ice', 'fox', 'owl',
    'pie', 'bus', 'jam', 'ant', 'key', 'web', 'net', 'run', 'top', 'fun', 'zip', 'gem', 'log', 'kit', 'bit', 'tap'];

  // Leading labels used when mixing text and numbers (never end the output with a space).
  var LABELS = ['Score: ', 'Level ', 'Room ', 'Total: ', 'Result: ', 'Item ', 'Page ', 'Team ', 'Grade: ', 'Count: ', 'Step ', 'Lap '];
  var SEPARATORS = ['-', '_', ':', '/', '+', '=', '|', ', ', '#'];
  var NAMES = ['Ava', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Ivy', 'Jon', 'Kai', 'Lena', 'Max', 'Nora', 'Omar', 'Pia', 'Raj', 'Sam', 'Tia', 'Uma', 'Zoe',
    'Alma', 'Bo', 'Cruz', 'Dana', 'Eve', 'Finn', 'Gia', 'Hugo', 'Iris', 'Jade', 'Kira', 'Leo', 'Mia', 'Noah', 'Owen', 'Rosa', 'Seth', 'Tess', 'Vic', 'Wes'];
  var GREETINGS = ['Hi, ', 'Hello, ', 'Dear ', 'Go, ', 'Hey ', 'Yo, ', 'Team '];
  var PUNCT_SUFFIXES = ['!', '?', '-1', ' rocks', '_x', '2'];

  // Variable-name pools (name changes alone never create a "new" challenge).
  var STRING_NAMES = ['word', 'text', 'name', 'phrase', 'message', 'title', 'label', 'city', 'color', 'animal', 'fruit', 's', 'str', 'code', 'item', 'pet', 'topic'];
  var STRING_PAIRS = [['first', 'second'], ['a', 'b'], ['left', 'right'], ['x', 'y'], ['head', 'tail'], ['one', 'two'], ['part1', 'part2'], ['front', 'back']];
  var INT_NAMES = ['n', 'count', 'num', 'total', 'size', 'amount', 'points', 'level'];
  var POS_NAMES = ['position', 'index', 'pos', 'spot', 'where', 'found'];
  var START_NAMES = ['start', 'begin', 'from', 'cut', 'mark'];

  WORDS = WORDS.concat(MORE_WORDS, DERIVED, COMPOUNDS.map(function (c) { return c[0] + c[1]; }))
    .filter(function (w, i, a) { return /^[a-z]{4,12}$/.test(w) && a.indexOf(w) === i; });

  function letters(w) {
    var seen = {}, rep = false, i;
    for (i = 0; i < w.length; i++) { if (seen[w[i]]) rep = true; seen[w[i]] = (seen[w[i]] || 0) + 1; }
    return { counts: seen, hasRepeat: rep };
  }

  /** Pick a word satisfying simple constraints. opts: min,max,repeat(true/false/undefined). */
  function pickWord(rng, opts) {
    opts = opts || {};
    var pool = WORDS.filter(function (w) {
      if (opts.min && w.length < opts.min) return false;
      if (opts.max && w.length > opts.max) return false;
      if (opts.repeat !== undefined && letters(w).hasRepeat !== opts.repeat) return false;
      if (opts.exclude && opts.exclude.indexOf(w) >= 0) return false;
      return true;
    });
    return rng.pick(pool.length ? pool : WORDS);
  }

  SL.Words = {
    WORDS: WORDS, COMPOUNDS: COMPOUNDS, SHORT: SHORT, LABELS: LABELS, SEPARATORS: SEPARATORS, NAMES: NAMES,
    GREETINGS: GREETINGS, PUNCT_SUFFIXES: PUNCT_SUFFIXES, STRING_NAMES: STRING_NAMES, STRING_PAIRS: STRING_PAIRS, INT_NAMES: INT_NAMES,
    POS_NAMES: POS_NAMES, START_NAMES: START_NAMES, letters: letters, pickWord: pickWord
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
