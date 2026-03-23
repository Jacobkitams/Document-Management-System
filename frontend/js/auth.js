document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');

    // UI Toggle
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Login Handle
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            await api.login(username, password);
            const user = await api.getMe();
            localStorage.setItem('dms_user', JSON.stringify(user));
            showToast('Welcome back, ' + user.username + '!');
            initApp();
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });

    // Register Handle
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            await api.register(username, email, password);
            showToast('Registration successful! Please login.');
            showLogin.click();
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });

    // Logout Handle
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('dms_token');
        localStorage.removeItem('dms_user');
        window.location.reload();
    });

    // Initial check
    if (localStorage.getItem('dms_token')) {
        initApp();
    }
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMsg.textContent = message;
    if (type === 'danger') {
        toastIcon.className = 'fas fa-exclamation-circle';
        toastIcon.style.color = 'var(--danger)';
    } else {
        toastIcon.className = 'fas fa-check-circle';
        toastIcon.style.color = 'var(--secondary)';
    }

    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

window.showToast = showToast; // Make globally accessible
