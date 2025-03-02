import type { User } from './services';

export function formatDate(date: string | Date): string;
export function getStatusBadge(user: User): string;
export function getRoleBadge(user: User): string;
