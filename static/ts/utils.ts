import type { User } from './types/services.js';

export function formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

export function getStatusBadge(user: User): string {
    const statusClasses: { [key: string]: string } = {
        active: 'bg-success',
        inactive: 'bg-secondary',
        suspended: 'bg-warning',
        deleted: 'bg-danger'
    };

    const status = user.status || 'inactive';
    const statusClass = statusClasses[status] || 'bg-secondary';
    return `<span class="badge ${statusClass}">${status}</span>`;
}

export function getRoleBadge(user: User): string {
    const roleClasses: { [key: string]: string } = {
        admin: 'bg-danger',
        user: 'bg-primary',
        guest: 'bg-info'
    };

    const role = user.role || 'user';
    const roleClass = roleClasses[role] || 'bg-secondary';
    return `<span class="badge ${roleClass}">${role}</span>`;
}
