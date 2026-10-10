const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("bestScore");
const speedEl = document.getElementById("speedLabel");
const overlay = document.getElementById("overlay");
const titleEl = document.getElementById("overlayTitle");
const eyebrowEl = document.getElementById("overlayEyebrow");
const messageEl = document.getElementById("overlayMessage");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");

const W = canvas.width;
const H = canvas.height;
const groundY = 350;

let state = "ready";
let score = 0;
let best = 0;
let frame = 0;
let speed = 5;
let obstacles = [];
let lastTime = 0;
let spawnTimer = 0;

const keys = { left: false, right: false };

const player = {
  x: 180,
  y: groundY - 60,
  w: 48,
  h: 60,
  vy: 0,
  jumping: false,
  moveSpeed: 5
};

function showOverlay(eyebrow, title, message, buttonText) {
  eyebrowEl.textContent = eyebrow;
  titleEl.textContent = title;
  messageEl.textContent = message;
  startBtn.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function resetGame() {
  score = 0;
  frame = 0;
  speed = 5;
  spawnTimer = 0;
  obstacles = [];

  player.x = 180;
  player.y = groundY - player.h;
  player.vy = 0;
  player.jumping = false;

  scoreEl.textContent = "0";
  speedEl.textContent = "1.0x";
}

function startGame() {
  if (state === "ready" || state === "over") {
    resetGame();
  }

  state = "playing";
  pauseBtn.disabled = false;
  pauseBtn.textContent = "Ⅱ PAUSE";
  hideOverlay();
}

function pauseGame() {
  if (state === "playing") {
    state = "paused";
    pauseBtn.textContent = "▶ RESUME";
    showOverlay(
      "TAKE A BREATHER",
      "Game paused.",
      "Your progress is safe. Ready to ride again?",
      "RESUME SKATING"
    );
  } else if (state === "paused") {
    startGame();
  }
}

function gameOver() {
  state = "over";
  best = Math.max(best, Math.floor(score));
  bestEl.textContent = best;
  pauseBtn.disabled = true;

  showOverlay(
    "RIDE COMPLETE",
    "Wipeout!",
    `You scored ${Math.floor(score)} points. Try to beat your best!`,
    "PLAY AGAIN ↻"
  );
}

function jump() {
  if (state !== "playing" || player.jumping) return;

  player.vy = -13;
  player.jumping = true;
}

function addObstacle() {
  const tall = Math.random() > 0.45;

  obstacles.push({
    x: W + 20,
    y: groundY - (tall ? 48 : 30),
    w: tall ? 32 : 44,
    h: tall ? 48 : 30,
    color: tall ? "#ff765b" : "#e7ae55"
  });
}

function update(dt) {
  if (state !== "playing") return;

  frame += dt;
  score += dt * 10;
  speed = 5 + Math.min(score / 100, 6);

  if (keys.left) player.x -= player.moveSpeed * dt;
  if (keys.right) player.x += player.moveSpeed * dt;

  player.x = Math.max(20, Math.min(W - player.w - 20, player.x));

  // Gravity and jumping
  player.vy += 0.65 * dt;
  player.y += player.vy * dt;

  if (player.y >= groundY - player.h) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.jumping = false;
  }

  // Spawn barriers at intervals
  spawnTimer += dt;

  if (spawnTimer > 85 + Math.random() * 35) {
    addObstacle();
    spawnTimer = 0;
  }

  // Move obstacles and detect collisions
  for (const obstacle of obstacles) {
    obstacle.x -= speed * dt;

    const padding = 7;

    const hit =
      player.x + padding < obstacle.x + obstacle.w &&
      player.x + player.w - padding > obstacle.x &&
      player.y + padding < obstacle.y + obstacle.h &&
      player.y + player.h > obstacle.y;

    if (hit) {
      gameOver();
      break;
    }
  }

  obstacles = obstacles.filter(o => o.x + o.w > -10);

  scoreEl.textContent = Math.floor(score);
  speedEl.textContent = (speed / 5).toFixed(1) + "x";
}

