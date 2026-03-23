import { UpdateFeature } from "@/services/UpdateService.js";
import { BaseAgent } from "@/structure/BaseAgent.js";
import { ExtendedClient } from "@/structure/core/ExtendedClient.js";
import { InquirerUI } from "@/structure/InquirerUI.js";
import { logger } from "@/utils/logger.js";
import { confirm } from "@inquirer/prompts";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import packageJSON from "./package.json" with { type: "json" };
import { Locale } from "@/utils/locales.js";
import "dotenv/config.js";

process.title = `Advanced Discord OwO Tool Farm v${packageJSON.version} - Copyright 2026 © Lawerth`;
console.clear();

const updateFeature = new UpdateFeature();
const client = new ExtendedClient();

const argv = await yargs(hideBin(process.argv))
    .scriptName("owo-grinder")
    .usage("$0 <command> [options]")
    .commandDir("./src/cli", {
        extensions: ["ts", "js"],
    })
    .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Enable verbose logging",
        default: false,
    })
    .option("skip-check-update", {
        alias: "s",
        type: "boolean",
        description: "Skip the update check",
        default: false,
    })
    .option("language", {
        alias: "l",
        type: "string",
        description: "Set the language for the application",
        choices: ["en", "tr"],
        default: process.env.LOCALE || "en",
    })
    .middleware((argv) => {
        logger.setLevel(argv.verbose || process.env.NODE_ENV === "development" ? "debug" : "sent");
        process.env.LOCALE = argv.language as Locale || "en";
    })
    .help()
    .epilogue(`For more information, visit ${packageJSON.homepage}`)
    .parse();

if (!argv._.length) {
    if (!argv.skipCheckUpdate) {
        const updateAvailable = await updateFeature.checkForUpdates();
        if (updateAvailable) {
            const shouldUpdate = await confirm({
                message: "An update is available. Do you want to update now?",
                default: true,
            });
            if (shouldUpdate) {
                await updateFeature.performUpdate();
            }
        }
        await client.sleep(1000); // Wait for update to complete
    }

    const configs = await InquirerUI.prompt(client);
    client.destroy();

    for (const config of configs) {
        try {
            const runClient = new ExtendedClient();
            await runClient.checkAccount(config.token);
            await BaseAgent.initialize(runClient, config);
        } catch (error) {
            logger.error(`Failed to initialize account for ${config.username || "Unknown"}:`);
            logger.error(error as Error);
        }
    }
}
