const { SlashCommandBuilder, Interaction, EmbedBuilder } = require("discord.js");
const { warning } = require("../components/messages");
const { getUserByName } = require("../components/dataManager");
const { Colors } = require("../components/constants");

module.exports = {
	data: new SlashCommandBuilder().setName("find").setDescription("Ищет дискорд ассоциированный с ником в игре")
	.addStringOption(option => option.setName("nickname").setDescription("Ник в игре").setRequired(true)),

	access: "user",
	/**
	 * Interaction
	 * @param {ChatInputCommandInteraction} interaction - interaction
	 */
	async execute(interaction) {
		const nickname = interaction.options.getString("nickname");

		const user = getUserByName(nickname);

		if (!user) return interaction.editReply({
			embeds: [
				warning(null, "Не найдено!", "Данный ник не принадлежит и не принадлежал ни одному игроку!", {embed: true})
			]
		});

		const isOld = user.name !== nickname;

		interaction.editReply({
			embeds: [
				new EmbedBuilder({
					color: Colors.Regular,
					title: "Информация о никнейме",
					description: `Данный ник ${!isOld ? "принадлежит" : "принадлежал"} игроку <@${user.userId}>`,
					fields: [
						{
							name: "Discord ID",
							value: `\`${user.userId}\``
						},
						{
							name: "Текущий ник",
							value: `\`${user.name}\``,
							inline: true
						},
						... user?.oldNames ? [
							{
								name: "Прошлые ники",
								value: user.oldNames.split(",").map(name => `\`${name.trim()}\``).join(", "),
								inline: true
							}
						] : [],
					],
					footer: {
						text: `Вы можете получить более подробную информацию об игроке введя команду /info и указав в поле target его дискорд.`
					}
				})
			]
		});
	}
}