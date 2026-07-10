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
import { createTutorialOverlay } from './ui/tutorial-view.js';
import { createUpdateNotesOverlay, hasSeenUpdateNotes, markUpdateNotesSeen } from './ui/update-notes.js';
import { showLoginScreen, cloudSave } from './cloud-auth.js';

// Translation helper
const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

let currentTab = 'farm';
let views = {};

async function init() {
  const app = document.getElementById('app');
  if (!app) {
    console.error("No #app element found");
    return;
  }

  initToast();

  createSplashScreen(async () => {
    const seen = await hasSeenUpdateNotes();
    if (!seen) {
      const updateNotes = createUpdateNotesOverlay(async () => {
        await markUpdateNotesSeen();
        startCloudLogin(app);
      });
      document.body.appendChild(updateNotes);
    } else {
      startCloudLogin(app);
    }
  });
}

async function startCloudLogin(app) {
  showLoginScreen(async (cloudData) => {
    await gameState.init();

    if (cloudData) {
      Object.assign(gameState, cloudData);
      if (gameState._initPlots) gameState._initPlots();
      if (gameState._ensureDailyReset) gameState._ensureDailyReset();
    }

    if (gameState.isNewPlayer) {
      const welcome = createWelcomeScreen((name) => {
        gameState.setFarmName(name);
        gameState.isNewPlayer = false;
        showToast(`Welcome to ${name} Farm! 🌱`, 'success');
        finishStartup(app);
      });
      app.appendChild(welcome);
    } else {
      finishStartup(app);
    }
  });
}

function finishStartup(app) {
  if (gameState.pendingLoginReward) {
    setTimeout(() => showLoginRewardPopup(), 500);
  }

  // Cloud save override
  const originalSave = gameState.save.bind(gameState);
  gameState.save = async function() {
    await originalSave();
    await cloudSave(this);
    this.notify();
  };

  startGame(app);
}

function startGame(app) {
  app.innerHTML = '';

  // Stats bar
  const statsBar = createStatsBar();
  app.appendChild(statsBar.element);

  // Tabs
  const tabs = createTabs((tab) => {
    currentTab = tab;
    renderCurrentView();
  });
  app.appendChild(tabs);

  // Main content area
  const content = document.createElement('div');
  content.id = 'main-content';
  content.className = 'pt-4 pb-20 px-4 max-w-lg mx-auto';
  app.appendChild(content);

  // Create views
  views = {
    farm: createFarmView(),
    shop: createShopView(),
    market: createMarketView(),
    research: createResearchView(),
    inventory: createInventoryView(),
    objectives: createObjectivesView()
  };

  renderCurrentView();
}

function renderCurrentView() {
  const content = document.getElementById('main-content');
  if (!content) return;
  content.innerHTML = '';
  content.appendChild(views[currentTab]);
}

init();
