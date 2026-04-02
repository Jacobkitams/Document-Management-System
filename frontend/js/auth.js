// Authentication Events Handling
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    // Toggle Forms
    showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Handle Login
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            await api.login(username, password);
            const user = await api.getMe();
            localStorage.setItem('dms_user', JSON.stringify(user));

            // Check if initApp exists (it should be global from dashboard.js)
            if (typeof initApp === 'function') {
                initApp();
                showToast('Welcome back, ' + user.username + '!', 'success');
            } else {
                window.location.reload(); // Fallback
            }
        } catch (error) {
            if (typeof showToast === 'function') {
                showToast(error.message, 'danger');
            } else {
                alert(error.message);
            }
        }
    });

    // Handle Registration
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            await api.register(username, email, password);
            if (typeof showToast === 'function') {
                showToast('Registration successful! Please login.', 'success');
            } else {
                alert('Registration successful!');
            }
            showLogin?.click();
        } catch (error) {
            if (typeof showToast === 'function') {
                showToast(error.message, 'danger');
            } else {
                alert(error.message);
            }
        }
    });

    // Initial App Check
    if (localStorage.getItem('dms_token') && typeof initApp === 'function') {
        initApp();
    }
});
