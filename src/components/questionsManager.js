const { Message, Interaction, Guild, Channel, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, TextChannel, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { channels, roles } = require("../config");
const { deleteVerify, getAnswers, getCategories, getVerify, addCategory, createVerify, deleteCategory, updateVerify, getUser } = require("./dataManager");
const { textQuestions, quizQuestions } = require("./questionsList");
const { regular, success, warning } = require("./messages");
const { States, Colors } = require("./constants");

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
 * @param {Object} verify 
 */
async function sendQuestion(channel, verify) {
	if (verify.state === States.OnText) {
		const question = textQuestions[verify.question];
		await regular(
			channel,
			`Вопрос ${(verify.question+1)}`,
			question.message,
			{image: question.image}
		);
	}

	if (verify.state === States.OnQuiz) {
		const quizOrder = verify.quizOrder.split(",");

		const question = quizQuestions[quizOrder[verify.question]];

		const answerOrder = Object.keys(question.answers).sort(() => Math.random() - 0.5);

		const components = [];
		for (const [i, answer] of answerOrder.entries()) {
			const answerText = question.answers[answer];

			components.push(new ButtonBuilder({
				custom_id: "answer"+i,
				label: answerText,
				style: ButtonStyle.Primary
			}))
		}

		await channel.send({
			embeds: [ 
				regular(
					null,
					verify.question === quizQuestions.length-1 ? "Последний вопрос" : `Вопрос ${(verify.question + textQuestions.length + 1)}`,
					question.message,
					{image: question.image, embed: true}
				)
			],
			components: [ new ActionRowBuilder({components}) ]
		})

		updateVerify(verify.userId, "quizAnswerOrder", answerOrder.join(","));
	}

	if (verify.state === States.OnPassword) {
		await channel.send({
			embeds: [
				warning(
					null,
					"Установка пароля",
					"Внимание! Для того, чтобы обезопасить ваш будущий аккаунт нам нужно попросить у вас пароль, который будет установлен на ваш аккаунт по умолчанию. Таким образом, после подтверждения вашей заявки кто угодно не сможет зайти под вашим именем.\n\nПароль всегда можно сменить в лобби через команду `/changepassword <старый пароль> <новый пароль>`",
					{embed: true}
				)
			],
			components: [
				new ActionRowBuilder({
					components: [
						new ButtonBuilder({
							customId: "requestPassword",
							label: "Всё понятно, ввести пароль",
							style: ButtonStyle.Primary
						})
					]
				})
			]
		})
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
	
		const possibleUser = getUser(user.id);
		if (possibleUser) return await member.roles.add(roles.approved);
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
			const DMChannel = await user.createDM();
			if (DMChannel) await warning(DMChannel, "О нет!", "Сейчас у нас слишком много заявок, пожалуйста, попробуйте позже!");
		} catch (e) {}
		return;
	}

	const channel = await guild.channels.create({
		name: !userVerify?.nickname ? user.username : userVerify.state !== States.OnConfirmation ? userVerify.nickname : `🟢${userVerify.nickname}`,
		type: ChannelType.GuildText,
		parent: category.id
	});

	await channel.lockPermissions();
	await channel.permissionOverwrites.edit(user, {ViewChannel: true, SendMessages: true});

	if (!userVerify) {
		createVerify(user.id, channel.id, Date.now() + 48 * 60 * 60e3 ,Object.keys(quizQuestions).sort(() => Math.random() - 0.5).join(","));
		await regular(channel, "Привет, добро пожаловать в систему анкетирования!", "Вам будут задано несколько простых вопросов, а затем вы пройдете верификацию от нашего модератора. Учтите, что анкета будет автоматически удалена через 48 часов! Ну что же, начнем!", {content: user.toString()});
		await sendQuestion(channel, {question: 0, state: States.OnText});
		return;
	}

	updateVerify(user.id, "channelId", userVerify.channelId = channel.id);

	if (userVerify.state === States.OnConfirmation) {
		await success(channel, "Все готово!", "Однако каким-то образом канал с вашей анкетой пропал, но ничего страшного, вы уже все сделали и вам лишь осталось подождать до тех пор, пока вам не ответит проверяющий и не подтвердит вас. \n\nКанал был пересоздан на случай, если у персонала возникнут дополнительные вопросы к вам.", {content: user.toString()});
		return;
	}

	const rt = userVerify.openUntil - Date.now();
	await regular(channel, "Упс!", `Каким-то образом канал с вашей анкетой пропал, но ничего страшного, продолжим, где остановились! Учтите, что до закрытия вашей анкеты осталось ${Math.floor(rt / (1000 * 60 * 60))}ч ${Math.floor(rt / (1000 * 60) % 60)}м.`, {content: user.toString()});
	await sendQuestion(channel, userVerify);
}

