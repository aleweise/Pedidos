// ===== Admin Dashboard JavaScript =====

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initLogout();
    await checkAuth();
    await loadDashboardData();
});

// ===== Sidebar Toggle =====
function initSidebar() {
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });
}

// ===== Auth Check =====
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    try {
        // Verify role
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !profile || profile.role !== 'admin') {
            alert('Acceso no autorizado');
            await supabase.auth.signOut();
            window.location.href = '../index.html';
            return;
        }

        const adminName = document.getElementById('adminName');
        if (adminName) adminName.textContent = profile.name || 'Administrador';
    } catch (err) {
        console.error('Auth verification failed', err);
        window.location.href = '../login.html';
    }
}

// ===== Logout =====
function initLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = '../login.html';
    });
}

// ===== Load Dashboard Data =====
async function loadDashboardData() {
    try {
        // Fetch stats in parallel
        // For counts, we can filter or use count capabilities.
        // Supabase select({ count: 'exact', head: true }) is good for counts.

        const requests = [
            // Users
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            // New users this week
            supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', getOneWeekAgo()),
            // Orders Total
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            // New orders this week
            supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', getOneWeekAgo()),
            // Orders Pending
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            // Movies Total
            supabase.from('movies').select('*', { count: 'exact', head: true }),
            // Movies Available
            supabase.from('movies').select('*', { count: 'exact', head: true }).eq('is_available', true),
            // Statuses for distribution (we'll fetch all orders for this to be simpler, or individual counts)
            supabase.from('orders').select('status')
        ];

        const [
            usersTotal, usersWeek,
            ordersTotal, ordersWeek,
            ordersPending,
            moviesTotal, moviesAvailable,
            allOrdersStatus
        ] = await Promise.all(requests);

        // Fetch recent orders (top 5) with user names
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('*, profiles(name)')
            .order('created_at', { ascending: false })
            .limit(5);


        const statsData = {
            users: {
                total: usersTotal.count || 0,
                newThisWeek: usersWeek.count || 0
            },
            orders: {
                total: ordersTotal.count || 0,
                thisWeek: ordersWeek.count || 0,
                pending: ordersPending.count || 0,
                // Calculate distribution
                ...calculateDistribution(allOrdersStatus.data || [])
            },
            movies: {
                total: moviesTotal.count || 0,
                available: moviesAvailable.count || 0
            }
        };

        updateStats(statsData);

        // Render charts based on distribution
        renderStatusDistribution(statsData.orders);
        renderOrdersChart(); // Add this line

        if (recentOrders) {
            const recentMapped = recentOrders.map(order => ({
                id: order.id,
                movieName: order.movie_name,
                user: order.profiles?.name || 'Desconocido',
                status: order.status,
                time: new Date(order.created_at).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })
            }));
            renderRecentOrders(recentMapped);
        }

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showNotification('Error al cargar datos del tablero', 'error');
    }
}

function getOneWeekAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
}

function calculateDistribution(orders) {
    const counts = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => {
        if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
}


// ===== Update Stats Cards =====
function updateStats(data) {
    animateValue(document.getElementById('totalUsers'), 0, data.users.total, 1000);
    animateValue(document.getElementById('newUsersWeek'), 0, data.users.newThisWeek, 800);
    animateValue(document.getElementById('totalOrders'), 0, data.orders.total, 1000);
    animateValue(document.getElementById('newOrdersWeek'), 0, data.orders.thisWeek, 800);
    animateValue(document.getElementById('pendingOrders'), 0, data.orders.pending, 800);
    animateValue(document.getElementById('totalMovies'), 0, data.movies.total, 1000);
    document.getElementById('availableMovies').textContent = data.movies.available;
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
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ===== Render Recent Orders =====
function renderRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay pedidos recientes</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
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
    const container = document.getElementById('statusDistribution');
    if (!container) return;

    const total = orderStats.total || 1;
    const statuses = [
        { key: 'pending', label: 'Pendientes', count: orderStats.pending },
        { key: 'processing', label: 'En proceso', count: orderStats.processing },
        { key: 'completed', label: 'Completados', count: orderStats.completed },
        { key: 'cancelled', label: 'Cancelados', count: orderStats.cancelled },
    ];

    container.innerHTML = statuses.map(status => `
        <div class="status-row">
            <span class="label">${status.label}</span>
            <div class="bar-container">
                <div class="bar-fill ${status.key}" style="width: ${(status.count / total) * 100}%"></div>
            </div>
            <span class="count">${status.count}</span>
        </div>
    `).join('');
}

// ===== Render Orders Chart (CSS) =====
function renderOrdersChart() {
    const container = document.getElementById('ordersChart');
    if (!container) return;

    // Simulate data for last 7 days (since we don't have aggregation query ready)
    // In a real app, we would query supabase.rpc() or client-side aggregate ordersWeek
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const today = new Date().getDay();
    const rotatedDays = [...days.slice(today), ...days.slice(0, today)]; // Adjust order approx
    const values = Array(7).fill(0).map(() => Math.floor(Math.random() * 10) + 1);
    const max = Math.max(...values);

    container.innerHTML = `
        <div class="css-chart" style="display: flex; align-items: flex-end; justify-content: space-between; height: 100%; width: 100%; padding-top: 20px;">
            ${values.map((val, i) => `
                <div class="chart-col" style="display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;">
                    <div class="bar" style="width: 30px; height: ${(val / max) * 150}px; background: var(--primary-color); border-radius: 6px 6px 0 0; opacity: 0.8; transition: height 1s ease;">
                        <span style="display: block; text-align: center; color: white; font-size: 10px; padding-top: 4px; opacity: 0;">${val}</span>
                    </div>
                    <span style="font-size: 12px; color: var(--text-color-secondary);">${rotatedDays[i]}</span>
                </div>
            `).join('')}
        </div>
    `;

    // Simple animation effect
    setTimeout(() => {
        container.querySelectorAll('.bar').forEach(bar => {
            bar.style.opacity = '1';
        });
    }, 100);
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
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };

    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;

    Object.assign(notification.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '12px',
        display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: '500', zIndex: '9999',
        animation: 'slideIn 0.3s ease', backdropFilter: 'blur(10px)'
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
        to { transform: translateX(0); opacity: 1; } /* Correction to slideOut */
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
