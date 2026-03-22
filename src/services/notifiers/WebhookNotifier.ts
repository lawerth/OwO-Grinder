import {
    FeatureFnParams,
    NotificationPayload,
    NotifierStrategy,
} from "@/typings/index.js";
import { logger } from "@/utils/logger.js";
import { MessageEmbed, WebhookClient } from "discord.js-selfbot-v13";

export class WebhookNotifier implements NotifierStrategy {
    public async execute(
        { agent }: FeatureFnParams,
        payload: NotificationPayload
    ): Promise<string | undefined> {
        if (!agent.config.webhookURL) {
            logger.warn("Webhook URL is not configured, skipping Webhook Notifier execution.");
            return undefined;
        }

        try {
            const { title, description, urgency, sourceUrl, imageUrl, content, fields, author, footer, messageID } = payload;
            const webhook = new WebhookClient({ url: agent.config.webhookURL });

            const embed = new MessageEmbed()
                .setTitle(title ?? "")
                .setURL(sourceUrl ?? "")
                .setDescription(description)
                .setColor(
                    urgency === "critical"
                        ? "#FF0000"
                        : "#00FF00"
                )
                .setFooter({
                    text: footer?.text ?? "Copyright Lawerth © 2026",
                    iconURL: footer?.iconURL ?? "https://i.imgur.com/EqChQK1.png",
                })
                .setTimestamp();

            if (author) embed.setAuthor({ name: author.name, iconURL: author.iconURL, url: author.url });
            if (imageUrl) embed.setImage(imageUrl);
            if (fields) embed.addFields(fields);

            if (messageID) {
                const updatedMsg = await webhook.editMessage(messageID, {
                    content,
                    embeds: [embed],
                });
                return typeof updatedMsg === "string" ? updatedMsg : updatedMsg.id;
            } else {
                const msg = await webhook.send({
                    username: "Captcha The Detective",
                    content,
                    avatarURL:
                        agent.client.user?.displayAvatarURL() ??
                        "https://i.imgur.com/9wrvM38.png",
                    embeds: [embed],
                });
                return typeof msg === "string" ? msg : msg.id;
            }
        } catch (error) {
            logger.error("Failed to send/edit webhook notification:");
            logger.error(error instanceof Error ? error.message : String(error));
            return undefined;
        }
    }
}
