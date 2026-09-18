/**
 * Interactive dot-grid overlay: a faint grid that lights up and warps
 * toward the cursor within a radius, matching the reference site's hero effect.
 */
(function () {
  function parseColor(str) {
    const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return { r: 255, g: 255, b: 255 };
  }

  function InteractiveGrid(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.gridColor = parseColor(opts.gridColor || "rgb(255,255,255)");
    this.dotColor = parseColor(opts.dotColor || "rgb(255,255,255)");
    this.hoverColor = parseColor(opts.hoverColor || "rgb(0,115,255)");
    this.gridSize = opts.gridSize || 60;
    this.repulsionStrength = opts.repulsionStrength ?? -0.65;
    this.radius = opts.radius || 350;
    this.dotSize = opts.dotSize || 1.5;
    this.gridThickness = opts.gridThickness || 0.5;
    this.baseOpacity = opts.baseOpacity ?? 0.09;
    this.motionSpeed = opts.motionSpeed ?? 0.5;

    this.points = new Map();
    this.mouse = null;
    this.rafId = null;

    this._tick = this._tick.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onResize = this._onResize.bind(this);

    this.resize();

    window.addEventListener("mousemove", this._onMouseMove, { passive: true });
    document.addEventListener("mouseleave", this._onLeave);
    window.addEventListener("resize", this._onResize);

    this.rafId = requestAnimationFrame(this._tick);
  }

  InteractiveGrid.prototype.resize = function () {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this._buildGrid();
  };

  InteractiveGrid.prototype._buildGrid = function () {
    this.points.clear();
    const g = this.gridSize;
    for (let x = -g; x < this.width + g * 2; x += g) {
      for (let y = -g; y < this.height + g * 2; y += g) {
        this.points.set(x + "," + y, { x, y, vx: 0, vy: 0, size: this.dotSize, targetSize: this.dotSize });
      }
    }
  };

  InteractiveGrid.prototype._onResize = function () {
    this.resize();
  };

  InteractiveGrid.prototype._onMouseMove = function (e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      this.mouse = { x, y };
    } else {
      this.mouse = null;
    }
  };

  InteractiveGrid.prototype._onLeave = function () {
    this.mouse = null;
  };

  InteractiveGrid.prototype._influence = function (px, py) {
    if (!this.mouse) return 0;
    const dx = px - this.mouse.x;
    const dy = py - this.mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius) return 0;
    return Math.pow(1 - dist / this.radius, 3.5);
  };

  InteractiveGrid.prototype._forceMagnitude = function () {
    const r = this.repulsionStrength;
    return r <= 0 ? r * 25 : r * 90;
  };

  InteractiveGrid.prototype._displacement = function (px, py) {
    if (!this.mouse) return { x: 0, y: 0 };
    const mag = this._forceMagnitude();
    if (mag === 0) return { x: 0, y: 0 };
    const dx = px - this.mouse.x;
    const dy = py - this.mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: 0, y: 0 };
    const c = Math.pow(1 - Math.min(dist / 400, 1), 2) * mag;
    return { x: (dx / dist) * c, y: (dy / dist) * c };
  };

  InteractiveGrid.prototype._lerpColor = function (a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  };

  InteractiveGrid.prototype._strokeLine = function (p1, p2, t) {
    const ctx = this.ctx;
    const c = this._lerpColor(this.gridColor, this.hoverColor, t);
    const alpha = this.baseOpacity + (1 - this.baseOpacity) * t;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineWidth = this.gridThickness + t * 2;
    ctx.strokeStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + alpha + ")";
    ctx.stroke();
  };

  InteractiveGrid.prototype.draw = function () {
    const ctx = this.ctx;
    const g = this.gridSize;
    ctx.clearRect(0, 0, this.width, this.height);

    this.points.forEach((p, key) => {
      const [ox, oy] = key.split(",").map(Number);
      const right = this.points.get(ox + g + "," + oy);
      const down = this.points.get(ox + "," + (oy + g));
      const infl = this._influence(p.x, p.y);
      if (right) this._strokeLine(p, right, (infl + this._influence(right.x, right.y)) / 2);
      if (down) this._strokeLine(p, down, (infl + this._influence(down.x, down.y)) / 2);
    });

    const speed = Math.max(0, Math.min(1, this.motionSpeed));
    const springStiffness = 0.02 + speed * 0.06;
    const damping = 0.7 + speed * 0.05;

    this.points.forEach((p, key) => {
      const [ox, oy] = key.split(",").map(Number);
      const disp = this._displacement(ox, oy);
      const targetX = ox + disp.x;
      const targetY = oy + disp.y;

      p.vx = (p.vx + (targetX - p.x) * springStiffness) * damping;
      p.vy = (p.vy + (targetY - p.y) * springStiffness) * damping;
      p.x += p.vx;
      p.y += p.vy;

      const infl = this._influence(p.x, p.y);
      p.targetSize = this.dotSize + infl * this.dotSize;
      p.size += (p.targetSize - p.size) * 0.15;

      const c = this._lerpColor(this.dotColor, this.hoverColor, infl);
      const alpha = this.baseOpacity + (1 - this.baseOpacity) * infl;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(this.dotSize * 0.5, p.size), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + alpha + ")";
      ctx.fill();
    });
  };

  InteractiveGrid.prototype._tick = function () {
    this.draw();
    this.rafId = requestAnimationFrame(this._tick);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector(".hero__grid");
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    new InteractiveGrid(canvas, {
      gridColor: "rgb(255,255,255)",
      dotColor: "rgb(255,255,255)",
      hoverColor: "rgb(0,115,255)",
      gridSize: 60,
      repulsionStrength: -0.65,
      radius: 350,
      dotSize: 1.5,
      gridThickness: 0.5,
      baseOpacity: 0.09,
      motionSpeed: 0.5,
    });
  });
})();
