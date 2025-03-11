import { setupEventListeners, setupNavigationHandlers } from './eventHandlers.js';
import { setupFetchInterceptor } from './auth.js';
class ScolaIA {
    constructor() {
        this.currentUser = null;
        this.chatHistory = [];
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        // Chat form
        const chatForm = document.getElementById('chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => this.handleChatSubmit(e));
        }
    }
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.get('email'),
                    password: formData.get('password')
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                window.location.href = '/chat';
            }
            else {
                this.showError('Login failed. Please check your credentials.');
            }
        }
        catch (error) {
            this.showError('An error occurred during login.');
        }
    }
    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        if (password !== confirmPassword) {
            this.showError('Passwords do not match.');
            return;
        }
        try {
            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.get('email'),
                    password: password,
                    fullname: formData.get('fullname')
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                this.showSuccess('Registration successful! Please wait for admin approval.');
                // Close register modal
                const modal = document.getElementById('registerModal');
                if (modal) {
                    window.bootstrap.Modal.getInstance(modal).hide();
                }
            }
            else {
                const data = await response.json();
                this.showError(data.detail || 'Registration failed.');
            }
        }
        catch (error) {
            this.showError('An error occurred during registration.');
        }
    }
    async handleChatSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const message = formData.get('message');
        if (!message.trim())
            return;
        try {
            const response = await fetch('/api/v1/chat/message', {
                method: 'POST',
                body: JSON.stringify({ message }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                this.appendMessage({
                    role: 'user',
                    content: message,
                    timestamp: new Date()
                });
                this.appendMessage({
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date()
                });
                form.reset();
            }
            else {
                this.showError('Failed to send message.');
            }
        }
        catch (error) {
            this.showError('An error occurred while sending message.');
        }
    }
    appendMessage(message) {
        this.chatHistory.push(message);
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.role} mb-3`;
            messageElement.innerHTML = `
                <div class="message-content p-3 rounded">
                    <p>${message.content}</p>
                    <small class="text-muted">${message.timestamp.toLocaleTimeString()}</small>
                </div>
            `;
            chatContainer.appendChild(messageElement);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            const bsToast = new window.bootstrap.Toast(toast);
            bsToast.show();
        }
    }
    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-success border-0';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            const bsToast = new window.bootstrap.Toast(toast);
            bsToast.show();
        }
    }
}
// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupFetchInterceptor();
    setupEventListeners();
    setupNavigationHandlers();
});
//# sourceMappingURL=main.js.map