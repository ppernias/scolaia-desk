/**
 * Service for displaying temporary notifications in the user interface
 */
class NotificationService {
    constructor() {
        this.container = null;
        this.activeNotifications = new Map();
        this.deduplicationTimeout = 500; // ms
        // Create the notification container if it doesn't exist
        this.initContainer();
    }
    /**
     * Initializes the notification container
     */
    initContainer() {
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.position = 'fixed';
            this.container.style.top = '20px';
            this.container.style.right = '20px';
            this.container.style.zIndex = '9999';
            document.body.appendChild(this.container);
        }
        else {
            this.container = document.getElementById('notification-container');
        }
    }
    /**
     * Creates a unique key for a notification based on its message and type
     * @param message - The notification message
     * @param type - The notification type
     * @returns A string key
     */
    createNotificationKey(message, type) {
        return `${type}:${message}`;
    }
    /**
     * Displays a temporary notification
     * @param options - Configuration options for the notification
     * @returns The created notification element
     */
    show(options) {
        var _a;
        const { message, type = 'info', duration = 3000, position = 'top-right' } = options;
        // Ensure the container exists
        if (!this.container) {
            this.initContainer();
        }
        // Check for duplicate notifications
        const notificationKey = this.createNotificationKey(message, type);
        if (this.activeNotifications.has(notificationKey)) {
            // Return the existing notification to avoid duplication
            return this.activeNotifications.get(notificationKey);
        }
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.role = 'alert';
        notification.style.minWidth = '300px';
        notification.style.marginBottom = '10px';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        // Notification content
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        // Add to container
        (_a = this.container) === null || _a === void 0 ? void 0 : _a.appendChild(notification);
        // Configure position
        if (position.includes('bottom')) {
            this.container.style.top = 'auto';
            this.container.style.bottom = '20px';
        }
        else {
            this.container.style.bottom = 'auto';
            this.container.style.top = '20px';
        }
        if (position.includes('left')) {
            this.container.style.right = 'auto';
            this.container.style.left = '20px';
        }
        else if (position.includes('center')) {
            this.container.style.right = 'auto';
            this.container.style.left = '50%';
            this.container.style.transform = 'translateX(-50%)';
        }
        else {
            this.container.style.left = 'auto';
            this.container.style.right = '20px';
        }
        // Add to active notifications for deduplication
        this.activeNotifications.set(notificationKey, notification);
        // Remove from active notifications after deduplication timeout
        setTimeout(() => {
            this.activeNotifications.delete(notificationKey);
        }, this.deduplicationTimeout);
        // Remove after specified time
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        var _a;
                        (_a = notification.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(notification);
                    }, 150);
                }
            }, duration);
        }
        return notification;
    }
    /**
     * Displays an info notification
     * @param message - The message to display
     * @param duration - How long to display the notification (in ms)
     * @returns The created notification element
     */
    info(message, duration) {
        return this.show({ message, type: 'info', duration });
    }
    /**
     * Displays a success notification
     * @param message - The message to display
     * @param duration - How long to display the notification (in ms)
     * @returns The created notification element
     */
    success(message, duration) {
        return this.show({ message, type: 'success', duration });
    }
    /**
     * Displays a warning notification
     * @param message - The message to display
     * @param duration - How long to display the notification (in ms)
     * @returns The created notification element
     */
    warning(message, duration) {
        return this.show({ message, type: 'warning', duration });
    }
    /**
     * Displays an error notification
     * @param message - The message to display
     * @param duration - How long to display the notification (in ms)
     * @returns The created notification element
     */
    error(message, duration) {
        return this.show({ message, type: 'error', duration });
    }
    /**
     * Displays a progress notification that can be updated
     * @param initialMessage - The initial message to display
     * @returns Object with methods to update, complete, or close the notification
     */
    progress(initialMessage) {
        // Check for duplicate progress notifications
        const notificationKey = this.createNotificationKey(initialMessage, 'progress');
        if (this.activeNotifications.has(notificationKey)) {
            const existingNotification = this.activeNotifications.get(notificationKey);
            const messageElement = existingNotification.querySelector('#progress-message');
            return {
                update: (message) => {
                    if (messageElement) {
                        messageElement.textContent = message;
                    }
                },
                success: (message) => {
                    existingNotification.className = 'alert alert-success alert-dismissible fade show';
                    if (messageElement) {
                        existingNotification.innerHTML = `
                            <div class="d-flex align-items-center">
                                <i class="fas fa-check-circle me-2"></i>
                                <span>${message}</span>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                    }
                    setTimeout(() => {
                        existingNotification.classList.remove('show');
                        setTimeout(() => {
                            var _a;
                            (_a = existingNotification.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(existingNotification);
                        }, 150);
                    }, 3000);
                },
                error: (message) => {
                    existingNotification.className = 'alert alert-danger alert-dismissible fade show';
                    if (messageElement) {
                        existingNotification.innerHTML = `
                            <div class="d-flex align-items-center">
                                <i class="fas fa-exclamation-circle me-2"></i>
                                <span>${message}</span>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                    }
                    setTimeout(() => {
                        existingNotification.classList.remove('show');
                        setTimeout(() => {
                            var _a;
                            (_a = existingNotification.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(existingNotification);
                        }, 150);
                    }, 5000);
                },
                close: () => {
                    existingNotification.classList.remove('show');
                    setTimeout(() => {
                        var _a;
                        (_a = existingNotification.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(existingNotification);
                    }, 150);
                }
            };
        }
        const notification = this.show({
            message: `<div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span id="progress-message">${initialMessage}</span>
            </div>`,
            type: 'info',
            duration: 0
        });
        // Add to active notifications for deduplication
        this.activeNotifications.set(notificationKey, notification);
        // Remove from active notifications after deduplication timeout
        setTimeout(() => {
            this.activeNotifications.delete(notificationKey);
        }, this.deduplicationTimeout);
        const messageElement = notification.querySelector('#progress-message');
        return {
            /**
             * Updates the progress notification with a new message
             * @param message - The new message to display
             */
            update: (message) => {
                if (messageElement) {
                    messageElement.textContent = message;
                }
            },
            /**
             * Converts the progress notification to a success notification
             * @param message - The success message to display
             */
            success: (message) => {
                notification.className = 'alert alert-success alert-dismissible fade show';
                if (messageElement) {
                    notification.innerHTML = `
                        <div class="d-flex align-items-center">
                            <i class="fas fa-check-circle me-2"></i>
                            <span>${message}</span>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                }
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        var _a;
                        (_a = notification.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(notification);
                    }, 150);
                }, 3000);
            },
            /**
             * Converts the progress notification to an error notification
             * @param message - The error message to display
             */
            error: (message) => {
                notification.className = 'alert alert-danger alert-dismissible fade show';
                if (messageElement) {
                    notification.innerHTML = `
                        <div class="d-flex align-items-center">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            <span>${message}</span>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                }
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        var _a;
                        (_a = notification.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(notification);
                    }, 150);
                }, 5000);
            },
            /**
             * Closes the notification
             */
            close: () => {
                notification.classList.remove('show');
                setTimeout(() => {
                    var _a;
                    (_a = notification.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(notification);
                }, 150);
            }
        };
    }
}
/**
 * Singleton instance of the notification service
 */
export const notificationService = new NotificationService();
//# sourceMappingURL=notificationService.js.map