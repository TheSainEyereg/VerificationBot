const fetch = require("node-fetch");
const { kumaPushURL, settings, channels } = require("../config");
const { States } = require("./constants");
const { endConversation, checkForChannel } = require("./questionsManager");
const { Guild } = require("discord.js");
const { getAllVerify, getUserByName, findVerify, updateUserName, updateVerify } = require("./dataManager");
const { warning, success } = require("./messages");
const { unreactAll } = require("./reactionsManager");
const { removeFromWhitelist, addToWhitelist, getWhitelist } = require("./rconManager");


function syncWhitelist() {}

/**
 * @param {Guild} guild 
 */
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

} // 

/**
 * @param {Guild} guild 
 */
async function removeApprovedRoles(guild) {
	if (!settings.replaceWhitelist) return;

	// const allVerify = getAllVerify();
	// const roles = await guild.roles.fetch();
	// const members = await guild.members.fetch();

	// const membersWithoutVerify = members.filter(m => !m.user.bot && !allVerify.find(v => v.userId === m.id));

	// for (const member of membersWithoutVerify.values()) {
	// 	if (!member.roles.cache.has(roles.approved)) continue;
	// 	try {
	// 		await member.roles.remove(roles.approved);

	// 		const DMChannel = await member.user.createDM();
	// 		if (DMChannel) await warning(DMChannel, "Пройдите верификацию!", `Внимание, было обнаружено, что у вас установлена роль подтвержденного пользователя, но при этом информации о вас нет в базе данных. Возможно, что вы получили роль до введения базы данных или не успели вовремя сохранить свой ник через /save. \nЧто делать дальше? Сейчас вам нужно пройти анкету. Роль была снята с вас автоматически и вам остается лишь поставить или сначала убрать, а затем поставить галочки под каждым сообщением в канале <#${channels.rules}>. После этих действий для вас создастся канал, где вы сможете самостоятельно пройти анкету, по прохождению которой вас подтвердят и вам вернется роль.`);
	// 	} catch (e) {}
	// }
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

		const channelExists = await checkForChannel(guild, verify.channelId);
		if (!channelExists) continue;

		const channel = await guild.channels.fetch(verify.channelId);

		await success(channel, "Ваш мут истек!", "Вы можете продолжать проходить анкету, просто ответьте на вопрос, который был отправлен вам ранее.", {content: `<@${verify.userId}>`});
	}
} // Date.now() > verify.mutedUntil


/**
 * @param {Guild} guild 
 */
function mentionUbanned(guild) {

} // Date.now() > user.banedUntil


function pingStatus(client) {
	fetch(`${kumaPushURL}&ping=${client.ws.ping}`).catch(() => {});
}

module.exports = {
	pingStatus, syncWhitelist,
	freeUserName, changeUserName,
	closeOverdue, mentionUnmuted, mentionUbanned, removeApprovedRoles
}
