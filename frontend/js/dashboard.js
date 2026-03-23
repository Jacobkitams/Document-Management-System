// Dashboard Logic
async function initApp() {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const displayUsername = document.getElementById('display-username');
    const userRoleBadge = document.getElementById('user-role-badge');
    const userInitial = document.getElementById('user-initial');
    const navAdmin = document.getElementById('nav-admin');
    const navAudit = document.getElementById('nav-audit');

    const user = JSON.parse(localStorage.getItem('dms_user'));
    if (!user) return;

    // UI Setup
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    displayUsername.textContent = user.username;
    userInitial.textContent = user.username.charAt(0).toUpperCase();
    userRoleBadge.textContent = user.role.toUpperCase();

    if (user.role === 'admin' || user.role === 'superadmin') {
        navAdmin.style.display = 'block';
    }
    if (user.role === 'superadmin') {
        navAudit.style.display = 'block';
    }

    // Populate categories in forms and filters
    populateCategories();

    // Default View
    switchView('dashboard');
    loadDashboardStats();
}

async function populateCategories() {
    try {
        const categories = await api.getCategories();
        const filterSelect = document.getElementById('filter-category');
        const uploadSelect = document.getElementById('doc-category');

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">All Departments</option>' +
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
    document.getElementById(`view-${viewName}`).style.display = 'block';

    navLinks.forEach(link => {
        if (link.dataset.view === viewName) link.classList.add('active');
        else link.classList.remove('active');
    });

    viewTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);

    if (viewName === 'dashboard') loadDashboardStats();
    if (viewName === 'documents') loadAllDocuments();
    if (viewName === 'admin') loadAdminPanel();
    if (viewName === 'audit') loadAuditLogs();
}

