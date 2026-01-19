import React, { useState, useEffect, useCallback } from 'react';
import { Player, GameState, ScoreEntry } from './types';
import { ASSETS } from './constants';
import GameView from './components/GameView';
import UIOverlay from './components/UIOverlay';

const LOCAL_STORAGE_KEY = 'binc_runner_player';
const LEADERBOARD_KEY = 'binc_runner_leaderboard';

const seedLeaderboard = (): ScoreEntry[] => [
  { nickname: 'BincMaster', score: 5000, date: new Date().toISOString() },
  { nickname: 'Constructo', score: 3500, date: new Date().toISOString() },
  { nickname: 'Runner77', score: 2000, date: new Date().toISOString() },
];

const normalizeEntries = (entries: ScoreEntry[]) =>
  entries
    .map(entry => ({
      nickname: String(entry.nickname || '').trim(),
      score: Number(entry.score || 0),
      date: String(entry.date || '')
    }))
    .filter(entry => entry.nickname && Number.isFinite(entry.score));

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [player, setPlayer] = useState<Player | null>(null);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [isRankingLoading, setIsRankingLoading] = useState(false);

  const scoreApiUrl = import.meta.env.VITE_SCORE_API_URL as string | undefined;

  const loadLocalLeaderboard = useCallback(() => {
    const savedLeaderboard = localStorage.getItem(LEADERBOARD_KEY);
    if (savedLeaderboard) {
      setLeaderboard(normalizeEntries(JSON.parse(savedLeaderboard)));
      setIsRankingLoading(false);
      return;
    }

    const initial = seedLeaderboard();
    setLeaderboard(initial);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(initial));
    setIsRankingLoading(false);
  }, []);

  const applyLocalLeaderboardUpdate = useCallback((entry: ScoreEntry) => {
    setLeaderboard(prev => {
      const combined = [...prev, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(combined));
      return combined;
    });
  }, []);

  const fetchRemoteLeaderboard = useCallback(async (options?: { setLoading?: boolean }) => {
    if (!scoreApiUrl) return false;

    const shouldSetLoading = options?.setLoading !== false;
    if (shouldSetLoading) setIsRankingLoading(true);

    try {
      const response = await fetch(`${scoreApiUrl}?limit=10`);
      if (!response.ok) {
        throw new Error(`Leaderboard request failed: ${response.status}`);
      }

      const payload = await response.json();
      const data = Array.isArray(payload) ? payload : payload.data;
      if (!Array.isArray(data)) return false;

      setLeaderboard(normalizeEntries(data).sort((a, b) => b.score - a.score));
      return true;
    } catch (error) {
      console.warn('Leaderboard fetch failed, falling back to local storage.', error);
      return false;
    } finally {
      if (shouldSetLoading) setIsRankingLoading(false);
    }
  }, [scoreApiUrl]);

  const submitRemoteScore = useCallback(async (entry: ScoreEntry) => {
    if (!scoreApiUrl) return;

    setIsRankingLoading(true);
    try {
      await fetch(scoreApiUrl, {
        method: 'POST',
        body: JSON.stringify(entry),
      });

      await fetchRemoteLeaderboard({ setLoading: false });
    } catch (error) {
      console.warn('Score submit failed, saving locally.', error);
      applyLocalLeaderboardUpdate(entry);
    } finally {
      setIsRankingLoading(false);
    }
  }, [applyLocalLeaderboardUpdate, fetchRemoteLeaderboard, scoreApiUrl]);

  // Load player and leaderboard
  useEffect(() => {
    const savedPlayer = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedPlayer) {
      setPlayer(JSON.parse(savedPlayer));
    }

    if (scoreApiUrl) {
      fetchRemoteLeaderboard().then(ok => {
        if (!ok) loadLocalLeaderboard();
      });
    } else {
      loadLocalLeaderboard();
    }
  }, [fetchRemoteLeaderboard, loadLocalLeaderboard, scoreApiUrl]);

  const handleLogin = (nickname: string, isLoggedIn: boolean = false) => {
    const newPlayer: Player = {
      nickname,
      isLoggedIn,
      highScore: (player?.nickname === nickname) ? player.highScore : 0
    };
    setPlayer(newPlayer);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPlayer));
    setGameState(GameState.MENU);
  };

  const handleGameOver = useCallback((score: number) => {
    setCurrentScore(score);
    setGameState(GameState.GAMEOVER);

    if (player) {
      const updatedPlayer = { ...player };
      
      if (score > player.highScore) {
        updatedPlayer.highScore = score;
        setPlayer(updatedPlayer);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPlayer));
      }

      const newEntry: ScoreEntry = {
        nickname: player.nickname,
        score: score,
        date: new Date().toISOString()
      };

      if (scoreApiUrl) {
        submitRemoteScore(newEntry);
      } else {
        applyLocalLeaderboardUpdate(newEntry);
      }
    }
  }, [applyLocalLeaderboardUpdate, player, scoreApiUrl, submitRemoteScore]);

  const handleScoreUpdate = useCallback((score: number) => {
    setCurrentScore(score);
  }, []);

  const startNewGame = () => {
    if (!player) return;
    setCurrentScore(0);
    setGameState(GameState.PLAYING);
  };

  const handleLogout = () => {
    setPlayer(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setGameState(GameState.MENU);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-[-10%] h-72 w-72 rounded-full bg-[#202616]/40 blur-3xl" />
        <div className="absolute -bottom-32 right-[-10%] h-80 w-80 rounded-full bg-[#ff9d4c]/10 blur-3xl" />
      </div>

      <div className="layout-shell relative z-10 mx-auto flex w-full max-w-[1024px] flex-col items-center gap-4 px-3 py-5 md:gap-6 md:px-6 md:py-10">
        <div className="game-header mobile-landscape-hide w-full text-center flex flex-col items-center gap-2">
          <img src={ASSETS.LOGO_BINC} alt="Binc" className="h-8 md:h-12 w-auto" />
          <h1 className="font-display text-2xl md:text-5xl text-[#f5f5f5]">BINC RUNNER</h1>
          <p className="text-[11px] md:text-sm text-[#a2ab94]">CONTROLE: Toque ou pressione espaco para pular.</p>
        </div>

        <div className="relative w-full max-w-[900px]">
          <div className="absolute -inset-3 md:-inset-4 rounded-[28px] bg-gradient-to-br from-[#2c3321]/70 via-[#151a11]/40 to-[#0b0c09]/80 blur-2xl" />
          <div className="game-frame relative w-full h-[52vh] max-h-[420px] md:h-auto md:aspect-video overflow-hidden rounded-2xl md:rounded-[26px] border border-[#2c3321] bg-[#11140e] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-0 w-10 md:w-20 bg-gradient-to-r from-[#0a0c08] to-transparent" />
              <div className="absolute inset-y-0 right-0 w-10 md:w-20 bg-gradient-to-l from-[#0a0c08] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-16 md:h-24 bg-gradient-to-t from-[#0a0c08]/80 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-10 md:h-12 bg-gradient-to-b from-[#1b2015]/40 to-transparent" />
            </div>

            <GameView 
              isActive={gameState === GameState.PLAYING} 
              onGameOver={handleGameOver} 
              onScoreUpdate={handleScoreUpdate}
            />

            <UIOverlay 
              gameState={gameState}
              player={player}
              currentScore={currentScore}
              leaderboard={leaderboard}
              onStart={startNewGame}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onBackToMenu={() => setGameState(GameState.MENU)}
            />
          </div>
        </div>

        <div className="ranking-panel w-full max-w-[900px] rounded-2xl border border-[#2a311f] bg-[#10130d]/80 px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl md:text-2xl text-white">TOP 10 BINC</h2>
            <div className="text-[10px] md:text-xs uppercase tracking-[0.3em]">
              {isRankingLoading ? (
                <span className="inline-flex items-center gap-2 text-[#ff9d4c]">
                  <span className="h-2 w-2 rounded-full bg-[#ff9d4c] animate-pulse" />
                  CARREGANDO
                </span>
              ) : (
                <span className="text-[#8b9477]">ATUALIZADO</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="rounded-xl border border-[#2b3322] bg-[#141a12] px-4 py-4 text-sm text-[#8b9477]">
                {isRankingLoading ? 'Carregando ranking...' : 'Nenhum recorde ainda.'}
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
                <div key={`${entry.nickname}-${idx}`} className={`flex justify-between items-center px-4 py-3 rounded-xl border ${entry.nickname === player?.nickname ? 'bg-[#ff9d4c]/20 border-[#ff9d4c]' : 'bg-[#141a12] border-[#2b3322]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-black text-[#8b9477] text-sm">{idx + 1}.</span>
                    <span className="font-bold text-white text-sm md:text-base truncate max-w-[140px]">{entry.nickname}</span>
                  </div>
                  <span className="font-mono font-black text-[#ff9d4c] text-sm md:text-base">{Math.floor(entry.score)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="w-full max-w-[900px]" />
      </div>
    </div>
  );
};

export default App;
