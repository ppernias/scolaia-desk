import { formatDate, getStatusBadge, getRoleBadge } from '../../utils.js';
import type { User } from '../../types/services.js';
import type { UserTableComponent, UserTableOptions } from '../../types/components.js';

declare const bootstrap: {
    Tooltip: new (element: HTMLElement) => { dispose: () => void };
};

export class UserTable implements UserTableComponent {
    private tableBody: HTMLElement;
    private tooltips: { dispose: () => void }[] = [];
    private options: UserTableOptions;

    constructor(tableBodyId: string, options: UserTableOptions = {}) {
        const element = document.getElementById(tableBodyId);
        if (!element) {
            throw new Error(`Element with id ${tableBodyId} not found`);
        }
        this.tableBody = element;
        this.options = options;
    }

    render(users: User[]): void {
        this.tableBody.innerHTML = '';
        this.tooltips = [];

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td data-bs-toggle="tooltip" title="${user.fullname}">${user.fullname}</td>
                <td data-bs-toggle="tooltip" title="${user.email}">${user.email}</td>
                <td>${getStatusBadge(user)}</td>
                <td>${getRoleBadge(user)}</td>
                <td data-bs-toggle="tooltip" title="${formatDate(user.creation_date)}">${formatDate(user.creation_date)}</td>
                <td data-bs-toggle="tooltip" title="${formatDate(user.last_login)}">${formatDate(user.last_login)}</td>
                <td>${user.token_count || 0}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" data-action="edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" data-action="delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            // Add event listeners
            const editButton = tr.querySelector('[data-action="edit"]');
            const deleteButton = tr.querySelector('[data-action="delete"]');

            if (editButton && this.options.onEdit) {
                editButton.addEventListener('click', () => this.options.onEdit?.(user));
            }

            if (deleteButton && this.options.onDelete) {
                deleteButton.addEventListener('click', () => this.options.onDelete?.(user.id));
            }

            this.tableBody.appendChild(tr);
        });

        // Initialize tooltips
        this.initTooltips();
    }

    initTooltips(): void {
        // Destroy existing tooltips
        if (this.tooltips.length > 0) {
            this.tooltips.forEach(tooltip => tooltip.dispose());
            this.tooltips = [];
        }

        // Initialize new tooltips
        const tooltipTriggerList = Array.from(
            this.tableBody.querySelectorAll('[data-bs-toggle="tooltip"]')
        );

        this.tooltips = tooltipTriggerList.map(element => 
            new bootstrap.Tooltip(element as HTMLElement)
        );
    }
}
