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

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initLogout();
    await checkAuth();
    await loadDashboardData();
});

// ===== Sidebar Toggle =====
function initSidebar() {
    elements.sidebarToggle?.addEventListener('click', () => {
        elements.sidebar?.classList.toggle('open');
    });
}

// ===== Auth Check =====
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    try {
        // Verify token and role with Convex
        // We use mutation auth:isAdmin or query auth:getCurrentUser
        const user = await convexAction('query', 'auth:getCurrentUser', { token });

        if (!user || user.role !== 'admin') {
            alert('Acceso no autorizado');
            window.location.href = '../index.html';
            return;
        }

        elements.adminName.textContent = user.name || 'Administrador';
    } catch (err) {
        console.error('Auth verification failed', err);
        window.location.href = '../login.html';
    }
}

// ===== Logout =====
function initLogout() {
    elements.logoutBtn?.addEventListener('click', async () => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                // Determine if signOut is query or mutation. Usually mutation.
                // In my auth.ts it is a mutation.
                await convexAction('mutation', 'auth:signOut', { token });
            } catch (e) {
                console.warn('Logout server-side failed', e);
            }
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = '../login.html';
    });
}

// ===== Load Dashboard Data =====
async function loadDashboardData() {
    try {
        // Fetch stats in parallel
        const [userStats, orderStats, movieStats, recentOrders] = await Promise.all([
            convexAction('query', 'users:getStats'),
            convexAction('query', 'orders:getStats'),
            convexAction('query', 'movies:getStats'),
            // We don't have a specific recentOrders query, but orders:list sorts by date
            // However, orders:list usually requires args. I'll check orders:list implementation.
            // It takes search, status, userId. Empty args should return everything.
            // But getting ALL orders might be heavy. For now it's fine.
            convexAction('query', 'orders:list', {})
        ]);

        // Process recent orders (top 5)
        const recentFn = recentOrders.slice(0, 5).map(order => ({
            id: order.id,
            movieName: order.movieName,
            user: order.user ? order.user.name : 'Desconocido',
            status: order.status,
            time: new Date(order.createdAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })
        })).filter(o => o); // ensure not null

        // Pass to update functions
        updateStats({
            users: userStats,
            orders: orderStats,
            movies: movieStats
        });

        renderChart(orderStats.dailyOrders);
        renderRecentOrders(recentFn);
        renderStatusDistribution(orderStats);

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showNotification('Error al cargar datos del tablero', 'error');
    }
}

// ===== Update Stats Cards =====
function updateStats(data) {
    animateValue(elements.totalUsers, 0, data.users.total, 1000);
    animateValue(elements.newUsersWeek, 0, data.users.newThisWeek, 800);
    animateValue(elements.totalOrders, 0, data.orders.total, 1000);
    animateValue(elements.newOrdersWeek, 0, data.orders.thisWeek, 800);
    animateValue(elements.pendingOrders, 0, data.orders.pending, 800);
    animateValue(elements.totalMovies, 0, data.movies.total, 1000);
    elements.availableMovies.textContent = data.movies.available;
}

function animateValue(element, start, end, duration) {
    if (!element) return;

    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + range * easeOut);
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ===== Render Chart =====
function renderChart(dailyOrders) {
    if (!elements.ordersChart) return;

    const maxCount = Math.max(...dailyOrders.map(d => d.count), 1);

    elements.ordersChart.innerHTML = dailyOrders.map(day => `
        <div class="chart-bar">
            <span class="value">${day.count}</span>
            <div class="bar" style="height: ${(day.count / maxCount) * 140}px"></div>
            <span class="label">${day.date}</span>
        </div>
    `).join('');
}

// ===== Render Recent Orders =====
function renderRecentOrders(orders) {
    if (!elements.recentOrders) return;

    if (orders.length === 0) {
        elements.recentOrders.innerHTML = '<p class="text-muted">No hay pedidos recientes</p>';
        return;
    }

    elements.recentOrders.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-icon">
                <i class="fas fa-film"></i>
            </div>
            <div class="order-info">
                <h4>${escapeHtml(order.movieName)}</h4>
                <p>${escapeHtml(order.user)} • ${order.time}</p>
            </div>
            <span class="order-status ${order.status}">${getStatusLabel(order.status)}</span>
        </div>
    `).join('');
}

// ===== Render Status Distribution =====
function renderStatusDistribution(orderStats) {
    if (!elements.statusDistribution) return;

    const total = orderStats.total || 1;
    const statuses = [
        { key: 'pending', label: 'Pendientes', count: orderStats.pending },
        { key: 'processing', label: 'En proceso', count: orderStats.processing },
        { key: 'completed', label: 'Completados', count: orderStats.completed },
        { key: 'cancelled', label: 'Cancelados', count: orderStats.cancelled },
    ];

    elements.statusDistribution.innerHTML = statuses.map(status => `
        <div class="status-row">
            <span class="label">${status.label}</span>
            <div class="bar-container">
                <div class="bar-fill ${status.key}" style="width: ${(status.count / total) * 100}%"></div>
            </div>
            <span class="count">${status.count}</span>
        </div>
    `).join('');
}

// ===== Helpers =====
function getStatusLabel(status) {
    const labels = {
        pending: 'Pendiente',
        processing: 'En proceso',
        completed: 'Completado',
        cancelled: 'Cancelado'
    };
    return labels[status] || status;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Notification System =====
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

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

    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.9)', border: '#10b981' },
        error: { bg: 'rgba(239, 68, 68, 0.9)', border: '#ef4444' },
        info: { bg: 'rgba(99, 102, 241, 0.9)', border: '#6366f1' }
    };

    const color = colors[type] || colors.info;
    notification.style.background = color.bg;
    notification.style.border = `1px solid ${color.border}`;
    notification.style.color = 'white';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
