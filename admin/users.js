// ===== Users Management JavaScript =====

let users = [];
let currentUserId = null;

// ===== Initialize =====
// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth(); // Check auth FIRST
    initSidebar();
    initLogout();
    initEventListeners();
    fetchAndRenderUsers();
});

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
        console.warn('Redirecting to admin login', e);
        window.location.href = 'login.html'; // Redirect to ADMIN login
    }
}

function initSidebar() {
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });
}

function initLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html'; // Redirect to ADMIN login
    });
}

async function fetchAndRenderUsers() {
    try {
        const search = document.getElementById('searchInput')?.value?.trim();
        const role = document.getElementById('filterRole')?.value || undefined;
        let isActive = undefined;
        const statusVal = document.getElementById('filterStatus')?.value;
        if (statusVal !== '') {
            isActive = statusVal === 'true';
        }

        let query = supabase.from('profiles').select('*');

        if (role) query = query.eq('role', role);
        if (isActive !== undefined) query = query.eq('is_active', isActive);

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        users = data.map(u => ({
            ...u,
            isActive: u.is_active,
            createdAt: u.created_at
        }));

        renderUsers(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        document.getElementById('usersTableBody').innerHTML = `
            <tr>
                <td colspan="7" class="loading-row error-text">
                    <i class="fas fa-exclamation-circle"></i>
                    Error al cargar usuarios
                </td>
            </tr>
        `;
    }
}

// ===== Event Listeners =====
function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(fetchAndRenderUsers, 500));
    }

    document.getElementById('filterRole')?.addEventListener('change', fetchAndRenderUsers);
    document.getElementById('filterStatus')?.addEventListener('change', fetchAndRenderUsers);

    // Add user button
    document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());

    // Modal controls
    document.getElementById('closeModal')?.addEventListener('click', closeUserModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeUserModal);

    // Delete modal controls
    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete')?.addEventListener('click', confirmDeleteUser);

    // Form submit
    document.getElementById('userForm')?.addEventListener('submit', handleUserSubmit);
}

// ===== Render Users Table =====
function renderUsers(usersToRender) {
    const tbody = document.getElementById('usersTableBody');
    if (!usersToRender || usersToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-row">
                    <i class="fas fa-users"></i>
                    No se encontraron usuarios
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = usersToRender.map(user => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="avatar-sm">
                        ${getInitials(user.name || 'U')}
                    </div>
                    <span>${escapeHtml(user.name || 'Sin nombre')}</span>
                </div>
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.phone || '-'}</td>
            <td>
                <span class="status-badge ${user.role}">
                    ${user.role === 'admin' ? 'Admin' : 'Usuario'}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                    ${user.isActive ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon edit" onclick="openUserModal('${user.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon ${user.isActive ? 'delete' : 'view'}" onclick="toggleUserStatus('${user.id}')" title="${user.isActive ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                    </button>
                    <button class="btn-icon delete" onclick="openDeleteModal('${user.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Expose functions to window
window.openUserModal = function (id = null) {
    currentUserId = id;
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');

    if (id) {
        const user = users.find(u => u.id === id);
        if (!user) return;

        document.getElementById('modalTitle').textContent = 'Editar Usuario';
        document.getElementById('userName').value = user.name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userRole').value = user.role;
        document.getElementById('userPassword').parentElement.style.display = 'none'; // Hide password for edit
        document.getElementById('userEmail').disabled = true; // Cannot change email easily

    } else {
        document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
        form.reset();
        document.getElementById('userPassword').parentElement.style.display = 'block';
        document.getElementById('userEmail').disabled = false;

        // Show warning about creation
        showNotification('Nota: Crear usuarios desde aquí no está soportado completamente en esta versión.', 'info');
    }

    modal.classList.add('show');
};

window.closeUserModal = function () {
    document.getElementById('userModal').classList.remove('show');
    currentUserId = null;
};


// ===== Handle User Submit =====
async function handleUserSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('userName').value.trim(),
        role: document.getElementById('userRole').value,
        phone: document.getElementById('userPhone').value.trim(),
    };

    try {
        if (currentUserId) {
            // Update existing user
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: formData.name,
                    role: formData.role,
                    // phone is not in our simple profiles schema, but we can ignore or add it if needed. 
                    // For now let's assume profiles has no phone column or ignored.
                })
                .eq('id', currentUserId);

            if (error) throw error;
            showNotification('Usuario actualizado correctamente', 'success');
        } else {
            // Create new user
            showNotification('La creación de usuarios requiere registro por parte del usuario.', 'error');
            return;
        }

        closeUserModal();
        fetchAndRenderUsers();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== Toggle User Status =====
window.toggleUserStatus = async function (userId) {
    try {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({ is_active: !user.isActive })
            .eq('id', userId);

        if (error) throw error;

        showNotification('Estado del usuario actualizado', 'success');
        fetchAndRenderUsers();
    } catch (error) {
        showNotification('Error al cambiar estado', 'error');
    }
};

window.openDeleteModal = function (id) {
    currentUserId = id;
    document.getElementById('deleteModal').classList.add('show');
};

window.closeDeleteModal = function () {
    document.getElementById('deleteModal').classList.remove('show');
    currentUserId = null;
};

async function confirmDeleteUser() {
    if (currentUserId) {
        showNotification('La eliminación de usuarios no está soportada desde el panel. Desactiva el usuario en su lugar.', 'info');
        closeDeleteModal();
    }
}


// ===== Helpers =====
function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
        position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '12px',
        background: type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(99, 102, 241, 0.9)',
        color: 'white', zIndex: '9999', display: 'flex', alignItems: 'center', gap: '0.75rem'
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
    setTimeout(() => { notification.remove(); }, 4000);
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
