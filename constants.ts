export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;
export const GROUND_Y = 370;
export const GRAVITY = 0.8;
export const JUMP_FORCE = -15;
export const DUCK_HEIGHT_MULTIPLIER = 0.6;
export const INITIAL_SPEED = 5.8;
export const SPEED_INCREMENT = 0.0002;

export const BINC_COLORS = {
  MOSS: '#363B2C',
  DEEP_MOSS: '#1A1D14',
  BLACK: '#000000',
  DARK_GRAY: '#787765',
  ORANGE: '#FF9D4C',
  OFF_WHITE: '#F2F1ED',
  SOFT_WHITE: '#F5F5F5',
  MID_GRAY: '#4A4F3F'
};

const withBase = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const PLAYER_SVG = `data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgwIiBoZWlnaHQ9Ijg5NiIgdmlld0JveD0iMCAwIDEwODAgODk2LjQyIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNNzg2LjM0LDEzMC41NGgtMzYxLjc5bC0yMzcuNjcsMjY0Ljg5VjBIMHY2MDIuNThjMCw2MC4xNSwxOC4zOCwxMTYuMzIsNDkuNzYsMTYyLjk1LDMzLjExLDQ5LjQsODAuOTUsODguNDEsMTM3LjEyLDExMC40MywzMy4xLDEzLjE3LDY5LjM0LDIwLjQ2LDEwNi45NSwyMC40Nmg0ODMuNjVsMTE3LjM3LTEzMC44OUgxODYuODl2LTE3NC43NGwyOTcuMTItMzI5LjM3aDIxOS4xMWMxMTguOTIsMCwxOTEuNzQsNTQuMjYsMTkxLjc0LDE3MS40NXYzMzIuNjZsMTg1LjE0LTIwNi4yOXYtMTM0Ljg3YzAtMTYxLjQtMTMyLjQ0LTI5My44NC0yOTMuNjYtMjkzLjg0Ii8+PC9zdmc+`;

export const ASSETS = {
  LOGO_BINC: withBase('assets/img/logo-binc.png'),
  PLAYER: PLAYER_SVG,
  OBSTACLES: [
    { name: 'caminhao', url: withBase('assets/img/caminhao.png'), type: 'ground', emoji: '??' },
    { name: 'carrinho', url: withBase('assets/img/carrinho-de-mao.png'), type: 'ground', emoji: '??' },
    { name: 'escavadora', url: withBase('assets/img/escavadora.png'), type: 'ground', emoji: '??' },
    { name: 'misturador', url: withBase('assets/img/misturador-de-concreto.png'), type: 'ground', emoji: '???' },
    { name: 'transporte', url: withBase('assets/img/transporte.png'), type: 'ground', emoji: '??' },
    { name: 'drone', url: withBase('assets/img/drone.png'), type: 'air', emoji: '??' }
  ],
  SCENERY: [
    { name: 'casa', url: withBase('assets/img/casa.png') },
    { name: 'casa_moderna', url: withBase('assets/img/casa-moderna.png') },
    { name: 'casa_moderna_2', url: withBase('assets/img/casa-moderna-2.png') }
  ]
};
