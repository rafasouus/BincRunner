import React, { useState } from 'react';
import { Player, GameState, ScoreEntry } from '../types';
import { ASSETS } from '../constants';

interface UIOverlayProps {
  gameState: GameState;
  player: Player | null;
  currentScore: number;
  leaderboard: ScoreEntry[];
  onStart: () => void;
  onLogin: (nickname: string, isLoggedIn?: boolean) => void;
  onLogout: () => void;
  onBackToMenu: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  player,
  currentScore,
  leaderboard,
  onStart,
  onLogin,
  onLogout,
  onBackToMenu
}) => {
  const [nickInput, setNickInput] = useState('');

  const handleQuickPlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickInput.trim()) onLogin(nickInput.trim(), false);
  };

  // --- HUD (Heads Up Display) ---
  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute top-3 left-3 right-3 md:top-6 md:left-6 md:right-6 flex justify-between items-start pointer-events-none">
        {/* Player Badge */}
        <div className="bg-[#0f130d]/85 backdrop-blur-md p-2 md:p-3 rounded-xl shadow-lg border border-[#2a311f] flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shrink-0">
            <img src={ASSETS.PLAYER} className="h-4 brightness-0" alt="P" />
          </div>
          <span className="font-bold text-white text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{player?.nickname}</span>
        </div>
        
        {/* Score Board */}
        <div className="flex flex-col items-end bg-[#0c100b]/80 p-3 rounded-xl backdrop-blur-md border border-[#2a311f] shadow-lg">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[#8b9477] text-[10px] md:text-xs font-bold uppercase tracking-widest">RECORDE</span>
             <span className="text-white text-xs md:text-sm font-bold font-mono">{Math.floor(player?.highScore || 0)}</span>
          </div>
          <p className="text-[#ff9d4c] text-[9px] md:text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5 text-right w-full">ATUAL</p>
          <p className="text-2xl md:text-4xl font-black text-white font-mono tracking-tighter drop-shadow-md leading-none">
            {Math.floor(currentScore).toString().padStart(5, '0')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#0b0c09]/75 backdrop-blur-sm">
      
      {/* --- MENU INICIAL / LOGIN --- */}
      {gameState === GameState.MENU && !player && (
        <div className="bg-[#141a12]/92 p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-[340px] md:max-w-[420px] text-center border border-[#2b3322]">
          <h1 className="font-display text-2xl md:text-4xl text-white mb-2">Identifique-se</h1>
          <p className="text-[#9aa38c] mb-6 text-[11px] md:text-sm">Use seu apelido para iniciar o jogo.</p>
          
          <form onSubmit={handleQuickPlay} className="space-y-3 md:space-y-4">
            <input 
              type="text" 
              placeholder="Seu Apelido" 
              className="w-full px-4 py-3 md:px-6 md:py-4 bg-[#1f2618] border-2 border-[#2b3322] rounded-xl focus:border-[#ff9d4c] focus:ring-2 focus:ring-[#ff9d4c]/30 outline-none transition-all font-bold text-white placeholder:text-[#7f886e] text-sm md:text-base text-center"
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              maxLength={12}
            />
            <button 
              type="submit"
              disabled={!nickInput.trim()}
              className="w-full bg-gradient-to-r from-[#ffb05b] via-[#ff9d4c] to-[#f48b35] hover:from-[#f9a14a] hover:to-[#e67c2a] disabled:bg-[#2f3726] disabled:text-[#7f886e] text-black font-black py-3 md:py-4 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-sm md:text-base"
            >
              Iniciar
            </button>
          </form>
        </div>
      )}

      {/* --- MENU LOGADO --- */}
      {gameState === GameState.MENU && player && (
        <div className="bg-[#141a12]/92 p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-[340px] md:max-w-[420px] text-center border border-[#2b3322]">
          <h2 className="text-[10px] md:text-xs font-black text-[#8b9477] uppercase tracking-[0.3em] mb-2">Bem-vindo</h2>
          <h1 className="font-display text-2xl md:text-4xl text-white mb-6 break-words">{player.nickname}</h1>
          
          <div className="bg-[#1f2618]/80 p-4 md:p-6 rounded-2xl mb-6 border border-[#2b3322] shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl">TOP</div>
            <p className="text-[10px] md:text-xs font-bold text-[#8b9477] uppercase tracking-widest mb-1">Seu Recorde</p>
            <p className="text-3xl md:text-4xl font-black text-[#ff9d4c] font-mono">{Math.floor(player.highScore).toString().padStart(5, '0')}</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={onStart}
              className="w-full bg-gradient-to-r from-[#ffb05b] via-[#ff9d4c] to-[#f48b35] hover:from-[#f9a14a] hover:to-[#e67c2a] text-black font-black py-4 md:py-5 rounded-xl text-xl md:text-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <span>&gt;</span> JOGAR
            </button>
            <button onClick={onLogout} className="w-full bg-transparent text-[#8b9477] py-3 rounded-xl font-bold text-xs md:text-sm border border-[#2b3322] hover:text-white hover:bg-[#1f2618] transition-colors">SAIR</button>
          </div>
        </div>
      )}

      {/* --- GAME OVER --- */}
      {gameState === GameState.GAMEOVER && (
        <div className="bg-[#141a12]/92 p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-[340px] md:max-w-[420px] text-center border-b-8 border-[#ff9d4c]">
          <div className="text-4xl md:text-5xl mb-4 animate-bounce">!</div>
          <h1 className="font-display text-3xl md:text-4xl text-white mb-2 uppercase tracking-tight">Fim de Jogo</h1>
          <p className="text-[#8b9477] mb-6 text-sm">Obra parada!</p>
          
          <div className="bg-[#1f2618]/80 p-4 md:p-6 rounded-2xl mb-6 text-white shadow-xl border border-[#2b3322]">
            <p className="text-[10px] md:text-xs font-bold text-[#ff9d4c] uppercase tracking-widest mb-1">Pontuacao Final</p>
            <p className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter">{Math.floor(currentScore).toString().padStart(5, '0')}</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={onStart}
              className="w-full bg-gradient-to-r from-[#ffb05b] via-[#ff9d4c] to-[#f48b35] hover:from-[#f9a14a] hover:to-[#e67c2a] text-black font-black py-4 md:py-5 rounded-xl text-lg md:text-xl shadow-xl transition-all active:scale-95 uppercase tracking-widest"
            >
              Jogar de Novo
            </button>
            <button onClick={onBackToMenu} className="w-full text-[#8b9477] font-bold uppercase tracking-widest text-xs md:text-sm py-2 hover:text-white transition-colors">Voltar ao Menu</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
