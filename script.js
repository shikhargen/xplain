const state = {
  favorite: 42,
  reply: 18,
  repost: 24,
  dwell: 55,
  follow: 11,
  negative: 8,
  repeat: 1,
  oon: 82,
};

const weights = {
  favorite: 1.0,
  reply: 0.5,
  repost: 0.3,
  dwell: 0.2,
  follow: 0.35,
  negative: -1.1,
};

const heroCanvas = document.getElementById("heroCanvas");
const heroCtx = heroCanvas.getContext("2d");
const pipelineCanvas = document.getElementById("pipelineCanvas");
const pipelineCtx = pipelineCanvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const scoreBars = document.getElementById("scoreBars");
const controls = document.getElementById("scoreControls");
const steps = [...document.querySelectorAll("#steps li")];
const stageNodes = [...document.querySelectorAll(".stage-node")];
const replayButton = document.getElementById("replayPipeline");

let heroParticles = [];
let pipelineParticles = [];
let retrievalPlot = null;
let activeStage = 0;
let stageStartedAt = performance.now();

function resizeCanvas(canvas, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seedHero() {
  resizeCanvas(heroCanvas, heroCtx);
  const { width, height } = heroCanvas.getBoundingClientRect();
  heroParticles = Array.from({ length: 72 }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 1.4 + Math.random() * 3.8,
    vx: -0.18 + Math.random() * 0.36,
    vy: -0.12 + Math.random() * 0.24,
    hue: i % 4,
  }));
}

function seedPipeline() {
  resizeCanvas(pipelineCanvas, pipelineCtx);
  const { width, height } = pipelineCanvas.getBoundingClientRect();
  pipelineParticles = Array.from({ length: 36 }, (_, i) => ({
    lane: i % 7,
    offset: Math.random(),
    drift: Math.random() * 0.8,
    size: 3 + Math.random() * 5,
    keep: Math.random() > 0.26,
    score: 0.4 + Math.random() * 0.55,
    color: ["#4db7d9", "#f4b860", "#5bd69a", "#6574ff"][i % 4],
  }));
}

function drawHero() {
  const rect = heroCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  heroCtx.clearRect(0, 0, w, h);

  const palette = ["#4db7d9", "#f4b860", "#5bd69a", "#ff5a61"];
  heroParticles.forEach((p, idx) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -20) p.x = w + 20;
    if (p.x > w + 20) p.x = -20;
    if (p.y < -20) p.y = h + 20;
    if (p.y > h + 20) p.y = -20;

    heroCtx.beginPath();
    heroCtx.fillStyle = palette[p.hue];
    heroCtx.globalAlpha = 0.45;
    heroCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    heroCtx.fill();

    for (let j = idx + 1; j < heroParticles.length; j += 1) {
      const q = heroParticles[j];
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        heroCtx.beginPath();
        heroCtx.strokeStyle = palette[p.hue];
        heroCtx.globalAlpha = (1 - dist / 120) * 0.12;
        heroCtx.lineWidth = 1;
        heroCtx.moveTo(p.x, p.y);
        heroCtx.lineTo(q.x, q.y);
        heroCtx.stroke();
      }
    }
  });
  heroCtx.globalAlpha = 1;
}

function getStagePositions(width, height) {
  const top = height * 0.16;
  const bottom = height * 0.82;
  return Array.from({ length: 7 }, (_, i) => {
    const x = width * (0.11 + i * 0.13);
    const y = i % 2 === 0 ? top : bottom;
    return { x, y };
  });
}

