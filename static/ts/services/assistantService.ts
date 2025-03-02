import type { ApiResponse, Assistant, AssistantList } from '../types/services.js';
import { notificationService } from './notificationService.js';

/**
 * Service for managing AI assistants
 * Provides methods for listing, creating, updating, and deleting assistants
 */
class AssistantService {
    /**
     * Lists all available assistants
     * @param limit - Maximum number of assistants to return
     * @returns ApiResponse with list of assistants
     */
    async listAssistants(limit: number = 20): Promise<ApiResponse<AssistantList>> {
        try {
            const response = await fetch(`/api/v1/assistants/list?limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to list assistants'
                };
            }

            return {
                success: true,
                data: await response.json()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list assistants'
            };
        }
    }

    /**
     * Creates a new assistant
     * @param yamlData - Assistant configuration data
     * @returns ApiResponse with the created assistant
     */
    async createAssistant(yamlData: any): Promise<ApiResponse<Assistant>> {
        try {
            const response = await fetch('/api/v1/assistants/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(yamlData)
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.detail || 'Failed to create assistant';
                return {
                    success: false,
                    error: errorMessage
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: data
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create assistant';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Updates an existing assistant
     * @param assistantId - ID of the assistant to update
     * @param yamlData - Updated assistant configuration data
     * @returns ApiResponse with the updated assistant
     */
    async updateAssistant(assistantId: string, yamlData: any): Promise<ApiResponse<Assistant>> {
        try {
            const response = await fetch(`/api/v1/assistants/update/${assistantId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(yamlData)
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.detail || 'Failed to update assistant';
                return {
                    success: false,
                    error: errorMessage
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: data
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update assistant';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Deletes an assistant
     * @param assistantId - ID of the assistant to delete
     * @returns ApiResponse with the result of the deletion
     */
    async deleteAssistant(assistantId: string): Promise<ApiResponse<{message?: string}>> {
        try {
            const response = await fetch(`/api/v1/assistants/delete/${assistantId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.detail || 'Failed to delete assistant';
                return {
                    success: false,
                    error: errorMessage
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: data
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete assistant';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Gets details of a specific assistant
     * @param assistantId - ID of the assistant to retrieve
     * @returns ApiResponse with the assistant details
     */
    async getAssistant(assistantId: string): Promise<ApiResponse<Assistant>> {
        try {
            const response = await fetch(`/api/v1/assistants/${assistantId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to get assistant'
                };
            }

            return {
                success: true,
                data: await response.json()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get assistant'
            };
        }
    }
}

/**
 * Singleton instance of the assistant service
 */
export const assistantService = new AssistantService();
