/**
 * Service for validating YAML content against a schema
 */
class YAMLValidationService {
    constructor() {
        this.schema = null;
    }
    /**
     * Loads the YAML schema from the server
     * @returns The loaded schema
     * @throws Error if schema cannot be loaded
     */
    async loadSchema() {
        if (this.schema)
            return this.schema;
        try {
            const response = await fetch('/static/schemas/schema.yaml');
            if (!response.ok) {
                throw new Error(`Failed to load schema file: ${response.status} ${response.statusText}`);
            }
            const schemaText = await response.text();
            this.schema = yaml.load(schemaText);
            return this.schema;
        }
        catch (error) {
            console.error('Error loading schema:', error);
            throw error;
        }
    }
    /**
     * Validates the syntax of YAML text
     * @param yamlText - YAML content to validate
     * @returns Validation result with parsed data if valid
     */
    validateYAMLStructure(yamlText) {
        try {
            const parsed = yaml.load(yamlText);
            return {
                isValid: true,
                parsed
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: `YAML Syntax Error: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    /**
     * Validates parsed YAML data against a schema
     * @param data - Parsed YAML data
     * @param schema - Optional schema to validate against (uses loaded schema if not provided)
     * @returns Validation result
     * @throws Error if schema is not loaded and not provided
     */
    validateAgainstSchema(data, schema = null) {
        const schemaToUse = schema || this.schema;
        if (!schemaToUse) {
            throw new Error('Schema not loaded. Call loadSchema() first.');
        }
        return this.validateObject(data, schemaToUse);
    }
    /**
     * Validates an object against a schema
     * @param data - Object to validate
     * @param schema - Schema to validate against
     * @returns Validation result
     */
    validateObject(data, schema) {
        // Validate required fields
        if (schema.required) {
            for (const field of schema.required) {
                if (!(field in data)) {
                    return {
                        isValid: false,
                        error: `Missing required field: ${field}`
                    };
                }
            }
        }
        // Validate properties
        if (schema.properties) {
            for (const [key, value] of Object.entries(data)) {
                const propertySchema = schema.properties[key];
                if (!propertySchema) {
                    return {
                        isValid: false,
                        error: `Unknown property: ${key}`
                    };
                }
                // Validate type
                if (propertySchema.type === 'object' && value) {
                    const result = this.validateObject(value, propertySchema);
                    if (!result.isValid) {
                        return {
                            isValid: false,
                            error: `In ${key}: ${result.error}`
                        };
                    }
                }
                else if (propertySchema.type === 'array' && Array.isArray(value)) {
                    if (!propertySchema.items) {
                        return {
                            isValid: false,
                            error: `Array items schema not defined for ${key}`
                        };
                    }
                    for (let i = 0; i < value.length; i++) {
                        if (propertySchema.items.type === 'object') {
                            const result = this.validateObject(value[i], propertySchema.items);
                            if (!result.isValid) {
                                return {
                                    isValid: false,
                                    error: `In ${key}[${i}]: ${result.error}`
                                };
                            }
                        }
                        else if (typeof value[i] !== propertySchema.items.type) {
                            return {
                                isValid: false,
                                error: `In ${key}[${i}]: Expected type ${propertySchema.items.type}, got ${typeof value[i]}`
                            };
                        }
                    }
                }
                else if (typeof value !== propertySchema.type) {
                    return {
                        isValid: false,
                        error: `Invalid type for ${key}: expected ${propertySchema.type}, got ${typeof value}`
                    };
                }
            }
        }
        return { isValid: true };
    }
}
/**
 * Singleton instance of the YAML validation service
 */
export const yamlValidationService = new YAMLValidationService();
//# sourceMappingURL=yamlValidationService.js.map