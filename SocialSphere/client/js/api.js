/* Core API helper: talks to the Express backend, keeps the JWT in
   localStorage, and gives every page a single place to handle errors. */

const API_BASE = "/api";

const Auth = {
  getToken() { return localStorage.getItem("ss_token"); },
  setToken(token) { localStorage.setItem("ss_token", token); },
  getUser() {
    const raw = localStorage.getItem("ss_user");
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) { localStorage.setItem("ss_user", JSON.stringify(user)); },
  clear() {
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_user");
  },
  isLoggedIn() { return !!this.getToken(); },
};

async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && Auth.getToken()) {
    headers["Authorization"] = `Bearer ${Auth.getToken()}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Can't reach the server. Make sure the backend is running.");
  }

  let data = {};
  try { data = await res.json(); } catch (_) { /* empty body */ }

  if (res.status === 401 && auth) {
    Auth.clear();
    window.location.href = "login.html";
    return;
  }

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}

const Api = {
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: payload, auth: false }),
  forgotPassword: (email) => apiRequest("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (payload) => apiRequest("/auth/reset-password", { method: "POST", body: payload, auth: false }),
  me: () => apiRequest("/auth/me"),
  updateProfile: (payload) => apiRequest("/auth/me", { method: "PUT", body: payload }),
  updateSettings: (payload) => apiRequest("/auth/settings", { method: "PUT", body: payload }),

  listPosts: (status) => apiRequest(`/posts${status ? `?status=${status}` : ""}`),
  getPost: (id) => apiRequest(`/posts/${id}`),
  createPost: (payload) => apiRequest("/posts", { method: "POST", body: payload }),
  updatePost: (id, payload) => apiRequest(`/posts/${id}`, { method: "PUT", body: payload }),
  deletePost: (id) => apiRequest(`/posts/${id}`, { method: "DELETE" }),

  analyticsSummary: () => apiRequest("/analytics/summary"),
};

/* ---------- Small UI helpers shared across pages ---------- */

function toast(message, type = "info") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showAlert(el, message, type = "error") {
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
}

function hideAlert(el) {
  if (!el) return;
  el.className = "alert";
}

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d)) return dateStr;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
