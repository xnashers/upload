// Harvest animation — satisfying particle system with bounce physics
// No external dependencies, pure DOM + Web Animations API

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7', '#3b82f6', '#ec4899', '#14b8a6'];

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickColor(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Shockwave ring expanding outward ───
function spawnShockwave(cx, cy, color = 'rgba(74, 222, 128, 0.6)') {
  const ring = document.createElement('div');
  ring.style.cssText = `
    position: fixed;
    left: ${cx}px;
    top: ${cy}px;
    width: 0;
    height: 0;
    border-radius: 50%;
    border: 3px solid ${color};
    pointer-events: none;
    z-index: 90;
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(ring);

  ring.animate([
    { width: '0px', height: '0px', opacity: 1, borderWidth: '4px' },
    { width: '120px', height: '120px', opacity: 0, borderWidth: '1px' },
  ], {
    duration: 500,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards',
  }).finished.then(() => ring.remove());
}

// ─── Screen flash overlay ───
function spawnFlash(color = 'rgba(74, 222, 128, 0.15)') {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    inset: 0;
    background: ${color};
    pointer-events: none;
    z-index: 80;
    opacity: 1;
  `;
  document.body.appendChild(flash);

  flash.animate([
    { opacity: 1 },
    { opacity: 0 },
  ], {
    duration: 300,
    easing: 'ease-out',
    fill: 'forwards',
  }).finished.then(() => flash.remove());
}

// ─── Mini screen shake on the plot card ───
function shakeElement(el) {
  const dur = 300;
  el.animate([
    { transform: 'translate(0, 0)' },
    { transform: 'translate(-3px, 2px)' },
    { transform: 'translate(3px, -2px)' },
    { transform: 'translate(-2px, 1px)' },
    { transform: 'translate(1px, -1px)' },
    { transform: 'translate(0, 0)' },
  ], {
    duration: dur,
    easing: 'ease-out',
  });
}

// ─── Confetti burst ───
function spawnConfetti(cx, cy, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + randomRange(-0.3, 0.3);
    const speed = randomRange(60, 130);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - randomRange(20, 60);
    const size = randomRange(5, 9);
    const color = pickColor(COLORS);
    const isCircle = Math.random() > 0.5;
    const rotation = randomRange(0, 720);
    const duration = randomRange(600, 900);

    const dot = document.createElement('div');
    dot.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      pointer-events: none;
      z-index: 95;
      transform: translate(-50%, -50%);
    `;
    document.body.appendChild(dot);

    dot.animate([
      { opacity: 1, transform: `translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(1)` },
      { opacity: 1, transform: `translate(-50%, -50%) translate(${dx * 0.4}px, ${dy * 0.4}px) rotate(${rotation * 0.4}deg) scale(1.2)`, offset: 0.3 },
      { opacity: 0.6, transform: `translate(-50%, -50%) translate(${dx * 0.8}px, ${dy * 0.8 + 30}px) rotate(${rotation * 0.8}deg) scale(0.8)`, offset: 0.7 },
      { opacity: 0, transform: `translate(-50%, -50%) translate(${dx}px, ${dy + 60}px) rotate(${rotation}deg) scale(0.3)` },
    ], {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }).finished.then(() => dot.remove());
  }
}

// ─── Floating peso coins ───
function spawnCoins(cx, cy, count = 3) {
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    const offsetX = randomRange(-30, 30);
    const travelY = randomRange(80, 140);
    const driftX = randomRange(-20, 20);
    const dur = randomRange(800, 1100);
    const delay = i * 80;

    coin.innerHTML = '🪙';
    coin.style.cssText = `
      position: fixed;
      left: ${cx + offsetX}px;
      top: ${cy}px;
      font-size: 18px;
      pointer-events: none;
      z-index: 98;
      filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6));
      opacity: 0;
    `;
    document.body.appendChild(coin);

    setTimeout(() => {
      coin.animate([
        { opacity: 0, transform: 'scale(0.3) translateY(0)' },
        { opacity: 1, transform: `scale(1.1) translateY(${-travelY * 0.3}px) translateX(${driftX * 0.2}px)`, offset: 0.2 },
        { opacity: 1, transform: `scale(1.0) translateY(${-travelY * 0.5}px) translateX(${driftX * 0.5}px)`, offset: 0.4 },
        { opacity: 0.8, transform: `scale(0.95) translateY(${-travelY * 0.8}px) translateX(${driftX * 0.8}px)`, offset: 0.7 },
        { opacity: 0, transform: `scale(0.6) translateY(${-travelY}px) translateX(${driftX}px)` },
      ], {
        duration: dur,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }).finished.then(() => coin.remove());
    }, delay);
  }
}

// ─── Main crop emoji — big satisfying bounce ───
function spawnCropBounce(cx, cy, emoji, isDouble) {
  const el = document.createElement('div');
  const size = isDouble ? 48 : 40;
  const glowColor = isDouble ? 'rgba(234, 179, 8, 0.7)' : 'rgba(74, 222, 128, 0.5)';

  el.innerHTML = emoji;
  el.style.cssText = `
    position: fixed;
    left: ${cx}px;
    top: ${cy}px;
    font-size: ${size}px;
    pointer-events: none;
    z-index: 99;
    line-height: 1;
    filter: drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 4px 8px rgba(0,0,0,0.5));
  `;
  document.body.appendChild(el);

  el.animate([
    { opacity: 0, transform: 'scale(0.2) translateY(0)' },
    { opacity: 1, transform: 'scale(1.4) translateY(-50px)', offset: 0.2 },
    { opacity: 1, transform: 'scale(0.9) translateY(-35px)', offset: 0.35 },
    { opacity: 1, transform: 'scale(1.1) translateY(-55px)', offset: 0.5 },
    { opacity: 1, transform: 'scale(1.0) translateY(-50px)', offset: 0.6 },
    { opacity: 0.7, transform: 'scale(0.85) translateY(-70px)', offset: 0.8 },
    { opacity: 0, transform: 'scale(0.5) translateY(-90px)' },
  ], {
    duration: 1100,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards',
  }).finished.then(() => el.remove());
}

// ─── Floating text badge ───
function spawnFloatingBadge(cx, cy, text, color, offsetX = 0, delay = 0, size = 12) {
  const el = document.createElement('div');
  const x = cx + offsetX;

  el.textContent = text;
  el.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${cy - 20}px;
    font-size: ${size}px;
    font-weight: 800;
    color: ${color};
    text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    white-space: nowrap;
    pointer-events: none;
    z-index: 100;
    letter-spacing: 0.02em;
    opacity: 0;
  `;
  document.body.appendChild(el);

  setTimeout(() => {
    const driftX = randomRange(-15, 15);
    const travelY = randomRange(50, 80);
    el.animate([
      { opacity: 0, transform: `translateX(${driftX * 0.1}px) translateY(0) scale(0.5)` },
      { opacity: 1, transform: `translateX(${driftX * 0.3}px) translateY(${-travelY * 0.3}px) scale(1.2)`, offset: 0.25 },
      { opacity: 1, transform: `translateX(${driftX * 0.5}px) translateY(${-travelY * 0.5}px) scale(1.0)`, offset: 0.4 },
      { opacity: 0.8, transform: `translateX(${driftX * 0.8}px) translateY(${-travelY * 0.8}px) scale(0.95)`, offset: 0.7 },
      { opacity: 0, transform: `translateX(${driftX}px) translateY(${-travelY}px) scale(0.8)` },
    ], {
      duration: 900,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }).finished.then(() => el.remove());
  }, delay);
}

