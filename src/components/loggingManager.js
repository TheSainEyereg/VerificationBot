const { Guild, EmbedBuilder, ButtonInteraction } = require("discord.js");
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
 * @param {ButtonInteraction} interaction 
 * @param {*} verify
 */
function logInspection(interaction, verify) {
	const possibleUser = getUser(verify.userId);

	return sendEmbedLog(interaction.guild, new EmbedBuilder({
		color: !!possibleUser ? Colors.Regular : Colors.Critical,
		title: !!possibleUser ? "Игрок подтвержден" : "Игрок отклонен",
		fields: [
			{
				name: "Discord ID",
				value: `\`${verify.userId}\``,
				inline: true
			},
			{
				name: "Ник игрока",
				value: `\`${verify.nickname}\``,
				inline: true
			},
			{
				name: "Проверен",
				value: `<@${interaction.user.id}> <t:${Math.floor( interaction.createdTimestamp / 1000 )}>`,
			}
		]
	}))	
}


module.exports = {
	logInspection
}