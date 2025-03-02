// textarea-handler.ts - Handles the behavior of the textarea in the chat interface

document.addEventListener('DOMContentLoaded', () => {
    // Select all possible chat textareas (to cover all chat versions)
    const messageInputs = [
        document.getElementById('messageInput'),
        document.getElementById('wsMessageInput'),
        document.getElementById('streamMessageInput')
    ].filter(input => input !== null);
    
    messageInputs.forEach(messageInput => {
        if (!messageInput) return;
        
        // Get the parent form of the textarea
        const chatForm = messageInput.closest('form');
        
        if (chatForm) {
            // Configure the textarea
            const textarea = messageInput as HTMLTextAreaElement;
            textarea.style.whiteSpace = 'pre-wrap';
            
            // Set minimum height and initial height based on ID
            if (textarea.id === 'wsMessageInput') {
                textarea.style.minHeight = '60px';
                textarea.style.height = '65px'; // Fixed height for wsMessageInput
            } else {
                textarea.style.minHeight = '80px';
                textarea.style.height = 'auto';
            }
            
            // Handle Enter key in the textarea
            messageInput.addEventListener('keydown', (e: KeyboardEvent) => {
                // If Enter is pressed without Shift
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent default line break
                    
                    // Only send if there's content
                    if (textarea.value.trim()) {
                        chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                } else if (e.key === 'Enter' && e.shiftKey) {
                    // Shift+Enter already allows new line by default
                }
            });

            // Automatically adjust textarea height based on content
            messageInput.addEventListener('input', () => {
                adjustTextareaHeight(textarea);
            });
            
            // Initialize height when page loads
            adjustTextareaHeight(textarea);
        }
    });

    // Function to adjust textarea height
    function adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
        // Save scroll position
        const scrollPos = window.scrollY;
        
        if (textarea.id === 'wsMessageInput') {
            // For wsMessageInput, maintain fixed height of 65px
            textarea.style.height = '65px';
        } else {
            // For other textareas, adjust dynamically
            textarea.style.height = 'auto';
            // Set new height based on content
            // with a minimum of 80px for normal textareas
            const newHeight = Math.max(80, textarea.scrollHeight);
            textarea.style.height = newHeight + 'px';
        }
        
        // Restore scroll position
        window.scrollTo(0, scrollPos);
    }
});
