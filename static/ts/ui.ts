"use strict";

function showAlert(message: string, type: string): void {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
    }
}

export function showSuccess(message: string): void {
    showAlert(message, 'success');
}

export function showError(message: string): void {
    showAlert(message, 'danger');
}

export function showWarning(message: string): void {
    showAlert(message, 'warning');
}

export function showRegisterError(message: string): void {
    let errorAlert = document.getElementById('registerErrorAlert');
    if (!errorAlert) {
        errorAlert = document.createElement('div');
        errorAlert.id = 'registerErrorAlert';
        errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        errorAlert.innerHTML = `
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <div class="error-message"></div>
        `;
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.insertBefore(errorAlert, registerForm.firstChild);
        }
    }
    const errorMessage = errorAlert.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}
