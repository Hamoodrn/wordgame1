export interface Position {
  row: number;
  col: number;
}

export type TimerDuration = 60 | 300 | 600 | 1800 | 3600 | 86400 | null;

export interface GameState {
  grid: string[][];
  selectedPath: Position[];
  currentWord: string;
  foundWords: Map<string, number>;
  bestWord: string;
  bestLength: number;
  isGameStarted: boolean;
  isGameEnded: boolean;
  selectedDuration: TimerDuration | undefined;
  timeRemaining: number;
  feedback: {
    message: string;
    type: 'success' | 'error' | 'info' | '';
  };
  isMuted: boolean;
  savedGrid: string[][] | null;
  currentSeed: string;
  showSeedInfo: boolean;
  countdownEnabled: boolean;
  countdownValue: number | null;
  longestPossibleLength: number;
  longestPossibleWords: string[];
  longestPossibleCount: number;
  trackedLongestWords: string[];
  goalTileSet: Set<string>;
  foundLongestWords: Set<string>;
  showCelebrationModal: boolean;
  celebrationShown: boolean;
  maxInfoRevealed: boolean;
  gameStartTime: number;
  highlightedGoalTiles: Set<string>;
}

export interface AdminWords {
  additions: Set<string>;
  blocklist: Set<string>;
}
