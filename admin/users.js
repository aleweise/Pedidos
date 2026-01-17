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

let users = [];
let currentUserId = null;

// ... DOM Elements (kept same) ...

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initLogout();
    initEventListeners();
    fetchAndRenderUsers();
});

// ... Sidebar/Logout (kept same) ...

async function fetchAndRenderUsers() {
    try {
        const search = elements.searchInput?.value?.trim();
        const role = elements.filterRole?.value || undefined;
        let isActive = undefined;
        if (elements.filterStatus?.value !== '') {
            isActive = elements.filterStatus?.value === 'true';
        }

        // Call users:list query
        users = await convexAction('query', 'users:list', {
            search: search || undefined,
            role: role,
            isActive: isActive
        });

        renderUsers(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        elements.usersTableBody.innerHTML = `
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
    // Search and filters - Update to call fetchAndRenderUsers
    elements.searchInput?.addEventListener('input', debounce(fetchAndRenderUsers, 500));
    elements.filterRole?.addEventListener('change', fetchAndRenderUsers);
    elements.filterStatus?.addEventListener('change', fetchAndRenderUsers);

    // Add user button
    elements.addUserBtn?.addEventListener('click', () => openUserModal());

    // Modal controls
    elements.closeModal?.addEventListener('click', closeUserModal);
    elements.cancelModal?.addEventListener('click', closeUserModal);
    elements.userModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeUserModal);

    // Delete modal controls
    elements.closeDeleteModal?.addEventListener('click', closeDeleteModal);
    elements.cancelDelete?.addEventListener('click', closeDeleteModal);
    elements.deleteModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeDeleteModal);
    elements.confirmDelete?.addEventListener('click', confirmDeleteUser);

    // Form submit
    elements.userForm?.addEventListener('submit', handleUserSubmit);
}

// ===== Render Users Table =====
function renderUsers(usersToRender) {
    if (!usersToRender || usersToRender.length === 0) {
        elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-row">
                    <i class="fas fa-users"></i>
                    No se encontraron usuarios
                </td>
            </tr>
        `;
        return;
    }

    elements.usersTableBody.innerHTML = usersToRender.map(user => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="avatar-sm">
                        ${getInitials(user.name)}
                    </div>
                    <span>${escapeHtml(user.name)}</span>
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


// ===== Handle User Submit =====
async function handleUserSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim().toLowerCase(),
        phone: document.getElementById('userPhone').value.trim(),
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value,
    };

    try {
        if (currentUserId) {
            // Update existing user
            await convexAction('mutation', 'users:update', {
                userId: currentUserId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone || undefined,
                role: formData.role
            });
            showNotification('Usuario actualizado correctamente', 'success');
        } else {
            // Create new user (using the create mutation in users.ts)
            if (!formData.password || formData.password.length < 6) {
                showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            await convexAction('mutation', 'users:create', {
                email: formData.email,
                name: formData.name,
                password: formData.password,
                role: formData.role,
                phone: formData.phone || undefined
            });
            showNotification('Usuario creado correctamente', 'success');
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
        await convexAction('mutation', 'users:toggleActive', { userId });
        showNotification('Estado del usuario actualizado', 'success');
        fetchAndRenderUsers();
    } catch (error) {
        showNotification('Error al cambiar estado', 'error');
    }
};

// ... Delete Modal Open/Close (kept same) ...

async function confirmDeleteUser() {
    if (currentUserId) {
        try {
            await convexAction('mutation', 'users:remove', { userId: currentUserId });
            showNotification('Usuario eliminado correctamente', 'success');
            closeDeleteModal();
            fetchAndRenderUsers();
        } catch (error) {
            showNotification('Error al eliminar usuario', 'error');
        }
    }
}

// ===== Helpers =====
function getInitials(name) {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function escapeHtml(text) {
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
