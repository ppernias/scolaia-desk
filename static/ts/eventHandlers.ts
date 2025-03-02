"use strict";

import { handleLogin, handleRegister, logout } from './auth.js';
import { showWarning } from './ui.js';

interface UserData {
    is_approved: boolean;
    is_admin: boolean;
}

export function setupEventListeners(): void {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    const chatLink = document.querySelector('a[href="/chat"]');
    if (chatLink) {
        chatLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/v1/users/me');
                
                if (!response.ok) {
                    throw new Error('Failed to check user status');
                }
                
                const data = await response.json() as UserData;
                if (!data.is_approved) {
                    showWarning('Your account is pending approval. Please wait for administrator approval to access the chat.');
                    return;
                }
                
                window.location.href = '/chat';
            } catch (error) {
                console.error('Error checking user status:', error);
                showWarning('Failed to check user status. Please try again.');
            }
        });
    }

    // Add event handler for admin panel link
    const adminLink = document.querySelector('a[href="/admin"]');
    if (adminLink) {
        adminLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/v1/users/me');
                if (!response.ok) {
                    throw new Error('Failed to check user status');
                }
                const data = await response.json() as UserData;
                if (!data.is_admin) {
                    showWarning('You do not have permission to access the admin panel.');
                    return;
                }
                window.location.href = '/admin';
            } catch (error) {
                console.error('Error checking admin status:', error);
                showWarning('Failed to check admin status. Please try again.');
            }
        });
    }
}

export function setupNavigationHandlers(): void {
    window.addEventListener('beforeunload', () => {
        const token = localStorage.getItem('token');
        if (token) {
            localStorage.removeItem('token');
        }
    });
}
