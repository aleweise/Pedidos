// ===== Movies Management JavaScript =====

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

let movies = [];
let currentMovieId = null;

document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login.html';
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

    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete')?.addEventListener('click', confirmDeleteMovie);
}

async function fetchGenres() {
    try {
        const genres = await convexAction('query', 'movies:getUniqueGenres');
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
        movies = await convexAction('query', 'movies:list', {
            search: search || undefined,
            genre: genre,
            isAvailable: isAvailable
        });

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
                    <span><i class="fas fa-calendar"></i> ${m.year}</span>
                    <span><i class="fas fa-tag"></i> ${escapeHtml(m.genre)}</span>
                </div>
                <div class="movie-qualities">
                    ${m.qualities.map(q => `<span class="quality-tag">${q.toUpperCase()}</span>`).join('')}
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
        document.getElementById('movieYear').value = m.year;
        document.getElementById('movieGenre').value = m.genre;
        document.getElementById('movieImage').value = m.imageUrl || '';
        document.getElementById('movieAvailable').checked = m.isAvailable;
        document.querySelectorAll('input[name="quality"]').forEach(cb => {
            cb.checked = m.qualities.includes(cb.value);
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

    const data = {
        title: document.getElementById('movieTitle').value.trim(),
        year: parseInt(document.getElementById('movieYear').value),
        genre: document.getElementById('movieGenre').value.trim(),
        imageUrl: document.getElementById('movieImage').value.trim(),
        isAvailable: document.getElementById('movieAvailable').checked,
        qualities: qualities,
    };

    try {
        if (currentMovieId) {
            await convexAction('mutation', 'movies:update', {
                movieId: currentMovieId,
                ...data
            });
            showNotification('Película actualizada', 'success');
        } else {
            await convexAction('mutation', 'movies:create', data);
            showNotification('Película agregada', 'success');
        }
        closeMovieModal();
        fetchGenres(); // Refresh genres in case a new one was added
        fetchAndRenderMovies();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

window.toggleAvailability = async function (id) {
    try {
        await convexAction('mutation', 'movies:toggleAvailability', { movieId: id });
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
        await convexAction('mutation', 'movies:remove', { movieId: currentMovieId });
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
