import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'dashboard' }
  | { name: 'analysis'; id: string };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'login') return { name: 'login' };
  if (parts[0] === 'signup') return { name: 'signup' };
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  if (parts[0] === 'analysis' && parts[1]) return { name: 'analysis', id: parts[1] };
  return { name: 'home' };
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'home': return '#/';
    case 'login': return '#/login';
    case 'signup': return '#/signup';
    case 'dashboard': return '#/dashboard';
    case 'analysis': return `#/analysis/${r.id}`;
  }
}

export function navigate(r: Route) {
  const target = routeToHash(r);
  if (window.location.hash !== target) {
    window.location.hash = target;
  } else {
    // same hash — still dispatch so listeners re-render
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
