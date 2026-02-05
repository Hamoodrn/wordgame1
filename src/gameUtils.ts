import { Position } from './types';
import { SeededRandom } from './seededRandom';
import { isWordSpelledCorrectly } from './hunspellDictionary';
import { solveBoardForSeed, SolverResult } from './boggleSolver';

const letterFrequencies: { [key: string]: number } = {
  'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0, 'N': 6.7,
  'S': 6.3, 'H': 6.1, 'R': 6.0, 'D': 4.3, 'L': 4.0, 'C': 2.8,
  'U': 2.8, 'M': 2.4, 'W': 2.4, 'F': 2.2, 'G': 2.0, 'Y': 2.0,
  'P': 1.9, 'B': 1.5, 'V': 1.0, 'K': 0.8, 'J': 0.15, 'X': 0.15,
  'Q': 0.10, 'Z': 0.07
};

const weightedLetters: string[] = [];
Object.entries(letterFrequencies).forEach(([letter, freq]) => {
  const count = Math.round(freq * 10);
  for (let i = 0; i < count; i++) {
    weightedLetters.push(letter);
  }
});

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const MIN_VOWELS = 4;
const MAX_VOWELS = 7;
const MIN_LONGEST_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 200;

function countVowels(grid: string[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const letter of row) {
      if (VOWELS.has(letter)) {
        count++;
      }
    }
  }
  return count;
}

function generateCandidateGrid(seed: string, attemptIndex: number): string[][] {
  const grid: string[][] = [];
  const rng = new SeededRandom(`${seed}-${attemptIndex}`);

  for (let row = 0; row < 4; row++) {
    grid[row] = [];
    for (let col = 0; col < 4; col++) {
      let letter = weightedLetters[Math.floor(rng.next() * weightedLetters.length)];

      if (letter === 'Q') {
        letter = 'QU';
      }

      grid[row][col] = letter;
    }
  }

  return grid;
}

export async function generateValidatedGrid(seed: string): Promise<{ grid: string[][], solverResult: SolverResult }> {
  let bestGrid: string[][] | null = null;
  let bestResult: SolverResult | null = null;
  let bestLength = 0;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidateGrid = generateCandidateGrid(seed, attempt);
    const vowelCount = countVowels(candidateGrid);

    if (vowelCount < MIN_VOWELS || vowelCount > MAX_VOWELS) {
      continue;
    }

    const solverResult = await solveBoardForSeed(candidateGrid, `${seed}-${attempt}`);

    if (solverResult.longestLength >= MIN_LONGEST_LENGTH) {
      return { grid: candidateGrid, solverResult };
    }

    if (solverResult.longestLength > bestLength) {
      bestLength = solverResult.longestLength;
      bestGrid = candidateGrid;
      bestResult = solverResult;
    }
  }

  if (bestGrid && bestResult) {
    return { grid: bestGrid, solverResult: bestResult };
  }

  const fallbackGrid = generateCandidateGrid(seed, 0);
  const fallbackResult = await solveBoardForSeed(fallbackGrid, `${seed}-0`);
  return { grid: fallbackGrid, solverResult: fallbackResult };
}

export function generateGrid(seed?: string): string[][] {
  const grid: string[][] = [];
  const rng = seed ? new SeededRandom(seed) : null;

  for (let row = 0; row < 4; row++) {
    grid[row] = [];
    for (let col = 0; col < 4; col++) {
      const randomIndex = rng
        ? Math.floor(rng.next() * weightedLetters.length)
        : Math.floor(Math.random() * weightedLetters.length);
      grid[row][col] = weightedLetters[randomIndex];
    }
  }

  return grid;
}

export function areAdjacent(pos1: Position, pos2: Position): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
}

export function isPositionInPath(pos: Position, path: Position[]): boolean {
  return path.some(p => p.row === pos.row && p.col === pos.col);
}

export function getWordFromPath(grid: string[][], path: Position[]): string {
  return path.map(pos => grid[pos.row][pos.col]).join('');
}

export function getTileFromCoordinates(
  clientX: number,
  clientY: number,
  gridElement: HTMLElement | null
): Position | null {
  if (!gridElement) return null;

  const rect = gridElement.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return null;
  }

  const tileWidth = rect.width / 4;
  const tileHeight = rect.height / 4;

  const col = Math.floor(x / tileWidth);
  const row = Math.floor(y / tileHeight);

  if (row < 0 || row >= 4 || col < 0 || col >= 4) {
    return null;
  }

  return { row, col };
}

export function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export function getTopWords(foundWords: Map<string, number>, limit: number = 3): Array<{ word: string; timestamp: number }> {
  const words = Array.from(foundWords.entries()).map(([word, timestamp]) => ({
    word,
    timestamp
  }));

  words.sort((a, b) => {
    if (b.word.length !== a.word.length) {
      return b.word.length - a.word.length;
    }
    return b.timestamp - a.timestamp;
  });

  return words.slice(0, limit);
}

export function validateWithInflections(word: string): boolean {
  return isWordSpelledCorrectly(word);
}

export function getThemeColors(duration: number | null): { bg: string; accent: string } {
  if (duration === null) {
    return { bg: 'from-stone-800 via-amber-900 to-stone-800', accent: 'amber' };
  }

  switch (duration) {
    case 60:
      return { bg: 'from-slate-900 via-slate-800 to-slate-900', accent: 'blue' };
    case 300:
      return { bg: 'from-cyan-900 via-cyan-800 to-cyan-900', accent: 'cyan' };
    case 600:
      return { bg: 'from-emerald-900 via-emerald-950 to-emerald-900', accent: 'emerald' };
    case 1800:
      return { bg: 'from-green-800 via-green-900 to-green-800', accent: 'green' };
    case 3600:
      return { bg: 'from-slate-900 via-purple-950 to-slate-900', accent: 'purple' };
    case 86400:
      return { bg: 'from-red-900 via-red-800 to-red-900', accent: 'red' };
    default:
      return { bg: 'from-slate-900 via-slate-800 to-slate-900', accent: 'blue' };
  }
}
