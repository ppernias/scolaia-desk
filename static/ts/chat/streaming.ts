/**
 * Class for handling chat with streaming
 */
class ChatStreaming {
    private elements = {
        form: document.getElementById('streamChatForm') as HTMLFormElement,
        input: document.getElementById('streamMessageInput') as HTMLInputElement,
        messages: document.getElementById('streamChatMessages') as HTMLDivElement,
        sendButton: document.getElementById('streamSendButton') as HTMLButtonElement
    };

    private isStreaming = false;
    private controller: AbortController | null = null;

    constructor() {
        if (!this.elements.form || !this.elements.input || !this.elements.messages || !this.elements.sendButton) {
            console.error('Could not find all required elements');
            return;
        }

        this.elements.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    /**
     * Handles form submission
     */
    private async handleSubmit(event: Event): Promise<void> {
        event.preventDefault();
        
        if (this.isStreaming) {
            return;
        }

        const message = this.elements.input.value.trim();
        if (!message) {
            return;
        }

        // Add user message
        this.addMessage(message, true);
        this.elements.input.value = '';

        // Add empty assistant message that will be filled in
        const responseElement = this.addMessage('', false);

        // Start streaming
        this.streamResponse(message, responseElement);
    }

    /**
     * Makes the streaming request
     */
    private async streamResponse(message: string, responseElement: HTMLElement): Promise<void> {
        this.isStreaming = true;
        this.setLoadingState(true);
        this.controller = new AbortController();

        try {
            const response = await fetch('/api/v1/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: message }),
                signal: this.controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} ${response.statusText}. Details: ${errorText}`);
            }

            // Create a reader to read the stream
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Stream reader could not be created');
            }

            // Process the stream
            const decoder = new TextDecoder();
            let responseText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Decode and process chunks
                const chunk = decoder.decode(value, { stream: true });
                
                // Process lines
                const lines = chunk.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        
                        if (data === '[DONE]') {
                            break;
                        } else if (data === '[ERROR]') {
                            break;
                        } else {
                            // Add the token to the response
                            responseText += data;
                            
                            // Update the message content
                            const textSpan = responseElement.querySelector('.message-text');
                            if (textSpan && window.marked) {
                                textSpan.innerHTML = window.marked.parse(responseText);
                            } else if (textSpan) {
                                textSpan.textContent = responseText;
                            }
                            
                            // Scroll
                            this.scrollToBottom();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in streaming:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Update with error message
            const textSpan = responseElement.querySelector('.message-text');
            if (textSpan) {
                textSpan.textContent = `Error: ${errorMessage}`;
            }
        } finally {
            this.isStreaming = false;
            this.setLoadingState(false);
            this.controller = null;
        }
    }

    /**
     * Adds a message to the chat
     */
    private addMessage(content: string, isUser: boolean): HTMLElement {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'message-icon';
        iconSpan.innerHTML = `<i class="fas fa-${isUser ? 'user' : 'robot'}"></i>`;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        
        if (window.marked && !isUser) {
            textSpan.innerHTML = window.marked.parse(content || '');
        } else {
            // For user messages, preserve line breaks
            if (isUser && content && typeof content === 'string') {
                textSpan.innerHTML = content.replace(/\n/g, '<br>');
            } else {
                textSpan.textContent = content || '';
            }
        }
        
        messageContent.appendChild(iconSpan);
        messageContent.appendChild(textSpan);
        messageDiv.appendChild(messageContent);
        
        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }

    /**
     * Scrolls to the bottom of the chat
     */
    private scrollToBottom(): void {
        if (this.elements.messages) {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }
    }

    /**
     * Sets the loading state
     */
    private setLoadingState(loading: boolean): void {
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
}

// Initialize streaming chat when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make sure marked is available
    if (window.marked) {
        window.marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    } else {
        console.error("marked.js is not available");
    }
    
    new ChatStreaming();
});
