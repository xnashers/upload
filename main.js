async function init() {
  const app = document.getElementById('app');
  if (!app) return;

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
      // Merge cloud data into gameState
      Object.assign(gameState, cloudData);
      gameState._initPlots();
      gameState._ensureDailyReset();
    }

    if (gameState.isNewPlayer) {
      const welcome = createWelcomeScreen((name) => {
        gameState.setFarmName(name);
        gameState.isNewPlayer = false;
        showToast(t('app.toast.farm_named', { name: gameState.getDisplayName() }), 'success');
        finishStartup(app);
      });
      app.appendChild(welcome);
    } else {
      finishStartup(app);
    }
  });
}

function finishStartup(app) {
  if (gameState.pendingLoginReward) setTimeout(() => showLoginRewardPopup(), 500);

  // Auto cloud save
  const originalSave = gameState.save;
  gameState.save = async function() {
    await originalSave.call(this);
    await cloudSave(this);
  };

  // Continue with normal game start
  startGame(app);
}

// Keep your existing startGame function below...
function startGame(app) {
  // ... your original code from here ...
}