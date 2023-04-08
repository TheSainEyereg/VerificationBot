const { Interaction, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { Colors } = require("../components/constants");
const { getUser } = require("../components/dataManager");

module.exports =  {
	data: new SlashCommandBuilder().setName("info").setDescription("Получает дату регистрации пользователя Discord.").addUserOption(option =>
		option
			.setName("target")
			.setDescription("Пользователь")
			.setRequired(true)
	),
	access: "user",
	/**
	 * Interaction
	 * @param {Interaction} interaction - interaction
	 */
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;
		
		const member = interaction.options.getMember("target");

		const possibleUser = getUser(member.id);

		interaction.reply({
			embeds: [
				new EmbedBuilder({
					color: Colors.Regular,
					title: "Информация о пользователе "+member.displayName,
					fields: [
						{
							name: "Discord ID",
							value: `\`${member.user.id}\``,
							inline: true
						},
						{
							name: "Discord имя",
							value:`\`${member.user.username}\``,
							inline: true
						},
						... possibleUser ? [
							{
								name: "Ник в игре",
								value: `\`${possibleUser.name}\``
							},
							{
								name: "Прошлые ники",
								value: possibleUser.oldNames?.split(",").map(name => `\`${name.trim()}\``).join(", ") || "Не имеет прошлых ников."
							},
							... (possibleUser.banUntil || possibleUser.banReason) ? [
								{
									name: "Бан истекает",
									value: possibleUser.banUntil ? new Date(possibleUser.banUntil).toLocaleString("ru") : "Без срока.",
									inline: true
								},
								{
									name: "Причина бана",
									value: possibleUser.banReason || "Без причины.",
									inline: true
								}
							] : [],
						] : [],
						{
							name: "Аккаунт создан",
							value: member.user.createdAt.toLocaleString("ru"),
						},
						{
							name: "Зашел на сервер",
							value: member.joinedAt.toLocaleString("ru"),
						}
					]
				})
			]
		});
	}
};