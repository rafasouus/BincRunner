
export interface Player {
  nickname: string;
  isLoggedIn: boolean;
  highScore: number;
}

export interface ScoreEntry {
  nickname: string;
  score: number;
  date: string;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  LEADERBOARD = 'LEADERBOARD'
}

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  image?: HTMLImageElement;
}

export interface Obstacle extends GameObject {
  type: string;
  speed: number;
  emoji?: string; // Fallback visual
}

export interface Scenery extends GameObject {
  speed: number;
}
