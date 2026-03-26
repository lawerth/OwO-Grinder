import { ConfigManager } from "@/structure/core/ConfigManager.js";
import { BaseAgent } from "@/structure/BaseAgent.js";
import { logger } from "@/utils/logger.js";
import { ExtendedClient } from "@/structure/core/ExtendedClient.js";

export const command = "import <username>";
export const desc = "Start the bot for a specific user from data.json";
export const builder = {
    username: {
        type: "string",
        demandOption: true,
        description: "The username to start the bot for",
    },
};

export const handler = async (argv: { username: string }) => {
    const configManager = new ConfigManager();
    const allKeys = configManager.getAllKeys();
    
    const targetKey = allKeys.find(key => {
        const conf = configManager.get(key);
        return conf?.username?.toLowerCase() === argv.username.toLowerCase();
    });

    if (!targetKey) {
        logger.error(`User "${argv.username}" not found in config/data.json`);
        process.exit(1);
    }

    const config = configManager.get(targetKey)!;
    
    try {
        const client = new ExtendedClient();
        await client.checkAccount(config.token);
        await BaseAgent.initialize(client, config);
    } catch (error) {
        logger.error(`Failed to start bot for ${argv.username}:`);
        logger.error(error as Error);
        process.exit(1);
    }
};