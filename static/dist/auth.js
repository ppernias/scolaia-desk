"use strict";
import { showSuccess, showError, showRegisterError, showWarning } from './ui.js';
export function setupFetchInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
        const token = localStorage.getItem('token');
        if (token) {
            init = init || {};
            init.headers = {
                ...init.headers,
                'Authorization': `Bearer ${token}`
            };
        }
        return originalFetch(input, init);
    };
}
export function setAuthToken(token) {
    localStorage.setItem('token', token);
    // Establecer también la cookie para que esté disponible en las redirecciones
    document.cookie = `Authorization=Bearer ${token}; path=/; SameSite=Strict`;
}
export function clearAuthToken() {
    localStorage.removeItem('token');
    document.cookie = 'Authorization=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}
// Function to check registration status
async function checkRegistrationStatus() {
    try {
        const response = await fetch('/api/v1/auth/registration-status');
        const data = await response.json();
        return data.is_open;
    }
    catch (error) {
        console.error('Error checking registration status:', error);
        return false;
    }
}
// Setup registration button listener
document.addEventListener('DOMContentLoaded', async () => {
    const registerButton = document.getElementById('registerButton');
    if (registerButton) {
        registerButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const isOpen = await checkRegistrationStatus();
            if (!isOpen) {
                showError('Registration is currently closed. Please contact the administrator.');
            }
            else {
                const modalElement = document.getElementById('registerModal');
                if (modalElement) {
                    const registerModal = new bootstrap.Modal(modalElement);
                    registerModal.show();
                }
            }
        });
    }
});
export async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const emailInput = form.querySelector('#loginEmail');
    const passwordInput = form.querySelector('#loginPassword');
    const email = emailInput === null || emailInput === void 0 ? void 0 : emailInput.value;
    const password = passwordInput === null || passwordInput === void 0 ? void 0 : passwordInput.value;
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'username': email,
                'password': password
            })
        });
        const responseText = await response.text();
        if (!response.ok) {
            let errorDetail = 'Login failed';
            try {
                const errorData = JSON.parse(responseText);
                errorDetail = errorData.detail || errorDetail;
            }
            catch {
                // Si no podemos parsear la respuesta, usamos el mensaje genérico
            }
            throw new Error(errorDetail);
        }
        let data;
        try {
            data = JSON.parse(responseText);
        }
        catch {
            throw new Error('Invalid response format from server');
        }
        // Guardar el token y configurar el interceptor
        setAuthToken(data.access_token);
        setupFetchInterceptor();
        const loginModalElement = document.getElementById('loginModal');
        if (loginModalElement) {
            const loginModal = bootstrap.Modal.getInstance(loginModalElement);
            if (loginModal) {
                loginModal.hide();
            }
        }
        showSuccess('Login successful!');
        // Esperar un momento para que el usuario vea el mensaje de éxito
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
            const userResponse = await fetch('/api/v1/users/me');
            if (!userResponse.ok) {
                throw new Error('Failed to get user status');
            }
            const userData = await userResponse.json();
            if (!userData.is_approved) {
                showWarning('Your account is pending approval. You can browse the site, but chat access is restricted.');
                window.location.href = '/';
            }
            else {
                window.location.href = '/chat';
            }
        }
        catch {
            // Si hay algún error al verificar el estado, redirigimos a la página principal
            window.location.href = '/';
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showError(errorMessage);
    }
    finally {
        // Limpiar la contraseña del formulario por seguridad
        if (passwordInput) {
            passwordInput.value = '';
        }
    }
}
export async function handleRegister(e) {
    e.preventDefault();
    const fullnameInput = document.getElementById('registerFullName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('registerConfirmPassword');
    const fullname = fullnameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const existingError = document.getElementById('registerErrorAlert');
    if (existingError) {
        existingError.remove();
    }
    if (!fullname || !email || !password || !confirmPassword) {
        showRegisterError('All fields are required');
        return;
    }
    if (password !== confirmPassword) {
        showRegisterError('Passwords do not match');
        return;
    }
    try {
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                fullname,
            }),
        });
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        }
        else {
            const text = await response.text();
            throw new Error(text || 'Registration failed');
        }
        if (!response.ok) {
            if (response.status === 403 && data.detail === "Registration is currently closed.") {
                throw new Error('Registration is currently closed. Please contact the administrator.');
            }
            throw new Error(data.detail || 'Registration failed');
        }
        const registerModalElement = document.getElementById('registerModal');
        if (registerModalElement) {
            const registerModal = bootstrap.Modal.getInstance(registerModalElement);
            if (registerModal) {
                registerModal.hide();
            }
        }
        showSuccess('Registration successful! Please log in with your credentials.');
        setTimeout(() => {
            const loginModalElement = document.getElementById('loginModal');
            if (loginModalElement) {
                const loginModal = new bootstrap.Modal(loginModalElement);
                loginModal.show();
            }
        }, 1000);
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error instanceof Error) {
            showRegisterError(error.message);
        }
        else {
            showRegisterError('An unknown error occurred');
        }
    }
}
export function logout() {
    clearAuthToken();
    window.location.href = '/';
}
//# sourceMappingURL=auth.js.map