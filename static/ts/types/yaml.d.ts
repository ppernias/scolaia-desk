export interface YAMLSchema {
    required?: string[];
    properties?: {
        [key: string]: YAMLPropertySchema;
    };
}

export interface YAMLPropertySchema {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    items?: YAMLPropertySchema;
    properties?: {
        [key: string]: YAMLPropertySchema;
    };
    required?: string[];
}

export interface YAMLValidationResult {
    isValid: boolean;
    error?: string;
    parsed?: any;
}

export interface YAMLValidationService {
    loadSchema(): Promise<YAMLSchema>;
    validateYAMLStructure(yamlText: string): YAMLValidationResult;
    validateAgainstSchema(data: any, schema?: YAMLSchema | null): YAMLValidationResult;
    validateObject(data: any, schema: YAMLSchema): YAMLValidationResult;
}
