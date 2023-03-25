const { Events, GuildMember } = require("discord.js");
const { isUserReactedAll } = require("../components/checkManager");
const { startConversation } = require("../components/questionsManager");

module.exports = {
	event: Events.GuildMemberAdd,
	/**
	 * 
	 * @param {GuildMember} member 
	 */
	async execute(member) {
		const isReactedAll = await isUserReactedAll(member.user);
	
		if (isReactedAll) startConversation(member.guild, member.user);
	}
}