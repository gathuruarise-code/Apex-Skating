 (() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const statusEl = document.getElementById("status");
  const startOverlay = document.getElementById("startOverlay");
  const endOverlay = document.getElementById("endOverlay");
  const finalScoreEl = document.getElementById("finalScore");

  const W = canvas.width, H = canvas.height;
  const groundY = 438;
  const keys = new Set();
  let running = false, gameOver = false, lastTime = 0;
  let score = 0, distance = 0, speed = 5, obstacleTimer = 0, trickText = "", trickTimer = 0;
  let best = Number(localStorage.getItem("skateRushBest") || 0);
  bestEl.textContent = formatScore(best);

  const player = {
    x: 170, y: groundY - 66, w: 42, h: 66, vy: 0,
    grounded: true, lean: 0, trick: "", trickAngle: 0, trickValue: 0, trickHold: 0
  };
  let obstacles = [];
  let particles = [];

  function formatScore(n) { return String(Math.floor(n)).padStart(6, "0"); }
  function resetGame() {
    score = 0; distance = 0; speed = 5; obstacleTimer = 70;
    obstacles = []; particles = [];
    Object.assign(player, { x: 170, y: groundY - 66, vy: 0, grounded: true, lean: 0, trick: "", trickAngle: 0, trickValue: 0, trickHold: 0 });
    scoreEl.textContent = formatScore(score);
    statusEl.textContent = "LAND TRICKS TO SCORE";
    gameOver = false; running = true; lastTime = 0;
    startOverlay.classList.add("hidden"); endOverlay.classList.add("hidden");
    requestAnimationFrame(loop);
  }
  function endGame() {
    running = false; gameOver = true;
    best = Math.max(best, score);
    localStorage.setItem("skateRushBest", String(best));
    bestEl.textContent = formatScore(best);
    finalScoreEl.textContent = score.toLocaleString();
    document.getElementById("endTitle").textContent = score > best / 2 ? "Sick run!" : "Keep practicing!";
    endOverlay.classList.remove("hidden");
    statusEl.textContent = "RUN OVER — TRY AGAIN";
  }
  function jump() {
    if (!running || !player.grounded) return;
    player.vy = -15.5; player.grounded = false;
    burst(player.x + 18, groundY - 3, 8, "#d7e5ef");
  }
  function doTrick(type) {
    if (!running || player.grounded || player.trick) return;
    player.trick = type; player.trickAngle = 0; player.trickHold = 0;
    player.trickValue = type === "KICKFLIP" ? 120 : 180;
    trickText = type + "!"; trickTimer = 45;
  }
  function burst(x, y, amount, color) {
    for (let i = 0; i < amount; i++) particles.push({ x, y, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, life: 25 + Math.random() * 15, color, r: 2 + Math.random() * 3 });
  }
  function spawnObstacle() {
    const type = Math.random() < .65 ? "cone" : "rail";
    obstacles.push({ x: W + 30, type, w: type === "cone" ? 32 : 74, h: type === "cone" ? 38 : 25, passed: false });
  }
  function update(dt) {
    const frame = Math.min(dt / 16.67, 2);
    distance += speed * frame;
    speed = Math.min(10.5, 5 + distance / 1800);
    score += Math.floor(speed * frame);
    obstacleTimer -= frame;
    if (obstacleTimer <= 0) { spawnObstacle(); obstacleTimer = 90 + Math.random() * 75; }
    if (keys.has("ArrowLeft") || keys.has("a")) player.x = Math.max(55, player.x - 4 * frame);
    if (keys.has("ArrowRight") || keys.has("d")) player.x = Math.min(360, player.x + 4 * frame);
    player.vy += .72 * frame; player.y += player.vy * frame;
    if (player.y + player.h >= groundY) {
      if (!player.grounded && player.trick) {
        score += player.trickValue;
        trickText = "CLEAN LANDING +" + player.trickValue;
        trickTimer = 60; burst(player.x + 20, groundY - 5, 14, "#ffc857");
      }
      player.y = groundY - player.h; player.vy = 0; player.grounded = true;
      player.trick = ""; player.trickAngle = 0;
    }
    if (player.trick) { player.trickAngle += .19 * frame; player.trickHold += frame; }
    for (const o of obstacles) {
      o.x -= speed * frame;
      const px = player.x + 8, py = player.y + 8;
      const ox = o.x, oy = o.type === "cone" ? groundY - o.h : groundY - o.h;
      if (px + player.w - 14 > ox && px < ox + o.w && py + player.h - 10 > oy) {
        if (player.grounded) { endGame(); return; }
      }
      if (!o.passed && o.x + o.w < player.x) { o.passed = true; score += 25; }
    }
    obstacles = obstacles.filter(o => o.x > -100);
    particles.forEach(p => { p.x += p.vx * frame; p.y += p.vy * frame; p.vy += .12 * frame; p.life -= frame; });
    particles = particles.filter(p => p.life > 0);
    if (trickTimer > 0) trickTimer -= frame;
    scoreEl.textContent = formatScore(score);
    speedEl.textContent = Math.round(speed * 12) + " km/h";
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#17283c"); sky.addColorStop(.62, "#354b60"); sky.addColorStop(1, "#18232e");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // sunset glow
    const glow = ctx.createRadialGradient(760, 145, 5, 760, 145, 230);
    glow.addColorStop(0, "#ffc87566"); glow.addColorStop(1, "#ffc87500");
    ctx.fillStyle = glow; ctx.fillRect(480, 0, 520, 360);
    ctx.fillStyle = "#f8cb82"; ctx.beginPath(); ctx.arc(760, 145, 42, 0, Math.PI * 2); ctx.fill();
    // city silhouette
    ctx.fillStyle = "#1b2b3b";
    for (let i = 0; i < 16; i++) {
      const x = i * 72 - (distance * .18 % 72);
      const bh = 75 + (i * 47 % 100);
      ctx.fillRect(x, groundY - bh - 20, 54, bh + 20);
      ctx.fillStyle = "#e6b56b55";
      for (let wy = groundY - bh + 4; wy < groundY - 28; wy += 18) ctx.fillRect(x + 10, wy, 5, 7);
      ctx.fillStyle = "#1b2b3b";
    }
    // far ramp shapes
    ctx.fillStyle = "#263849";
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(0, 375); ctx.quadraticCurveTo(110, 440, 230, groundY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(650, groundY); ctx.lineTo(800, 360); ctx.lineTo(1000, 360); ctx.lineTo(1000, groundY); ctx.fill();
    // ground
    ctx.fillStyle = "#687583"; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = "#9aa6af"; ctx.fillRect(0, groundY, W, 7);
    ctx.strokeStyle = "#84919d"; ctx.lineWidth = 2;
    for (let x = -((distance * 1.5) % 80); x < W; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, groundY + 30); ctx.lineTo(x - 35, H); ctx.stroke();
    }
    ctx.fillStyle = "#4d5a67"; ctx.fillRect(0, H - 16, W, 16);
  }

  function drawPlayer() {
    ctx.save();
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    ctx.translate(cx, cy);
    if (player.trick) ctx.rotate(Math.sin(player.trickAngle) * .25);
    ctx.rotate(player.lean);
    // shadow
    ctx.restore();
    ctx.fillStyle = "#0a101766"; ctx.beginPath(); ctx.ellipse(player.x + 22, groundY + 2, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(cx, cy);
    const flip = player.trick === "KICKFLIP" ? Math.cos(player.trickAngle * 2) : 1;
    // legs
    ctx.strokeStyle = "#17202d"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-5, 20); ctx.lineTo(-14, 38); ctx.lineTo(-20, 43); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 20); ctx.lineTo(15, 35); ctx.lineTo(22, 40); ctx.stroke();
    // shoes
    ctx.fillStyle = "#f6f1e8"; ctx.fillRect(-28, 40, 16, 7); ctx.fillRect(15, 37, 17, 7);
    // torso / hoodie
    ctx.fillStyle = "#ff6b35"; ctx.beginPath(); ctx.roundRect(-14, -8, 29, 34, 7); ctx.fill();
    ctx.fillStyle = "#f5f7fa"; ctx.fillRect(-2, 0, 3, 19);
    // arms
    ctx.strokeStyle = "#ffb58b"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-11, -1); ctx.lineTo(-25, 10); ctx.lineTo(-30, 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, -1); ctx.lineTo(24, 7); ctx.lineTo(28, -2); ctx.stroke();
    // neck and head
    ctx.fillStyle = "#b8734f"; ctx.fillRect(-5, -17, 10, 11);
    ctx.fillStyle = "#b8734f"; ctx.beginPath(); ctx.arc(0, -26, 13, 0, Math.PI * 2); ctx.fill();
    // helmet
    ctx.fillStyle = "#101723"; ctx.beginPath(); ctx.arc(0, -29, 14, Math.PI, Math.PI * 2); ctx.lineTo(15, -26); ctx.lineTo(-14, -26); ctx.fill();
    ctx.fillStyle = "#ffc857"; ctx.fillRect(4, -31, 9, 3);
    // skateboard
    ctx.save(); ctx.translate(0, 48); ctx.scale(flip, 1); ctx.rotate(player.trick ? Math.sin(player.trickAngle * 2) * .4 : 0);
    ctx.fillStyle = "#ffbd4a"; ctx.beginPath(); ctx.roundRect(-34, -3, 68, 7, 4); ctx.fill();
    ctx.fillStyle = "#182333"; ctx.fillRect(-23, 3, 7, 5); ctx.fillRect(17, 3, 7, 5);
    ctx.fillStyle = "#d8e0e8"; ctx.beginPath(); ctx.arc(-19, 8, 4, 0, Math.PI * 2); ctx.arc(20, 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); ctx.restore();
  }
  function drawObstacles() {
    for (const o of obstacles) {
      if (o.type === "cone") {
        ctx.fillStyle = "#ff6b35"; ctx.beginPath(); ctx.moveTo(o.x + 16, groundY - 40); ctx.lineTo(o.x + 31, groundY); ctx.lineTo(o.x, groundY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff0d5"; ctx.fillRect(o.x + 7, groundY - 17, 18, 5);
        ctx.fillStyle = "#d84921"; ctx.fillRect(o.x - 3, groundY - 2, 38, 4);
      } else {
        ctx.fillStyle = "#252d38"; ctx.fillRect(o.x, groundY - 25, o.w, 6);
        ctx.fillStyle = "#bac4cd"; ctx.fillRect(o.x + 4, groundY - 22, 4, 20); ctx.fillRect(o.x + o.w - 8, groundY - 22, 4, 20);
      }
    }
  }
  function drawParticles() {
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life / 20); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function draw() {
    drawBackground(); drawObstacles(); drawPlayer(); drawParticles();
    if (trickTimer > 0 && trickText) {
      ctx.save(); ctx.globalAlpha = Math.min(1, trickTimer / 12); ctx.textAlign = "center";
      ctx.font = "900 27px 'Barlow Condensed', Impact, sans-serif"; ctx.fillStyle = "#101723"; ctx.fillText(trickText, player.x + 22 + 2, player.y - 18 + 2);
      ctx.fillStyle = "#ffc857"; ctx.fillText(trickText, player.x + 22, player.y - 18); ctx.restore();
    }
    if (!running && !gameOver) { /* start screen overlay covers the canvas */ }
  }
  function loop(timestamp) {
    if (!running) return;
    const dt = lastTime ? timestamp - lastTime : 16.67;
    lastTime = timestamp;
    update(dt); draw();
    if (running) requestAnimationFrame(loop);
  }

  document.getElementById("startBtn").addEventListener("click", resetGame);
  document.getElementById("restartBtn").addEventListener("click", resetGame);
  window.addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowLeft", "ArrowRight", " ", "ArrowUp"].includes(e.key)) e.preventDefault();
    keys.add(k);
    if (e.repeat) return;
    if (e.key === " " || e.key === "ArrowUp") jump();
    if (k === "z") doTrick("KICKFLIP");
    if (k === "x") doTrick("GRAB");
  });
  window.addEventListener("keyup", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.delete(k);
  });
  draw();
})();
