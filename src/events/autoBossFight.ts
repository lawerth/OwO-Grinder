import { Schematic } from "@/structure/Schematic.js";
import { logger } from "@/utils/logger.js";
import { ranInt } from "@/utils/math.js";

// Track boss fight message IDs we've already joined to avoid duplicate clicks
const joinedBossFights = new Set<string>();

export default Schematic.registerEvent({
    name: "autoBossFightEvent",
    event: "messageCreate",
    handler: async (params, message) => {
        const { agent } = params;

        if (!agent.config.autoBossFight) return;
        if (message.author.id !== agent.owoID) return;
        if (!agent.config.channelID.includes(message.channel.id)) return;

        const hasBossContent = message.content?.includes("A Guild Boss Appeared!")
            || message.components?.some((c: any) => {
                const json = JSON.stringify(c);
                return json.includes("A Guild Boss Appeared!");
            });

        if (!hasBossContent) return;

        // Prevent duplicate clicks on the same boss fight
        // This avoids the "Are you sure you want to use another boss ticket?" prompt
        if (joinedBossFights.has(message.id)) {
            logger.debug("Already joined this boss fight. Skipping duplicate.");
            return;
        }

        if (agent.bossFightTickets <= 0) {
            logger.info("Boss fight detected but no tickets remaining. Skipping.");
            return;
        }

        // Mark this boss fight as joined before clicking
        joinedBossFights.add(message.id);

        // Keep the set small — only remember last 10 boss fights
        if (joinedBossFights.size > 10) {
            const oldest = joinedBossFights.values().next().value;
            if (oldest) joinedBossFights.delete(oldest);
        }

        const delay = ranInt(2000, 6000);
        logger.info(`Boss fight detected! Joining in ${(delay / 1000).toFixed(1)}s... (${agent.bossFightTickets} tickets left)`);

        await agent.client.sleep(delay);

        try {
            await message.clickButton("guildboss_fight");
            agent.bossFightTickets--;
            logger.info(`Successfully joined boss fight! Remaining tickets: ${agent.bossFightTickets}/3`);
        } catch (error) {
            const errorStr = String(error);

            // OwO ephemeral: "🚫 | You don't have any boss tickets!"
            if (errorStr.includes("You don't have any boss tickets")) {
                agent.bossFightTickets = 0;
                logger.info("OwO confirmed no boss tickets remaining. Setting tickets to 0.");
                return;
            }

            // OwO ephemeral: "Are you sure you want to use another boss ticket?"
            // This means we already joined — don't confirm, restore ticket tracking
            if (errorStr.includes("Are you sure you want to use another boss ticket")) {
                logger.info("Already joined this boss fight. Skipping duplicate confirmation to save tickets.");
                return;
            }

            logger.error("Failed to click boss fight button:");
            logger.error(error as Error);
        }
    }
});
