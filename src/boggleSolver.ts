import { loadUnifiedDictionary, getAllValidWords } from './unifiedDictionary';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isWord: boolean = false;
}

class Trie {
  root: TrieNode = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    const normalized = word.toLowerCase();
    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isWord = true;
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

  await loadUnifiedDictionary();

  const trie = new Trie();
  const validWords = getAllValidWords();

  for (const word of validWords) {
    if (word.length >= 3) {
      trie.insert(word);
    }
  }

  cachedTrie = trie;
  console.log(`✓ Trie built with ${validWords.size} words`);
  return trie;
}

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

function normalizeGridLetter(letter: string): string {
  return letter.toLowerCase();
}

function solveBoggle(grid: string[][], minWordLength: number = 3): Set<string> {
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

    const cellLetter = normalizeGridLetter(grid[row][col]);

    let nextNode: TrieNode | null = node;
    let newPath = path;

    for (const char of cellLetter) {
      if (!nextNode.children.has(char)) {
        return;
      }
      nextNode = nextNode.children.get(char)!;
      newPath += char;
    }

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

  return foundWords;
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

  const foundWordsSet = solveBoggle(grid, minWordLength);
  const allWords = Array.from(foundWordsSet).sort();

  const longestLength = allWords.reduce((max, word) => Math.max(max, word.length), 0);
  const longestWords = allWords
    .filter(word => word.length === longestLength)
    .sort();

  const result: SolverResult = {
    allWords,
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

export async function verifySolverAccuracy(grid: string[][], seed: string): Promise<{
  isAccurate: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const { isValidWord } = await import('./unifiedDictionary');

  const solverResult = await solveBoardForSeed(grid, seed);

  for (const word of solverResult.allWords) {
    if (!isValidWord(word)) {
      issues.push(`Solver found invalid word: "${word}"`);
    }
  }

  return {
    isAccurate: issues.length === 0,
    issues
  };
}
