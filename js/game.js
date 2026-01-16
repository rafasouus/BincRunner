(() => {
  "use strict";

  /**
   * BINC Runner - Canvas 2D runner (offline)
   *
   * Revisão para corrigir engasgos/bugs:
   * 1) A aceleração de velocidade estava “forte demais” (escala por 60).
   *    Agora a física usa aceleração real: speed += accel * dt.
   * 2) Spawn: quando bloqueado pelo gap, o timer não “acumula infinito”.
   *    Travamos spawnTimer em spawnInterval para evitar “bursts” (clumps).
   * 3) Gaps: mantém o gap base (aprovado) e, aleatoriamente, aplica gaps maiores
   *    por 1 ou 2 intervalos e volta ao padrão.
   * 4) Performance: camada estática cacheada (grid + chão), reduz draw por frame.
   * 5) Mobile: toque em qualquer lugar da tela (com debounce para evitar duplo disparo).
   */

  // Mundo base (coordenadas lógicas)
  const BASE_W = 900;
  const BASE_H = 360;

  // Storage keys
  const HISTORY_KEY = "binc_runner_history_v2";
  const HISCORE_KEY = "binc_runner_hiscore_v1";

  // Debounce de input (evita duplo disparo no mobile)
  const INPUT_DEBOUNCE_MS = 140;

  // Configuração dos obstáculos (PNG)
  const OBS_CONFIGS = [
    { id: "obs_caminhao",   w: 86, h: 52, inset: { l: 10, r: 12, t: 10, b: 8  } },
    { id: "obs_carrinho",   w: 44, h: 36, inset: { l: 8,  r: 8,  t: 8,  b: 6  } },
    { id: "obs_casa1",      w: 62, h: 62, inset: { l: 10, r: 10, t: 10, b: 10 } },
    { id: "obs_casa2",      w: 66, h: 62, inset: { l: 10, r: 10, t: 10, b: 10 } },
    { id: "obs_escavadora", w: 90, h: 58, inset: { l: 12, r: 14, t: 12, b: 10 } },
    { id: "obs_misturador", w: 80, h: 58, inset: { l: 12, r: 12, t: 12, b: 10 } },
    { id: "obs_transporte", w: 94, h: 46, inset: { l: 12, r: 14, t: 10, b: 8  } },
  ];

  // Helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  function isInteractiveTarget(el) {
    if (!el) return false;
    return !!el.closest("button,a,input,textarea,select,label,summary,details");
  }

  class Obstacle {
    constructor(x, groundY) {
      const cfg = OBS_CONFIGS[Math.floor(Math.random() * OBS_CONFIGS.length)];
      this.cfg = cfg;
      this.img = document.getElementById(cfg.id);

      this.x = x;
      this.w = cfg.w;
      this.h = cfg.h;
      this.y = groundY - this.h;
    }

    update(dt, speed) {
      // speed em px/seg
      this.x -= speed * dt;
    }

    draw(ctx) {
      if (this.img && this.img.complete) {
        ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
      } else {
        // fallback se alguma imagem falhar
        ctx.fillStyle = "rgba(255,157,76,0.65)";
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
    }

    hitbox() {
      const ins = this.cfg.inset;
      return {
        x: this.x + ins.l,
        y: this.y + ins.t,
        w: Math.max(1, this.w - (ins.l + ins.r)),
        h: Math.max(1, this.h - (ins.t + ins.b)),
      };
    }
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });

      // UI refs
      this.uiScore = document.getElementById("uiScore");
      this.uiHiScore = document.getElementById("uiHiScore");
      this.overlay = document.getElementById("overlay");
      this.overlayTitle = document.getElementById("overlayTitle");
      this.overlayText = document.getElementById("overlayText");
      this.overlayMeta = document.getElementById("overlayMeta");
      this.btnPause = document.getElementById("btnPause");
      this.gameZone = document.getElementById("gameZone");

      this.reduceMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Chão (mais baixo para aproveitar BASE_H maior)
      this.groundY = 310;

      // Física
      this.gravity = 2400;

      // Estado
      this.state = "ready"; // ready | running | paused | over
      this.lastT = 0;

      // Score
      this.score = 0;
      this.hiScore = this.loadHiScore();
      this.uiHiScore.textContent = String(this.hiScore);

      // -------------------------
      // VELOCIDADE (já -10%)
      // -------------------------
      this.baseSpeed = 252;  // px/s
      this.maxSpeed  = 648;  // px/s (teto absoluto)

      // Aceleração base (px/s^2)
      // (recalibrada para evitar picos e engasgos; antes havia um multiplicador forte)
      this.baseSpeedAccel = 7.0;

      this.speed = this.baseSpeed;
      this.speedAccel = this.baseSpeedAccel;

      // Dificuldade por score
      this.easyUntil = 500;
      this.levelStep = 300;
      this.level = 0;

      // Cap de velocidade por nível (controla progressão)
      this.speedCap = this.baseSpeed + 220;

      // Spawn
      this.spawnTimer = 0;
      this.spawnInterval = 1.10;
      this.baseMinSpawnInterval = 0.66;
      this.minSpawnInterval = this.baseMinSpawnInterval;

      // GAP base (+10% já aprovado por você)
      this.baseMinGap = 330;
      this.minGap = this.baseMinGap;

      // Gap “aleatório maior” (aplica em 1 ou 2 intervalos e volta)
      this.nextGapFactor = 1.0;        // fator a ser aplicado no próximo gap
      this.gapBoostLeft = 0;           // quantos gaps ainda serão “maiores”

      // Player
      this.player = {
        sprite: document.getElementById("playerIcon"),
        x: 80,
        y: 0,
        w: 48,
        h: 48,
        vy: 0,
        onGround: true,
        hitInset: { l: 10, r: 10, t: 10, b: 8 },
      };

      // Mundo
      this.obstacles = [];

      // Render scaling
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;

      // Input debounce
      this.lastInputMs = 0;

      // Cache de camada estática (performance)
      this.staticCanvas = null;
      this.staticCtx = null;

      // Setup
      this.bindEvents();
      this.resize();
      this.buildStaticLayer(); // cria a camada estática na resolução base
      this.loadHistory();
      this.setOverlayReady();

      window.addEventListener("resize", () => {
        this.resize();
        // Não precisa rebuild a static layer porque ela está em coords base.
        // Apenas o scale/offset mudam.
      });

      requestAnimationFrame((t) => this.loop(t));
    }

    // ---------------- UI / Overlay ----------------
    setOverlayReady() {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "BINC Runner";
      this.overlayText.textContent = "Toque para Iniciar";
      this.overlayMeta.textContent = "Mobile: toque em qualquer lugar • Desktop: ESPAÇO / ↑";
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
    }

    setOverlayPaused(reason) {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "Pausado";
      this.overlayText.textContent = reason || "Pressione P para retomar";
      this.overlayMeta.textContent = "";
      this.btnPause.textContent = "Retomar";
      this.btnPause.setAttribute("aria-pressed", "true");
    }

    setOverlayOver() {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "Game Over";
      this.overlayText.textContent = "Toque para Reiniciar";
      this.overlayMeta.textContent =
        `Score: ${Math.floor(this.score)} • Recorde: ${Math.floor(this.hiScore)} • Nível: ${this.level}`;
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
    }

    hideOverlay() { this.overlay.classList.add("hidden"); }

    // ---------------- Storage ----------------
    loadHiScore() {
      try {
        const v = Number(localStorage.getItem(HISCORE_KEY) || "0");
        return Number.isFinite(v) ? Math.floor(v) : 0;
      } catch { return 0; }
    }

    saveHiScore(v) {
      try { localStorage.setItem(HISCORE_KEY, String(Math.floor(v))); } catch {}
    }

    saveScoreToHistory() {
      if (this.score < 10) return;
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const now = new Date();

      history.unshift({
        score: Math.floor(this.score),
        date: now.toLocaleDateString("pt-BR"),
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      });

      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
      this.loadHistory();
    }

    loadHistory() {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const list = document.getElementById("historyList");

      if (!history || history.length === 0) {
        list.innerHTML = `<li class="empty-msg">Nenhuma partida registrada</li>`;
        return;
      }

      list.innerHTML = history.map(h => `
        <li class="history-item">
          <span class="score-tag">${h.score} pts</span>
          <span class="time-tag">${h.date} às ${h.time}</span>
        </li>
      `).join("");
    }

    // ---------------- Input ----------------
    bindEvents() {
      // Botão pause
      this.btnPause.addEventListener("click", () => this.togglePause());

      // Desktop: clique no gameZone
      this.gameZone.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" || e.pointerType === "pen") {
          if (isInteractiveTarget(e.target)) return;
          e.preventDefault();
          this.handleInput();
        }
      }, { passive: false });

      // Mobile: toque em qualquer lugar (pointer events)
      document.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "touch") return;
        if (isInteractiveTarget(e.target)) return;
        e.preventDefault();
        this.handleInput();
      }, { passive: false });

      // Fallback iOS antigo (caso pointer não dispare corretamente)
      document.addEventListener("touchstart", (e) => {
        const target = e.target;
        if (isInteractiveTarget(target)) return;
        if (e.touches && e.touches.length === 1) {
          e.preventDefault();
          this.handleInput();
        }
      }, { passive: false });

      // Teclado
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
          e.preventDefault();
          this.handleInput();
        }
        if (e.code === "KeyP") {
          e.preventDefault();
          this.togglePause();
        }
      }, { passive: false });

      // Pausa automática ao perder foco
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === "running") {
          this.pause("Pausado (aba em segundo plano)");
        }
      });
    }

    handleInput() {
      // Debounce para evitar duplo disparo (pointerdown + touchstart)
      const now = performance.now();
      if (now - this.lastInputMs < INPUT_DEBOUNCE_MS) return;
      this.lastInputMs = now;

      if (this.state === "running") {
        // 1 pulo por vez
        if (this.player.onGround) {
          this.player.vy = -880;
          this.player.onGround = false;
        }
        return;
      }

      if (this.state === "paused") {
        this.resume();
        return;
      }

      this.start();
    }

    // ---------------- Game state ----------------
    start() {
      this.state = "running";
      this.score = 0;

      // reset dificuldade
      this.level = 0;
      this.applyDifficultyParams();

      // reset speed
      this.speed = this.baseSpeed;

      // reset spawn
      this.spawnTimer = 0;
      this.spawnInterval = 1.10;

      // reset gaps aleatórios
      this.nextGapFactor = 1.0;
      this.gapBoostLeft = 0;

      // reset mundo
      this.obstacles = [];

      // player no chão
      this.player.y = this.groundY - this.player.h;
      this.player.vy = 0;
      this.player.onGround = true;

      this.uiScore.textContent = "0";
      this.hideOverlay();
    }

    pause(reason) {
      if (this.state !== "running") return;
      this.state = "paused";
      this.setOverlayPaused(reason);
    }

    resume() {
      if (this.state !== "paused") return;
      this.state = "running";
      this.hideOverlay();
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
      // evita dt gigante após retomar
      this.lastT = performance.now();
    }

    togglePause() {
      if (this.state === "running") this.pause("Pressione P para retomar");
      else if (this.state === "paused") this.resume();
    }

    gameOver() {
      this.state = "over";

      if (this.score > this.hiScore) {
        this.hiScore = Math.floor(this.score);
        this.uiHiScore.textContent = String(this.hiScore);
        this.saveHiScore(this.hiScore);
      }

      this.saveScoreToHistory();
      this.setOverlayOver();
    }

    // ---------------- Difficulty ----------------
    computeLevelFromScore(score) {
      if (score < this.easyUntil) return 0;
      return 1 + Math.floor((score - this.easyUntil) / this.levelStep);
    }

    applyDifficultyParams() {
      const L = this.level;

      // aceleração cresce por nível (suave)
      this.speedAccel = this.baseSpeedAccel * (1 + L * 0.22);

      // teto por nível
      this.speedCap = clamp(this.baseSpeed + 220 + L * 90, this.baseSpeed, this.maxSpeed);

      // spawn mínimo por nível
      this.minSpawnInterval = clamp(this.baseMinSpawnInterval - L * 0.05, 0.45, this.baseMinSpawnInterval);

      // gap reduz por nível, mas respeita limite
      // (mantemos baseMinGap 330 como referência)
      this.minGap = clamp(this.baseMinGap - L * 22, 240, this.baseMinGap);
    }

    // ---------------- Spawn logic ----------------
    nextSpawnInterval() {
      // diff ~ 0..1 conforme aproxima do cap do nível
      const denom = Math.max(1, (this.speedCap - this.baseSpeed));
      const diff = (this.speed - this.baseSpeed) / denom;

      // Base mais conservador para evitar “aperto súbito”
      const base = 1.12 - diff * 0.45 - this.level * 0.06;
      const jitter = rand(-0.12, 0.18);

      return clamp(base + jitter, this.minSpawnInterval, 1.45);
    }

    rollNextGapBoost() {
      // Se ainda temos boosts pendentes, mantém um fator > 1
      if (this.gapBoostLeft > 0) {
        this.gapBoostLeft--;
        this.nextGapFactor = rand(1.12, 1.35); // “um pouco maior”
        return;
      }

      // Chance de ativar 1 ou 2 gaps maiores
      if (Math.random() < 0.22) {
        this.gapBoostLeft = Math.random() < 0.35 ? 1 : 0; // 35% chance de ser 2 gaps (1 restante)
        this.nextGapFactor = rand(1.12, 1.35);
        return;
      }

      // Volta ao padrão
      this.nextGapFactor = 1.0;
    }

    maybeSpawnObstacle(dt) {
      this.spawnTimer += dt;

      if (this.spawnTimer < this.spawnInterval) return;

      const last = this.obstacles[this.obstacles.length - 1];

      // Gap requerido para o PRÓXIMO obstáculo (padrão ou boost)
      const requiredGap = this.minGap * this.nextGapFactor;

      // Se o último ainda está muito à direita, seguramos o spawn.
      // IMPORTANTE: travamos o timer para não “acumular” e gerar burst.
      if (last && last.x > (BASE_W - requiredGap)) {
        this.spawnTimer = this.spawnInterval; // segura no limite
        return;
      }

      // Executa spawn
      this.spawnTimer = 0;
      this.spawnInterval = this.nextSpawnInterval();
      this.obstacles.push(new Obstacle(BASE_W + 40, this.groundY));

      // Após criar o obstáculo, decide como será o gap do PRÓXIMO
      this.rollNextGapBoost();
    }

    // ---------------- Collision ----------------
    playerHitbox() {
      const ins = this.player.hitInset;
      return {
        x: this.player.x + ins.l,
        y: this.player.y + ins.t,
        w: Math.max(1, this.player.w - (ins.l + ins.r)),
        h: Math.max(1, this.player.h - (ins.t + ins.b)),
      };
    }

    aabb(a, b) {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    }

    // ---------------- Update ----------------
    update(dt) {
      // dt clamp
      dt = clamp(dt, 0, 0.05);

      // score cresce por tempo e um pouco pela velocidade
      const scoreRate = 10 * (this.speed / this.baseSpeed);
      this.score += dt * scoreRate;
      this.uiScore.textContent = String(Math.floor(this.score));

      // nível por score
      const newLevel = this.computeLevelFromScore(this.score);
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.applyDifficultyParams();
      }

      // speed: aceleração real (sem multiplicador por 60)
      this.speed = clamp(this.speed + (this.speedAccel * dt), this.baseSpeed, this.speedCap);

      // player physics
      this.player.vy += this.gravity * dt;
      this.player.y += this.player.vy * dt;

      // chão
      if (this.player.y >= this.groundY - this.player.h) {
        this.player.y = this.groundY - this.player.h;
        this.player.vy = 0;
        this.player.onGround = true;
      }

      // spawn
      this.maybeSpawnObstacle(dt);

      // obstáculos + colisão
      const pHB = this.playerHitbox();
      for (const obs of this.obstacles) {
        obs.update(dt, this.speed);
        if (this.aabb(pHB, obs.hitbox())) {
          this.gameOver();
          return;
        }
      }

      // remove offscreen
      this.obstacles = this.obstacles.filter(o => o.x > -200);
    }

    // ---------------- Rendering (performance) ----------------
    buildStaticLayer() {
      // Camada estática (grid + chão) em coordenadas base
      this.staticCanvas = document.createElement("canvas");
      this.staticCanvas.width = BASE_W;
      this.staticCanvas.height = BASE_H;
      this.staticCtx = this.staticCanvas.getContext("2d");

      const g = this.staticCtx;

      // fundo
      g.fillStyle = "#000";
      g.fillRect(0, 0, BASE_W, BASE_H);

      // grid discreto
      g.globalAlpha = 0.10;
      g.strokeStyle = "rgba(255,255,255,0.12)";
      g.lineWidth = 1;

      for (let x = 0; x <= BASE_W; x += 60) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, BASE_H);
        g.stroke();
      }

      for (let y = 0; y <= BASE_H; y += 40) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(BASE_W, y);
        g.stroke();
      }

      g.globalAlpha = 1;

      // chão
      g.strokeStyle = "rgba(255,157,76,0.35)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, this.groundY);
      g.lineTo(BASE_W, this.groundY);
      g.stroke();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));

      this.canvas.width = w;
      this.canvas.height = h;

      const sx = w / BASE_W;
      const sy = h / BASE_H;
      this.scale = Math.min(sx, sy);

      const logicalW = w / this.scale;
      const logicalH = h / this.scale;
      this.offsetX = (logicalW - BASE_W) / 2;
      this.offsetY = (logicalH - BASE_H) / 2;
    }

    draw() {
      // reset em pixels
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // transforma para o “mundo base”
      this.ctx.setTransform(
        this.scale, 0, 0, this.scale,
        this.offsetX * this.scale,
        this.offsetY * this.scale
      );

      // desenha layer estática cacheada
      if (this.staticCanvas) {
        this.ctx.drawImage(this.staticCanvas, 0, 0);
      } else {
        // fallback (não deve acontecer)
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, BASE_W, BASE_H);
      }

      // obstáculos
      for (const obs of this.obstacles) obs.draw(this.ctx);

      // player
      const spr = this.player.sprite;
      if (spr && spr.complete) {
        this.ctx.drawImage(spr, this.player.x, this.player.y, this.player.w, this.player.h);
      } else {
        this.ctx.fillStyle = "rgba(255,157,76,0.9)";
        this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
      }

      // efeito sutil quando pausado
      if (this.state === "paused" && !this.reduceMotion) {
        this.ctx.globalAlpha = 0.10;
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0, 0, BASE_W, BASE_H);
        this.ctx.globalAlpha = 1;
      }
    }

    // ---------------- Loop ----------------
    loop(t) {
      if (!this.lastT) this.lastT = t;
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;

      // evita dt gigante
      if (dt > 0.1) dt = 0;

      if (this.state === "running") this.update(dt);
      this.draw();

      requestAnimationFrame((tt) => this.loop(tt));
    }
  }

  window.addEventListener("load", () => {
    const canvas = document.getElementById("gameCanvas");
    new Game(canvas);
  });
})();
