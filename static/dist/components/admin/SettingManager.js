import { settingService } from '../../services/settingService.js';
import { notificationService } from '../../services/notificationService.js';
import { SettingTable } from './SettingTable.js';
export class SettingManager {
    constructor(options) {
        this.options = options;
        const modalElement = document.getElementById(options.modalId);
        if (!modalElement) {
            throw new Error(`Modal element with id ${options.modalId} not found`);
        }
        this.modalElement = modalElement;
        this.modal = new bootstrap.Modal(this.modalElement);
        this.settingTable = new SettingTable(options.containerId, {
            onEdit: this.editSetting.bind(this),
            onDelete: this.handleDeleteAssistant.bind(this),
            onFlush: this.handleFlushAssistantSettings.bind(this),
            onLoadModels: this.handleLoadModels.bind(this),
            onTestEmail: this.handleTestEmail.bind(this)
        });
        // Add event listener for form submission
        const form = this.modalElement.querySelector('form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        // Escuchar el evento personalizado para actualizar los settings
        document.addEventListener('settings-changed', this.loadSettings.bind(this));
    }
    async loadSettings() {
        try {
            const response = await settingService.getSettings();
            if (response.success && response.data) {
                // Filter out Assistant ADL setting
                const filteredSettings = response.data.filter(setting => setting.key !== 'Assistant ADL');
                this.settingTable.render(filteredSettings);
            }
            else {
                console.error('SettingManager: Failed to load settings', response.error);
            }
        }
        catch (error) {
            console.error('SettingManager: Error loading settings', error);
        }
    }
    async editSetting(setting) {
        const editSettingValue = document.getElementById('editSettingValue');
        if (!editSettingValue) {
            throw new Error('Edit setting value element not found');
        }
        if (setting.category === 'OpenAI' && setting.key === 'model' && this.settingTable.availableModels.length > 0) {
            this.createModelSelect(editSettingValue, setting);
        }
        else {
            await this.restoreInput(editSettingValue, setting);
        }
        this.setFormValues(setting);
        this.modal.show();
    }
    async handleSubmit(event) {
        event.preventDefault();
        try {
            const success = await this.saveChanges();
            if (success) {
                // Mostrar mensaje de éxito
                const successMessage = document.createElement('div');
                successMessage.className = 'alert alert-success alert-dismissible fade show';
                successMessage.innerHTML = `
                    Setting updated successfully
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                const container = document.querySelector('.container');
                if (container) {
                    container.insertBefore(successMessage, container.firstChild);
                    // Auto-dismiss after 3 seconds
                    setTimeout(() => {
                        successMessage.remove();
                    }, 3000);
                }
            }
        }
        catch (error) {
            console.error('Error in form submission:', error);
            // Mostrar mensaje de error
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger alert-dismissible fade show';
            errorMessage.innerHTML = `
                Error updating setting: ${error instanceof Error ? error.message : 'Unknown error'}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(errorMessage, container.firstChild);
            }
        }
    }
    createModelSelect(element, setting) {
        var _a;
        const select = document.createElement('select');
        select.className = 'form-select';
        select.id = 'editSettingValue';
        this.settingTable.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.selected = model.id === setting.value;
            select.appendChild(option);
        });
        (_a = element.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(select, element);
    }
    async restoreInput(element, setting) {
        var _a;
        if (element.tagName === 'SELECT') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.id = 'editSettingValue';
            (_a = element.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(input, element);
        }
        const inputElement = document.getElementById('editSettingValue');
        if (!inputElement)
            return;
        if (setting.is_encrypted) {
            try {
                const response = await settingService.getDecryptedValue(setting.id);
                if (response.success && response.data) {
                    inputElement.value = response.data;
                }
                else {
                    console.error('Error getting decrypted value:', response.error);
                    inputElement.value = '';
                }
            }
            catch (error) {
                console.error('Error getting decrypted value:', error);
                inputElement.value = '';
            }
        }
        else {
            inputElement.value = setting.value;
        }
    }
    setFormValues(setting) {
        const idElement = document.getElementById('editSettingId');
        const categoryElement = document.getElementById('editSettingCategory');
        const keyElement = document.getElementById('editSettingKey');
        if (idElement)
            idElement.value = setting.id.toString();
        if (categoryElement)
            categoryElement.value = setting.category;
        if (keyElement) {
            keyElement.value = setting.key;
            keyElement.textContent = setting.key;
        }
    }
    async saveChanges() {
        var _a, _b, _c, _d;
        const settingId = (_a = document.getElementById('editSettingId')) === null || _a === void 0 ? void 0 : _a.value;
        const settingValue = (_b = document.getElementById('editSettingValue')) === null || _b === void 0 ? void 0 : _b.value;
        if (!settingId || !settingValue) {
            throw new Error('Required form values not found');
        }
        try {
            const response = await settingService.updateSetting(Number(settingId), { value: settingValue });
            if (response.success) {
                this.modal.hide();
                // Recargar los settings inmediatamente después de guardar
                await this.loadSettings();
                (_d = (_c = this.options).onSettingUpdate) === null || _d === void 0 ? void 0 : _d.call(_c);
                return true;
            }
            else {
                console.error('Error updating setting:', response.error);
                return false;
            }
        }
        catch (error) {
            console.error('Error updating setting:', error);
            throw error;
        }
    }
    async handleDeleteAssistant(assistantId) {
        if (!assistantId) {
            alert('No assistant ID provided');
            return;
        }
        // Mostrar notificación de progreso
        const notification = notificationService.progress(`Deleting assistant ${assistantId}...`);
        try {
            const response = await fetch(`/api/v1/assistants/delete/${assistantId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (response.ok) {
                notification.success(data.message || 'Assistant deleted successfully');
                // Recargar los settings después de borrar el asistente
                await this.loadSettings();
                // Emitir evento para actualizar otras partes de la UI
                document.dispatchEvent(new CustomEvent('settings-changed'));
            }
            else {
                notification.error(data.detail || 'Error deleting assistant');
            }
        }
        catch (error) {
            console.error('Error deleting assistant:', error);
            notification.error(error instanceof Error ? error.message : 'Error deleting assistant');
        }
    }
    async handleFlushAssistantSettings() {
        if (!confirm('Are you sure you want to flush all assistant settings? This will remove all assistant configurations including the ADL description. This action cannot be undone.')) {
            return;
        }
        // Mostrar notificación de progreso
        const notification = notificationService.progress('Flushing assistant settings...');
        try {
            const response = await fetch('/api/v1/assistants/flush-assistant-settings', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (response.ok) {
                notification.success(data.message || 'Assistant settings flushed successfully');
                // Recargar los settings después de borrar los settings
                await this.loadSettings();
                // Emitir evento para actualizar otras partes de la UI
                document.dispatchEvent(new CustomEvent('settings-changed'));
            }
            else {
                notification.error(data.detail || 'Error flushing assistant settings');
            }
        }
        catch (error) {
            console.error('Error flushing assistant settings:', error);
            notification.error(error instanceof Error ? error.message : 'Error flushing assistant settings');
        }
    }
    async handleLoadModels() {
        // Mostrar notificación de progreso
        const notification = notificationService.progress('Loading OpenAI models...');
        try {
            const response = await settingService.loadOpenAIModels();
            if (response.success && response.data) {
                this.settingTable.availableModels = response.data;
                notification.success(`Successfully loaded ${response.data.length} models`);
            }
            else {
                notification.error(response.error || 'Error loading models');
            }
        }
        catch (error) {
            console.error('Error loading models:', error);
            notification.error(error instanceof Error ? error.message : 'Error loading models');
        }
    }
    async handleTestEmail() {
        // Mostrar notificación de progreso
        const notification = notificationService.progress('Testing email configuration...');
        try {
            const response = await settingService.testEmailConfiguration();
            if (response.success && response.data) {
                notification.success(response.data.message || 'Email test successful');
            }
            else {
                notification.error(response.error || 'Email test failed');
            }
        }
        catch (error) {
            console.error('Error testing email configuration:', error);
            notification.error(error instanceof Error ? error.message : 'Error testing email configuration');
        }
    }
}
//# sourceMappingURL=SettingManager.js.map