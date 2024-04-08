const { Events } = require("discord.js");
const { isUserReactedOther } = require("../components/reactionManager");
const { startConversation } = require("../components/conversationManager");


module.exports = {
	event: Events.MessageReactionAdd,
	async execute(reaction, user) {
		const isReactedAll = await isUserReactedOther(user, reaction.message);
	
		if (isReactedAll) startConversation(reaction.message.guild, user);
	}
} 