// ─── Sparkle ring around the crop ───
function spawnSparkles(cx, cy, count = 6) {
  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement('div');
    const angle = (Math.PI * 2 * i) / count;
    const radius = randomRange(25, 40);
    const sx = cx + Math.cos(angle) * radius;
    const sy = cy + Math.sin(angle) * radius;
    const delay = i * 50 + randomRange(0, 40);

    sparkle.textContent = '✨';
    sparkle.style.cssText = `
      position: fixed;
      left: ${sx}px;
      top: ${sy}px;
      font-size: ${randomRange(10, 16)}px;
      pointer-events: none;
      z-index: 97;
      opacity: 0;
      transform: scale(0);
    `;
    document.body.appendChild(sparkle);

    setTimeout(() => {
      sparkle.animate([
        { opacity: 0, transform: 'scale(0) rotate(0deg)' },
        { opacity: 1, transform: 'scale(1.3) rotate(90deg)', offset: 0.3 },
        { opacity: 0.8, transform: 'scale(1.0) rotate(180deg)', offset: 0.6 },
        { opacity: 0, transform: 'scale(0.5) rotate(270deg)' },
      ], {
        duration: randomRange(500, 700),
        easing: 'ease-out',
        fill: 'forwards',
      }).finished.then(() => sparkle.remove());
    }, delay);
  }
}

