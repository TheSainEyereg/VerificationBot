const fetch = require("node-fetch");
const { kuma, settings, channels, roles } = require("../config");
const { States } = require("./constants");
const { endConversation, checkForChannel } = require("./conversationManager");
const { Guild, ChannelType } = require("discord.js");
const { getAllVerify, getUserByName, findVerify, updateUserName, updateVerify, getAllUsers, getCategories } = require("./dataManager");
const { warning, success } = require("./messages");
const { unreactAll } = require("./reactionManager");
const { removeFromWhitelist, addToWhitelist, getWhitelist } = require("./rconManager");


function syncWhitelist() {}

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


async function pingStatus(client) {
	if (kuma?.pushUrl)
		await fetch(`${kuma.pushUrl}&ping=${client.ws.ping}`).catch(() => null);
}

module.exports = {
	pingStatus, syncWhitelist,
	freeUserName, changeUserName,
	closeOverdue, mentionUnmuted, mentionUbanned, removeApprovedRoles, cleanUpCategory
}
