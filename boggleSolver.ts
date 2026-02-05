import { isWordSpelledCorrectly } from './hunspellDictionary';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isWord: boolean = false;
  word?: string;
}

class Trie {
  root: TrieNode = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isWord = true;
    node.word = word.toLowerCase();
  }

  search(word: string): boolean {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    return node.isWord;
  }

  hasPrefix(prefix: string): boolean {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    return true;
  }

  getNode(prefix: string): TrieNode | null {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }
    return node;
  }
}

let cachedTrie: Trie | null = null;
const solverCache: Map<string, SolverResult> = new Map();

export interface SolverResult {
  allWords: string[];
  longestLength: number;
  longestWords: string[];
  longestCount: number;
}

async function buildTrie(): Promise<Trie> {
  if (cachedTrie) {
    return cachedTrie;
  }

  const trie = new Trie();

  const commonWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day',
    'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'time', 'two', 'way', 'who', 'boy',
    'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'may', 'own', 'any', 'had', 'art', 'age', 'run',
    'cat', 'dog', 'hat', 'bat', 'rat', 'mat', 'sat', 'pat', 'fat', 'eat', 'tea', 'sea', 'pea', 'red', 'bed',
    'led', 'fed', 'wed', 'pen', 'hen', 'ten', 'men', 'den', 'big', 'dig', 'fig', 'jig', 'pig', 'wig', 'rig',
    'hot', 'pot', 'dot', 'got', 'lot', 'not', 'rot', 'cot', 'sun', 'fun', 'gun', 'run', 'bun', 'nun', 'pun',
    'car', 'bar', 'far', 'jar', 'tar', 'war', 'map', 'cap', 'gap', 'lap', 'nap', 'rap', 'tap', 'zap', 'sap',
    'box', 'fox', 'pox', 'ball', 'call', 'fall', 'hall', 'mall', 'tall', 'wall', 'bell', 'cell', 'dell', 'fell',
    'tell', 'well', 'yell', 'sell', 'bill', 'dill', 'fill', 'gill', 'hill', 'kill', 'mill', 'pill', 'till', 'will',
    'book', 'cook', 'hook', 'look', 'took', 'back', 'lack', 'pack', 'rack', 'sack', 'tack', 'band', 'hand', 'land',
    'sand', 'bang', 'gang', 'hang', 'rang', 'sang', 'bank', 'rank', 'sank', 'tank', 'barn', 'darn', 'earn', 'warn',
    'yarn', 'base', 'case', 'vase', 'bass', 'lass', 'mass', 'pass', 'bath', 'math', 'path', 'bean', 'dean', 'lean',
    'mean', 'wean', 'bear', 'dear', 'fear', 'gear', 'hear', 'near', 'pear', 'rear', 'tear', 'wear', 'year', 'beat',
    'feat', 'heat', 'meat', 'neat', 'peat', 'seat', 'teat', 'bent', 'dent', 'lent', 'rent', 'sent', 'tent', 'vent',
    'went', 'berg', 'best', 'nest', 'pest', 'rest', 'test', 'vest', 'west', 'zest', 'bile', 'file', 'mile', 'pile',
    'tile', 'vile', 'wile', 'bind', 'find', 'hind', 'kind', 'mind', 'rind', 'wind', 'bird', 'bite', 'cite', 'kite',
    'mite', 'site', 'bits', 'fits', 'hits', 'kits', 'pits', 'sits', 'wits', 'blue', 'clue', 'flue', 'glue', 'true',
    'boar', 'roar', 'soar', 'boat', 'coat', 'goat', 'moat', 'body', 'bold', 'cold', 'fold', 'gold', 'hold', 'mold',
    'sold', 'told', 'bolt', 'colt', 'jolt', 'volt', 'bomb', 'comb', 'tomb', 'bond', 'fond', 'pond', 'bone', 'cone',
    'done', 'gone', 'hone', 'lone', 'none', 'tone', 'zone', 'born', 'corn', 'horn', 'morn', 'porn', 'torn', 'worn',
    'boss', 'loss', 'moss', 'toss', 'both', 'bowl', 'fowl', 'howl', 'jowl', 'yowl', 'boys', 'toys', 'burn', 'turn',
    'bury', 'busy', 'buzz', 'cage', 'page', 'rage', 'sage', 'wage', 'cake', 'fake', 'lake', 'make', 'rake', 'sake',
    'take', 'wake', 'calf', 'half', 'calm', 'palm', 'came', 'dame', 'fame', 'game', 'lame', 'name', 'same', 'tame',
    'camp', 'damp', 'lamp', 'ramp', 'tamp', 'vamp', 'cane', 'lane', 'mane', 'pane', 'sane', 'vane', 'wane', 'cape',
    'gape', 'tape', 'card', 'hard', 'lard', 'ward', 'yard', 'care', 'dare', 'fare', 'hare', 'mare', 'pare', 'rare',
    'ware', 'cart', 'dart', 'mart', 'part', 'tart', 'cash', 'dash', 'gash', 'hash', 'lash', 'mash', 'rash', 'sash',
    'cast', 'fast', 'last', 'mast', 'past', 'vast', 'cave', 'gave', 'have', 'pave', 'rave', 'save', 'wave', 'cent',
    'char', 'chat', 'chew', 'chin', 'chip', 'chop', 'city', 'clad', 'clam', 'clan', 'clap', 'claw', 'clay', 'clip',
    'club', 'coal', 'coin', 'come', 'copy', 'cord', 'core', 'cork', 'cost', 'cozy', 'crab', 'crew', 'crop', 'crow',
    'cube', 'curb', 'cure', 'curl', 'cute', 'damp', 'dark', 'dash', 'date', 'dawn', 'days', 'dead', 'deal', 'deep',
    'deer', 'desk', 'dial', 'dice', 'died', 'diet', 'dime', 'dine', 'dirt', 'disc', 'dish', 'disk', 'dive', 'dock',
    'does', 'doll', 'dome', 'door', 'dose', 'down', 'doze', 'drag', 'draw', 'drew', 'drip', 'drop', 'drum', 'duck',
    'dull', 'dumb', 'dump', 'dune', 'dunk', 'dusk', 'dust', 'duty', 'each', 'earl', 'east', 'easy', 'echo', 'edge',
    'edit', 'else', 'emit', 'envy', 'epic', 'even', 'ever', 'evil', 'exam', 'exit', 'face', 'fact', 'fade', 'fail',
    'fair', 'fake', 'fame', 'fang', 'farm', 'fast', 'fate', 'fawn', 'faze', 'felt', 'fern', 'file', 'fill', 'film',
    'find', 'fine', 'fire', 'firm', 'fish', 'fist', 'five', 'flag', 'flak', 'flap', 'flat', 'flaw', 'flea', 'fled',
    'flee', 'flew', 'flex', 'flip', 'flit', 'flog', 'flop', 'flow', 'flux', 'foal', 'foam', 'foe', 'foil', 'fold',
    'folk', 'fond', 'food', 'fool', 'foot', 'ford', 'fore', 'fork', 'form', 'fort', 'foul', 'four', 'fowl', 'fray',
    'free', 'from', 'frog', 'fuel', 'full', 'fume', 'fund', 'funk', 'furl', 'fuse', 'fuss', 'fuzz', 'gain', 'gait',
    'gale', 'game', 'gape', 'garb', 'gash', 'gasp', 'gate', 'gave', 'gaze', 'gear', 'gene', 'germ', 'gift', 'gild',
    'gill', 'gilt', 'girl', 'gist', 'give', 'glad', 'glen', 'glib', 'glob', 'glow', 'glue', 'glum', 'gnat', 'gnaw',
    'goal', 'goat', 'goes', 'golf', 'gone', 'gong', 'good', 'goof', 'gore', 'gory', 'gown', 'grab', 'gram', 'gray',
    'grew', 'grey', 'grid', 'grim', 'grin', 'grip', 'grit', 'grow', 'grub', 'gull', 'gulp', 'gunk', 'guru', 'gush',
    'gust', 'hail', 'hair', 'half', 'hall', 'halt', 'hang', 'hank', 'hard', 'hare', 'hark', 'harm', 'harp', 'hart',
    'hash', 'hate', 'haul', 'have', 'hawk', 'haze', 'hazy', 'head', 'heal', 'heap', 'hear', 'heat', 'heed', 'heel',
    'heir', 'held', 'helm', 'help', 'hemp', 'herb', 'herd', 'here', 'hero', 'hide', 'high', 'hike', 'hill', 'hilt',
    'hint', 'hire', 'hiss', 'hive', 'hoax', 'hold', 'hole', 'holy', 'home', 'hone', 'hood', 'hoof', 'hook', 'hoop',
    'hoot', 'hope', 'horn', 'hose', 'host', 'hour', 'howl', 'huff', 'huge', 'hulk', 'hull', 'hump', 'hung', 'hunk',
    'hunt', 'hurl', 'hurt', 'hush', 'husk', 'hymn', 'ibis', 'icon', 'idea', 'idle', 'idol', 'inch', 'info', 'into',
    'iris', 'iron', 'isle', 'itch', 'item', 'jade', 'jail', 'jamb', 'jane', 'jazz', 'jean', 'jeep', 'jeer', 'jelly',
    'jerk', 'jest', 'jets', 'jinx', 'jive', 'jobs', 'jock', 'joey', 'john', 'join', 'joke', 'jolt', 'jowl', 'jump',
    'June', 'junk', 'jury', 'just', 'jute', 'kale', 'keen', 'keep', 'kelp', 'kept', 'kern', 'kick', 'kill', 'kiln',
    'kilt', 'kind', 'king', 'kink', 'kiss', 'kite', 'knee', 'knew', 'knit', 'knob', 'knot', 'know', 'lace', 'lack',
    'lacy', 'lady', 'laid', 'lair', 'lake', 'lamb', 'lame', 'lamp', 'land', 'lane', 'lard', 'lark', 'lash', 'last',
    'late', 'laud', 'lava', 'lawn', 'lazy', 'lead', 'leaf', 'leak', 'lean', 'leap', 'left', 'lend', 'lens', 'lent',
    'less', 'liar', 'lice', 'lick', 'life', 'lift', 'like', 'lilt', 'lily', 'limb', 'lime', 'limp', 'line', 'link',
    'lint', 'lion', 'lisp', 'list', 'live', 'load', 'loaf', 'loan', 'lobe', 'loch', 'lock', 'loft', 'logo', 'loin',
    'lone', 'long', 'look', 'loom', 'loon', 'loop', 'loot', 'lope', 'lord', 'lore', 'lorn', 'lose', 'lost', 'loud',
    'lout', 'love', 'luck', 'lump', 'lung', 'lure', 'lurk', 'lush', 'lust', 'lute', 'lynx', 'lyre', 'mace', 'made',
    'maid', 'mail', 'main', 'make', 'male', 'mall', 'malt', 'mane', 'many', 'mare', 'mark', 'mars', 'mart', 'mash',
    'mask', 'mast', 'mate', 'maze', 'mead', 'meal', 'mean', 'meat', 'meek', 'meet', 'meld', 'melt', 'memo', 'mend',
    'menu', 'meow', 'mere', 'mesh', 'mess', 'mica', 'mice', 'mild', 'milk', 'mill', 'mime', 'mince', 'mind', 'mine',
    'ming', 'mini', 'mink', 'mint', 'minx', 'mire', 'mirth', 'miss', 'mist', 'mite', 'mitt', 'moan', 'moat', 'mock',
    'mode', 'moist', 'mold', 'mole', 'molt', 'monk', 'mood', 'moon', 'moor', 'moot', 'mope', 'more', 'morn', 'most',
    'moth', 'move', 'much', 'muck', 'muff', 'mule', 'mull', 'murk', 'muse', 'mush', 'musk', 'must', 'mute', 'mutt',
    'myth', 'nail', 'nape', 'navy', 'near', 'neat', 'neck', 'need', 'neon', 'nest', 'news', 'newt', 'next', 'nice',
    'nick', 'nine', 'node', 'none', 'nook', 'noon', 'norm', 'nose', 'note', 'noun', 'nova', 'null', 'numb', 'oath',
    'obey', 'oboe', 'odor', 'okay', 'omen', 'omit', 'once', 'onto', 'onus', 'ooze', 'opal', 'open', 'oral', 'orb',
    'orca', 'oven', 'over', 'owed', 'owes', 'owl', 'owns', 'pace', 'pack', 'pact', 'page', 'paid', 'pail', 'pain',
    'pair', 'pale', 'pall', 'palm', 'pane', 'pang', 'pant', 'papa', 'pare', 'park', 'part', 'pass', 'past', 'pate',
    'path', 'pave', 'pawn', 'pays', 'peak', 'peal', 'pear', 'peas', 'peat', 'peck', 'peek', 'peel', 'peep', 'peer',
    'pelt', 'pens', 'pent', 'perk', 'perm', 'pert', 'pest', 'pets', 'phew', 'pick', 'pier', 'pies', 'pike', 'pile',
    'pill', 'pine', 'ping', 'pink', 'pint', 'pipe', 'pita', 'pith', 'pity', 'plan', 'play', 'plea', 'pled', 'plod',
    'plop', 'plot', 'plow', 'ploy', 'plug', 'plum', 'plus', 'pock', 'poem', 'poet', 'poke', 'pole', 'poll', 'polo',
    'pomp', 'pond', 'pony', 'pooh', 'pool', 'poop', 'poor', 'pope', 'pore', 'pork', 'port', 'pose', 'posh', 'post',
    'posy', 'pour', 'pout', 'pray', 'prey', 'prim', 'prod', 'prom', 'prop', 'prow', 'prude', 'prune', 'puck', 'puff',
    'puke', 'pull', 'pulp', 'puma', 'pump', 'punk', 'punt', 'puny', 'pupa', 'pups', 'pure', 'purl', 'purr', 'push',
    'puts', 'putt', 'quack', 'quad', 'quaff', 'quail', 'quake', 'qualm', 'quart', 'quay', 'queen', 'queer', 'quell',
    'query', 'quest', 'queue', 'quick', 'quid', 'quiet', 'quill', 'quilt', 'quirk', 'quit', 'quite', 'quiz', 'quota',
    'quote', 'rabbi', 'rabid', 'race', 'rack', 'racy', 'radar', 'radio', 'radon', 'raft', 'rage', 'rags', 'raid',
    'rail', 'rain', 'raise', 'rake', 'rally', 'ramp', 'ranch', 'rand', 'rang', 'rank', 'rant', 'rare', 'rash',
    'rasp', 'rate', 'rave', 'rays', 'raze', 'razz', 'read', 'real', 'ream', 'reap', 'rear', 'reck', 'reed', 'reef',
    'reek', 'reel', 'rein', 'rely', 'rend', 'rent', 'rest', 'revs', 'rib', 'rice', 'rich', 'ride', 'rife', 'rift',
    'rigs', 'rile', 'rill', 'rime', 'rind', 'ring', 'rink', 'riot', 'ripe', 'rise', 'risk', 'rite', 'road', 'roam',
    'roar', 'robe', 'rock', 'rode', 'rods', 'role', 'roll', 'romp', 'rood', 'roof', 'rook', 'room', 'root', 'rope',
    'ropy', 'rose', 'rosy', 'rote', 'rots', 'roue', 'rout', 'rove', 'rows', 'rube', 'rubs', 'ruby', 'ruck', 'rude',
    'rued', 'rues', 'ruff', 'rugs', 'ruin', 'rule', 'rump', 'rums', 'rune', 'rung', 'runs', 'runt', 'ruse', 'rush',
    'rust', 'ruts', 'sack', 'safe', 'saga', 'sage', 'sags', 'said', 'sail', 'sale', 'salt', 'same', 'sand', 'sane',
    'sang', 'sank', 'saps', 'sari', 'sash', 'sass', 'sate', 'save', 'sawn', 'saws', 'says', 'scab', 'scad', 'scam',
    'scan', 'scar', 'scat', 'scow', 'scud', 'scum', 'seal', 'seam', 'sear', 'seas', 'seat', 'sect', 'seed', 'seek',
    'seem', 'seen', 'seep', 'seer', 'sees', 'self', 'sell', 'semi', 'send', 'sent', 'sept', 'serf', 'sets', 'sewn',
    'sews', 'shad', 'shag', 'shah', 'sham', 'shed', 'shew', 'shim', 'shin', 'ship', 'shiv', 'shod', 'shoe', 'shoo',
    'shop', 'shot', 'show', 'shun', 'shut', 'sick', 'side', 'sift', 'sigh', 'sign', 'silk', 'sill', 'silo', 'silt',
    'sine', 'sing', 'sink', 'sips', 'sire', 'site', 'sits', 'size', 'skid', 'skim', 'skin', 'skip', 'skit', 'slab',
    'slag', 'slam', 'slap', 'slat', 'slaw', 'slay', 'sled', 'slew', 'slid', 'slim', 'slip', 'slit', 'slob', 'sloe',
    'slog', 'slop', 'slot', 'slow', 'slug', 'slum', 'slur', 'smack', 'small', 'smart', 'smash', 'smear', 'smell',
    'smelt', 'smile', 'smirk', 'smite', 'smith', 'smock', 'smoke', 'smoky', 'smote', 'smug', 'snack', 'snag', 'snail',
    'snake', 'snap', 'snare', 'snarl', 'sneak', 'sneer', 'snide', 'sniff', 'snip', 'snipe', 'snit', 'snob', 'snoop',
    'snore', 'snort', 'snout', 'snow', 'snowy', 'snub', 'snuff', 'snug', 'soak', 'soap', 'soar', 'sobs', 'sock',
    'soda', 'sods', 'sofa', 'soft', 'soil', 'sole', 'solo', 'some', 'song', 'sons', 'soon', 'soot', 'sops', 'sore',
    'sort', 'soul', 'soup', 'sour', 'sown', 'sows', 'soya', 'soys', 'span', 'spar', 'spat', 'spec', 'sped', 'spew',
    'spin', 'spit', 'spot', 'spry', 'spud', 'spun', 'spur', 'stab', 'stag', 'star', 'stat', 'stay', 'stem', 'step',
    'stew', 'stir', 'stop', 'stow', 'stub', 'stud', 'stun', 'stye', 'subs', 'such', 'suds', 'sued', 'suer', 'sues',
    'suet', 'suit', 'sulk', 'sump', 'sums', 'sung', 'sunk', 'suns', 'sups', 'sure', 'surf', 'swab', 'swag', 'swam',
    'swan', 'swap', 'swat', 'sway', 'swig', 'swim', 'swine', 'swing', 'swipe', 'swirl', 'swish', 'swop', 'swore',
    'sworn', 'swum', 'swung', 'tack', 'tact', 'tags', 'tail', 'take', 'tale', 'talk', 'tall', 'tame', 'tang', 'tank',
    'tape', 'taps', 'tare', 'tarn', 'taro', 'tarp', 'tars', 'tart', 'task', 'taut', 'tawny', 'taxi', 'teak', 'teal',
    'team', 'tear', 'teas', 'teat', 'tech', 'teed', 'teem', 'teen', 'tees', 'tell', 'temp', 'tend', 'tens', 'tent',
    'term', 'tern', 'test', 'text', 'than', 'that', 'thaw', 'thee', 'them', 'then', 'thew', 'they', 'thick', 'thin',
    'this', 'thou', 'thud', 'thug', 'thus', 'tick', 'tide', 'tidy', 'tied', 'tier', 'ties', 'tiff', 'tile', 'till',
    'tilt', 'time', 'tine', 'ting', 'tins', 'tint', 'tiny', 'tips', 'tire', 'toad', 'tock', 'toed', 'toes', 'toff',
    'togs', 'toil', 'told', 'toll', 'tomb', 'tome', 'tone', 'tong', 'tons', 'took', 'tool', 'toot', 'tops', 'tore',
    'torn', 'tort', 'toss', 'tote', 'tour', 'tout', 'town', 'toys', 'tram', 'trap', 'tray', 'tree', 'trek', 'trey',
    'triage', 'trial', 'tribe', 'trick', 'tried', 'trier', 'tries', 'trig', 'trim', 'trio', 'trip', 'trite', 'trod',
    'troll', 'tromp', 'troop', 'trope', 'trot', 'trout', 'trove', 'truce', 'truck', 'trudge', 'true', 'trump', 'trunk',
    'truss', 'trust', 'truth', 'tryst', 'tsar', 'tuba', 'tube', 'tubs', 'tuck', 'tuft', 'tugs', 'tulip', 'tulle',
    'tumble', 'tumor', 'tuna', 'tune', 'tung', 'tunic', 'turf', 'turn', 'tusk', 'tutor', 'tutu', 'tuxedo', 'twain',
    'twang', 'tweak', 'tweed', 'twig', 'twin', 'twine', 'twirl', 'twist', 'twit', 'type', 'typo', 'tyre', 'tzar',
    'uber', 'udder', 'ugly', 'ulcer', 'ultra', 'umber', 'unbar', 'uncle', 'uncut', 'under', 'undue', 'unfed', 'unfit',
    'union', 'unit', 'unity', 'unix', 'unlit', 'unmet', 'unsay', 'unset', 'untie', 'until', 'unwed', 'unzip', 'upon',
    'upper', 'upset', 'urban', 'urged', 'urges', 'urine', 'usage', 'used', 'user', 'uses', 'usher', 'usual', 'usurp',
    'usury', 'utter', 'vacancy', 'vacant', 'vacate', 'vaccine', 'vacuum', 'vagary', 'vague', 'vain', 'vale', 'valet',
    'valid', 'valley', 'valor', 'value', 'valve', 'vamp', 'vane', 'vanish', 'vanity', 'vapor', 'vary', 'vase', 'vast',
    'vault', 'vaunt', 'veal', 'veer', 'vegan', 'veil', 'vein', 'venal', 'vend', 'vendor', 'veneer', 'venom', 'vent',
    'venue', 'venus', 'verb', 'verge', 'verse', 'verso', 'very', 'vest', 'veto', 'vex', 'vial', 'vicar', 'vice',
    'video', 'view', 'vigil', 'vigor', 'vile', 'villa', 'vine', 'vinyl', 'viola', 'viper', 'viral', 'virgin', 'virus',
    'visa', 'vise', 'visit', 'visor', 'vista', 'vital', 'vivid', 'vixen', 'vocal', 'vodka', 'vogue', 'voice', 'void',
    'voila', 'volt', 'volume', 'vomit', 'vote', 'voter', 'vouch', 'vowed', 'vowel', 'voyage', 'vulgar', 'wade', 'wafer',
    'waft', 'wage', 'wager', 'wages', 'wagon', 'waif', 'wail', 'waist', 'wait', 'waive', 'wake', 'walk', 'wall',
    'waltz', 'wand', 'wane', 'want', 'ward', 'ware', 'warm', 'warn', 'warp', 'wart', 'wary', 'wash', 'wasp', 'waste',
    'watch', 'water', 'watt', 'wave', 'wavy', 'waxy', 'ways', 'weak', 'weal', 'wean', 'wear', 'weary', 'weave', 'web',
    'wedge', 'weed', 'week', 'weep', 'weft', 'weigh', 'weight', 'weird', 'welch', 'weld', 'well', 'welsh', 'welt',
    'wench', 'wend', 'went', 'wept', 'were', 'west', 'whale', 'wharf', 'what', 'wheat', 'wheel', 'whelp', 'when',
    'where', 'which', 'whiff', 'while', 'whim', 'whine', 'whip', 'whir', 'whirl', 'whisk', 'white', 'whiz', 'whole',
    'whom', 'whoop', 'whop', 'whore', 'whose', 'wick', 'wide', 'widow', 'width', 'wield', 'wife', 'wild', 'wile',
    'will', 'wilt', 'wily', 'wimp', 'wince', 'winch', 'wind', 'wine', 'wing', 'wink', 'wino', 'wins', 'wipe', 'wire',
    'wiry', 'wise', 'wish', 'wisp', 'with', 'wits', 'witty', 'wives', 'wizen', 'woke', 'wolf', 'woman', 'women',
    'womb', 'wood', 'woof', 'wool', 'woos', 'word', 'wore', 'work', 'world', 'worm', 'worn', 'worry', 'worse', 'worst',
    'worth', 'would', 'wound', 'wove', 'woven', 'wrack', 'wrap', 'wrath', 'wreak', 'wreath', 'wreck', 'wren', 'wrench',
    'wrest', 'wring', 'wrist', 'write', 'wrong', 'wrote', 'wrought', 'wrung', 'wry', 'yacht', 'yahoo', 'yank', 'yard',
    'yarn', 'yawn', 'yeah', 'year', 'yeast', 'yell', 'yelp', 'yield', 'yodel', 'yoga', 'yoke', 'yolk', 'yore', 'young',
    'your', 'youth', 'yowl', 'yule', 'yuppie', 'zany', 'zeal', 'zebra', 'zenith', 'zephyr', 'zero', 'zest', 'zigzag',
    'zinc', 'zing', 'zip', 'zipper', 'zit', 'zither', 'zodiac', 'zombie', 'zone', 'zoom', 'zucchini'
  ];

  for (const word of commonWords) {
    if (isWordSpelledCorrectly(word)) {
      trie.insert(word);
    }
  }

  cachedTrie = trie;
  return trie;
}

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

