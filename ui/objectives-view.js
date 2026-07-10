import { gameState } from '../state.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, TITLE_DISPLAY } from '../data/achievements.js';
import { TOKEN_SHOP_ITEMS } from '../data/token-shop.js';
import { LEVELS, getLevelReward, LEVEL_MILESTONES } from '../data/levels.js';
import { CROPS } from '../data/crops.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function createObjectivesView() {
  const el = document.createElement('div');
  el.className = 'p-3 pb-24 space-y-4';

  let activeTab = 'objectives';
  let expandedLevel = null;

  // Hidden cheat: persistent tap trackers for Titles & Objectives sub-tabs
  let titlesTapTimes = [];
  let objectivesTapTimes = [];
  const TAP_WINDOW = 2000; // 2 seconds window
  const TAP_COUNT = 5;

  function render() {
    el.innerHTML = '';

    // Tab selector
    const tabRow = document.createElement('div');
    tabRow.className = 'flex gap-1 mb-3 overflow-x-auto';
    const tabs = [
      { id: 'objectives', label: '📋 Objectives' },
      { id: 'levels', label: '📊 Levels' },
      { id: 'achievements', label: '🏆 Achievements' },
      { id: 'tokens', label: '🪙 Token Shop' },
      { id: 'titles', label: '👑 Titles' },
    ];
    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.className = `flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
        activeTab === tab.id
          ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
      }`;
      btn.textContent = tab.label;
      if (tab.id === 'levels') {
        const unclaimed = gameState.getUnclaimedLevelCount();
        if (unclaimed > 0) {
          const badge = document.createElement('span');
          badge.className = 'ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold';
          badge.textContent = unclaimed > 9 ? '9+' : unclaimed;
          btn.appendChild(badge);
        }
      }
      btn.onclick = () => { activeTab = tab.id; expandedLevel = null; render(); };
      tabRow.appendChild(btn);
    }
    el.appendChild(tabRow);

    // Hidden cheat: track rapid taps on Titles & Objectives sub-tabs
    const tabBtns = tabRow.querySelectorAll('button');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const label = btn.textContent || '';
        const now = Date.now();
        if (label.includes('Titles')) {
          titlesTapTimes.push(now);
          titlesTapTimes = titlesTapTimes.filter(t => now - t < TAP_WINDOW);
          if (titlesTapTimes.length >= TAP_COUNT) {
            titlesTapTimes = [];
            const result = gameState.applyCheatCode('hesoyam');
            if (result.success) {
              playSound('levelup');
              showToast(result.message, 'gold');
              render();
            }
          }
        } else if (label.includes('Objectives')) {
          objectivesTapTimes.push(now);
          objectivesTapTimes = objectivesTapTimes.filter(t => now - t < TAP_WINDOW);
          if (objectivesTapTimes.length >= TAP_COUNT) {
            objectivesTapTimes = [];
            const result = gameState.applyCheatCode('growall');
            if (result.success) {
              playSound('levelup');
              showToast(result.message, 'gold');
              render();
            }
          }
        }
      });
    });

    if (activeTab === 'objectives') renderObjectives(el);
    else if (activeTab === 'levels') renderLevels(el);
    else if (activeTab === 'achievements') renderAchievements(el);
    else if (activeTab === 'tokens') renderTokenShop(el);
    else if (activeTab === 'titles') renderTitles(el);
  }

  // =============================================
  // LEVELS VIEW
  // =============================================
  function renderLevels(container) {
    const currentLevel = gameState.player.level;

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-2';
    header.innerHTML = `
      <h2 class="text-sm font-bold text-slate-200">📊 Level Rewards</h2>
      <span class="text-xs text-slate-500">Lv.${currentLevel} · ${gameState.getLevelTitle()}</span>
    `;
    container.appendChild(header);

    // XP progress bar
    const nextXP = gameState.getNextLevelXP();
    const currentXP = gameState.getCurrentLevelXP();
    const playerXP = gameState.player.xp;
    if (nextXP) {
      const xpInto = playerXP - currentXP;
      const xpNeeded = nextXP - currentXP;
      const pct = Math.min(100, Math.round((xpInto / xpNeeded) * 100));
      const xpBar = document.createElement('div');
      xpBar.className = 'rounded-xl p-3 border bg-slate-900 border-slate-800 mb-3';
      xpBar.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-slate-300">⭐ Level ${currentLevel} → ${currentLevel + 1}</span>
          <span class="text-xs text-slate-500">${playerXP.toLocaleString()} / ${nextXP.toLocaleString()} XP</span>
        </div>
        <div class="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all" style="width: ${pct}%"></div>
        </div>
      `;
      container.appendChild(xpBar);
    }

    // Scrollable level list
    const listWrap = document.createElement('div');
    listWrap.className = 'space-y-2';

    // Show levels in batches, prioritize current level range
    const startLevel = Math.max(1, currentLevel - 2);
    const endLevel = Math.min(LEVELS.length, Math.max(currentLevel + 8, 20));

    for (let i = startLevel - 1; i < endLevel; i++) {
      const levelData = LEVELS[i];
      const level = levelData.level;
      const reached = currentLevel >= level;
      const claimed = gameState.isLevelRewardClaimed(level);
      const reward = getLevelReward(level);
      const crop = reward ? CROPS.find(c => c.id === reward.cropId) : null;
      const isExpanded = expandedLevel === level;
      const canClaim = reached && !claimed;

      const card = document.createElement('div');
      card.className = `rounded-xl border transition-all overflow-hidden ${
        claimed ? 'bg-slate-900/50 border-slate-800' :
        canClaim ? 'bg-amber-900/15 border-amber-600/40' :
        reached ? 'bg-slate-900 border-slate-700' :
        'bg-slate-900/60 border-slate-800/60'
      }`;

      // Header row
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3 p-3 cursor-pointer';
      row.innerHTML = `
        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          claimed ? 'bg-slate-800 text-slate-600' :
          canClaim ? 'bg-amber-600/30 text-amber-300' :
          reached ? 'bg-slate-800 text-slate-400' :
          'bg-slate-800/50 text-slate-600'
        }">
          ${level}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold ${claimed ? 'text-slate-500' : reached ? 'text-slate-200' : 'text-slate-500'}">${levelData.title}</span>
            ${claimed ? '<span class="text-xs text-emerald-500">✓</span>' : ''}
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            ${crop ? `<span class="text-xs ${claimed ? 'text-slate-600' : 'text-slate-400'}">${crop.emoji} ${crop.name} ×${reward.quantity}</span>` : '<span class="text-xs text-slate-600">No reward</span>'}
            ${!reached ? '<span class="text-xs text-slate-600">🔒</span>' : ''}
          </div>
        </div>
        <button class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex-shrink-0 ${
          isExpanded ? 'bg-slate-700 text-slate-300' :
          canClaim ? 'bg-amber-600 hover:bg-amber-500 text-white' :
          claimed ? 'bg-slate-800 text-slate-600' :
          'bg-slate-800 hover:bg-slate-700 text-slate-400'
        }">
          ${canClaim ? '🎁 Claim' : isExpanded ? '▲ Hide' : '👁 View'}
        </button>
      `;

      // Toggle expand
      row.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        if (canClaim) {
          const res = gameState.claimLevelReward(level);
          if (res.success) {
            playSound('buy');
            const cropInfo = CROPS.find(c => c.id === res.reward.cropId);
            showToast(`${cropInfo?.emoji || '🌱'} ${cropInfo?.name} ×${res.reward.quantity} claimed!`, 'success');
            render();
          }
          return;
        }
        expandedLevel = isExpanded ? null : level;
        render();
      });

      card.appendChild(row);

      // Expanded content
      if (isExpanded) {
        const expanded = document.createElement('div');
        expanded.className = 'border-t border-slate-800 px-3 pb-3 pt-2 space-y-2';

        // 3 dummy milestone items
        for (let m = 0; m < LEVEL_MILESTONES.length; m++) {
          const item = document.createElement('div');
          item.className = 'flex items-center gap-2 py-1.5 px-2 rounded-lg bg-slate-800/40';
          item.innerHTML = `
            <span class="text-xs text-amber-400">▸</span>
            <span class="text-xs text-slate-500">${LEVEL_MILESTONES[m]}</span>
            <span class="ml-auto text-[10px] text-slate-600 italic">locked</span>
          `;
          expanded.appendChild(item);
        }

        // Seed reward details
        if (crop && reward) {
          const rewardRow = document.createElement('div');
          rewardRow.className = `flex items-center gap-2 py-2 px-2 rounded-lg mt-1 ${
            claimed ? 'bg-emerald-900/10 border border-emerald-800/30' :
            canClaim ? 'bg-amber-900/10 border border-amber-700/30' :
            'bg-slate-800/40'
          }`;
          rewardRow.innerHTML = `
            <span class="text-xl">${crop.emoji}</span>
            <div class="flex-1">
              <p class="text-xs font-semibold ${claimed ? 'text-emerald-400' : reached ? 'text-amber-300' : 'text-slate-500'}">
                ${claimed ? '✅ Claimed' : reached ? '🌱 Ready to claim!' : '🔒 Reach Level ' + level}
              </p>
              <p class="text-[10px] text-slate-500">${crop.name} seeds ×${reward.quantity}</p>
            </div>
          `;
          expanded.appendChild(rewardRow);
        }

        card.appendChild(expanded);
      }

      listWrap.appendChild(card);
    }

    container.appendChild(listWrap);
  }

  function renderObjectives(container) {
    const progress = gameState.getDailyProgress();
    const objs = progress.objectives;

    // Daily Objectives section
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-2';
    header.innerHTML = `
      <h2 class="text-sm font-bold text-slate-200">📋 Daily Objectives</h2>
      <span class="text-xs text-slate-500">Resets at midnight</span>
    `;
    container.appendChild(header);

    if (objs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-center py-8 text-slate-500';
      empty.textContent = 'No objectives today';
      container.appendChild(empty);
      return;
    }

    const allClaimed = objs.every(o => o.completed && o.claimed);

    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      const card = document.createElement('div');
      const isComplete = obj.completed;
      const isClaimed = obj.claimed;
      const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));

      card.className = `rounded-xl p-3 border transition-all ${
        isClaimed ? 'bg-slate-900/50 border-slate-800 opacity-60' :
        isComplete ? 'bg-emerald-900/20 border-emerald-700/50' :
        'bg-slate-900 border-slate-800'
      }`;

      card.innerHTML = `
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <p class="text-sm font-semibold ${isClaimed ? 'text-slate-500 line-through' : 'text-slate-200'}">${obj.label}</p>
            <p class="text-xs text-slate-500 mt-0.5">${obj.current.toLocaleString()} / ${obj.target.toLocaleString()}</p>
          </div>
          <div class="text-right ml-2">
            <p class="text-xs text-amber-400 font-bold">₱${obj.reward.toLocaleString()}</p>
            <p class="text-xs text-purple-400">🪙 ${obj.tokens}</p>
          </div>
        </div>
        <div class="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div class="h-full rounded-full transition-all duration-500 ${isClaimed ? 'bg-slate-700' : isComplete ? 'bg-emerald-500' : 'bg-amber-500'}" style="width: ${isClaimed ? 100 : pct}%"></div>
        </div>
      `;

      if (isComplete && !isClaimed) {
        const btn = document.createElement('button');
        btn.className = 'w-full mt-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all active:scale-95';
        btn.textContent = '✨ Claim Reward';
        btn.onclick = () => {
          const res = gameState.claimObjective(i);
          if (res.success) {
            playSound('buy');
            showToast(`+₱${res.reward.toLocaleString()} +🪙${res.tokens}`, 'success');
            render();
          }
        };
        card.appendChild(btn);
      }

      container.appendChild(card);
    }

    // Daily Chest
    const chestCard = document.createElement('div');
    const chestReady = allClaimed && !progress.chestClaimed;
    chestCard.className = `rounded-xl p-4 border-2 mt-3 text-center transition-all ${
      progress.chestClaimed ? 'bg-slate-900/50 border-slate-800 opacity-60' :
      chestReady ? 'bg-amber-900/20 border-amber-500/50 animate-pulse' :
      'bg-slate-900 border-slate-700'
    }`;

    const claimedCount = objs.filter(o => o.completed && o.claimed).length;
    chestCard.innerHTML = `
      <div class="text-3xl mb-2">${progress.chestClaimed ? '📦' : chestReady ? '🎁' : '🔒'}</div>
      <p class="text-sm font-bold ${progress.chestClaimed ? 'text-slate-500' : 'text-slate-200'}">
        ${progress.chestClaimed ? 'Chest Opened!' : 'Daily Bonus Chest'}
      </p>
      <p class="text-xs text-slate-500 mt-1">${progress.chestClaimed ? 'Come back tomorrow' : `Claim all 3 rewards (${claimedCount}/3)`}</p>
    `;

    if (chestReady) {
      const btn = document.createElement('button');
      btn.className = 'w-full mt-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white text-sm font-bold transition-all active:scale-95';
      btn.textContent = '🎁 Open Daily Chest';
      btn.onclick = () => {
        const res = gameState.claimDailyChest();
        if (res.success) {
          playSound('levelup');
          showToast(`${res.reward.emoji} ${res.reward.label}!`, 'gold');
          render();
        }
      };
      chestCard.appendChild(btn);
    }
    container.appendChild(chestCard);

    // Reset Data section
    const resetSection = document.createElement('div');
    resetSection.className = 'mt-6 pt-4 border-t border-slate-800';
    resetSection.innerHTML = `
      <p class="text-xs text-slate-600 mb-2 text-center">Danger Zone</p>
    `;
    const resetBtn = document.createElement('button');
    resetBtn.className = 'w-full py-2.5 rounded-xl bg-red-900/30 border border-red-800/40 hover:bg-red-900/50 text-red-400 text-sm font-bold transition-all active:scale-95';
    resetBtn.textContent = '⚠️ Reset All Data';
    resetBtn.onclick = () => {
      // Confirmation step
      resetBtn.textContent = '⚠️ Tap again to confirm reset';
      resetBtn.className = 'w-full py-2.5 rounded-xl bg-red-800/50 border border-red-600/50 hover:bg-red-800/70 text-red-300 text-sm font-bold transition-all active:scale-95 animate-pulse';
      let confirmed = false;
      resetBtn.onclick = () => {
        if (confirmed) return;
        confirmed = true;
        playSound('buy');
        const doReload = () => {
          showToast('🔄 All data reset! Reloading...', 'info');
          setTimeout(() => location.reload(), 1000);
        };
        const storage = window.miniappsAI?.storage;
        if (storage) {
          storage.removeItem('pocketfarm_save').then(doReload).catch(() => {
            showToast('❌ Reset failed', 'error');
          });
        } else {
          localStorage.clear();
          doReload();
        }
      };
      // Auto-cancel after 3 seconds
      setTimeout(() => {
        if (!confirmed) {
          resetBtn.textContent = '⚠️ Reset All Data';
          resetBtn.className = 'w-full py-2.5 rounded-xl bg-red-900/30 border border-red-800/40 hover:bg-red-900/50 text-red-400 text-sm font-bold transition-all active:scale-95';
          resetBtn.onclick = null;
          render();
        }
      }, 3000);
    };
    resetSection.appendChild(resetBtn);
    container.appendChild(resetSection);
  }

  function renderAchievements(container) {
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-2';
    header.innerHTML = `
      <h2 class="text-sm font-bold text-slate-200">🏆 Achievements</h2>
      <span class="text-xs text-slate-500">${Object.keys(gameState.achievements).length}/${ACHIEVEMENTS.length}</span>
    `;
    container.appendChild(header);

    for (const cat of ACHIEVEMENT_CATEGORIES) {
      const catAchs = ACHIEVEMENTS.filter(a => a.cat === cat.id);
      if (catAchs.length === 0) continue;

      const catHeader = document.createElement('h3');
      catHeader.className = 'text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2';
      catHeader.textContent = cat.name;
      container.appendChild(catHeader);

      for (const ach of catAchs) {
        const entry = gameState.achievements[ach.id];
        const isUnlocked = !!entry;
        const isClaimed = entry?.claimed;

        const card = document.createElement('div');
        card.className = `rounded-xl p-3 border flex items-center gap-3 ${
          isClaimed ? 'bg-slate-900/50 border-slate-800 opacity-60' :
          isUnlocked ? 'bg-amber-900/20 border-amber-700/50' :
          'bg-slate-900 border-slate-800'
        }`;

        const emoji = document.createElement('div');
        emoji.className = `text-2xl ${isUnlocked ? '' : 'grayscale opacity-40'}`;
        emoji.textContent = ach.emoji;
        card.appendChild(emoji);

        const info = document.createElement('div');
        info.className = 'flex-1 min-w-0';
        info.innerHTML = `
          <p class="text-sm font-semibold ${isClaimed ? 'text-slate-500' : isUnlocked ? 'text-amber-300' : 'text-slate-400'}">${ach.name}</p>
          <p class="text-xs text-slate-500">${ach.desc}</p>
          <p class="text-xs text-slate-600 mt-0.5">Reward: ${ach.reward.type === 'peso' ? '₱' + ach.reward.amount.toLocaleString() : ach.reward.type === 'tokens' ? '🪙' + ach.reward.amount : ach.reward.amount + ' ' + ach.reward.type}</p>
        `;
        card.appendChild(info);

        if (isUnlocked && !isClaimed) {
          const btn = document.createElement('button');
          btn.className = 'px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold whitespace-nowrap active:scale-95';
          btn.textContent = 'Claim';
          btn.onclick = () => {
            const res = gameState.claimAchievement(ach.id);
            if (res.success) {
              playSound('buy');
              showToast(`🏆 ${ach.name} claimed!`, 'gold');
              render();
            }
          };
          card.appendChild(btn);
        } else if (isClaimed) {
          const badge = document.createElement('span');
          badge.className = 'text-xs text-emerald-500 font-bold';
          badge.textContent = '✓';
          card.appendChild(badge);
        }

        container.appendChild(card);
      }
    }
  }

  function renderTokenShop(container) {
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-3';
    header.innerHTML = `
      <h2 class="text-sm font-bold text-slate-200">🪙 Token Shop</h2>
      <div class="flex items-center gap-1 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-700/30">
        <span class="text-sm">🪙</span>
        <span class="text-sm font-bold text-purple-300">${gameState.farmerTokens}</span>
      </div>
    `;
    container.appendChild(header);

    const desc = document.createElement('p');
    desc.className = 'text-xs text-slate-500 mb-3';
    desc.textContent = 'Earn tokens from objectives, achievements, and login rewards.';
    container.appendChild(desc);

    for (const item of TOKEN_SHOP_ITEMS) {
      const canBuy = gameState.farmerTokens >= item.cost;
      const card = document.createElement('div');
      card.className = `rounded-xl p-3 border flex items-center gap-3 ${canBuy ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/50 border-slate-800 opacity-60'}`;

      card.innerHTML = `
        <div class="text-2xl">${item.emoji}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-200">${item.name}</p>
          <p class="text-xs text-slate-500">${item.desc}</p>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = `px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
        canBuy ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
      }`;
      btn.textContent = `🪙 ${item.cost}`;
      btn.onclick = () => {
        if (!canBuy) {
          playSound('buzzer');
          showToast('Not enough Tokens!', 'error');
          return;
        }
        const res = gameState.buyTokenShopItem(item);
        if (res.success) {
          playSound('buy');
          showToast(`${item.emoji} ${item.name} purchased!`, 'success');
          render();
        }
      };
      card.appendChild(btn);
      container.appendChild(card);
    }
  }

  function renderTitles(container) {
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-3';
    header.innerHTML = `
      <h2 class="text-sm font-bold text-slate-200">👑 Titles</h2>
      <span class="text-xs text-slate-500">Display on your profile</span>
    `;
    container.appendChild(header);

    const owned = gameState.titles.owned;
    const active = gameState.titles.active;

    if (owned.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-center py-8 text-slate-500';
      empty.innerHTML = '<div class="text-3xl mb-2">🔒</div><p class="text-sm">No titles unlocked yet</p><p class="text-xs text-slate-600 mt-1">Complete achievements to earn titles</p>';
      container.appendChild(empty);
      return;
    }

    for (const titleId of owned) {
      const info = TITLE_DISPLAY[titleId];
      if (!info) continue;
      const isActive = active === titleId;

      const card = document.createElement('div');
      card.className = `rounded-xl p-3 border flex items-center gap-3 cursor-pointer transition-all ${
        isActive ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'
      }`;

      card.innerHTML = `
        <div class="text-2xl">${info.emoji}</div>
        <div class="flex-1">
          <p class="text-sm font-semibold ${isActive ? 'text-amber-300' : 'text-slate-300'}">${info.name}</p>
        </div>
        ${isActive ? '<span class="text-xs text-amber-400 font-bold">✓ Active</span>' : ''}
      `;

      card.onclick = () => {
        if (isActive) {
          gameState.setActiveTitle(null);
          showToast('Title removed', 'info');
        } else {
          gameState.setActiveTitle(titleId);
          showToast(`${info.emoji} Title set: ${info.name}`, 'gold');
        }
        render();
      };

      container.appendChild(card);
    }
  }

  render();

  return {
    element: el,
    activate: () => render(),
    deactivate: () => {},
  };
}
