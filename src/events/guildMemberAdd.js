const { Events, GuildMember } = require("discord.js");
const { isUserReactedAll } = require("../components/reactionsManager");
const { startConversation } = require("../components/questionsManager");
const { getUser } = require("../components/dataManager");
const { roles } = require("../config");
const { addToWhitelist } = require("../components/rconManager");

module.exports = {
	event: Events.GuildMemberAdd,
	/**
	 * 
	 * @param {GuildMember} member 
	 */
	async execute(member) {
		const possibleUser = getUser(member.id);
		if (possibleUser) {
			await member.roles.add(roles.approved);
			await addToWhitelist(possibleUser.name);
			return;
		}

		const isReactedAll = await isUserReactedAll(member.user);
	
		if (isReactedAll) startConversation(member.guild, member.user);
	}
}