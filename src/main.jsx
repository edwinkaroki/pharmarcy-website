import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './dashboard.css';

const quickActions = [
  'Are you open now?',
  'Check paracetamol 500mg tablets',
  'Where are you located?',
  'How can I contact you?'
];

const api = (path, options = {}, token = '') =>
  fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

function AssistantFace({ small = false }) {
  return (
    <div
      className={`assistant-face ${small ? 'small' : ''}`}
      aria-hidden="true"
    >
      <span className="antenna" />
      <span className="assistant-eye left" />
      <span className="assistant-eye right" />
      <span className="assistant-smile" />
    </div>
  );
}

function AuthPanel({ onAuth, onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      const response = await api(
        `/api/auth/${mode === 'login' ? 'login' : 'register'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        }
      );
      const data = await response.json();
      if (!response.ok) return setError(data.error);
      onAuth(data);
    } catch {
      setError('Unable to reach the pharmacy server. Please try again.');
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="auth-panel">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          x
        </button>
        <p className="eyebrow">CAREPOINT ACCOUNT</p>
        <h2>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2>
        <p className="panel-copy">
          Save your prescriptions and follow every order from one place.
        </p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Your name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength="6"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit">
            {mode === 'login' ? 'Sign in' : 'Create account'}
            <span> -&gt;</span>
          </button>
        </form>
        <button
          className="switch-auth"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login'
            ? 'Need an account? Create one'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </div>
  );
}

function AdminPanel({ onClose }) {
  const [token, setToken] = useState(
    localStorage.getItem('carepoint_admin_token') || ''
  );
  const [form, setForm] = useState({
    email: 'admin@carepoint.test',
    password: 'admin123'
  });
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);

  const adminApi = (path, options = {}) => api(path, options, token);

  const load = async () => {
    const [analyticsResponse, prescriptionsResponse] = await Promise.all([
      adminApi('/api/admin/analytics'),
      adminApi('/api/admin/prescriptions')
    ]);
    if (!analyticsResponse.ok || !prescriptionsResponse.ok) {
      setError('Admin session expired. Please sign in again.');
      return;
    }
    setAnalytics(await analyticsResponse.json());
    setPrescriptions((await prescriptionsResponse.json()).prescriptions);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const login = async (event) => {
    event.preventDefault();
    try {
      const response = await api('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) return setError(data.error);
      localStorage.setItem('carepoint_admin_token', data.token);
      setToken(data.token);
      setError('');
    } catch {
      setError('Unable to reach the pharmacy server. Please try again.');
    }
  };

  const review = async (id, status) => {
    const response = await adminApi(
      `/api/admin/prescriptions/${id}/review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      }
    );
    if (response.ok) load();
  };

  if (!token || !analytics)
    return (
      <div className="modal-backdrop">
        <section className="auth-panel">
          <button className="modal-close" onClick={onClose}>
            x
          </button>
          <p className="eyebrow">STAFF PORTAL</p>
          <h2>Admin sign in.</h2>
          <p className="panel-copy">
            Review prescriptions and monitor CarePoint operations.
          </p>
          <form onSubmit={login}>
            <label>
              Admin email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit">
              Open dashboard <span>-&gt;</span>
            </button>
          </form>
          <p className="admin-hint">Demo credentials are prefilled.</p>
        </section>
      </div>
    );

  return (
    <div className="modal-backdrop">
      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">STAFF PORTAL</p>
            <h2>CarePoint overview.</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="admin-metrics">
          <div>
            <strong>{analytics.messages}</strong>
            <span>Chats</span>
          </div>
          <div>
            <strong>{analytics.orders}</strong>
            <span>Orders</span>
          </div>
          <div>
            <strong>{analytics.prescriptions_received}</strong>
            <span>Prescriptions</span>
          </div>
          <div>
            <strong>{analytics.prescriptions_pending}</strong>
            <span>Needs review</span>
          </div>
        </div>

        <h3>Prescription review queue</h3>
        {prescriptions.length ? (
          prescriptions.map((prescription) => (
            <article className="review-row" key={prescription.id}>
              <div>
                <strong>{prescription.filename}</strong>
                <span>
                  {prescription.type} / {Math.ceil(prescription.size / 1024)}{' '}
                  KB / {prescription.status}
                </span>
              </div>
              <div className="review-actions">
                {prescription.status === 'Received' && (
                  <>
                    <button
                      onClick={() => review(prescription.id, 'Approved')}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(prescription.id, 'Needs information')}
                    >
                      Needs info
                    </button>
                    <button
                      onClick={() => review(prescription.id, 'Rejected')}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="panel-copy">No prescription uploads yet.</p>
        )}

        <button
          className="admin-signout"
          onClick={() => {
            localStorage.removeItem('carepoint_admin_token');
            setToken('');
            setAnalytics(null);
          }}
        >
          Sign out admin
        </button>
      </section>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Hi, I am Pip. I can help with medicine availability, pharmacy hours, delivery, and pharmacist support.'
    }
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [upload, setUpload] = useState(null);
  const [uploadNotice, setUploadNotice] = useState('');
  const [orderNotice, setOrderNotice] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem('carepoint_dark_mode') === 'true'
  );

  const token = localStorage.getItem('carepoint_token') || '';
  const transportFee = cart.length ? 250 : 0;
  const cartSubtotal = cart.reduce(
    (total, product) => total + (product.price || 0),
    0
  );
  const cartTotal = cartSubtotal + transportFee;

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('carepoint_dark_mode', String(darkMode));
  }, [darkMode]);

  // Restore the signed-in account when the page is refreshed.
  useEffect(() => {
    if (!token) return;

    api('/api/auth/me', {}, token)
      .then(async (response) => {
        if (!response.ok) {
          localStorage.removeItem('carepoint_token');
          return;
        }

        const data = await response.json();
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('carepoint_token');
      });
  }, [token]);

  // Fetch catalog when search changes
  useEffect(() => {
    api(`/api/catalog?search=${encodeURIComponent(search)}`)
      .then((response) => response.json())
      .then((data) => setCatalog(data.products || []));
  }, [search]);

  // Fetch orders when user changes
  useEffect(() => {
    if (user) {
      api('/api/orders', {}, token)
        .then((response) => response.json())
        .then((data) => setOrders(data.orders || []));
    }
  }, [user, token]);

  const onAuth = (data) => {
    localStorage.setItem('carepoint_token', data.token);
    setUser(data.user);
    setAuthOpen(false);
  };

  const signOut = () => {
    localStorage.removeItem('carepoint_token');
    setUser(null);
    setOrders([]);
  };

  const send = async (value = text) => {
    if (!value.trim() || loading) return;
    setMessages((items) => [...items, { role: 'user', text: value }]);
    setText('');
    setLoading(true);
    try {
      const response = await api('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value })
      });
      const data = await response.json();
      setMessages((items) => [
        ...items,
        { role: 'bot', text: data.reply, emergency: data.emergency_detected }
      ]);
    } catch {
      setMessages((items) => [
        ...items,
        {
          role: 'bot',
          text: 'I cannot connect right now. Please call the pharmacy for assistance.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    if (!user) {
      setCartNotice(
        'Your basket is ready. Please create an account or sign in before adding items.'
      );
      window.setTimeout(() => setCartNotice(''), 3500);
      return;
    }

    setCart((items) => [...items, product]);
    setCartNotice(`${product.name} added to your order.`);
    window.setTimeout(() => setCartNotice(''), 3500);
  };

  const removeFromCart = (productIndex) => {
    setCart((items) => items.filter((_, index) => index !== productIndex));
  };

  const uploadPrescription = async (event) => {
    event.preventDefault();
    if (!user || !upload) return;
    const body = new FormData();
    body.append('file', upload);
    const response = await api('/api/prescriptions', { method: 'POST', body }, token);
    const data = await response.json();
    setUploadNotice(
      response.ok
        ? `${data.prescription.filename} received securely for review.`
        : data.error
    );
    if (response.ok) setUpload(null);
  };

  const placeOrder = async () => {
    if (!user) {
      setCartNotice(
        'To place your order, please create an account or sign in first.'
      );
      window.setTimeout(() => setCartNotice(''), 3500);
      return;
    }
    if (!cart.length) return;
    const response = await api(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(({ id, name, strength, form, price }) => ({
            id,
            name,
            strength,
            form,
            price
          })),
          subtotal: cartSubtotal,
          transport_fee: transportFee,
          total: cartTotal
        })
      },
      token
    );
    const data = await response.json();
    if (!response.ok) return setOrderNotice(data.error);
    setOrders((items) => [data.order, ...items]);
    setCart([]);
    setOrderNotice(`Order ${data.order.id} placed and marked Pending.`);
  };

  const advanceOrder = async (order) => {
    const response = await api(`/api/orders/${order.id}/advance`, { method: 'POST' }, token);
    const data = await response.json();
    if (response.ok) {
      setOrders((items) =>
        items.map((item) => (item.id === order.id ? data.order : item))
      );
    }
  };

  return (
    <main>
      <section className="site-shell" aria-label="CarePoint Pharmacy">
        {cartNotice && (
          <div className="cart-toast" role="status" aria-live="polite">
            <div>
              <strong>{user ? 'Added to order' : 'Account needed'}</strong>
              <span>{cartNotice}</span>
            </div>
            {user ? (
              <a href="#order-summary">View order</a>
            ) : (
              <button
                className="cart-account-action"
                type="button"
                onClick={() => {
                  setCartNotice('');
                  setAuthOpen(true);
                }}
              >
                Sign in / create account
              </button>
            )}
            <button
              type="button"
              onClick={() => setCartNotice('')}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="nav-bar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>
              carepoint
              <span className="brand-dot">.</span>
            </span>
          </div>
          <div className="nav-links">
            <a href="#catalog">Shop</a>
            <a href="#prescriptions">Prescriptions</a>
            <a href="#orders">Orders</a>
          </div>
          <div className="nav-actions">
            <button
              className="dark-mode-toggle"
              onClick={() => setDarkMode((enabled) => !enabled)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀' : '☾'}
            </button>
            <button className="admin-link" onClick={() => setAdminOpen(true)}>
              Staff
            </button>
            {user ? (
              <button className="account-button" onClick={signOut}>
                {user.name} / Sign out
              </button>
            ) : (
              <button
                className="nav-button"
                onClick={() => setAuthOpen(true)}
              >
                Sign in <span>-&gt;</span>
              </button>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">YOUR HEALTH, MADE SIMPLE</p>
            <h1>
              Good care starts
              <br />
              <em>with a conversation.</em>
            </h1>
            <p className="hero-intro">
              Trusted advice, everyday essentials, and care that feels personal.
              Browse our catalog or ask Pip for help.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => setChatOpen(true)}
              >
                Ask Pip a question <span>-&gt;</span>
              </button>
              <a className="text-link" href="#catalog">
                Shop medicines
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-label="Pharmacist illustration">
            <div className="sun-disc" />
            <div className="med-badge">
              CARE
              <br />
              FIRST
            </div>
            <div className="portrait-shape">
              <div className="portrait-hair" />
              <div className="portrait-head" />
              <div className="portrait-coat" />
              <div className="portrait-arm" />
            </div>
            <div className="floating-note note-one">
              <span>+ </span>Always here
              <br />
              for you
            </div>
            <div className="floating-note note-two">
              <strong>24/7</strong>
              <span>online support</span>
            </div>
          </div>
        </section>

        {/* Commerce Section */}
        <section className="commerce-section" id="catalog">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE CAREPOINT CATALOG</p>
              <h2>
                Everyday care,
                <br />
                <em>ready when you are.</em>
              </h2>
            </div>
            <div className="catalog-tools">
              <input
                aria-label="Search products"
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="cart-count">Cart {cart.length}</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="category-tabs">
            {['All', 'Pain relief', 'Hospital supplies', 'Wound care', 'Diagnostics', 'Clinical supplies'].map((item) => (
              <button
                className={category === item ? 'selected' : ''}
                key={item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="product-grid">
            {catalog
              .filter(
                (product) =>
                  category === 'All' || product.category === category
              )
              .map((product) => {
                const quantity = product.quantity ?? product.quantity_available ?? 0;
                const form = product.form || product.dosage_form;
                const prescription = product.prescription ?? product.prescription_required;

                return (
                  <article
                    className="product-card"
                    key={product.id || product.name}
                  >
                    <div
                      className={`product-visual category-${product.category
                        .toLowerCase()
                        .replaceAll(' ', '-')}`}
                    >
                      <span>
                        {product.category === 'Hospital supplies'
                          ? 'H+'
                          : product.category === 'Diagnostics'
                          ? 'Dx'
                          : product.category === 'Wound care'
                          ? 'W'
                          : 'Rx'}
                      </span>
                    </div>
                    <span className="product-category">
                      {product.category}
                    </span>
                    <h3>{product.name}</h3>
                    <p>
                      {product.strength} {form}
                    </p>
                    <div className="product-meta">
                      <strong>
                        KSh {product.price?.toLocaleString() || 'Ask'}
                      </strong>
                      <small>
                        {quantity > 0 ? `${quantity} in stock` : 'Out of stock'}{' '}
                        {prescription ? ' / Prescription' : ''}
                      </small>
                    </div>
                    <button
                      disabled={!quantity}
                      onClick={() => addToCart(product)}
                    >
                      {quantity ? 'Add to order +' : 'Unavailable'}
                    </button>
                  </article>
                );
              })}
          </div>

          {/* Order Bar */}
          <div className="order-bar" id="order-summary">
            <span>
              {cart.length
                ? `${cart.length} item${cart.length > 1 ? 's' : ''} ready`
                : 'Your order is empty'}
            </span>
            {cart.length > 0 && <strong>KSh {cartTotal.toLocaleString()}</strong>}
          </div>

          {cart.length > 0 && (
            <div className="cart-panel" aria-label="Your order summary">
              <div className="cart-panel-heading">
                <div>
                  <p className="eyebrow">YOUR ORDER</p>
                  <h3>Review before checkout.</h3>
                </div>
                <span>{cart.length} item{cart.length > 1 ? 's' : ''}</span>
              </div>

              <div className="cart-items">
                {cart.map((product, index) => (
                  <div className="cart-item" key={`${product.id}-${index}`}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.strength} {product.form || product.dosage_form}</span>
                    </div>
                    <strong>KSh {(product.price || 0).toLocaleString()}</strong>
                    <button
                      type="button"
                      onClick={() => removeFromCart(index)}
                      aria-label={`Remove ${product.name} from order`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart-totals">
                <span>Subtotal</span>
                <strong>KSh {cartSubtotal.toLocaleString()}</strong>
                <span>Transport</span>
                <strong>KSh {transportFee.toLocaleString()}</strong>
                <span className="cart-total-label">Total to pay</span>
                <strong className="cart-total-value">KSh {cartTotal.toLocaleString()}</strong>
              </div>

              <button className="primary-button" onClick={placeOrder}>
                Proceed to checkout <span>-&gt;</span>
              </button>
            </div>
          )}
        </section>

        {/* Workflow Grid - Prescriptions & Orders */}
        <section className="workflow-grid">
          <section className="workflow-card" id="prescriptions">
            <p className="eyebrow">PRESCRIPTION DESK</p>
            <h2>
              Send it once.
              <br />
              <em>We will handle the rest.</em>
            </h2>
            <p>
              Upload a clear image or PDF for the pharmacy team to review.
              Files are limited to 10 MB in this demo.
            </p>
            {user ? (
              <form className="upload-form" onSubmit={uploadPrescription}>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => setUpload(event.target.files[0])}
                  required
                />
                <button className="primary-button" type="submit">
                  Upload prescription <span>-&gt;</span>
                </button>
              </form>
            ) : (
              <button
                className="text-action"
                onClick={() => setAuthOpen(true)}
              >
                Sign in to upload -&gt;
              </button>
            )}
            {uploadNotice && <p className="success-note">{uploadNotice}</p>}
          </section>

          <section className="workflow-card" id="orders">
            <p className="eyebrow">ORDER TRACKING</p>
            <h2>
              Know where
              <br />
              <em>your care is.</em>
            </h2>
            {user ? (
              orders.length ? (
                orders.map((order) => (
                  <div className="order-card" key={order.id}>
                    <div>
                      <strong>{order.id}</strong>
                      <span>
                        {order.items.length} item
                        {order.items.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="status-steps">
                      {['Pending', 'Processing', 'Completed'].map((status) => (
                        <span
                          className={`status-${status.toLowerCase()} ${
                            status === order.status ? 'active' : ''
                          }`}
                          key={status}
                        >
                          {status}
                        </span>
                      ))}
                    </div>
                    {order.status !== 'Completed' && (
                      <button
                        className="text-action"
                        onClick={() => advanceOrder(order)}
                      >
                        Advance demo status -&gt;
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="panel-copy">
                  Your orders will appear here after checkout.
                </p>
              )
            ) : (
              <button
                className="text-action"
                onClick={() => setAuthOpen(true)}
              >
                Sign in to view orders -&gt;
              </button>
            )}
            {orderNotice && <p className="success-note">{orderNotice}</p>}
          </section>
        </section>

        {/* Service Strip */}
        <section className="service-strip">
          <div>
            <span className="service-icon">Rx</span>
            <div>
              <strong>Prescriptions</strong>
              <p>Fast, simple refills</p>
            </div>
          </div>
          <div>
            <span className="service-icon">+</span>
            <div>
              <strong>Expert advice</strong>
              <p>Care from real people</p>
            </div>
          </div>
          <div>
            <span className="service-icon">~</span>
            <div>
              <strong>Home delivery</strong>
              <p>Care, at your door</p>
            </div>
          </div>
          <div>
            <span className="service-icon">24</span>
            <div>
              <strong>Always connected</strong>
              <p>Ask us anything</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <span>carepoint pharmacy</span>
          <span>Mon - Sun, 8am - 8pm &nbsp; | &nbsp; +254 700 123 456</span>
        </footer>

        {/* Chat Widget */}
        <div className="chat-widget">
          {chatOpen ? (
            <section className="chat-panel" aria-label="Pip pharmacy assistant">
              <div className="chat-panel-head">
                <div className="pip-title">
                  <AssistantFace small />
                  <div>
                    <strong>Pip</strong>
                    <span>
                      <i /> Online assistant
                    </span>
                  </div>
                </div>
                <button
                  className="close-chat"
                  onClick={() => setChatOpen(false)}
                  aria-label="Minimize chat"
                >
                  -
                </button>
              </div>
              <div className="chat-intro">
                <span className="chat-kicker">PIP FROM CAREPOINT</span>
                <h2>
                  How can I help
                  <br />
                  you today?
                </h2>
              </div>
              <div className="chat-messages" aria-live="polite">
                {messages.map((message, index) => (
                  <article
                    className={`message ${message.role} ${
                      message.emergency ? 'urgent' : ''
                    }`}
                    key={index}
                  >
                    <span>
                      {message.role === 'bot' ? 'Pip' : 'You'}
                    </span>
                    <p>{message.text}</p>
                  </article>
                ))}
                {loading && <p className="typing">Pip is thinking...</p>}
              </div>
              <div className="quick">
                {quickActions.map((item) => (
                  <button key={item} onClick={() => send(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
              >
                <label className="sr-only" htmlFor="message">
                  Your message
                </label>
                <input
                  id="message"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Ask Pip anything..."
                />
                <button type="submit" disabled={loading}>
                  -&gt;
                </button>
              </form>
            </section>
          ) : (
            <button
              className="floating-assistant"
              onClick={() => setChatOpen(true)}
              aria-label="Open Pip pharmacy assistant"
            >
              <AssistantFace />
              <span className="chat-ping" />
            </button>
          )}
        </div>

        {/* Modals */}
        {authOpen && (
          <AuthPanel onAuth={onAuth} onClose={() => setAuthOpen(false)} />
        )}
        {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