function drawBackground() {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#242d40");
  sky.addColorStop(1, "#80543f");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Moon
  ctx.fillStyle = "#ffdb9a";
  ctx.beginPath();
  ctx.arc(740, 75, 27, 0, Math.PI * 2);
  ctx.fill();

  // Distant city buildings
  for (let i = 0; i < 13; i++) {
    const x = i * 78;
    const height = 75 + ((i * 37) % 105);

    ctx.fillStyle = i % 2 ? "#303445" : "#272c3b";
    ctx.fillRect(x, groundY - height, 58, height);

    ctx.fillStyle = "#f7bd70";

    for (let wy = groundY - height + 15; wy < groundY - 10; wy += 22) {
      for (let wx = x + 10; wx < x + 50; wx += 18) {
        ctx.globalAlpha = ((wx + wy) % 3 === 0) ? 0.25 : 0.8;
        ctx.fillRect(wx, wy, 5, 8);
      }
    }
  }

  ctx.globalAlpha = 1;

  // Road
  ctx.fillStyle = "#252528";
  ctx.fillRect(0, groundY, W, H - groundY);

  ctx.fillStyle = "#494346";
  ctx.fillRect(0, groundY, W, 5);

  // Moving road markings
  ctx.fillStyle = "#a5a0a0";

  for (let i = 0; i < 9; i++) {
    const x = ((i * 130 - frame * speed) % (W + 130) + W + 130)
      % (W + 130);

    ctx.fillRect(x, groundY + 43, 55, 4);
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;

  ctx.save();

  // Shadow
  ctx.fillStyle = "#11111165";
  ctx.beginPath();
  ctx.ellipse(x + 24, groundY + 2, 28, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Skateboard
  ctx.fillStyle = "#ff9b42";
  ctx.fillRect(x - 2, y + player.h - 3, 52, 7);

  ctx.fillStyle = "#171717";
  ctx.beginPath();
  ctx.arc(x + 8, y + player.h + 5, 5, 0, Math.PI * 2);
  ctx.arc(x + 40, y + player.h + 5, 5, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = "#ded4c7";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(x + 20, y + 39);
  ctx.lineTo(x + 15, y + 54);
  ctx.moveTo(x + 29, y + 39);
  ctx.lineTo(x + 38, y + 53);
  ctx.stroke();

  // Body
  ctx.fillStyle = "#f08a39";
  ctx.fillRect(x + 12, y + 17, 27, 25);

  // Head
  ctx.fillStyle = "#bd825f";
  ctx.beginPath();
  ctx.arc(x + 27, y + 10, 12, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = "#22252f";
  ctx.beginPath();
  ctx.arc(x + 27, y + 8, 12, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 27, y + 7, 12, 4);

  // Arms
  ctx.strokeStyle = "#bd825f";
  ctx.lineWidth = 6;

  ctx.beginPath();
  ctx.moveTo(x + 15, y + 23);
  ctx.lineTo(x + 4, y + 32);
  ctx.moveTo(x + 37, y + 23);
  ctx.lineTo(x + 47, y + 17);
  ctx.stroke();

  ctx.restore();
}

function drawObstacles() {
  for (const o of obstacles) {
    ctx.fillStyle = o.color;
    ctx.fillRect(o.x, o.y, o.w, o.h);

    ctx.fillStyle = "#ffffff45";
    ctx.fillRect(o.x + 4, o.y + 4, 5, o.h - 8);

    ctx.fillStyle = "#171719";
    ctx.fillRect(o.x, o.y + o.h - 5, o.w, 5);
  }
}

function draw() {
  drawBackground();
  drawObstacles();
  drawPlayer();
}

function loop(time) {
  // Limit unusually large time steps after switching tabs.
  const dt = lastTime
    ? Math.min((time - lastTime) / 16.67, 2)
    : 1;

  lastTime = time;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// Keyboard controls
document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", "arrowup", " "].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowleft" || key === "a") keys.left = true;
  if (key === "arrowright" || key === "d") keys.right = true;

  if (
    key === "arrowup" ||
    key === "w" ||
    key === " "
  ) {
    if (!event.repeat) jump();
  }

  if (key === "escape" || key === "p") {
    if (state === "playing" || state === "paused") {
      pauseGame();
    }
  }

  if (key === "enter" && state !== "playing") {
    startGame();
  }
});

document.addEventListener("keyup", event => {
  const key = event.key.toLowerCase();

  if (key === "arrowleft" || key === "a") keys.left = false;
  if (key === "arrowright" || key === "d") keys.right = false;
});

window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;

  if (state === "playing") pauseGame();
});

// Mobile and on-screen controls
function bindHold(buttonId, direction) {
  const button = document.getElementById(buttonId);

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    keys[direction] = true;
  });

  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, () => {
      keys[direction] = false;
    });
  }
}

bindHold("leftBtn", "left");
bindHold("rightBtn", "right");

document.getElementById("jumpBtn").addEventListener("pointerdown", event => {
  event.preventDefault();
  jump();
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);

// Initial screen
bestEl.textContent = best;
draw();
requestAnimationFrame(loop);
