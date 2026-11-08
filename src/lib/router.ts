import type { Route } from '../types';

export function parseRoute(hash: string): Route {
  const [, section, id] = hash.replace(/^#/, '').split('/');
  if (section === 'event' && id) return { name: 'event', id: decodeURIComponent(id) };
  if (section === 'print' && id) return { name: 'print', id: decodeURIComponent(id) };
  return { name: 'timeline' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'timeline':
      return '#/';
    case 'event':
      return `#/event/${encodeURIComponent(route.id)}`;
    case 'print':
      return `#/print/${encodeURIComponent(route.id)}`;
  }
}

export function navigate(route: Route): void {
  location.hash = hrefFor(route);
}
