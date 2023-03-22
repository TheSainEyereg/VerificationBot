const { Interaction, ActionRowBuilder, ButtonBuilder, SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { getAllVerify, findVerify } = require("../components/DataManager.js");
const { question, warning } = require("../components/Messages.js");

module.exports =  {
	data: new SlashCommandBuilder().setName("approve").setDescription("Подтверждает пользователя из этого канала."),
	access: "inspector",
	/**
	 * Interaction
	 * @param {Interaction} interaction - interaction
	 */
	async execute(interaction) {
		const verify = findVerify("channelId", interaction.channel.id);

		if (!verify) return interaction.reply({
			ephemeral: true,
			embeds: [
				warning(null, "Неправильное использование!", "Команда должна запускаться исключительно в канале для верификации пользователя!", {embed: true})
			]
		});

		interaction.reply({
			ephemeral: true,
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