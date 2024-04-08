const { SlashCommandBuilder, Interaction } = require("discord.js");
const { RegExps } = require("../components/constants");
const { updatePassword } = require("../components/rconManager");
const { getUser } = require("../components/dataManager");
const { hasAccess } = require("../components/checkManager");
const { changeUserName } = require("../components/actionManager");
const { success, warning } = require("../components/messages");
const { settings, kuma } = require("../config");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("changepassword")
		.setDescription("Меняет ваш пароль в игре")
		.addStringOption(option => option
			.setName("password")
			.setDescription("Новый пароль")
			.setMaxLength(30)
			.setMinLength(10)
			.setRequired(true)
		),

	access: "user",
	/**
	 * Interaction
	 * @param {ChatInputCommandInteraction} interaction - interaction
	 */
	async execute(interaction) {
		const { member } = interaction;

		const user = getUser(member.id);
		if (!user) return interaction.editReply({
			embeds: [
				warning(null, "Ассоциация отсутствует!", "Ваш Discord аккаунт не имеет привязки к никнейму в игре!", { embed: true })
			]
		});

		if (settings.serverless) return interaction.editReply({
			embeds: [
				warning(null, "Serverless режим!", "Бот работает в режиме, в котором взаимодействие с сервером невозможно.", { embed: true })
			]
		});

		const password = interaction.options.getString("password");
		if (!RegExps.Password.test(password)) return interaction.editReply({
			embeds: [
				warning(null, "Недопустимые символы!", "Пароль содержит символы, которые не могут быть использованы в пароле!", { embed: true })
			]
		});

		const res = await updatePassword(user.name, password);

		interaction.editReply({
			embeds: [
				res.status
					? success(null, "Пароль изменен!", `Ваш пароль для ника \`${user.name}\` изменен! Теперь вы можете использовать его для входа в игру.`, { embed: true })
					: warning(null, "Не вышло!", "Не получилось отправить запрос смены пароля на сервер, повторите попытку позже.", { embed: true }).setFooter(kuma?.url ? { text: `Проверьте статус систем на ${kuma.url}` } : null)
			]
		});
	}
}
