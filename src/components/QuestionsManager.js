import { guild as guildId, channels, roles } from "../../config.js";
import { deleteAnswer, deleteVerify, getAnswer, getCategory, getVerify, setCategory, setVerify } from "./DataManager.js";
import { Message, Guild, Client, User, MessageEmbed, MessageActionRow, MessageButton } from "discord.js";
import questions from "./QuestionsList.js";
import { colors, regular, success } from "./Messages.js";

/**
 * @param {Guild} guild 
 */
async function createCategory(guild) {
	const category = await guild.channels.create("Verification", {
		type: "GUILD_CATEGORY",
		permissionOverwrites: [
			{
				id: guild.id,
				deny: ["VIEW_CHANNEL", "SEND_MESSAGES", "CONNECT"]
			}
		]
	});
	setCategory(category.id);

	return category;
}

/**
 * @param {Client} client 
 */
async function checkForCategory(client) {
	const guild = client.guilds.cache.get(guildId);

	const categoryId = getCategory();
	if (!categoryId) return createCategory(guild);

	try {
		const category = await guild.channels.fetch(categoryId);
		console.log(`Verification category found!`);
		return category;
	} catch (e) {
		console.log(`Verification category not found!`);
		await createCategory(guild);
	}
}


/**
 * @param {Guild} guild
 * @param {User} user - user
 * @returns {Promise<Boolean>}
 */
async function checkForChannel(guild, user) {
	const userVeryfy = getVerify(user.id);

	if (userVeryfy?.channel) {
		try {
			await guild.channels.fetch(userVeryfy.channel);
			return true;
		} catch (e) {
			return false;
		}
	}
	return false;
}


/**
 * @param {Guild} guild
 * @param {User} user
 */
async function startConversation(guild, user) {
	try {
		const member = await guild.members.fetch(user.id);
		if (member.roles.cache.has(roles.approved)) return false;
	} catch (e) {
		return false;
	}

	const chanelExists = await checkForChannel(guild, user);
	if (chanelExists) return false;

	const categoryId = getCategory();

	const channel = await guild.channels.create(user.username, {
		type: "GUILD_TEXT",
		parent: categoryId
	});

	await channel.lockPermissions();
	await channel.permissionOverwrites.edit(user, {VIEW_CHANNEL: true, SEND_MESSAGES: true});

	setVerify(user.id, {
		channel: channel.id,
		question: 0,
		onSameQuestion: 0
	});

	regular(channel, "Привет, добро пожаловать в систему анкетирования!", `Вам будут задано несколько простых вопросов, а затем вы пройдете верификацию от нашего модератора. Ну что же, начнем! \n**${questions[0].message}**`, {imgae: questions[0].image});

	return true;
}

/**
 * @param {Guild} guild
 * @param {User} user
 */
async function endConversation(guild, user) {
	const userVeryfy = getVerify(user.id);

	const chanelExists = await checkForChannel(guild, user);
	if (!chanelExists) return false;

	await guild.channels.delete(userVeryfy.channel);

	deleteAnswer(user.id);
	deleteVerify(user.id);

	return true;
}

/**
 * @param {Message} message
 */
async function sendForConfirmation(message) {
	const userVeryfy = getVerify(message.author.id);

	const answerChannel = await message.guild.channels.fetch(channels.answers);
	const verifyChannel = await message.guild.channels.fetch(userVeryfy.channel);

	await verifyChannel.permissionOverwrites.edit(roles.moderator, {VIEW_CHANNEL: true, SEND_MESSAGES: true});

	await answerChannel.send({
		content: `<@&${roles.moderator}>`,
		embeds: [
			new MessageEmbed({
				color: colors.regular,
				title: "Новый игрок на подтверждение",
				description: "Новый игрок запрашивает подтверждение, пройдите в канал для беседы с ним!",
				fields: [
					{
						name: "Канал",
						value: `<#${userVeryfy.channel}>`
					},
					{
						name: "Пользователь",
						value: `<@${message.author.id}>`,
						inline: true
					},
					{
						name: "Ник в Minecraft",
						value: `\`${userVeryfy.nickname}\``,
						inline: true
					},
					{
						name: "Дата регистрации аккаунта",
						value: message.author.createdAt.toLocaleString("ru")
					},
					{
						name: "Дата входа на сервер",
						value: message.member.joinedAt.toLocaleString("ru")
					}
				],
				footer: {
					text: "⚠ По окончании беседы введите /approve или /reject чтобы принять или отклонить пользователя!!!"
				}
			})
		],
		files: [
			{
				name: "Ответы.txt",
				attachment: getAnswer(message.author.id)
			}
		],
		components: [
			new MessageActionRow({
				components: [
					new MessageButton({
						customId: "reject"+message.author.id,
						label: "Отклонить сразу",
						style: "DANGER",
						emoji: "✖"
					})
				]
			}),
		]
	})

	deleteAnswer(message.author.id);
	userVeryfy.onConfirmation = true;

	await success(message, "Поздравляю, вы прошли систему анкетирования!", "Теперь дождитесь ответа ответственного сотрудника для подтверждения!");

	return true;
}


export {checkForCategory, startConversation, sendForConfirmation, endConversation};