import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './dashboard.css';

const quickActions = ['Are you open now?', 'Check paracetamol 500mg tablets', 'Where are you located?', 'How can I contact you?', 'I want to speak to a pharmacist'];

function Dashboard({ onClose }) {
  const [metrics, setMetrics] = useState(null); const [events, setEvents] = useState([]);
  const load = async () => { const [metricsResponse, eventsResponse] = await Promise.all([fetch('/api/analytics'), fetch('/api/analytics/events')]); setMetrics(await metricsResponse.json()); setEvents((await eventsResponse.json()).events); };
  useEffect(() => { load(); }, []);
  if (!metrics) return <section className="dashboard"><p>Loading dashboard…</p></section>;
  return (
    <section className="dashboard">
      <div className="form-title">
        <h2>Safety & Usage Dashboard</h2>
        <button onClick={onClose}>Back to chat</button>
      </div>
      <p className="privacy">{metrics.privacy}</p>
      <div className="metrics">
        <div><b>{metrics.messages}</b><span>Chats</span></div>
        <div><b>{metrics.safety_events || 0}</b><span>Safety flags</span></div>
        <div><b>{metrics.emergency_escalations}</b><span>Emergencies</span></div>
        <div><b>{metrics.callback_requests}</b><span>Callbacks</span></div>
      </div>

      <h3>Intent breakdown</h3>
      <ul>
        {metrics.intent_counts && Object.keys(metrics.intent_counts).length ? Object.entries(metrics.intent_counts).map(([intent, count]) => (
          <li key={intent}><b>{intent.replaceAll('_', ' ')}</b>: {count}</li>
        )) : <li>No intents recorded yet</li>}
      </ul>

      <div style={{ marginTop: 12 }}>
        {!metrics.admin_enabled ? (
          <p style={{ color: '#a00' }}>Admin actions are currently disabled. Set the <b>ADMIN_TOKEN</b> environment variable and restart the server to enable CSV download and reset.</p>
        ) : (
          <>
            <button onClick={async () => {
              try {
                const token = window.prompt('Enter admin token to download CSV:');
                if (!token) return;
                const res = await fetch('/api/analytics/export', { headers: { 'x-admin-token': token } });
                if (!res.ok) return alert('Failed to download CSV: ' + (await res.json()).error);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'analytics-export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
              } catch (err) { alert('Download failed'); }
            }}>Download CSV (admin)</button>
            <button style={{ marginLeft: 8 }} onClick={async () => {
              if (!confirm('Reset analytics? This cannot be undone locally.')) return;
              try {
                const token = window.prompt('Enter admin token to reset analytics:');
                if (!token) return;
                const res = await fetch('/api/analytics/reset', { method: 'POST', headers: { 'x-admin-token': token } });
                const data = await res.json();
                if (!res.ok) return alert('Reset failed: ' + (data.error || 'unknown'));
                alert(data.message || 'Analytics reset');
                load();
              } catch (err) { alert('Reset failed'); }
            }}>Reset analytics (admin)</button>
          </>
        )}
      </div>

      <h3>Out of stock</h3>
      <p>{metrics.out_of_stock.join(', ') || 'None'}</p>

      <h3>Recent operational events</h3>
      <button onClick={load}>Refresh</button>
      <ul>{events.map((event, index) => (
        <li key={`${event.timestamp}-${index}`}><b>{event.type.replaceAll('_', ' ')}</b> · {new Date(event.timestamp).toLocaleString()}</li>
      ))}</ul>
    </section>
  );
}

function App() {
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Hello! I am the CarePoint Pharmacy assistant. I can help with pharmacy information and medicine availability.' }]);
  const [text, setText] = useState(''); const [loading, setLoading] = useState(false); const [showCallback, setShowCallback] = useState(false); const [notice, setNotice] = useState(''); const [dashboard, setDashboard] = useState(false);
  const send = async (value = text) => { if (!value.trim() || loading) return; setMessages((items) => [...items, { role: 'user', text: value }]); setText(''); setLoading(true); try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: value }) }); const data = await response.json(); setMessages((items) => [...items, { role: 'bot', text: data.reply, emergency: data.emergency_detected }]); if (data.escalate_to_pharmacist && !data.emergency_detected) setShowCallback(true); } catch { setMessages((items) => [...items, { role: 'bot', text: 'I cannot connect right now. Please call the pharmacy for assistance.' }]); } finally { setLoading(false); } };
  const callback = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch('/api/callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) }); const data = await response.json(); setNotice(data.message || data.error); if (response.ok) { event.currentTarget.reset(); setShowCallback(false); } };
  return <main><section className="app" aria-label="CarePoint Pharmacy chat"><div className="hero-banner"><div className="robot-card"><div className="robot-face"><div className="robot-eye left" /><div className="robot-eye right" /><div className="robot-mouth"></div></div><div className="robot-text"><strong>Hi there!</strong><p>Welcome to CarePoint Pharmacy. Ask me about medicines, pharmacy hours, delivery, or pharmacist help.</p></div></div></div><header><div><p className="eyebrow">CAREPOINT PHARMACY</p><h1>Pharmacy Assistant</h1><p className="online">● Online information assistant</p></div><div><button className="admin" onClick={() => setDashboard(true)}>Analytics</button><div className="emergency">Emergency? Call local emergency services now.</div></div></header>{dashboard ? <Dashboard onClose={() => setDashboard(false)} /> : <><div className="quick" aria-label="Common questions">{quickActions.map((item) => <button key={item} onClick={() => item.includes('speak') ? setShowCallback(true) : send(item)}>{item}</button>)}</div><section className="chat" aria-live="polite">{messages.map((message, index) => <article className={`message ${message.role} ${message.emergency ? 'urgent' : ''}`} key={index}><span>{message.role === 'bot' ? 'CarePoint' : 'You'}</span><p>{message.text}</p></article>)}{loading && <p className="typing">CarePoint is typing…</p>}</section><form className="composer" onSubmit={(event) => { event.preventDefault(); send(); }}><label className="sr-only" htmlFor="message">Your message</label><input id="message" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask about stock, hours, location…" maxLength="1000" /><button type="submit" disabled={loading}>Send</button></form>{showCallback && <form className="callback" onSubmit={callback}><div className="form-title"><h2>Request a pharmacist callback</h2><button type="button" onClick={() => setShowCallback(false)}>Close</button></div><label>Name<input name="name" required /></label><label>Phone number<input name="phone" type="tel" required /></label><label>Reason<input name="reason" /></label><label className="consent"><input name="consent" type="checkbox" value="true" required /> I consent to CarePoint using these details only to return my call.</label><button>Request callback</button></form>}{notice && <p className="notice">{notice}</p>}</>}<footer>This assistant provides pharmacy information only and does not replace professional medical advice. Please avoid sharing sensitive medical details.</footer></section></main>;
}
createRoot(document.getElementById('root')).render(<App />);
