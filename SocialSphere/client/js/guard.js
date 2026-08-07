/* Include AFTER api.js on every protected page.
   Renders the sidebar, highlights the current page, and redirects to
   login if there's no token. Call requireAuth() at the top of each
   protected page's inline script, before rendering any post/user data. */

const NAV_ITEMS = [
  { href: "dashboard.html", label: "Dashboard", icon: "🏠" },
  { href: "create_post.html", label: "Create Post", icon: "✍️" },
  { href: "schedule_post.html", label: "Schedule Post", icon: "🗓️" },
  { href: "posts.html", label: "My Posts", icon: "🗂️" },
  { href: "analytics.html", label: "Analytics", icon: "📊" },
  { href: "profile.html", label: "Profile", icon: "👤" },
  { href: "settings.html", label: "Settings", icon: "⚙️" },
];

function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function renderSidebar() {
  const mount = document.getElementById("sidebar-mount");
  if (!mount) return;

  const user = Auth.getUser() || { fullname: "Account", email: "" };
  const current = window.location.pathname.split("/").pop();

  const navHtml = NAV_ITEMS.map(
    (item) => `<a href="${item.href}" class="${item.href === current ? "active" : ""}">
        <span aria-hidden="true">${item.icon}</span> ${item.label}
      </a>`
  ).join("");

  mount.innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span class="mark">S</span> SocialSphere</div>
      <nav>${navHtml}</nav>
      <div class="spacer"></div>
      <div class="user-chip">
        <div class="avatar">${initials(user.fullname)}</div>
        <div>
          <div class="name">${user.fullname || "Account"}</div>
          <div class="email">${user.email || ""}</div>
        </div>
      </div>
      <button class="logout-btn" id="logout-btn">Log out</button>
    </aside>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => {
    Auth.clear();
    window.location.href = "login.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) return;
  renderSidebar();
});
