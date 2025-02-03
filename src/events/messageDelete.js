const { Events, Message } = require("discord.js");
const { channels, rules } = require("../config");
const { sendRuleMessage } = require("../components/actionManager");
const { getRulesMessages } = require("../components/dataManager");

module.exports = {
	event: Events.MessageDelete,
	/**
	 * @param {Message} message 
	 */
	async execute(message) {
		const { channel, channelId, id: messageId } = message;

		if (channels.rules !== channelId)
			return;

		const rulesMessages = getRulesMessages();

		for (const [type, id] of Object.entries(rulesMessages))
			if (rules[type] && id === messageId)
				await sendRuleMessage(channel, type);
	}
}