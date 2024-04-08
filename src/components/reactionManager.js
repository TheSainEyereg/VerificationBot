const { channels } = require("../config");
const { getRulesMessages } = require("./dataManager");
const { User, Message} = require("discord.js");

/**
 * 
 * @param {User} user 
 * @param {*} options 
 * @returns 
 */
async function isUserReactedAll(user, options) {
	if (user.id === user.client.user.id) return false;

	const rulesMessages = getRulesMessages();
	const channel = user.client.channels.cache.get(channels.rules);

	for (const id of Object.values(rulesMessages)) {
		const message = channel.messages.cache.get(id);
		const reaction = message.reactions.cache.get("✅");

		const users = !options?.fetch ? reaction.users.cache : await reaction.users.fetch();
		const userFound = users.find(u => u.id === user.id);
		
		if (!options?.unchecked ? !userFound : userFound) return false;
	}
	
	return true;
}

/**
 * 
 * @param {User} user 
 * @param {Message} message 
 * @param {*} options 
 * @returns 
 */
async function isUserReactedOther(user, message, options) {
	if (user.id === user.client.user.id) return false;

	const rulesMessages = getRulesMessages();

	const baseMessageId = Object.values(rulesMessages).find(id => id === message.id)?.[0];
	if (!baseMessageId) return false;

	const channel = user.client.channels.cache.get(channels.rules);

	for (const id of Object.values(rulesMessages).filter(id => id !== baseMessageId)) {
		const message = channel.messages.cache.get(id);
		const reaction = message.reactions.cache.get("✅");

		const users = !options?.fetch ? reaction.users.cache : await reaction.users.fetch();
		const userFound = users.find(u => u.id === user.id);

		if (!options?.unchecked ? !userFound : userFound) return false;
	}
	
	return true;
	
}

/**
 * @param {User} user 
 */
async function unreactAll(user) {
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


module.exports = {isUserReactedAll, isUserReactedOther, unreactAll}