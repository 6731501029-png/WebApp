(() => {
  const initNavbar = () => {
    const nav = document.querySelector(".mfu-navbar");
    if (!nav) return;

    const toggle = nav.querySelector("[data-mfu-nav-toggle]");
    const menu = nav.querySelector("[data-mfu-nav-menu]");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    const current = (location.pathname || "").split("/").pop() || "";
    nav.querySelectorAll(".mfu-navbar__link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      const target = href.split("/").pop();
      if (target && target === current) a.classList.add("is-active");
    });
  };

  const initLogout = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-action='logout']");
      if (!btn) return;

      const clear = btn.getAttribute("data-clear") || "";
      if (clear) {
        clear
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((key) => localStorage.removeItem(key));
      }

      const href = btn.getAttribute("data-logout-href");
      if (href) window.location.href = href;
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initLogout();
  });
})();