/**
 * @param {Guild} guild
 * @param {User} user
 */
async function endConversation(guild, user) {
	const userVerify = getVerify(user.id);
	if (!userVerify) return;

	deleteVerify(user.id);

	const chanelExists = await checkForChannel(guild, userVerify.channelId);
	if (chanelExists) await guild.channels.delete(userVerify.channelId);


	if (!userVerify?.messageId) return; // Ну чел тип даже не дошел до подтверждения.

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
async function sendForQuiz(message) {
	const userVerify = getVerify(message.author.id);
	
	/** @type {TextChannel} */
	const verifyChannel = await message.guild.channels.fetch(userVerify.channelId);

	updateVerify(message.author.id, "state", userVerify.state = States.OnQuiz);
	updateVerify(message.author.id, "question",  userVerify.question = 0);
	
	// await regular(verifyChannel, "Поздравляем! Первый этап позади!", "Вы ответили на все нужные вопросы и теперь вам нужно пройти короткий тестик! Поехали!")
	await sendQuestion(verifyChannel, userVerify);
}

/**
 * 
 * @param {Interaction} interaction 
 */
async function askForPassword(interaction) {
	const userVerify = getVerify(interaction.user.id);
	
	/** @type {TextChannel} */
	const verifyChannel = await interaction.guild.channels.fetch(userVerify.channelId);
	updateVerify(interaction.user.id, "state", userVerify.state = States.OnPassword);
		
	await regular(verifyChannel, "Вот и готово!", "Вы ответили на все вопросы и прошли тест, однако есть ещё одна важная вещь! Для того, чтобы после добавления вас в whitelist, на ваш аккаунт не вошел кто-либо вам нужно установить временный пароль, который автоматически применится к вашему ник-нейму на сервере!");
	await sendQuestion(verifyChannel, userVerify);
}

/**
 * @param {Interaction} interaction
 */
async function sendForConfirmation(interaction) {
	const userVerify = getVerify(interaction.user.id);

	/** @type {TextChannel} */
	const verifyChannel = await interaction.guild.channels.fetch(userVerify.channelId);

	await verifyChannel.edit({name: `🟢${userVerify.nickname}`})
	await verifyChannel.permissionOverwrites.edit(roles.inspector, {ViewChannel: true, SendMessages: true});

	/** @type {TextChannel} */
	const answerChannel = await interaction.guild.channels.fetch(channels.answers);

	const alertMessage = await answerChannel.send({
		content: `<@&${roles.inspector}>`,
		embeds: [
			new EmbedBuilder({
				color: Colors.Regular,
				title: "Новый игрок на подтверждение",
				description: "Новый игрок запрашивает подтверждение, пройдите в канал для беседы с ним!",
				fields: [
					{
						name: "Канал",
						value: `<#${userVerify.channelId}>`
					},
					{
						name: "Пользователь",
						value: `<@${interaction.user.id}>`,
						inline: true
					},
					{
						name: "Ник в Minecraft",
						value: `\`${userVerify.nickname}\``,
						inline: true
					},
					{
						name: "Дата регистрации аккаунта",
						value: `<t:${Math.floor(interaction.user.createdAt / 1000)}>`,
					},
					{
						name: "Дата входа на сервер",
						value: `<t:${Math.floor(interaction.member.joinedAt / 1000)}>`,
					}
				],
				footer: {
					text: "⚠ По окончании беседы введите /approve или /reject чтобы принять или отклонить пользователя!!!"
				}
			})
		],
		files: [
			{
				name: "answers.txt",
				attachment: Buffer.from(getAnswers(interaction.user.id).map(qa => `Вопрос: ${qa.q}\nОтвет: ${qa.a}\n\n`).join(""))
			}
		],
		components: [
			new ActionRowBuilder({
				components: [
					new ButtonBuilder({
						customId: "reject"+interaction.user.id,
						label: "Отклонить сразу",
						style: ButtonStyle.Danger,
						emoji: "✖"
					})
				]
			}),
		]
	});

	updateVerify(interaction.user.id, "messageId", alertMessage.id);
	updateVerify(interaction.user.id, "state", States.OnConfirmation);

	await success(interaction.channel, "Поздравляю, вы прошли систему анкетирования!", "Теперь дождитесь ответа ответственного сотрудника для подтверждения! И да, ваша анкета не будет закрыта до тех пор, пока вас не подтвердят :)");
}


module.exports = {checkForChannel, sendQuestion, startConversation, sendForQuiz, askForPassword, sendForConfirmation, endConversation};