function solveBoggle(grid: string[][], minWordLength: number = 3): string[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const foundWords = new Set<string>();
  const trie = cachedTrie!;

  function dfs(
    row: number,
    col: number,
    node: TrieNode,
    path: string,
    visited: boolean[][]
  ): void {
    if (row < 0 || row >= rows || col < 0 || col >= cols || visited[row][col]) {
      return;
    }

    const letter = grid[row][col].toLowerCase();
    const nextNode = node.children.get(letter);

    if (!nextNode) {
      return;
    }

    const newPath = path + letter;
    visited[row][col] = true;

    if (nextNode.isWord && newPath.length >= minWordLength) {
      foundWords.add(newPath);
    }

    for (const [dr, dc] of DIRECTIONS) {
      dfs(row + dr, col + dc, nextNode, newPath, visited);
    }

    visited[row][col] = false;
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const visited: boolean[][] = Array(rows).fill(null).map(() => Array(cols).fill(false));
      dfs(row, col, trie.root, '', visited);
    }
  }

  return Array.from(foundWords);
}

export async function solveBoardForSeed(
  grid: string[][],
  seed: string,
  minWordLength: number = 3
): Promise<SolverResult> {
  if (solverCache.has(seed)) {
    return solverCache.get(seed)!;
  }

  await buildTrie();

  const allWords = solveBoggle(grid, minWordLength);

  const longestLength = allWords.reduce((max, word) => Math.max(max, word.length), 0);
  const longestWords = allWords
    .filter(word => word.length === longestLength)
    .sort();

  const result: SolverResult = {
    allWords: allWords.sort(),
    longestLength,
    longestWords,
    longestCount: longestWords.length
  };

  solverCache.set(seed, result);

  return result;
}

export function clearSolverCache(): void {
  solverCache.clear();
}
