import { settingService } from '../../services/settingService.js';
export class SettingTable {
    constructor(containerId, options = {}) {
        this.availableModels = [];
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Element with id ${containerId} not found`);
        }
        this.container = element;
        this.options = options;
        // Listen for refresh events
        document.addEventListener('refreshSettings', async () => {
            await this.loadSettings();
        });
        // Create confirmation dialog
        this.confirmDialog = document.createElement('div');
        this.confirmDialog.className = 'modal fade';
        this.confirmDialog.id = 'deleteConfirmDialog';
        this.confirmDialog.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Action</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p id="confirmDialogMessage">Are you sure you want to delete this assistant? This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmAction">Delete</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.confirmDialog);
        this.modal = new bootstrap.Modal(this.confirmDialog);
    }
    async loadSettings() {
        try {
            const response = await settingService.getSettings();
            if (response.success && response.data) {
                // Filter out Assistant ADL setting
                const filteredSettings = response.data.filter(setting => setting.key !== 'Assistant ADL');
                this.render(filteredSettings);
            }
            else {
                console.error('Error loading settings:', response.error);
            }
        }
        catch (error) {
            console.error('Error loading settings:', error);
            throw error;
        }
    }
    render(settings) {
        // Group settings by category
        const groupedSettings = settings.reduce((acc, setting) => {
            const category = setting.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(setting);
            return acc;
        }, {});
        // Clear container
        this.container.innerHTML = '';
        // Render each category
        Object.entries(groupedSettings).forEach(([category, categorySettings]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mb-4';
            // Add category title
            const title = document.createElement('h4');
            title.className = 'mb-3';
            title.textContent = category;
            // Add buttons container
            const titleContainer = document.createElement('div');
            titleContainer.className = 'd-flex align-items-center gap-3';
            titleContainer.appendChild(title);
            // Add test button for email configuration
            if (category === 'Email Configuration' && this.options.onTestEmail) {
                const testButton = document.createElement('button');
                testButton.className = 'btn btn-sm btn-outline-primary';
                testButton.innerHTML = '<i class="fas fa-paper-plane"></i> Test';
                testButton.addEventListener('click', async () => {
                    var _a, _b;
                    try {
                        testButton.disabled = true;
                        testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
                        await ((_b = (_a = this.options).onTestEmail) === null || _b === void 0 ? void 0 : _b.call(_a));
                    }
                    finally {
                        testButton.disabled = false;
                        testButton.innerHTML = '<i class="fas fa-paper-plane"></i> Test';
                    }
                });
                titleContainer.appendChild(testButton);
            }
            // Add load models button for OpenAI category
            if (category === 'OpenAI' && this.options.onLoadModels) {
                const loadButton = document.createElement('button');
                loadButton.className = 'btn btn-sm btn-outline-primary';
                loadButton.innerHTML = '<i class="fas fa-sync"></i> Load Models';
                loadButton.addEventListener('click', async () => {
                    var _a, _b;
                    try {
                        loadButton.disabled = true;
                        loadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                        await ((_b = (_a = this.options).onLoadModels) === null || _b === void 0 ? void 0 : _b.call(_a));
                    }
                    finally {
                        loadButton.disabled = false;
                        loadButton.innerHTML = '<i class="fas fa-sync"></i> Load Models';
                    }
                });
                titleContainer.appendChild(loadButton);
            }
            categoryDiv.appendChild(titleContainer);
            // Create table for this category
            const table = document.createElement('table');
            table.className = 'table table-hover';
            // Table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th style="width: 30%">Key</th>
                    <th style="width: 50%">Value</th>
                    <th style="width: 20%">Actions</th>
                </tr>
            `;
            table.appendChild(thead);
            // Table body
            const tbody = document.createElement('tbody');
            categorySettings.forEach(setting => {
                const tr = document.createElement('tr');
                // Prepare value display
                let valueDisplay;
                if (setting.is_encrypted) {
                    valueDisplay = '********';
                }
                else {
                    // For non-encrypted values, handle different types appropriately
                    if (setting.value === 'true' || setting.value === 'false') {
                        valueDisplay = `<span class="badge ${setting.value === 'true' ? 'bg-success' : 'bg-danger'}">
                            ${setting.value}
                        </span>`;
                    }
                    else if (!isNaN(Number(setting.value))) {
                        valueDisplay = `<code>${setting.value}</code>`;
                    }
                    else {
                        valueDisplay = setting.value;
                    }
                }
                // Check if this is an informative-only setting
                const isInformativeOnly = setting.category === 'OpenAI' && (setting.key === 'assistant_id' ||
                    setting.key === 'assistant_name' ||
                    setting.key === 'assistant_model');
                // Check if this is the assistant_id setting
                const isAssistantId = setting.category === 'OpenAI' && setting.key === 'assistant_id';
                tr.innerHTML = `
                    <td>
                        <strong>${setting.key}</strong>
                        ${setting.is_encrypted ? '<span class="badge bg-warning text-dark ms-2">Encrypted</span>' : ''}
                        ${isInformativeOnly ? '<span class="badge bg-info text-dark ms-2">Info Only</span>' : ''}
                    </td>
                    <td>${valueDisplay}</td>
                    <td>
                        ${!isInformativeOnly && this.options.onEdit ? `
                            <button class="btn btn-sm btn-primary" data-action="edit">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                        ${isAssistantId && this.options.onDelete ? `
                            <button class="btn btn-sm btn-danger" data-action="delete">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                        ${isAssistantId && this.options.onFlush ? `
                            <button class="btn btn-sm btn-warning" data-action="flush">
                                <i class="fas fa-broom"></i> Flush
                            </button>
                        ` : ''}
                    </td>
                `;
                // Add event listeners
                const tr_element = tbody.appendChild(tr);
                // Edit button event listener
                if (this.options.onEdit) {
                    const editButton = tr_element.querySelector('button[data-action="edit"]');
                    if (editButton) {
                        editButton.addEventListener('click', () => {
                            var _a, _b;
                            (_b = (_a = this.options).onEdit) === null || _b === void 0 ? void 0 : _b.call(_a, setting);
                        });
                    }
                }
                // Delete button event listener
                if (this.options.onDelete && isAssistantId) {
                    const deleteButton = tr_element.querySelector('button[data-action="delete"]');
                    if (deleteButton) {
                        deleteButton.addEventListener('click', (event) => {
                            var _a, _b;
                            event.preventDefault();
                            // Show confirmation dialog
                            const confirmBtn = document.getElementById('confirmAction');
                            const messageEl = document.getElementById('confirmDialogMessage');
                            if (!confirmBtn || !messageEl)
                                return;
                            messageEl.textContent = 'Are you sure you want to delete this assistant? This action cannot be undone.';
                            confirmBtn.textContent = 'Delete';
                            confirmBtn.className = 'btn btn-danger';
                            const handleDelete = async () => {
                                var _a, _b;
                                // Disable button to prevent double clicks
                                deleteButton.disabled = true;
                                // Show loading state
                                const originalText = deleteButton.textContent || '';
                                deleteButton.textContent = 'Deleting...';
                                try {
                                    await ((_b = (_a = this.options).onDelete) === null || _b === void 0 ? void 0 : _b.call(_a, setting.value));
                                    this.modal.hide();
                                    // Refresh settings
                                    document.dispatchEvent(new CustomEvent('refreshSettings'));
                                }
                                finally {
                                    // Re-enable button and restore text
                                    deleteButton.disabled = false;
                                    deleteButton.textContent = originalText;
                                }
                            };
                            // Remove previous event listener if exists
                            const newConfirmBtn = confirmBtn.cloneNode(true);
                            (_a = confirmBtn.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newConfirmBtn, confirmBtn);
                            (_b = document.getElementById('confirmAction')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', handleDelete);
                            // Show modal
                            this.modal.show();
                        });
                    }
                }
                // Flush button event listener
                if (this.options.onFlush && isAssistantId) {
                    const flushButton = tr_element.querySelector('button[data-action="flush"]');
                    if (flushButton) {
                        flushButton.addEventListener('click', (event) => {
                            var _a, _b;
                            event.preventDefault();
                            // Show confirmation dialog
                            const confirmBtn = document.getElementById('confirmAction');
                            const messageEl = document.getElementById('confirmDialogMessage');
                            if (!confirmBtn || !messageEl)
                                return;
                            messageEl.textContent = 'Are you sure you want to flush all assistant settings from the database? This will remove all assistant configuration but will not delete the assistant from OpenAI.';
                            confirmBtn.textContent = 'Flush';
                            confirmBtn.className = 'btn btn-warning';
                            const handleFlush = async () => {
                                var _a, _b;
                                // Disable button to prevent double clicks
                                flushButton.disabled = true;
                                // Show loading state
                                const originalText = flushButton.textContent || '';
                                flushButton.textContent = 'Flushing...';
                                try {
                                    await ((_b = (_a = this.options).onFlush) === null || _b === void 0 ? void 0 : _b.call(_a));
                                    this.modal.hide();
                                    // Refresh settings
                                    document.dispatchEvent(new CustomEvent('refreshSettings'));
                                }
                                finally {
                                    // Re-enable button and restore text
                                    flushButton.disabled = false;
                                    flushButton.textContent = originalText;
                                }
                            };
                            // Remove previous event listener if exists
                            const newConfirmBtn = confirmBtn.cloneNode(true);
                            (_a = confirmBtn.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newConfirmBtn, confirmBtn);
                            (_b = document.getElementById('confirmAction')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', handleFlush);
                            // Show modal
                            this.modal.show();
                        });
                    }
                }
            });
            table.appendChild(tbody);
            categoryDiv.appendChild(table);
            this.container.appendChild(categoryDiv);
        });
    }
}
//# sourceMappingURL=SettingTable.js.map