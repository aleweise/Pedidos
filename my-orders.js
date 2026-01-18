document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const tableBody = document.getElementById('ordersTableBody');

    try {
        // Fetch orders for current user
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderOrders(orders);

    } catch (error) {
        console.error('Error fetching orders:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>
                    <p>Error al cargar los pedidos. Por favor intenta más tarde.</p>
                </td>
            </tr>
        `;
    }

    function renderOrders(orders) {
        if (!orders || orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-film"></i>
                        <p>No has realizado ningún pedido aún.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = orders.map(order => `
            <tr>
                <td>
                    <div style="font-weight: 500;">${escapeHtml(order.movie_name)}</div>
                </td>
                <td>${order.movie_year || '-'}</td>
                <td>
                    <span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">
                        ${getOrderQualityLabel(order.quality)}
                    </span>
                </td>
                <td>${getOrderAudioLabel(order.audio_preference)}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <span class="status-badge ${getStatusClass(order.status)}">
                        ${getStatusLabel(order.status)}
                    </span>
                    ${order.notes ? `<div style="font-size: 0.8em; opacity: 0.7; margin-top: 4px;">${escapeHtml(order.notes)}</div>` : ''}
                </td>
            </tr>
        `).join('');
    }

    function getStatusClass(status) {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'cancelled': return 'status-cancelled';
            default: return 'status-pending';
        }
    }

    function getStatusLabel(status) {
        switch (status) {
            case 'completed': return 'Completado';
            case 'cancelled': return 'Cancelado';
            default: return 'Pendiente';
        }
    }

    function getOrderQualityLabel(quality) {
        const map = { '4k': '4K HDR', '1080p': '1080p Full HD', '720p': '720p HD' };
        return map[quality] || quality;
    }

    function getOrderAudioLabel(audio) {
        const map = { 'latino': 'Español Latino', 'subtitulado': 'Original Subtitulado' };
        return map[audio] || audio;
    }
});
