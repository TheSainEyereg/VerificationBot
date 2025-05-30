const fs = require("fs");
const path = require("path");
const { Client, Events, Collection, ActivityType } = require("discord.js");
const { getRulesMessages, getRulesMessage, getAllVerify, getTimestamp, saveTimestamp, updateVerify, deleteRulesMessage } = require("../components/dataManager");
const { endConversation, startConversation } = require("../components/conversationManager");
const { isUserReactedOther, isUserReactedAll, unreactAll } = require("../components/reactionManager");
const { channels, rules, guildId } = require("../config");
const { sendRuleMessage, pingStatus, closeOverdue, mentionUnmuted, removeApprovedRoles, cleanUpCategory } = require("../components/actionManager");
const { closeRcon } = require("../components/rconManager");

module.exports = {
	event: Events.ClientReady,
	once: true,
	/**
	 * @param {Client} client 
	 */
	async execute(client) {
		console.log("🔵 Client ready!");

		client.user.setActivity("за игроками", {type: ActivityType.Watching});

		const channel = await client.channels.fetch(channels.rules);

		console.log("Checking for rules:");
		// for (const type of Object.keys(rules)) {
		// 	try {
		// 		const id = getRulesMessage(type);
		// 		if (!id) throw 0;

		// 		await channel.messages.fetch(id);
		// 		console.log(` ● Message "${type}" exists!`);
		// 	} catch (e) {
		// 		await sendRuleMessage(channel, type);
		// 		console.log(` ● Message "${type}" sent!`);
		// 	}
		// }

		const type = Object.keys(rules)[0];
		try {
			const id = getRulesMessage(type);
			if (!id) throw 0;

			await channel.messages.fetch(id);
			console.log(` ● Message "${type}" exists!`);
		} catch (e) {
			await sendRuleMessage(channel, type);
			console.log(` ● Message "${type}" sent!`);
		}

		const allDBMessages = getRulesMessages();

		process.stdout.write("Removing old rules...");

		const toDelete = Object.keys(allDBMessages)
			// .filter(t => !rules[t]);
			.filter(t => t !== type);

		for (const type of toDelete) {
			try {
				const message = await channel.messages.fetch(allDBMessages[type]);
				await message.delete();
			} catch (e) {
				console.error(e);
			}

			deleteRulesMessage(type);
		}

		process.stdout.write(toDelete.length ? "Done!\n" : "Nothing to delete!\n");


		// process.stdout.write("Checking reactions for update...");

		// const firstRuleMessageId = Object.values(allDBMessages)[0];
		// const firstRuleMessage = channel.messages.cache.find(m => m.id === firstRuleMessageId);

		// const firstRuleMessageReactionManager = await firstRuleMessage.reactions.resolve("✅");
		// const firstRuleMessageReactionManagerUsers = await firstRuleMessageReactionManager.users.fetch();

		// let shouldFetch = true;
		// for (const user of firstRuleMessageReactionManagerUsers.values()) {
		// 	if (user.id === client.user.id) continue;

		// 	const isReactedAll = await isUserReactedOther(user, firstRuleMessage, {fetch: shouldFetch});
		// 	if (shouldFetch) shouldFetch = false;

		// 	if (isReactedAll) startConversation(firstRuleMessage.guild, user);
		// }

		// for (const onVerifyId of getAllVerify().map(v => v.userId)) {
		// 	const isUncheckedAll = await isUserReactedAll({id: onVerifyId, client}, {unchecked: true});

		// 	if (isUncheckedAll) endConversation(firstRuleMessage.guild, {id: onVerifyId, client});
		// }

		// process.stdout.write("Done!\n");


		process.stdout.write("Checking for left users...");

		const allVerify = getAllVerify();

		const guild = await client.guilds.fetch(guildId);
		const members = await guild.members.fetch();

		for (const verify of allVerify) {
			if (!members.find(m => m.id === verify.userId)){
				await endConversation(guild, {id: verify.userId});
				unreactAll({id: verify.userId, client});
			}
		}

		process.stdout.write("Updating remaining time...");

		const latestOnline = getTimestamp();

		for (const verify of allVerify) {
			const remainingTime = verify.openUntil - latestOnline;
			updateVerify(verify.userId, "openUntil", Date.now() + (remainingTime < 48 * 60 * 60e3 ? remainingTime : 48 * 60 * 60e3));
		}

		process.stdout.write("Starting timers...");

		client.run600 = () => {
			removeApprovedRoles(guild);
			cleanUpCategory(guild);
		};
		client.run300 = () => {
			closeRcon();
		};
		client.run60 = () => {
			saveTimestamp();
			closeOverdue(guild);
		};
		client.run30 = () => {
			pingStatus(client);
		};
		client.run10 = () => {
			mentionUnmuted(guild);
		};

		client._600interval = setInterval(client.run600, 600e3);
		client.run600();
		client._300interval = setInterval(client.run300, 300e3);
		client.run300();
		client._60interval = setInterval(client.run60, 60e3);
		client.run60();
		client._30interval = setInterval(client.run30, 30e3);
		client.run30();
		client._10interval = setInterval(client.run10, 10e3);
		client.run10();

		process.stdout.write("Done!\n");

		// process.stdout.write("Cleaning up commands...");
		// await guild.commands.set([]);

		process.stdout.write("Parsing commands...");
		client.commands = new Collection();
		const commandsPath = path.join(__dirname, "..", "commands");
		for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			client.commands.set(command.data.name, command);
		}

		process.stdout.write("Registering commands...");
		await guild.commands.set(client.commands.map(cmd => cmd.data));
		process.stdout.write("Done!\n");

		console.log("🟢 Fully ready!");
	}
}
