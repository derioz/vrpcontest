/**
 * Temporary seasonal theme.
 *
 * To remove it: delete this folder, then delete the `initSeason` and
 * `christmas.css` imports in main.tsx, the `seasonal-hero` class in App.tsx and
 * the `themed` palette in ui/shader-background.tsx.
 * It also switches itself off after `until`, and `?theme=default` previews the
 * regular look.
 */
const SEASON = {
  name: 'christmas',
  until: '2027-01-03',
  themeColor: '#b8324d',
};

function isActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('theme') === 'default') return false;
  return Date.now() < new Date(`${SEASON.until}T00:00:00`).getTime();
}

// The admin console keeps its working colors; only the public site is themed.
function sync(): void {
  const root = document.documentElement;
  const themed = isActive() && !window.location.pathname.startsWith('/admin');
  if (themed) root.dataset.season = SEASON.name;
  else delete root.dataset.season;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    if (!meta.hasAttribute('data-default')) meta.setAttribute('data-default', meta.getAttribute('content') || '');
    meta.setAttribute('content', themed ? SEASON.themeColor : meta.getAttribute('data-default') || '');
  }
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
