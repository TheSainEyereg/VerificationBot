const { Guild, EmbedBuilder, GuildMember } = require("discord.js");
const { channels: { logs } } = require("../config");
const { Colors } = require("./constants");
const { getUser } = require("./dataManager");

/**
 * 
 * @param {Guild} guild 
 * @param {EmbedBuilder} embed 
 * @param {string} [content] 
 * @returns 
 */
async function sendEmbedLog(guild, embed, content) {
	if (!logs) return;

	try {
		const channel = await guild.channels.fetch(logs);
		
		await channel.send(Object.assign({embeds: [embed]}, content && { content }));
	} catch (e) {}
}

/**
 * @param {GuildMember} approved
 */
function logApproval(approved) {
	const user = getUser(approved.id);
	return sendEmbedLog(approved.guild, new EmbedBuilder({
		color: Colors.Regular,
		title: "Пользователь подтвержден",
		fields: [
			{
				name: "Discord ID",
				value: `\`${user.userId}\``,
				inline: true
			},
			{
				name: "Текущий ник",
				value: `\`${user.name}\``,
				inline: true
			},
			{
				name: "Подтвержден",
				value: `<@${user.approvedBy}> <t:${Math.floor(user.approvedAt / 1000)}>`,
			}
		]
	}))	
}

module.exports = {
	logApproval
}