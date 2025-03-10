"use strict";
/**
 * Class for handling chat via WebSockets
 *
 * This class provides real-time chat functionality using WebSockets, enabling
 * a seamless and interactive conversation experience with the AI assistant.
 * It handles message submission, file uploads, and displays the streamed
 * responses with proper formatting.
 */
class ChatWebSocket {
    /**
     * Initializes the WebSocket chat interface
     *
     * Sets up event listeners, establishes the WebSocket connection,
     * and sends an initial welcome message to start the conversation.
     *
     * This method is responsible for initializing the chat interface and
     * setting up the necessary event listeners for user interactions.
     * It also establishes the WebSocket connection to the server and
     * sends an initial welcome message to start the conversation.
     */
    constructor() {
        this.elements = {
            form: document.getElementById('wsChatForm'),
            input: document.getElementById('wsMessageInput'),
            messages: document.getElementById('wsChatMessages'),
            sendButton: document.getElementById('wsSendButton'),
            fileInput: document.getElementById('fileInput'),
            filePreview: document.getElementById('filePreview')
        };
        this.socket = null;
        this.isConnected = false;
        this.isProcessing = false;
        this.currentResponseElement = null;
        this.selectedFiles = []; // Se cambió de selectedFile a selectedFiles como arreglo para admitir varias cargas de archivos
        this.extractedText = '';
        if (!this.elements.form || !this.elements.input || !this.elements.messages ||
            !this.elements.sendButton || !this.elements.fileInput || !this.elements.filePreview) {
            console.error('Could not find all required elements');
            return;
        }
        this.initWebSocket();
        this.elements.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.elements.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        // Send automatic welcome message
        this.sendWelcomeMessage();
    }
    /**
     * Initializes the WebSocket connection
     *
     * Establishes a connection to the server's WebSocket endpoint and
     * sets up event handlers for the connection lifecycle (open, message, error, close).
     */
    initWebSocket() {
        // Determine WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/v1/chat/ws`;
        this.socket = new WebSocket(wsUrl);
        this.socket.onopen = () => {
            this.isConnected = true;
            this.setConnectionStatus(true);
        };
        this.socket.onclose = () => {
            this.isConnected = false;
            this.setConnectionStatus(false);
            // Try to reconnect after a delay
            setTimeout(() => this.initWebSocket(), 3000);
        };
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
            this.setConnectionStatus(false);
        };
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            }
            catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
    }
    /**
     * Handles messages received from the WebSocket
     *
     * Processes incoming messages from the server, updating the chat interface
     * accordingly. This includes displaying streamed responses, handling errors,
     * and updating the connection status.
     */
    handleWebSocketMessage(data) {
        if (data.type === 'token') {
            // Update the current message with the new token
            if (this.currentResponseElement) {
                const textSpan = this.currentResponseElement.querySelector('.message-text');
                if (textSpan) {
                    // Get the cursor if it exists
                    const cursor = textSpan.querySelector('.typing-cursor');
                    // Display content token by token without Markdown formatting yet
                    const rawText = data.content || '';
                    // Create a text node with the new content
                    const textNode = document.createTextNode(rawText);
                    // If there's a cursor, insert the text before the cursor
                    if (cursor) {
                        textSpan.insertBefore(textNode, cursor);
                    }
                    else {
                        // If no cursor, simply add the text
                        textSpan.appendChild(textNode);
                    }
                    // Save the full text to format it at the end
                    this.currentResponseElement.setAttribute('data-full-response', data.full_response);
                    this.scrollToBottom();
                }
            }
        }
        else if (data.type === 'complete') {
            // Message completed - now apply Markdown to the full text
            if (this.currentResponseElement) {
                const textSpan = this.currentResponseElement.querySelector('.message-text');
                if (textSpan && window.marked) {
                    // Remove the cursor if it exists
                    const cursor = textSpan.querySelector('.typing-cursor');
                    if (cursor) {
                        cursor.remove();
                    }
                    const fullResponse = this.currentResponseElement.getAttribute('data-full-response') || '';
                    textSpan.innerHTML = window.marked.parse(fullResponse);
                }
            }
            this.isProcessing = false;
            this.setLoadingState(false);
            this.scrollToBottom();
        }
        else if (data.type === 'error') {
            // Error in processing
            if (this.currentResponseElement) {
                const textSpan = this.currentResponseElement.querySelector('.message-text');
                if (textSpan) {
                    textSpan.textContent = `Error: ${data.error}`;
                }
            }
            this.isProcessing = false;
            this.setLoadingState(false);
        }
        else if (data.status === 'processing') {
            // Processing message, no special action needed
        }
    }
    /**
     * Sends an automatic welcome message
     *
     * Initiates the conversation by sending a welcome message to the server,
     * which will respond with a greeting and start the chat.
     */
    async sendWelcomeMessage() {
        // Wait for the WebSocket connection to be established
        const waitForConnection = (callback) => {
            if (this.isConnected) {
                callback();
            }
            else {
                setTimeout(() => waitForConnection(callback), 100);
            }
        };
        waitForConnection(() => {
            // Add empty assistant message that will be filled in
            this.currentResponseElement = this.addMessage('', false);
            // Send message to the server
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.isProcessing = true;
                this.setLoadingState(true);
                this.socket.send(JSON.stringify({ content: "Who are you?" }));
            }
        });
    }
    /**
     * Handles form submission
     *
     * Processes the user's input, prepares the message for sending, and
     * dispatches it to the server via the WebSocket connection.
     */
    handleSubmit(event) {
        event.preventDefault();
        if (this.isProcessing) {
            return;
        }
        const message = this.elements.input.value.trim();
        if (!message && !this.selectedFiles.length && !this.extractedText) {
            return;
        }
        // Prepare the message with file text if it exists
        let fullMessage = message;
        if (this.extractedText) {
            fullMessage += `\n\nReference text: [${this.extractedText}]`;
        }
        // Create the user message to display in the interface
        let displayMessage = message;
        // If there's a selected file, add the file tag to the displayed message
        if (this.selectedFiles.length) {
            const fileNames = this.selectedFiles.map(file => file.name);
            const truncatedNames = fileNames.map(name => name.length > 20
                ? name.substring(0, 17) + '...'
                : name);
            // If the message is empty, only show the files
            if (!displayMessage) {
                displayMessage = truncatedNames.map(name => `<span class="file-tag">${name}</span>`).join('');
            }
            else {
                // If there's a message, show both the message and the files
                displayMessage = `${displayMessage} ${truncatedNames.map(name => `<span class="file-tag">${name}</span>`).join('')}`;
            }
        }
        // Add the user message to the interface
        const messageElement = this.addMessage(displayMessage, true);
        // If the message contains HTML (like the file tag), render it
        if (displayMessage.includes('<span')) {
            const textSpan = messageElement.querySelector('.message-text');
            if (textSpan) {
                textSpan.innerHTML = displayMessage;
            }
        }
        // Clear the input
        this.elements.input.value = '';
        // Add empty assistant message that will be filled in
        this.currentResponseElement = this.addMessage('', false);
        // Send message to the server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.isProcessing = true;
            this.setLoadingState(true);
            this.socket.send(JSON.stringify({ content: fullMessage }));
        }
        else {
            console.error('WebSocket is not connected');
            this.addSystemMessage('Connection error. Please reload the page.');
        }
        // Clear file selection after sending
        this.clearFileSelection();
    }
    /**
     * Sends a message to the WebSocket server
     *
     * Dispatches a message to the server via the WebSocket connection.
     */
    sendMessage(content) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return;
        }
        this.isProcessing = true;
        this.setLoadingState(true);
        // Send message to the server
        this.socket.send(JSON.stringify({ content }));
    }
    /**
     * Adds a message to the chat
     *
     * Creates a new message element and appends it to the chat interface.
     */
    addMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timestamp.textContent = `${hours}:${minutes}`;
        messageDiv.appendChild(timestamp);
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'message-icon';
        iconSpan.innerHTML = `<i class="fas fa-${isUser ? 'user' : 'robot'}"></i>`;
        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        // If it's a user message, display the text directly
        if (isUser) {
            // Reemplazar saltos de línea con <br> para preservarlos en HTML
            if (content && typeof content === 'string') {
                // Solo aplicar si no contiene ya etiquetas HTML
                if (!content.includes('<span')) {
                    textSpan.innerHTML = content.replace(/\n/g, '<br>');
                }
                else {
                    textSpan.innerHTML = content;
                }
            }
            else {
                textSpan.textContent = '';
            }
        }
        else {
            // If it's an assistant message, initialize empty
            textSpan.textContent = '';
            // Add a blinking cursor to simulate typing
            const cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            cursor.textContent = '▌';
            textSpan.appendChild(cursor);
        }
        messageContent.appendChild(iconSpan);
        messageContent.appendChild(textSpan);
        messageDiv.appendChild(messageContent);
        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
        return messageDiv;
    }
    /**
     * Adds a system message to the chat
     *
     * Creates a new system message element and appends it to the chat interface.
     */
    addSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timestamp.textContent = `${hours}:${minutes}`;
        messageDiv.appendChild(timestamp);
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'message-icon';
        iconSpan.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        textSpan.textContent = message;
        messageContent.appendChild(iconSpan);
        messageContent.appendChild(textSpan);
        messageDiv.appendChild(messageContent);
        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    /**
     * Scrolls to the bottom of the chat
     *
     * Updates the chat interface to display the latest messages.
     */
    scrollToBottom() {
        if (this.elements.messages) {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }
    }
    /**
     * Sets the loading state
     *
     * Updates the chat interface to indicate whether a message is being processed.
     */
    setLoadingState(loading) {
        if (this.elements.sendButton) {
            this.elements.sendButton.disabled = loading;
            this.elements.sendButton.innerHTML = loading
                ? '<i class="fas fa-spinner fa-spin"></i>'
                : 'Send <i class="fas fa-paper-plane ms-2"></i>';
        }
        if (this.elements.input) {
            this.elements.input.disabled = loading;
        }
    }
    /**
     * Sets the connection status
     *
     * Updates the chat interface to indicate the current connection status.
     */
    setConnectionStatus(connected) {
        // Could display a connection indicator in the UI
        if (connected) {
        }
        else {
        }
    }
    /**
     * Handles file selection
     *
     * Processes the selected file and updates the chat interface accordingly.
     */
    handleFileSelect(event) {
        const target = event.target;
        if (target.files && target.files.length > 0) {
            // Añadir los nuevos archivos a los ya existentes
            const newFiles = Array.from(target.files);
            this.selectedFiles = [...this.selectedFiles, ...newFiles];
            // Crear la estructura del preview con botón de eliminar
            this.updateFilePreview();
            // Extract text from the files
            this.extractTextFromFiles();
        }
    }
    /**
     * Updates the file preview in the interface
     */
    updateFilePreview() {
        // Clear existing preview
        this.elements.filePreview.innerHTML = '';
        // If no files, hide the container
        if (this.selectedFiles.length === 0) {
            this.elements.filePreview.classList.add('d-none');
            return;
        }
        // Create an element for each file
        this.selectedFiles.forEach((file, index) => {
            const filePreviewItem = document.createElement('div');
            filePreviewItem.className = 'file-preview-item';
            // File name
            const fileName = file.name;
            const truncatedName = fileName.length > 25
                ? fileName.substring(0, 22) + '...'
                : fileName;
            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'file-name';
            fileNameSpan.textContent = truncatedName;
            filePreviewItem.appendChild(fileNameSpan);
            // Button to remove individual file
            const removeButton = document.createElement('span');
            removeButton.className = 'file-remove';
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.title = 'Remove file';
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event propagation
                this.removeFile(index);
            });
            filePreviewItem.appendChild(removeButton);
            this.elements.filePreview.appendChild(filePreviewItem);
        });
        this.elements.filePreview.classList.remove('d-none');
    }
    /**
     * Removes a specific file from the selection
     *
     * @param index - Index of the file to remove
     */
    removeFile(index) {
        if (index >= 0 && index < this.selectedFiles.length) {
            // Remove the file from the array
            this.selectedFiles.splice(index, 1);
            // If no files remain, clear everything
            if (this.selectedFiles.length === 0) {
                this.clearFileSelection();
                return;
            }
            // Update the interface
            this.updateFilePreview();
            // Update the file input (this is more complicated, as it cannot be modified directly)
            // One solution is to create a new DataTransfer and assign the remaining files
            if (this.elements.fileInput) {
                const newFileList = new DataTransfer();
                this.selectedFiles.forEach(file => {
                    newFileList.items.add(file);
                });
                this.elements.fileInput.files = newFileList.files;
            }
        }
    }
    /**
     * Clears the file selection
     *
     * Resets the file selection and updates the chat interface accordingly.
     */
    clearFileSelection() {
        this.selectedFiles = [];
        this.extractedText = '';
        // Update the interface
        this.updateFilePreview();
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
    }
    /**
     * Extracts text from the selected files
     *
     * Sends the selected files to the server to extract their text content.
     */
    async extractTextFromFiles() {
        var _a;
        if (!this.selectedFiles.length) {
            return;
        }
        // Create a FormData to send the files
        const formData = new FormData();
        this.selectedFiles.forEach(file => formData.append('files[]', file));
        try {
            // Get the CSRF token
            const csrfToken = ((_a = document.querySelector('meta[name="csrf-token"]')) === null || _a === void 0 ? void 0 : _a.getAttribute('content')) || '';
            // Send the files to the server to extract text
            const response = await fetch('/api/v1/chat/extract-text', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': csrfToken
                },
                body: formData
            });
            if (!response.ok) {
                throw new Error(`Error extracting text: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.extractedText = data.text;
        }
        catch (error) {
            console.error('Error extracting text from files:', error);
            // Show an error message to the user
            alert('Could not extract text from the files. Please try with another file.');
            this.clearFileSelection();
        }
    }
}
// Add chatWebSocket to the window object
// We'll use a type assertion approach instead of global augmentation
// to avoid TypeScript errors in this module context
// Initialize WebSocket chat when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make sure marked is available
    if (window.marked) {
        window.marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    }
    // Check if we're in the process of logging out
    const isLoggingOut = window.isLoggingOut;
    if (isLoggingOut) {
        console.log('Skipping WebSocket initialization during logout');
        return;
    }
    // Initialize WebSocket chat and expose it to the window object
    const chatInstance = new ChatWebSocket();
    window.chatWebSocket = chatInstance;
});
//# sourceMappingURL=websocket.js.map