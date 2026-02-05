import { useState, useRef, useEffect } from 'react';
import { Position, GameState, TimerDuration, AdminWords, SelectionMode } from '../types';
import {
  generateGrid,
  generateValidatedGrid,
  areAdjacent,
  isPositionInPath,
  getWordFromPath,
  getTileFromCoordinates,
  formatTime,
  getTopWords,
  validateWithInflections,
  getThemeColors
} from '../gameUtils';
import { generateSeedCode, getSeedFromUrl, seedToUrl } from '../seededRandom';
import { loadDictionary } from '../hunspellDictionary';
import { solveBoardForSeed } from '../boggleSolver';
import GridTile from './GridTile';
import AdminPanel from './AdminPanel';
import { Clock, Volume2, VolumeX, Shield, Trophy, Copy, Dices, Link2, Info } from 'lucide-react';
import { playClickSound, playSuccessSound, playInvalidWordSound, playDuplicateWordSound, playCountdownTickSound, playCountdownStartSound } from '../soundEffects';

const ADMIN_PASSPHRASE = 'wordhunt2024';

const TIMER_OPTIONS: { label: string; value: TimerDuration; isWide?: boolean }[] = [
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '30 minutes', value: 1800 },
  { label: '60 minutes', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: 'Unlimited', value: null, isWide: true }
];

