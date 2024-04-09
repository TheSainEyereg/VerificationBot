const { SlashCommandBuilder, Interaction, PermissionFlagsBits } = require("discord.js");
const { success, warning } = require("../components/messages");
const { closeRcon } = require("../components/rconManager");
const { settings } = require("../config");

module.exports = {
	data: new SlashCommandBuilder()
	.setName("rcon")
	.setDescription("Управление RCON клиентом")
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
	.addSubcommand(subcommand =>
		subcommand
			.setName("close")
			.setDescription("Закрыть соединение с RCON")
	),

	access: "administrator",
	/**
	 * Interaction
	 * @param {ChatInputCommandInteraction} interaction - interaction
	 */
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (settings.serverless) return interaction.editReply({
			embeds: [
				warning(null, "Serverless режим!", "Бот работает в режиме, в котором взаимодействие с сервером невозможно.", {embed: true})
			]
		});

		if (subcommand === "close") {
			const count = closeRcon();

			if (count === 0) return interaction.editReply({
				embeds: [
					warning(null, "Нет подключений!", "Нет активных RCON подключений к серверам", {embed: true})
				]
			});

			return interaction.editReply({
				embeds: [
					success(null, "Соединение закрыто!", "RCON подключение к серверам успешно завершено", {embed: true})
				]
			});
		}
	}
}
