// ===== Login Page JavaScript =====

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle();
    initLoginForm();
    initSocialLogin();
});

// ===== Password Toggle =====
function initPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            const icon = toggleBtn.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
}

// ===== Login Form Handler =====
function initLoginForm() {
    const form = document.getElementById('loginForm');
    const submitBtn = form?.querySelector('.btn-submit');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            // Validate inputs
            if (!validateEmail(email)) {
                showNotification('Por favor, ingresa un correo válido', 'error');
                return;
            }

            if (password.length < 6) {
                showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            // Show loading state
            submitBtn.classList.add('loading');

            try {
                // Simulate API call - Replace with your actual authentication logic
                await simulateLogin(email, password);

                showNotification('¡Inicio de sesión exitoso!', 'success');

                // Store remember me preference
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                // Redirect after successful login based on role
                setTimeout(() => {
                    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    if (user.role === 'admin') {
                        window.location.href = 'admin/index.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1500);

            } catch (error) {
                showNotification(error.message || 'Error al iniciar sesión', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });

        // Auto-fill remembered email
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            document.getElementById('email').value = rememberedEmail;
            document.getElementById('rememberMe').checked = true;
        }
    }
}

// ===== Social Login Handlers =====
function initSocialLogin() {
    const socialButtons = {
        googleLogin: 'Google',
        facebookLogin: 'Facebook',
        appleLogin: 'Apple',
        twitterLogin: 'X'
    };

    Object.entries(socialButtons).forEach(([id, provider]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => handleSocialLogin(provider));
        }
    });
}

async function handleSocialLogin(provider) {
    const btn = document.getElementById(`${provider.toLowerCase()}Login`);
    const originalContent = btn.innerHTML;

    // Show loading state
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Conectando...</span>`;
    btn.disabled = true;

    try {
        // Simulate social login - Replace with your actual social auth logic
        await new Promise(resolve => setTimeout(resolve, 1500));

        showNotification(`Conectando con ${provider}...`, 'info');

        // Here you would integrate with your authentication provider
        // Examples:
        // - Firebase Auth: signInWithPopup(auth, new GoogleAuthProvider())
        // - Convex Auth: convex.auth.signIn(provider)
        // - Custom OAuth: redirect to OAuth endpoint

        console.log(`Social login initiated with ${provider}`);

        // For demo purposes, show success after delay
        setTimeout(() => {
            showNotification(`¡Conectado con ${provider}!`, 'success');
            // Redirect to main page
            // window.location.href = 'index.html';
        }, 500);

    } catch (error) {
        showNotification(`Error al conectar con ${provider}`, 'error');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

// ===== Utility Functions =====
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Convex HTTP Client Helper
async function convexAction(action, path, args = {}) {
    const CONVEX_URL = 'http://127.0.0.1:3210';
    try {
        const response = await fetch(`${CONVEX_URL}/api/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path, args }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error en el servidor');
        }

        const data = await response.json();

        if (data.status === 'error') {
            throw new Error(data.errorMessage);
        }
        return data.value;
    } catch (error) {
        console.error('Convex Error:', error);
        throw error;
    }
}

async function simulateLogin(email, password) {
    // Call real Convex mutation: auth:signIn
    try {
        const result = await convexAction('mutation', 'auth:signIn', {
            email,
            password
        });

        // Store session
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('currentUser', JSON.stringify(result.user));

        return { success: true, ...result };
    } catch (error) {
        // Human-friendly errors
        if (error.message.includes('inválidas')) throw new Error('Credenciales incorrectas');
        if (error.message.includes('desactivada')) throw new Error('Tu cuenta está desactivada');
        throw error;
    }
}

// ===== Notification System =====
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;

    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.95rem',
        fontWeight: '500',
        zIndex: '9999',
        animation: 'slideIn 0.3s ease',
        backdropFilter: 'blur(10px)'
    });

    // Type-specific styles
    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.9)', border: '#10b981' },
        error: { bg: 'rgba(239, 68, 68, 0.9)', border: '#ef4444' },
        info: { bg: 'rgba(99, 102, 241, 0.9)', border: '#6366f1' }
    };

    const color = colors[type] || colors.info;
    notification.style.background = color.bg;
    notification.style.border = `1px solid ${color.border}`;
    notification.style.color = 'white';

    // Add to DOM
    document.body.appendChild(notification);

    // Add animation keyframes if not exists
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Auto-remove after delay
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}
