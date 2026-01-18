document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('errorMessage');

    initForgotPassword();

    // Toggle Password Visibility
    document.querySelector('.toggle-password')?.addEventListener('click', function () {
        const input = this.previousElementSibling;
        // ... (rest of password toggle logic)
        if (input.type === 'password') {
            input.type = 'text';
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        }
    });

    function initForgotPassword() {
        const forgotLink = document.querySelector('.forgot-password');
        if (forgotLink) {
            forgotLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const emailComp = document.getElementById('email');
                const defaultEmail = emailComp ? emailComp.value : '';

                const email = prompt('Ingresa tu tu correo de administrador para restablecer la contraseña:', defaultEmail);

                if (email) {
                    try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                            redirectTo: window.location.origin + '/update-password.html'
                        });

                        if (error) throw error;
                        alert('Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
                    } catch (error) {
                        console.error(error);
                        alert('Error al solicitar restablecimiento: ' + error.message);
                    }
                }
            });
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerHTML;

            showError(''); // Clear previous errors
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            btn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                // 1. Sign In
                const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (authError) throw authError;
                if (!user) throw new Error('No se pudo iniciar sesión');

                // 2. Check Admin Role
                // We fetch the profile to check the role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    // If we can't read the profile, it might be due to RLS blocking non-admins, 
                    // which implicitly means not an admin if the policy is correct.
                    // Or it could be a connection error.
                    console.error('Profile check error:', profileError);
                    throw new Error('No se pudo verificar el nivel de acceso.');
                }

                if (profile?.role !== 'admin') {
                    // Sign out immediately if not admin
                    await supabase.auth.signOut();
                    throw new Error('ACCESO DENEGADO: No tienes permisos de administrador.');
                }

                // 3. Success
                localStorage.setItem('adminUser', JSON.stringify({ email: user.email, ...profile }));
                window.location.href = 'index.html'; // Redirect to Admin Dashboard

            } catch (error) {
                console.error('Login error:', error);
                let msg = error.message;
                if (msg.includes('Invalid login')) msg = 'Credenciales incorrectas';
                showError(msg);

                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    function showError(msg) {
        if (!msg) {
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';
            return;
        }
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }
});
