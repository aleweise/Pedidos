// ===== Movies Management JavaScript =====

let movies = [];
let currentMovieId = null;

// ===== Strict Admin Auth Check =====
async function checkAdminAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) throw new Error('No session');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            throw new Error('Unauthorized');
        }
    } catch (e) {
        window.location.href = 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    initSidebar();
    initLogout();
    initEventListeners();
    fetchGenres();
    fetchAndRenderMovies();
});

function initSidebar() {
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });
}

function initLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

function initEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', debounce(fetchAndRenderMovies, 500));
    document.getElementById('filterGenre')?.addEventListener('change', fetchAndRenderMovies);
    document.getElementById('filterAvailability')?.addEventListener('change', fetchAndRenderMovies);

    document.getElementById('addMovieBtn')?.addEventListener('click', () => openMovieModal());
    document.getElementById('closeModal')?.addEventListener('click', closeMovieModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeMovieModal);
    document.getElementById('movieForm')?.addEventListener('submit', handleMovieSubmit);

    // TMDB Search Listeners
    document.getElementById('tmdbSearchBtn')?.addEventListener('click', handleTMDBSearch);
    document.getElementById('tmdbSearchInput')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleTMDBSearch();
    });

    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete')?.addEventListener('click', confirmDeleteMovie);
}

async function fetchGenres() {
    try {
        const { data, error } = await supabase
            .from('movies')
            .select('genre');

        if (error) throw error;

        // Get unique genres
        const genres = [...new Set(data.map(m => m.genre).filter(Boolean))];

        const select = document.getElementById('filterGenre');
        // Clear existing except first (All)
        while (select.options.length > 1) {
            select.remove(1);
        }

        genres.sort().forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            select.appendChild(opt);
        });
    } catch (e) {
        console.warn('Error loading genres', e);
    }
}

