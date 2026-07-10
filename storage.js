const STORAGE_KEY = 'pocketfarm_save';

function getStorage() {
  return window.miniappsAI?.storage;
}

export async function loadGame() {
  try {
    const storage = getStorage();
    if (storage) {
      const raw = await storage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } else {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load save:', e);
  }
  return null;
}

export async function saveGame(state) {
  try {
    const storage = getStorage();
    const json = JSON.stringify(state);
    if (storage) {
      await storage.setItem(STORAGE_KEY, json);
    } else {
      localStorage.setItem(STORAGE_KEY, json);
    }
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}
