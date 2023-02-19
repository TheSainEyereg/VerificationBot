const { Events } = require("discord.js");
const { isUserReactedOther } = require("../components/CheckManager");
const { startConversation } = require("../components/QuestionsManager");


module.exports = {
	event: Events.MessageReactionAdd,
	async execute(reaction, user) {
		const isReactedAll = await isUserReactedOther(user, reaction.message);
	
		if (isReactedAll) startConversation(reaction.message.guild, user);
	}
} 