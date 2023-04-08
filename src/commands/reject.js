const { Interaction, ActionRowBuilder, ButtonBuilder, SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { findVerify } = require("../components/dataManager.js");
const { question, warning } = require("../components/messages.js");

module.exports =  {
	data: new SlashCommandBuilder().setName("reject").setDescription("Отклоняет заявку пользователя и блокирует его на сервере."),
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
				question(null,"Отклонить игрока?", "Нажимая кнопку \"Отклонить\" вы отклоняете заявку и блокируете пользователю доступ к серверу!", {embed: true})
			],
			components: [
				new ActionRowBuilder({
					components: [
						new ButtonBuilder({
							customId: "reject"+verify.userId,
							label: "Отклонить",
							style: ButtonStyle.Danger,
							emoji: "✖"
						})
					]
				}),
			]
		});
	}
};