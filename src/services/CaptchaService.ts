import { Configuration } from "@/schemas/ConfigSchema.js";
import { BaseParams, CaptchaSolver } from "@/typings/index.js";
import { YesCaptchaSolver } from "@/services/solvers/YesCaptchaSolver.js";
import { downloadAttachment } from "@/utils/download.js";
import { logger } from "@/utils/logger.js";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import os from "node:os";
import { Message, MessageActionRow, MessageButton } from "discord.js-selfbot-v13";
import { NORMALIZE_REGEX } from "@/typings/constants.js";
import { NotificationService } from "./NotificationService.js";

const dotEmoji = "<a:dot:1484687154780045442>";
interface CaptchaServiceOptions {
    provider?: Configuration["captchaAPI"];
    apiKey?: string;
}

/**
 * Maps Node.js os.platform() output to sec-ch-ua-platform values.
 */
const getPlatformForHeader = (): string => {
    switch (os.platform()) {
        case "win32":
            return "Windows";
        case "darwin":
            return "macOS";
        case "linux":
            return "Linux";
        default:
            // A sensible default for other platforms like FreeBSD, etc.
            return "Unknown";
    }
};

const createSolver = (provider: Configuration["captchaAPI"], apiKey: string): CaptchaSolver | undefined => {
    switch (provider) {
        case "yescaptcha":
            return new YesCaptchaSolver(apiKey);

        default:
            logger.error(`Unknown captcha provider: ${provider}`);
            return undefined;
    }
}

export class CaptchaService {
    private solver: CaptchaSolver | undefined;

    private axiosInstance = wrapper(axios.create({
        jar: new CookieJar(),
        timeout: 30000,
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Sec-Ch-Ua": `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`,
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": `"${getPlatformForHeader()}"`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
    }))

    constructor({ provider, apiKey }: CaptchaServiceOptions) {
        if (provider && apiKey) {
            this.solver = createSolver(provider, apiKey);
        } else {
            logger.warn("Captcha API or API key not configured. Captcha handling will be disabled.");
        }
    }

    public solveImageCaptcha = async (attachmentUrl: string): Promise<string> => {
        if (!this.solver) {
            throw new Error("Captcha solver is not configured.");
        }

        logger.debug(`Downloading captcha image from ${attachmentUrl}`);
        const imageBuffer = await downloadAttachment(attachmentUrl);

        const solution = await this.solver.solveImage(imageBuffer);
        logger.debug(`Captcha solution: ${solution}`);

        return solution;
    }

    public solveHcaptcha = async (
        location: string,
        sitekey: string = "a6a1d5ce-612d-472d-8e37-7601408fbc09",
        siteurl: string = "https://owobot.com"
    ): Promise<void> => {
        if (!this.solver) {
            throw new Error("Captcha solver is not configured.");
        }

        logger.debug(`Starting hCaptcha solving process for: ${location}`);

        // Step 1: Follow the OAuth redirect chain (this establishes the session)
        logger.debug("Step 1: Following OAuth redirect chain...");
        const oauthResponse = await this.axiosInstance.get(location, {
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Referer": "https://discord.com/",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "cross-site",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "Priority": "u=0, i"
            },
            maxRedirects: 10,
            validateStatus: (status) => status < 400 // Accept redirects
        });
        logger.debug(`OAuth response status: ${oauthResponse.status}`);

