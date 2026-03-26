import { Collection, Guild } from "discord.js-selfbot-v13";
import { checkbox, input, select, Separator } from "@inquirer/prompts";
import axios from "axios";
import chalk from "chalk";

import fs from "node:fs"
import path from "node:path";

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

    public static instance: ConfigPrompter;

    private audioRegex = /\.(mp3|wav|ogg|flac|aac|wma)$/;
    private webhookRegex = /https:\/\/discord.com\/api\/webhooks\/\d{17,19}\/[a-zA-Z0-9_-]{60,68}/;

    constructor({ client, getConfig }: ConfigPrompterOptions) {
        super();
        this.client = client;
        this.getConfig = getConfig;
    }

    private get config(): Partial<Configuration> {
        return this.getConfig();
    }

    public listAccounts = (accounts: { username: string, id: string }[]): Promise<"run_all" | "run_selected" | "qr" | "token" | string> =>
        this.ask(select<"run_all" | "run_selected" | "qr" | "token" | string>, {
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

    public getToken = () =>
        this.ask(input, {
            message: t("ui.token.enterToken"),
            validate: (input) => input.split(".").length === 3 || t("ui.token.invalidFormat"),
            transformer: (input) => input.replace(/"|'/g, "").trim(),
        })

    public selectMultipleAccounts = (accounts: { username: string, id: string }[]): Promise<string[]> =>
        this.ask(checkbox<string>, {
            message: t("ui.accounts.selectMultiple"),
            choices: accounts.map(account => ({
                name: account.username,
                value: account.id
            })),
            validate: (choices) => choices.length > 0 || t("ui.channels.mustSelectOne"),
        });

    public listActions = (hasCache: boolean): Promise<"run" | "edit" | "export" | "delete"> =>
        this.ask(select<"run" | "edit" | "export" | "delete">, {
            message: t("ui.actions.selectAction"),
            choices: [
                {
                    name: t("ui.actions.run"),
                    value: "run",
                    disabled: !hasCache && t("ui.actions.noExistingConfig")
                },
                {
                    name: t("ui.actions.editConfig"),
                    value: "edit"
                },
                {
                    name: t("ui.actions.exportConfig"),
                    value: "export",
                    disabled: !hasCache && t("ui.actions.noExistingConfig")
                },
                {
                    name: t("ui.actions.deleteConfig"),
                    value: "delete",
                    disabled: !hasCache && t("ui.actions.noExistingConfig")
                },
            ],
        });

    // --- Core Config Prompts ---
    public listGuilds = (guilds: Collection<string, Guild>, cache?: string): Promise<Guild> =>
        this.ask(select<Guild>, {
            message: t("ui.guild.selectGuild"),
            choices: guilds.map((g) => ({ name: g.name, value: g, })),
            default: cache ? guilds.get(cache) : undefined,
        });

    public listChannels = (guild: Guild, cache: string[] = []) =>
        this.ask(checkbox<string>, {
            message: t("ui.channels.selectChannels"),
            choices: guild.channels.cache
                .filter((c) => c.isText() && c.permissionsFor(guild.client.user!)?.has("SEND_MESSAGES"))
                .map((c) => ({ name: c.name, value: c.id, checked: cache.includes(c.id) })),
            validate: (choices) => choices.length > 0 || t("ui.channels.mustSelectOne"),
        });

    public getWayNotify = (cache?: string[]): Promise<Configuration["wayNotify"]> =>
        this.ask(checkbox<Configuration["wayNotify"][number]>, {
            message: t("ui.notifications.selectWays"),
            choices: [
                {
                    name: t("ui.notifications.webhook"),
                    value: "webhook",
                    checked: cache?.includes("webhook"),
                },
                {
                    name: t("ui.notifications.dms"),
                    value: "dms",
                    checked: cache?.includes("dms"),
                },
                {
                    name: t("ui.notifications.call"),
                    value: "call",
                    checked: cache?.includes("call"),
                },
                {
                    name: t("ui.notifications.music"),
                    value: "music",
                    checked: cache?.includes("music"),
                },
                {
                    name: t("ui.notifications.popup"),
                    value: "popup",
                    checked: cache?.includes("popup"),
                },
                {
                    name: t("ui.notifications.ntfy"),
                    value: "ntfy",
                    checked: cache?.includes("ntfy"),
                },
            ],
        }, t("ui.notifications.description"));

    public getWebhookURL = (cache?: string) =>
        this.ask(input, {
            message: t("ui.webhookURL.enterURL"),
            default: cache,
            validate: async (url) => {
                if (!this.webhookRegex.test(url)) {
                    return t("ui.webhookURL.invalidFormat");
                }
                try {
                    await axios.get(url);
                    return true;
                } catch {
                    return t("ui.webhookURL.notAccessible");
                }
            },
        });

    public getNtfyChannel = (cache?: string) =>
        this.ask(input, {
            message: t("ui.ntfyChannel.enterChannel"),
            default: cache,
            validate: async (channel) => {
                if (!/^[a-zA-Z0-9-_]{1,64}$/.test(channel)) {
                    return t("ui.ntfyChannel.invalidFormat");
                }
                try {
                    await axios.get(`https://ntfy.sh/${channel}/json?poll=1`);
                    return true;
                } catch (error) {
                    return t("ui.ntfyChannel.notAccessible");
                }
            },
        });

    public getAdminID = (guild: Guild, cache?: string) => {
        const required = this.config.wayNotify?.some(w => (<Configuration["wayNotify"]>["call", "dms"]).includes(w))
            || this.config.autoCookie
            || this.config.autoClover;

        return this.ask(input, {
            message: t("ui.adminID.enterUserID", {
                required: required !== true ? t("ui.adminID.emptyToSkip") : ""
            }),
            default: cache,
            validate: async (id) => {
                if (!id && !required) return true;
                if (!/^\d{17,19}$/.test(id)) return t("ui.adminID.invalidFormat");
                if (!required) return true;
                if (id === this.client.user.id) return t("ui.adminID.cannotSetSelf");

                if (
                    !this.config.autoClover
                    && !this.config.autoCookie
                    && !this.config.wayNotify?.some(w => (<Configuration["wayNotify"]>["call", "dms"]).includes(w))
                ) {
                    return guild.members.cache.has(id) || t("ui.adminID.notMember");
                }

                const user = await this.client.users.fetch(id).catch(() => null);
                if (!user) return t("ui.adminID.userNotFound");

                switch (user.relationship.toString()) {
                    case "NONE":
                        try {
                            await user.sendFriendRequest();
                            return t("ui.adminID.friendRequestSent");
                        } catch (error) {
                            return t("ui.adminID.friendRequestFailed");
                        }
                    case "FRIEND":
                        return true;
                    case "PENDING_INCOMING":
                        return await user.sendFriendRequest().catch(() => t("ui.adminID.friendRequestAcceptFailed"));
                    case "PENDING_OUTGOING":
                        return t("ui.adminID.acceptFriendRequest");
                    default:
                        return t("ui.adminID.blocked");
                }
            },
        });
    }

    public getMusicPath = (cache?: string) =>
        this.ask(input, {
            message: t("ui.musicPath.enterPath"),
            default: cache,
            validate: (p) => {
                if (!fs.existsSync(p)) {
                    return t("ui.musicPath.fileNotExist");
                }
                return this.audioRegex.test(path.extname(p)) ? true : t("ui.musicPath.invalidFormat");
            },
        });

    public getCaptchaAPI = (cache?: string) =>
        this.ask(select<Configuration["captchaAPI"]>, {
            message: t("ui.captchaAPI.selectProvider"),
            choices: [
                {
                    name: t("ui.captchaAPI.skip"),
                    value: undefined
                },
                {
                    name: `YesCaptcha [${chalk.underline("https://yescaptcha.com")}]`,
                    value: "yescaptcha",
                },
                {
                    name: t("ui.captchaAPI.ourHuntbotAPI"),
                    description: t("ui.captchaAPI.ourHuntbotDescription"),
                    value: undefined,
                    disabled: t("ui.captchaAPI.notImplemented")
                }
            ],
            default: cache
        });

    public getCaptchaAPIKey = (cache?: string) =>
        this.ask(input, {
            message: t("ui.captchaAPIKey.enterKey"),
            required: true,
            default: cache,
        });

    public getPrefix = async (cache?: string | string[]) => {
        const defaultValue = Array.isArray(cache) ? cache.join(", ") : cache;
        const answer = await this.ask(input, {
            message: t("ui.prefix.enterPrefix"),
            validate: (answer: string) => {
                if (!answer) return true;
                const prefixes = answer.split(/[,\s]+/).filter(Boolean);
                if (prefixes.length === 0) return true;
                return prefixes.every(p => /^[^0-9\s]{1,5}$/.test(p)) ? true : t("ui.prefix.invalidPrefix");
            },
            default: defaultValue,
        });

        if (!answer) return "";
        const prefixes = answer.split(/[,\s]+/).filter(Boolean);
        return prefixes.length > 1 ? prefixes : (prefixes[0] || "");
    }

    public getGemUsage = (cache?: number) =>
        this.ask(select<Configuration["autoGem"]>, {
            message: t("ui.gemUsage.selectUsage"),
            choices: [
                {
                    name: t("ui.gemUsage.skip"),
                    value: 0
                },
                {
                    name: t("ui.gemUsage.fabledToCommon"),
                    value: 1
                },
                {
                    name: t("ui.gemUsage.commonToFabled"),
                    value: -1
                }
            ],
            default: cache
        });

    public getGemTier = (cache?: Configuration["gemTier"]) =>
        this.ask(checkbox<Exclude<Configuration["gemTier"], undefined>[number]>, {
            validate: choices => choices.length > 0 || t("ui.gemTier.mustSelectOne"),
            message: t("ui.gemTier.selectTiers"),
            choices: [
                {
                    name: t("ui.gemTier.common"),
                    value: "common",
                    checked: cache?.includes("common")
                },
                {
                    name: t("ui.gemTier.uncommon"),
                    value: "uncommon",
                    checked: cache?.includes("uncommon")
                },
                {
                    name: t("ui.gemTier.rare"),
                    value: "rare",
                    checked: cache?.includes("rare")
                },
                {
                    name: t("ui.gemTier.epic"),
                    value: "epic",
                    checked: cache?.includes("epic")
                },
                {
                    name: t("ui.gemTier.mythical"),
                    value: "mythical",
                    checked: cache?.includes("mythical")
                },
                {
                    name: t("ui.gemTier.legendary"),
                    value: "legendary",
                    checked: cache?.includes("legendary")
                },
                {
                    name: t("ui.gemTier.fabled"),
                    value: "fabled",
                    checked: cache?.includes("fabled")
                },
            ],
        });

    public getTrait = (cache?: Configuration["autoTrait"]) =>
        this.ask(select<Configuration["autoTrait"]>, {
            message: t("ui.trait.selectTrait"),
            choices: [
                {
                    name: t("ui.trait.efficiency"),
                    value: "efficiency",
                },
                {
                    name: t("ui.trait.duration"),
                    value: "duration",
                },
                {
                    name: t("ui.trait.cost"),
                    value: "cost",
                },
                {
                    name: t("ui.trait.gain"),
                    value: "gain",
                },
                {
                    name: t("ui.trait.experience"),
                    value: "experience",
                },
                {
                    name: t("ui.trait.radar"),
                    value: "radar",
                }
            ],
            default: cache,
        });

    public getHuntbotSolver = (cache?: boolean) =>
        this.ask(select<boolean>, {
            message: t("ui.huntbotSolver.selectSolver"),
            choices: [
                {
                    name: t("ui.huntbotSolver.providedAPI", { api: this.config.captchaAPI || t("ui.huntbotSolver.noAPI") }),
                    value: false,
                    disabled: !this.config.captchaAPI && t("ui.huntbotSolver.noAPIDisabled"),
                },
                {
                    name: t("ui.huntbotSolver.ourHuntbotAPI"),
                    value: true,
                }
            ],
            default: cache,
        });

    public getPrayCurse = (cache?: Configuration["autoPray"]) =>
        this.ask(checkbox<Configuration["autoPray"][number]>, {
            message: t("ui.prayCurse.selectOptions"),
            choices: [
                {
                    name: t("ui.prayCurse.praySelf"),
                    value: `pray`,
                    checked: cache?.includes("pray")
                },
                {
                    name: t("ui.prayCurse.curseSelf"),
                    value: `curse`,
                    checked: cache?.includes("curse")
                },
                ...(this.config.adminID ? [
                    {
                        name: t("ui.prayCurse.prayAdmin"),
                        value: `pray ${this.config.adminID}`,
                        checked: cache?.includes(`pray ${this.config.adminID}`)
                    },
                    {
                        name: t("ui.prayCurse.curseAdmin"),
                        value: `curse ${this.config.adminID}`,
                        checked: cache?.includes(`curse ${this.config.adminID}`)
                    }
                ] : [])
            ]
        });

    public getQuoteAction = (cache?: string[]) =>
        this.ask(checkbox<Configuration["autoQuote"][number]>, {
            message: t("ui.quoteAction.selectActions"),
            choices: [
                {
                    name: t("ui.quoteAction.owo"),
                    value: "owo",
                    checked: cache?.includes("owo")
                },
                {
                    name: t("ui.quoteAction.quote"),
                    value: "quote",
                    checked: cache?.includes("quote")
                }
            ]
        })

    public getRPPAction = (cache?: string[]) =>
        this.ask(checkbox<Configuration["autoRPP"][number]>, {
            message: t("ui.rppAction.selectActions"),
            choices: [
                {
                    name: t("ui.rppAction.run"),
                    value: "run",
                    checked: cache?.includes("run")
                },
                {
                    name: t("ui.rppAction.pup"),
                    value: "pup",
                    checked: cache?.includes("pup")
                },
                {
                    name: t("ui.rppAction.piku"),
                    value: "piku",
                    checked: cache?.includes("piku")
                }
            ]
        });
    
    public getAutoBuy = (cache?: number[]) =>
        this.ask(checkbox<number>, {
            message: t("ui.autoBuy.selectItems"),
            choices: [
                { name: "1 (Common Ring)", value: 1, checked: cache?.includes(1) },
                { name: "2 (Uncommon Ring)", value: 2, checked: cache?.includes(2) },
                { name: "3 (Rare Ring)", value: 3, checked: cache?.includes(3) },
                { name: "4 (Epic Ring)", value: 4, checked: cache?.includes(4) },
                { name: "5 (Mythical Ring)", value: 5, checked: cache?.includes(5) },
                { name: "6 (Legendary Ring)", value: 6, checked: cache?.includes(6) },
                { name: "7 (Fabled Ring)", value: 7, checked: cache?.includes(7) },
            ],
        });
}
