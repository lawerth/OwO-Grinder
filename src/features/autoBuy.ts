import { Schematic } from "@/structure/Schematic.js";
import { ranInt } from "@/utils/math.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerFeature({
    name: "autoBuy",
    cooldown: () => ranInt(10000, 15001),
    condition: async ({ agent }) => {
        if (!agent.config.autoBuy || agent.config.autoBuy.length === 0) return false;

        return true;
    },
    run: async ({ agent, t }) => {
        const ids = agent.config.autoBuy;
        const randomId = ids[ranInt(0, ids.length)];

        const response = await agent.awaitResponse({
            trigger: () => agent.send(`buy ${randomId}`),
            filter: (m) => m.author.id === agent.owoID && m.content.includes(m.guild?.members.me?.displayName!),
            expectResponse: true,
        });

        if (response && response.content.includes("you do not have enough cowoncy!")) {
            agent.config.autoBuy = agent.config.autoBuy.filter(id => id !== randomId);
            logger.info(t("features.autoBuy.notEnoughCowoncy", { item: t(`features.autoBuy.items.${randomId}` as any) }));
        }
    },
});
