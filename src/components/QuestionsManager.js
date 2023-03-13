const { Message, Guild, Channel, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, TextChannel, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { guildId, channels, roles } = require("../config");
const { deleteAnswers, deleteVerify, getAnswers, getCategories, getVerify, addCategory, createVerify, deleteCategory, updateVerify } = require("./dataManager");
const { textQuestions, quizQuestions } = require("./questionsList");
const { colors, regular, success, warning } = require("./messages");
const { States } = require("./enums");

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
	addCategory(category.id);

	return category;
}

/**
 * @param {Guild} guild 
 */
async function getCategory(guild) {
	const categoryIds = getCategories();
	if (!categoryIds.length) return createCategory(guild);

	const categories = (await guild.channels.fetch()).filter(c => c.type === ChannelType.GuildCategory);

	for (const categoryId of categoryIds) {
		const category = categories.find(c => c.id === categoryId);
		if (!category) {
			deleteCategory(categoryId);
			continue;
		}

		if (category.children.cache.size < 50) {
			return category;
		}
	}

	if (categoryIds.length > 2) return false;
	return createCategory(guild);
}


/**
 * @param {Guild} guild
 * @param {String} id - Channel ID
 * @returns {Promise<Boolean>}
 */
async function checkForChannel(guild, id) {
	if (id) {
		try {
			await guild.channels.fetch(id);
			return true;
		} catch (e) {
			return false;
		}
	}
	return false;
}

/**
 * 
 * @param {Channel} channel 
 * @param {number} index 
 */
async function sendQuestion(channel, index) {
	if (index < textQuestions.length) {
		const question = textQuestions[index];
		await regular(
			channel,
			index === 0 ? "Первый вопрос" : index === textQuestions.length-1 ? "Последний вопрос" : "Вопрос " + (index+1),
			question.message,
			{image: question.image}
		);
	} else {

	}
}


/**
 * @param {Guild} guild
 * @param {User} user
 */
async function startConversation(guild, user) {
	try {
		const member = await guild.members.fetch(user.id);
		if (member.roles.cache.has(roles.approved)) return;
	} catch (e) {
		return;
	}

	const userVerify = getVerify(user.id);

	if (userVerify) {
		const chanelExists = await checkForChannel(guild, userVerify.channelId);
		if (chanelExists) return;
	}

	const category = await getCategory(guild);

	if (!category) {
		try {
			const DMChannel = await member.user.createDM();
			if (DMChannel) await warning(DMChannel, "О нет!", "Сейчас у нас слишком много заявок, пожалуйста, попробуйте позже!");
		} catch (e) {}
		return;
	}

	const channel = await guild.channels.create({
		name: !userVerify?.nickname ? user.username : userVerify.nickname,
		type: ChannelType.GuildText,
		parent: category.id
	});

	await channel.lockPermissions();
	await channel.permissionOverwrites.edit(user, {ViewChannel: true, SendMessages: true});

	if (!userVerify) {
		createVerify(user.id, channel.id, Date.now() + 48 * 60 * 60 * 1000 ,Object.keys(quizQuestions).sort(() => Math.random() - 0.5).join(","));
		await regular(channel, "Привет, добро пожаловать в систему анкетирования!", "Вам будут задано несколько простых вопросов, а затем вы пройдете верификацию от нашего модератора. Учтите, что анкета будет автоматически удалена через 48 часов! Ну что же, начнем!", {content: user.toString()});
		await sendQuestion(channel, 0);
	} else {
		updateVerify(user.id, "channelId", channel.id);
		const rt = Date.now() - userVerify.closeIn;
		await regular(channel, "Упс!", `Каким-то образом канал с вашей анкетой пропал, но ничего страшного, продолжим, где остановились! Учтите, что до закрытия вашей анкеты осталось ${Math.floor(rt / (1000 * 60 * 60) % 24)}ч ${Math.floor(rt / (1000 * 60) % 60)}м.`, {content: user.toString()});
		await sendQuestion(channel, userVerify.question);
	}

}

/**
 * @param {Guild} guild
 * @param {User} user
 */
async function endConversation(guild, user) {
	const userVerify = getVerify(user.id);
	if (!userVerify) return;

	const chanelExists = await checkForChannel(guild, userVerify.channelId);
	if (chanelExists) {
		await guild.channels.delete(userVerify.channelId);
	}

	deleteVerify(user.id);

	if (!userVerify?.alertMessage) return; // Ну чел тип даже не дошел до верификации.

	/** @type {TextChannel} */
	const answerChannel = await guild.channels.fetch(channels.answers);

	try {
		const alertMessage = await answerChannel.messages.fetch(userVerify.messageId);
		await alertMessage.delete();
	} catch (e) {}
}

/**
 * @param {Message} message
 */
async function sendForConfirmation(message) {
	const userVerify = getVerify(message.author.id);

	/** @type {TextChannel} */
	const verifyChannel = await message.guild.channels.fetch(userVerify.channelId);

	await verifyChannel.edit({name: `🟢${userVerify.nickname}`})
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
						value: `<#${userVerify.channelId}>`
					},
					{
						name: "Пользователь",
						value: `<@${message.author.id}>`,
						inline: true
					},
					{
						name: "Ник в Minecraft",
						value: `\`${userVerify.nickname}\``,
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

	deleteAnswers(message.author.id);

	updateVerify(message.author.id, "messageId", alertMessage.id);
	updateVerify(message.author.id, "state", States.OnQuiz);

	await success(message, "Поздравляю, вы прошли систему анкетирования!", "Теперь дождитесь ответа ответственного сотрудника для подтверждения!");

	return true;
}


module.exports = {sendQuestion, startConversation, sendForConfirmation, endConversation};