const { Events } = require("discord.js");
const { isUserReactedOther } = require("../components/reactionManager");
const { endConversation } = require("../components/conversationManager");


module.exports = {
	event: Events.MessageReactionRemove,
	async execute(reaction, user) {
		const isUncheckedAll = await isUserReactedOther(user, reaction.message, {unchecked: true});
	
		if (isUncheckedAll) await endConversation(reaction.message.guild, user);
	}
}