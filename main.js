import { gameState } from './state.js';
import { createStatsBar } from './ui/stats-bar.js';
import { createTabs } from './ui/tabs.js';
import { createFarmView } from './ui/farm-view.js';
import { createShopView } from './ui/shop-view.js';
import { createMarketView } from './ui/market-view.js';
import { createInventoryView } from './ui/inventory-view.js';
import { createResearchView } from './ui/research-view.js';
import { createObjectivesView } from './ui/objectives-view.js';
import { createWelcomeScreen } from './ui/welcome-screen.js';
import { createSplashScreen } from './ui/splash-screen.js';
import { showLoginRewardPopup } from './ui/login-reward-popup.js';
import { initToast, showToast } from './ui/toast.js';
import { playSound } from './ui/sounds.js';
import { createMusicButton } from './ui/music.js';
import { createTutorialOverlay } from './ui/tutorial-view.js';
import { createUpdateNotesOverlay, hasSeenUpdateNotes, markUpdateNotesSeen } from './ui/update-notes.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

async function init() {
  await gameState.init();

  const app = document.getElementById('app');
  if (!app) return;

  initToast();

  createSplashScreen(async () => {
    // Check if player has seen the update notes
    const seen = await hasSeenUpdateNotes();

    if (!seen) {
      // Show update notes overlay for all players (new & returning)
      const updateNotes = createUpdateNotesOverlay(async () => {
        await markUpdateNotesSeen();
        proceedAfterSplash(app);
      });
      document.body.appendChild(updateNotes);
    } else {
      proceedAfterSplash(app);
    }
  });
}

function proceedAfterSplash(app) {
  if (gameState.isNewPlayer) {
    const welcome = createWelcomeScreen((name) => {
      gameState.setFarmName(name);
      gameState.isNewPlayer = false;
      showToast(t('app.toast.farm_named', { name: gameState.getDisplayName() }), 'success');
      // Show tutorial for new players
      const tutorial = createTutorialOverlay(() => {
        startGame(app);
      });
      document.body.appendChild(tutorial);
    });
    app.appendChild(welcome);
  } else {
    startGame(app);
  }
}

function startGame(app) {
  // Show login reward popup if pending
  if (gameState.pendingLoginReward) {
    setTimeout(() => showLoginRewardPopup(), 500);
  }

  // Check achievements on startup
  const startupAchievements = gameState.checkAchievements();
  if (startupAchievements.length > 0) {
    setTimeout(() => {
      for (const ach of startupAchievements) {
        showToast(`🏆 Achievement: ${ach.name}!`, 'gold');
      }
    }, 1500);
  }

  gameState.on('levelup', (level) => {
    playSound('levelup');
    const title = gameState.getLevelTitle();
    showToast(t('app.toast.level_up', { level, title }), 'gold');
    // Check achievements after level up
    const newAchs = gameState.checkAchievements();
    for (const ach of newAchs) {
      setTimeout(() => showToast(`🏆 ${ach.name} unlocked!`, 'gold'), 500);
    }
  });

  gameState.on('weatherChange', (weather) => {
    playSound('weather');
    showToast(`${weather.emoji} ${weather.name} — ${weather.mutationEmoji} ${weather.mutation} (x${weather.multiplier})`, 'info');
    // Check weather achievements
    const newAchs = gameState.checkAchievements();
    for (const ach of newAchs) {
      setTimeout(() => showToast(`🏆 ${ach.name} unlocked!`, 'gold'), 500);
    }
  });

  const { element: statsBar } = createStatsBar();
  app.appendChild(statsBar);

  const main = document.createElement('main');
  main.className = 'relative';
  app.appendChild(main);

  const views = {
    farm: createFarmView(),
    shop: createShopView(),
    market: createMarketView(),
    research: createResearchView(),
    inventory: createInventoryView(),
    objectives: createObjectivesView(),
  };

  let currentView = 'farm';

  function showView(id) {
    if (currentView === id) return;
    if (views[currentView].deactivate) views[currentView].deactivate();
    main.innerHTML = '';
    currentView = id;
    main.appendChild(views[id].element);
    if (views[id].activate) views[id].activate();
  }

  main.appendChild(views.farm.element);
  views.farm.activate?.();

  const tabs = createTabs(showView);
  app.appendChild(tabs);

  // Music toggle button
  app.appendChild(createMusicButton());
}

document.addEventListener('DOMContentLoaded', init);
