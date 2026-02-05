import nspell from 'nspell';

let validWords: Set<string> | null = null;
let loadingPromise: Promise<void> | null = null;

const MIN_WORD_LENGTH = 3;

async function loadAndExpandDictionary(): Promise<Set<string>> {
  const [affData, dicData] = await Promise.all([
    fetch('/dictionaries/en_GB.aff').then(r => r.text()),
    fetch('/dictionaries/en_GB.dic').then(r => r.text())
  ]);

  const spellChecker = nspell({ aff: affData, dic: dicData });
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
  if (!validWords) {
    console.warn('Unified dictionary not loaded yet');
    return false;
  }

  const normalized = word.toLowerCase().trim();

  if (normalized.length < MIN_WORD_LENGTH) {
    return false;
  }

  return validWords.has(normalized);
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
