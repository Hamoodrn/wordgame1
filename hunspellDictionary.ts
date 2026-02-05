import nspell from 'nspell';

let spellChecker: ReturnType<typeof nspell> | null = null;
let loadingPromise: Promise<void> | null = null;

export async function loadDictionary(): Promise<void> {
  if (spellChecker) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const [affData, dicData] = await Promise.all([
        fetch('/dictionaries/en_GB.aff').then(r => r.text()),
        fetch('/dictionaries/en_GB.dic').then(r => r.text())
      ]);

      spellChecker = nspell({ aff: affData, dic: dicData });
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      throw error;
    }
  })();

  return loadingPromise;
}

export function isWordSpelledCorrectly(word: string): boolean {
  if (!spellChecker) {
    console.warn('Dictionary not loaded yet');
    return false;
  }

  return spellChecker.correct(word.toLowerCase());
}

export function isDictionaryLoaded(): boolean {
  return spellChecker !== null;
}
