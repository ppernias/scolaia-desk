import { userService } from '../../services/userService.js';
import { UserTable } from './UserTable.js';
import { Pagination } from './Pagination.js';
export class UserManager {
    constructor(options) {
        this.searchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalUsers = 0;
        this.sortField = 'id';
        this.sortOrder = 'asc';
        this.options = options;
        this.userTable = new UserTable(options.tableId, {
            onEdit: this.handleEdit.bind(this),
            onDelete: this.handleDelete.bind(this)
        });
        this.pagination = new Pagination(options.paginationId, {
            itemsPerPage: this.itemsPerPage,
            onPageChange: this.handlePageChange.bind(this)
        });
        // Listen for user updates
        window.addEventListener('userUpdated', () => {
            this.loadUsers().catch(console.error);
        });
        // Load initial users
        this.loadUsers().catch(error => {
            console.error('Failed to load initial users:', error);
        });
    }
    handleEdit(user) {
        // Dispatch event for AdminPanel to handle
        const event = new CustomEvent('editUser', { detail: user });
        window.dispatchEvent(event);
    }
    handleDelete(userId) {
        // Dispatch event for AdminPanel to handle
        const event = new CustomEvent('deleteUser', { detail: userId });
        window.dispatchEvent(event);
    }
    async handlePageChange(page) {
        this.currentPage = page;
        await this.loadUsers();
    }
    async setSearchQuery(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        await this.loadUsers();
    }
    async setSorting(field) {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        }
        else {
            this.sortField = field;
            this.sortOrder = 'asc';
        }
        await this.loadUsers();
    }
    getSortOrder() {
        return {
            field: this.sortField,
            order: this.sortOrder
        };
    }
    async loadUsers() {
        try {
            const skip = (this.currentPage - 1) * this.itemsPerPage;
            const response = await userService.getUsers(skip, this.itemsPerPage, this.searchQuery, this.sortField, this.sortOrder);
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to load users');
            }
            this.totalUsers = response.data.total;
            this.pagination.update(this.currentPage, this.totalUsers);
            // Apply sorting
            const sortedUsers = this.sortUsers(response.data.items);
            this.userTable.render(sortedUsers);
        }
        catch (error) {
            console.error('Error loading users:', error);
            throw error;
        }
    }
    sortUsers(users) {
        return [...users].sort((a, b) => {
            const aValue = a[this.sortField];
            const bValue = b[this.sortField];
            if (aValue === undefined || bValue === undefined)
                return 0;
            if (aValue === bValue)
                return 0;
            const comparison = aValue < bValue ? -1 : 1;
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
    }
}
//# sourceMappingURL=UserManager.js.map