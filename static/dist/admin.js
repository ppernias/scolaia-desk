import { UserManager } from './components/admin/UserManager.js';
import { UserEditor } from './components/admin/UserEditor.js';
import { SettingManager } from './components/admin/SettingManager.js';
import { ADLAssistantManager } from './components/admin/ADLAssistantManager.js';
import { userService } from './services/userService.js';
import { setupFetchInterceptor } from './auth.js';
class AdminPanel {
    constructor() {
        this.userManager = new UserManager({
            tableId: 'usersTableBody',
            paginationId: 'usersPagination'
        });
        this.userEditor = new UserEditor('editUserModal');
        this.settingManager = new SettingManager({
            containerId: 'settingsTableContainer',
            modalId: 'editSettingModal'
        });
        this.adlAssistantManager = new ADLAssistantManager();
        this.init();
    }
    init() {
        this.setupEventListeners();
        this.userManager.loadUsers();
        this.settingManager.loadSettings();
    }
    setupEventListeners() {
        this.setupSearchListeners();
        this.setupSortingListeners();
        this.setupUserActionListeners();
        this.setupSettingActionListeners();
    }
    setupSearchListeners() {
        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('userSearch');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                if (searchInput) {
                    this.userManager.setSearchQuery(searchInput.value);
                }
            });
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.userManager.setSearchQuery(searchInput.value);
                }
            });
        }
    }
    setupSortingListeners() {
        const thead = document.querySelector('thead');
        if (!thead)
            return;
        thead.addEventListener('click', (e) => {
            const target = e.target;
            const th = target.closest('.sortable');
            if (!th || !(th instanceof HTMLElement))
                return;
            const field = th.dataset.sort;
            if (!field)
                return;
            this.userManager.setSorting(field);
            // Update sort icons
            const { field: sortField, order } = this.userManager.getSortOrder();
            document.querySelectorAll('th.sortable').forEach(header => {
                header.classList.remove('asc', 'desc');
                if (header instanceof HTMLElement && header.dataset.sort === sortField) {
                    header.classList.add(order);
                }
            });
        });
    }
    setupUserActionListeners() {
        // Listen for edit user events
        window.addEventListener('editUser', ((e) => {
            if (e.detail) {
                this.userEditor.show(e.detail);
            }
        }));
        // Listen for delete user events
        window.addEventListener('deleteUser', ((e) => {
            if (e.detail) {
                this.showDeleteConfirmation(e.detail);
            }
        }));
        // Listen for user updates
        window.addEventListener('userUpdated', () => {
            this.userManager.loadUsers();
        });
    }
    setupSettingActionListeners() {
        const container = document.getElementById('settingsTableContainer');
        const saveButton = document.getElementById('saveSettingButton');
        if (container) {
            container.addEventListener('click', async (e) => {
                const target = e.target;
                const button = target.closest('button');
                if (!button || button.dataset.action !== 'edit')
                    return;
                const settingData = button.dataset.setting;
                if (settingData) {
                    const setting = JSON.parse(settingData);
                    await this.settingManager.editSetting(setting);
                }
            });
        }
        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                try {
                    await this.settingManager.saveChanges();
                    alert('Setting updated successfully');
                }
                catch (error) {
                    alert(error instanceof Error ? error.message : 'Error updating setting');
                }
            });
        }
    }
    showDeleteConfirmation(userId) {
        var _a;
        const userIdInput = document.getElementById('deleteUserId');
        const modalElement = document.getElementById('deleteConfirmationModal');
        if (userIdInput && modalElement) {
            userIdInput.value = userId.toString();
            // Configurar el event listener para el botu00f3n de confirmación de eliminación
            // Esto es crucial: configuramos el event listener JUSTO ANTES de mostrar el modal
            const confirmDeleteButton = document.getElementById('confirmDeleteButton');
            if (confirmDeleteButton) {
                // Eliminar cualquier event listener existente para evitar duplicados
                const newConfirmDeleteButton = confirmDeleteButton.cloneNode(true);
                (_a = confirmDeleteButton.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newConfirmDeleteButton, confirmDeleteButton);
                // Agregar el event listener al nuevo botu00f3n
                newConfirmDeleteButton.addEventListener('click', () => {
                    this.deleteUser();
                });
            }
            // Mostrar el modal
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }
    async deleteUser() {
        const userIdInput = document.getElementById('deleteUserId');
        const modalElement = document.getElementById('deleteConfirmationModal');
        if (!userIdInput || !modalElement)
            return;
        try {
            const response = await userService.deleteUser(Number(userIdInput.value));
            if (response.success) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal)
                    modal.hide();
                this.userManager.loadUsers();
                alert('User deleted successfully');
            }
            else {
                alert(response.error || 'Error deleting user');
            }
        }
        catch (error) {
            console.error('Error deleting user:', error);
            alert(error instanceof Error ? error.message : 'Error deleting user');
        }
    }
}
// Variable global para almacenar la instancia de AdminPanel
let adminPanelInstance = null;
// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que tenemos un token válido
    const token = localStorage.getItem('token');
    if (!token) {
        // Si no hay token en localStorage pero hay una cookie de autorización,
        // extraer el token de la cookie y guardarlo en localStorage
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('Authorization='));
        if (authCookie) {
            const bearerToken = authCookie.split('=')[1].trim();
            if (bearerToken.startsWith('Bearer ')) {
                const token = bearerToken.substring(7);
                localStorage.setItem('token', token);
            }
        }
    }
    // Inicializar el interceptor de fetch para autenticación
    setupFetchInterceptor();
    // Inicializar el panel de administración
    adminPanelInstance = new AdminPanel();
    // Agregar un event listener global para detectar clics en el botón de confirmación de eliminación
    document.addEventListener('click', async (e) => {
        const target = e.target;
        if (target && target.getAttribute('data-action') === 'confirm-delete') {
            console.log('Botón de confirmación de eliminación clickeado');
            if (adminPanelInstance) {
                await adminPanelInstance.deleteUser();
            }
        }
    });
});
//# sourceMappingURL=admin.js.map