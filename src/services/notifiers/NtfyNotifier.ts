import {
    FeatureFnParams,
    NotificationPayload,
    NotifierStrategy,
} from "@/typings/index.js";
import { logger } from "@/utils/logger.js";
import axios from "axios";

export class NtfyNotifier implements NotifierStrategy {
    public async execute(
        { agent }: FeatureFnParams,
        payload: NotificationPayload
    ): Promise<string | undefined> {
        if (!agent.config.ntfyChannel) {
            logger.warn("ntfy channel is not configured, skipping ntfy Notifier execution.");
            return undefined;
        }

        try {
            const { title, description, content, urgency } = payload;
            
            // ntfy prefers the message in the body, and titles/tags in headers
            const message = content || description || title || "No content";
            const url = `https://ntfy.sh/${agent.config.ntfyChannel}`;

            const response = await axios.post(url, message, {
                headers: {
                    Title: title || "OwO Grinder Notification",
                    Tags: urgency === "critical" ? "rotating_light,robot" : "bell,robot",
                    Priority: urgency === "critical" ? "5" : "3",
                    Click: payload.sourceUrl || "",
                }
            });

            return response.data?.id || "sent";
        } catch (error) {
            logger.error("Failed to send ntfy notification:");
            logger.error(error instanceof Error ? error.message : String(error));
            return undefined;
        }
    }
}
