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

document.addEventListener('DOMContentLoaded', () => {
    // Carousel Logic
    const track = document.getElementById('carouselTrack');
    const items = document.querySelectorAll('.carousel-item');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentIndex = 0;

    function updateCarousel() {
        if (!track || items.length === 0) return;
        const width = items[0].clientWidth;
        track.style.transform = `translateX(-${currentIndex * width}px)`;
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % items.length;
            updateCarousel();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            updateCarousel();
        });
    }

    // Auto-advance carousel
    if (items.length > 0) {
        setInterval(() => {
            currentIndex = (currentIndex + 1) % items.length;
            updateCarousel();
        }, 5000);
    }

    // Handle Resize
    window.addEventListener('resize', updateCarousel);

    // Mobile Menu
    const burger = document.getElementById('burger');
    const navLinks = document.getElementById('navLinks');

    if (burger) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = burger.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                burger.querySelector('i').classList.remove('fa-times');
                burger.querySelector('i').classList.add('fa-bars');
            });
        });
    }

    // Auth State Check
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const authToken = localStorage.getItem('authToken');
    const authLink = document.querySelector('a[href="login.html"]');

    if (currentUser && authToken) {
        // User is logged in
        if (authLink) {
            authLink.innerHTML = `<i class="fas fa-user-circle"></i> ${escapeHtml(currentUser.name)}`;
            authLink.href = '#';
            authLink.classList.remove('btn-primary');

            // Handle logout
            authLink.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('¿Deseas cerrar sesión?')) {
                    try {
                        await convexAction('mutation', 'auth:signOut', { token: authToken });
                    } catch (e) { console.warn('Logout error', e); }

                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    window.location.reload();
                }
            });
        }
    }

    // Form Submission Logic
    const form = document.getElementById('movieForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Check if user is logged in
            if (!currentUser || !authToken) {
                alert('Debes iniciar sesión para realizar un pedido.');
                window.location.href = 'login.html';
                return;
            }

            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            const movieName = document.getElementById('movieName').value;
            const movieYear = parseInt(document.getElementById('movieYear').value);
            const quality = document.getElementById('quality').value;
            const audio = document.querySelector('input[name="audio"]:checked').value;

            try {
                // Call real Convex mutation
                await convexAction('mutation', 'orders:create', {
                    token: authToken,
                    movieName: movieName,
                    movieYear: movieYear,
                    quality: quality,
                    audioPreference: audio,
                    notes: '' // Optional notes
                });

                submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Solicitud Enviada!';
                submitBtn.style.background = '#10b981'; // Success Green

                form.reset();

                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                }, 3000);

            } catch (error) {
                console.error('Order submission failed:', error);
                submitBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
                submitBtn.style.background = '#ef4444'; // Error Red
                alert('Hubo un error al enviar tu solicitud: ' + error.message);

                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
    }
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
