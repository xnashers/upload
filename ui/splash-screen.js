export function createSplashScreen(onComplete) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[60] flex flex-col items-center justify-center select-none gap-2';
  overlay.style.backgroundColor = '#DC2626';

  const text = document.createElement('h1');
  text.textContent = 'DylVen Corp';
  text.style.fontFamily = "'Bebas Neue', sans-serif";
  text.style.fontSize = 'clamp(2.5rem, 12vw, 5rem)';
  text.style.color = '#000000';
  text.style.letterSpacing = '0.08em';
  text.style.margin = '0';
  text.style.opacity = '0';
  text.style.transform = 'scale(0.9)';
  text.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Developed with Passion by Jonas Sison';
  subtitle.style.fontStyle = 'italic';
  subtitle.style.fontSize = 'clamp(0.75rem, 3vw, 1rem)';
  subtitle.style.color = '#000000';
  subtitle.style.margin = '0';
  subtitle.style.opacity = '0';
  subtitle.style.transition = 'opacity 0.6s ease 0.2s';

  overlay.appendChild(text);
  overlay.appendChild(subtitle);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      text.style.opacity = '1';
      text.style.transform = 'scale(1)';
      subtitle.style.opacity = '1';
    });
  });

  setTimeout(() => {
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      onComplete();
    }, 500);
  }, 2500);
}
