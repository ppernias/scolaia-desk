"use strict";

import { showSuccess, showError } from './ui.js';

interface ProfileUpdateData {
    fullname?: string;
    email?: string;
}

interface PasswordUpdateData {
    current_password: string;
    password: string;
}

// Define Bootstrap types
declare const bootstrap: {
    Modal: {
        getInstance: (element: HTMLElement) => any;
        new (element: Element): any;
    };
};

// Function to handle profile form submission
export async function handleProfileUpdate(event: Event): Promise<void> {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const fullnameInput = form.querySelector('#profileFullname') as HTMLInputElement;
    const emailInput = form.querySelector('#profileEmail') as HTMLInputElement;
    
    const fullname = fullnameInput?.value;
    const email = emailInput?.value;
    
    if (!fullname || !email) {
        showError('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch('/api/v1/users/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullname,
                email
            } as ProfileUpdateData),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update profile');
        }
        
        showSuccess('Profile updated successfully!');
        
        // Update the displayed username in the navbar
        const usernameElement = document.querySelector('.nav-link[data-bs-toggle="modal"][data-bs-target="#userProfileModal"]');
        if (usernameElement) {
            // Keep the icon and update the text
            const icon = usernameElement.querySelector('i');
            usernameElement.innerHTML = '';
            if (icon) {
                usernameElement.appendChild(icon);
            }
            usernameElement.appendChild(document.createTextNode(fullname));
        }
        
    } catch (error) {
        console.error('Profile update error:', error);
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError('An unknown error occurred');
        }
    }
}

// Function to handle password change form submission
export async function handlePasswordChange(event: Event): Promise<void> {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const currentPasswordInput = form.querySelector('#currentPassword') as HTMLInputElement;
    const newPasswordInput = form.querySelector('#newPassword') as HTMLInputElement;
    const confirmPasswordInput = form.querySelector('#confirmPassword') as HTMLInputElement;
    
    const currentPassword = currentPasswordInput?.value;
    const newPassword = newPasswordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showError('Please fill in all password fields');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 8) {
        showError('New password must be at least 8 characters long');
        return;
    }
    
    try {
        const response = await fetch('/api/v1/users/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: newPassword,
                current_password: currentPassword
            } as PasswordUpdateData),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to change password');
        }
        
        // Clear the password fields
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        
        // Show a modal with a message about logging out
        const modalElement = document.getElementById('userProfileModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        // Create and show a success message with logout information
        showSuccess('Password changed successfully! You will be logged out in a few seconds. Please log in again with your new password.');
        
        // Log out automatically after 5 seconds
        setTimeout(() => {
            // Import and use the logout function from auth.js
            import('./auth.js').then(auth => {
                auth.logout();
            });
        }, 5000);
        
    } catch (error) {
        console.error('Password change error:', error);
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError('An unknown error occurred');
        }
    }
}

// Setup event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
});
