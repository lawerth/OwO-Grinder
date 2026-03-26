import path from "node:path";
import fs from "node:fs";

import { logger } from "@/utils/logger.js";
import { Configuration } from "@/schemas/ConfigSchema.js";
import { t } from "@/utils/locales.js";

import { ConfigPrompter } from "./ConfigPrompter.js";
import { ExtendedClient } from "./core/ExtendedClient.js";
import { ConfigManager } from "./core/ConfigManager.js";

export class InquirerUI {
    private static client: ExtendedClient<true>;
    private static config: Partial<Configuration> = {};
    private static configManager = new ConfigManager();
    private static configPrompter: ConfigPrompter;

    static prompt = async (client: ExtendedClient<true>): Promise<Configuration[]> => {
        this.client = client;
        this.configPrompter = new ConfigPrompter({ client, getConfig: () => this.config });

        const accountList = this.configManager.getAllKeys().map(key => ({
            username: this.configManager.get(key)?.username || "Unknown",
            id: key
        }));

        if (accountList.length === 0) {
            logger.error("No accounts found in config/data.json. Please add your account(s) manually.");
            process.exit(-1);
        }

        const accountSelection = await this.configPrompter.listAccounts(accountList);
        
        if (accountSelection === "run_selected") {
            const selectedIds = await this.configPrompter.selectMultipleAccounts(accountList);
            return selectedIds.map(k => this.configManager.get(k)!);
        }

        if (accountSelection === "run_all") {
            return this.configManager.getAllKeys().map(k => this.configManager.get(k)!);
        }

        const config = this.configManager.get(accountSelection);
        if (!config) {
            logger.error(`Configuration for account ${accountSelection} not found.`);
            process.exit(-1);
        }

        return [config];
    }
}