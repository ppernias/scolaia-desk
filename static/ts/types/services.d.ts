export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface User {
    id: number;
    email: string;
    fullname: string;
    role: 'admin' | 'user' | 'guest';
    status: 'active' | 'inactive' | 'suspended' | 'deleted';
    creation_date: string;
    last_login: string;
    token_count?: number;
}

export interface Setting {
    id: number;
    category: string;
    key: string;
    value: string;
    is_encrypted: boolean;
    description?: string;
}

export interface OpenAIConfig {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

export interface OpenAIModel {
    id: string;
    name: string;
    description?: string;
    maxTokens?: number;
}

export interface EmailTestResult {
    success: boolean;
    message?: string;
    error?: string;
}

export interface YamlValidationResult {
    isValid: boolean;
    errors?: string[];
}

export interface UserUpdateData {
    fullname: string;
    email: string;
    is_active: boolean;
    is_admin: boolean;
    is_approved: boolean;
}

export interface ApprovalEmailResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface Assistant {
    id: string;
    name: string;
    model: string;
    created_at: string;
    message?: string;
}

export interface AssistantList {
    data: Assistant[];
    has_more: boolean;
}

export interface ADLValidationResult {
    isValid: boolean;
    errors?: string[];
}

// Service interfaces
export interface UserService {
    getUsers(): Promise<ApiResponse<User[]>>;
    createUser(user: Omit<User, 'id'>): Promise<ApiResponse<User>>;
    updateUser(id: number, user: Partial<User>): Promise<ApiResponse<User>>;
    deleteUser(id: number): Promise<ApiResponse<void>>;
}

export interface SettingService {
    getSettings(): Promise<ApiResponse<Setting[]>>;
    updateSetting(id: number, data: { value: string }): Promise<ApiResponse<Setting>>;
    getDecryptedValue(id: number): Promise<ApiResponse<string>>;
    loadOpenAIModels(): Promise<ApiResponse<OpenAIModel[]>>;
    testEmailConfiguration(): Promise<ApiResponse<EmailTestResult>>;
}

export interface OpenAIService {
    initialize(): Promise<ApiResponse<void>>;
    sendMessage(message: string): Promise<ApiResponse<string>>;
    deleteAssistant(assistantId: string): Promise<ApiResponse<{ message?: string }>>;
    purgeAssistantSettings(): Promise<ApiResponse<{ message?: string }>>;
}

export interface YamlValidationService {
    validate(yaml: string): Promise<YamlValidationResult>;
}

export interface ADLService {
    validateYaml(yaml: string): Promise<ApiResponse<ADLValidationResult>>;
    getValue(path: string): Promise<ApiResponse<{path: string; value: any}>>;
    listCommands(): Promise<ApiResponse<{commands: string[]}>>;
    listOptions(): Promise<ApiResponse<{options: any}>>;
    listDecorators(): Promise<ApiResponse<{decorators: any}>>;
}

export interface AssistantService {
    listAssistants(limit?: number): Promise<ApiResponse<AssistantList>>;
    createAssistant(yamlData: any): Promise<ApiResponse<Assistant>>;
    updateAssistant(assistantId: string, yamlData: any): Promise<ApiResponse<Assistant>>;
    deleteAssistant(assistantId: string): Promise<ApiResponse<{message?: string}>>;
}

export interface UserEditorService {
    updateUser(id: number, data: UserUpdateData): Promise<ApiResponse<User>>;
    sendApprovalEmail(id: number): Promise<ApiResponse<ApprovalEmailResponse>>;
}

// Bootstrap types
declare global {
    interface Window {
        settingService: SettingService;
        openaiService: OpenAIService;
        userEditorService: UserEditorService;
        bootstrap: {
            Modal: {
                new(element: HTMLElement, options?: any): {
                    show(): void;
                    hide(): void;
                };
                getInstance(element: HTMLElement): {
                    show(): void;
                    hide(): void;
                } | null;
            };
        };
    }
}

export {};