async function fetchAndRenderMovies() {
    const search = document.getElementById('searchInput')?.value?.trim();
    const genre = document.getElementById('filterGenre')?.value || undefined;
    let isAvailable = undefined;
    const availVal = document.getElementById('filterAvailability')?.value;
    if (availVal !== '') {
        isAvailable = availVal === 'true';
    }

    const grid = document.getElementById('moviesGrid');

    try {
        let query = supabase.from('movies').select('*');

        if (genre) query = query.eq('genre', genre);
        if (isAvailable !== undefined) query = query.eq('is_available', isAvailable);

        // Supabase doesn't have a simple "search" for all fields, typically we use ilike on specific columns
        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        movies = data.map(m => ({
            ...m,
            imageUrl: m.image_url,
            isAvailable: m.is_available
        }));

        renderMovies(movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        grid.innerHTML = '<div class="loading-placeholder error-text"><i class="fas fa-exclamation-circle"></i><p>Error cargando películas</p></div>';
    }
}


function renderMovies(moviesToRender) {
    const grid = document.getElementById('moviesGrid');
    if (!moviesToRender || moviesToRender.length === 0) {
        grid.innerHTML = '<div class="loading-placeholder"><i class="fas fa-video"></i><p>No se encontraron películas</p></div>';
        return;
    }

    grid.innerHTML = moviesToRender.map(m => `
        <div class="movie-card">
            <div class="movie-poster">
                ${m.imageUrl ? `<img src="${m.imageUrl}" alt="${escapeHtml(m.title)}">` : '<i class="fas fa-film"></i>'}
                <span class="availability-badge ${m.isAvailable ? 'available' : 'unavailable'}">
                    ${m.isAvailable ? 'Disponible' : 'No disponible'}
                </span>
            </div>
            <div class="movie-info">
                <h3 title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</h3>
                <div class="movie-meta">
                    <span><i class="fas fa-calendar"></i> ${m.year || '-'}</span>
                    <span><i class="fas fa-tag"></i> ${escapeHtml(m.genre || 'Sin género')}</span>
                </div>
                <div class="movie-qualities">
                    ${(m.qualities || []).map(q => `<span class="quality-tag">${q.toUpperCase()}</span>`).join('')}
                </div>
                <div class="movie-actions">
                    <button class="btn-icon edit" onclick="openMovieModal('${m.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon ${m.isAvailable ? 'delete' : 'view'}" onclick="toggleAvailability('${m.id}')" title="${m.isAvailable ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${m.isAvailable ? 'ban' : 'check'}"></i>
                    </button>
                    <button class="btn-icon delete" onclick="openDeleteModal('${m.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

window.openMovieModal = function (id = null) {
    currentMovieId = id;
    const form = document.getElementById('movieForm');

    if (id) {
        const m = movies.find(x => x.id === id);
        if (!m) return;
        document.getElementById('modalTitle').textContent = 'Editar Película';
        document.getElementById('movieId').value = m.id;
        document.getElementById('movieTitle').value = m.title;
        document.getElementById('movieYear').value = m.year || '';
        document.getElementById('movieGenre').value = m.genre || '';
        document.getElementById('movieImage').value = m.imageUrl || '';
        document.getElementById('movieAvailable').checked = m.isAvailable;
        document.querySelectorAll('input[name="quality"]').forEach(cb => {
            cb.checked = (m.qualities || []).includes(cb.value);
        });
    } else {
        document.getElementById('modalTitle').textContent = 'Nueva Película';
        form.reset();
        document.getElementById('movieId').value = '';
        document.getElementById('movieAvailable').checked = true;
    }

    document.getElementById('movieModal').classList.add('show');
};

function closeMovieModal() {
    document.getElementById('movieModal').classList.remove('show');
    currentMovieId = null;
}

async function handleMovieSubmit(e) {
    e.preventDefault();

    const qualities = Array.from(document.querySelectorAll('input[name="quality"]:checked')).map(cb => cb.value);
    if (qualities.length === 0) {
        showNotification('Selecciona al menos una calidad', 'error');
        return;
    }

    const dataPayload = {
        title: document.getElementById('movieTitle').value.trim(),
        year: parseInt(document.getElementById('movieYear').value) || null,
        genre: document.getElementById('movieGenre').value.trim(),
        image_url: document.getElementById('movieImage').value.trim(),
        is_available: document.getElementById('movieAvailable').checked,
        qualities: qualities,
    };

    try {
        if (currentMovieId) {
            const { error } = await supabase
                .from('movies')
                .update(dataPayload)
                .eq('id', currentMovieId);

            if (error) throw error;
            showNotification('Película actualizada', 'success');
        } else {
            const { error } = await supabase
                .from('movies')
                .insert([dataPayload]);

            if (error) throw error;
            showNotification('Película agregada', 'success');
        }
        closeMovieModal();
        fetchGenres(); // Refresh genres in case a new one was added
        fetchAndRenderMovies();
    } catch (error) {
        console.error(error);
        showNotification(error.message || 'Error al guardar', 'error');
    }
}

window.toggleAvailability = async function (id) {
    try {
        const m = movies.find(x => x.id === id);
        if (!m) return;

        const { error } = await supabase
            .from('movies')
            .update({ is_available: !m.isAvailable })
            .eq('id', id);

        if (error) throw error;

        showNotification('Disponibilidad actualizada', 'success');
        fetchAndRenderMovies();
    } catch (error) {
        showNotification('Error al cambiar disponibilidad', 'error');
    }
};

window.openDeleteModal = function (id) {
    currentMovieId = id;
    const m = movies.find(x => x.id === id);
    if (m) {
        document.getElementById('deleteMovieTitle').textContent = m.title;
        document.getElementById('deleteModal').classList.add('show');
    }
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    currentMovieId = null;
}

async function confirmDeleteMovie() {
    if (!currentMovieId) return;
    try {
        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', currentMovieId);

        if (error) throw error;

        showNotification('Película eliminada', 'success');
        closeDeleteModal();
        fetchAndRenderMovies();
        fetchGenres();
    } catch (error) {
        showNotification('Error al eliminar película', 'error');
    }
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== TMDB Search Logic =====
let currentTMDBResults = []; // Store results globally

async function handleTMDBSearch() {
    const query = document.getElementById('tmdbSearchInput').value.trim();
    const resultsContainer = document.getElementById('tmdbSearchResults');

    if (!query) return;

    // Show loading state
    resultsContainer.innerHTML = '<div style="padding:10px; color:#94a3b8;">Buscando...</div>';
    resultsContainer.classList.add('active');

    try {
        const results = await searchMovies(query); // from tmdbClient.js
        currentTMDBResults = results || [];

        if (!currentTMDBResults || currentTMDBResults.length === 0) {
            resultsContainer.innerHTML = '<div style="padding:10px; color:#94a3b8;">No se encontraron resultados</div>';
            return;
        }

        resultsContainer.innerHTML = currentTMDBResults.slice(0, 5).map((movie, index) => `
            <div class="tmdb-result-item" onclick="selectTMDBMovie(${index})">
                <img src="${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : ''}" class="tmdb-result-poster" alt="Poster">
                <div class="tmdb-result-info">
                    <h4>${escapeHtml(movie.title)}</h4>
                    <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                </div>
            </div>
        `).join('');

        // Add click outside listener to close dropdown
        document.addEventListener('click', function closeDropdown(e) {
            if (!e.target.closest('.form-group')) {
                resultsContainer.classList.remove('active');
                document.removeEventListener('click', closeDropdown);
            }
        });

    } catch (error) {
        console.error('TMDB Search Error:', error);
        resultsContainer.innerHTML = '<div style="padding:10px; color:#ef4444;">Error al buscar</div>';
    }
}

window.selectTMDBMovie = function (index) {
    try {
        const movie = currentTMDBResults[index];
        if (!movie) return;

        document.getElementById('movieTitle').value = movie.title;
        document.getElementById('movieYear').value = movie.release_date ? movie.release_date.split('-')[0] : '';
        document.getElementById('movieImage').value = movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : '';
        // Genre is tricky as TMDB gives IDs. Leaving genre as is or maybe "Importado"
        // document.getElementById('movieGenre').value = "Importado"; 

        document.getElementById('tmdbSearchResults').classList.remove('active');
        document.getElementById('tmdbSearchInput').value = ''; // clear search

        showNotification('Datos importados de TMDB', 'success');

    } catch (e) {
        console.error('Error selecting movie', e);
    }
};

function showNotification(msg, type = 'info') {
    document.querySelector('.notification')?.remove();
    const n = document.createElement('div');
    n.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i> ${msg}`;
    Object.assign(n.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '12px',
        background: type === 'success' ? 'rgba(16,185,129,0.9)' : type === 'error' ? 'rgba(239,68,68,0.9)' : 'rgba(99,102,241,0.9)',
        color: 'white', zIndex: '9999', display: 'flex', alignItems: 'center', gap: '0.5rem'
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}