        // Step 2: Visit the captcha page explicitly
        logger.debug("Step 2: Visiting captcha page...");
        try {
            await this.axiosInstance.get("https://owobot.com/captcha", {
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Referer": "https://owobot.com/",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1",
                    "Priority": "u=0, i"
                }
            });
        } catch (error) {
            logger.warn(`Captcha page visit failed: ${error}`);
        }

        // Step 3: Check authentication status
        logger.debug("Step 3: Checking authentication status...");
        const accountResponse = await this.axiosInstance.get("https://owobot.com/api/auth", {
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://owobot.com",
                "Referer": "https://owobot.com/captcha",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Priority": "u=1, i"
            }
        });

        logger.debug(`Auth response data: ${JSON.stringify(accountResponse.data, null, 2)}`);

        if (accountResponse.data?.banned) {
            throw new Error("Account is banned.");
        }

        if (!accountResponse.data?.captcha?.active) {
            throw new Error("Captcha is not active.");
        }

        // Step 4: Solve the hCaptcha
        logger.debug(`Step 4: Solving hCaptcha with sitekey: ${sitekey} and siteurl: ${siteurl}`);
        const solution = await this.solver.solveHcaptcha(sitekey, siteurl);
        logger.debug(`hCaptcha response token: ${solution.slice(0, 50)}...`);

        // Step 5: Submit the verification (matching your successful browser request exactly)
        logger.debug("Step 5: Submitting captcha verification...");
        const verificationResponse = await this.axiosInstance.post("https://owobot.com/api/captcha/verify", {
            token: solution // Using "code" as per your successful browser request
        }, {
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "Origin": "https://owobot.com",
                "Referer": "https://owobot.com/captcha",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Priority": "u=1, i"
            }
        });

        if (verificationResponse.status !== 200) {
            const errorData = verificationResponse.data;
            logger.error(`Verification response: ${JSON.stringify(errorData, null, 2)}`);
            throw new Error(`Failed to verify captcha: ${verificationResponse.status} - ${verificationResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        logger.info("✅ hCaptcha verification successful!");
    }

    public static async handleCaptcha(params: BaseParams, message: Message, retries: number = 0, previousResults?: Map<string, any>): Promise<void> {
        const { agent } = params;
        const normalizedContent = message.content.normalize("NFC").replace(NORMALIZE_REGEX, "");
        const maxRetries = 1;

        const captchaService = new CaptchaService({
            provider: agent.config.captchaAPI,
            apiKey: agent.config.apiKey,
        });
        const notificationService = new NotificationService();

        // Initial notification (Detecting)
        let currentResults = previousResults;
        const webhookID = currentResults?.get("webhook");
        const attachmentUrl = message.attachments.first()?.url;

        if (retries === 0) {
            NotificationService.consoleNotify(params);
            
            currentResults = await notificationService.notify(params, {
                description: `${dotEmoji} **Status:** ⏳ Detecting / Solving...\n${dotEmoji} **Captcha Type:** ${attachmentUrl ? `[Image Captcha](${attachmentUrl})` : "[Link Captcha](https://owobot.com/captcha)"}\n${dotEmoji} **Attempt:** ${retries + 1}/${maxRetries + 1}`,
                urgency: "normal",
                content: `### ⚠️ ${agent.config.adminID ? `<@${agent.config.adminID}> ` : ""}[CAPTCHA DETECTED](${message.url}) ${agent.client.user?.username}`,
                author: {
                    name: agent.client.user?.tag ?? "Unknown User",
                    iconURL: agent.client.user?.displayAvatarURL(),
                },
                sourceUrl: message.url,
                imageUrl: attachmentUrl,
            });
            agent.lastCaptchaResults = currentResults;
        } else if (webhookID) {
            // Update notification for subsequent attempts
            currentResults = await notificationService.notify(params, {
                messageID: webhookID,
                description: `${dotEmoji} **Status:** ⏳ Retrying / Solving...\n${dotEmoji} **Captcha Type:** ${attachmentUrl ? `[Image Captcha](${attachmentUrl})` : "[Link Captcha](https://owobot.com/captcha)"}\n${dotEmoji} **Attempt:** ${retries + 1}/${maxRetries + 1}`,
                urgency: "normal",
                content: `### ⚠️ ${agent.config.adminID ? `<@${agent.config.adminID}> ` : ""}[CAPTCHA DETECTED](${message.url}) ${agent.client.user?.username}`,
                author: {
                    name: agent.client.user?.tag ?? "Unknown User",
                    iconURL: agent.client.user?.displayAvatarURL(),
                },
                sourceUrl: message.url,
                imageUrl: attachmentUrl,
            });
            agent.lastCaptchaResults = currentResults;
        }

        // Update webhookID again if it was just created (retries === 0)
        const activeWebhookID = currentResults?.get("webhook") || webhookID;

        try {
            if (attachmentUrl) {
                logger.debug(`Image captcha detected, attempting to solve... (Attempt ${retries + 1}/${maxRetries + 1})`);
                const solution = await captchaService.solveImageCaptcha(attachmentUrl);

                logger.debug(`Attempting reach OwO bot...`);
                const owo = await agent.client.users.fetch(agent.owoID);

                const dms = await owo.createDM();
                logger.debug(`DM channel created, sending captcha solution...`);

                const captchaResponse = await agent.awaitResponse({
                    channel: dms,
                    filter: (msg) => msg.author.id == agent.owoID && /verified that you are.{1,3}human!/igm.test(msg.content),
                    trigger: async () => dms.send(solution),
                    time: 30_000
                });

                if (!captchaResponse) {
                    throw new Error("No response from OwO bot after sending captcha solution.");
                }
            } else if (
                /(https?:\/\/[^\s]+)/g.test(normalizedContent)
                || (
                    message.components.length > 0 && message.components[0].type == "ACTION_ROW"
                    && (message.components[0] as MessageActionRow).components[0].type == "BUTTON"
                    && /(https?:\/\/[^\s]+)/g.test(((message.components[0] as MessageActionRow).components[0] as MessageButton).url || "")
                )
            ) {
                logger.debug(`Link captcha detected, attempting to solve... (Attempt ${retries + 1}/${maxRetries + 1})`);
                const { location } = await agent.client.authorizeURL("https://discord.com/oauth2/authorize?response_type=code&redirect_uri=https%3A%2F%2Fowobot.com%2Fapi%2Fauth%2Fdiscord%2Fredirect&scope=identify%20guilds%20email%20guilds.members.read&client_id=408785106942164992")
                await captchaService.solveHcaptcha(location);
            }

            // If we reach here, captcha was solved successfully
            agent.totalCaptchaSolved++;
            logger.info(`Captcha solved successfully on attempt ${retries + 1}!`);

            // Update notification to Resolved
            currentResults = await notificationService.notify(params, {
                messageID: activeWebhookID,
                description: `${dotEmoji} **Status:** ✅ Resolved\n${dotEmoji} **Captcha Type:** ${attachmentUrl ? `[Image Captcha](${attachmentUrl})` : "[Link Captcha](https://owobot.com/captcha)"}\n${dotEmoji} **Attempt:** ${retries + 1}/${maxRetries + 1}`,
                urgency: "normal",
                content: `### ⚠️ ${agent.config.adminID ? `<@${agent.config.adminID}> ` : ""}[CAPTCHA DETECTED](${message.url}) ${agent.client.user?.username}`,
                author: {
                    name: agent.client.user?.tag ?? "Unknown User",
                    iconURL: agent.client.user?.displayAvatarURL(),
                },
                sourceUrl: message.url,
                imageUrl: attachmentUrl,
            });
            agent.lastCaptchaResults = currentResults;
            agent.captchaDetected = false;
        } catch (error) {
            logger.error(`Failed to solve captcha on attempt ${retries + 1}:`);
            logger.error(error as Error);

            // Retry logic
            if (retries < maxRetries) {
                logger.warn(`Retrying captcha solving after 3 seconds... (${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return CaptchaService.handleCaptcha(params, message, retries + 1, currentResults);
            }

            // Max retries reached, give up - update notification to Unresolved
            logger.alert(`All ${maxRetries + 1} attempts to solve captcha failed, waiting for manual resolution.`);
            logger.info(`WAITING FOR THE CAPTCHA TO BE RESOLVED TO ${agent.config.autoResume ? "RESTART" : "STOP"}...`);

            agent.totalCaptchaFailed++;
            currentResults = await notificationService.notify(params, {
                messageID: activeWebhookID,
                description: `${dotEmoji} **Status:** ❌ Unresolved\n${dotEmoji} **Captcha Type:** ${message.attachments.first() ? `[Image Captcha](${message.attachments.first()?.url})` : "[Link Captcha](https://owobot.com/captcha)"}\n${dotEmoji} **Failed Attempts:** ${maxRetries + 1}/${maxRetries + 1}\n${dotEmoji} **Last Error:** \`${error instanceof Error ? error.message : String(error)}\`\n\n-# The 10-minute countdown will end in <t:${Math.floor(message.createdTimestamp / 1000 + 600)}:R>.`,
                urgency: "critical",
                content: `### ⚠️ ${agent.config.adminID ? `<@${agent.config.adminID}> ` : ""}[CAPTCHA DETECTED:](${message.url}) ${agent.client.user?.username}`,
                author: {
                    name: agent.client.user?.tag ?? "Unknown User",
                    iconURL: agent.client.user?.displayAvatarURL(),
                },
                sourceUrl: message.url,
                imageUrl: message.attachments.first()?.url,
            });
            agent.lastCaptchaResults = currentResults;
        }
    }
}