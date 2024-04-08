const { Events, GuildMember } = require("discord.js");
const { endConversation } = require("../components/conversationManager");
const { unreactAll } = require("../components/reactionManager");
const { getUser, updateUser } = require("../components/dataManager");
const { removeFromWhitelist } = require("../components/rconManager");
const { settings } = require("../config");

module.exports = {
	event: Events.GuildMemberRemove,
	/**
	 * 
	 * @param {GuildMember} member 
	 */
	async execute(member) {
		const possibleUser = getUser(member.id);
		if (possibleUser) {
			if (!possibleUser.firstJoined) updateUser(member.id, "firstJoined", member.joinedTimestamp);
			return !settings.serverless && await removeFromWhitelist(possibleUser.name);
		}
		
		await endConversation(member.guild, member.user);
		await unreactAll(member.user);
	}
}