const { SlashCommandBuilder, Interaction } = require("discord.js");
const { RegExps } = require("../components/constants");
const { updatePassword } = require("../components/rconManager");
const { getUser } = require("../components/dataManager");
const { hasAccess } = require("../components/checkManager");
const { changeUserName } = require("../components/actionManager");
const { success, warning } = require("../components/messages");
const { settings, kuma } = require("../config");

module.exports = {
	data: new SlashCommandBuilder().setName("manage").setDescription("Обновляет пароль или ник игрока")
	.addSubcommand(subcommand =>
		subcommand.setName("password").setDescription("Изменить пароль пользователю")
		.addUserOption(option => option.setName("user").setDescription("Пользователь").setRequired(true))
		.addStringOption(option => option.setName("password").setDescription("Новый пароль").setRequired(true))
	)
	.addSubcommand(subcommand =>
		subcommand.setName("nickname").setDescription("Изменить ник пользователю")
		.addUserOption(option => option.setName("user").setDescription("Пользователь").setRequired(true))
		.addStringOption(option => option.setName("name").setDescription("Новый ник").setRequired(true))	
	),

	access: "moderator",
	/**
	 * Interaction
	 * @param {ChatInputCommandInteraction} interaction - interaction
	 */
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const isAdmin = hasAccess(interaction.member, "administrator");
		const member = interaction.options.getMember("user");

		if (hasAccess(member, "moderator") && (!isAdmin || interaction.member.id !== member.id )) return interaction.editReply({
			embeds: [
				warning(null, "Ого!", "Вы не можете использовать команду на тех, кто выше или равен вам по рангу!", {embed: true})
			]
		});

		const user = getUser(member.id);
		if (!user) return interaction.editReply({
			embeds: [
				warning(null, "Невозможно управлять!", "Пользователь не подтвержден или не имеет ассоциации с ником в игре.", {embed: true})
			]
		});

		if (subcommand === "password") {
			if (settings.serverless) return interaction.editReply({
				embeds: [
					warning(null, "Serverless режим!", "Бот работает в режиме, в котором взаимодействие с сервером невозможно.", {embed: true})
				]
			});

			const password = interaction.options.getString("password");
			if (!RegExps.Password.test(password)) return interaction.editReply({
				embeds: [
					warning(null, "Недопустимые символы!", "Пароль содержит символы, которые не могут быть использованы в пароле, либо не соответствует длине 10-30!", {embed: true})
				]
			});

			const passRes = await updatePassword(user.name, password);

			interaction.editReply({
				embeds: [
					passRes.status
						? success(null, "Пароль изменен!", `Пароль игрока ${member.toString()} изменен! Не забудьте сообщить новый пароль игроку!`, {embed: true})
						: warning(null, "Не вышло!", "Не получилось отправить запрос смены пароля на сервер, повторите попытку позже.", {embed: true}).setFooter(kuma?.url ? { text: `Проверьте статус систем на ${kuma.url}` } : null)
				]
			});
		}

		if (subcommand === "nickname") {
			const name = interaction.options.getString("name");

			if (!RegExps.MinecraftNameString.test(name)) return interaction.editReply({
				embeds: [
					warning(null, "Ник недопустим!", "Пожалуйста, укажите ник в правильном формате!", {embed: true})
				]
			});

			const changeName = await changeUserName(user.userId, name, isAdmin);

			if (!changeName) return interaction.editReply({
				embeds: [ warning(
					null, "Невозможно изменить имя игрока!",
					!isAdmin ? "Ник уже используется другим игроком, сменить его невозможно! Обратитесь к более высоким рангам за помощью!" : "По всей видимости ник используется в верификации, изменить его не получится!",
					{embed: true}
				).setFooter({ text: !settings.serverless ? `Это также может быть ошибка отправки команды на сервер. ${kuma?.url ? `Проверьте статус систем на ${kuma.url}` : ""}` : "Бот находится в serverless режиме и не отправляет команды на сервер." }) ]
			});

			try {
				await member.setNickname(name);
			} catch (e) {}

			interaction.editReply({
				embeds: [
					success(null, "Ник изменен!", `Новое имя игрока ${member.toString()} сохранено! Старый никнейм также сохранен и доступен через команду /info.`, {embed: true})
						.setFooter({ text: !settings.serverless ? "Учтите, что старый ник был удален из вайтлиста, зайти на сервер с ним больше невозможно" : "Бот находится в serverless режиме и не может управлять вайтлистом, учтите это!" })
				]
			});
		}
	}
}