function drawPipeline(time) {
  const rect = pipelineCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  pipelineCtx.clearRect(0, 0, w, h);

  const nodes = getStagePositions(w, h);
  pipelineCtx.lineWidth = 2;
  for (let i = 0; i < nodes.length - 1; i += 1) {
    pipelineCtx.beginPath();
    pipelineCtx.strokeStyle = "rgba(255,255,255,0.18)";
    pipelineCtx.moveTo(nodes[i].x, nodes[i].y);
    pipelineCtx.bezierCurveTo(
      nodes[i].x + w * 0.08,
      nodes[i].y,
      nodes[i + 1].x - w * 0.08,
      nodes[i + 1].y,
      nodes[i + 1].x,
      nodes[i + 1].y
    );
    pipelineCtx.stroke();
  }

  nodes.forEach((node, i) => {
    const active = i === activeStage;
    pipelineCtx.beginPath();
    pipelineCtx.fillStyle = active ? "rgba(91,214,154,0.22)" : "rgba(255,255,255,0.08)";
    pipelineCtx.strokeStyle = active ? "#5bd69a" : "rgba(255,255,255,0.18)";
    pipelineCtx.lineWidth = active ? 2 : 1;
    pipelineCtx.roundRect(node.x - 44, node.y - 26, 88, 52, 8);
    pipelineCtx.fill();
    pipelineCtx.stroke();
    pipelineCtx.fillStyle = active ? "#f5f1e8" : "#a8b0b8";
    pipelineCtx.font = "700 11px Inter, system-ui, sans-serif";
    pipelineCtx.textAlign = "center";
    pipelineCtx.fillText(["History", "Sources", "Hydrate", "Filter", "Predict", "Rank", "Feed"][i], node.x, node.y + 4);
  });

  pipelineParticles.forEach((p) => {
    const lane = Math.min(p.lane, nodes.length - 2);
    p.offset += 0.0025 + p.score * 0.002;
    if (p.offset > 1) {
      p.offset = 0;
      p.lane = (p.lane + 1) % 6;
      p.keep = Math.random() > (p.lane === 3 ? 0.42 : 0.16);
    }

    const a = nodes[lane];
    const b = nodes[lane + 1];
    const t = p.offset;
    const ease = t * t * (3 - 2 * t);
    const x = a.x + (b.x - a.x) * ease;
    const y = a.y + (b.y - a.y) * ease + Math.sin(time / 450 + p.drift) * 8;
    const fade = p.keep ? 0.85 : Math.max(0.18, 1 - t * 1.4);

    pipelineCtx.beginPath();
    pipelineCtx.globalAlpha = fade;
    pipelineCtx.fillStyle = p.keep ? p.color : "#ff5a61";
    pipelineCtx.arc(x, y, p.size, 0, Math.PI * 2);
    pipelineCtx.fill();
    pipelineCtx.globalAlpha = 1;
  });
}

function setActiveStage(next) {
  activeStage = next;
  stageNodes.forEach((node, i) => node.classList.toggle("active", i === activeStage));
  steps.forEach((step, i) => step.classList.toggle("active", i === activeStage));
}

function tick(time) {
  drawHero();
  if (time - stageStartedAt > 2100) {
    setActiveStage((activeStage + 1) % 7);
    stageStartedAt = time;
  }
  drawPipeline(time);
  drawRetrievalPlot(time);
  requestAnimationFrame(tick);
}

function scoreState() {
  const normalized = Object.fromEntries(
    Object.entries(state).map(([key, value]) => [key, value / 100])
  );
  const positive =
    normalized.favorite * weights.favorite +
    normalized.reply * weights.reply +
    normalized.repost * weights.repost +
    normalized.dwell * weights.dwell +
    normalized.follow * weights.follow;
  const negative = normalized.negative * Math.abs(weights.negative);
  const raw = positive - negative;
  const repeat = state.repeat;
  const decay = 0.72;
  const floor = 0.36;
  const diversity = (1 - floor) * decay ** repeat + floor;
  const oonFactor = state.oon / 100;
  const final = Math.max(0, raw * diversity * oonFactor);
  return { positive, negative, raw, diversity, oonFactor, final };
}

function makeBar(label, value, negative = false) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return `
    <div class="bar-row">
      <span>${label}</span>
      <span class="bar-track"><span class="bar-fill ${negative ? "negative" : ""}" style="width:${pct}%"></span></span>
      <strong>${value.toFixed(2)}</strong>
    </div>
  `;
}

