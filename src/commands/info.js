const { Interaction, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { colors } = require("../components/Messages.js");

module.exports =  {
	data: new SlashCommandBuilder().setName("info").setDescription("Получает дату регистрации пользователя Discord.").addUserOption(option =>
		option
			.setName("target")
			.setDescription("Пользователь")
			.setRequired(true)
	),
	/**
	 * Interaction
	 * @param {Interaction} interaction - interaction
	 */
	async execute(interaction) {
		const member = interaction.options.getMember("target");

		interaction.reply({
			embeds: [
				new EmbedBuilder({
					color: colors.regular,
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