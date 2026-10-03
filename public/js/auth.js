// Auth Manager for Simple IoT World
document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, redirect to dashboard
  const savedUser = localStorage.getItem('iot_user');
  if (savedUser && !window.location.search.includes('logout=true')) {
    try {
      const user = JSON.parse(savedUser);
      if (user && user.name) {
        window.location.href = 'dashboard.html';
        return;
      }
    } catch (e) {
      localStorage.removeItem('iot_user');
    }
  }

  // Handle logout parameter cleanup
  if (window.location.search.includes('logout=true')) {
    localStorage.removeItem('iot_user');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // DOM Elements
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const authAlert = document.getElementById('authAlert');
  const authAlertMsg = document.getElementById('authAlertMsg');

  // Tab Switching
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => switchTab('login'));
    tabRegister.addEventListener('click', () => switchTab('register'));
  }

  function switchTab(mode) {
    hideAlert();
    if (mode === 'login') {
      tabLogin.classList.add('active', 'border-b-2', 'border-pink-500', 'text-pink-600', 'dark:text-pink-400', 'font-bold');
      tabLogin.classList.remove('text-gray-400', 'dark:text-gray-500');

      tabRegister.classList.remove('active', 'border-b-2', 'border-pink-500', 'text-pink-600', 'dark:text-pink-400', 'font-bold');
      tabRegister.classList.add('text-gray-500', 'dark:text-gray-400');

      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
    } else {
      tabRegister.classList.add('active', 'border-b-2', 'border-pink-500', 'text-pink-600', 'dark:text-pink-400', 'font-bold');
      tabRegister.classList.remove('text-gray-400', 'dark:text-gray-500');

      tabLogin.classList.remove('active', 'border-b-2', 'border-pink-500', 'text-pink-600', 'dark:text-pink-400', 'font-bold');
      tabLogin.classList.add('text-gray-500', 'dark:text-gray-400');

      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
    }
  }

  // Alert Helpers
  function showAlert(msg, isSuccess = false) {
    if (!authAlert) return;
    authAlert.classList.remove('hidden', 'bg-red-500/20', 'border-red-500', 'text-red-400', 'bg-emerald-500/20', 'border-emerald-500', 'text-emerald-400');
    if (isSuccess) {
      authAlert.classList.add('bg-emerald-500/20', 'border-emerald-500', 'text-emerald-400', 'dark:text-emerald-300');
    } else {
      authAlert.classList.add('bg-red-500/20', 'border-red-500', 'text-red-400', 'dark:text-red-300');
    }
    authAlertMsg.textContent = msg;
  }

  function hideAlert() {
    if (authAlert) authAlert.classList.add('hidden');
  }

  // Login Form Submission
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value.trim();
      const submitBtn = formLogin.querySelector('button[type="submit"]');

      if (!email || !password) {
        showAlert('Please enter both email and password.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Authenticating...';

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (data.success) {
          showAlert('Welcome back! Redirecting to Dashboard...', true);
          localStorage.setItem('iot_user', JSON.stringify(data.user));
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        } else {
          showAlert(data.message || 'Login failed. Please check credentials.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Dashboard';
        }
      } catch (err) {
        console.error('Login error:', err);
        showAlert('Network error connecting to backend.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Dashboard';
      }
    });
  }

  // Registration Form Submission
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value.trim();
      const submitBtn = formRegister.querySelector('button[type="submit"]');

      if (!name || !email || !password) {
        showAlert('Please fill in Name, Email, and Password.');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Creating Account...';

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        if (data.success) {
          showAlert('Registration successful! Redirecting...', true);
          localStorage.setItem('iot_user', JSON.stringify(data.user));
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          showAlert(data.message || 'Registration failed.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Free Account';
        }
      } catch (err) {
        console.error('Registration error:', err);
        showAlert('Network error connecting to backend.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Free Account';
      }
    });
  }

  // Quick Demo fill button helper
  window.fillDemoCredentials = function () {
    switchTab('login');
    document.getElementById('loginEmail').value = 'triveni@sbjain.edu.in';
    document.getElementById('loginPassword').value = 'password123';
  };
});
