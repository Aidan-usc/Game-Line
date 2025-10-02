// js/app.js
(function () {
  async function loadPartial(id, file, v = 1) {
    const mount = document.getElementById(id);
    if (!mount) return null;
    try {
      const res = await fetch(`${file}?v=${v}`);
      if (!res.ok) throw new Error(`${file} ${res.status}`);
      const html = await res.text();
      mount.innerHTML = html;
      return mount.firstElementChild || mount; // return inserted root element
    } catch (err) {
      console.error(`Error loading ${file}`, err);
      return null;
    }
  }

  async function loadAllPartials() {
    // Always load header/footer
    const headerP = loadPartial("header", "assets/partials/header.html", 1);
    const footerP = loadPartial("footer", "assets/partials/footer.html", 1);

    // Load rail only if the page has a #rail mount
    let railP = null;
    if (document.getElementById("rail")) {
      railP = loadPartial("rail", "assets/partials/rail.html", 1);
    }

    const [headerEl, footerEl, railEl] = await Promise.all([headerP, footerP, railP]);

    // Let pages know header/footer are ready (optional)
    window.dispatchEvent(new CustomEvent("partials:ready"));

    // Wallet stub
    updateWalletDisplay(50);

    // Let league pages init AFTER rail exists
    if (railEl) {
      window.dispatchEvent(new CustomEvent("rail:ready"));
    }
  }

  function updateWalletDisplay(balance) {
    const el = document.getElementById("wallet-balance");
    if (el) el.textContent = `$${Number(balance).toFixed(2)}`;
  }

  // Fixed-header shadow
  window.addEventListener("scroll", () => {
    const hdr = document.querySelector(".site-header");
    if (!hdr) return;
    hdr.classList.toggle("scrolled", window.scrollY > 2);
  });

  window.addEventListener("DOMContentLoaded", loadAllPartials);
})();
