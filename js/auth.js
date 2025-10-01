// Placeholder Firebase Auth wrapper
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("authForm");
  const signupBtn = document.getElementById("signupBtn");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    console.log("Login with:", email, password);
    // TODO: Firebase login
  });

  signupBtn?.addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    console.log("Sign up with:", email, password);
    // TODO: Firebase signup
  });
});
