import { userService } from '../../services/userService.js';
import { UserTable } from './UserTable.js';
import { Pagination } from './Pagination.js';
import type { User } from '../../types/services.js';
import type { UserManagerComponent, UserManagerOptions } from '../../types/components.js';

export class UserManager implements UserManagerComponent {
    private searchQuery: string = '';
    private currentPage: number = 1;
    private itemsPerPage: number = 10;
    private totalUsers: number = 0;
    private sortField: string = 'id';
    private sortOrder: 'asc' | 'desc' = 'asc';
    
    private userTable: UserTable;
    private pagination: Pagination;
    private options: UserManagerOptions;

    constructor(options: UserManagerOptions) {
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

    private handleEdit(user: User): void {
        // Dispatch event for AdminPanel to handle
        const event = new CustomEvent('editUser', { detail: user });
        window.dispatchEvent(event);
    }

    private handleDelete(userId: number): void {
        // Dispatch event for AdminPanel to handle
        const event = new CustomEvent('deleteUser', { detail: userId });
        window.dispatchEvent(event);
    }

    private async handlePageChange(page: number): Promise<void> {
        this.currentPage = page;
        await this.loadUsers();
    }

    public async setSearchQuery(query: string): Promise<void> {
        this.searchQuery = query;
        this.currentPage = 1;
        await this.loadUsers();
    }

    public async setSorting(field: string): Promise<void> {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortOrder = 'asc';
        }
        await this.loadUsers();
    }

    public getSortOrder(): { field: string; order: 'asc' | 'desc' } {
        return {
            field: this.sortField,
            order: this.sortOrder
        };
    }

    public async loadUsers(): Promise<void> {
        try {
            const skip = (this.currentPage - 1) * this.itemsPerPage;
            const response = await userService.getUsers(
                skip,
                this.itemsPerPage,
                this.searchQuery,
                this.sortField,
                this.sortOrder
            );

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to load users');
            }

            this.totalUsers = response.data.total;
            this.pagination.update(this.currentPage, this.totalUsers);

            // Apply sorting
            const sortedUsers = this.sortUsers(response.data.items);

            this.userTable.render(sortedUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            throw error;
        }
    }

    private sortUsers(users: User[]): User[] {
        return [...users].sort((a, b) => {
            const aValue = a[this.sortField as keyof User];
            const bValue = b[this.sortField as keyof User];
            
            if (aValue === undefined || bValue === undefined) return 0;
            if (aValue === bValue) return 0;
            
            const comparison = aValue < bValue ? -1 : 1;
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
    }
}
