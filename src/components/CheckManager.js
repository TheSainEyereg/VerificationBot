const { rules, channels, roles } = require("../config");
const { getRulesMessages, getRulesMessage } = require("./dataManager");
const { User, Interaction, Message, PermissionFlagsBits } = require("discord.js");

/**
 * 
 * @param {User} user 
 * @param {*} options 
 * @returns 
 */
async function isUserReactedAll(user, options) {
	if (user.id === user.client.user.id) return false;

	const channel = user.client.channels.cache.get(channels.rules);

	for (const type of Object.keys(rules)) {
		const id = getRulesMessage(type);
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
	const baseMessageType = Object.entries(rulesMessages).find(e => e[1] === message.id)?.[0];

	const channel = user.client.channels.cache.get(channels.rules);

	for (const type of Object.keys(rules).filter(e => e !== baseMessageType)) {
		const id = getRulesMessage(type);
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
 * @param {Interaction} interaction 
 * @param {"administrator"|"moderator"|"inspector"|"user"} type 
 */
function hasAccess(interaction, type) {
	return ( 
		interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
		type === "moderator" && interaction.member.roles.cache.has(roles.moderator) ||
		type === "inspector" && interaction.member.roles.cache.has(roles.inspector) ||
		type === "user"
	)
}


async function overdueCheck(user) {

}

module.exports = {isUserReactedAll, isUserReactedOther, hasAccess, overdueCheck};