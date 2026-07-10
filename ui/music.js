// Background music player — plays data/music.mp3 with autoplay
let audio = null;
let isPlaying = false;
let muteBtnRef = null;

function getAudio() {
  if (!audio) {
    audio = new Audio('data/music.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = 'auto';
  }
  return audio;
}

function updateBtn() {
  const btn = muteBtnRef;
  if (!btn) return;
  btn.textContent = isPlaying ? '🎵' : '🔇';
  btn.classList.toggle('bg-green-800/90', isPlaying);
  btn.classList.toggle('bg-slate-800/90', !isPlaying);
  btn.classList.toggle('music-pulse', isPlaying);
}

export function startMusic() {
  if (isPlaying) return;
  const a = getAudio();
  a.play().then(() => {
    isPlaying = true;
    updateBtn();
  }).catch(() => {
    isPlaying = false;
    updateBtn();
  });
}

export function stopMusic() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  isPlaying = false;
  updateBtn();
}

export function toggleMusic() {
  if (isPlaying) {
    stopMusic();
  } else {
    startMusic();
  }
  return isPlaying;
}

export function isMusicPlaying() {
  return isPlaying;
}

// Try autoplay immediately; if blocked, start on first user interaction
function tryAutoplay() {
  const a = getAudio();
  a.play().then(() => {
    isPlaying = true;
    updateBtn();
  }).catch(() => {
    // Blocked — wait for any user gesture, then try once
    const onInteract = () => {
      document.removeEventListener('pointerdown', onInteract);
      document.removeEventListener('keydown', onInteract);
      startMusic();
    };
    document.addEventListener('pointerdown', onInteract, { once: true });
    document.addEventListener('keydown', onInteract, { once: true });
  });
}

// Create a floating music toggle button
export function createMusicButton() {
  const btn = document.createElement('button');
  btn.className = 'fixed bottom-20 right-3 z-40 w-10 h-10 rounded-full bg-slate-800/90 border border-white/10 flex items-center justify-center text-lg shadow-lg transition active:scale-90 hover:bg-slate-700/90';
  btn.setAttribute('aria-label', 'Toggle music');
  btn.textContent = '🔇';

  muteBtnRef = btn;

  btn.addEventListener('click', () => {
    toggleMusic();
  });

  // Kick off autoplay right away
  tryAutoplay();

  return btn;
}
