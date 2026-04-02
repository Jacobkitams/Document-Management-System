// Dashboard Logic for RedDMS Premium (English Edition)
let chartInstance = null;

async function initApp() {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const displayUsername = document.getElementById('display-username');
    const userRoleBadge = document.getElementById('user-role-badge');
    const userInitial = document.getElementById('user-initial');
    const navAdmin = document.getElementById('nav-admin');
    const navAudit = document.getElementById('nav-audit');
    const adminStat = document.getElementById('admin-only-stat');

    try {
        const user = JSON.parse(localStorage.getItem('dms_user'));
        if (!user) {
            authSection.style.display = 'flex';
            appSection.style.display = 'none';
            return;
        }

        // UI Setup
        authSection.style.display = 'none';
        appSection.style.display = 'block';
        displayUsername.textContent = user.username;
        userInitial.textContent = user.username.charAt(0).toUpperCase();
        userRoleBadge.textContent = user.role.toUpperCase();

        // Role-based navigation
        if (user.role === 'admin' || user.role === 'superadmin') {
            navAdmin.style.display = 'block';
            navAudit.style.display = 'block';
            if (adminStat) adminStat.style.display = 'block';
        }
    } catch (e) {
        console.error('Init error:', e);
        return;
    }

    // Populate categories
    populateCategories();

    // Mobile Sidebar Toggle
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar on link click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Default View
    const lastView = localStorage.getItem('dms_last_view') || 'dashboard';
    switchView(lastView);
}

