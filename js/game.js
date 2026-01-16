(() => {
  "use strict";

  const BASE_W = 900;
  const BASE_H = 300;
  const HISTORY_KEY = "binc_runner_history_v2";

  // Configuração dos obstáculos reais baseados nos seus PNGs
  const OBS_CONFIGS = [
    { id: 'obs_caminhao', w: 80, h: 50 },
    { id: 'obs_carrinho', w: 40, h: 35 },
    { id: 'obs_casa1', w: 60, h: 60 },
    { id: 'obs_casa2', w: 65, h: 60 },
    { id: 'obs_escavadora', w: 85, h: 55 },
    { id: 'obs_misturador', w: 75, h: 55 },
    { id: 'obs_transporte', w: 90, h: 45 }
  ];

  class Obstacle {
    constructor(x, groundY) {
      const config = OBS_CONFIGS[Math.floor(Math.random() * OBS_CONFIGS.length)];
      this.img = document.getElementById(config.id);
      this.x = x;
      this.w = config.w;
      this.h = config.h;
      this.y = groundY - this.h;
    }
    update(dt, speed) { this.x -= speed * dt; }
    draw(ctx) { ctx.drawImage(this.img, this.x, this.y, this.w, this.h); }
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.groundY = 260;
      this.gravity = 2400;
      this.state = "ready";
      this.score = 0;
      this.baseSpeed = 280; // 20% mais lento
      this.speed = this.baseSpeed;
      
      this.player = {
        sprite: document.getElementById("playerIcon"),
        x: 80, y: 0, w: 48, h: 48, vy: 0, onGround: true
      };
      
      this.obstacles = [];
      this.lastT = 0;

      // Eventos de Pulo (Mobile e Desktop)
      const action = (e) => { e.preventDefault(); this.handleInput(); };
      const zone = document.getElementById("gameZone");
      zone.addEventListener("touchstart", action, { passive: false });
      zone.addEventListener("mousedown", action);
      window.addEventListener("keydown", e => { if(e.code === "Space") this.handleInput(); });

      this.resize();
      this.loadHistory();
      window.addEventListener("resize", () => this.resize());
      requestAnimationFrame(t => this.loop(t));
    }

    handleInput() {
      if (this.state === "running") {
        if (this.player.onGround) { this.player.vy = -880; this.player.onGround = false; }
      } else { this.start(); }
    }

    start() {
      this.state = "running";
      this.score = 0; this.speed = this.baseSpeed;
      this.obstacles = [];
      this.player.y = this.groundY - this.player.h;
      this.player.vy = 0;
      document.getElementById("overlay").classList.add("hidden");
    }

    saveScore() {
      if (this.score < 10) return;
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const now = new Date();
      history.unshift({
        score: Math.floor(this.score),
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
      this.loadHistory();
    }

    loadHistory() {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const list = document.getElementById("historyList");
      if (history.length === 0) return;
      list.innerHTML = history.map(h => `
        <li class="history-item">
          <span class="score-tag">${h.score} pts</span>
          <span class="time-tag">${h.date} às ${h.time}</span>
        </li>
      `).join('');
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.scale = this.canvas.width / BASE_W;
    }

    update(dt) {
      this.speed += 4 * dt;
      this.score += dt * 10;
      document.getElementById("uiScore").textContent = Math.floor(this.score);
      this.player.vy += this.gravity * dt;
      this.player.y += this.player.vy * dt;

      if (this.player.y >= this.groundY - this.player.h) {
        this.player.y = this.groundY - this.player.h;
        this.player.vy = 0;
        this.player.onGround = true;
      }

      if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length-1].x < BASE_W - 350) {
        if (Math.random() < 0.015) this.obstacles.push(new Obstacle(BASE_W, this.groundY));
      }

      for (let obs of this.obstacles) {
        obs.update(dt, this.speed);
        // Hitbox ajustada para os PNGs
        if (this.player.x + 10 < obs.x + obs.w - 10 && this.player.x + this.player.w - 10 > obs.x + 10 &&
            this.player.y + 10 < obs.y + obs.h - 5 && this.player.y + this.player.h - 5 > obs.y + 10) {
          this.state = "over";
          this.saveScore();
          document.getElementById("overlay").classList.remove("hidden");
          document.getElementById("overlayText").textContent = "Score: " + Math.floor(this.score) + " - Toque para Reiniciar";
        }
      }
      this.obstacles = this.obstacles.filter(o => o.x > -150);
    }

    draw() {
      this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(0, 0, BASE_W, BASE_H);
      this.ctx.strokeStyle = "rgba(255,157,76,0.3)";
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.groundY); this.ctx.lineTo(BASE_W, this.groundY);
      this.ctx.stroke();
      for (let obs of this.obstacles) obs.draw(this.ctx);
      this.ctx.drawImage(this.player.sprite, this.player.x, this.player.y, this.player.w, this.player.h);
    }

    loop(t) {
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      if (dt > 0.1) dt = 0;
      if (this.state === "running") this.update(dt);
      this.draw();
      requestAnimationFrame(t => this.loop(t));
    }
  }

  window.onload = () => new Game(document.getElementById("gameCanvas"));
})();