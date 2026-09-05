/* global URLSearchParams, window, BroadcastChannel */
// No app bootstrap or analytics: authorization codes never enter page reports.
const params = new URLSearchParams(window.location.search);
window.history.replaceState(null, '', window.location.pathname);
const channel = new BroadcastChannel('september-openrouter');
channel.postMessage({ state: params.get('state'), code: params.get('code') });
channel.close();
