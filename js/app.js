async function loadPartial(id, file) {
  try {
    const res = await fetch(file);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;
  } catch (err) {
    console.error(`Error loading ${file}`, err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadPartial("header", "assets/partials/header.html");
  loadPartial("footer", "assets/partials/footer.html");
});

// Example wallet balance setup
let balance = 50;

function updateWalletDisplay() {
  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) balanceEl.textContent = `$${balance.toFixed(2)}`;
}

// Run on load
window.addEventListener("DOMContentLoaded", () => {
  loadPartial("header", "assets/partials/header.html").then(() => {
    updateWalletDisplay();
  });
});
