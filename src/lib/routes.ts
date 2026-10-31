import type { Screen } from './appTypes';

export function readRoute(pathname: string): { screen: Screen; scanId?: string; sample?: boolean; unknown?: boolean } {
  const path = pathname.replace(/\/+$/, '') || '/';
  const paths: Record<string, Screen> = {
    '/': 'home', '/login': 'login', '/signup': 'signup', '/reset-password': 'reset-password',
    '/dashboard': 'dashboard', '/upload': 'upload', '/processing': 'processing',
    '/privacy': 'privacy', '/terms': 'terms',
  };
  if (path === '/sample') return { screen: 'results', sample: true };
  if (paths[path]) return { screen: paths[path] };
  const match = /^\/results\/([^/]+)$/.exec(path);
  if (match) {
    try { return { screen: 'results', scanId: decodeURIComponent(match[1]) }; }
    catch { /* malformed URL */ }
  }
  return { screen: 'home', unknown: true };
}

export function routePath(screen: Screen, scanId?: string, sample = false): string {
  if (sample) return '/sample';
  if (screen === 'results') return scanId ? `/results/${encodeURIComponent(scanId)}` : '/dashboard';
  return screen === 'home' ? '/' : `/${screen}`;
}
