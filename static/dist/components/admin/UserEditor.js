import { userService } from '../../services/userService.js';
import { emailService } from '../../services/emailService.js';
export class UserEditor {
    constructor(modalId) {
        this.currentUserId = 0;
        this.saveButton = null;
        this.sendMailButton = null;
        this.cancelButton = null;
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            throw new Error(`Modal element with id ${modalId} not found`);
        }
        this.modal = modalElement;
        this.modalInstance = new window.bootstrap.Modal(this.modal);
        // Initialize buttons
        this.saveButton = document.getElementById('saveUserButton');
        this.sendMailButton = document.getElementById('sendApprovalMailButton');
        this.cancelButton = document.querySelector(`#${modalId} .btn-close, #${modalId} .btn-secondary`);
        this.setupEventListeners();
    }
    setupEventListeners() {
        const approvedCheckbox = document.getElementById('editIsApproved');
        if (approvedCheckbox) {
            approvedCheckbox.addEventListener('change', () => {
                if (this.sendMailButton) {
                    this.sendMailButton.disabled = !approvedCheckbox.checked;
                }
            });
        }
        // Setup cancel button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.hide();
            });
        }
        // Setup save button
        if (this.saveButton) {
            this.saveButton.addEventListener('click', async () => {
                try {
                    await this.saveChanges();
                    this.hide();
                    // Emit custom event for refresh
                    window.dispatchEvent(new CustomEvent('userUpdated'));
                }
                catch (error) {
                    console.error('Error saving user:', error);
                    alert(error instanceof Error ? error.message : 'Error saving user');
                }
            });
        }
        // Setup send mail button
        if (this.sendMailButton) {
            this.sendMailButton.addEventListener('click', async () => {
                try {
                    await this.saveChanges();
                    await this.sendApprovalEmail();
                    this.hide();
                    // Emit custom event for refresh
                    window.dispatchEvent(new CustomEvent('userUpdated'));
                }
                catch (error) {
                    console.error('Error sending approval email:', error);
                    alert(error instanceof Error ? error.message : 'Error sending approval email');
                }
            });
        }
    }
    show(user) {
        if (!user || !user.id) {
            throw new Error('Invalid user data');
        }
        this.currentUserId = user.id;
        this.setFormValues(user);
        this.modalInstance.show();
    }
    hide() {
        this.modalInstance.hide();
    }
    setFormValues(user) {
        const userIdInput = document.getElementById('editUserId');
        const fullNameInput = document.getElementById('editFullName');
        const emailInput = document.getElementById('editEmail');
        const isActiveInput = document.getElementById('editIsActive');
        const isAdminInput = document.getElementById('editIsAdmin');
        const isApprovedInput = document.getElementById('editIsApproved');
        if (!userIdInput || !fullNameInput || !emailInput || !isActiveInput || !isAdminInput || !isApprovedInput) {
            throw new Error('Required form elements not found');
        }
        userIdInput.value = user.id.toString();
        fullNameInput.value = user.fullname;
        emailInput.value = user.email;
        isActiveInput.checked = user.status === 'active';
        isAdminInput.checked = user.role === 'admin';
        isApprovedInput.checked = user.status !== 'inactive';
        if (this.sendMailButton) {
            this.sendMailButton.disabled = user.status === 'inactive';
        }
    }
    getFormValues() {
        const fullNameInput = document.getElementById('editFullName');
        const emailInput = document.getElementById('editEmail');
        const isActiveInput = document.getElementById('editIsActive');
        const isAdminInput = document.getElementById('editIsAdmin');
        const isApprovedInput = document.getElementById('editIsApproved');
        if (!fullNameInput || !emailInput || !isActiveInput || !isAdminInput || !isApprovedInput) {
            throw new Error('Required form elements not found');
        }
        return {
            fullname: fullNameInput.value,
            email: emailInput.value,
            is_active: isActiveInput.checked,
            is_admin: isAdminInput.checked,
            is_approved: isApprovedInput.checked
        };
    }
    async saveChanges() {
        if (!this.currentUserId) {
            throw new Error('No user selected for editing');
        }
        const userData = this.getFormValues();
        try {
            const response = await userService.updateUser(this.currentUserId, userData);
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to update user');
            }
            if (this.sendMailButton) {
                this.sendMailButton.disabled = !userData.is_approved;
            }
            return true;
        }
        catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
    async sendApprovalEmail() {
        if (!this.currentUserId) {
            throw new Error('No user selected for sending email');
        }
        try {
            const response = await emailService.sendApprovalEmail(this.currentUserId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to send approval email');
            }
            // La respuesta ya fue validada por el servicio
            alert('Approval email sent successfully');
        }
        catch (error) {
            console.error('Error sending approval email:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=UserEditor.js.map