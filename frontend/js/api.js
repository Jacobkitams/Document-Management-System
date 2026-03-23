const API_URL = 'http://localhost:8001';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('dms_token');
        const headers = {
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('dms_token');
            localStorage.removeItem('dms_user');
            window.location.reload();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'API request failed');
        }

        return response.json();
    },

    async login(username, password) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const data = await this.request('/auth/login', {
                method: 'POST',
                body: formData,
            });
            localStorage.setItem('dms_token', data.access_token);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async register(username, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
    },

    async getMe() {
        return this.request('/users/me');
    },

    async getCategories() {
        return this.request('/documents/categories');
    },

    async getDocuments(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/documents/?${query}`);
    },

    async uploadDocument(formData) {
        return this.request('/documents/upload', {
            method: 'POST',
            body: formData,
        });
    },

    async approveDocument(docId, status) {
        return this.request(`/documents/${docId}/approve?status=${status}`, {
            method: 'PUT',
        });
    },

    async deleteDocument(docId) {
        return this.request(`/documents/${docId}`, {
            method: 'DELETE',
        });
    },

    async getUsers() {
        return this.request('/users/');
    },

    async toggleUser(userId) {
        return this.request(`/users/${userId}/toggle`, {
            method: 'POST',
        });
    },

    async getAuditLogs() {
        return this.request('/audit/');
    },

    async downloadDocument(docId) {
        const token = localStorage.getItem('dms_token');
        const response = await fetch(`${API_URL}/documents/${docId}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    }
};