function LongestWordsDisplay({ words, foundWords }: { words: string[]; foundWords: Set<string> }) {
  const [showAll, setShowAll] = useState(false);
  const displayWords = showAll ? words : words.slice(0, 3);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {displayWords.map(word => (
          <span
            key={word}
            className={`px-3 py-1 rounded-lg text-sm font-medium uppercase ${
              foundWords.has(word)
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {word}
            {foundWords.has(word) && ' ✓'}
          </span>
        ))}
      </div>
      {words.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAll ? 'Show less' : `Show all (${words.length})`}
        </button>
      )}
    </div>
  );
}

export default function WordGame() {
  const [seedInput, setSeedInput] = useState<string>(() => getSeedFromUrl() || '');

  const [gameState, setGameState] = useState<GameState>(() => ({
    grid: generateGrid(),
    selectedPath: [],
    currentWord: '',
    foundWords: new Map(),
    bestWord: '',
    bestLength: 0,
    isGameStarted: false,
    isGameEnded: false,
    selectedDuration: undefined,
    timeRemaining: 0,
    selectionMode: 'hold',
    feedback: { message: '', type: '' },
    isMuted: false,
    savedGrid: null,
    currentSeed: '',
    showSeedInfo: false,
    countdownEnabled: true,
    countdownValue: null,
    longestPossibleLength: 0,
    longestPossibleWords: [],
    longestPossibleCount: 0,
    foundLongestWords: new Set(),
    showCelebrationModal: false,
    celebrationShown: false,
    maxInfoRevealed: false,
    gameStartTime: 0
  }));

  const [adminWords, setAdminWords] = useState<AdminWords>(() => {
    const stored = localStorage.getItem('adminWords');
    if (stored) {
      const data = JSON.parse(stored);
      return {
        additions: new Set(data.additions || []),
        blocklist: new Set(data.blocklist || [])
      };
    }
    return { additions: new Set(), blocklist: new Set() };
  });

  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('isAdmin') === 'true';
  });

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const hoverStateRef = useRef<{ pos: Position | null; timestamp: number }>({ pos: null, timestamp: 0 });
  const justFinalizedRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('adminWords', JSON.stringify({
      additions: Array.from(adminWords.additions),
      blocklist: Array.from(adminWords.blocklist)
    }));
  }, [adminWords]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadDictionary().then(() => {
      console.log('Hunspell dictionary loaded');
    }).catch(err => {
      console.error('Failed to load Hunspell dictionary:', err);
    });
  }, []);

  useEffect(() => {
    const testWords = ['siren', 'sirens', 'sirened', 'sirening'];
    console.log('=== Dictionary Validation Check ===');
    testWords.forEach(word => {
      const isValid = isWordValid(word);
      console.log(`"${word}": ${isValid ? '✓ valid' : '✗ invalid'}`);
    });
    console.log('===================================');
  }, []);

  useEffect(() => {
    if (gameState.isGameStarted && !gameState.isGameEnded) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        setGameState(prev => {
          const isUnlimitedMode = prev.selectedDuration === null;

          if (isUnlimitedMode) {
            const elapsedSeconds = Math.floor((Date.now() - prev.gameStartTime) / 1000);
            const shouldReveal = !prev.maxInfoRevealed && elapsedSeconds >= 300;

            if (shouldReveal) {
              return {
                ...prev,
                timeRemaining: elapsedSeconds,
                maxInfoRevealed: true
              };
            }
            return { ...prev, timeRemaining: elapsedSeconds };
          } else {
            const newTime = prev.timeRemaining - 1;
            if (newTime <= 0) {
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
              }
              return {
                ...prev,
                timeRemaining: 0,
                isGameEnded: true,
                selectedPath: [],
                currentWord: ''
              };
            }

            const totalDuration = prev.selectedDuration || 0;
            const elapsedSeconds = totalDuration - newTime;
            const revealThreshold = totalDuration * 0.2;
            const shouldReveal = !prev.maxInfoRevealed && elapsedSeconds >= revealThreshold;

            if (shouldReveal) {
              return {
                ...prev,
                timeRemaining: newTime,
                maxInfoRevealed: true
              };
            }
            return { ...prev, timeRemaining: newTime };
          }
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState.isGameStarted, gameState.isGameEnded]);

  useEffect(() => {
    if (gameState.countdownValue !== null && gameState.countdownValue > 0) {
      playCountdownTickSound(gameState.isMuted);
      const timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          countdownValue: prev.countdownValue! - 1
        }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState.countdownValue === 0) {
      playCountdownStartSound(gameState.isMuted);
      setGameState(prev => ({
        ...prev,
        countdownValue: null,
        isGameStarted: true,
        timeRemaining: prev.selectedDuration || 0,
        gameStartTime: Date.now()
      }));
    }
  }, [gameState.countdownValue, gameState.isMuted]);

  const isWordValid = (word: string): boolean => {
    if (word.length < 3) return false;

    const lowerWord = word.toLowerCase();
    const isBlocked = adminWords.blocklist.has(lowerWord);

    if (isBlocked) return false;

    const isAdded = adminWords.additions.has(lowerWord);
    if (isAdded) return true;

    return validateWithInflections(lowerWord);
  };

  const showFeedback = (message: string, type: 'success' | 'error' | 'info') => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    setGameState(prev => ({
      ...prev,
      feedback: { message, type }
    }));

    feedbackTimeoutRef.current = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        feedback: { message: '', type: '' }
      }));
    }, 2000);
  };

  const handleTileInteraction = (row: number, col: number, isInitial: boolean = false) => {
    if (!gameState.isGameStarted || gameState.isGameEnded) return;

    const pos: Position = { row, col };

    if (isInitial) {
      if (justFinalizedRef.current) {
        return;
      }

      if (gameState.selectedPath.length === 0 && gameState.feedback.message) {
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        setGameState(prev => ({
          ...prev,
          feedback: { message: '', type: '' }
        }));
      }
    }

    if (gameState.selectionMode === 'click') {
      if (isDragging) {
        if (isPositionInPath(pos, gameState.selectedPath)) {
          return;
        }

        if (gameState.selectedPath.length === 0) {
          return;
        }

        const lastPos = gameState.selectedPath[gameState.selectedPath.length - 1];
        if (!areAdjacent(lastPos, pos)) {
          return;
        }

        playClickSound(gameState.isMuted, gameState.selectedPath.length);
        setGameState(prev => {
          const newPath = [...prev.selectedPath, pos];
          const newWord = getWordFromPath(prev.grid, newPath);

          return {
            ...prev,
            selectedPath: newPath,
            currentWord: newWord
          };
        });
      } else if (isInitial) {
        playClickSound(gameState.isMuted, 0);
        setIsDragging(true);
        hoverStateRef.current = { pos, timestamp: Date.now() };
        setGameState(prev => {
          const newPath = [pos];
          const newWord = getWordFromPath(prev.grid, newPath);
          return {
            ...prev,
            selectedPath: newPath,
            currentWord: newWord
          };
        });
      }
    } else {
      if (isInitial) {
        playClickSound(gameState.isMuted, 0);
        setIsDragging(true);
        hoverStateRef.current = { pos, timestamp: Date.now() };
        setGameState(prev => {
          const newPath = [pos];
          const newWord = getWordFromPath(prev.grid, newPath);
          return {
            ...prev,
            selectedPath: newPath,
            currentWord: newWord
          };
        });
      } else if (isDragging) {
        setGameState(prev => {
          if (isPositionInPath(pos, prev.selectedPath)) {
            return prev;
          }

          if (prev.selectedPath.length === 0) {
            return prev;
          }

          const lastPos = prev.selectedPath[prev.selectedPath.length - 1];
          if (!areAdjacent(lastPos, pos)) {
            return prev;
          }

          playClickSound(prev.isMuted, prev.selectedPath.length);
          const newPath = [...prev.selectedPath, pos];
          const newWord = getWordFromPath(prev.grid, newPath);

          return {
            ...prev,
            selectedPath: newPath,
            currentWord: newWord
          };
        });
      }
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    if (!gameState.isGameStarted || gameState.isGameEnded) return;

    const pos = getTileFromCoordinates(clientX, clientY, gridRef.current);
    if (!pos) return;

    const lastInPath = gameState.selectedPath.length > 0 ? gameState.selectedPath[gameState.selectedPath.length - 1] : null;
    const isCurrentlySelected = lastInPath && lastInPath.row === pos.row && lastInPath.col === pos.col;

    if (isCurrentlySelected) {
      return;
    }

    const now = Date.now();
    const lastHover = hoverStateRef.current;
    const isSameAsLastHover = lastHover.pos && lastHover.pos.row === pos.row && lastHover.pos.col === pos.col;

    if (!isSameAsLastHover) {
      hoverStateRef.current = { pos, timestamp: now };
    }

    const timeSinceEntered = now - hoverStateRef.current.timestamp;

    if (timeSinceEntered >= 25) {
      handleTileInteraction(pos.row, pos.col, false);
    }
  };

  const handleWordSubmit = () => {
    const word = gameState.currentWord.toLowerCase();
    const wordLength = word.length;

    if (wordLength < 2) {
      setGameState(prev => ({
        ...prev,
        selectedPath: [],
        currentWord: ''
      }));
      return;
    }

    if (gameState.foundWords.has(word)) {
      playDuplicateWordSound(gameState.isMuted);
      showFeedback('Already found!', 'error');
      setGameState(prev => ({
        ...prev,
        selectedPath: [],
        currentWord: ''
      }));
      return;
    }

    if (!isWordValid(word)) {
      playInvalidWordSound(gameState.isMuted);
      showFeedback('Not a valid word', 'error');
      setGameState(prev => ({
        ...prev,
        selectedPath: [],
        currentWord: ''
      }));
      return;
    }

    playSuccessSound(gameState.isMuted, wordLength);
    const newFoundWords = new Map(gameState.foundWords);
    newFoundWords.set(word, Date.now());

    const newBestLength = Math.max(gameState.bestLength, wordLength);
    const newBestWord = wordLength >= gameState.bestLength ? word : gameState.bestWord;

    const newFoundLongestWords = new Set(gameState.foundLongestWords);
    if (gameState.longestPossibleWords.includes(word)) {
      newFoundLongestWords.add(word);
    }

    const shouldShowCelebration =
      !gameState.celebrationShown &&
      newFoundLongestWords.size === gameState.longestPossibleCount &&
      gameState.longestPossibleCount > 0;

    showFeedback(`Found: ${word.toUpperCase()}`, 'success');

    setGameState(prev => ({
      ...prev,
      foundWords: newFoundWords,
      bestLength: newBestLength,
      bestWord: newBestWord,
      selectedPath: [],
      currentWord: '',
      foundLongestWords: newFoundLongestWords,
      showCelebrationModal: shouldShowCelebration,
      celebrationShown: shouldShowCelebration || prev.celebrationShown
    }));
  };

  const handleRelease = () => {
    if (!isDragging || gameState.isGameEnded) return;

    setIsDragging(false);
    hoverStateRef.current = { pos: null, timestamp: 0 };

    justFinalizedRef.current = true;
    setTimeout(() => {
      justFinalizedRef.current = false;
    }, 100);

    handleWordSubmit();
  };

  const handleStartGame = async () => {
    if (gameState.selectedDuration === undefined) return;

    const seed = seedInput.trim().toLowerCase() || generateSeedCode();
    const { grid: newGrid, solverResult } = await generateValidatedGrid(seed);

    if (gameState.countdownEnabled) {
      setGameState(prev => ({
        ...prev,
        currentSeed: seed,
        countdownValue: 3,
        grid: newGrid,
        savedGrid: newGrid.map(row => [...row]),
        longestPossibleLength: solverResult.longestLength,
        longestPossibleWords: solverResult.longestWords,
        longestPossibleCount: solverResult.longestCount,
        foundLongestWords: new Set(),
        celebrationShown: false,
        maxInfoRevealed: false
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        currentSeed: seed,
        isGameStarted: true,
        timeRemaining: prev.selectedDuration || 0,
        grid: newGrid,
        savedGrid: newGrid.map(row => [...row]),
        longestPossibleLength: solverResult.longestLength,
        longestPossibleWords: solverResult.longestWords,
        longestPossibleCount: solverResult.longestCount,
        foundLongestWords: new Set(),
        celebrationShown: false,
        maxInfoRevealed: false,
        gameStartTime: Date.now()
      }));
    }

    if (!seedInput.trim()) {
      setSeedInput(seed);
    }
  };

  const handleNewGame = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setSeedInput('');

    setGameState(prev => ({
      grid: generateGrid(),
      selectedPath: [],
      currentWord: '',
      foundWords: new Map(),
      bestWord: '',
      bestLength: 0,
      isGameStarted: false,
      isGameEnded: false,
      selectedDuration: undefined,
      timeRemaining: 0,
      selectionMode: prev.selectionMode,
      feedback: { message: '', type: '' },
      isMuted: prev.isMuted,
      savedGrid: null,
      currentSeed: '',
      showSeedInfo: false,
      countdownEnabled: prev.countdownEnabled,
      countdownValue: null,
      longestPossibleLength: 0,
      longestPossibleWords: [],
      longestPossibleCount: 0,
      foundLongestWords: new Set(),
      showCelebrationModal: false,
      celebrationShown: false,
      maxInfoRevealed: false,
      gameStartTime: 0
    }));
  };

  const handleRestartGame = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const newSeed = generateSeedCode();
    const { grid: newGrid, solverResult } = await generateValidatedGrid(newSeed);

    setSeedInput(newSeed);

    setGameState(prev => ({
      grid: newGrid,
      selectedPath: [],
      currentWord: '',
      foundWords: new Map(),
      bestWord: '',
      bestLength: 0,
      isGameStarted: true,
      isGameEnded: false,
      selectedDuration: prev.selectedDuration,
      timeRemaining: prev.selectedDuration || 0,
      selectionMode: prev.selectionMode,
      feedback: { message: '', type: '' },
      isMuted: prev.isMuted,
      savedGrid: newGrid.map(row => [...row]),
      currentSeed: newSeed,
      showSeedInfo: false,
      countdownEnabled: prev.countdownEnabled,
      countdownValue: null,
      longestPossibleLength: solverResult.longestLength,
      longestPossibleWords: solverResult.longestWords,
      longestPossibleCount: solverResult.longestCount,
      foundLongestWords: new Set(),
      showCelebrationModal: false,
      celebrationShown: false,
      maxInfoRevealed: false,
      gameStartTime: Date.now()
    }));
  };

  const handleReplayBoard = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setGameState(prev => ({
      ...prev,
      grid: prev.savedGrid ? prev.savedGrid.map(row => [...row]) : prev.grid,
      selectedPath: [],
      currentWord: '',
      foundWords: new Map(),
      bestWord: '',
      bestLength: 0,
      isGameStarted: true,
      isGameEnded: false,
      timeRemaining: prev.selectedDuration || 0,
      feedback: { message: '', type: '' },
      showSeedInfo: false,
      countdownValue: null,
      foundLongestWords: new Set(),
      showCelebrationModal: false,
      celebrationShown: false,
      maxInfoRevealed: false,
      gameStartTime: Date.now()
    }));
  };

  const handleCelebrationContinue = () => {
    setGameState(prev => ({
      ...prev,
      showCelebrationModal: false
    }));
  };

  const handleCelebrationNewGame = () => {
    setGameState(prev => ({
      ...prev,
      showCelebrationModal: false
    }));
    handleNewGame();
  };

  const handleGenerateSeed = () => {
    const newSeed = generateSeedCode();
    setSeedInput(newSeed);
  };

  const handleCopySeed = async (seed: string) => {
    try {
      await navigator.clipboard.writeText(seed);
      setGameState(prev => ({
        ...prev,
        feedback: { message: 'Seed copied!', type: 'info' }
      }));
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          feedback: { message: '', type: '' }
        }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy seed:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = seedToUrl(gameState.currentSeed);
      await navigator.clipboard.writeText(url);
      setGameState(prev => ({
        ...prev,
        feedback: { message: 'Link copied!', type: 'info' }
      }));
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          feedback: { message: '', type: '' }
        }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleEndGame = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setGameState(prev => ({
      ...prev,
      isGameEnded: true,
      selectedPath: [],
      currentWord: ''
    }));
  };

  const toggleMute = () => {
    setGameState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const toggleSelectionMode = () => {
    setGameState(prev => ({
      ...prev,
      selectionMode: prev.selectionMode === 'hold' ? 'click' : 'hold'
    }));
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      setShowAdminPanel(true);
    } else {
      const passphrase = prompt('Enter admin passphrase:');
      if (passphrase === ADMIN_PASSPHRASE) {
        setIsAdmin(true);
        localStorage.setItem('isAdmin', 'true');
        setShowAdminPanel(true);
      } else if (passphrase) {
        alert('Incorrect passphrase');
      }
    }
  };

  const topWords = getTopWords(gameState.foundWords, 3);
  const themeColors = gameState.selectedDuration ? getThemeColors(gameState.selectedDuration) : { bg: 'from-slate-900 via-slate-800 to-slate-900', accent: 'blue' };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeColors.bg} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Word Hunt</h1>
          <p className="text-slate-400 text-sm">Drag across letters to form words</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-slate-700/50">
          {!gameState.isGameStarted && gameState.countdownValue === null ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Choose Duration</h2>
              <div className="grid grid-cols-2 gap-2">
                {TIMER_OPTIONS.map(option => (
                  <button
                    key={option.label}
                    onClick={() => setGameState(prev => ({ ...prev, selectedDuration: option.value }))}
                    className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                      option.isWide ? 'col-span-2' : ''
                    } ${
                      gameState.selectedDuration === option.value
                        ? option.value === null
                          ? 'bg-amber-100 text-slate-800 scale-105'
                          : 'bg-blue-600 text-white scale-105'
                        : option.value === null
                          ? 'bg-stone-200 text-slate-700 hover:bg-stone-300'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-sm font-semibold text-white mb-2">Board Seed</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value.toLowerCase())}
                    placeholder="Enter or generate seed..."
                    className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleGenerateSeed}
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-all"
                    title="Generate new seed"
                  >
                    <Dices className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleCopySeed(seedInput)}
                    disabled={!seedInput.trim()}
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy seed"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Share this seed with others to play the same board
                </p>
              </div>

              <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                <span className="text-sm text-slate-300">Countdown</span>
                <button
                  onClick={() => setGameState(prev => ({ ...prev, countdownEnabled: !prev.countdownEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    gameState.countdownEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      gameState.countdownEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleStartGame}
                disabled={gameState.selectedDuration === undefined}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                  gameState.selectedDuration !== undefined
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Start Game
              </button>
            </div>
          ) : gameState.countdownValue !== null ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-9xl font-bold text-white animate-pulse">
                {gameState.countdownValue}
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="text-white">
                  <div className="text-sm text-slate-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {gameState.selectedDuration === null ? 'Elapsed' : 'Time'}
                  </div>
                  <div className="text-2xl font-bold">{formatTime(gameState.timeRemaining)}</div>
                </div>

                <div className="text-white text-center flex-1 mx-4">
                  <div className="text-sm text-slate-400 flex items-center justify-center gap-1 mb-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Goal
                  </div>
                  {gameState.maxInfoRevealed ? (
                    <>
                      <div className="text-lg font-bold text-yellow-400">
                        {gameState.foundLongestWords.size}/{gameState.longestPossibleCount}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Max length: {gameState.longestPossibleLength}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-500">Hidden</div>
                  )}
                </div>

                <div className="text-white text-right">
                  <div className="text-sm text-slate-400">Best Word</div>
                  {gameState.bestWord ? (
                    <div className="text-xs font-bold text-slate-300 uppercase">
                      {gameState.bestWord} ({gameState.bestLength})
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">—</div>
                  )}
                </div>
              </div>

              <div className="mb-4 h-12 flex items-center justify-center">
                {gameState.currentWord && !gameState.feedback.message && (
                  <div className="text-3xl font-bold text-white tracking-wider">
                    {gameState.currentWord}
                  </div>
                )}
                {gameState.feedback.message && (
                  <div className={`text-lg font-semibold ${
                    gameState.feedback.type === 'success' ? 'text-green-400' :
                    gameState.feedback.type === 'error' ? 'text-red-400' :
                    'text-blue-400'
                  }`}>
                    {gameState.feedback.message}
                  </div>
                )}
              </div>

              <div
                ref={gridRef}
                className="grid grid-cols-4 gap-2 mb-6 select-none touch-none"
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onTouchEnd={handleRelease}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  handlePointerMove(touch.clientX, touch.clientY);
                }}
              >
                {gameState.grid.map((row, rowIndex) =>
                  row.map((letter, colIndex) => (
                    <GridTile
                      key={`${rowIndex}-${colIndex}`}
                      letter={letter}
                      row={rowIndex}
                      col={colIndex}
                      isSelected={isPositionInPath({ row: rowIndex, col: colIndex }, gameState.selectedPath)}
                      isDisabled={gameState.isGameEnded}
                      onInteract={handleTileInteraction}
                      selectionMode={gameState.selectionMode}
                    />
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleNewGame}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    New Game
                  </button>
                  {!gameState.isGameEnded && (
                    <button
                      onClick={handleEndGame}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                    >
                      End Game
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={toggleSelectionMode}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 px-4 rounded-xl transition-colors"
                  >
                    Mode: {gameState.selectionMode === 'hold' ? 'Click & Hold' : 'Click Twice'}
                  </button>
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, showSeedInfo: !prev.showSeedInfo }))}
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl transition-colors"
                    title="Show seed"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleMute}
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl transition-colors"
                  >
                    {gameState.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>

                {gameState.showSeedInfo && (
                  <div className="mt-4 bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-2">Board Seed</div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-800 text-white px-3 py-2 rounded font-mono text-sm">
                        {gameState.currentSeed}
                      </div>
                      <button
                        onClick={() => handleCopySeed(gameState.currentSeed)}
                        className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded transition-all"
                        title="Copy seed"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded transition-all"
                        title="Copy link"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {gameState.isGameEnded && gameState.foundWords.size > 0 && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Game Results</h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-white">
                <span className="text-slate-400">Words Found:</span>
                <span className="font-bold text-xl">{gameState.foundWords.size}</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-slate-400">Longest Word:</span>
                <span className="font-bold uppercase text-yellow-400">{gameState.bestWord || '—'}</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-slate-400">Best Length:</span>
                <span className="font-bold">{gameState.bestLength} letters</span>
              </div>
              {gameState.longestPossibleLength > 0 && (
                <>
                  <div className="flex justify-between text-white border-t border-slate-700 pt-3 mt-3">
                    <span className="text-slate-400">Longest Possible:</span>
                    <span className="font-bold">{gameState.longestPossibleLength} letters</span>
                  </div>
                  <div className="flex flex-col text-white">
                    <span className="text-slate-400 mb-2">
                      Longest Possible Words ({gameState.longestPossibleCount}):
                    </span>
                    <LongestWordsDisplay
                      words={gameState.longestPossibleWords}
                      foundWords={gameState.foundLongestWords}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mb-4 bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">Board Seed</div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-800 text-white px-3 py-2 rounded font-mono text-sm break-all">
                  {gameState.currentSeed}
                </div>
                <button
                  onClick={() => handleCopySeed(gameState.currentSeed)}
                  className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded transition-all"
                  title="Copy seed"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded transition-all"
                  title="Copy link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleRestartGame}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Restart
              </button>
              <button
                onClick={handleReplayBoard}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Replay Board
              </button>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">All Words:</h3>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {Array.from(gameState.foundWords.keys())
                  .sort((a, b) => b.length - a.length || a.localeCompare(b))
                  .map(word => (
                    <span
                      key={word}
                      className="px-3 py-1 bg-slate-700 text-white rounded-lg text-sm font-medium uppercase"
                    >
                      {word}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={handleAdminClick}
            className="text-slate-500 hover:text-slate-400 text-xs flex items-center gap-1 mx-auto transition-colors"
          >
            <Shield className="w-3 h-3" />
            Admin
          </button>
        </div>
      </div>

      {gameState.showCelebrationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-yellow-500/50">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                Congratulations!
              </h2>
              <p className="text-lg text-white">
                You found all {gameState.longestPossibleCount} max-length word{gameState.longestPossibleCount !== 1 ? 's' : ''} on this board!
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {gameState.longestPossibleWords.map(word => (
                  <span
                    key={word}
                    className="px-3 py-1 bg-yellow-500 text-slate-900 rounded-lg text-sm font-bold uppercase"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCelebrationContinue}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Continue
              </button>
              <button
                onClick={handleCelebrationNewGame}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminPanel && (
        <AdminPanel
          adminWords={adminWords}
          onUpdateAdminWords={setAdminWords}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
}
