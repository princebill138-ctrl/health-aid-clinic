// ── API BASE ──
const API = (() => {
 const BASE = 'https://health-aid-clinic.onrender.com/api';

  const headers = () => {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const handle = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  };

  return {
    get:    (url)         => fetch(`${BASE}${url}`, { headers: headers() }).then(handle),
    post:   (url, body)   => fetch(`${BASE}${url}`, { method: 'POST',   headers: headers(), body: JSON.stringify(body) }).then(handle),
    put:    (url, body)   => fetch(`${BASE}${url}`, { method: 'PUT',    headers: headers(), body: JSON.stringify(body) }).then(handle),
    patch:  (url, body)   => fetch(`${BASE}${url}`, { method: 'PATCH',  headers: headers(), body: JSON.stringify(body) }).then(handle),
    delete: (url)         => fetch(`${BASE}${url}`, { method: 'DELETE', headers: headers() }).then(handle),
  };
})();

// ── AUTH ──
const Auth = {
  getUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
  getToken: () => localStorage.getItem('token'),
  isLoggedIn: () => !!localStorage.getItem('token'),
  isAdmin: () => Auth.getUser()?.role === 'admin',
  logout: () => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/pages/login.html'; },
  requireAuth: () => { if (!Auth.isLoggedIn()) window.location.href = '/pages/login.html'; },
};

// ── TOAST ──
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'default', duration = 3500) {
    this.init();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = {
      success: '<i class="fa-solid fa-circle-check"></i>',
      error: '<i class="fa-solid fa-circle-xmark"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
      default: '<i class="fa-solid fa-circle-info"></i>'
    };
    t.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
    this.container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error:   (msg) => Toast.show(msg, 'error'),
  warning: (msg) => Toast.show(msg, 'warning'),
};

// ── MODAL ──
const Modal = {
  open(id)  { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAll() { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); },
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});

// ── SIDEBAR SETUP ──
function setupSidebar() {
  const user = Auth.getUser();
  if (!user) return;

  // Fill user info
  const nameEls = document.querySelectorAll('[data-user-name]');
  const roleEls = document.querySelectorAll('[data-user-role]');
  const avatarEls = document.querySelectorAll('[data-user-avatar]');
  nameEls.forEach(el => el.textContent = user.fullName || user.username);
  roleEls.forEach(el => el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1));
  avatarEls.forEach(el => el.textContent = (user.fullName || user.username).charAt(0).toUpperCase());

  // Mobile toggle
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) sidebar.classList.remove('open');
    });
  }

  // Active nav link
  const current = window.location.pathname;
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    if (a.getAttribute('href') && current.includes(a.getAttribute('href').replace('../pages/', '').replace('.html', ''))) {
      a.classList.add('active');
    }
  });

  // Logout
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });

  // Date in topbar
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Hide admin-only elements for non-admins
  if (!Auth.isAdmin()) {
    document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'none');
  }
}

// ── HELPERS ──
const Fmt = {
  date: (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  datetime: (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
  currency: (n) => `GH₵ ${(Number(n) || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  badge: (status, map) => {
    const cls = map[status] || 'badge-brown';
    return `<span class="badge ${cls}">${status}</span>`;
  },
};

const statusBadge = {
  paid:       'badge-success',
  pending:    'badge-warning',
  partial:    'badge-info',
  cancelled:  'badge-danger',
  scheduled:  'badge-info',
  completed:  'badge-success',
  'no-show':  'badge-danger',
  present:    'badge-success',
  absent:     'badge-danger',
  late:       'badge-warning',
  'half-day': 'badge-brown',
};

function getFormData(formEl) {
  const fd = new FormData(formEl);
  const obj = {};
  fd.forEach((v, k) => { obj[k] = v; });
  return obj;
}

function fillForm(formEl, data) {
  Object.entries(data).forEach(([k, v]) => {
    const el = formEl.elements[k];
    if (!el) return;
    if (el.type === 'date' && v) el.value = v.slice(0, 10);
    else el.value = v ?? '';
  });
}

// ── RUN ON LOAD ──
document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  setupSidebar();
});
