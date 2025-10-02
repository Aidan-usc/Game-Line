// js/app.js
async function loadPartial(id, file, v = 1) {
  const mount = document.getElementById(id);
  if (!mount) return null;
  try {
    const res = await fetch(`${file}?v=${v}`);
    if (!res.ok) throw new Error(`${file} ${res.status}`);
    const html = await res.text();
    mount.innerHTML = html;
    return mount.firstElementChild || mount;
  } catch (err) {
    console.error(`Error loading ${file}`, err);
    return null;
  }
}

async function loadAllPartials() {
  const headerP = loadPartial("header", "assets/partials/header.html", 1);
  const footerP = loadPartial("footer", "assets/partials/footer.html", 1);

  let railP = null;
  if (document.getElementById("rail")) {
    railP = loadPartial("rail", "assets/partials/rail.html", 1);
  }

  const [headerEl, footerEl, railEl] = await Promise.all([headerP, footerP, railP]);

  // wallet stub
  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) balanceEl.textContent = `$${(50).toFixed(2)}`;

  // let pages hook into the rail after it exists
  if (railEl) window.dispatchEvent(new CustomEvent("rail:ready"));
}

// fixed-header shadow (optional)
window.addEventListener("scroll", () => {
  const hdr = document.querySelector(".site-header");
  if (!hdr) return;
  hdr.classList.toggle("scrolled", window.scrollY > 2);
});

window.addEventListener("DOMContentLoaded", loadAllPartials);

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

// add a soft shadow to the fixed header once the page scrolls
window.addEventListener("scroll", () => {
  const hdr = document.querySelector(".site-header");
  if (!hdr) return;
  hdr.classList.toggle("scrolled", window.scrollY > 2);
});



