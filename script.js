// Supabase client is initialized in utils/supabaseClient.js and available as 'supabase' global


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
            authLink.href = 'my-orders.html'; // Go to orders page
            authLink.classList.remove('btn-primary');

            // Create a separate logout button in the menu if possible, 
            // OR finding the closest container to append a logout link.
            // For now, let's just create a logout link next to it if we are in the navLinks container

            // Check if we haven't already added a logout button
            if (!document.getElementById('logoutBtn')) {
                const logoutBtn = document.createElement('a');
                logoutBtn.id = 'logoutBtn';
                logoutBtn.href = '#';
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
                logoutBtn.title = 'Cerrar Sesión';
                logoutBtn.style.marginLeft = '10px';

                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (confirm('¿Deseas cerrar sesión?')) {
                        try {
                            await supabase.auth.signOut();
                        } catch (e) { console.warn('Logout error', e); }

                        localStorage.removeItem('authToken');
                        localStorage.removeItem('currentUser');
                        window.location.href = 'index.html';
                    }
                });

                authLink.parentNode.insertBefore(logoutBtn, authLink.nextSibling);
            }
        }
    }

    // URL Params for Pre-filling (from Catalog)
    const urlParams = new URLSearchParams(window.location.search);
    const movieParam = urlParams.get('movie');
    const yearParam = urlParams.get('year');

    if (movieParam) {
        const nameInput = document.getElementById('movieName');
        if (nameInput) nameInput.value = movieParam;

        // Use history API to remove params without refresh
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    if (yearParam) {
        const yearInput = document.getElementById('movieYear');
        if (yearInput && yearParam !== 'N/A') yearInput.value = yearParam;
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
                // Call Supabase insert
                const { data: user } = await supabase.auth.getUser();
                if (!user || !user.user) throw new Error('Usuario no autenticado');

                const { error } = await supabase.from('orders').insert([
                    {
                        user_id: user.user.id,
                        movie_name: movieName,
                        movie_year: movieYear || null,
                        quality: quality,
                        audio_preference: audio,
                    }
                ]);

                if (error) throw error;

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
    // TMDB Autocomplete Logic
    const movieInput = document.getElementById('movieName');
    const suggestionsBox = document.getElementById('suggestions');
    const yearInput = document.getElementById('movieYear');

    if (movieInput && suggestionsBox) {
        let debounceTimer;

        movieInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(debounceTimer);

            if (query.length < 2) {
                suggestionsBox.classList.remove('active');
                return;
            }

            debounceTimer = setTimeout(async () => {
                const results = await window.searchMovies(query);
                renderSuggestions(results);
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!movieInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.classList.remove('active');
            }
        });

        function renderSuggestions(movies) {
            if (movies.length === 0) {
                suggestionsBox.classList.remove('active');
                return;
            }

            suggestionsBox.innerHTML = movies.slice(0, 5).map(movie => {
                const poster = movie.poster_path
                    ? `${window.TMDB_IMAGE_BASE_URL}${movie.poster_path}`
                    : 'https://via.placeholder.com/40x60?text=No+Img';

                const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

                return `
                    <div class="suggestion-item" onclick="selectMovie('${escapeHtml(movie.title)}', '${year}')">
                        <img src="${poster}" alt="${escapeHtml(movie.title)}" class="suggestion-poster">
                        <div class="suggestion-info">
                            <h4>${escapeHtml(movie.title)}</h4>
                            <p>${year}</p>
                        </div>
                    </div>
                `;
            }).join('');

            suggestionsBox.classList.add('active');
        }

        window.selectMovie = function (title, year) {
            movieInput.value = title;
            if (year && year !== 'N/A' && yearInput) {
                yearInput.value = year;
            }
            suggestionsBox.classList.remove('active');
        };
    }
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
