import { rules, channels } from "../../config.js";
import { getRulesMessages, getRulesMessage } from "./DataManager.js";

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

export {isUserReactedAll, isUserReactedOther };