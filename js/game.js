(() => {
  "use strict";

  const BASE_W = 900;

  // AUMENTE A AREA DO JOGO: base mais alto para casar com aspect-ratio 5/2
  const BASE_H = 360;

  const HISTORY_KEY = "binc_runner_history_v2";
  const HISCORE_KEY  = "binc_runner_hiscore_v1";

  const OBS_CONFIGS = [
    { id: "obs_caminhao",    w: 86, h: 52, inset: { l: 10, r: 12, t: 10, b: 8  } },
    { id: "obs_carrinho",    w: 44, h: 36, inset: { l: 8,  r: 8,  t: 8,  b: 6  } },
    { id: "obs_casa1",       w: 62, h: 62, inset: { l: 10, r: 10, t: 10, b: 10 } },
    { id: "obs_casa2",       w: 66, h: 62, inset: { l: 10, r: 10, t: 10, b: 10 } },
    { id: "obs_escavadora",  w: 90, h: 58, inset: { l: 12, r: 14, t: 12, b: 10 } },
    { id: "obs_misturador",  w: 80, h: 58, inset: { l: 12, r: 12, t: 12, b: 10 } },
    { id: "obs_transporte",  w: 94, h: 46, inset: { l: 12, r: 14, t: 10, b: 8  } },
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  function isInteractiveTarget(el) {
    if (!el) return false;
    return !!el.closest("button,a,input,textarea,select,label,summary,details");
  }

  class Obstacle {
    constructor(x, groundY) {
      const config = OBS_CONFIGS[Math.floor(Math.random() * OBS_CONFIGS.length)];
      this.cfg = config;
      this.img = document.getElementById(config.id);

      this.x = x;
      this.w = config.w;
      this.h = config.h;
      this.y = groundY - this.h;
    }

    update(dt, speed) { this.x -= speed * dt; }

    draw(ctx) {
      if (this.img && this.img.complete) ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
      else {
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
      this.ctx = canvas.getContext("2d");

      this.uiScore = document.getElementById("uiScore");
      this.uiHiScore = document.getElementById("uiHiScore");
      this.overlay = document.getElementById("overlay");
      this.overlayTitle = document.getElementById("overlayTitle");
      this.overlayText = document.getElementById("overlayText");
      this.overlayMeta = document.getElementById("overlayMeta");
      this.btnPause = document.getElementById("btnPause");
      this.gameZone = document.getElementById("gameZone");

      this.reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // chão mais baixo para aproveitar o BASE_H maior
      this.groundY = 310;
      this.gravity = 2400;

      this.state = "ready"; // ready | running | paused | over
      this.lastT = 0;

      this.score = 0;
      this.hiScore = this.loadHiScore();
      this.uiHiScore.textContent = String(this.hiScore);

      // =========================
      // VELOCIDADE -10%
      // =========================
      this.baseSpeed = 252; // era 280 (redução ~10%)
      this.maxSpeed  = 648; // era 720 (redução ~10%)

      // aceleração base também reduzida
      this.baseSpeedAccel = 12.6; // era 14

      this.speed = this.baseSpeed;

      // =========================
      // DIFICULDADE POR SCORE
      // - fácil até 500 pts
      // - sobe 1 nível a cada +300 pts
      // =========================
      this.easyUntil = 500;
      this.levelStep = 300;
      this.level = 0;

      // Spawn determinístico
      this.spawnTimer = 0;
      this.spawnInterval = 1.15;

      // valores base (nível fácil)
      this.baseMinSpawnInterval = 0.66;
      this.minSpawnInterval = this.baseMinSpawnInterval;

      this.baseMinGap = 300;
      this.minGap = this.baseMinGap;

      // parâmetros atuais (dependem do nível)
      this.speedAccel = this.baseSpeedAccel;
      this.speedCap = this.baseSpeed + 220;

      // Player
      this.player = {
        sprite: document.getElementById("playerIcon"),
        x: 80,
        y: 0,
        w: 48,
        h: 48,
        vy: 0,
        onGround: true,
        hitInset: { l: 10, r: 10, t: 10, b: 8 }
      };

      this.obstacles = [];

      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;

      this.bindEvents();
      this.resize();
      this.loadHistory();

      this.setOverlayReady();

      window.addEventListener("resize", () => this.resize());
      requestAnimationFrame((t) => this.loop(t));
    }

    bindEvents() {
      this.btnPause.addEventListener("click", () => this.togglePause());

      // Desktop: clique no gameZone
      this.gameZone.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" || e.pointerType === "pen") {
          if (isInteractiveTarget(e.target)) return;
          e.preventDefault();
          this.handleInput();
        }
      }, { passive: false });

      // Mobile: toque em QUALQUER lugar
      document.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "touch") return;
        if (isInteractiveTarget(e.target)) return;
        e.preventDefault();
        this.handleInput();
      }, { passive: false });

      // Fallback iOS antigo
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

      // Pause automático ao perder foco
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === "running") {
          this.pause("Pausado (aba em segundo plano)");
        }
      });
    }

    setOverlayReady() {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "BINC Runner";
      this.overlayText.textContent  = "Toque para Iniciar";
      this.overlayMeta.textContent  = "Mobile: toque em qualquer lugar • Desktop: ESPAÇO / ↑";
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
    }

    setOverlayPaused(reason) {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "Pausado";
      this.overlayText.textContent  = reason || "Pressione P para retomar";
      this.overlayMeta.textContent  = "";
      this.btnPause.textContent = "Retomar";
      this.btnPause.setAttribute("aria-pressed", "true");
    }

    setOverlayOver() {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "Game Over";
      this.overlayText.textContent  = "Toque para Reiniciar";
      this.overlayMeta.textContent  = `Score: ${Math.floor(this.score)} • Recorde: ${Math.floor(this.hiScore)} • Nível: ${this.level}`;
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
    }

    hideOverlay() { this.overlay.classList.add("hidden"); }

    loadHiScore() {
      try {
        const v = Number(localStorage.getItem(HISCORE_KEY) || "0");
        return Number.isFinite(v) ? Math.floor(v) : 0;
      } catch { return 0; }
    }

    saveHiScore(v) {
      try { localStorage.setItem(HISCORE_KEY, String(Math.floor(v))); } catch {}
    }

    start() {
      this.state = "running";
      this.score = 0;

      this.level = 0;
      this.applyDifficultyParams();

      this.speed = this.baseSpeed;
      this.spawnTimer = 0;
      this.spawnInterval = 1.15;

      this.obstacles = [];

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
      this.lastT = performance.now();
    }

    togglePause() {
      if (this.state === "running") this.pause("Pressione P para retomar");
      else if (this.state === "paused") this.resume();
    }

    handleInput() {
      if (this.state === "running") {
        if (this.player.onGround) {
          this.player.vy = -880;
          this.player.onGround = false;
        }
        return;
      }

      if (this.state === "paused") { this.resume(); return; }

      this.start();
    }

    saveScoreToHistory() {
      if (this.score < 10) return;

      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const now = new Date();

      history.unshift({
        score: Math.floor(this.score),
        date: now.toLocaleDateString("pt-BR"),
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
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

    // ======= DIFICULDADE POR SCORE =======
    computeLevelFromScore(score) {
      if (score < this.easyUntil) return 0;
      return 1 + Math.floor((score - this.easyUntil) / this.levelStep);
    }

    applyDifficultyParams() {
      // nível 0 = fácil
      // a cada nível: acelera, nasce mais obstáculo e reduz gap
      const L = this.level;

      this.speedAccel = this.baseSpeedAccel * (1 + L * 0.22);

      // teto de velocidade por nível (sobe em “degraus”)
      this.speedCap = clamp(this.baseSpeed + 220 + L * 90, this.baseSpeed, this.maxSpeed);

      // spawn
      this.minSpawnInterval = clamp(this.baseMinSpawnInterval - L * 0.05, 0.45, this.baseMinSpawnInterval);

      // gap
      this.minGap = clamp(this.baseMinGap - L * 22, 200, this.baseMinGap);
    }

    nextSpawnInterval() {
      // quanto mais perto do speedCap, menor intervalo (mais difícil)
      const diff = (this.speed - this.baseSpeed) / Math.max(1, (this.speedCap - this.baseSpeed));
      const base = 1.18 - diff * 0.55 - this.level * 0.06;
      const jitter = rand(-0.14, 0.18);
      return clamp(base + jitter, this.minSpawnInterval, 1.45);
    }

    maybeSpawnObstacle(dt) {
      this.spawnTimer += dt;
      if (this.spawnTimer < this.spawnInterval) return;

      const last = this.obstacles[this.obstacles.length - 1];
      if (last && last.x > (BASE_W - this.minGap)) return;

      this.spawnTimer = 0;
      this.spawnInterval = this.nextSpawnInterval();
      this.obstacles.push(new Obstacle(BASE_W + 40, this.groundY));
    }

    update(dt) {
      dt = clamp(dt, 0, 0.05);

      // score
      const scoreRate = 10 * (this.speed / this.baseSpeed);
      this.score += dt * scoreRate;
      this.uiScore.textContent = String(Math.floor(this.score));

      // recalcula nível por score e aplica params se mudou
      const newLevel = this.computeLevelFromScore(this.score);
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.applyDifficultyParams();
      }

      // speed sobe, mas respeita speedCap do nível
      this.speed = clamp(this.speed + this.speedAccel * dt * 60, this.baseSpeed, this.speedCap);

      // player physics
      this.player.vy += this.gravity * dt;
      this.player.y += this.player.vy * dt;

      if (this.player.y >= this.groundY - this.player.h) {
        this.player.y = this.groundY - this.player.h;
        this.player.vy = 0;
        this.player.onGround = true;
      }

      // spawn
      this.maybeSpawnObstacle(dt);

      // collisions
      const pHB = this.playerHitbox();
      for (const obs of this.obstacles) {
        obs.update(dt, this.speed);
        if (this.aabb(pHB, obs.hitbox())) {
          this.gameOver();
          return;
        }
      }

      this.obstacles = this.obstacles.filter(o => o.x > -200);
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

    draw() {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.setTransform(
        this.scale, 0, 0, this.scale,
        this.offsetX * this.scale, this.offsetY * this.scale
      );

      // fundo
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(0, 0, BASE_W, BASE_H);

      // grid leve
      this.ctx.globalAlpha = 0.10;
      this.ctx.strokeStyle = "rgba(255,255,255,0.12)";
      this.ctx.lineWidth = 1;
      for (let x = 0; x <= BASE_W; x += 60) {
        this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, BASE_H); this.ctx.stroke();
      }
      for (let y = 0; y <= BASE_H; y += 40) {
        this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(BASE_W, y); this.ctx.stroke();
      }
      this.ctx.globalAlpha = 1;

      // chão
      this.ctx.strokeStyle = "rgba(255,157,76,0.35)";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.groundY);
      this.ctx.lineTo(BASE_W, this.groundY);
      this.ctx.stroke();

      for (const obs of this.obstacles) obs.draw(this.ctx);

      if (this.player.sprite && this.player.sprite.complete) {
        this.ctx.drawImage(this.player.sprite, this.player.x, this.player.y, this.player.w, this.player.h);
      } else {
        this.ctx.fillStyle = "rgba(255,157,76,0.9)";
        this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
      }

      if (this.state === "paused" && !this.reduceMotion) {
        this.ctx.globalAlpha = 0.10;
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0, 0, BASE_W, BASE_H);
        this.ctx.globalAlpha = 1;
      }
    }

    loop(t) {
      if (!this.lastT) this.lastT = t;
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
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
