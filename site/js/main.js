/* scan-lun landing page — interactions
 * - mobile nav (hamburger) with a11y states
 * - scroll-reveal via IntersectionObserver (gated on prefers-reduced-motion)
 * - dynamic footer year
 */
(function () {
  "use strict";

  var docEl = document.documentElement;
  docEl.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
   * Mobile navigation
   * ------------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("mobile-menu");

  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menu.inert = true;
    menu.classList.remove("open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "打开菜单");
    }
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.hidden;
      menu.hidden = !open;
      menu.inert = !open;
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });

    // Close after navigating to a section
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    // Close when tapping outside the header
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".site-header")) closeMenu();
    });

    // Close when resizing up to desktop layout
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  /* ---------------------------------------------------------------
   * Scroll reveal (staggered, via IntersectionObserver)
   * ------------------------------------------------------------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  // Stagger children inside a reveal-group
  document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
    var items = group.querySelectorAll("[data-reveal]");
    items.forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", Math.min(i * 90, 540) + "ms");
    });
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------
   * Footer year
   * ------------------------------------------------------------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