// ═══════════════════════════════════════════
// Main export — spawn the full harvest sequence
// ═══════════════════════════════════════════
export function spawnHarvestAnimation(targetEl, crop, result) {
  const rect = targetEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // 0ms — Plot card shake + flash
  shakeElement(targetEl);

  if (result.isDouble) {
    spawnFlash('rgba(234, 179, 8, 0.2)');
    spawnShockwave(cx, cy, 'rgba(234, 179, 8, 0.7)');
  } else if (result.isDestroyed) {
    spawnFlash('rgba(239, 68, 68, 0.2)');
    spawnShockwave(cx, cy, 'rgba(239, 68, 68, 0.6)');
  } else {
    spawnFlash('rgba(74, 222, 128, 0.12)');
    spawnShockwave(cx, cy);
  }

  // 50ms — Main crop bounces up with spring
  setTimeout(() => {
    spawnCropBounce(cx, cy, crop.emoji, result.isDouble);
  }, 50);

  // 80ms — Confetti burst
  const confettiCount = result.isDouble ? 20 : 10;
  setTimeout(() => {
    spawnConfetti(cx, cy, confettiCount);
  }, 80);

  // 100ms — Sparkle ring
  setTimeout(() => {
    spawnSparkles(cx, cy, result.isDouble ? 8 : 5);
  }, 100);

  // 150ms — XP badge floats up
  const xpTotal = crop.xp * result.quantity;
  setTimeout(() => {
    spawnFloatingBadge(cx, cy, `+${xpTotal} XP`, '#fbbf24', randomRange(-25, 25), 0, 14);
  }, 150);

  // Peso value badge
  const pesoTotal = result.items?.[0]?.sellPrice || 0;
  if (pesoTotal > 0) {
    setTimeout(() => {
      spawnFloatingBadge(cx, cy, `₱${pesoTotal}`, '#22c55e', randomRange(-30, 30), 0, 13);
    }, 250);
  }

  // 250ms — Double harvest text
  if (result.isDouble) {
    setTimeout(() => {
      spawnFloatingBadge(cx, cy, '🎉 DOUBLE!', '#fbbf24', 0, 0, 16);
    }, 250);
  }

  // 300ms — Seed return badge
  if (result.seedReturned) {
    setTimeout(() => {
      spawnFloatingBadge(cx, cy, '🌱 Seed!', '#4ade80', randomRange(20, 35), 0, 12);
    }, 400);
  }

  // 150ms — Floating peso coins
  const coinCount = result.isDouble ? 5 : 3;
  spawnCoins(cx, cy, coinCount);

  // Destroyed state — skull overlay
  if (result.isDestroyed) {
    setTimeout(() => {
      const skull = document.createElement('div');
      skull.textContent = '☠️';
      skull.style.cssText = `
        position: fixed;
        left: ${cx}px;
        top: ${cy}px;
        font-size: 32px;
        pointer-events: none;
        z-index: 101;
        opacity: 0;
      `;
      document.body.appendChild(skull);

      skull.animate([
        { opacity: 0, transform: 'scale(2) translateY(-20px)' },
        { opacity: 1, transform: 'scale(1) translateY(-40px)', offset: 0.3 },
        { opacity: 0.8, transform: 'scale(1.1) translateY(-50px)', offset: 0.6 },
        { opacity: 0, transform: 'scale(1.3) translateY(-70px)' },
      ], {
        duration: 800,
        easing: 'ease-out',
        fill: 'forwards',
      }).finished.then(() => skull.remove());
    }, 300);
  }
}
