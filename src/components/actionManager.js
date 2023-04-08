const fetch = require("node-fetch");
const { kumaPushURL, settings } = require("../config");
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
				const DMChannel = await user.createDM();
				if (DMChannel) await warning(DMChannel, "Как-то долго вышло!", "С момента открытия вашей анкеты прошло 48 часов и она была автоматически закрыта!");
			} catch (e) {}

			await endConversation(guild, user);
			await unreactAll(user);
		}
	}

} // 



async function freeUserName(name) {
	const foundUser = getUserByName(name);
	if (foundUser && foundUser.name === name) updateUserName(foundUser.id, null, false);

	const foundVerify = findVerify("nickname", name);
	if (foundVerify) return false;

	await removeFromWhitelist(name);

	return true;
}


async function changeUserName(id, name, force = false) {
	// No cache because is not common option
	const possibleUser = getUserByName(name);
	const possibleVerify = findVerify("nickname", name);

	const nicknameExists = !!(
		possibleUser && possibleUser.userId !== id ||
		possibleVerify && possibleVerify.userId !== id ||
		!settings.replaceWhitelist && (await getWhitelist()).includes(name)
	);

	if (nicknameExists && (!force || !(await freeUserName(name)))) return false;

	updateUserName(id, name);

	await addToWhitelist(name);

	return true;
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

} // Date.now() > user.banUntil


function pingStatus(client) {
	fetch(`${kumaPushURL}&ping=${client.ws.ping}`).catch();
}

module.exports = {
	pingStatus, syncWhitelist,
	freeUserName, changeUserName,
	closeOverdue, mentionUnmuted, mentionUbanned
}