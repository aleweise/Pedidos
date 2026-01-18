document.addEventListener('DOMContentLoaded', async () => {
    // Check if we have a session (Supabase handles the hash fragment automatically)
    // However, onAuthStateChange is more reliable for password reset flows
    const { data: { session } } = await supabase.auth.getSession();

    // Setup Password Toggle
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleBtn.querySelector('i').classList.toggle('fa-eye');
            toggleBtn.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Form Handler
    const form = document.getElementById('updatePasswordForm');
    const messageEl = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = form.querySelector('.btn-submit');

        // Basic Validation
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Las contraseñas no coinciden', 'error');
            return;
        }

        // Show loading
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        submitBtn.disabled = true;

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            showMessage('¡Contraseña actualizada correctamente!', 'success');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            showMessage(error.message || 'Error al actualizar la contraseña', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    function showMessage(text, type) {
        messageEl.textContent = text;
        messageEl.style.display = 'block';
        messageEl.style.color = type === 'success' ? '#10b981' : '#ef4444';
    }

    // Listen for auth state changes just in case
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event == "PASSWORD_RECOVERY") {
            // User is in recovery mode, this is good.
        }
    });
});
