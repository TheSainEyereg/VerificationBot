const { Message, Guild, Client, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, TextChannel, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { guildId, channels, roles } = require("../../config");
const { deleteAnswer, deleteVerify, getAnswer, getCategory, getVerify, setCategory, setVerify } = require("./DataManager");
const { textQuestions } = require("./QuestionsList");
const { colors, regular, success } = require("./Messages");

/**
 * @param {Guild} guild 
 */
async function createCategory(guild) {
	const category = await guild.channels.create({
		name: "Verification",
		type: ChannelType.GuildCategory,
		permissionOverwrites: [
			{
				id: guild.id,
				deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect]
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
		console.log("Verification category found!");
		return category;
	} catch (e) {
		console.log("Verification category not found!");
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

	const channel = await guild.channels.create({
		name: user.username,
		type: ChannelType.GuildText,
		parent: categoryId
	});

	await channel.lockPermissions();
	await channel.permissionOverwrites.edit(user, {ViewChannel: true, SendMessages: true});

	setVerify(user.id, {
		channel: channel.id,
		question: 0,
		onSameQuestion: 0
	});

	//await regular(channel, "Привет, добро пожаловать в систему анкетирования!", `Вам будут задано несколько простых вопросов, а затем вы пройдете верификацию от нашего модератора. Ну что же, начнем! \n\n**${textQuestions[0].message}**`, {imgae: textQuestions[0].image, content: user.toString()});
	await regular(channel, "Привет, добро пожаловать в систему анкетирования!", "Вам будут задано несколько простых вопросов, а затем вы пройдете верификацию от нашего модератора. Ну что же, начнем!",{content: user.toString()});
	await regular(channel, "Первый вопрос", textQuestions[0].message, {image: textQuestions[0].image});

	return true;
}

/**
 * @param {Guild} guild
 * @param {User} user
 */
async function endConversation(guild, user) {
	const userVeryfy = getVerify(user.id);

	const chanelExists = await checkForChannel(guild, user);
	if (chanelExists) {
		await guild.channels.delete(userVeryfy.channel);
	}

	deleteAnswer(user.id);
	deleteVerify(user.id);

	if (!userVeryfy?.alertMessage) return true; // Ну чел тип даже не дошел до верефикации.

	/** @type {TextChannel} */
	const answerChannel = await guild.channels.fetch(channels.answers);

	try {
		const alertMessage = await answerChannel.messages.fetch(userVeryfy.alertMessage);
		await alertMessage.delete();
	} catch (e) {}

	return true;
}

/**
 * @param {Message} message
 */
async function sendForConfirmation(message) {
	const userVeryfy = getVerify(message.author.id);

	/** @type {TextChannel} */
	const verifyChannel = await message.guild.channels.fetch(userVeryfy.channel);

	await verifyChannel.edit({name: `🟢${userVeryfy.nickname}`})
	await verifyChannel.permissionOverwrites.edit(roles.moderator, {ViewChannel: true, SendMessages: true});

	/** @type {TextChannel} */
	const answerChannel = await message.guild.channels.fetch(channels.answers);

	const alertMessage = await answerChannel.send({
		content: `<@&${roles.moderator}>`,
		embeds: [
			new EmbedBuilder({
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
			new ActionRowBuilder({
				components: [
					new ButtonBuilder({
						customId: "reject"+message.author.id,
						label: "Отклонить сразу",
						style: ButtonStyle.Danger,
						emoji: "✖"
					})
				]
			}),
		]
	})

	deleteAnswer(message.author.id);
	userVeryfy.alertMessage = alertMessage.id;
	userVeryfy.onConfirmation = true;

	await success(message, "Поздравляю, вы прошли систему анкетирования!", "Теперь дождитесь ответа ответственного сотрудника для подтверждения!");

	return true;
}


module.exports = {checkForCategory, startConversation, sendForConfirmation, endConversation};