const fs = require("fs");
const path = require("path");
const { Routes, REST, Events, Collection } = require("discord.js");
const { regular } = require("../components/messages");
const { getRulesMessages, getRulesMessage, setRulesMessage, saveData, getAllVerify, saveRulesMessages } = require("../components/dataManager");
const { endConversation, startConversation } = require("../components/questionsManager");
const { isUserReactedOther, isUserReactedAll } = require("../components/checkManager");
const { token, channels, rules, guildId } = require("../config");


function sendRuleMessage(channel, type) {
	return channel.send(
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
	).then(message => {
		message.react("✅");
		setRulesMessage(type, message);
	}).catch(err => {
		console.log(err);
		process.exit(1);
	});
}

const rest = new REST({ version: "10" }).setToken(token);

module.exports = {
	event: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log("Ready!");
		client.user.setActivity("за игроками", {type: "WATCHING"});
	
		const channel = client.channels.cache.get(channels.rules);
		
		for (const type of Object.keys(rules)) {
			try {
				const id = getRulesMessage(type);
				if (!id) throw "";
				
				await channel.messages.fetch(id);
				console.log(`Message "${type}" found!`);
			} catch (e) {
				console.log(`Message "${type}" not found!`);
				await sendRuleMessage(channel, type);
			}
		}
	

		process.stdout.write("Checking reactions for update...");

		const firstRuleMessageId = Object.values(getRulesMessages())[0];
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
			
			if (isUncheckedAll) endConversation(firstRuleMessage.guild, {id: onVerifyId});
		}

		process.stdout.write("Done\n");
		
	
		process.stdout.write("Parsing commands...");
		client.commands = new Collection();
		const commandsPath = path.join(__dirname, "..", "commands");
		for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			client.commands.set(command.data.name, command);
		}
		process.stdout.write("Registering slash commands...");
		await rest.put(
			Routes.applicationGuildCommands(client.user.id, guildId),
			{ body: client.commands.map(cmd => cmd.data)},
		)
		process.stdout.write("Done\n");
	}
}