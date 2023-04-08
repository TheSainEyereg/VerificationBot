const { SlashCommandBuilder, Interaction } = require("discord.js");
const { RegExps } = require("../components/constants");
const { updatePassword } = require("../components/rconManager");
const { getUser } = require("../components/dataManager");
const { hasAccess } = require("../components/checkManager");
const { changeUserName } = require("../components/actionManager");
const { success, warning } = require("../components/messages");

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
	 * @param {Interaction} interaction - interaction
	 */
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;
		
		const subcommand = interaction.options.getSubcommand();
			
		const isAdmin = hasAccess(interaction.member, "administrator");

		const member = interaction.options.getMember("user");

		if (hasAccess(member, "moderator") && (!isAdmin || interaction.member.id !== member.id )) return interaction.reply({
			ephemeral: true,
			embeds: [
				warning(null, "Ого!", "Вы не можете использовать команду на тех, кто выше или равен вам по рангу!", {embed: true})
			]
		});

		const user = getUser(member.id);
		if (!user) return interaction.reply({
			ephemeral: true,
			embeds: [
				warning(null, "Невозможно управлять!", "Пользователь не подтвержден или не имеет ассоциации с ником в игре.", {embed: true})
			]
		});

		if (subcommand === "password") {
			const password = interaction.options.getString("password");
			if (!RegExps.Password.test(password)) return interaction.reply({
				ephemeral: true,
				embeds: [
					warning(null, "Недопустимые символы!", "Пароль содержит символы, которые не могут быть использованы в пароле!", {embed: true})
				]
			});

			await updatePassword(user.name, password);
			
			interaction.reply({
				ephemeral: true,
				embeds: [
					success(null, "Пароль изменен!", `Пароль игрока ${member.toString()} изменен! Не забудьте сообщить новый пароль игроку!`, {embed: true})
				]
			});
		}

		if (subcommand === "nickname") {
			const name = interaction.options.getString("name");

			if (!RegExps.MinecraftNameString.test(name)) return interaction.reply({
				ephemeral: true,
				embeds: [
					warning(null, "Ник недопустим!", "Пожалуйста, укажите ник в правильном формате!", {embed: true})
				]
			});

			const changeName = await changeUserName(user.userId, name, isAdmin);
			
			try {
				await member.setNickname(name);
			} catch (e) {}

			if (!changeName) return interaction.reply({
				ephemeral: true,
				embeds: [ warning(
					null, "Невозможно изменить имя игрока!",
					!isAdmin ? "Ник уже используется другим игроком, сменить его невозможно! Обратитесь к более высоким рангам за помощью!" : "По всей видимости ник используется в верификации, изменить его не получится!",
					{embed: true}
				)]
			});

			interaction.reply({
				ephemeral: true,
				embeds: [
					success(null, "Ник изменен!", `Имя игрока ${member.toString()} в игре перезаписано! Старый никнейм удален, вход по нему больше недоступен!`, {embed: true})
				]
			});
		}
	}
}