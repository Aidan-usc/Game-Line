// js/app.js
async function loadPartial(id, file) {
  const el = document.getElementById(id);
  if (!el) return null;
  try {
    // bump the query param to bust cache when you update the partial
    const res = await fetch(`${file}?v=1`);
    const html = await res.text();
    el.innerHTML = html;
    return el;
  } catch (err) {
    console.error(`Error loading ${file}`, err);
    return null;
  }
}

async function loadAllPartials() {
  // header & footer exist on all pages
  const headerP = loadPartial("header", "assets/partials/header.html");
  const footerP = loadPartial("footer", "assets/partials/footer.html");

  // rail only on league pages (where a #rail placeholder exists)
  let railLoaded = null;
  if (document.getElementById("rail")) {
    railLoaded = loadPartial("rail", "assets/partials/rail.html");
  }

  const [headerEl, footerEl, railEl] = await Promise.all([headerP, footerP, railLoaded]);

  // signal that header/footer are ready everywhere
  window.dispatchEvent(new CustomEvent("partials:ready"));

  // signal specifically when the rail is ready (league pages)
  if (railEl) {
    window.dispatchEvent(new CustomEvent("rail:ready"));
  }
}

// simple wallet display stub
let balance = 50;
function updateWalletDisplay() {
  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) balanceEl.textContent = `$${balance.toFixed(2)}`;
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadAllPartials();
  updateWalletDisplay();
});
