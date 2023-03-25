const { Events, GuildMember } = require("discord.js");
const { endConversation } = require("../components/questionsManager");

module.exports = {
	event: Events.GuildMemberRemove,
	/**
	 * 
	 * @param {GuildMember} member 
	 */
	async execute(member) {
		await endConversation(member.guild, member.user);
	}
}