const fs = require("fs");
const fetch = require("node-fetch");
const { kuma, settings, channels, roles, rules } = require("../config");
const { States } = require("./constants");
const { endConversation, checkForChannel } = require("./conversationManager");
const { Guild, ChannelType, GuildTextBasedChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { setRulesMessage, getAllVerify, getUserByName, findVerify, updateUserName, updateVerify, getAllUsers, getCategories } = require("./dataManager");
const { regular, warning, success } = require("./messages");
const { unreactAll } = require("./reactionManager");
const { removeFromWhitelist, addToWhitelist, getWhitelist } = require("./rconManager");

/**
 * 
 * @param {GuildTextBasedChannel} channel 
 * @param {String} type 
 */
async function sendRuleMessage(channel, type) {
	const message = await channel.send({
		embeds: [
			regular(
				null,
				rules[type].title,
				rules[type].file ? fs.readFileSync(rules[type].file).toString() : rules[type].text,
				{ thumbnail: settings.logoUrl, embed: true }
			)
		],
		...rules[type].attachment && {files: [rules[type].attachment]},
		components: [
			new ActionRowBuilder({
				components: [
					new ButtonBuilder({
						customId: "start",
						label: "📝 Заполнить aнкету",
						style: ButtonStyle.Success
					}),
					... rules[type].link ? [
						new ButtonBuilder({
							style: ButtonStyle.Link,
							label: rules[type].link.text,
							url: rules[type].link.url
						})
					] : []
				],
			}),
		],
	});
	// await message.react("✅");
	setRulesMessage(type, message);
}

/**
 * @param {Guild} guild 
 */
async function cleanUpCategory(guild) {
	const categoryIds = getCategories();
	const verifyChannels = getAllVerify().map(v => v.channelId);
	
	const categories = (await guild.channels.fetch()).filter(c => c.type === ChannelType.GuildCategory);

	for (const categoryId of categoryIds) {
		const category = categories.find(c => c.id === categoryId);
		if (!category) continue;

		for (const [id, channel] of category.children.cache) {
			if (verifyChannels.includes(id)) continue;
		
			try {
				await channel.delete();
			} catch (e) {}
		}
	}
}

async function closeOverdue(guild) {
	const allVerify = getAllVerify();

	for (const verify of allVerify) {
		if (verify.state !== States.OnConfirmation && Date.now() > verify.openUntil) {
			const user = await guild.client.users.fetch(verify.userId);

			try {
				await warning(user, "Как-то долго вышло!", "С момента открытия вашей анкеты прошло 48 часов и она была автоматически закрыта!");
			} catch (e) {}

			await endConversation(guild, user);
			await unreactAll(user);
		}
	}

}

/**
 * @param {Guild} guild 
 */
async function removeApprovedRoles(guild) {
	if (!settings.replaceWhitelist) return;

	const allUsers = getAllUsers();
	const members = await guild.members.fetch();

	const membersWithoutVerify = members.filter(m => !m.user.bot && !allUsers.find(v => v.userId === m.id));

	for (const member of membersWithoutVerify.values()) {
		if (!member.roles.cache.has(roles.approved)) continue;

		try {
			await member.roles.remove(roles.approved);
			
			await warning(member, "Пройдите верификацию!", `Внимание, было обнаружено, что у вас установлена роль подтвержденного игрока, но при этом информации о вас нет в базе данных. Возможно, что вы получили роль до введения базы игроков или не успели вовремя сохранить свой ник через /save. \n\nЧто делать дальше? \nСейчас вам нужно пройти анкету. Роль была снята с вас автоматически и вам остается лишь поставить или сначала убрать, а затем поставить галочки под каждым сообщением в канале <#${channels.rules}>. После этих действий для вас создастся канал, где вы сможете самостоятельно пройти анкету, по прохождении которой вас подтвердят и вам вернется роль.`);
		} catch (e) {}
	}
}

async function freeUserName(name) {
	const foundUser = getUserByName(name);
	if (foundUser && foundUser.name === name) updateUserName(foundUser.id, null, false);

	const foundVerify = findVerify("nickname", name);
	if (foundVerify) return false;

	return settings.serverless || (await removeFromWhitelist(name)).status; // true or false
}


async function changeUserName(id, name, force = false) {
	// No cache because is not common option
	const possibleUser = getUserByName(name);
	const possibleVerify = findVerify("nickname", name);

	const nicknameExists = !!(
		possibleUser && possibleUser.userId !== id ||
		possibleVerify && possibleVerify.userId !== id ||
		!settings.serverless && !settings.replaceWhitelist && (await getWhitelist()).includes(name)
	);

	if (nicknameExists && (!force || !(await freeUserName(name)))) return false;

	updateUserName(id, name);

	return settings.serverless || (await addToWhitelist(name)).status;
}



/**
 * @param {Guild} guild 
 */
async function mentionUnmuted(guild) {
	const allVerify = getAllVerify();
	const date = Date.now();

	for (const verify of allVerify) {
		if (!verify.mutedUntil || date < verify.mutedUntil) continue;

		updateVerify(verify.userId, "mutedUntil", null);
		updateVerify(verify.userId, "mutedMessageId", null);

		const channel = await checkForChannel(guild, verify.channelId);
		if (!channel)
			continue;

		await channel.messages.delete(verify.mutedMessageId);
		await success(channel, "Ваш мут истек!", "Вы можете продолжать проходить анкету, просто ответьте на вопрос, который был отправлен вам ранее.", {content: `<@${verify.userId}>`, thumbnail: settings.logoUrl });
	}
}


/**
 * @param {Guild} guild 
 */
function mentionUbanned(guild) {

} // Date.now() > user.banedUntil

/**
 * 
 * @param {String} playerName 
 * @returns 
 */
function generatePassword(playerName) {
	const serverName = "Chunky";
	const randomWords = [
		"apple",
		"bear",
		"cat",
		"corn",
		"dog",
		"eagle",
		"fish",
		"goat",
		"hare",
		"ice",
		"jazz",
		"kite",
		"lion",
		"moon",
		"nest",
		"owl",
		"puma",
		"quail",
		"rose",
		"sun",
		"tree",
		"vase",
		"wolf",
		"xylo",
		"yarn",
		"zebra",
	];

	const randomChars = (length) => length > 0 ? Array.from({ length }, () => String.fromCharCode(Math.floor(Math.random() * 94) + 33)).join("") : "";

	const passwordParts = [
		playerName.slice(0, 30 - 10 - serverName.length - 8),
		randomWords[Math.floor(Math.random() * randomWords.length)],
		randomWords[Math.floor(Math.random() * randomWords.length)],
		serverName,
		...randomChars(8),
	];

	passwordParts.sort(() => Math.random() - 0.5);

	return passwordParts.join("");
};

async function pingStatus(client) {
	if (kuma?.pushUrl)
		await fetch(`${kuma.pushUrl}&ping=${client.ws.ping}`).catch(() => null);
}

module.exports = {
	sendRuleMessage,
	freeUserName, changeUserName,
	closeOverdue, mentionUnmuted, mentionUbanned, removeApprovedRoles, cleanUpCategory,
	generatePassword,
	pingStatus
}
