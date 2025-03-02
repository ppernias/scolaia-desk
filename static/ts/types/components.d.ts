import type { User, Setting } from './services';

export interface SortOrder {
    field: string;
    order: 'asc' | 'desc';
}

export interface UserTableOptions {
    onEdit?: (user: User) => void;
    onDelete?: (userId: number) => void;
}

export interface PaginationOptions {
    itemsPerPage: number;
    onPageChange?: (page: number) => void;
}

export interface UserManagerOptions {
    tableId: string;
    paginationId: string;
    onUserUpdate?: () => void;
}

export interface TableComponent {
    render(data: any[]): void;
}

export interface PaginationComponent {
    update(currentPage: number, totalItems: number): void;
    setPageChangeCallback(callback: (page: number) => void): void;
}

export interface UserTableComponent extends TableComponent {
    render(users: User[]): void;
    initTooltips(): void;
}

export interface UserManagerComponent {
    loadUsers(): Promise<void>;
    setSearchQuery(query: string): Promise<void>;
    setSorting(field: string): Promise<void>;
    getSortOrder(): SortOrder;
}

export interface SettingTableOptions {
    onEdit?: (setting: Setting) => void;
    onDelete?: (assistantId: string) => void;
    onFlush?: () => Promise<void>;
    onLoadModels?: () => Promise<void>;
    onTestEmail?: () => Promise<void>;
}

export interface SettingManagerOptions {
    containerId: string;
    modalId: string;
    onSettingUpdate?: () => void;
}

export interface SettingTableComponent extends TableComponent {
    render(settings: Setting[]): void;
    loadSettings(): Promise<void>;
    availableModels: OpenAIModel[];
}

export interface SettingManagerComponent {
    loadSettings(): Promise<void>;
    editSetting(setting: Setting): Promise<void>;
    saveChanges(): Promise<boolean>;
}

export interface OpenAIModel {
    id: string;
    name: string;
}