function updateScore() {
  const s = scoreState();
  scoreValue.textContent = s.final.toFixed(3);
  scoreBars.innerHTML = [
    makeBar("Positive", s.positive),
    makeBar("Negative", s.negative, true),
    makeBar("Raw", Math.max(0, s.raw)),
    makeBar("Diversity", s.diversity),
    makeBar("OON factor", s.oonFactor),
  ].join("");

  document.getElementById("heroRetrieval").textContent = (0.64 + state.dwell / 500).toFixed(2);
  document.getElementById("heroPositive").textContent = s.positive.toFixed(2);
  document.getElementById("heroRisk").textContent = s.negative.toFixed(2);
  document.getElementById("heroFinal").textContent = s.final.toFixed(2);
}

function initControls() {
  controls.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    state[input.dataset.key] = Number(input.value);
    updateScore();
  });
}

function initPlot() {
  const plot = document.getElementById("retrievalPlot");
  const candidates = [
    [14, 28],
    [20, 74],
    [28, 24],
    [35, 68],
    [39, 52],
    [47, 78],
    [61, 36],
    [64, 18],
    [73, 62],
    [81, 28],
    [84, 74],
    [24, 46],
    [18, 55],
    [44, 18],
    [68, 80],
    [55, 65],
    [32, 42],
    [76, 45],
    [57, 24],
    [49, 39],
  ];
  const queries = [
    { x: 48, y: 46, radius: 10, speed: 0.00068, phase: 0 },
    { x: 66, y: 57, radius: 8, speed: 0.00056, phase: 2.2 },
    { x: 42, y: 30, radius: 7, speed: 0.00062, phase: 4.1 },
  ];

  plot.innerHTML = `
    <svg class="plot-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
    ${candidates.map(() => '<span class="plot-dot candidate"></span>').join("")}
    ${queries.map(() => '<span class="plot-dot query"></span>').join("")}
  `;

  retrievalPlot = {
    candidates: candidates.map(([x, y]) => ({ x, y })),
    queries,
    candidateNodes: [...plot.querySelectorAll(".plot-dot.candidate")],
    queryNodes: [...plot.querySelectorAll(".plot-dot.query")],
    edges: plot.querySelector(".plot-edges"),
  };

  retrievalPlot.candidates.forEach((point, i) => {
    retrievalPlot.candidateNodes[i].style.left = `${point.x}%`;
    retrievalPlot.candidateNodes[i].style.top = `${point.y}%`;
  });
  drawRetrievalPlot(performance.now());
}

function queryPosition(query, time) {
  const angle = time * query.speed + query.phase;
  return {
    x: query.x + Math.cos(angle) * query.radius + Math.sin(angle * 0.7) * 3,
    y: query.y + Math.sin(angle) * query.radius * 0.72 + Math.cos(angle * 0.8) * 2,
  };
}

function drawRetrievalPlot(time) {
  if (!retrievalPlot) return;

  const lines = [];
  retrievalPlot.queries.forEach((query, queryIndex) => {
    const point = queryPosition(query, time);
    const x = Math.max(8, Math.min(92, point.x));
    const y = Math.max(10, Math.min(90, point.y));

    retrievalPlot.queryNodes[queryIndex].style.left = `${x}%`;
    retrievalPlot.queryNodes[queryIndex].style.top = `${y}%`;

    retrievalPlot.candidates
      .map((candidate) => ({
        candidate,
        distance: (candidate.x - x) ** 2 + (candidate.y - y) ** 2,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4)
      .forEach(({ candidate }) => {
        lines.push(
          `<line x1="${x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${candidate.x}" y2="${candidate.y}" />`
        );
      });
  });

  retrievalPlot.edges.innerHTML = lines.join("");
}

window.addEventListener("resize", () => {
  seedHero();
  seedPipeline();
});

replayButton.addEventListener("click", () => {
  setActiveStage(0);
  stageStartedAt = performance.now();
  seedPipeline();
});

CanvasRenderingContext2D.prototype.roundRect ||= function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  this.moveTo(x + r, y);
  this.arcTo(x + width, y, x + width, y + height, r);
  this.arcTo(x + width, y + height, x, y + height, r);
  this.arcTo(x, y + height, x, y, r);
  this.arcTo(x, y, x + width, y, r);
  this.closePath();
};

seedHero();
seedPipeline();
setActiveStage(0);
initControls();
initPlot();
updateScore();
requestAnimationFrame(tick);