async function populateCategories() {
    try {
        const categories = await api.getCategories();
        const filterSelect = document.getElementById('filter-category');
        const uploadSelect = document.getElementById('doc-category');

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">📂 All Categories</option>' +
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        if (uploadSelect) {
            uploadSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

function switchView(viewName) {
    const views = document.querySelectorAll('.view-content');
    const navLinks = document.querySelectorAll('.nav-link');
    const viewTitle = document.getElementById('view-title');

    views.forEach(v => v.style.display = 'none');
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.style.display = 'block';

    navLinks.forEach(link => {
        if (link.dataset.view === viewName) link.classList.add('active');
        else link.classList.remove('active');
    });

    // Update Header Title
    const titleMap = {
        'dashboard': 'Dashboard Overview',
        'documents': 'Document Library',
        'upload': 'Upload New Document',
        'admin': 'Admin Console',
        'audit': 'System Audit Trail'
    };
    viewTitle.textContent = titleMap[viewName] || 'Dashboard';
    localStorage.setItem('dms_last_view', viewName);

    if (viewName === 'dashboard') loadDashboardStats();
    if (viewName === 'documents') loadAllDocuments();
    if (viewName === 'admin') loadAdminPanel();
    if (viewName === 'audit') loadAuditLogs();
}

// Stats and Dashboard
async function loadDashboardStats() {
    try {
        const docs = await api.getDocuments();
        const statTotal = document.getElementById('stat-total');
        const statPending = document.getElementById('stat-pending');
        const statApproved = document.getElementById('stat-approved');

        if (statTotal) animateNumber(statTotal, docs.length);
        if (statPending) animateNumber(statPending, docs.filter(d => d.status === 'pending').length);
        if (statApproved) animateNumber(statApproved, docs.filter(d => d.status === 'approved').length);

        const user = JSON.parse(localStorage.getItem('dms_user'));
        if (user && user.role !== 'user') {
            const users = await api.getUsers();
            const statUsers = document.getElementById('stat-users');
            if (statUsers) animateNumber(statUsers, users.length);
        }

        const container = document.getElementById('recent-docs-container');
        renderDocuments(docs.slice(0, 4), container);
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function animateNumber(element, target) {
    let current = 0;
    const increment = Math.max(1, target / 20);
    const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = Math.round(target);
            clearInterval(interval);
        } else {
            element.textContent = Math.round(current);
        }
    }, 30);
}

async function loadAllDocuments() {
    try {
        const search = document.getElementById('search-input').value;
        const categoryId = document.getElementById('filter-category').value;
        const docs = await api.getDocuments({ search, category_id: categoryId });
        const container = document.getElementById('all-docs-container');
        renderDocuments(docs, container);
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function renderDocuments(docs, container) {
    container.innerHTML = '';
    if (!docs || docs.length === 0) {
        container.innerHTML = '<div class="glass-panel" style="grid-column: 1/-1; text-align: center; padding: 4rem;"><i class="fas fa-folder-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i><p style="color: var(--text-muted);">No documents found.</p></div>';
        return;
    }

    docs.forEach(doc => {
        const user = JSON.parse(localStorage.getItem('dms_user'));
        const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');
        const card = document.createElement('div');
        card.className = 'doc-card fade-in';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div class="doc-icon"><i class="fas ${getFileIcon(doc.file_type)}"></i></div>
                <span class="role-badge" style="background: ${getStatusColor(doc.status)};">${doc.status.toUpperCase()}</span>
            </div>
            <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem; padding: 0.5rem; background: #f8fafc; border-radius: 12px;">
                <img src="${doc.uploaded_by_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${doc.uploaded_by_name}`}" style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="font-size: 0.85rem; font-weight: 600; color: #475569;">${doc.uploaded_by_name}</div>
                <div style="margin-left: auto; font-size: 0.75rem; color: #94a3b8;"><i class="fas fa-calendar-day"></i> ${new Date(doc.created_at).toLocaleDateString()}</div>
            </div>
            
            <h4 class="doc-title" style="margin-bottom: 1.5rem;">${doc.title}</h4>
            
            ${isAdmin && (doc.status === 'pending' || doc.status === 'rejected') ? `
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; padding-top: 1rem; border-top: 1px dashed #e2e8f0;">
                    <button class="btn" style="background: #10b981; color: white; flex: 1; padding: 0.5rem;" onclick="approveDoc(${doc.id}, 'approved')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn" style="background: #f43f5e; color: white; flex: 1; padding: 0.5rem;" onclick="approveDoc(${doc.id}, 'rejected')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            ` : ''}

            <div style="display: flex; gap: 0.75rem; border-top: 1px solid rgba(0,0,0,0.03); padding-top: 1.25rem; margin-top: auto;">
                <button class="btn btn-primary" style="flex: 2; padding: 0.6rem; justify-content: center;" onclick="api.downloadDocument(${doc.id})">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn btn-danger" style="flex: 1; padding: 0.6rem; justify-content: center;" onclick="deleteDoc(${doc.id})">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function approveDoc(docId, status) {
    try {
        await api.approveDocument(docId, status);
        showToast(`Document ${status} successfully!`, 'success');
        refreshViews();
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function getStatusColor(status) {
    if (status === 'approved') return '#10b981';
    if (status === 'pending') return '#f59e0b';
    return '#f43f5e';
}

function getFileIcon(type) {
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('word') || type.includes('officedocument')) return 'fa-file-word';
    if (type.includes('image')) return 'fa-file-image';
    if (type.includes('excel') || type.includes('sheet')) return 'fa-file-excel';
    return 'fa-file-lines';
}

// Debounce for search
let debounceTimer;
document.getElementById('search-input')?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadAllDocuments, 400);
});

document.getElementById('filter-category')?.addEventListener('change', loadAllDocuments);

// Upload Logic
const uploadForm = document.getElementById('upload-form');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('doc-file');

dropZone?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', () => {
    if (fileInput.files.length) {
        const dropText = dropZone.querySelector('p');
        if (dropText) dropText.textContent = `File selected: ${fileInput.files[0].name}`;
        dropZone.style.borderColor = 'var(--success)';
    }
});

uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fileInput.files[0]) {
        showToast('Please select a file', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('title', document.getElementById('doc-title').value);
    formData.append('description', '');
    formData.append('category_id', document.getElementById('doc-category').value);
    formData.append('file', fileInput.files[0]);

    try {
        await api.uploadDocument(formData);
        showToast('Document published successfully!', 'success');
        uploadForm.reset();
        const dropText = dropZone.querySelector('p');
        if (dropText) dropText.textContent = 'Click or drag and drop a file here';
        dropZone.style.borderColor = 'var(--primary)';
        switchView('dashboard');
    } catch (error) {
        showToast(error.message, 'danger');
    }
});

// Admin and Users
async function loadAdminPanel() {
    const tableBody = document.getElementById('user-table-body');
    const miniLogs = document.getElementById('admin-mini-logs');
    const adminDocList = document.getElementById('admin-doc-list');
    try {
        const users = await api.getUsers();
        const docs = await api.getDocuments();
        const logs = await api.getAuditLogs();

        renderAdminChart(docs);

        if (adminDocList) {
            // Show all docs that need attention or have been handled
            renderDocuments(docs.slice(0, 8), adminDocList);
        }

        if (miniLogs) {
            miniLogs.innerHTML = logs.slice(0, 5).map(log => `
                <div style="padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9;">
                    <div style="font-weight: 600; color: var(--primary);">${log.action}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">${new Date(log.timestamp).toLocaleString()}</div>
                </div>
            `).join('');
        }

        tableBody.innerHTML = users.map(u => `
            <div class="user-row fade-in glass-panel" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 1.25rem;">
                <div class="user-info-admin" style="display: flex; align-items: center; gap: 1rem;">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=${u.username}" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid white; box-shadow: var(--shadow-sm);">
                    <div>
                        <div style="font-weight: 700; font-size: 1.05rem;">${u.username} ${u.id === JSON.parse(localStorage.getItem('dms_user')).id ? '<span style="color:var(--primary)">(You)</span>' : ''}</div>
                        <div style="color: var(--text-muted); font-size: 0.85rem;">${u.email}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                    <span class="role-badge" style="${u.role === 'user' ? 'background: #f1f5f9; color: #475569;' : ''}">${u.role.toUpperCase()}</span>
                    
                    <button class="btn" title="Edit User" style="background: #f1f5f9; color: #475569; padding: 0.5rem;" onclick="showEditUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="btn" title="Toggle Access" style="background: ${u.is_active ? '#fef2f2; color: #dc2626;' : '#f0fdf4; color: #16a34a;'}" onclick="toggleUser(${u.id})">
                        <i class="fas ${u.is_active ? 'fa-user-lock' : 'fa-user-check'}"></i>
                    </button>

                    ${u.username !== 'superadmin' && u.id !== JSON.parse(localStorage.getItem('dms_user')).id ? `
                        <button class="btn btn-danger" title="Delete User" style="padding: 0.5rem;" onclick="deleteUser(${u.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function renderAdminChart(docs) {
    const ctx = document.getElementById('docChart');
    if (!ctx) return;

    const stats = {
        pending: docs.filter(d => d.status === 'pending').length,
        approved: docs.filter(d => d.status === 'approved').length,
        rejected: docs.filter(d => d.status === 'rejected').length
    };

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Approved', 'Rejected'],
            datasets: [{
                data: [stats.pending, stats.approved, stats.rejected],
                backgroundColor: ['#f59e0b', '#10b981', '#f43f5e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Audit Logs
async function loadAuditLogs() {
    const container = document.getElementById('audit-log-container');
    try {
        const logs = await api.getAuditLogs();
        container.innerHTML = logs.map(log => `
            <div class="stat-card fade-in" style="margin-bottom: 0.75rem; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;"><i class="fas fa-history"></i> ${log.action}</div>
                    <div style="font-size: 0.85rem;">${log.details}</div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: var(--text-muted);">
                    <div>${new Date(log.timestamp).toLocaleString()}</div>
                    <div style="font-family: monospace; margin-top: 0.2rem;">IP: ${log.ip_address || 'System'}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

// Helper Actions
async function deleteDoc(docId) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
        await api.deleteDocument(docId);
        showToast('Document deleted', 'success');
        refreshViews();
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

async function toggleUser(userId) {
    try {
        await api.toggleUser(userId);
        showToast('User status updated');
        loadAdminPanel();
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function refreshViews() {
    const currentView = localStorage.getItem('dms_last_view') || 'dashboard';
    switchView(currentView);
}

// Utility Components
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitle = document.getElementById('toast-title');

    toastMsg.textContent = message;
    toastTitle.textContent = type === 'success' ? 'Success' : 'Warning';
    toastIcon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-triangle-exclamation';
    toastIcon.style.color = type === 'success' ? '#10b981' : '#f43f5e';
    toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#f43f5e';

    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 5000);
}

// Event Listeners
document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.dataset.view);
    });
});

document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to log out?')) {
        localStorage.clear();
        window.location.reload();
    }
});

window.initApp = initApp;
window.api = api;
window.deleteDoc = deleteDoc;
window.toggleUser = toggleUser;
window.showToast = showToast;
window.downloadDocument = (id) => api.downloadDocument(id);

// User CRUD Helpers
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.')) return;
    try {
        await api.deleteUser(userId);
        showToast('User deleted successfully', 'success');
        loadAdminPanel();
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function showEditUserModal(user) {
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-role').value = user.role;
    document.getElementById('user-modal').style.display = 'flex';
}

document.getElementById('edit-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('edit-user-id').value;
    const data = {
        username: document.getElementById('edit-username').value,
        email: document.getElementById('edit-email').value,
        role: document.getElementById('edit-role').value
    };

    try {
        await api.updateUser(userId, data);
        showToast('User updated successfully', 'success');
        document.getElementById('user-modal').style.display = 'none';
        loadAdminPanel();
    } catch (error) {
        showToast(error.message, 'danger');
    }
});

