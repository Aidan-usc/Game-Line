// js/auth.js
(function () {
  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));

  const tabLogin  = q('#tabLogin');
  const tabSignup = q('#tabSignup');
  const panelLogin  = q('#panelLogin');
  const panelSignup = q('#panelSignup');
  const formLogin   = q('#formLogin');
  const formSignup  = q('#formSignup');
  const goSignup = q('#goSignup');
  const goLogin  = q('#goLogin');
  const errBox   = q('#authError');

  function show(tab){
    const isLogin = (tab === 'login');
    tabLogin.classList.toggle('active', isLogin);
    tabSignup.classList.toggle('active', !isLogin);
    panelLogin.hidden  = !isLogin;
    panelSignup.hidden = isLogin;
    // update hash (so header links can go to /auth.html#login or #signup)
    const newHash = isLogin ? '#login' : '#signup';
    if (location.hash !== newHash) history.replaceState(null, '', newHash);
    // clear any visible errors
    errBox.textContent = ''; errBox.classList.remove('show');
  }

  // Init from hash
  function initFromHash(){
    const h = (location.hash || '#login').replace('#','');
    show(h === 'signup' ? 'signup' : 'login');
  }

  tabLogin.addEventListener('click', () => show('login'));
  tabSignup.addEventListener('click', () => show('signup'));
  goSignup.addEventListener('click', (e) => { e.preventDefault(); show('signup'); });
  goLogin.addEventListener('click', (e) => { e.preventDefault(); show('login'); });
  window.addEventListener('hashchange', initFromHash);

  // Placeholder API calls (replace later)
  async function apiLogin({ email, password }) {
    // TODO: replace with real POST /login
    await new Promise(r => setTimeout(r, 300));
    throw new Error("Login isn’t wired yet. Connect to your backend when ready.");
  }
  async function apiSignup({ email, display_name, password }) {
    // TODO: replace with real POST /signup
    await new Promise(r => setTimeout(r, 300));
    throw new Error("Sign-up isn’t wired yet. Connect to your backend when ready.");
  }

  // Helpers
  function showError(msg){
    errBox.textContent = msg;
    errBox.classList.add('show');
  }
  function clearError(){ errBox.textContent = ''; errBox.classList.remove('show'); }

  // LOGIN submit
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); clearError();
    const email = e.target.email.value.trim().toLowerCase();
    const password = e.target.password.value;

    if (!email || !password) return showError("Please enter your email and password.");
    try {
      await apiLogin({ email, password });
      // On success: redirect or update UI
      // location.href = '/'; // uncomment when wired
    } catch (err) {
      showError(err.message || "Unable to sign in.");
    }
  });

  // SIGNUP submit
  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault(); clearError();
    const email = e.target.email.value.trim().toLowerCase();
    const display_name = e.target.display_name.value.trim();
    const pw1 = e.target.password.value;
    const pw2 = e.target.password2.value;
    const tos = q('#signupTos').checked;

    if (!email || !display_name || !pw1 || !pw2) return showError("Please fill out all fields.");
    if (pw1.length < 8) return showError("Password must be at least 8 characters.");
    if (pw1 !== pw2) return showError("Passwords do not match.");
    if (!tos) return showError("Please agree to the Privacy Policy & Terms.");

    try {
      await apiSignup({ email, display_name, password: pw1 });
      // On success you could auto-switch to login:
      // show('login');
      // Or redirect home after wiring:
      // location.href = '/';
    } catch (err) {
      showError(err.message || "Unable to create your account.");
    }
  });

  initFromHash();
})();
