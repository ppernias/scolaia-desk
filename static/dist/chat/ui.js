/**
 * UI helper functions for the chat interface
 * These functions handle loading states, message rendering, and text insertion operations
 * for the Scolaia chat application.
 */
/**
 * Sets the loading state for the UI elements
 * Controls the visibility and enabled state of the send button, spinner, and message input
 * during asynchronous operations like message sending and receiving.
 *
 * @param loading - Boolean indicating whether the UI should be in loading state
 */
export function setLoading(loading) {
    const elements = {
        sendButton: document.getElementById('sendButton'),
        buttonContent: document.querySelector('.button-content'),
        spinner: document.querySelector('.spinner'),
        messageInput: document.getElementById('messageInput')
    };
    if (!elements.sendButton || !elements.buttonContent || !elements.spinner || !elements.messageInput) {
        console.error('Required UI elements not found for loading state');
        return;
    }
    if (loading) {
        elements.sendButton.disabled = true;
        elements.buttonContent.classList.add('d-none');
        elements.spinner.classList.remove('d-none');
        elements.messageInput.disabled = true;
    }
    else {
        elements.sendButton.disabled = false;
        elements.buttonContent.classList.remove('d-none');
        elements.spinner.classList.add('d-none');
        elements.messageInput.disabled = false;
        elements.messageInput.focus();
    }
}
/**
 * Adds a message to the chat interface
 * Creates a new message element with appropriate styling based on whether it's a user
 * or assistant message. Supports Markdown rendering if the marked library is available.
 * Automatically scrolls to the latest message.
 *
 * @param content - The message content to add (supports Markdown)
 * @param options - Additional options for message rendering (isUser, allowHtml)
 */
export function addMessage(content, options = { isUser: true }) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) {
        console.error('Chat messages container not found');
        return;
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${options.isUser ? 'user-message' : 'assistant-message'}`;
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'message-icon';
    iconSpan.innerHTML = `<i class="fas fa-${options.isUser ? 'user' : 'robot'}"></i>`;
    const textSpan = document.createElement('span');
    textSpan.className = 'message-text';
    if (window.marked && typeof window.marked.parse === 'function' && !options.isUser) {
        // Use marked only for assistant messages
        textSpan.innerHTML = window.marked.parse(content, {
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    }
    else {
        // For user messages, preserve line breaks
        if (options.isUser && content && typeof content === 'string') {
            textSpan.innerHTML = content.replace(/\n/g, '<br>');
        }
        else {
            textSpan.textContent = content || '';
        }
    }
    messageContent.appendChild(iconSpan);
    messageContent.appendChild(textSpan);
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    // Auto-scroll to bottom to show the latest message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
/**
 * Inserts text at the current cursor position in the message input field
 * Useful for adding commands, options, or other text snippets into the user's input.
 * Maintains focus on the input field after insertion.
 *
 * @param text - The text to insert at the current cursor position
 */
export function insertAtCursor(text) {
    const messageInput = document.getElementById('messageInput');
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
/**
 * Inserts a command at the cursor position in the message input
 * Commands are prefixed with a forward slash (/) and followed by a space
 *
 * @param command - The command name to insert (without the slash prefix)
 */
export function insertCommand(command) {
    insertAtCursor(`/${command} `);
}
/**
 * Inserts an option at the cursor position in the message input
 * Options are prefixed with double dashes (--) and followed by an equals sign
 *
 * @param option - The option name to insert (without the prefix)
 */
export function insertOption(option) {
    insertAtCursor(`--${option}=`);
}
//# sourceMappingURL=ui.js.map