import { CriticalEventHandler } from "@/handlers/CriticalEventHandler.js";
import { CaptchaService } from "@/services/CaptchaService.js";
import { Schematic } from "@/structure/Schematic.js";
import { NORMALIZE_REGEX } from "@/typings/constants.js";
import { logger } from "@/utils/logger.js";
import { ranInt } from "@/utils/math.js";

export default Schematic.registerEvent({
    name: "owoMessageEvent",
    event: "messageCreate",
    handler: async (params, message) => {
        const { agent, t, locale } = params;

        if (message.author.id !== agent.owoID) return;

        const normalizedContent = message.content.normalize("NFC").replace(NORMALIZE_REGEX, "");

        const isForThisUser = message.channel.type === "DM" ||
            normalizedContent.includes(message.client.user?.id!) ||
            normalizedContent.includes(message.client.user?.username!) ||
            normalizedContent.includes(message.client.user?.displayName!) ||
            normalizedContent.includes(message.guild?.members.me?.displayName!);

        if (!isForThisUser) return;

        // 1. Check for Captcha
        if (/are you a real human|(check|verify) that you are.{1,3}human!/img.test(normalizedContent)) {
            logger.alert(`Captcha detected in channel: ${message.channel.type === "DM"
                ? message.channel.recipient.displayName
                : message.channel.name
                }!`);
            agent.captchaDetected = true;
            return CaptchaService.handleCaptcha({ agent, t, locale }, message);
        }

        // 2. Check for Captcha Success
        if (/verified that you are.{1,3}human!/igm.test(normalizedContent)) {
            const waitMin = ranInt(5, 11);

            logger.info(`CAPTCHA HAS BEEN RESOLVED, ${agent.config.autoResume ? `RESTARTING SELFBOT IN ${waitMin} MINUTES` : `STOPPING SELFBOT`}...`);
            
            // Update webhook if manual resolution occurred
            if (agent.captchaDetected && agent.lastCaptchaResults) {
                const { NotificationService } = await import("@/services/NotificationService.js");
                const notificationService = new NotificationService();
                const webhookID = agent.lastCaptchaResults.get("webhook");
                const dotEmoji = "<a:dot:1484687154780045442>";

                if (webhookID) {
                    await notificationService.notify(params, {
                        messageID: webhookID,
                        description: `${dotEmoji} **Status:** ✅ Manually Resolved\n${dotEmoji} **Resolution Type:** User Manual Interaction\n${dotEmoji} Bot will resume in **${waitMin} minutes**.`,
                        urgency: "normal",
                        content: `### ⚠️ ${agent.config.adminID ? `<@${agent.config.adminID}> ` : ""}[CAPTCHA RESOLVED](${message.url}) ${agent.client.user?.username}`,
                        author: {
                            name: agent.client.user?.tag ?? "Unknown User",
                            iconURL: agent.client.user?.displayAvatarURL(),
                        },
                        sourceUrl: message.url,
                    });
                }
            }

            if (!agent.config.autoResume) process.exit(0);
            agent.captchaDetected = false;
            agent.lastCaptchaResults = undefined;

            setTimeout(() => {
                logger.info(`RESUMING AFTER ${waitMin} MINUTE DELAY.`);
                try {
                    agent.farmLoop();
                } catch (err) {
                    logger.error(err as Error);
                }
            }, waitMin * 60_000);
        }

        // 3. Check for Ban
        if (/have been banned/.test(normalizedContent)) {
            return CriticalEventHandler.handleBan(params);
        }

        // 4. Check for No Money
        if (normalizedContent.includes("You don't have enough cowoncy!")) {
            return CriticalEventHandler.handleNoMoney(params);
        }
    }
})