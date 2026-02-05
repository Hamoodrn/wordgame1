import nspell from 'nspell';

let validWords: Set<string> | null = null;
let spellChecker: ReturnType<typeof nspell> | null = null;
let loadingPromise: Promise<void> | null = null;

const MIN_WORD_LENGTH = 3;

const commonSuffixes = ['s', 'es', 'ed', 'ing', 'er', 'est', 'ly', 'ies', 'ied', 'ier', 'iest', 'y'];

function generateInflections(baseWord: string, checker: ReturnType<typeof nspell>): string[] {
  const inflections: string[] = [];

  for (const suffix of commonSuffixes) {
    const candidate = baseWord + suffix;
    if (candidate.length >= MIN_WORD_LENGTH && checker.correct(candidate)) {
      inflections.push(candidate);
    }

    if (baseWord.endsWith('e') && !suffix.startsWith('e')) {
      const candidateWithoutE = baseWord.slice(0, -1) + suffix;
      if (candidateWithoutE.length >= MIN_WORD_LENGTH && checker.correct(candidateWithoutE)) {
        inflections.push(candidateWithoutE);
      }
    }

    if (baseWord.endsWith('y') && baseWord.length > 2) {
      const candidateYtoI = baseWord.slice(0, -1) + 'i' + suffix;
      if (candidateYtoI.length >= MIN_WORD_LENGTH && checker.correct(candidateYtoI)) {
        inflections.push(candidateYtoI);
      }
    }

    const lastChar = baseWord[baseWord.length - 1];
    if (baseWord.length > 2 && 'bdfglmnprst'.includes(lastChar)) {
      const candidateDoubled = baseWord + lastChar + suffix;
      if (candidateDoubled.length >= MIN_WORD_LENGTH && checker.correct(candidateDoubled)) {
        inflections.push(candidateDoubled);
      }
    }
  }

  return inflections;
}

async function loadAndExpandDictionary(): Promise<Set<string>> {
  const [affData, dicData] = await Promise.all([
    fetch('/dictionaries/en_GB.aff').then(r => r.text()),
    fetch('/dictionaries/en_GB.dic').then(r => r.text())
  ]);

  spellChecker = nspell({ aff: affData, dic: dicData });
  const wordSet = new Set<string>();

  const dicLines = dicData.split('\n');

  for (let i = 1; i < dicLines.length; i++) {
    const line = dicLines[i].trim();
    if (!line) continue;

    const parts = line.split('/');
    const baseWord = parts[0].toLowerCase();

    if (baseWord.length >= MIN_WORD_LENGTH && baseWord.length <= 20) {
      if (spellChecker.correct(baseWord)) {
        wordSet.add(baseWord);

        const inflections = generateInflections(baseWord, spellChecker);
        inflections.forEach(inflection => {
          if (inflection.length >= MIN_WORD_LENGTH && inflection.length <= 20) {
            wordSet.add(inflection);
          }
        });
      }
    }
  }

  console.log(`✓ Unified dictionary loaded: ${wordSet.size} words`);
  return wordSet;
}

export async function loadUnifiedDictionary(): Promise<void> {
  if (validWords) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      validWords = await loadAndExpandDictionary();
    } catch (error) {
      console.error('Failed to load unified dictionary:', error);
      throw error;
    }
  })();

  return loadingPromise;
}

export function isValidWord(word: string): boolean {
  if (!validWords || !spellChecker) {
    console.warn('Unified dictionary not loaded yet');
    return false;
  }

  const normalized = word.toLowerCase().trim();

  if (normalized.length < MIN_WORD_LENGTH) {
    return false;
  }

  if (validWords.has(normalized)) {
    return true;
  }

  return spellChecker.correct(normalized);
}

export function getAllValidWords(): Set<string> {
  if (!validWords) {
    return new Set();
  }
  return new Set(validWords);
}

export function isDictionaryLoaded(): boolean {
  return validWords !== null;
}

export function getDictionaryStats() {
  return {
    isLoaded: isDictionaryLoaded(),
    wordCount: validWords?.size || 0
  };
}
