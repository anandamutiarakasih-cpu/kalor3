/**
 * THERMO CHAMPIONS: HEAT EDITION
 * Thermal Energy Canvas Particles & Ambient Effects
 */

class ParticleService {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.isRunning = false;
    this.maxParticles = 55;
  }

  init(canvasElement) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });

    this.createParticles();
    this.start();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    const colors = [
      'rgba(249, 115, 22, ',  // Flame Orange #F97316
      'rgba(250, 204, 21, ',  // Heat Yellow #FACC15
      'rgba(56, 189, 248, ',  // Ion Sky Blue #38BDF8
      'rgba(239, 68, 68, '    // Deep Thermal Red #EF4444
    ];

    for (let i = 0; i < this.maxParticles; i++) {
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: Math.random() * (this.canvas ? this.canvas.width : 1000),
        y: Math.random() * (this.canvas ? this.canvas.height : 1000),
        radius: Math.random() * 2.8 + 1,
        colorBase,
        alpha: Math.random() * 0.6 + 0.2,
        speedY: -(Math.random() * 1.2 + 0.3), // Convection upwards
        speedX: (Math.random() - 0.5) * 0.6,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulseDir: 1
      });
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  loop() {
    if (!this.isRunning || !this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update positions (convection drift)
      p.y += p.speedY;
      p.x += p.speedX;

      // Pulse alpha
      p.alpha += p.pulseSpeed * p.pulseDir;
      if (p.alpha >= 0.8) {
        p.pulseDir = -1;
      } else if (p.alpha <= 0.15) {
        p.pulseDir = 1;
      }

      // Reset to bottom if drifted off top
      if (p.y < -10) {
        p.y = this.canvas.height + 10;
        p.x = Math.random() * this.canvas.width;
      }
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;

      // Draw particle with thermal glow
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `${p.colorBase}${p.alpha.toFixed(2)})`;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = `${p.colorBase}0.8)`;
      this.ctx.fill();
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  burst(x, y, count = 25) {
    if (!this.ctx || !this.canvas) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x: x || this.canvas.width / 2,
        y: y || this.canvas.height / 2,
        radius: Math.random() * 3 + 2,
        colorBase: 'rgba(250, 204, 21, ',
        alpha: 1,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        pulseSpeed: 0.05,
        pulseDir: -1
      });
    }
  }
}

export const particleService = new ParticleService();
