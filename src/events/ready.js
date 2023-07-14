const fs = require("fs");
const path = require("path");
const { Client, REST, Events, Collection, ActivityType } = require("discord.js");
const { regular } = require("../components/messages");
const { getRulesMessages, getRulesMessage, setRulesMessage, getAllVerify, getTimestamp, saveTimestamp, updateVerify, deleteRulesMessage } = require("../components/dataManager");
const { endConversation, startConversation } = require("../components/questionsManager");
const { isUserReactedOther, isUserReactedAll, unreactAll } = require("../components/reactionsManager");
const { token, channels, rules, guildId } = require("../config");
const { pingStatus, closeOverdue, mentionUnmuted, removeApprovedRoles } = require("../components/actionManager");


async function sendRuleMessage(channel, type) {
	const message = await channel.send(
		Object.assign(
			{
				embeds: [
					regular(
						null,
						rules[type].title,
						rules[type].file ? fs.readFileSync(rules[type].file).toString() : rules[type].text,
						{embed: true}
					)
				]
			},
			rules[type].attachment && {files: [rules[type].attachment]}
		)
	);
	await message.react("✅");
	setRulesMessage(type, message);
}

module.exports = {
	event: Events.ClientReady,
	once: true,
	/**
	 * @param {Client} client 
	 */
	async execute(client) {
		console.log("🔵 Client ready!");

		client.user.setActivity("за игроками", {type: ActivityType.Watching});
	
		const channel = client.channels.cache.get(channels.rules);
		
		console.log("Checking for rules:");
		for (const type of Object.keys(rules)) {
			try {
				const id = getRulesMessage(type);
				if (!id) throw 0;
				
				await channel.messages.fetch(id);
				console.log(` ● Message "${type}" exists!`);
			} catch (e) {
				await sendRuleMessage(channel, type);
				console.log(` ● Message "${type}" sent!`);
			}
		}

		const allDBMessages = getRulesMessages();
	

		process.stdout.write("Removing old rules...");

		const toDelete = Object.keys(allDBMessages).filter(type => !rules[type]);
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


		process.stdout.write("Checking reactions for update...");

		const firstRuleMessageId = Object.values(allDBMessages)[0];
		const firstRuleMessage = channel.messages.cache.find(m => m.id === firstRuleMessageId);
	
		const firstRuleMessageReactionManager = await firstRuleMessage.reactions.resolve("✅");
		const firstRuleMessageReactionManagerUsers = await firstRuleMessageReactionManager.users.fetch();
	
		let shouldFetch = true;
		for (const user of firstRuleMessageReactionManagerUsers.values()) {
			if (user.id === client.user.id) continue;
	
			const isReactedAll = await isUserReactedOther(user, firstRuleMessage, {fetch: shouldFetch});
			if (shouldFetch) shouldFetch = false;
	
			if (isReactedAll) startConversation(firstRuleMessage.guild, user);
		}

		for (const onVerifyId of getAllVerify().map(v => v.userId)) {
			const isUncheckedAll = await isUserReactedAll({id: onVerifyId, client}, {unchecked: true});
			
			if (isUncheckedAll) endConversation(firstRuleMessage.guild, {id: onVerifyId, client});
		}

		process.stdout.write("Done!\n");
	

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
		};
		client.run300 = () => {};
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
		
		process.stdout.write("Cleaning up commands...");
		// await guild.commands.set([]);
		await client.application.commands.set([]);

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