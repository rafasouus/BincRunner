/* BINC Lote Runner
 * Offline-first | Canvas 2D | Responsive | Score + Hi-score
 * Controls: Space / ArrowUp / Tap = Jump | P = Pause
 */

(() => {
  "use strict";

  const BASE_W = 900;
  const BASE_H = 300;

  const STORAGE_KEY = "binc_lote_runner_hiscore_v1";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));

  function aabbIntersect(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  const COLORS = {
    moss: () => getCSSVar("--binc-moss") || "#363B2C",
    black: () => getCSSVar("--binc-black") || "#000000",
    darkGray: () => getCSSVar("--binc-dark-gray") || "#787765",
    orange: () => getCSSVar("--binc-orange") || "#FF9D4C",
    offWhite: () => getCSSVar("--binc-off-white") || "#F2F1ED",
    softWhite: () => getCSSVar("--binc-soft-white") || "#F5F5F5",
    midGray: () => getCSSVar("--binc-mid-gray") || "#CFC9BB",
  };

  class Player {
    constructor(groundY) {
      this.w = 54;
      this.h = 46;
      this.x = 120;
      this.y = groundY - this.h; // top-left
      this.vy = 0;
      this.groundY = groundY;
      this.onGround = true;

      // hitbox tuning (mais justo/divertido)
      this.hitInset = { x: 8, y: 6, w: 16, h: 10 };
    }

    jump() {
      if (!this.onGround) return false;
      this.vy = -920; // px/s
      this.onGround = false;
      return true;
    }

    update(dt, gravity) {
      this.vy += gravity * dt;
      this.y += this.vy * dt;

      const floorY = this.groundY - this.h;
      if (this.y >= floorY) {
        this.y = floorY;
        this.vy = 0;
        this.onGround = true;
      }
    }

    getHitbox() {
      return {
        x: this.x + this.hitInset.x,
        y: this.y + this.hitInset.y,
        w: this.w - this.hitInset.w,
        h: this.h - this.hitInset.h,
      };
    }

    draw(ctx) {
      const moss = COLORS.moss();
      const dark = COLORS.darkGray();
      const orange = COLORS.orange();

      // Corpo (sobrado/casinha)
      const bodyX = this.x;
      const bodyY = this.y + 14;
      const bodyW = this.w;
      const bodyH = this.h - 14;

      // Telhado
      ctx.save();
      ctx.lineWidth = 2;

      // telhado triangular
      ctx.beginPath();
      ctx.moveTo(bodyX + 6, bodyY);
      ctx.lineTo(bodyX + bodyW / 2, this.y + 2);
      ctx.lineTo(bodyX + bodyW - 6, bodyY);
      ctx.closePath();
      ctx.fillStyle = moss;
      ctx.fill();
      ctx.strokeStyle = moss;
      ctx.stroke();

      // corpo
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = moss;
      ctx.beginPath();
      ctx.roundRect(bodyX + 3, bodyY, bodyW - 6, bodyH, 6);
      ctx.fill();
      ctx.stroke();

      // porta
      ctx.fillStyle = COLORS.midGray();
      ctx.strokeStyle = moss;
      ctx.beginPath();
      ctx.roundRect(bodyX + bodyW * 0.40, bodyY + bodyH * 0.38, bodyW * 0.22, bodyH * 0.55, 5);
      ctx.fill();
      ctx.stroke();

      // janela
      ctx.fillStyle = COLORS.softWhite();
      ctx.strokeStyle = dark;
      ctx.beginPath();
      ctx.roundRect(bodyX + bodyW * 0.16, bodyY + bodyH * 0.25, bodyW * 0.18, bodyH * 0.22, 4);
      ctx.fill();
      ctx.stroke();

      // “badge” laranja (detalhe corporativo-fun)
      ctx.fillStyle = orange;
      ctx.beginPath();
      ctx.roundRect(bodyX + bodyW * 0.70, bodyY + bodyH * 0.18, bodyW * 0.18, bodyH * 0.16, 4);
      ctx.fill();

      ctx.restore();
    }
  }

  class Obstacle {
    constructor(type, x, groundY) {
      this.type = type;
      this.x = x;
      this.groundY = groundY;

      // dimensões/posicionamento por tipo
      if (type === "cone") {
        this.w = 28; this.h = 42;
        this.y = groundY - this.h;
      } else if (type === "prefeitura") {
        this.w = 46; this.h = 52;
        this.y = groundY - this.h;
      } else if (type === "docs") {
        this.w = 38; this.h = 44;
        this.y = groundY - this.h;
      } else if (type === "pit") {
        // vala/buraco: hitbox especial (colisão por sobreposição em X quando no chão)
        this.w = irand(52, 86);
        this.h = 16;
        this.y = groundY - 8; // visual/hitbox perto do chão
      } else {
        this.w = 34; this.h = 44;
        this.y = groundY - this.h;
      }

      // ajuste fino de hitbox (menor que o desenho)
      this.hitInset = { x: 3, y: 3, w: 6, h: 6 };
    }

    update(dt, speed) {
      this.x -= speed * dt;
    }

    isOffscreen() {
      return this.x + this.w < -30;
    }

    getHitbox() {
      return {
        x: this.x + this.hitInset.x,
        y: this.y + this.hitInset.y,
        w: this.w - this.hitInset.w,
        h: this.h - this.hitInset.h,
      };
    }

    draw(ctx) {
      const moss = COLORS.moss();
      const dark = COLORS.darkGray();
      const mid = COLORS.midGray();
      const orange = COLORS.orange();

      ctx.save();
      ctx.lineWidth = 2;

      if (this.type === "cone") {
        // cone de obra
        ctx.fillStyle = orange;
        ctx.strokeStyle = moss;

        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2, this.y);
        ctx.lineTo(this.x + this.w, this.y + this.h);
        ctx.lineTo(this.x, this.y + this.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // faixa
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(this.x + 5, this.y + this.h * 0.55, this.w - 10, 7, 4);
        ctx.fill();

      } else if (this.type === "prefeitura") {
        // placa “Prefeitura”
        ctx.strokeStyle = moss;
        ctx.fillStyle = "#ffffff";

        // haste
        ctx.beginPath();
        ctx.roundRect(this.x + this.w * 0.46, this.y + 12, this.w * 0.08, this.h - 12, 4);
        ctx.fillStyle = mid;
        ctx.fill();

        // placa
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = dark;
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PREF.", this.x + this.w / 2, this.y + 12);

      } else if (this.type === "docs") {
        // pilha “Docs”
        ctx.strokeStyle = moss;

        for (let i = 0; i < 3; i++) {
          const ox = this.x + i * 3;
          const oy = this.y + i * 5;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(ox, oy, this.w - i * 3, this.h - i * 6, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.roundRect(ox + 6, oy + 10, (this.w - i * 3) - 12, 4, 3);
          ctx.fill();
        }

        ctx.fillStyle = dark;
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("DOC", this.x + 8, this.y + 14);

      } else if (this.type === "pit") {
        // buraco/vala
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.strokeStyle = moss;
        ctx.beginPath();
        ctx.roundRect(this.x, this.groundY - 10, this.w, 18, 10);
        ctx.fill();
        ctx.stroke();

        // profundidade
        ctx.fillStyle = "rgba(54,59,44,0.18)";
        ctx.beginPath();
        ctx.roundRect(this.x + 6, this.groundY - 6, this.w - 12, 10, 8);
        ctx.fill();

      } else {
        // fallback
        ctx.fillStyle = mid;
        ctx.strokeStyle = moss;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, 8);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  class Collectible {
    constructor(kind, x, y) {
      this.kind = kind; // "key" | "lot"
      this.x = x;
      this.y = y;
      this.w = 26;
      this.h = 26;
      this.spin = rand(0, Math.PI * 2);
      this.floatT = rand(0, Math.PI * 2);

      this.hitInset = { x: 4, y: 4, w: 8, h: 8 };
    }

    update(dt, speed) {
      this.x -= speed * dt;
      this.spin += dt * 3.0;
      this.floatT += dt * 2.2;
    }

    isOffscreen() {
      return this.x + this.w < -30;
    }

    getHitbox() {
      const floatY = Math.sin(this.floatT) * 3.0;
      return {
        x: this.x + this.hitInset.x,
        y: this.y + floatY + this.hitInset.y,
        w: this.w - this.hitInset.w,
        h: this.h - this.hitInset.h,
      };
    }

    draw(ctx) {
      const moss = COLORS.moss();
      const orange = COLORS.orange();
      const dark = COLORS.darkGray();
      const floatY = Math.sin(this.floatT) * 3.0;

      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2 + floatY);
      ctx.rotate(Math.sin(this.spin) * 0.06);
      ctx.translate(-this.w / 2, -this.h / 2);

      ctx.lineWidth = 2;
      ctx.strokeStyle = moss;
      ctx.fillStyle = "#ffffff";

      if (this.kind === "key") {
        // chave (ícone simples)
        ctx.beginPath();
        ctx.roundRect(2, 10, 14, 10, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = orange;
        ctx.beginPath();
        ctx.arc(7, 15, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = moss;
        ctx.beginPath();
        ctx.moveTo(16, 15);
        ctx.lineTo(24, 15);
        ctx.stroke();

        // dentes
        ctx.beginPath();
        ctx.moveTo(20, 15);
        ctx.lineTo(20, 20);
        ctx.moveTo(23, 15);
        ctx.lineTo(23, 18);
        ctx.stroke();

      } else {
        // lote (placa LT)
        ctx.beginPath();
        ctx.roundRect(2, 2, 22, 18, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = dark;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("LT", 13, 11);

        // haste
        ctx.strokeStyle = moss;
        ctx.beginPath();
        ctx.moveTo(13, 20);
        ctx.lineTo(13, 26);
        ctx.stroke();

        ctx.fillStyle = orange;
        ctx.beginPath();
        ctx.arc(13, 26, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, vx, vy, life) {
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.life = life;
      this.maxLife = life;
      this.size = rand(1.5, 3.2);
    }
    update(dt) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 1200 * dt;
    }
    draw(ctx) {
      const a = clamp(this.life / this.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = COLORS.moss();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    dead() { return this.life <= 0; }
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });

      // UI
      this.uiScore = document.getElementById("uiScore");
      this.uiHiScore = document.getElementById("uiHiScore");
      this.btnStart = document.getElementById("btnStart");
      this.btnPause = document.getElementById("btnPause");
      this.overlay = document.getElementById("overlay");
      this.overlayTitle = document.getElementById("overlayTitle");
      this.overlayText = document.getElementById("overlayText");
      this.overlayMeta = document.getElementById("overlayMeta");

      // Reduced motion
      this.reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Render scaling
      this.scaleX = 1;
      this.scaleY = 1;

      // World
      this.groundY = 250;
      this.gravity = 2400;

      // State
      this.state = "ready"; // ready | running | paused | over
      this.lastT = 0;

      // Score
      this.score = 0;
      this.hiScore = this.loadHiScore();
      this.uiHiScore.textContent = String(this.hiScore);

      // Difficulty
      this.baseSpeed = 360;
      this.speed = this.baseSpeed;
      this.maxSpeed = 820;

      // Entities
      this.player = new Player(this.groundY);
      this.obstacles = [];
      this.collectibles = [];
      this.particles = [];

      // Spawn timers
      this.spawnObsT = 0;
      this.spawnObsNext = 1.15;
      this.spawnColT = 0;
      this.spawnColNext = 2.25;

      // Ground details
      this.roadDashT = 0;

      this.bindEvents();
      this.resize();
      this.setOverlayReady();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    bindEvents() {
      window.addEventListener("resize", () => this.resize());

      // Keyboard
      window.addEventListener("keydown", (e) => {
        const code = e.code;

        if (code === "Space" || code === "ArrowUp") {
          e.preventDefault();
          this.handleJumpOrStart();
        } else if (code === "KeyP") {
          e.preventDefault();
          this.togglePause();
        } else if (code === "Enter") {
          // conveniência
          if (this.state !== "running") this.start();
        }
      }, { passive: false });

      // Pointer / touch
      this.canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.handleJumpOrStart();
      }, { passive: false });

      // Buttons
      this.btnStart.addEventListener("click", () => this.start());
      this.btnPause.addEventListener("click", () => this.togglePause());

      // Focus/visibility pause
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === "running") {
          this.pause("Pausado (aba em segundo plano)");
        }
      });
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const pxW = Math.max(1, Math.floor(rect.width * dpr));
      const pxH = Math.max(1, Math.floor(rect.height * dpr));

      this.canvas.width = pxW;
      this.canvas.height = pxH;

      this.scaleX = pxW / BASE_W;
      this.scaleY = pxH / BASE_H;

      // ground fixo relativo ao BASE_H
      this.groundY = 250;
      this.player.groundY = this.groundY;
      if (this.player.onGround) {
        this.player.y = this.groundY - this.player.h;
      }
    }

    loadHiScore() {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        const n = Number(v);
        return Number.isFinite(n) ? Math.floor(n) : 0;
      } catch {
        return 0;
      }
    }

    saveHiScore(v) {
      try {
        localStorage.setItem(STORAGE_KEY, String(Math.floor(v)));
      } catch {
        // ignore
      }
    }

    setOverlayReady() {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "Pronto?";
      this.overlayText.innerHTML = "Clique em <strong>Jogar</strong> ou pressione <strong>Espaço</strong>.";
      this.overlayMeta.textContent = "";
      this.btnStart.textContent = "Jogar";
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
    }

    setOverlayPaused(reason) {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "Pausado";
      this.overlayText.textContent = reason || "Pressione P para retomar.";
      this.overlayMeta.textContent = "";
      this.btnPause.textContent = "Retomar";
      this.btnPause.setAttribute("aria-pressed", "true");
    }

    setOverlayOver() {
      this.overlay.classList.remove("hidden");
      this.overlayTitle.textContent = "Game Over";
      this.overlayText.innerHTML = "Pressione <strong>Espaço</strong> ou clique para jogar novamente.";
      this.overlayMeta.textContent = `Score final: ${Math.floor(this.score)} • Recorde: ${Math.floor(this.hiScore)}`;
      this.btnStart.textContent = "Reiniciar";
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
    }

    hideOverlay() {
      this.overlay.classList.add("hidden");
    }

    start() {
      this.resetRun();
      this.state = "running";
      this.hideOverlay();
      this.btnStart.textContent = "Reiniciar";
      this.btnPause.textContent = "Pausar";
      this.btnPause.setAttribute("aria-pressed", "false");
    }

    resetRun() {
      this.score = 0;
      this.speed = this.baseSpeed;

      this.player = new Player(this.groundY);
      this.obstacles = [];
      this.collectibles = [];
      this.particles = [];

      this.spawnObsT = 0;
      this.spawnObsNext = 1.05;
      this.spawnColT = 0;
      this.spawnColNext = 2.2;

      this.roadDashT = 0;
      this.uiScore.textContent = "0";
      this.overlayMeta.textContent = "";
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
      // evita salto de dt grande ao retomar
      this.lastT = performance.now();
    }

    togglePause() {
      if (this.state === "running") this.pause("Pressione P para retomar.");
      else if (this.state === "paused") this.resume();
    }

    handleJumpOrStart() {
      if (this.state === "ready") {
        this.start();
        return;
      }
      if (this.state === "over") {
        this.start();
        return;
      }
      if (this.state === "paused") {
        this.resume();
        return;
      }
      // running
      const jumped = this.player.jump();
      if (jumped && !this.reduceMotion) {
        this.spawnDust(this.player.x + 12, this.groundY - 2, 8);
      }
    }

    spawnDust(x, y, count) {
      const n = this.reduceMotion ? Math.min(2, count) : count;
      for (let i = 0; i < n; i++) {
        this.particles.push(new Particle(
          x + rand(-6, 8),
          y + rand(-2, 2),
          rand(-80, 120),
          rand(-320, -120),
          rand(0.25, 0.5)
        ));
      }
    }

    spawnBoost(x, y) {
      if (this.reduceMotion) return;
      for (let i = 0; i < 14; i++) {
        this.particles.push(new Particle(
          x + rand(-8, 8),
          y + rand(-8, 8),
          rand(-260, 260),
          rand(-520, -140),
          rand(0.25, 0.65)
        ));
      }
    }

    spawnObstacle() {
      // pesos simples (pit menos frequente no início)
      const t = Math.random();
      let type = "cone";
      if (t < 0.38) type = "cone";
      else if (t < 0.62) type = "docs";
      else if (t < 0.82) type = "prefeitura";
      else type = "pit";

      const x = BASE_W + 30;
      const obs = new Obstacle(type, x, this.groundY);

      // evita sequências impossíveis (pit seguido de alto obstáculo muito perto)
      const last = this.obstacles[this.obstacles.length - 1];
      if (last && (last.x - x) < 0) {
        // noop (segurança)
      }

      this.obstacles.push(obs);
    }

    spawnCollectible() {
      const kind = Math.random() < 0.55 ? "key" : "lot";
      const x = BASE_W + 30;
      const y = this.groundY - irand(70, 120);
      this.collectibles.push(new Collectible(kind, x, y));
    }

    gameOver() {
      this.state = "over";
      if (this.score > this.hiScore) {
        this.hiScore = Math.floor(this.score);
        this.uiHiScore.textContent = String(this.hiScore);
        this.saveHiScore(this.hiScore);
      }
      this.setOverlayOver();
    }

    updateHUD() {
      this.uiScore.textContent = String(Math.floor(this.score));
    }

    update(dt) {
      // dt clamp (evita “teleporte” após tab switch)
      dt = clamp(dt, 0, 0.05);

      if (this.state !== "running") {
        // mesmo parado, anima partículas bem leve se quiser (aqui não)
        return;
      }

      // dificuldade progressiva
      const accel = 7.0; // px/s² “virtual”
      this.speed = clamp(this.speed + accel * dt * 60, this.baseSpeed, this.maxSpeed);

      // score (tempo sobrevivido + leve influência da velocidade)
      const scoreRate = 10 * (this.speed / this.baseSpeed);
      this.score += dt * scoreRate;

      // player
      this.player.update(dt, this.gravity);

      // spawns (obstáculos)
      this.spawnObsT += dt;
      const diff = (this.speed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed); // 0..1
      const baseInterval = 1.08 - diff * 0.35; // mais rápido com o tempo
      const jitter = rand(-0.18, 0.18);
      if (this.spawnObsT >= this.spawnObsNext) {
        this.spawnObsT = 0;
        this.spawnObsNext = clamp(baseInterval + jitter, 0.62, 1.25);
        this.spawnObstacle();
      }

      // spawns (coletáveis)
      this.spawnColT += dt;
      if (this.spawnColT >= this.spawnColNext) {
        this.spawnColT = 0;
        this.spawnColNext = clamp(2.2 + rand(-0.5, 0.8) - diff * 0.5, 1.4, 3.2);
        // chance de spawn (não sempre)
        if (Math.random() < 0.75) this.spawnCollectible();
      }

      // move obstacles / collisions
      const pHB = this.player.getHitbox();

      for (const obs of this.obstacles) {
        obs.update(dt, this.speed);

        if (obs.type === "pit") {
          // regra especial: se overlap em X e player no chão => game over
          const xOverlap = (pHB.x < obs.x + obs.w) && (pHB.x + pHB.w > obs.x);
          if (xOverlap && this.player.onGround) {
            this.gameOver();
            return;
          }
        } else {
          const oHB = obs.getHitbox();
          if (aabbIntersect(pHB, oHB)) {
            this.gameOver();
            return;
          }
        }
      }

      // collectibles / collisions
      for (let i = this.collectibles.length - 1; i >= 0; i--) {
        const c = this.collectibles[i];
        c.update(dt, this.speed);
        if (aabbIntersect(pHB, c.getHitbox())) {
          this.collectibles.splice(i, 1);
          this.score += 50;
          this.spawnBoost(pHB.x + pHB.w, pHB.y + 8);
        }
      }

      // remove offscreen
      this.obstacles = this.obstacles.filter(o => !o.isOffscreen());
      this.collectibles = this.collectibles.filter(c => !c.isOffscreen());

      // particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].update(dt);
        if (this.particles[i].dead()) this.particles.splice(i, 1);
      }

      // poeira leve contínua
      if (!this.reduceMotion && this.player.onGround) {
        if (Math.random() < 0.22 * dt * 60) {
          this.spawnDust(this.player.x + 10, this.groundY - 1, 2);
        }
      }

      this.updateHUD();
    }

    drawBackground(ctx) {
      // fundo claro (corporate-fun, sem “pintar tudo” pesado)
      ctx.save();

      // céu suave
      const grd = ctx.createLinearGradient(0, 0, 0, BASE_H);
      grd.addColorStop(0, COLORS.offWhite());
      grd.addColorStop(1, "#ffffff");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, BASE_W, BASE_H);

      // horizonte / “loteamento” minimalista (linhas)
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = COLORS.moss();
      ctx.lineWidth = 2;

      for (let i = 0; i < 6; i++) {
        const y = 70 + i * 20;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(BASE_W, y);
        ctx.stroke();
      }

      // “quadras” verticais discretas
      ctx.globalAlpha = 0.09;
      for (let i = 0; i < 12; i++) {
        const x = i * 75 + (this.roadDashT % 75);
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x, 200);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawGround(ctx) {
      const moss = COLORS.moss();
      const mid = COLORS.midGray();

      ctx.save();

      // estrada / piso
      ctx.fillStyle = "rgba(54,59,44,0.06)";
      ctx.fillRect(0, this.groundY, BASE_W, BASE_H - this.groundY);

      // linha do chão
      ctx.strokeStyle = moss;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      ctx.lineTo(BASE_W, this.groundY);
      ctx.stroke();

      // marcações “lane” (dashes)
      ctx.strokeStyle = mid;
      ctx.lineWidth = 3;
      const dashLen = 18;
      const gap = 22;

      let x = -(this.roadDashT % (dashLen + gap));
      while (x < BASE_W + dashLen) {
        ctx.beginPath();
        ctx.moveTo(x, this.groundY + 24);
        ctx.lineTo(x + dashLen, this.groundY + 24);
        ctx.stroke();
        x += dashLen + gap;
      }

      ctx.restore();
    }

    draw(ctx) {
      // configurar transform para base coordinates
      ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);

      // tick parallax
      if (this.state === "running") {
        this.roadDashT += this.speed * (1 / 60) * 0.8;
      }

      // background
      this.drawBackground(ctx);

      // collectibles atrás dos obstáculos (mais limpo)
      for (const c of this.collectibles) c.draw(ctx);

      // obstáculos
      for (const o of this.obstacles) o.draw(ctx);

      // player
      this.player.draw(ctx);

      // partículas por cima
      for (const p of this.particles) p.draw(ctx);

      // ground
      this.drawGround(ctx);

      // se paused, desenhar etiqueta sutil (overlay já existe)
      if (this.state === "paused") {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = COLORS.moss();
        ctx.fillRect(0, 0, BASE_W, BASE_H);
        ctx.restore();
      }
    }

    loop(t) {
      if (!this.lastT) this.lastT = t;
      const dt = (t - this.lastT) / 1000;
      this.lastT = t;

      this.update(dt);
      this.draw(this.ctx);

      requestAnimationFrame(this.loop);
    }
  }

  // Polyfill: roundRect (Safari antigo pode não ter)
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const radius = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
      this.beginPath();
      this.moveTo(x + radius.tl, y);
      this.lineTo(x + w - radius.tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + radius.tr);
      this.lineTo(x + w, y + h - radius.br);
      this.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h);
      this.lineTo(x + radius.bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - radius.bl);
      this.lineTo(x, y + radius.tl);
      this.quadraticCurveTo(x, y, x + radius.tl, y);
      this.closePath();
      return this;
    };
  }

  // Boot
  const canvas = document.getElementById("gameCanvas");
  const game = new Game(canvas);

  // estado inicial
  game.state = "ready";
})();
