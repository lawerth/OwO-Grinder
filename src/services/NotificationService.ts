import { BaseParams, FeatureFnParams, NotificationPayload, NotifierStrategy } from "@/typings/index.js";
import { logger } from "@/utils/logger.js";
import { WebhookNotifier } from "./notifiers/WebhookNotifier.js";
import { MessageNotifier } from "./notifiers/MessageNotifier.js";
import { CallNotifier } from "./notifiers/CallNotifier.js";
import { SoundNotifier } from "./notifiers/SoundNotifier.js";
import { PopupNotifier } from "./notifiers/PopupNotifier.js";
import { NtfyNotifier } from "./notifiers/NtfyNotifier.js";
import { formatTime } from "@/utils/time.js";

export class NotificationService {
    private strategies: Map<string, NotifierStrategy>;

    constructor() {
        this.strategies = new Map<string, NotifierStrategy>([
            ["webhook", new WebhookNotifier()],
            ["dms", new MessageNotifier()],
            ["call", new CallNotifier()],
            ["music", new SoundNotifier()],
            ["popup", new PopupNotifier()],
            ["ntfy", new NtfyNotifier()],
        ]);
    }

    public async notify(params: FeatureFnParams, payload: NotificationPayload): Promise<Map<string, any>> {
        const enabledNotifiers = params.agent.config.wayNotify;
        logger.debug(`Sending notification to: ${enabledNotifiers.join(", ")}`);

        const results = new Map<string, any>();
        const notificationPromises = enabledNotifiers.map(async notifierName => {
            const strategy = this.strategies.get(notifierName);
            if (strategy) {
                try {
                    const result = await Promise.resolve(strategy.execute(params, payload));
                    results.set(notifierName, result);
                } catch (err) {
                    logger.error(`Unhandled error in ${notifierName} notifier:`);
                    logger.error(err as Error);
                }
            } else {
                logger.warn(`Unknown notifier specified in config: ${notifierName}`);
            }
        });

        await Promise.all(notificationPromises);
        return results;
    }

    public static consoleNotify({ agent, t }: FeatureFnParams): void {
        logger.data(t("status.total.texts", { count: agent.totalTexts }));
        logger.data(t("status.total.commands", { count: agent.totalCommands }));
        logger.data(t("status.total.captchaSolved", { count: agent.totalCaptchaSolved }));
        logger.data(t("status.total.captchaFailed", { count: agent.totalCaptchaFailed }));
        logger.data(t("status.total.uptime", { duration: formatTime(agent.client.readyTimestamp, Date.now()) }));
    }
}