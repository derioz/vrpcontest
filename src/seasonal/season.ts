/**
 * Temporary seasonal theme switch.
 *
 * To remove the Christmas theme: delete this folder and the references listed at the top of
 * christmas.css. It also switches itself off after `until`, and `?theme=default` previews the
 * regular look.
 */
const SEASON = {
  name: 'christmas',
  until: '2027-01-03',
};

function isActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('theme') === 'default') return false;
  return Date.now() < new Date(`${SEASON.until}T00:00:00`).getTime();
}

// The admin console keeps its working look; only the public site is themed.
function sync(): void {
  const root = document.documentElement;
  const themed = isActive() && !window.location.pathname.startsWith('/admin');
  if (themed) root.dataset.season = SEASON.name;
  else delete root.dataset.season;
}

export function initSeason(): void {
  if (typeof window === 'undefined') return;
  sync();
  window.addEventListener('popstate', sync);
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method];
    window.history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args);
      sync();
      return result;
    };
  }
}
