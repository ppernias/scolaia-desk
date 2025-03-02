"use strict";
// adlHelper.ts - Functionality for displaying and using ADL elements in chat
// This file provides a helper class for managing Assistant Definition Language (ADL) elements
// such as commands, options, and decorators in the chat interface.
/**
 * Class that provides helper functionality for ADL elements in the chat interface
 * This class handles the UI components for displaying available ADL elements,
 * manages tab navigation, and provides insertion functionality for commands,
 * options, and decorators in the chat input.
 */
class ADLHelper {
    constructor() {
        this.elements = {
            container: null,
            header: null,
            title: null,
            toggleButton: null,
            tabs: null,
            content: null,
            commandsTab: null,
            optionsTab: null,
            decoratorsTab: null,
            commandsSection: null,
            optionsSection: null,
            decoratorsSection: null
        };
        this.commands = []; // Available commands from the ADL
        this.options = []; // Available options from the ADL
        this.decorators = []; // Available decorators from the ADL
        this.isCollapsed = false; // Track collapsed state of the helper panel
        this.activeTab = 'commands'; // Currently active tab
        this.assistantName = 'Assistant'; // Name of the current assistant
        this.initializeContainer();
        this.loadADLElements();
        this.getAssistantName();
    }
    /**
     * Gets the assistant name from the HTML or uses a default
     * This method attempts to extract the assistant name from the DOM
     * and updates the helper title accordingly.
     */
    getAssistantName() {
        try {
            // Try to get the assistant name from the HTML
            const assistantTitleElement = document.querySelector('.assistant-title');
            if (assistantTitleElement && assistantTitleElement.textContent) {
                this.assistantName = assistantTitleElement.textContent.trim();
            }
            else {
                // If it can't be obtained from HTML, use the default value
                this.assistantName = 'ScolaIA';
            }
            // Update the title with the assistant name
            if (this.elements.title) {
                this.elements.title.textContent = `Available Tools for ${this.assistantName}`;
            }
        }
        catch (error) {
            console.error('Error getting assistant name:', error);
            // In case of error, use the default name
            this.assistantName = 'ScolaIA';
            if (this.elements.title) {
                this.elements.title.textContent = `Available Tools for ${this.assistantName}`;
            }
        }
    }
    /**
     * Initializes the container and UI elements for the ADL helper
     * Creates the DOM structure for the helper panel, including header,
     * tabs, and content sections for different types of ADL elements.
     */
    initializeContainer() {
        // Create the main container for ADL elements
        const chatForm = document.getElementById('wsChatForm');
        if (!chatForm) {
            console.error('Could not find chat form');
            return;
        }
        // Create the main container
        this.elements.container = document.createElement('div');
        this.elements.container.className = 'adl-helper mt-2';
        // Create the header with title and collapse button
        this.elements.header = document.createElement('div');
        this.elements.header.className = 'adl-helper-header';
        this.elements.title = document.createElement('h6');
        this.elements.title.className = 'adl-helper-title';
        this.elements.title.textContent = `Available Tools for ${this.assistantName}`;
        this.elements.toggleButton = document.createElement('button');
        this.elements.toggleButton.className = 'adl-helper-toggle';
        this.elements.toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        this.elements.toggleButton.addEventListener('click', () => this.toggleCollapse());
        this.elements.header.appendChild(this.elements.title);
        this.elements.header.appendChild(this.elements.toggleButton);
        // Create tabs for navigating between different ADL element types
        this.elements.tabs = document.createElement('div');
        this.elements.tabs.className = 'adl-tabs';
        this.elements.commandsTab = this.createTab('Commands', 'commands');
        this.elements.optionsTab = this.createTab('Options', 'options');
        this.elements.decoratorsTab = this.createTab('Decorators', 'decorators');
        this.elements.tabs.appendChild(this.elements.commandsTab);
        this.elements.tabs.appendChild(this.elements.optionsTab);
        this.elements.tabs.appendChild(this.elements.decoratorsTab);
        // Create the content container for displaying ADL elements
        this.elements.content = document.createElement('div');
        this.elements.content.className = 'adl-content';
        // Create sections for each type of ADL element
        this.elements.commandsSection = this.createSection('commands');
        this.elements.optionsSection = this.createSection('options');
        this.elements.decoratorsSection = this.createSection('decorators');
        // Add sections to the content container
        this.elements.content.appendChild(this.elements.commandsSection);
        this.elements.content.appendChild(this.elements.optionsSection);
        this.elements.content.appendChild(this.elements.decoratorsSection);
        // Add all elements to the main container
        this.elements.container.appendChild(this.elements.header);
        this.elements.container.appendChild(this.elements.tabs);
        this.elements.container.appendChild(this.elements.content);
        // Add the container after the form
        chatForm.appendChild(this.elements.container);
        // Activate the first tab by default
        this.activateTab('commands');
    }
    /**
     * Creates a tab element for navigation between ADL element types
     * @param label - The display label for the tab
     * @param id - The ID of the tab
     * @returns The created tab element
     */
    createTab(label, id) {
        const tab = document.createElement('div');
        tab.className = 'adl-tab';
        tab.textContent = label;
        tab.dataset.tab = id;
        tab.addEventListener('click', () => this.activateTab(id));
        return tab;
    }
    /**
     * Creates a section element for a tab
     * @param id - The ID of the section
     * @returns The created section element
     */
    createSection(id) {
        const section = document.createElement('div');
        section.className = 'adl-section';
        section.dataset.section = id;
        const elementsList = document.createElement('div');
        elementsList.className = 'adl-elements';
        section.appendChild(elementsList);
        return section;
    }
    /**
     * Activates a tab and its corresponding section
     * @param tabId - The ID of the tab to activate
     */
    activateTab(tabId) {
        var _a, _b, _c, _d;
        // Deactivate all tabs and sections
        const tabs = (_a = this.elements.tabs) === null || _a === void 0 ? void 0 : _a.querySelectorAll('.adl-tab');
        tabs === null || tabs === void 0 ? void 0 : tabs.forEach(tab => tab.classList.remove('active'));
        const sections = (_b = this.elements.content) === null || _b === void 0 ? void 0 : _b.querySelectorAll('.adl-section');
        sections === null || sections === void 0 ? void 0 : sections.forEach(section => section.classList.remove('active'));
        // Activate the selected tab and section
        const activeTab = (_c = this.elements.tabs) === null || _c === void 0 ? void 0 : _c.querySelector(`[data-tab="${tabId}"]`);
        activeTab === null || activeTab === void 0 ? void 0 : activeTab.classList.add('active');
        const activeSection = (_d = this.elements.content) === null || _d === void 0 ? void 0 : _d.querySelector(`[data-section="${tabId}"]`);
        activeSection === null || activeSection === void 0 ? void 0 : activeSection.classList.add('active');
        this.activeTab = tabId;
    }
    /**
     * Toggles the collapse state of the ADL helper
     */
    toggleCollapse() {
        if (!this.elements.content || !this.elements.tabs || !this.elements.toggleButton)
            return;
        this.isCollapsed = !this.isCollapsed;
        if (this.isCollapsed) {
            this.elements.content.style.display = 'none';
            this.elements.tabs.style.display = 'none';
            this.elements.toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        }
        else {
            this.elements.content.style.display = 'block';
            this.elements.tabs.style.display = 'flex';
            this.elements.toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    }
    /**
     * Loads ADL elements (commands, options, decorators) from the API
     * Fetches the available ADL elements from the server and renders them
     * in their respective sections of the helper panel.
     */
    async loadADLElements() {
        try {
            // Load commands from the ADL API endpoint
            const commandsResponse = await this.fetchAdlCommands();
            if (commandsResponse.success && commandsResponse.data) {
                const commandsData = commandsResponse.data.commands;
                this.commands = Object.entries(commandsData).map(([key, value]) => ({
                    id: key,
                    displayName: value.display_name || key.replace('/', ''),
                    description: value.description || '',
                    prefix: '/'
                }));
                this.renderElements(this.commands, this.elements.commandsSection);
            }
            // Load options from the ADL API endpoint
            const optionsResponse = await this.fetchAdlOptions();
            if (optionsResponse.success && optionsResponse.data) {
                const optionsData = optionsResponse.data.options;
                this.options = Object.entries(optionsData).map(([key, value]) => ({
                    id: key,
                    displayName: value.display_name || key.replace('/', ''),
                    description: value.description || '',
                    prefix: '/'
                }));
                this.renderElements(this.options, this.elements.optionsSection);
            }
            // Load decorators from the ADL API endpoint
            const decoratorsResponse = await this.fetchAdlDecorators();
            if (decoratorsResponse.success && decoratorsResponse.data) {
                const decoratorsData = decoratorsResponse.data.decorators;
                this.decorators = Object.entries(decoratorsData).map(([key, value]) => ({
                    id: key,
                    displayName: value.display_name || key.replace('+++', ''),
                    description: value.description || '',
                    prefix: '+++'
                }));
                this.renderElements(this.decorators, this.elements.decoratorsSection);
            }
        }
        catch (error) {
            console.error('Error loading ADL elements:', error);
        }
    }
    /**
     * Fetches commands from the ADL API
     * @returns API response with commands data
     */
    async fetchAdlCommands() {
        try {
            const response = await fetch('/api/v1/adl/commands', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to list ADL commands'
                };
            }
            return {
                success: true,
                data: await response.json()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list ADL commands'
            };
        }
    }
    /**
     * Fetches options from the ADL API
     * @returns API response with options data
     */
    async fetchAdlOptions() {
        try {
            const response = await fetch('/api/v1/adl/options', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to list ADL options'
                };
            }
            return {
                success: true,
                data: await response.json()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list ADL options'
            };
        }
    }
    /**
     * Fetches decorators from the ADL API
     * @returns API response with decorators data
     */
    async fetchAdlDecorators() {
        try {
            const response = await fetch('/api/v1/adl/decorators', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to list ADL decorators'
                };
            }
            return {
                success: true,
                data: await response.json()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list ADL decorators'
            };
        }
    }
    /**
     * Renders ADL elements to the UI
     * @param elements - Array of ADL elements to render
     * @param container - Container element to render into
     */
    renderElements(elements, container) {
        if (!container)
            return;
        const elementsList = container.querySelector('.adl-elements');
        if (!elementsList)
            return;
        // Clear existing elements
        elementsList.innerHTML = '';
        // Add each element as a badge
        elements.forEach(element => {
            const badge = document.createElement('span');
            // Determine badge class based on element type
            let badgeClass = 'badge me-1 mb-1 ';
            if (element.prefix === '/') {
                if (element.id.startsWith('/lang') || element.id.startsWith('/style')) {
                    badgeClass += 'badge-option';
                }
                else {
                    badgeClass += 'badge-command';
                }
            }
            else if (element.prefix === '+++') {
                badgeClass += 'badge-decorator';
            }
            badge.className = badgeClass;
            badge.textContent = element.displayName;
            badge.title = element.description;
            // Add tooltip using Bootstrap
            badge.setAttribute('data-bs-toggle', 'tooltip');
            badge.setAttribute('data-bs-placement', 'top');
            badge.setAttribute('data-bs-title', element.description);
            // Add click event to insert the command/option/decorator
            badge.addEventListener('click', () => {
                let textToInsert = '';
                if (element.prefix === '+++') {
                    textToInsert = `${element.prefix}${element.id.replace('+++', '')} `;
                }
                else {
                    textToInsert = `${element.id} `;
                }
                this.insertAtCursor(textToInsert);
            });
            elementsList.appendChild(badge);
        });
        // Initialize Bootstrap tooltips
        if (window.bootstrap && window.bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new window.bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    }
    /**
     * Inserts text at the cursor position in the message input
     * @param text - Text to insert
     */
    insertAtCursor(text) {
        const messageInput = document.getElementById('wsMessageInput');
        if (!messageInput)
            return;
        const startPos = messageInput.selectionStart || 0;
        const endPos = messageInput.selectionEnd || 0;
        messageInput.value =
            messageInput.value.substring(0, startPos) +
                text +
                messageInput.value.substring(endPos);
        // Move cursor after inserted text
        const newPos = startPos + text.length;
        messageInput.setSelectionRange(newPos, newPos);
        messageInput.focus();
    }
}
// Initialize the helper when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ADLHelper();
});
//# sourceMappingURL=adlHelper.js.map