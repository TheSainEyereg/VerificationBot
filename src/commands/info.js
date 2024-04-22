const { Interaction, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { roles } = require("../config");
const { Colors } = require("../components/constants");
const { getUser } = require("../components/dataManager");
const { warning } = require("../components/messages");
const { hasAccess } = require("../components/checkManager");

module.exports =  {
	data: new SlashCommandBuilder().setName("info").setDescription("Получает дату регистрации пользователя Discord.").addUserOption(option =>
		option
			.setName("target")
			.setDescription("Пользователь")
			.setRequired(false)
	),
	access: "user",
	/**
	 * Interaction
	 * @param {ChatInputCommandInteraction} interaction - interaction
	 */
	async execute(interaction) {
		const member = interaction.options.getMember("target") || interaction.member;

		const advancedOutput = hasAccess(interaction.member, ["inspector", "moderator"]);

		const possibleUser = getUser(member.id);

		interaction.editReply({
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
							name: "Discord имя и тег",
							value:`\`${member.user.username + (member.user.discriminator !== "0" ? `#${member.user.discriminator}` : "")}\``,
							inline: true
						},
						{
							name: possibleUser ? "Впервые вошел на сервер" : "Дата захода",
							value: `<t:${Math.floor((possibleUser?.firstJoined ? possibleUser.firstJoined : member.joinedTimestamp) / 1000)}>`,
						},
						... member.roles.cache.has(roles.approved) ? [
							{
								name: "Ник в игре",
								value: possibleUser?.name ? `\`${possibleUser.name}\`` : "❌ Не установлен!",
								inline: true
							}
						] : [],
						... possibleUser?.oldNames ? [
							{
								name: "Прошлые ники",
								value: possibleUser.oldNames.split(",").map(name => `\`${name.trim()}\``).join(", "),
								inline: true
							}
						] : [],
						... possibleUser?.knownServers ? [
							{
								name: "Встречался на серверах",
								value: possibleUser.knownServers.split(",").map(name => `\`${name.trim()}\``).join(", ")
							}
						] : [],
						... (possibleUser?.bannedAt && possibleUser?.bannedBy) ? [
							{
								name: "Заблокирован",
								value: `\`${possibleUser.bannedBy}\` <t:${Math.floor(possibleUser.bannedAt / 1000)}>`,
								inline: true
							},
							{
								name: "Бан истекает",
								value: possibleUser.banedUntil ? `<t:${Math.floor(possibleUser.banedUntil / 1000)}:R>` : "Никогда.",
								inline: true
							},
							{
								name: "Причина бана",
								value: `\`${possibleUser.banReason}\`` || "Без причины.",
								inline: true
							}
						] : [],
						... (advancedOutput && possibleUser?.approvedAt && possibleUser?.approvedBy) ? [
							{
								name: "Подтвержден",
								value: `<@${possibleUser.approvedBy}> <t:${Math.floor(possibleUser.approvedAt / 1000)}>`,
							}
						] : []
					]
				})
			],
			... advancedOutput && possibleUser.answers && {
				files: [{
					name: "answers.txt",
					attachment: Buffer.from(JSON.parse(possibleUser.answers).map(qa => `Вопрос: ${qa.q}\nОтвет: ${qa.a}\n\n`).join(""))
				}]
			}
		});
	}
};