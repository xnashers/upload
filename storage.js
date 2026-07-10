const STORAGE_KEY = 'pocketfarm_save';

export async function loadGame(username = null) {
  try {
    if (username) {
      const res = await fetch(`/api/load?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Cloud load failed');
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveGame(state, username = null) {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);

    if (username) {
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, gameData: state })
      });
    }
  } catch (e) {
    console.warn('Cloud save failed');
  }
}