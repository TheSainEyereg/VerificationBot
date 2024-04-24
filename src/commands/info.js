const { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { roles } = require("../config");
const { Colors } = require("../components/constants");
const { getUser, getUserByName } = require("../components/dataManager");
const { hasAccess } = require("../components/checkManager");
const { warning } = require("../components/messages");

module.exports =  {
	data: new SlashCommandBuilder().setName("info").setDescription("Получает дату регистрации пользователя Discord.")
		.addUserOption(option =>
			option
				.setName("member")
				.setDescription("Участник сервера")
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName("nickname")
				.setDescription("Ник в игре")
				.setRequired(false)
		),
	access: "user",
	/**
	 * Interaction
	 * @param {ChatInputCommandInteraction} interaction - interaction
	 */
	async execute(interaction) {
		const target = interaction.options.getMember("member") ?? interaction.member;
		const nickname = interaction.options.getString("nickname");

		const advancedOutput = hasAccess(interaction.member, ["inspector", "moderator"]);

		const possibleUser = nickname ? getUserByName(nickname) : getUser(target.id);

		if (nickname && !possibleUser) return interaction.editReply({
			embeds: [
				warning(null, "Не найдено!", "Данный ник не принадлежит и не принадлежал ни одному игроку!", {embed: true})
			]
		});

		const member = nickname ? await interaction.guild.members.cache.get(possibleUser.userId) : target;
		const user = nickname ? await interaction.client.users.fetch(possibleUser.userId).catch(() => null) : member.user;

		interaction.editReply({
			embeds: [
				new EmbedBuilder({
					color: Colors.Regular,
					title: `Информация о пользователе ${member?.displayName ?? user?.username ?? ""}`,
					fields: [
						{
							name: "Discord ID",
							value: `\`${possibleUser?.userId}\``,
							inline: true
						},
						... user ? [
							{
								name: "Discord имя и тег",
								value:`\`${user.username + (user.discriminator !== "0" ? `#${user.discriminator}` : "")}\``,
								inline: true
							}
						] : [],
						... (member || possibleUser) ? [
							{
								name: possibleUser ? "Впервые вошел на сервер" : "Дата захода",
								value: `<t:${Math.floor((possibleUser?.firstJoined ? possibleUser.firstJoined : member.joinedTimestamp) / 1000)}>`,
							}
						] : [],
						... (possibleUser?.name || member.roles.cache.has(roles.approved)) ? [
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
			... advancedOutput && possibleUser?.answers && {
				files: [{
					name: "answers.txt",
					attachment: Buffer.from(JSON.parse(possibleUser.answers).map(qa => `Вопрос: ${qa.q}\nОтвет: ${qa.a}\n\n`).join(""))
				}]
			}
		});
	}
};