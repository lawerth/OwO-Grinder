import { ConfigSchema, Configuration } from "@/schemas/ConfigSchema.js";
import path from "node:path";
import { logger } from "@/utils/logger.js";

import { DataManager } from "./DataManager.js";

/**
 * Manages application configuration data, providing methods to load, retrieve, update, and delete configuration entries.
 * 
 * The `ConfigManager` class interacts with a `DataManager` to persist configuration data and uses a schema (`ConfigSchema`)
 * to validate configuration objects. All configuration entries are stored in-memory and changes are automatically saved.
 *
 * @example
 * const manager = new ConfigManager();
 * manager.set('user123', { enabled: true });
 * const config = manager.get('user123');
 * manager.delete('user123');
 *
 * @remarks
 * - All configuration values are validated against `ConfigSchema` before being stored.
 * - Changes are persisted immediately after set or delete operations.
 *
 * @public
 */
export class ConfigManager {
    private dataManager = new DataManager(path.join(process.cwd(), "config/data.json"));
    private globalDataManager = new DataManager(path.join(process.cwd(), "config/global_data.json"));
    private configs: Record<string, Configuration> = {};
    private globalConfig: Partial<Configuration> = {};

    constructor() {
        this.loadAll();
    }

    private loadAll = () => {
        let globalData = this.globalDataManager.read() as Record<string, any>;
        if (globalData.channelID && !globalData.channels) {
            globalData.channels = globalData.channelID;
            delete globalData.channelID;
            this.globalDataManager.write(globalData);
        }
        this.globalConfig = globalData || {};

        const data = this.dataManager.read() as Record<string, any>;
        let dataChanged = false;
        for (const key in data) {
            const accountData = data[key] as Record<string, any>;
            if (accountData.channelID && !accountData.channels) {
                accountData.channels = accountData.channelID;
                delete accountData.channelID;
                dataChanged = true;
            }
        }
        if (dataChanged) {
            this.dataManager.write(data);
        }

        let existingConfigCount = Object.keys(data).length;

        for (const key in data) {
            const mergedConfig = { ...this.globalConfig, ...(data[key] as Record<string, unknown>) };
            const result = ConfigSchema.safeParse(mergedConfig);
            if (result.success) {
                this.configs[key] = result.data as Configuration;
            } else {
                this.configs[key] = mergedConfig as Configuration;
                const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
                logger.warn(`Account ${key} has configuration errors but was loaded anyway: ${errors}`);
            }
        }

        if (Object.keys(this.globalConfig).length === 0 && existingConfigCount > 0) {
            this.migrateToGlobal();
        }
    }

    private migrateToGlobal = () => {
        const keys = Object.keys(this.configs);
        if (keys.length === 0) return;

        const firstConfig = this.configs[keys[0]] as Record<string, any>;
        const commonKeys: Record<string, any> = {};

        for (const prop in firstConfig) {
            if (prop === "token" || prop === "username") continue;

            let isCommon = true;
            for (const key of keys) {
                const conf = this.configs[key] as Record<string, any>;
                if (JSON.stringify(conf[prop]) !== JSON.stringify(firstConfig[prop])) {
                    isCommon = false;
                    break;
                }
            }
            if (isCommon) {
                commonKeys[prop] = firstConfig[prop];
            }
        }

        this.globalConfig = commonKeys;
        this.globalDataManager.write(this.globalConfig);
        this.saveAll();
    }

    public getAllKeys = (): string[] => {
        return Object.keys(this.configs);
    }

    public get = (key: string): Configuration | undefined => {
        return this.configs[key];
    }

    public set = (key: string, value: Configuration): void => {
        const result = ConfigSchema.safeParse(value);
        if (!result.success) {
            throw new Error(`Invalid configuration for key "${key}": ${result.error.message}`);
        }
        this.configs[key] = result.data as Configuration;
        this.saveAll();
    }

    public delete = (key: string): boolean => {
        if (this.configs[key]) {
            delete this.configs[key];
            this.saveAll();
            return true;
        }
        return false;
    }

    private saveAll = (): void => {
        const toSave: Record<string, Partial<Configuration>> = {};
        
        for (const key in this.configs) {
            const specificConfig = { ...this.configs[key] } as Record<string, any>;
            const global = this.globalConfig as Record<string, any>;
            
            for (const prop in specificConfig) {
                if (prop === "token" || prop === "username") continue;
                
                if (JSON.stringify(specificConfig[prop]) === JSON.stringify(global[prop])) {
                    delete specificConfig[prop];
                }
            }
            toSave[key] = specificConfig as Partial<Configuration>;
        }
        
        this.dataManager.write(toSave);
    }
}