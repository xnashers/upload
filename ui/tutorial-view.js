const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

const TUTORIAL_STEPS = [
  {
    emoji: '🌱',
    title: 'Welcome to Pocket Farm!',
    desc: 'Grow Filipino crops, harvest mutations, and build your dream farm. Let\'s learn the basics!',
    bg: 'from-green-900/40 to-emerald-900/20',
  },
  {
    emoji: '🪴',
    title: 'Plant Seeds',
    desc: 'Tap an empty plot to plant seeds. Buy seeds from the Shop tab. Different crops have different grow times and sell prices.',
    bg: 'from-green-900/40 to-lime-900/20',
  },
  {
    emoji: '✨',
    title: 'Harvest Crops',
    desc: 'When crops are ready (glowing green), tap to harvest! Harvested crops go to your Inventory. Mutated crops are worth more!',
    bg: 'from-amber-900/40 to-yellow-900/20',
  },
  {
    emoji: '💰',
    title: 'Sell at Market',
    desc: 'Sell your harvested crops at the Market for Pesos. Mutated crops have their own premium section with higher prices!',
    bg: 'from-yellow-900/40 to-orange-900/20',
  },
  {
    emoji: '🌧️',
    title: 'Weather System',
    desc: 'Weather changes every 2 minutes! Certain weather boosts mutation chances. Some weather blocks planting certain crops (like Snow blocking advanced crops).',
    bg: 'from-blue-900/40 to-cyan-900/20',
  },
  {
    emoji: '🧬',
    title: 'Mutations',
    desc: 'Ready crops can get mutations during weather changes! Mutated crops sell for much more. Stack rare mutations for huge multipliers!',
    bg: 'from-purple-900/40 to-pink-900/20',
  },
  {
    emoji: '⭐',
    title: 'Level Up & Research',
    desc: 'Earn XP from harvesting to unlock new plots and crops. Spend Pesos in Research Lab for permanent upgrades. Happy farming!',
    bg: 'from-amber-900/40 to-red-900/20',
  },
];

export function createTutorialOverlay(onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4';

  let currentStep = 0;

  function render() {
    const step = TUTORIAL_STEPS[currentStep];
    const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
    const isLast = currentStep === TUTORIAL_STEPS.length - 1;
    const isFirst = currentStep === 0;

    overlay.innerHTML = `
      <div class="w-full max-w-sm animate-fade-in">
        <!-- Progress bar -->
        <div class="h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
        </div>

        <!-- Step content -->
        <div class="text-center p-6 rounded-2xl bg-gradient-to-br ${step.bg} border border-white/10">
          <div class="text-6xl mb-4">${step.emoji}</div>
          <h2 class="text-xl font-bold text-white mb-3">${step.title}</h2>
          <p class="text-sm text-slate-300 leading-relaxed">${step.desc}</p>
        </div>

        <!-- Step indicator -->
        <div class="flex justify-center gap-2 mt-5 mb-6">
          ${TUTORIAL_STEPS.map((_, i) => `
            <div class="w-2 h-2 rounded-full transition-all ${i === currentStep ? 'bg-green-400 w-6' : i < currentStep ? 'bg-green-600' : 'bg-slate-700'}"></div>
          `).join('')}
        </div>

        <!-- Buttons -->
        <div class="flex gap-3">
          ${!isFirst ? `
            <button class="tutorial-prev flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition active:scale-95">
              ← Back
            </button>
          ` : ''}
          <button class="tutorial-next flex-1 py-3 rounded-xl ${isLast ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-slate-600'} text-white font-bold transition active:scale-95">
            ${isLast ? '🌾 Start Farming!' : 'Next →'}
          </button>
        </div>

        ${!isLast ? `
          <button class="tutorial-skip w-full mt-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition">
            Skip Tutorial
          </button>
        ` : ''}
      </div>
    `;

    // Event listeners
    const prevBtn = overlay.querySelector('.tutorial-prev');
    const nextBtn = overlay.querySelector('.tutorial-next');
    const skipBtn = overlay.querySelector('.tutorial-skip');

    if (prevBtn) prevBtn.onclick = () => { currentStep--; render(); };
    if (nextBtn) nextBtn.onclick = () => {
      if (isLast) {
        close();
      } else {
        currentStep++;
        render();
      }
    };
    if (skipBtn) skipBtn.onclick = () => close();
  }

  function close() {
    overlay.classList.add('animate-fade-out');
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 300);
  }

  render();
  return overlay;
}
