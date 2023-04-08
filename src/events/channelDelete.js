const { Events } = require("discord.js");
const { findVerify } = require("../components/dataManager");
const { startConversation } = require("../components/questionsManager");


module.exports = {
	event: Events.ChannelDelete,
	async execute(channel) {
		const verify = findVerify("channelId", channel.id);
		if (!verify) return;

		const user = await channel.client.users.fetch(verify.userId);
		
		startConversation(channel.guild, user);
	}
} 