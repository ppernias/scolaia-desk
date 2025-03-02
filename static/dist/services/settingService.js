/**
 * Service for managing application settings
 * Provides methods for retrieving, updating, and testing various system settings
 */
class SettingService {
    /**
     * Gets the headers for API requests
     * @returns Headers object with authentication token
     */
    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }
    /**
     * Gets all application settings
     * @returns ApiResponse with array of settings
     */
    async getSettings() {
        try {
            const response = await fetch('/api/v1/settings/', {
                headers: this.getHeaders()
            });
            if (!response.ok) {
                return {
                    success: false,
                    error: 'Failed to fetch settings'
                };
            }
            const data = await response.json();
            return {
                success: true,
                data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            };
        }
    }
    /**
     * Gets a decrypted value for a sensitive setting
     * @param settingId - ID of the setting to decrypt
     * @returns ApiResponse with the decrypted value
     */
    async getDecryptedValue(settingId) {
        try {
            const response = await fetch(`/api/v1/settings/value/${settingId}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to get decrypted value'
                };
            }
            const data = await response.text();
            return {
                success: true,
                data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            };
        }
    }
    /**
     * Updates an existing setting
     * @param settingId - ID of the setting to update
     * @param data - New setting data
     * @returns ApiResponse with the updated setting
     */
    async updateSetting(settingId, data) {
        try {
            const response = await fetch(`/api/v1/settings/${settingId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to update setting'
                };
            }
            const updatedSetting = await response.json();
            return {
                success: true,
                data: updatedSetting
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            };
        }
    }
    /**
     * Tests the email configuration by sending a test email
     * @returns ApiResponse with the test result
     */
    async testEmailConfiguration() {
        try {
            const response = await fetch('/api/v1/settings/test-email', {
                method: 'POST',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.detail || 'Failed to test email configuration';
                return {
                    success: false,
                    error: errorMessage
                };
            }
            const result = await response.json();
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    /**
     * Loads available OpenAI models
     * @returns ApiResponse with array of OpenAI models
     */
    async loadOpenAIModels() {
        try {
            const response = await fetch('/api/v1/settings/openai/models', {
                headers: this.getHeaders()
            });
            if (!response.ok) {
                let errorMessage = 'Failed to load OpenAI models';
                try {
                    const error = await response.json();
                    errorMessage = error.detail || errorMessage;
                }
                catch (e) {
                    try {
                        errorMessage = await response.text();
                    }
                    catch (e2) {
                        errorMessage = response.statusText || errorMessage;
                    }
                }
                return {
                    success: false,
                    error: errorMessage
                };
            }
            const models = await response.json();
            return {
                success: true,
                data: models
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    /**
     * Creates a new setting
     * @param data - Setting data to create
     * @returns ApiResponse with the created setting
     */
    async createSetting(data) {
        try {
            const response = await fetch('/api/v1/settings/', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to create setting'
                };
            }
            const newSetting = await response.json();
            return {
                success: true,
                data: newSetting
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            };
        }
    }
    /**
     * Updates multiple settings at once
     * @param data - Object containing setting key-value pairs
     * @returns ApiResponse indicating success or failure
     */
    async updateSettings(data) {
        try {
            const response = await fetch('/api/v1/settings/batch', {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to update settings'
                };
            }
            return {
                success: true
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            };
        }
    }
}
/**
 * Singleton instance of the setting service
 */
export const settingService = new SettingService();
//# sourceMappingURL=settingService.js.map