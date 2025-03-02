/**
 * Maneja la funcionalidad de múltiples líneas en textareas
 * 
 * Este script permite que los textareas en los formularios de chat
 * puedan tener múltiples líneas, usando Shift+Enter para insertar
 * una nueva línea y Enter para enviar el formulario.
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando script de textarea multilinea');
    
    // Buscar todos los textareas en la página
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(function(textarea) {
        console.log('Configurando textarea:', textarea.id);
        
        // Establecer atributos iniciales
        textarea.setAttribute('rows', '3');
        textarea.style.minHeight = '80px';
        textarea.style.whiteSpace = 'pre-wrap';
        
        // Manejar el evento keydown
        textarea.addEventListener('keydown', function(e) {
            console.log('Tecla presionada:', e.key, 'Shift:', e.shiftKey);
            
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // No hacer nada especial, permitir el comportamiento por defecto
                    console.log('Shift+Enter detectado, permitiendo nueva línea');
                    return true;
                } else {
                    // Enter sin Shift: enviar formulario
                    const form = this.closest('form');
                    if (form && this.value.trim()) {
                        console.log('Enter detectado, enviando formulario');
                        e.preventDefault();
                        form.dispatchEvent(new Event('submit', { cancelable: true }));
                        return false;
                    }
                }
            }
        });
        
        // Ajustar la altura al escribir
        textarea.addEventListener('input', function() {
            adjustHeight(this);
        });
        
        // Ajustar la altura inicial
        setTimeout(function() {
            adjustHeight(textarea);
        }, 100);
    });
    
    // Función para ajustar la altura del textarea
    function adjustHeight(textarea) {
        // Guardar la posición del scroll
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Restablecer la altura para calcular correctamente
        textarea.style.height = 'auto';
        
        // Establecer la nueva altura basada en el contenido
        const newHeight = Math.max(80, textarea.scrollHeight);
        textarea.style.height = newHeight + 'px';
        console.log('Ajustando altura a:', newHeight, 'px');
        
        // Restaurar la posición del scroll
        window.scrollTo(0, scrollTop);
    }
});
