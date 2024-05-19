const { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } = require("discord.js");
const { success, warning, critical } = require("../components/messages");
const { closeRcon, runCommand } = require("../components/rconManager");
const { settings, rcon } = require("../config");

module.exports = {
	data: new SlashCommandBuilder()
	.setName("rcon")
	.setDescription("Управление RCON клиентом")
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
	.addSubcommand(subcommand =>
		subcommand
			.setName("close")
			.setDescription("Закрыть соединение с RCON")
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName("execute")
			.setDescription("Выполнить команду на RCON")
			.addStringOption(option => option
				.setName("server")
				.setChoices(...Object.keys(rcon.servers).map(server => ({ name: server, value: server })))
				.setDescription("Сервер")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("command")
				.setDescription("Команда")
				.setRequired(true)
			)
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

		if (subcommand === "execute") {
			const command = interaction.options.getString("command");
			const server = interaction.options.getString("server");

			const res = await runCommand([server], command);

			if (!res.status) return interaction.editReply({
				embeds: [
					critical(null, "Произошла ошибка!", res.message, {embed: true})
				]
			});

			const answer = res.answers?.[0]?.message;

			interaction.editReply({
				embeds: [
					success(null, "Выполнено!", answer ? `\`\`\`\n${answer}\n\`\`\`` : "Нет ответа", {embed: true})
				]
			});
		}
	}
}
