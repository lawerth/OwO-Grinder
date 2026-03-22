import path from "node:path";
import fs from "node:fs";
import { ConfigSchema, Configuration } from "@/schemas/ConfigSchema.js";
import { BaseAgent } from "@/structure/BaseAgent.js";
import { logger } from "@/utils/logger.js";
import { ExtendedClient } from "@/structure/core/ExtendedClient.js";

import { t } from "@/utils/locales.js";

export const command = "import <filename>";
export const desc = "Import a config file for instant setup";
export const builder = {
    filename: {
        type: "string",
        demandOption: true,
        description: "The name of the config file to import",
    },
};

export const handler = async (argv: { filename: string }) => {
    const filePath = path.resolve(process.cwd(), argv.filename);

    if (!fs.existsSync(filePath)) {
        logger.error(t("cli.import.fileNotFound", { filePath }));
        return;
    }

    if (path.extname(filePath) !== ".json") {
        logger.error(t("cli.import.notJSON", { filePath }));
        return;
    }

    let config: Configuration;
    try {
        const configData = fs.readFileSync(filePath, "utf-8");
        config = JSON.parse(configData);

        // Validate the configuration
        const validatedConfig = ConfigSchema.safeParse(config);
        if (!validatedConfig.success) {
            throw new Error(`Invalid configuration: ${validatedConfig.error.message}`);
        }

        logger.info(t("cli.import.importSuccess"));
        
        const client = new ExtendedClient();
        try {
            await client.checkAccount(validatedConfig.data.token);
            await BaseAgent.initialize(client, validatedConfig.data);
        } catch (error) {
            logger.error(t("cli.import.startFailed"));
            logger.error(error as Error);
        }
    } catch (error) {
        logger.error(t("cli.import.importError"));
        logger.error(error as Error);
        process.exit(1);
    }
};