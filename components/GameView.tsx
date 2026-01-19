import React, { useEffect, useRef, useCallback } from 'react';
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y, GRAVITY, JUMP_FORCE, INITIAL_SPEED, SPEED_INCREMENT, ASSETS, BINC_COLORS, DUCK_HEIGHT_MULTIPLIER } from '../constants';
import { Obstacle, Scenery } from '../types';

interface GameViewProps {
  isActive: boolean;
  onGameOver: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
}

const GameView: React.FC<GameViewProps> = ({ isActive, onGameOver, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  const scoreRef = useRef(0);
  const lastScoreUpdateRef = useRef(-1);
  const lastDifficultyUpdateScoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  
  const playerRef = useRef({ 
    x: 80,
    y: GROUND_Y - 60, 
    vy: 0, 
    width: 60,  
    height: 50, 
    isJumping: false,
    isDucking: false,
    baseHeight: 50
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const sceneryRef = useRef<Scenery[]>([]); 
  const assetsLoaded = useRef<Record<string, HTMLImageElement>>({});

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('input, textarea, select, button, a'));
  };

  useEffect(() => {
    const imagesToLoad = [
      { key: 'player', url: ASSETS.PLAYER },
      ...ASSETS.OBSTACLES.map(o => ({ key: o.name, url: o.url })),
      ...ASSETS.SCENERY.map(s => ({ key: s.name, url: s.url }))
    ];

    imagesToLoad.forEach(item => {
      const img = new Image();
      img.src = item.url;
      img.onload = () => { 
        assetsLoaded.current[item.key] = img; 
      };
      img.onerror = () => {
        console.warn(`BincRunner: Imagem nao encontrada: ${item.key} em ${item.url}. Usando fallback.`);
      };
    });
  }, []);

  const jump = useCallback(() => {
    if (!playerRef.current.isJumping && !playerRef.current.isDucking && isActive) {
      playerRef.current.vy = JUMP_FORCE;
      playerRef.current.isJumping = true;
    }
  }, [isActive]);

  const setDucking = useCallback((ducking: boolean) => {
    const p = playerRef.current;
    if (ducking && !p.isJumping) {
      p.isDucking = true;
      p.height = p.baseHeight * DUCK_HEIGHT_MULTIPLIER;
      p.y = GROUND_Y - p.height;
    } else if (!ducking) {
      p.isDucking = false;
      p.height = p.baseHeight;
      if (!p.isJumping) p.y = GROUND_Y - p.height;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingTarget =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;
      if (isTypingTarget) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
      }
      if (e.code === 'Space' || e.code === 'ArrowUp') jump();
      if (e.code === 'ArrowDown') setDucking(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') setDucking(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [jump, setDucking]);

  useEffect(() => {
    if (!isActive) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (isInteractiveTarget(event.target)) return;
      if (typeof event.button === 'number' && event.button !== 0) return;
      event.preventDefault();
      jump();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      jump();
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
    };

    if ('PointerEvent' in window) {
      window.addEventListener('pointerdown', handlePointerDown, { passive: false });
    } else {
      window.addEventListener('touchstart', handleTouchStart, { passive: false });
    }
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      if ('PointerEvent' in window) {
        window.removeEventListener('pointerdown', handlePointerDown);
      } else {
        window.removeEventListener('touchstart', handleTouchStart);
      }
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isActive, jump]);

  const update = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isActive) return;

    // 1. CLEAR & BACKGROUND
    ctx.fillStyle = BINC_COLORS.DEEP_MOSS;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 2. PHYSICS & SCORE
    scoreRef.current += speedRef.current / 40;
    const displayScore = Math.floor(scoreRef.current);
    if (displayScore !== lastScoreUpdateRef.current) {
      lastScoreUpdateRef.current = displayScore;
      onScoreUpdate?.(displayScore);
    }
    
    if (scoreRef.current - lastDifficultyUpdateScoreRef.current >= 300) {
      speedRef.current += 0.5;
      lastDifficultyUpdateScoreRef.current = Math.floor(scoreRef.current);
    } else {
      speedRef.current += SPEED_INCREMENT; 
    }

    const p = playerRef.current;
    if (p.isJumping) {
      p.vy += GRAVITY;
      p.y += p.vy;
      if (p.y >= GROUND_Y - p.height) {
        p.y = GROUND_Y - p.height;
        p.vy = 0;
        p.isJumping = false;
      }
    }

    // 3. SCENERY (Background)
    const lastScenery = sceneryRef.current[sceneryRef.current.length - 1];
    if (Math.random() < 0.008 && (!lastScenery || lastScenery.x < GAME_WIDTH - 250)) {
      const sceneryType = ASSETS.SCENERY[Math.floor(Math.random() * ASSETS.SCENERY.length)];
      sceneryRef.current.push({
        x: GAME_WIDTH,
        y: GROUND_Y, 
        width: 140, 
        height: 140,
        speed: speedRef.current * 0.4, 
        image: assetsLoaded.current[sceneryType.name]
      });
    }

    sceneryRef.current.forEach(s => {
      s.x -= s.speed;
      const img = s.image || assetsLoaded.current[ASSETS.SCENERY.find(i => i.url.includes(s.image?.src || ''))?.name || ''];
      
      if (img) {
        ctx.globalAlpha = 0.4; 
        ctx.drawImage(img, s.x, GROUND_Y - 130, 130, 130);
        ctx.globalAlpha = 1.0;
      }
    });
    sceneryRef.current = sceneryRef.current.filter(s => s.x + s.width > -150);

    // 4. DRAW GROUND
    ctx.strokeStyle = BINC_COLORS.MID_GRAY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(GAME_WIDTH, GROUND_Y);
    ctx.stroke();

    // 5. SPAWN OBSTACLES
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    const minSpacing = 300 + (speedRef.current * 14); 
    
    if (Math.random() < 0.02 && (!lastObstacle || lastObstacle.x < GAME_WIDTH - minSpacing)) {
      const typeObj = ASSETS.OBSTACLES[Math.floor(Math.random() * ASSETS.OBSTACLES.length)];
      
      const isAir = typeObj.type === 'air';
      const obsHeight = isAir ? 40 : 50;
      
      obstaclesRef.current.push({
        type: typeObj.name,
        emoji: typeObj.emoji,
        x: GAME_WIDTH,
        y: isAir ? GROUND_Y - 90 : GROUND_Y - obsHeight,
        width: 60,
        height: obsHeight,
        speed: speedRef.current,
        image: assetsLoaded.current[typeObj.name]
      });
    }

    // 6. DRAW OBSTACLES
    let collision = false;
    obstaclesRef.current.forEach(o => {
      o.x -= o.speed;
      
      const img = assetsLoaded.current[o.type];
      
      if (img) {
        ctx.drawImage(img, o.x, o.y, o.width, o.height);
      } else {
        // Fallback se a imagem falhar
        ctx.fillStyle = BINC_COLORS.MID_GRAY; 
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFF';
        ctx.fillText(o.emoji || '??', o.x + o.width/2, o.y + o.height/2);
        ctx.strokeStyle = '#FF9D4C';
        ctx.strokeRect(o.x, o.y, o.width, o.height);
      }

      // COLLISION DETECTION
      const buffer = 12; 
      const hX = o.x + buffer;
      const hY = o.y + buffer;
      const hW = o.width - (buffer * 2);
      const hH = o.height - (buffer * 2);

      const pX = p.x + buffer;
      const pY = p.y + buffer;
      const pW = p.width - (buffer * 2);
      const pH = p.height - (buffer * 2);

      if (pX < hX + hW && pX + pW > hX && pY < hY + hH && pY + pH > hY) {
        collision = true;
      }
    });
    
    obstaclesRef.current = obstaclesRef.current.filter(o => o.x + o.width > -100);

    // 7. DRAW PLAYER
    const playerImg = assetsLoaded.current['player'];
    ctx.save();
    
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.width / 2, GROUND_Y + 5, p.width / 2 - 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (playerImg) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 15;
      ctx.drawImage(playerImg, p.x, p.y, p.width, p.height);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }
    ctx.restore();

    if (collision) {
      onGameOver(Math.floor(scoreRef.current));
      return;
    }

    requestRef.current = requestAnimationFrame(() => update(ctx));
  }, [isActive, onGameOver, onScoreUpdate]);

  useEffect(() => {
    if (isActive) {
      scoreRef.current = 0;
      lastScoreUpdateRef.current = 0;
      lastDifficultyUpdateScoreRef.current = 0;
      speedRef.current = INITIAL_SPEED;
      onScoreUpdate?.(0);
      playerRef.current = { 
        x: 80, y: GROUND_Y - 50, vy: 0, width: 60, height: 50, isJumping: false, isDucking: false, baseHeight: 50
      };
      obstaclesRef.current = [];
      sceneryRef.current = [];
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(() => update(ctx));
      }
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isActive, onScoreUpdate, update]);

  return (
    <canvas 
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      className="w-full h-full cursor-pointer touch-none"
    />
  );
};

export default GameView;