// Stats and Dashboard
async function loadDashboardStats() {
    try {
        const docs = await api.getDocuments();
        document.getElementById('stat-total').textContent = docs.length;
        document.getElementById('stat-pending').textContent = docs.filter(d => d.status === 'pending').length;
        document.getElementById('stat-approved').textContent = docs.filter(d => d.status === 'approved').length;

        const container = document.getElementById('recent-docs-container');
        renderDocuments(docs.slice(0, 6), container);
    } catch (error) {
        showToast(error.message, 'danger');
    }
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
    if (docs.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center;">No documents found.</p>';
        return;
    }

    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'glass-card doc-card fade-in';
        card.innerHTML = `
            <span class="doc-status status-${doc.status}">${doc.status.toUpperCase()}</span>
            <div style="font-size: 2.5rem; color: var(--primary); margin-bottom: 1rem;">
                <i class="fas ${getFileIcon(doc.file_type)}"></i>
            </div>
            <h4 style="margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${doc.title}">${doc.title}</h4>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.5rem; height: 3rem; overflow: hidden;">${doc.description || 'No description provided.'}</p>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-outline" style="padding: 0.5rem; flex-grow: 1;" onclick="api.downloadDocument(${doc.id})">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn-primary" style="padding: 0.5rem; flex-grow: 2;" onclick="viewDocDetails(${doc.id})">
                    View Info
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function getFileIcon(type) {
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('word') || type.includes('officedocument')) return 'fa-file-word';
    if (type.includes('image')) return 'fa-file-image';
    return 'fa-file-alt';
}

// Search and Filter Listeners
document.getElementById('search-input')?.addEventListener('input', debounce(loadAllDocuments, 500));
document.getElementById('filter-category')?.addEventListener('change', loadAllDocuments);

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

// Upload Modal Logic
const uploadModal = document.getElementById('upload-modal');
const openUploadBtn = document.getElementById('open-upload-modal');
const closeUploadBtn = document.getElementById('close-upload-modal');
const uploadForm = document.getElementById('upload-form');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('doc-file');
const fileNameDisplay = document.getElementById('file-name-display');

openUploadBtn?.addEventListener('click', () => uploadModal.style.display = 'flex');
closeUploadBtn?.addEventListener('click', () => uploadModal.style.display = 'none');

dropZone?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', () => {
    if (fileInput.files.length) fileNameDisplay.textContent = fileInput.files[0].name;
});

uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('doc-title').value);
    formData.append('description', document.getElementById('doc-desc').value);
    formData.append('category_id', document.getElementById('doc-category').value);
    formData.append('file', fileInput.files[0]);

    try {
        await api.uploadDocument(formData);
        showToast('Document uploaded successfully!');
        uploadModal.style.display = 'none';
        uploadForm.reset();
        fileNameDisplay.textContent = 'Drop file here or click to browse';
        loadDashboardStats();
    } catch (error) {
        showToast(error.message, 'danger');
    }
});

// Admin and Audit
async function viewDocDetails(docId) {
    try {
        const docs = await api.getDocuments();
        const doc = docs.find(d => d.id === docId);
        if (!doc) return;

        const user = JSON.parse(localStorage.getItem('dms_user'));
        const isAdmin = user.role === 'admin' || user.role === 'superadmin';

        let actionsHtml = '';
        if (isAdmin && doc.status === 'pending') {
            actionsHtml = `
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button class="btn btn-primary" style="background: var(--secondary); flex: 1;" onclick="updateDocStatus(${doc.id}, 'approved')">Approve</button>
                    <button class="btn btn-primary" style="background: var(--danger); flex: 1;" onclick="updateDocStatus(${doc.id}, 'rejected')">Reject</button>
                </div>
            `;
        } else if (user.id === doc.uploaded_by || isAdmin) {
            actionsHtml = `
                <div style="margin-top: 1.5rem;">
                    <button class="btn btn-outline" style="width: 100%; color: var(--danger); border-color: var(--danger);" onclick="deleteDoc(${doc.id})">Delete Document</button>
                </div>
            `;
        }

        const infoHtml = `
            <div class="glass-panel" style="padding: 1.5rem; border-radius: 0.5rem;">
                <h3 style="margin-bottom: 1rem;">${doc.title}</h3>
                <p style="color: var(--text-muted); margin-bottom: 1rem;">${doc.description || 'No description'}</p>
                <div style="font-size: 0.875rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <p>Status: <span class="doc-status status-${doc.status}">${doc.status}</span></p>
                    <p>Uploaded: ${new Date(doc.created_at).toLocaleString()}</p>
                    <p>Type: ${doc.file_type}</p>
                </div>
                ${actionsHtml}
            </div>
        `;

        // Use toast or a modal for this. For simplicity, let's inject into a new container or a specific modal.
        // I'll reuse the upload modal structure or a similar glass-panel.
        showToast('Viewing details: ' + doc.title);
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

async function updateDocStatus(docId, status) {
    try {
        await api.approveDocument(docId, status);
        showToast('Document ' + status);
        loadDashboardStats();
        loadAllDocuments();
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

async function deleteDoc(docId) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
        await api.deleteDocument(docId);
        showToast('Document deleted');
        loadDashboardStats();
        loadAllDocuments();
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
async function loadAdminPanel() {
    const tableBody = document.getElementById('user-table-body');
    try {
        const users = await api.getUsers();
        tableBody.innerHTML = users.map(u => `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 1rem;">${u.username}</td>
                <td style="padding: 1rem;">${u.email}</td>
                <td style="padding: 1rem;"><span class="doc-status status-approved">${u.role}</span></td>
                <td style="padding: 1rem;">${u.is_active ? 'Active' : 'Inactive'}</td>
                <td style="padding: 1rem;">
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" onclick="toggleUser(${u.id})">Toggle</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

async function loadAuditLogs() {
    const container = document.getElementById('audit-log-container');
    try {
        const logs = await api.getAuditLogs();
        container.innerHTML = logs.map(log => `
            <div style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                <div>
                    <div style="font-weight: 600; color: var(--primary);">${log.action}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">${log.details}</div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: var(--text-muted);">
                    <div>${new Date(log.timestamp).toLocaleString()}</div>
                    <div>IP: ${log.ip_address || 'Internal'}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

// Global Nav switching
document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.dataset.view);
    });
});

window.initApp = initApp; // Make globally accessible
