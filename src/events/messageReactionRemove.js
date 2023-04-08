const { Events } = require("discord.js");
const { isUserReactedOther } = require("../components/reactionsManager");
const { endConversation } = require("../components/questionsManager");


module.exports = {
	event: Events.MessageReactionRemove,
	async execute(reaction, user) {
		const isUncheckedAll = await isUserReactedOther(user, reaction.message, {unchecked: true});
	
		if (isUncheckedAll) endConversation(reaction.message.guild, user);
	}
}