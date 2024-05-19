const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { getWhitelist } = require("../components/rconManager");
const { warning, success } = require("../components/messages");
const { roles, settings } = require("../config");
const { getUser, createUser, getUserByName, findVerify } = require("../components/dataManager");

module.exports = {
	data: new SlashCommandBuilder().setName("save").setDescription("Ассоциирует ваш игровой аккаунт с вашим именем в игре")
	.addStringOption(option => option.setName("nickname").setDescription("Ваш ник в игре").setRequired(true)),

	access: "user",
	/**
	 * Interaction
	 * @param {ChatInputCommandInteraction} interaction - interaction
	 */
	async execute(interaction) {
		const potentialUser = getUser(interaction.user.id);
		if (potentialUser) return interaction.editReply({
			embeds: [
				success(null, "Вы и ваш ник уже есть в базе данных!", `Данная команда только для тех, кто имеет роль подтвержденного игрока и не имеет привязки к никнейму в игре!\nВаш ник: \`${potentialUser.name}\``, {embed: true})
			]
		});

		if (settings.replaceWhitelist) return interaction.editReply({
			embeds: [
				warning(null, "Нет смысла ¯\\_(ツ)_/¯", "Бот полностью контролирует вайтлист, и даже, если вы были в нем до его подключения, то сейчас вашего ника там нет.", {embed: true})
			]
		});

		if (!interaction.member.roles.cache.has(roles.approved)) return interaction.editReply({
			embeds: [
				warning(null, "Вы не подтвержденный игрок!", "Вы должны быть подтвержденным игроком. Если вы проходите верификацию, то ваш ник автоматически будет добавлен в вайтлист и связан с вашим Discord аккаунтом.", {embed: true})
			]
		});

		const nickname = interaction.options.getString("nickname");

		const whitelist = await getWhitelist();

		if (!settings.serverless && !whitelist.includes(nickname.toLocaleLowerCase())) return interaction.editReply({
			embeds: [
				warning(null, "Ник не присутствует в вайтлисте!", "Ваш ник должен быть в вайтлисте, чтобы можно было привязать его к вашему Discord. Откройте тикет, если вам нужна помощь.", {embed: true})
			]
		});

		const nicknameExists = !!(getUserByName(nickname) || findVerify("nickname", nickname));

		if (nicknameExists) return interaction.editReply({
			embeds: [
				warning(null, "Ник уже привязан!", "Данный ник уже привязан к другому аккаунту Discord! Если это ваш ник и его украли, то не переживайте, откройте тикет и напишите нам со всеми подробностями и мы вам поможем.", {embed: true})
			]
		});

		createUser(interaction.user.id, nickname, interaction.member.joinedTimestamp, []);

		let changedName = false;
		try {
			await interaction.member.setNickname(nickname);
			changedName = true;
		} catch (e) {}

		interaction.editReply({
			embeds: [
				success(null, "Готово!", `Теперь ваш никнейм связан с вашим аккаунтом в Discord!\n${!changedName ? "Однако я не смог сменить ваше имя в Discord, пожалуйста, самостоятельно измените его на ваш ник." : "Также не рекомендуется менять ваше имя в Discord во избежании путаницы."}`, {embed: true})
			]
		});
	}
}