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
