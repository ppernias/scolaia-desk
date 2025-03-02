import type { ApiResponse, OpenAIService as IOpenAIService } from '../types/services.js';
import { notificationService } from './notificationService.js';

/**
 * Service for interacting with OpenAI API
 * Handles authentication, message sending, and assistant management
 */
class OpenAIService implements IOpenAIService {
    private token: string | null = null;
    private baseUrl = '/api/openai';

    /**
     * Gets the headers for API requests
     * @returns Headers object with authentication token
     */
    private getHeaders(): HeadersInit {
        const authToken = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
        };
    }

    /**
     * Initializes the OpenAI service by retrieving an API token
     * @returns ApiResponse indicating success or failure
     */
    async initialize(): Promise<ApiResponse<void>> {
        try {
            const response = await fetch(`${this.baseUrl}/token`, {
                headers: this.getHeaders()
            });
            if (!response.ok) {
                throw new Error(`Failed to get token: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.token = data.token;
            return { success: true };
        } catch (error) {
            console.error('Error initializing OpenAI service:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to initialize OpenAI service'
            };
        }
    }

    /**
     * Sends a message to the OpenAI API
     * @param message - The message to send
     * @returns ApiResponse with the response from OpenAI
     */
    async sendMessage(message: string): Promise<ApiResponse<string>> {
        if (!this.token) {
            return {
                success: false,
                error: 'OpenAI service not initialized'
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'X-OpenAI-Token': this.token
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                const errorMessage = `Failed to send message: ${response.status} ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return {
                success: true,
                data: data.response
            };
        } catch (error) {
            console.error('Error sending message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send message'
            };
        }
    }

    /**
     * Deletes an assistant from OpenAI
     * @param assistantId - The ID of the assistant to delete
     * @returns ApiResponse with the result of the deletion
     */
    async deleteAssistant(assistantId: string): Promise<ApiResponse<{ message?: string }>> {
        if (!this.token) {
            return {
                success: false,
                error: 'OpenAI service not initialized'
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/assistant/${assistantId}`, {
                method: 'DELETE',
                headers: {
                    ...this.getHeaders(),
                    'X-OpenAI-Token': this.token
                }
            });

            if (!response.ok) {
                const errorMessage = `Failed to delete assistant: ${response.status} ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return {
                success: true,
                data: { message: data.message }
            };
        } catch (error) {
            console.error('Error deleting assistant:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete assistant'
            };
        }
    }

    /**
     * Purges assistant settings from OpenAI
     * @returns ApiResponse with the result of the purge
     */
    async purgeAssistantSettings(): Promise<ApiResponse<{ message?: string }>> {
        try {
            const response = await fetch('/api/v1/assistants/purge-assistant-settings', {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.detail || `Failed to purge settings: ${response.status} ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return {
                success: true,
                data: { message: data.message }
            };
        } catch (error) {
            console.error('Error purging assistant settings:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to purge assistant settings'
            };
        }
    }
}

/**
 * Singleton instance of the OpenAI service
 */
export const openaiService = new OpenAIService();
