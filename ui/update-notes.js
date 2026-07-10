const UPDATE_VERSION = 'v2.1';

const UPDATE_ITEMS = [
  {
    emoji: '❤️',
    title: 'Favorite Your Plots',
    desc: 'Tap the heart on any plot to protect it from accidental harvesting! Favorited plots are locked until you unfavorite them. No more losing your best mutated crops.',
    bg: 'from-pink-900/40 to-rose-900/20',
  },
  {
    emoji: '👆',
    title: 'Tap to Harvest',
    desc: 'Ready crops are now harvested with a simple tap — no more buttons! Just tap a glowing plot to harvest it instantly. Faster, cleaner, more satisfying.',
    bg: 'from-green-900/40 to-emerald-900/20',
  },
  {
    emoji: '🌧️',
    title: 'Weather Visual Effects',
    desc: 'Watch rain, snow, fog, cherry blossoms, shooting stars, aurora borealis & thunder sweep across your farm! Each weather type has unique animated effects.',
    bg: 'from-blue-900/40 to-cyan-900/20',
  },
  {
    emoji: '🌡️',
    title: 'Weather Affects Farming',
    desc: 'Snow blocks advanced crops from being planted. Each weather type boosts specific mutation chances. Check the Weather Center for forecasts!',
    bg: 'from-sky-900/40 to-indigo-900/20',
  },
  {
    emoji: '🧬',
    title: 'Mutation Badges on Crops',
    desc: 'Mutated crops now glow and show their multiplier directly on your farm plots. Secret mutations display in purple with bonus multipliers!',
    bg: 'from-purple-900/40 to-pink-900/20',
  },
  {
    emoji: '💎',
    title: 'Premium Mutated Market',
    desc: 'Mutated crops sell in their own premium section at the Market with higher prices. Mutations stack — the rarer the combo, the bigger the payout!',
    bg: 'from-amber-900/40 to-orange-900/20',
  },
  {
    emoji: '📅',
    title: '7-Day Daily Rewards',
    desc: 'Log in every day to claim rewards! See all 7 days in advance. Build a streak for bigger bonuses — don\'t break the chain!',
    bg: 'from-yellow-900/40 to-amber-900/20',
  },
  {
    emoji: '📊',
    title: 'Level Rewards & XP Bar',
    desc: 'Every level milestone now rewards you with bonus seeds! Track your XP progress and claim rewards as you level up from Beginner to Legend.',
    bg: 'from-emerald-900/40 to-green-900/20',
  },
  {
    emoji: '🏆',
    title: 'Achievements & Titles',
    desc: 'Unlock 20+ achievements across Farming, Money, Mutations, Weather, Collection & Level categories. Earn exclusive titles to display on your profile!',
    bg: 'from-rose-900/40 to-red-900/20',
  },
  {
    emoji: '🎓',
    title: 'New Player Tutorial',
    desc: 'A step-by-step guide now teaches new farmers the basics — from planting seeds to harvesting mutations. Skip it if you\'re already a pro!',
    bg: 'from-teal-900/40 to-emerald-900/20',
  },
];

export function createUpdateNotesOverlay(onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4';

  let currentStep = 0;

  function render() {
    const item = UPDATE_ITEMS[currentStep];
    const progress = ((currentStep + 1) / UPDATE_ITEMS.length) * 100;
    const isLast = currentStep === UPDATE_ITEMS.length - 1;
    const isFirst = currentStep === 0;

    overlay.innerHTML = `
      <div class="w-full max-w-sm animate-fade-in">
        <!-- Header -->
        <div class="text-center mb-4">
          <div class="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 rounded-full px-3 py-1 mb-2">
            <span class="text-xs font-bold text-amber-300">🆕 WHAT'S NEW</span>
            <span class="text-xs text-amber-500">${UPDATE_VERSION}</span>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="h-1 bg-slate-800 rounded-full mb-5 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
        </div>

        <!-- Step content -->
        <div class="text-center p-6 rounded-2xl bg-gradient-to-br ${item.bg} border border-white/10">
          <div class="text-6xl mb-4">${item.emoji}</div>
          <h2 class="text-xl font-bold text-white mb-3">${item.title}</h2>
          <p class="text-sm text-slate-300 leading-relaxed">${item.desc}</p>
        </div>

        <!-- Step indicator -->
        <div class="flex justify-center gap-2 mt-5 mb-6">
          ${UPDATE_ITEMS.map((_, i) => `
            <div class="w-2 h-2 rounded-full transition-all ${i === currentStep ? 'bg-amber-400 w-6' : i < currentStep ? 'bg-amber-600' : 'bg-slate-700'}"></div>
          `).join('')}
        </div>

        <!-- Counter -->
        <p class="text-center text-xs text-slate-600 mb-4">${currentStep + 1} of ${UPDATE_ITEMS.length}</p>

        <!-- Buttons -->
        <div class="flex gap-3">
          ${!isFirst ? `
            <button class="update-prev flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition active:scale-95">
              ← Back
            </button>
          ` : ''}
          <button class="update-next flex-1 py-3 rounded-xl ${isLast ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-700 hover:bg-slate-600'} text-white font-bold transition active:scale-95">
            ${isLast ? '🌾 Let\'s Farm!' : 'Next →'}
          </button>
        </div>

        ${!isLast ? `
          <button class="update-skip w-full mt-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition">
            Skip
          </button>
        ` : ''}
      </div>
    `;

    // Event listeners
    const prevBtn = overlay.querySelector('.update-prev');
    const nextBtn = overlay.querySelector('.update-next');
    const skipBtn = overlay.querySelector('.update-skip');

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

// Check if the user has already seen this version's update notes
export async function hasSeenUpdateNotes() {
  try {
    const seen = await window.miniappsAI?.storage?.getItem('seenUpdateNotes');
    return seen === UPDATE_VERSION;
  } catch {
    return localStorage.getItem('seenUpdateNotes') === UPDATE_VERSION;
  }
}

export async function markUpdateNotesSeen() {
  try {
    await window.miniappsAI?.storage?.setItem('seenUpdateNotes', UPDATE_VERSION);
  } catch {
    localStorage.setItem('seenUpdateNotes', UPDATE_VERSION);
  }
}
