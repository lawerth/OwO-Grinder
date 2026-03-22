import { Schematic } from "@/structure/Schematic.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerFeature({
    name: "autoArmy",
    cooldown: () => 15000,
    condition: async ({ agent }) => {
        if (!agent.config.autoArmy) return false;

        return true;
    },
    run: async ({ agent, t }) => {
        const response = await agent.awaitResponse({
            trigger: () => agent.send("army"),
            filter: (m) => m.author.id === agent.owoID && m.content.includes(m.guild?.members.me?.displayName!),
            expectResponse: true,
        });

        if (response && (response.content.includes("you can only find 15 emblems per day!"))) {
            agent.config.autoArmy = false;
            logger.info(t("features.autoArmy.dailyLimitReached"));
            return;
        }
        agent.armyCount++;
    },
});