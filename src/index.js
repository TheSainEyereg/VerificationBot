import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

import { Client, Intents, Collection } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";

import { token, channels, rules, roles } from "../config.js";

import { getRulesMessages, getRulesMessage, setRulesMessage, saveData, getVerify, saveAnswer } from "./components/DataManager.js";
import { isUserReactedAll, isUserReactedOther } from "./components/CheckManager.js";
import { checkForCategory, endConversation, sendForConfirmation, startConversation } from "./components/QuestionsManager.js";
import questions from "./components/QuestionsList.js";
import { critical, regular, success, warning } from "./components/Messages.js";


process.on("unhandledRejection", (error) => {
	console.error(error);
	try {
		error.requestData && console.log(JSON.stringify(error.requestData, null, "\t"));
	} catch (e) {}
});
process.on("uncaughtException", console.error);
process.stdin.resume();

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS, 
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MEMBERS, //Whitelist required after 100 servers
		Intents.FLAGS.GUILD_INVITES,
		Intents.FLAGS.GUILD_VOICE_STATES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		//Intents.FLAGS.MESSAGE_CONTENT, //Whitelist required after 100 servers
		Intents.FLAGS.DIRECT_MESSAGES
	],
	partials: ["CHANNEL", "MESSAGE"]
})

const rest = new REST({ version: "10" }).setToken(token);

function handleInterrupt() {
	process.removeAllListeners();

	process.stdout.write("Interrupt detected, destroying client...");
	client.destroy();
	process.stdout.write("Saving data...");
	saveData();
	process.stdout.write("Done!\n");

	process.exit(0);
}

function sendRuleMessage(channel, type) {
	return channel.send(
		Object.assign(
			{
				embeds: [
					regular(null, rules[type].title, rules[type].text, {embed: true})
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

client.commands = new Collection();

client.once("ready", async (client) => {
	console.log("Ready!");
	client.user.setActivity("за игроками", {type: "WATCHING"});

	await checkForCategory(client);

	const channel = client.channels.cache.get(channels.rules);
	
	for (const type of Object.keys(rules)) {
		const id = getRulesMessage(type);
		if (!id) {
			await sendRuleMessage(channel, type);
			continue;
		}


		try {
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

	for (const user of firstRuleMessageReactionManagerUsers.values()) {
		const isReactedAll = await isUserReactedOther(user, firstRuleMessage, true);

		if (isReactedAll) startConversation(firstRuleMessage.guild, user);
		else endConversation(firstRuleMessage.guild, user);
	}
	process.stdout.write("Done\n");
	

	process.stdout.write("Parsing commands...");
	for (const file of fs.readdirSync(__dirname+"/commands").filter(f => f.endsWith(".js"))) {
		const command = (await import("./commands/"+file)).default;
		client.commands.set(command.data.name, command);
	}
	process.stdout.write("Registering slash commands...");
	const commands = client.commands.map(cmd => cmd.data);
	await rest.put(
		Routes.applicationCommands(client.user.id),
		{ body: commands},
	)
	process.stdout.write("Done\n");

	setInterval(saveData, 60e3);
	saveData();
})


client.on("messageReactionAdd", async (reaction, user) => {
	const isReactedAll = await isUserReactedAll(user);

	if (isReactedAll) startConversation(reaction.message.guild, user);
	else endConversation(reaction.message.guild, user);
});

client.on("messageReactionRemove", async (reaction, user) => {
	const isReactedAll = await isUserReactedAll(user);

	if (isReactedAll) startConversation(reaction.message.guild, user);
	else endConversation(reaction.message.guild, user);
});


client.on("messageCreate", async message => {
	if (message.author.bot) return;

	const verify = getVerify(message.author.id);
	if (!verify || verify.onConfirmation || verify.channel != message.channel.id) return;
	
	if (message.member.roles.cache.has(roles.approved)) return endConversation(message.guild, message.author);

	const currentQuestion = questions[verify.question];

	try {
		const answer = await currentQuestion.answer(message);
		if (!answer) {
			verify.onSameQuestion++;
			return;
		};

		saveAnswer(message.author.id, message.content);
		
		if (verify.question >= questions.length-1) {
			await sendForConfirmation(message);
			return;
		}

		verify.question++;
		verify.onSameQuestion = 0;

		const newQuestion = questions[verify.question];
		regular(message, verify.question == questions.length-1 ? "Последний вопрос" : "Вопрос "+(verify.question+1), newQuestion.message, {image: newQuestion.image});
	} catch (e) {
		console.error(e);
		critical(message, "Ой! Ошибка!", `Код: \`${e.message}\``);
	}
})


client.on("interactionCreate", async interaction => {
	if (interaction.isButton()) {
		if (!interaction.member.roles.cache.has(roles.moderator)) return interaction.reply({
			ephemeral: true,
			embeds: [
				warning(null, "Ошибка доступа!", "Данные кнопки только для ответственных сотрудников!", {embed: true})
			]
		})
		try {
			const userId = interaction.customId.match(/[0-9]+/g)?.[0];
			const member = await interaction.guild.members.fetch(userId);

			if (member.roles.cache.has(roles.approved)) interaction.reply({
				ephemeral: true,
				embeds: [
					critical(null, "Вердикт уже вынесен", "Данный человек уже был верифифцирован!", {embed: true})
				]
			})
			
			const DMChannel = await (async () => {
				try {
					const channel = await member.user.createDM();
					return channel;
				} catch (e) {return false}
			})();

			if (interaction.customId.startsWith("reject")) {
				if (DMChannel) await critical(DMChannel, "К сожалению, ваша заявка была отклонена, всего вам хорошего!", `Модератор: \`${interaction.user.tag}\``);
	
				await member.ban({reason: `Заблокирован ${interaction.user.tag} через систему подачи зявок!`});
			}
			if (interaction.customId.startsWith("approve")) {
				if (DMChannel) await success(DMChannel, "Ваша заявка принята, добро пожаловать!");
	
				await member.roles.add(roles.approved);
			}
			endConversation(interaction.guild, member.user);
		} catch (e) {
			console.error(e);
			interaction.reply({
				ephemeral: true,
				embeds: [
					critical(null, "Ошибка взаимодействия!", `Код: \`${e.message}\``, {embed: true})
				]
			})
		}
	}

	if (interaction.isCommand()) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;
		
		if (!command.allowNonMods && !interaction.member.roles.cache.has(roles.moderator)) return interaction.reply({
			ephemeral: true,
			embeds: [
				warning(null, "Нет доступа к команде!", "Данная команда только для ответственных сотрудников!", {embed: true})
			]
		})

		try {
			await command.execute(interaction);
		} catch (e) {
			console.error(e);
			interaction.reply({
				ephemeral: true,
				embeds: [
					critical(null, "Ошибка команды!", `Код: \`${e.message}\``, {embed: true})
				]
			})
		}
	}
})


client.login(token);


process.on("exit", handleInterrupt);
process.on("SIGINT", handleInterrupt);
process.on("SIGUSR1", handleInterrupt);
process.on("SIGUSR2", handleInterrupt);