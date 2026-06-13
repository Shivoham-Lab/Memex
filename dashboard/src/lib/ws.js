let ws = null;
const listeners = new Map();

/**
 * Connect to the WebSocket for real-time activity updates.
 * Subscribes to a specific project's activity feed.
 */
export function connectWs(projectId) {
  if (ws) ws.close();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws?project=${projectId}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const projectListeners = listeners.get(data.projectId) || [];
      projectListeners.forEach(fn => fn(data));

      // Global listeners
      const globalListeners = listeners.get('*') || [];
      globalListeners.forEach(fn => fn(data));
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    // Reconnect after 3 seconds
    setTimeout(() => connectWs(projectId), 3000);
  };

  return ws;
}

/**
 * Subscribe to activity events for a project.
 * Returns an unsubscribe function.
 */
export function subscribe(projectId, callback) {
  if (!listeners.has(projectId)) listeners.set(projectId, new Set());
  listeners.get(projectId).add(callback);
  return () => listeners.get(projectId)?.delete(callback);
}

/**
 * Subscribe to all activity events (global).
 */
export function subscribeGlobal(callback) {
  if (!listeners.has('*')) listeners.set('*', new Set());
  listeners.get('*').add(callback);
  return () => listeners.get('*')?.delete(callback);
}

export function disconnectWs() {
  if (ws) ws.close();
  listeners.clear();
}
