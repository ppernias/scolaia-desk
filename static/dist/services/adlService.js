import * as yaml from 'js-yaml';
/**
 * Service for interacting with ADL (Assistant Definition Language) configuration.
 *
 * The ADL service provides methods to validate, retrieve, and manage the Assistant
 * Definition Language configuration, which defines the behavior and capabilities
 * of the AI assistant in the Scolaia application.
 */
class ADLService {
    /**
     * Validates YAML syntax for ADL configuration.
     *
     * This method checks if the provided YAML text is syntactically valid,
     * which is essential before saving ADL configuration to the database.
     *
     * @param yamlText - The YAML text to validate.
     * @returns ApiResponse with validation result.
     */
    async validateYaml(yamlText) {
        try {
            // Try to parse the YAML.
            yaml.load(yamlText);
            return {
                success: true,
                data: {
                    isValid: true
                }
            };
        }
        catch (error) {
            return {
                success: true,
                data: {
                    isValid: false,
                    errors: [error instanceof Error ? error.message : 'Invalid YAML']
                }
            };
        }
    }
    /**
     * Gets a specific value from the ADL configuration using a path.
     *
     * This method retrieves a specific value from the ADL structure by its path,
     * allowing targeted access to configuration elements without loading the entire ADL.
     *
     * @param path - The path to the value in the ADL structure (e.g., "assistant_instructions.tools.commands").
     * @returns ApiResponse with the path and its value.
     */
    async getValue(path) {
        try {
            const response = await fetch(`/api/v1/adl/value/${encodeURIComponent(path)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to get ADL value'
                };
            }
            return {
                success: true,
                data: await response.json()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get ADL value'
            };
        }
    }
    /**
     * Lists all commands defined in the ADL configuration.
     *
     * This method retrieves a list of all commands defined in the ADL structure,
     * providing an overview of the available commands in the AI assistant.
     *
     * @returns ApiResponse with an array of command names.
     */
    async listCommands() {
        try {
            const response = await fetch('/api/v1/adl/commands', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to list ADL commands'
                };
            }
            return {
                success: true,
                data: await response.json()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list ADL commands'
            };
        }
    }
    /**
     * Lists all options defined in the ADL configuration.
     *
     * This method retrieves a list of all options defined in the ADL structure,
     * providing an overview of the available options in the AI assistant.
     *
     * @returns ApiResponse with options object.
     */
    async listOptions() {
        try {
            const response = await fetch('/api/v1/adl/options', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to list ADL options'
                };
            }
            return {
                success: true,
                data: await response.json()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list ADL options'
            };
        }
    }
    /**
     * Lists all decorators defined in the ADL configuration.
     *
     * This method retrieves a list of all decorators defined in the ADL structure,
     * providing an overview of the available decorators in the AI assistant.
     *
     * @returns ApiResponse with decorators object.
     */
    async listDecorators() {
        try {
            const response = await fetch('/api/v1/adl/decorators', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.detail || 'Failed to list ADL decorators'
                };
            }
            return {
                success: true,
                data: await response.json()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list ADL decorators'
            };
        }
    }
}
/**
 * Singleton instance of the ADLService.
 */
export const adlService = new ADLService();
//# sourceMappingURL=adlService.js.map