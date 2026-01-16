# BINC Runner

Mini game web (HTML/CSS/JS) com Canvas 2D, assets locais e deploy simples (GitHub Pages).

## Rodar local
Abra `index.html` no navegador.

## Controles
- Mobile: toque em qualquer lugar da tela para iniciar / pular / reiniciar
- Desktop: ESPAÇO ou ↑ para pular
- P: pausar/retomar
- Botão "Pausar" no topo

## Dificuldade
- 0 a 500 pts: nível fácil
- após 500 pts: aumenta 1 nível a cada +300 pts
- a cada nível: mais velocidade, mais obstáculos e menor espaço mínimo entre eles

## Espaçamento entre obstáculos
- O "gap base" foi aumentado em +10% para dar mais respiro ao jogador.

## Persistência
- Hi-score: `binc_runner_hiscore_v1`
- Histórico (últimas 5 partidas): `binc_runner_history_v2`

## Publicar (GitHub Pages)
Settings → Pages → Deploy from branch → `main` / root

URL típica:
https://rafasouus.github.io/BincRunner/
