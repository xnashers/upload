let container = null;

export function initToast() {
  container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none';
  document.body.appendChild(container);
}

export function showToast(message, type = 'success') {
  if (!container) initToast();
  const el = document.createElement('div');
  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    gold: 'bg-yellow-500 text-slate-900',
    warning: 'bg-amber-600 text-white',
  };
  el.className = `${colors[type] || colors.success} px-4 py-2 rounded-xl text-sm font-semibold shadow-lg pointer-events-auto animate-fade-in`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('animate-fade-out');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
