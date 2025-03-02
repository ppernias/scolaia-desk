import type { User, UserUpdateData, ApprovalEmailResponse } from '../../types/services';
import { userService } from '../../services/userService.js';
import { emailService } from '../../services/emailService.js';

export class UserEditor {
    private modal: HTMLElement;
    private modalInstance: any;
    private currentUserId: number = 0;
    private saveButton: HTMLButtonElement | null = null;
    private sendMailButton: HTMLButtonElement | null = null;
    private cancelButton: HTMLButtonElement | null = null;

    constructor(modalId: string) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            throw new Error(`Modal element with id ${modalId} not found`);
        }
        this.modal = modalElement;
        this.modalInstance = new window.bootstrap.Modal(this.modal);
        
        // Initialize buttons
        this.saveButton = document.getElementById('saveUserButton') as HTMLButtonElement;
        this.sendMailButton = document.getElementById('sendApprovalMailButton') as HTMLButtonElement;
        this.cancelButton = document.querySelector(`#${modalId} .btn-close, #${modalId} .btn-secondary`) as HTMLButtonElement;
        
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        const approvedCheckbox = document.getElementById('editIsApproved') as HTMLInputElement;
        
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
                } catch (error) {
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
                } catch (error) {
                    console.error('Error sending approval email:', error);
                    alert(error instanceof Error ? error.message : 'Error sending approval email');
                }
            });
        }
    }

    show(user: User): void {
        if (!user || !user.id) {
            throw new Error('Invalid user data');
        }
        this.currentUserId = user.id;
        this.setFormValues(user);
        this.modalInstance.show();
    }

    hide(): void {
        this.modalInstance.hide();
    }

    private setFormValues(user: User): void {
        const userIdInput = document.getElementById('editUserId') as HTMLInputElement;
        const fullNameInput = document.getElementById('editFullName') as HTMLInputElement;
        const emailInput = document.getElementById('editEmail') as HTMLInputElement;
        const isActiveInput = document.getElementById('editIsActive') as HTMLInputElement;
        const isAdminInput = document.getElementById('editIsAdmin') as HTMLInputElement;
        const isApprovedInput = document.getElementById('editIsApproved') as HTMLInputElement;

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

    private getFormValues(): UserUpdateData {
        const fullNameInput = document.getElementById('editFullName') as HTMLInputElement;
        const emailInput = document.getElementById('editEmail') as HTMLInputElement;
        const isActiveInput = document.getElementById('editIsActive') as HTMLInputElement;
        const isAdminInput = document.getElementById('editIsAdmin') as HTMLInputElement;
        const isApprovedInput = document.getElementById('editIsApproved') as HTMLInputElement;

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

    async saveChanges(): Promise<boolean> {
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
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async sendApprovalEmail(): Promise<void> {
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
        } catch (error) {
            console.error('Error sending approval email:', error);
            throw error;
        }
    }
}
