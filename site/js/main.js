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

  /* ---------------------------------------------------------------
   * Downloads — data-driven from the GitHub release metadata
   * ---------------------------------------------------------------
   * The app updater's canonical metadata is `latest.json`, published at
   *   https://github.com/xianglun918/scan-lun/releases/latest/download/latest.json
   * (see src-tauri/tauri.conf.json `plugins.updater.endpoints`).
   *
   * We read the GitHub REST API instead of fetching latest.json directly,
   * for two reasons:
   *   1. latest.json only carries UPDATER bundles — for macOS that is the
   *      `.app.tar.gz`, not the user-facing `.dmg` this page links to.
   *   2. `releases/latest/download/*` assets are not served with CORS
   *      headers, so a browser fetch from this GitHub Pages origin is
   *      blocked. The REST API (api.github.com) sends
   *      `Access-Control-Allow-Origin: *` and lists every installer asset
   *      plus SHA256SUMS with its download URL.
   * ------------------------------------------------------------- */
  var RELEASE_API = "https://api.github.com/repos/xianglun918/scan-lun/releases/latest";

  // data-asset key -> filename matcher (`.sig` files are excluded by suffix)
  var ASSET_MATCHERS = {
    "darwin-dmg": /\.dmg$/,
    "windows-exe": /\.exe$/,
    "windows-msi": /\.msi$/,
    "linux-appimage": /\.AppImage$/,
    "linux-deb": /\.deb$/
  };

  function findAsset(assets, re) {
    for (var i = 0; i < assets.length; i++) {
      if (re.test(assets[i].name)) return assets[i];
    }
    return null;
  }

  fetch(RELEASE_API)
    .then(function (res) {
      if (!res.ok) throw new Error("release API " + res.status);
      return res.json();
    })
    .then(function (release) {
      var version = String(release.tag_name || "").replace(/^v/, "");
      var assets = release.assets || [];

      var versionEl = document.getElementById("latest-version");
      if (versionEl) versionEl.textContent = version ? "v" + version : "—";

      // Per-format + CTA download links.
      Object.keys(ASSET_MATCHERS).forEach(function (key) {
        var asset = findAsset(assets, ASSET_MATCHERS[key]);
        if (!asset) return;
        var els = document.querySelectorAll(
          '[data-asset="' + key + '"], [data-asset-cta="' + key + '"]'
        );
        els.forEach(function (el) {
          el.setAttribute("href", asset.browser_download_url);
        });
      });

      // SHA256SUMS link.
      var sums = findAsset(assets, /^SHA256SUMS$/);
      var sumsLink = document.getElementById("sha256sums-link");
      if (sums && sumsLink) sumsLink.setAttribute("href", sums.browser_download_url);
    })
    .catch(function () {
      // API unavailable → keep the static fallback links (releases/latest).
    });
})();
