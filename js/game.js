(() => {
  "use strict";

  const BASE_W = 900;
  const BASE_H = 300;
  const HISTORY_KEY = "binc_runner_history_v1";

  class Obstacle {
    constructor(x, groundY) {
      this.x = x;
      this.groundY = groundY;
      this.type = Math.floor(Math.random() * 4);
      const configs = [
        { w: 30, h: 40 }, // Cone
        { w: 50, h: 50 }, // Casa
        { w: 65, h: 35 }, // Carro
        { w: 40, h: 30 }  // Pedra
      ];
      this.w = configs[this.type].w;
      this.h = configs[this.type].h;
      this.y = groundY - this.h;
    }
    update(dt, speed) { this.x -= speed * dt; }
    draw(ctx) {
      ctx.save();
      if (this.type === 0) { // CONE
        ctx.fillStyle = "#FF9D4C";
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2, this.y);
        ctx.lineTo(this.x + this.w, this.y + this.h);
        ctx.lineTo(this.x, this.y + this.h);
        ctx.fill();
      } else if (this.type === 1) { // CASA
        ctx.fillStyle = "#222";
        ctx.fillRect(this.x, this.y + 15, this.w, this.h - 15);
        ctx.fillStyle = "#FF9D4C";
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y + 15);
        ctx.lineTo(this.x + this.w / 2, this.y);
        ctx.lineTo(this.x + this.w + 5, this.y + 15);
        ctx.fill();
      } else if (this.type === 2) { // CARRO
        ctx.fillStyle = "#333";
        ctx.roundRect(this.x, this.y + 10, this.w, this.h - 10, 5);
        ctx.fill();
        ctx.fillStyle = "#111"; // Rodas
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + this.h, 6, 0, Math.PI * 2);
        ctx.arc(this.x + 45, this.y + this.h, 6, 0, Math.PI * 2);
        ctx.fill();
      } else { // PEDRA
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.groundY = 260;
      this.gravity = 2400;
      this.state = "ready";
      this.score = 0;
      this.baseSpeed = 280;
      this.speed = this.baseSpeed;
      this.player = {
        sprite: document.getElementById("playerSpriteSource"),
        x: 80, y: 0, w: 48, h: 48, vy: 0, onGround: true
      };
      this.obstacles = [];
      this.lastT = 0;

      window.addEventListener("keydown", e => { if (e.code === "Space") this.handleAction(); });
      this.canvas.addEventListener("pointerdown", e => { e.preventDefault(); this.handleAction(); });

      this.resize();
      this.loadHistory();
      requestAnimationFrame(t => this.loop(t));
    }

    handleAction() {
      if (this.state === "running") {
        if (this.player.onGround) { this.player.vy = -850; this.player.onGround = false; }
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

    gameOver() {
      this.state = "over";
      document.getElementById("overlay").classList.remove("hidden");
      document.getElementById("overlayText").textContent = "Score: " + Math.floor(this.score) + " - Clique para Reiniciar";
      this.saveToHistory(Math.floor(this.score));
    }

    saveToHistory(score) {
      if (score < 5) return; // Não salva scores irrelevantes
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const now = new Date();
      const entry = {
        score: score,
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      history.unshift(entry);
      const limitedHistory = history.slice(0, 5); // Mantém apenas os últimos 5
      localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));
      this.loadHistory();
    }

    loadHistory() {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const list = document.getElementById("historyList");
      if (history.length === 0) return;

      list.innerHTML = history.map(item => `
        <li class="history-item">
          <span class="score-tag">${item.score} pts</span>
          <span class="date-tag">${item.date} às ${item.time}</span>
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

      if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length - 1].x < BASE_W - 350) {
        if (Math.random() < 0.02) this.obstacles.push(new Obstacle(BASE_W, this.groundY));
      }

      for (let obs of this.obstacles) {
        obs.update(dt, this.speed);
        if (this.checkCollision(this.player, obs)) this.gameOver();
      }
      this.obstacles = this.obstacles.filter(o => o.x > -100);
    }

    checkCollision(p, o) {
      const pBox = { x: p.x + 8, y: p.y + 8, w: p.w - 16, h: p.h - 12 };
      return pBox.x < o.x + o.w && pBox.x + pBox.w > o.x && pBox.y < o.y + o.h && pBox.y + pBox.h > o.y;
    }

    draw() {
      this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(0, 0, BASE_W, BASE_H);

      // Linha do chão
      this.ctx.strokeStyle = "rgba(255,157,76,0.3)";
      this.ctx.lineWidth = 3;
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

  window.addEventListener('load', () => new Game(document.getElementById("gameCanvas")));
})();