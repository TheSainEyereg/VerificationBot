const fetch = require("node-fetch");
const { kumaPushURL } = require("../config");
const { States } = require("./enums");
const { endConversation } = require("./questionsManager");
const { Guild, User } = require("discord.js");
const { channels } = require("../config");
const { getAllVerify, getRulesMessages } = require("./dataManager");
const { warning } = require("./messages");


function syncWhitelist() {}

/**
 * @param {User} user 
 */
async function uncheckAll(user) {
	const rulesMessages = getRulesMessages();

	const channel = user.client.channels.cache.get(channels.rules);

	for (const id of Object.values(rulesMessages)) {
		const message = channel.messages.cache.get(id);
		const reaction = message.reactions.cache.get("✅");
		
		try {
			await reaction.users.remove(user.id);
		} catch(e) {}
	}
}

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
			await uncheckAll(user);
		}
	}

} // 


/**
 * @param {Guild} guild 
 */
function mentionUnmuted(guild) {

} // Date.now() > verify.mutedUntil


/**
 * @param {Guild} guild 
 */
function mentionUbanned(guild) {

} // Date.now() > user.bannedUntil


function pingStatus(client) {
	fetch(`${kumaPushURL}&ping=${client.ws.ping}`).catch();
}

module.exports = { pingStatus, syncWhitelist, uncheckAll, closeOverdue, mentionUnmuted, mentionUbanned }