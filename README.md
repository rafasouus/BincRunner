# BINC Lote Runner (Offline Web Mini-Game)

Mini-jogo web estilo runner (tipo dino do Google), com identidade BINC.
Roda offline, sem build, sem dependências.

## Como rodar
1) Abra o arquivo `index.html` diretamente no navegador.
2) Controles:
- Espaço / ↑ / clique / toque: pular
- P: pausar/retomar

## Estrutura
/crystal-simple-game/
  index.html
  css/styles.css
  js/game.js
  assets/ (opcional)

## Assets (opcional)
Se quiser colocar uma logo no topo:
- Adicione `assets/logo-binc.png`
- Descomente a linha do `<img>` no `index.html`.

## Persistência de recorde
O recorde fica salvo via localStorage:
- key: `binc_lote_runner_hiscore_v1`

## Publicar como site
Hospede como página estática (Netlify, Vercel, GitHub Pages ou servidor comum):
- basta enviar a pasta inteira.
