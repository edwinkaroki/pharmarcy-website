import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DATA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'analytics.json');

export const analytics = {
  messages: 0,
  intent_counts: {},
  emergency_escalations: 0,
  pharmacist_escalations: 0,
  safety_events: 0,
  callback_requests: 0,
  request_errors: 0,
  requested_medicines: {},
  out_of_stock_requests: {},
  events: [],
  last_updated: null,
};

function persistAnalytics() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(analytics, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist analytics', err);
  }
}

function loadAnalytics() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw || '{}');
      // merge stored values into analytics object
      Object.assign(analytics, data);
    }
  } catch (err) {
    console.error('Failed to load analytics', err);
  }
}

export function recordEvent(type, data = {}) {
  analytics.events.unshift({ type, timestamp: new Date().toISOString(), ...data });
  if (analytics.events.length > 100) analytics.events.length = 100;
  analytics.last_updated = new Date().toISOString();
  persistAnalytics();
}

export function trackIntent(intent) {
  analytics.intent_counts[intent] = (analytics.intent_counts[intent] || 0) + 1;
  persistAnalytics();
}

export function trackRequestError(reason) {
  analytics.request_errors += 1;
  recordEvent('request_error', { reason });
  persistAnalytics();
}

// Load persisted analytics on module import
loadAnalytics();

export function resetAnalytics() {
  analytics.messages = 0;
  analytics.intent_counts = {};
  analytics.emergency_escalations = 0;
  analytics.pharmacist_escalations = 0;
  analytics.safety_events = 0;
  analytics.callback_requests = 0;
  analytics.request_errors = 0;
  analytics.requested_medicines = {};
  analytics.out_of_stock_requests = {};
  analytics.events = [];
  analytics.last_updated = new Date().toISOString();
  persistAnalytics();
  recordEvent('analytics_reset', { source: 'admin' });
}

export function exportCSV() {
  const lines = [];
  lines.push('type,metric,value');
  // summary metrics
  const summary = ['messages','emergency_escalations','pharmacist_escalations','safety_events','callback_requests','request_errors'];
  summary.forEach((k) => {
    lines.push([ 'summary', k, String(analytics[k] || 0) ].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(','));
  });

  lines.push('');
  lines.push('type,metric,value');
  // intents
  lines.push('intent,intent_name,count');
  Object.entries(analytics.intent_counts || {}).forEach(([intent, count]) => {
    lines.push([ 'intent', intent, String(count) ].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(','));
  });

  lines.push('');
  lines.push('type,metric,value');
  // requested medicines
  lines.push('medicine,name,count');
  Object.entries(analytics.requested_medicines || {}).forEach(([name, count]) => {
    lines.push([ 'medicine', name, String(count) ].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(','));
  });

  lines.push('');
  lines.push('events,timestamp,type,details');
  analytics.events.slice(0, 200).forEach((ev) => {
    const details = JSON.stringify(Object.fromEntries(Object.entries(ev).filter(([k]) => !['type','timestamp'].includes(k))));
    lines.push([ 'event', ev.timestamp, ev.type, details ].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(','));
  });

  return lines.join('\n');
}
