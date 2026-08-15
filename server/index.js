import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { localChat } from './chat.js';
import { pharmacy, inventory } from './data.js';
import { analytics, recordEvent, trackIntent, trackRequestError, resetAnalytics, exportCSV } from './analytics.js';
const app = express();
app.use(cors()); app.use(express.json({ limit: '20kb' }));
// Simple admin auth: requires `ADMIN_TOKEN` env and `x-admin-token` header
function requireAdmin(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return res.status(403).json({ error: 'Admin actions disabled: ADMIN_TOKEN not configured' });
  const provided = req.header('x-admin-token');
  if (!provided || provided !== adminToken) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}
app.get('/api/pharmacy', (_req, res) => res.json(pharmacy));
app.get('/api/inventory', (_req, res) => res.json(inventory));
app.get('/api/analytics', (_req, res) => res.json({
  privacy: 'Analytics are for operational testing only; this assistant does not replace professional medical advice.',
  ...analytics,
  out_of_stock: inventory.filter((item) => item.quantity === 0).map((item) => item.name),
  admin_enabled: Boolean(process.env.ADMIN_TOKEN),
}));
app.get('/api/analytics/events', (_req, res) => res.json({ events: analytics.events }));
app.post('/api/chat', (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 1000) {
    trackRequestError('message_validation');
    return res.status(400).json({ error: 'Please send a message under 1,000 characters.' });
  }
  const result = localChat(message);
  analytics.messages += 1;
  trackIntent(result.intent);
  recordEvent('chat_message', { intent: result.intent });
  if (result.emergency_detected) {
    analytics.emergency_escalations += 1;
    analytics.safety_events += 1;
    recordEvent('emergency_escalation', { message });
  }
  if (result.escalate_to_pharmacist && !result.emergency_detected) {
    analytics.pharmacist_escalations = (analytics.pharmacist_escalations || 0) + 1;
    analytics.safety_events += 1;
    recordEvent('pharmacist_escalation', { intent: result.intent });
  }
  if (result.intent === 'medicine_availability') {
    const name = result.data?.name || 'unknown';
    analytics.requested_medicines[name] = (analytics.requested_medicines[name] || 0) + 1;
    if (result.data?.quantity === 0) {
      analytics.out_of_stock_requests[name] = (analytics.out_of_stock_requests[name] || 0) + 1;
      recordEvent('out_of_stock_request', { medicine: name });
    }
  }
  if (result.intent === 'medical_safety') {
    analytics.safety_events += 1;
    recordEvent('safety_warning', { message });
  }
  res.json(result);
});
app.post('/api/callback', (req, res) => {
  const { name, phone, reason, consent } = req.body || {};
  if (!consent || !name?.trim() || !phone?.trim()) {
    trackRequestError('callback_validation');
    return res.status(400).json({ error: 'Name, phone number, and consent are required.' });
  }
  console.info('Callback requested', { hasName: Boolean(name), hasPhone: Boolean(phone), reason: String(reason || '').slice(0, 80) });
  analytics.callback_requests += 1;
  recordEvent('callback_requested', { reason: String(reason || '').slice(0, 80) });
  res.status(201).json({ message: 'Your callback request has been sent to the pharmacist.' });
});
// Admin: export analytics as CSV
app.get('/api/analytics/export', requireAdmin, (_req, res) => {
  try {
    const csv = exportCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// Admin: reset analytics
app.post('/api/analytics/reset', requireAdmin, (_req, res) => {
  try {
    resetAnalytics();
    res.json({ message: 'Analytics reset' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset analytics' });
  }
});
app.listen(process.env.PORT || 3001, () => console.log('Pharmacy API listening'));
