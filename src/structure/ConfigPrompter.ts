import { checkbox, select, Separator } from "@inquirer/prompts";

import { Configuration } from "@/schemas/ConfigSchema.js";
import { ExtendedClient } from "./core/ExtendedClient.js";
import { BasePrompter } from "./core/BasePrompter.js";
import { t } from "@/utils/locales.js";

type ConfigPrompterOptions = {
    client: ExtendedClient<true>;
    getConfig: () => Partial<Configuration>
};

export class ConfigPrompter extends BasePrompter {
    private client: ExtendedClient<true>;
    private getConfig: () => Partial<Configuration>;

    constructor({ client, getConfig }: ConfigPrompterOptions) {
        super();
        this.client = client;
        this.getConfig = getConfig;
    }

    private get config(): Partial<Configuration> {
        return this.getConfig();
    }

    public listAccounts = (accounts: { username: string, id: string }[]): Promise<"run_all" | "run_selected" | string> =>
        this.ask(select<"run_all" | "run_selected" | string>, {
            message: t("ui.accounts.selectAccount"),
            choices: [
                ...(accounts.length > 0 ? [
                    { name: t("ui.accounts.runAllAccounts"), value: "run_all" as const },
                    { name: t("ui.accounts.runSelectedAccounts"), value: "run_selected" as const },
                    new Separator(),
                ] : []),
                ...accounts.map(account => ({
                    name: account.username,
                    value: account.id
                })),
            ]
        });

    public selectMultipleAccounts = (accounts: { username: string, id: string }[]): Promise<string[]> =>
        this.ask(checkbox<string>, {
            message: t("ui.accounts.selectMultiple"),
            choices: accounts.map(account => ({
                name: account.username,
                value: account.id
            })),
            validate: (choices) => choices.length > 0 || t("ui.channels.mustSelectOne"),
        });
}
