const { Guild, EmbedBuilder, ButtonInteraction } = require("discord.js");
const { channels: { logs } } = require("../config");
const { Colors } = require("./constants");

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
	const approved = interaction.customId.startsWith("approve");

	return sendEmbedLog(interaction.guild, new EmbedBuilder({
		color: !!approved ? Colors.Regular : Colors.Critical,
		title: !!approved ? "Игрок подтвержден" : "Игрок отклонен",
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
			... (!approved) ? [
				{
					name: "Причина",
					value: interaction.fields.getTextInputValue("reason"),
				}
			] : [],
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