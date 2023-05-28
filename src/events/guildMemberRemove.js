const { Events, GuildMember } = require("discord.js");
const { endConversation } = require("../components/questionsManager");
const { unreactAll } = require("../components/reactionsManager");
const { getUser } = require("../components/dataManager");
const { removeFromWhitelist } = require("../components/rconManager");

module.exports = {
	event: Events.GuildMemberRemove,
	/**
	 * 
	 * @param {GuildMember} member 
	 */
	async execute(member) {
		const possibleUser = getUser(member.id);
		if (possibleUser) return !settings.serverless && await removeFromWhitelist(possibleUser.name);
		
		await endConversation(member.guild, member.user);
		await unreactAll(member.user);
	}
}