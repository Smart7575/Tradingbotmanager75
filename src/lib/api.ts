import { auth } from './firebase';

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options = { ...init };
  
  // Only inject header for internal API routes
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  
  if (url.startsWith('/api/') || url.startsWith('api/') || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    const headers = new Headers(options.headers || {});
    if (auth.currentUser) {
      headers.set('x-user-id', auth.currentUser.uid);
    }
    options.headers = headers;
  }
  
  return fetch(input, options);
}
