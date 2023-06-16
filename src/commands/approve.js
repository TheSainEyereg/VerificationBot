const { Interaction, ActionRowBuilder, ButtonBuilder, SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { findVerify } = require("../components/dataManager.js");
const { question, warning } = require("../components/messages.js");

module.exports =  {
	data: new SlashCommandBuilder().setName("approve").setDescription("Подтверждает пользователя из этого канала."),
	access: "inspector",
	/**
	 * Interaction
	 * @param {Interaction} interaction - interaction
	 */
	async execute(interaction) {
		const verify = findVerify("channelId", interaction.channel.id);

		if (!verify) return interaction.editReply({
			embeds: [
				warning(null, "Неправильное использование!", "Команда должна запускаться исключительно в канале для верификации пользователя!", {embed: true})
			]
		});

		interaction.editReply({
			embeds: [
				question(null,"Подтвердить игрока?", "Нажимая кнопку \"Подтвердить\" вы разрешаете пользователю доступ к серверу!", {embed: true})
			],
			components: [
				new ActionRowBuilder({
					components: [
						new ButtonBuilder({
							customId: "approve"+verify.userId,
							label: "Подтвердить",
							style: ButtonStyle.Success,
							emoji: "✔"
						})
					]
				}),
			]
		});
	}
};