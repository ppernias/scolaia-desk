/**
 * Service for managing users
 * Provides methods for listing, updating, and deleting users
 */
class UserService {
    /**
     * Gets the authentication headers for API requests
     * @returns Headers object with authentication token
     */
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }
    /**
     * Gets a paginated list of users with optional filtering and sorting
     * @param skip - Number of records to skip
     * @param limit - Maximum number of records to return
     * @param search - Optional search term
     * @param sortBy - Field to sort by
     * @param sortOrder - Sort direction (ascending or descending)
     * @returns ApiResponse with user list and total count
     */
    async getUsers(skip, limit, search, sortBy = 'id', sortOrder = 'asc') {
        try {
            const params = new URLSearchParams({
                skip: skip.toString(),
                limit: limit.toString(),
                sort_by: sortBy,
                sort_order: sortOrder
            });
            if (search) {
                params.append('search', search);
            }
            const response = await fetch(`/api/v1/users/?${params.toString()}`, {
                headers: this.getAuthHeaders()
            });
            if (!response.ok) {
                return {
                    success: false,
                    error: 'Failed to load users'
                };
            }
            const data = await response.json();
            // Verify the response structure and adapt it
            if (!data || typeof data.total !== 'number' || !Array.isArray(data.users)) {
                return {
                    success: false,
                    error: 'Invalid response format from server'
                };
            }
            // Map user fields to ensure we have the correct values
            const mappedUsers = data.users.map((user) => {
                // Determine role based on is_admin
                const role = user.is_admin ? 'admin' : 'user';
                // Determine status based on is_active and is_approved
                let status = 'inactive';
                if (user.is_active && user.is_approved) {
                    status = 'active';
                }
                else if (user.is_active && !user.is_approved) {
                    status = 'suspended';
                }
                else if (!user.is_active) {
                    status = 'inactive';
                }
                return {
                    id: user.id,
                    email: user.email,
                    fullname: user.fullname || '',
                    role: role,
                    status: status,
                    creation_date: user.creation_date || '',
                    last_login: user.last_login || '',
                    token_count: user.token_count || 0
                };
            });
            // Transform the response to the expected format
            return {
                success: true,
                data: {
                    items: mappedUsers,
                    total: data.total
                }
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
     * Updates a user's information
     * @param userId - ID of the user to update
     * @param userData - New user data
     * @returns ApiResponse with the updated user
     */
    async updateUser(userId, userData) {
        try {
            const response = await fetch(`/api/v1/users/${userId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(userData)
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to update user'
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
     * Deletes a user
     * @param userId - ID of the user to delete
     * @returns ApiResponse indicating success or failure
     */
    async deleteUser(userId) {
        try {
            const response = await fetch(`/api/v1/users/${userId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to delete user'
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
 * Singleton instance of the user service
 */
export const userService = new UserService();
//# sourceMappingURL=userService.js.map