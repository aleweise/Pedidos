// ===== Register Page JavaScript =====

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initPasswordStrength();
    initRegisterForm();
    initSocialRegister();
});

// ===== Password Toggles =====
function initPasswordToggles() {
    const toggleButtons = [
        { btn: 'togglePassword', input: 'password' },
        { btn: 'toggleConfirmPassword', input: 'confirmPassword' }
    ];

    toggleButtons.forEach(({ btn, input }) => {
        const toggleBtn = document.getElementById(btn);
        const passwordInput = document.getElementById(input);

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                const icon = toggleBtn.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
    });
}

// ===== Password Strength Indicator =====
function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = calculatePasswordStrength(password);
            updateStrengthIndicator(strength, strengthFill, strengthText);
        });
    }
}

function calculatePasswordStrength(password) {
    let score = 0;

    if (password.length === 0) return { score: 0, label: 'Fortaleza de contraseña', class: '' };
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Muy débil', class: 'weak' };
    if (score === 2) return { score: 2, label: 'Débil', class: 'fair' };
    if (score === 3) return { score: 3, label: 'Buena', class: 'good' };
    return { score: 4, label: 'Muy fuerte', class: 'strong' };
}

function updateStrengthIndicator(strength, fill, text) {
    // Remove all classes
    fill.className = 'strength-fill';
    text.className = 'strength-text';

    // Add appropriate class
    if (strength.class) {
        fill.classList.add(strength.class);
        text.classList.add(strength.class);
    }

    text.textContent = strength.label;
}

// ===== Register Form Handler =====
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    const submitBtn = form?.querySelector('.btn-submit');
    const card = document.querySelector('.register-card');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get form values
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsAccepted = document.getElementById('termsAccepted').checked;
            const newsletter = document.getElementById('newsletter').checked;

            // Validations
            if (!firstName || !lastName) {
                showNotification('Por favor, ingresa tu nombre completo', 'error');
                return;
            }

            if (!validateEmail(email)) {
                showNotification('Por favor, ingresa un correo válido', 'error');
                return;
            }

            if (password.length < 6) {
                showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showNotification('Las contraseñas no coinciden', 'error');
                return;
            }

            if (!termsAccepted) {
                showNotification('Debes aceptar los términos y condiciones', 'error');
                return;
            }

            // Show loading state
            submitBtn.classList.add('loading');

            try {
                // Simulate API call - Replace with your actual registration logic
                await simulateRegister({
                    firstName,
                    lastName,
                    email,
                    password,
                    newsletter
                });

                // Success animation
                card.classList.add('success');

                showNotification('¡Cuenta creada exitosamente!', 'success');

                // Redirect after successful registration (user is auto-logged in)
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

            } catch (error) {
                showNotification(error.message || 'Error al crear la cuenta', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });

        // Real-time password match validation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const passwordInput = document.getElementById('password');

        confirmPasswordInput.addEventListener('blur', () => {
            if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
                confirmPasswordInput.style.borderColor = '#ef4444';
            } else if (confirmPasswordInput.value) {
                confirmPasswordInput.style.borderColor = '#10b981';
            }
        });

        confirmPasswordInput.addEventListener('input', () => {
            confirmPasswordInput.style.borderColor = '';
        });
    }
}

// ===== Social Register Handlers =====
function initSocialRegister() {
    const socialButtons = {
        googleRegister: 'Google',
        facebookRegister: 'Facebook',
        appleRegister: 'Apple',
        twitterRegister: 'X'
    };

    Object.entries(socialButtons).forEach(([id, provider]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => handleSocialRegister(provider));
        }
    });
}

async function handleSocialRegister(provider) {
    const btn = document.getElementById(`${provider.toLowerCase()}Register`);
    const originalContent = btn.innerHTML;

    // Show loading state
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    btn.disabled = true;

    try {
        // Simulate social registration - Replace with your actual social auth logic
        await new Promise(resolve => setTimeout(resolve, 1500));

        showNotification(`Conectando con ${provider}...`, 'info');

        // Here you would integrate with your authentication provider
        // Examples:
        // - Firebase Auth: signInWithPopup(auth, new GoogleAuthProvider())
        // - Convex Auth: convex.auth.signIn(provider)
        // - Custom OAuth: redirect to OAuth endpoint

        console.log(`Social registration initiated with ${provider}`);

        // For demo purposes, show success after delay
        setTimeout(() => {
            showNotification(`¡Registrado con ${provider}!`, 'success');
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

// Supabase client is initialized in utils/supabaseClient.js and available as 'supabase' global

async function simulateRegister(userData) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    name: `${userData.firstName} ${userData.lastName}`
                }
            }
        });

        if (error) {
            if (error.message.includes('already registered')) throw new Error('Este correo electrónico ya está registrado');
            throw error;
        }

        if (!data.session) {
            // Email confirmation required
            throw new Error('Registro exitoso. Por favor revisa tu correo para confirmar la cuenta.');
        }

        // Store session (auto-login after registration)
        localStorage.setItem('authToken', data.session.access_token);

        const user = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata.name,
            role: 'user'
        };
        localStorage.setItem('currentUser', JSON.stringify(user));

        return { success: true, user, token: data.session.access_token };

    } catch (error) {
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
