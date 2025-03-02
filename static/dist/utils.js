export function formatDate(date) {
    if (!date)
        return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}
export function getStatusBadge(user) {
    const statusClasses = {
        active: 'bg-success',
        inactive: 'bg-secondary',
        suspended: 'bg-warning',
        deleted: 'bg-danger'
    };
    const status = user.status || 'inactive';
    const statusClass = statusClasses[status] || 'bg-secondary';
    return `<span class="badge ${statusClass}">${status}</span>`;
}
export function getRoleBadge(user) {
    const roleClasses = {
        admin: 'bg-danger',
        user: 'bg-primary',
        guest: 'bg-info'
    };
    const role = user.role || 'user';
    const roleClass = roleClasses[role] || 'bg-secondary';
    return `<span class="badge ${roleClass}">${role}</span>`;
}
//# sourceMappingURL=utils.js.map