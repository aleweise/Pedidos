// ===== Orders Management JavaScript =====

let orders = [];
let currentOrderId = null;
let currentStatusFilter = '';

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initLogout();
    initEventListeners();
    fetchAndRenderOrders();
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
        window.location.href = '../login.html';
    });
}

async function fetchAndRenderOrders() {
    try {
        const search = document.getElementById('searchInput')?.value?.trim();
        const status = currentStatusFilter || undefined;

        // Fetch orders from Supabase, including (user) profile data
        let query = supabase
            .from('orders')
            .select('*, profiles(name, email)');

        const { data, error } = await query;

        if (error) throw error;

        // Map Supabase data to expected format
        orders = data.map(o => ({
            ...o,
            user: o.profiles || { name: 'Desconocido', email: '' },
            movieName: o.movie_name,
            movieYear: o.movie_year,
            // quality matches
            audioPreference: o.audio_preference,
            createdAt: o.created_at
        }));

        updateCounts(); // Update counts based on all orders
        renderOrders(); // Render based on current filters
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error cargando pedidos', 'error');
        document.getElementById('ordersTableBody').innerHTML = '<tr><td colspan="7" class="loading-row error-text">Error de conexión</td></tr>';
    }
}

function initEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', debounce(renderOrders, 300));
    document.getElementById('filterQuality')?.addEventListener('change', renderOrders);
    document.getElementById('filterAudio')?.addEventListener('change', renderOrders);

    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatusFilter = tab.dataset.status;
            renderOrders();
        });
    });

    document.getElementById('closeModal')?.addEventListener('click', closeOrderModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeOrderModal);
    document.getElementById('saveOrder')?.addEventListener('click', saveOrderChanges);
    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete')?.addEventListener('click', confirmDeleteOrder);
}

function updateCounts() {
    if (!orders) return;
    document.getElementById('countAll').textContent = orders.length;
    document.getElementById('countPending').textContent = orders.filter(o => o.status === 'pending').length;
    document.getElementById('countProcessing').textContent = orders.filter(o => o.status === 'processing').length;
    document.getElementById('countCompleted').textContent = orders.filter(o => o.status === 'completed').length;
    document.getElementById('countCancelled').textContent = orders.filter(o => o.status === 'cancelled').length;
}

function renderOrders() {
    let filtered = [...orders];

    // Apply filters locally (since we fetched all)
    if (currentStatusFilter) filtered = filtered.filter(o => o.status === currentStatusFilter);

    const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    if (search) filtered = filtered.filter(o => o.movieName.toLowerCase().includes(search));

    const quality = document.getElementById('filterQuality')?.value;
    if (quality) filtered = filtered.filter(o => o.quality === quality);

    const audio = document.getElementById('filterAudio')?.value;
    if (audio) filtered = filtered.filter(o => o.audioPreference === audio);

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const tbody = document.getElementById('ordersTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No se encontraron pedidos</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(o => `
        <tr>
            <td><strong>${escapeHtml(o.movieName)}</strong>${o.movieYear ? `<br><small>${o.movieYear}</small>` : ''}</td>
            <td>${o.user ? escapeHtml(o.user.name) : 'Usuario desconocido'}</td>
            <td>${o.quality.toUpperCase()}</td>
            <td>${o.audioPreference}</td>
            <td><span class="order-status ${o.status}">${getStatusLabel(o.status)}</span></td>
            <td>${formatTime(new Date(o.createdAt).getTime())}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon view" onclick="openOrderModal('${o.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon edit" onclick="quickStatus('${o.id}')"><i class="fas fa-sync-alt"></i></button>
                    <button class="btn-icon delete" onclick="openDeleteModal('${o.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.openOrderModal = function (id) {
    currentOrderId = id;
    const o = orders.find(x => x.id === id);
    if (!o) return;
    document.getElementById('orderMovie').textContent = o.movieName;
    document.getElementById('orderYear').textContent = o.movieYear || '-';
    document.getElementById('orderClient').textContent = o.user ? `${o.user.name} (${o.user.email})` : 'Desconocido';
    document.getElementById('orderQuality').textContent = o.quality.toUpperCase();
    document.getElementById('orderAudio').textContent = o.audioPreference;
    document.getElementById('orderNotes').textContent = o.notes || 'Sin notas';
    document.getElementById('orderDate').textContent = new Date(o.createdAt).toLocaleString('es');
    document.getElementById('orderStatus').value = o.status;
    document.getElementById('orderNotesInput').value = o.notes || '';
    document.getElementById('orderModal').classList.add('show');
};

window.closeOrderModal = function () {
    document.getElementById('orderModal').classList.remove('show');
    currentOrderId = null;
};

async function saveOrderChanges() {
    const o = orders.find(x => x.id === currentOrderId);
    if (!o) return;

    const newStatus = document.getElementById('orderStatus').value;
    const newNotes = document.getElementById('orderNotesInput').value;

    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: newStatus,
                notes: newNotes
            })
            .eq('id', currentOrderId);

        if (error) throw error;

        showNotification('Pedido actualizado', 'success');
        closeOrderModal();
        fetchAndRenderOrders();
    } catch (error) {
        showNotification('Error al actualizar', 'error');
    }
}

window.quickStatus = async function (id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    const flow = ['pending', 'processing', 'completed'];
    const idx = flow.indexOf(o.status);
    if (idx < flow.length - 1) {
        const nextStatus = flow[idx + 1];
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: nextStatus })
                .eq('id', id);

            if (error) throw error;

            showNotification(`Estado: ${getStatusLabel(nextStatus)}`, 'success');
            fetchAndRenderOrders();
        } catch (error) {
            showNotification('Error al actualizar estado', 'error');
        }
    }
};

window.openDeleteModal = function (id) {
    currentOrderId = id;
    document.getElementById('deleteModal').classList.add('show');
};

window.closeDeleteModal = function () {
    document.getElementById('deleteModal').classList.remove('show');
    currentOrderId = null;
};

async function confirmDeleteOrder() {
    if (!currentOrderId) return;
    try {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', currentOrderId);

        if (error) throw error;

        showNotification('Pedido eliminado', 'success');
        closeDeleteModal();
        fetchAndRenderOrders();
    } catch (error) {
        showNotification('Error al eliminar', 'error');
    }
}

function getStatusLabel(s) { return { pending: 'Pendiente', processing: 'En proceso', completed: 'Completado', cancelled: 'Cancelado' }[s] || s; }
function formatTime(t) { const m = Math.floor((Date.now() - t) / 60000); return m < 60 ? `Hace ${m}m` : `Hace ${Math.floor(m / 60)}h`; }
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function showNotification(msg, type = 'info') {
    document.querySelector('.notification')?.remove();
    const n = document.createElement('div');
    n.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'info'}-circle"></i> ${msg}`;
    Object.assign(n.style, { position: 'fixed', top: '20px', right: '20px', padding: '1rem', borderRadius: '12px', background: type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(99,102,241,0.9)', color: 'white', zIndex: '9999' });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}
