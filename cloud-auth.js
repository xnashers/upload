let currentUsername = null;

export async function showLoginScreen(onSuccess) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-slate-900 p-8 rounded-3xl w-full max-w-sm border border-green-500/30 text-center">
      <div class="text-6xl mb-4">🌱</div>
      <h1 class="text-3xl font-bold text-green-400 mb-6">Pocket Farm</h1>
      <input id="u" placeholder="Username" class="w-full px-5 py-4 bg-slate-800 rounded-2xl text-center text-lg mb-3">
      <input id="p" type="password" maxlength="6" placeholder="6-Digit PIN" class="w-full px-5 py-4 bg-slate-800 rounded-2xl text-center text-lg mb-6">
      <div class="grid grid-cols-2 gap-3">
        <button id="login" class="py-4 bg-green-600 hover:bg-green-500 rounded-2xl font-bold">Login</button>
        <button id="reg" class="py-4 bg-slate-700 hover:bg-slate-600 rounded-2xl font-bold">Register</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const u = overlay.querySelector('#u');
  const p = overlay.querySelector('#p');
  const loginBtn = overlay.querySelector('#login');
  const regBtn = overlay.querySelector('#reg');

  const handle = async (isRegister) => {
    const username = u.value.trim();
    const pin = p.value.trim();
    if (username.length < 3 || pin.length !== 6) return alert("Username (min 3) + 6-digit PIN required");

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin, action: isRegister ? 'register' : 'login' })
    });
    const data = await res.json();
    if (data.success) {
      currentUsername = username.toLowerCase().trim();
      overlay.remove();
      onSuccess(data.gameData || null);
    } else {
      alert(data.error || "Failed");
    }
  };

  loginBtn.onclick = () => handle(false);
  regBtn.onclick = () => handle(true);
}

export function getCurrentUsername() { return currentUsername; }

export async function cloudSave(gameData) {
  const username = getCurrentUsername();
  if (!username) return;
  try {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, gameData })
    });
  } catch (e) {}
}