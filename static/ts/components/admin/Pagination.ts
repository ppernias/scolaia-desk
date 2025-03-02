import type { PaginationComponent, PaginationOptions } from '../../types/components';

export class Pagination implements PaginationComponent {
    private pagination: HTMLElement;
    private itemsPerPage: number;
    private currentPage: number;
    private totalItems: number;
    private pageChangeCallback?: (page: number) => void;

    constructor(paginationId: string, options: PaginationOptions) {
        const element = document.getElementById(paginationId);
        if (!element) {
            throw new Error(`Element with id ${paginationId} not found`);
        }
        this.pagination = element;
        this.itemsPerPage = options.itemsPerPage;
        this.currentPage = 1;
        this.totalItems = 0;
        
        if (options.onPageChange) {
            this.setPageChangeCallback(options.onPageChange);
        }
    }

    update(currentPage: number, totalItems: number): void {
        this.currentPage = currentPage;
        this.totalItems = totalItems;
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        
        this.pagination.innerHTML = '';

        // Previous button
        this.pagination.appendChild(this.createPageItem(
            'Previous',
            this.currentPage === 1,
            () => this.onPageChange(this.currentPage - 1)
        ));

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            this.pagination.appendChild(this.createPageItem(
                i.toString(),
                false,
                () => this.onPageChange(i),
                this.currentPage === i
            ));
        }

        // Next button
        this.pagination.appendChild(this.createPageItem(
            'Next',
            this.currentPage === totalPages,
            () => this.onPageChange(this.currentPage + 1)
        ));
    }

    setPageChangeCallback(callback: (page: number) => void): void {
        this.pageChangeCallback = callback;
    }

    private createPageItem(
        text: string,
        disabled: boolean,
        onClick: () => void,
        active = false
    ): HTMLElement {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        
        if (!disabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                onClick();
            });
        }
        
        li.appendChild(a);
        return li;
    }

    private onPageChange(page: number): void {
        if (page < 1 || page > Math.ceil(this.totalItems / this.itemsPerPage)) {
            return;
        }
        this.pageChangeCallback?.(page);
    }
}
