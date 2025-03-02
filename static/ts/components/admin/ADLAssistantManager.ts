import * as yaml from 'js-yaml';
import { adlService } from '../../services/adlService.js';
import { assistantService } from '../../services/assistantService.js';
import { settingService } from '../../services/settingService.js';
import { notificationService } from '../../services/notificationService.js';
import type { Setting } from '../../types/services.js';

/**
 * Class for managing the ADL (Assistant Description Language) configuration
 * Provides functionality for loading, validating, and saving ADL settings
 */
export class ADLAssistantManager {
    private configTextarea!: HTMLTextAreaElement;
    private importButton!: HTMLButtonElement;
    private createButton!: HTMLButtonElement;
    private saveButton!: HTMLButtonElement;
    private downloadButton!: HTMLButtonElement;
    private importFile!: HTMLInputElement;
    private currentAssistantId: string | null = null;

    /**
     * Initializes the ADLAssistantManager instance
     */
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.initialize();
        
        // Register the event handler directly in the constructor
        document.addEventListener('settings-changed', this.handleSettingsChanged.bind(this));
    }

    /**
     * Initializes all UI elements needed for the manager
     */
    private initializeElements(): void {
        this.configTextarea = document.getElementById('assistantConfig') as HTMLTextAreaElement;
        this.importButton = document.getElementById('importAssistant') as HTMLButtonElement;
        this.createButton = document.getElementById('createAssistant') as HTMLButtonElement;
        this.saveButton = document.getElementById('saveAssistant') as HTMLButtonElement;
        this.downloadButton = document.getElementById('downloadAssistant') as HTMLButtonElement;
        this.importFile = document.getElementById('importFile') as HTMLInputElement;

        if (!this.configTextarea || !this.importButton || !this.createButton || 
            !this.saveButton || !this.downloadButton || !this.importFile) {
            throw new Error('Required elements not found in the DOM');
        }
    }

    /**
     * Sets up event listeners for UI interactions
     */
    private setupEventListeners(): void {
        // Validate YAML while typing
        this.configTextarea.addEventListener('input', () => this.validateYaml());

        // Import YAML file
        this.importFile.addEventListener('change', (e) => this.handleFileImport(e));

        // Create assistant
        this.createButton.addEventListener('click', () => this.createAssistant());
      
        // Download YAML
        this.downloadButton.addEventListener('click', () => this.downloadYaml());

        // Save changes
        this.saveButton.addEventListener('click', () => this.saveConfig());        
    }

    /**
     * Initializes the ADL configuration
     */
    private async initialize(): Promise<void> {
        try {
            // Load the initial configuration
            await this.loadConfig();

            // Check if an assistant exists and update the button
            await this.updateAssistantState();
        } catch (error) {
            console.error('Error initializing ADL Assistant Manager:', error);
            notificationService.error('Error initializing');
        }
    }

    /**
     * Loads the initial configuration from the server
     */
    private async loadConfig(): Promise<void> {
        try {
            const response = await settingService.getSettings();
            if (!response.success || !response.data) {
                throw new Error('Failed to load settings');
            }

            const assistantSetting = response.data.find((s: Setting) => s.key === 'Assistant ADL');
            
            if (assistantSetting?.value) {
                this.configTextarea.value = assistantSetting.value;
                await this.validateYaml(); // Validate the loaded configuration
            } else {
                this.configTextarea.value = '';
            }
        } catch (error) {
            console.error('Error loading Assistant config:', error);
            notificationService.error('Error loading configuration');
        }
    }

    /**
     * Updates the assistant state
     */
    private async updateAssistantState(): Promise<void> {
        try {
            const response = await settingService.getSettings();
            if (!response.success || !response.data) {
                throw new Error('Failed to load settings');
            }

            const assistantId = response.data.find((s: Setting) => s.key === 'assistant_id')?.value;
            
            if (assistantId) {
                this.currentAssistantId = assistantId;
                this.createButton.textContent = 'Modify Assistant';
            } else {
                this.currentAssistantId = null;
                this.createButton.textContent = 'Create Assistant';
            }
        } catch (error) {
            console.error('Error updating assistant state:', error);
        }
    }

    /**
     * Validates the YAML configuration
     * @returns True if the YAML is valid, false otherwise
     */
    private async validateYaml(): Promise<boolean> {
        const yamlText = this.configTextarea.value;
        if (!yamlText.trim()) {
            notificationService.error('Please enter YAML configuration');
            return false;
        }

        try {
            // Validate YAML syntax
            yaml.load(yamlText);
            
            // Validate ADL structure
            const response = await adlService.validateYaml(yamlText);
            if (!response.success || !response.data?.isValid) {
                const errors = response.data?.errors || ['Invalid ADL configuration'];
                notificationService.error(errors.join('\n'));
                return false;
            }

            return true;
        } catch (error) {
            notificationService.error(error instanceof Error ? error.message : 'Invalid YAML');
            return false;
        }
    }

    /**
     * Handles the file import event
     * @param event - The file import event
     */
    private async handleFileImport(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            const content = await file.text();
            this.configTextarea.value = content;
            if (await this.validateYaml()) {
                notificationService.success('YAML file imported successfully');
            }
        } catch (error) {
            notificationService.error('Error reading file');
        }
    }

    /**
     * Creates a new assistant
     */
    private async createAssistant(): Promise<void> {
        if (!await this.validateYaml()) return;

        // Show progress notification
        const notification = notificationService.progress('Creating assistant...');
        
        try {
            const yamlData = yaml.load(this.configTextarea.value);
            const isModifying = this.currentAssistantId !== null;
            
            // Update message according to the action
            if (isModifying) {
                notification.update(`Updating assistant ${this.currentAssistantId}...`);
            }
            
            let response;
            if (isModifying && this.currentAssistantId) {
                response = await assistantService.updateAssistant(this.currentAssistantId, yamlData);
            } else {
                response = await assistantService.createAssistant(yamlData);
            }

            if (!response.success || !response.data) {
                notification.error(response.error || 'Failed to create assistant');
                return;
            }

            this.currentAssistantId = response.data.id;
            this.createButton.textContent = 'Modify Assistant';
            
            // Save the configuration in the database
            try {
                // Get current configuration
                const settingsResponse = await settingService.getSettings();
                if (!settingsResponse.success || !settingsResponse.data) {
                    throw new Error('Failed to load settings');
                }

                const assistantSetting = settingsResponse.data.find((s: Setting) => s.key === 'Assistant ADL');
                
                // Update or create the configuration
                if (assistantSetting) {
                    notification.update('Updating configuration...');
                    await settingService.updateSetting(assistantSetting.id, {
                        value: this.configTextarea.value
                    });
                } else {
                    notification.update('Saving configuration...');
                    await settingService.createSetting({
                        category: 'System',
                        key: 'Assistant ADL',
                        value: this.configTextarea.value,
                        is_encrypted: false,
                        description: 'Assistant configuration in YAML format'
                    });
                }
            } catch (error) {
                console.error('Error saving configuration:', error);
                // Do not interrupt the main flow if configuration saving fails
            }
            
            // Show success message using the message from the backend
            notification.success(response.data.message || `Assistant ${isModifying ? 'modified' : 'created'} successfully with ID: ${response.data.id}`);
            
            // Emit event to update the settings table
            this.emitSettingsChangeEvent();
        } catch (error) {
            const action = this.currentAssistantId ? 'modifying' : 'creating';
            notification.error(error instanceof Error ? error.message : `Error ${action} assistant`);
        }
    }

    /**
     * Saves the ADL configuration
     */
    private async saveConfig(): Promise<void> {
        if (!await this.validateYaml()) return;

        // Show progress notification
        const notification = notificationService.progress('Saving configuration...');
        
        try {
            const response = await settingService.getSettings();
            if (!response.success || !response.data) {
                notification.error('Failed to load settings');
                throw new Error('Failed to load settings');
            }

            const assistantSetting = response.data.find((s: Setting) => s.key === 'Assistant ADL');
            
            if (assistantSetting) {
                notification.update('Updating existing configuration...');
                await settingService.updateSetting(assistantSetting.id, {
                    value: this.configTextarea.value
                });
            } else {
                notification.update('Creating new configuration...');
                await settingService.createSetting({
                    category: 'System',
                    key: 'Assistant ADL',
                    value: this.configTextarea.value,
                    is_encrypted: false,
                    description: 'Assistant configuration in YAML format'
                });
            }
            
            notification.success('Configuration saved successfully');
            
            // Emit event to update the settings table
            this.emitSettingsChangeEvent();
        } catch (error) {
            notification.error(error instanceof Error ? error.message : 'Error saving configuration');
        }
    }

    /**
     * Downloads the ADL content as a YAML file
     * The filename is based on metadata.description.title from the ADL
     */
    private async downloadYaml(): Promise<void> {
        try {
            // First validate the YAML
            if (!await this.validateYaml()) {
                notificationService.error('Cannot download: Invalid YAML format');
                return;
            }

            // Mostrar notificación de progreso
            const notification = notificationService.progress('Preparando descarga...');
            
            try {
                // Usar el endpoint del backend para descargar el archivo
                // Esto evita problemas de seguridad con blob URLs y data URIs en conexiones HTTP
                const apiUrl = '/api/v1/adl/download';
                
                // Crear un enlace temporal para la descarga
                const link = document.createElement('a');
                link.href = apiUrl;
                link.target = '_blank'; // Abrir en una nueva pestaña/ventana
                
                // Ocultar el elemento para que no sea visible
                link.style.display = 'none';
                document.body.appendChild(link);
                
                // Simular clic y luego eliminar el elemento
                link.click();
                document.body.removeChild(link);
                
                // Mostrar mensaje de éxito
                notification.success('Archivo descargado correctamente');
            } catch (error) {
                notification.error('Error al descargar el archivo');
                console.error('Error downloading YAML:', error);
            }
        } catch (error) {
            console.error('Error downloading YAML:', error);
            notificationService.error('Error downloading YAML file');
        }
    }

    /**
     * Emits a custom event when settings change
     */
    private emitSettingsChangeEvent(): void {
        const event = new CustomEvent('settings-changed');
        document.dispatchEvent(event);
    }

    /**
     * Handles the settings-changed event
     */
    private async handleSettingsChanged(): Promise<void> {
        try {
            await this.loadConfig();
            await this.updateAssistantState();
        } catch (error) {
            console.error('Error refreshing assistant configuration:', error);
        }
    }
}
