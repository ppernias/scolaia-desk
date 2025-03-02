import type { ApiResponse } from '../types/services.js';

/**
 * Service for handling email-related operations
 */
class EmailService {
    /**
     * Sends an approval email to a user
     * @param userId - ID of the user to send the approval email to
     * @returns ApiResponse with message indicating success or failure
     */
    async sendApprovalEmail(userId: number): Promise<ApiResponse<{message: string}>> {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    error: 'No authentication token found'
                };
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const response = await fetch(`/api/v1/users/${userId}/send-approval-email`, {
                method: 'POST',
                headers: headers
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to send approval email'
                };
            }

            const result = await response.json();
            return {
                success: true,
                data: result
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send approval email'
            };
        }
    }
}

/**
 * Singleton instance of the email service
 */
export const emailService = new EmailService();
