import { Schematic } from "@/structure/Schematic.js";
import { CommandProps } from "@/typings/index.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerEvent({
	name: "commandCreate",
	event: "messageCreate",
	handler: async (BaseParams, message) => {
		const { agent, t, locale } = BaseParams;
		if (message.author.bot) return;
		const prefix = agent.config.prefix;
		if (!prefix) return;

		let usedPrefix: string | undefined;
		if (Array.isArray(prefix)) {
			usedPrefix = prefix.find(p => message.content.startsWith(p));
		} else if (message.content.startsWith(prefix)) {
			usedPrefix = prefix;
		}

		if (!usedPrefix) return;

		if (!agent.authorizedUserIDs.includes(message.author.id)) return;

		const args = message.content
			.slice(usedPrefix.length)
			.trim()
			.split(/ +/g);

		const commandName = args.shift()?.toLowerCase();
		if (!commandName) return;

		const command = (agent.commands.get(commandName) ||
			Array.from(agent.commands.values()).find((c) =>
				c.aliases?.includes(commandName)
			)) as CommandProps;
		if (!command) return;

		try {
			const params = { ...BaseParams, message, args };
			await command.execute(params);
		} catch (error) {
			logger.error(`Error executing command "${commandName}":`);
			logger.error(error as Error);
		}
	},
});
