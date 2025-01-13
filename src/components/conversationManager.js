const {
	Interaction,
	Message,
	Guild,
	GuildTextBasedChannel,
	User,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	PermissionFlagsBits,
} = require("discord.js");
const { channels, roles } = require("../config");
const {
	deleteVerify,
	getAnswers,
	getCategories,
	getVerify,
	addCategory,
	createVerify,
	deleteCategory,
	updateVerify,
	getUser,
} = require("./dataManager");
const { regular, success, warning } = require("./messages");
const { States, Colors } = require("./constants");
const questions = require("./questions");

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
				deny: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.Connect,
				],
			},
		],
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

	const categories = (await guild.channels.fetch()).filter(
		c => c.type === ChannelType.GuildCategory
	);

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
 * @returns {Promise<GuildTextBasedChannel | null>}
 */
async function checkForChannel(guild, id) {
	return id ? await guild.channels.fetch(id).catch(() => null) : null;
}

/**
 *
 * @param {GuildTextBasedChannel} channel
 * @param {Object} verify
 */
async function sendQuestion(channel, verify) {
	if (verify.state === States.OnAnswers) {
		const question = questions[verify.question];

		const embed = regular(
			null,
			verify.question === 0
				? "Начало верификации"
				: verify.question === questions.length - 1
					? `Вопрос ${verify.question + 1} - Последний вопрос`
					: `Вопрос ${verify.question + 1}`,
			question.message,
			{ image: question.image, embed: true }
		)
	
		if (question.type === "text") {
			embed.setFooter({ text: "Ответьте на вопрос текстом." });
			await channel.send({
				embeds: [ embed ],
			});
		}
	
		if (question.type === "quiz") {
			const answerOrder = Object.keys(question.answers)
			// 	.sort(() => Math.random() - 0.5);
	
			const components = answerOrder.map((answer, i) => {
				const answerEntry = question.answers[Number(answer)];
				
				const answerText = typeof answerEntry === "string" ? answerEntry : answerEntry.text;
				const style = typeof answerEntry === "string" ? ButtonStyle.Primary : answerEntry.style || ButtonStyle.Primary;

				return new ButtonBuilder({
					custom_id: `answer${i}`,
					label: answerText.length > 80 ? answerText.slice(0, 77) + "..." : answerText,
					style
				});
			});

			updateVerify(verify.userId, "answerOrder", answerOrder.join(","));
	
			await channel.send({
				embeds: [ embed ],
				components: [new ActionRowBuilder({ components })],
			});
		}
	}

	if (verify.state === States.OnPassword) {
		await channel.send({
			embeds: [
				warning(
					null,
					"Установка пароля",
					"Для защиты вашего аккаунта нам нужно, чтобы вы установили временный пароль. После подтверждения заявки этот пароль будет использоваться для входа на сервер. Пароль можно изменить через команду `/changepassword <старый пароль> <новый пароль>`.",
					{ embed: true }
				),
			],
			components: [
				new ActionRowBuilder({
					components: [
						new ButtonBuilder({
							customId: "requestPassword",
							label: "Ввести пароль",
							style: ButtonStyle.Primary,
						}),
					],
				}),
			],
		});
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
		const channelExists = await checkForChannel(
			guild,
			userVerify.channelId
		);
		if (channelExists) return;
	}

	const category = await getCategory(guild);

	if (!category) {
		try {
			await warning(
				user,
				"О нет!",
				"Сейчас у нас слишком много заявок, пожалуйста, попробуйте позже!"
			);
		} catch (e) {}
		return;
	}

	const channel = await guild.channels.create({
		name: userVerify?.nickname || user.username,
		type: ChannelType.GuildText,
		parent: category.id,
	});

	await channel.lockPermissions();
	await channel.permissionOverwrites.edit(user, {
		ViewChannel: true,
		SendMessages: true,
	});

	if (!userVerify) {
		createVerify(user.id, channel.id, Date.now() + 48 * 60 * 60e3);
		await regular(
			channel,
			"Добро пожаловать!",
			"Мы начнем с анкеты, где вам предстоит ответить на несколько вопросов. Анкета будет автоматически удалена через 48 часов! Давайте начнем!",
			{ content: user.toString() }
		);
		await sendQuestion(channel, { question: 0, state: States.OnAnswers });
		return;
	}

	updateVerify(user.id, "channelId", (userVerify.channelId = channel.id));

	if (userVerify.state === States.OnConfirmation) {
		await success(
			channel,
			"Все готово!",
			"Канал с вашей анкетой был восстановлен. Пожалуйста, дождитесь подтверждения от проверяющего.",
			{ content: user.toString() }
		);
		return;
	}

	await regular(
		channel,
		"Возвращаемся!",
		`Ваш канал был восстановлен. Осталось ${Math.floor(
			(userVerify.openUntil - Date.now()) / (1000 * 60 * 60)
		)}ч ${Math.floor(
			((userVerify.openUntil - Date.now()) / (1000 * 60)) % 60
		)}м для завершения анкеты.`,
		{ content: user.toString() }
	);
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

	const channel = await checkForChannel(guild, userVerify.channelId);
	if (channel)
		await channel.delete();

	if (!userVerify?.messageId) return;

	/** @type {GuildTextBasedChannel} */
	const answerChannel = await guild.channels.fetch(channels.answers);

	try {
		const alertMessage = await answerChannel.messages.fetch(
			userVerify.messageId
		);
		await alertMessage.delete();
	} catch (e) {}
}

/**
 * @param {Interaction} interaction
 */
async function askForPassword(interaction) {
	const userVerify = getVerify(interaction.user.id);

	/** @type {GuildTextBasedChannel} */
	const verifyChannel = await interaction.guild.channels.fetch(
		userVerify.channelId
	);
	updateVerify(
		interaction.user.id,
		"state",
		(userVerify.state = States.OnPassword)
	);

	await regular(
		verifyChannel,
		"Завершающий шаг!",
		"Установите временный пароль для защиты вашего аккаунта. После подтверждения заявки он станет активным.",
		{ content: interaction.user.toString() }
	);
	await sendQuestion(verifyChannel, userVerify);
}

/**
 * @param {Interaction | Message} interaction
 */
async function sendForConfirmation(interaction) {
	const userVerify = getVerify(interaction.user.id);

	/** @type {GuildTextBasedChannel} */
	const verifyChannel = await interaction.guild.channels.fetch(
		userVerify.channelId
	);

	await verifyChannel.edit({ name: `🟢${userVerify.nickname}` });
	await verifyChannel.permissionOverwrites.edit(roles.inspector, {
		ViewChannel: true,
		SendMessages: true,
	});

	/** @type {GuildTextBasedChannel} */
	const answerChannel = await interaction.guild.channels.fetch(
		channels.answers
	);

	const alertMessage = await answerChannel.send({
		content: `<@&${roles.inspector}>`,
		embeds: [
			new EmbedBuilder({
				color: Colors.Regular,
				title: "Новый игрок на подтверждение",
				description:
					"Новый игрок запрашивает подтверждение, пройдите в канал для беседы с ним!",
				fields: [
					{
						name: "Канал",
						value: `<#${userVerify.channelId}>`,
					},
					{
						name: "Пользователь",
						value: `<@${interaction.user.id}>`,
						inline: true,
					},
					{
						name: "Ник в Minecraft",
						value: `\`${userVerify.nickname}\``,
						inline: true,
					},
					{
						name: "Дата регистрации аккаунта",
						value: `<t:${Math.floor(
							interaction.user.createdAt / 1000
						)}>`,
					},
					{
						name: "Дата входа на сервер",
						value: `<t:${Math.floor(
							interaction.member.joinedAt / 1000
						)}>`,
					},
				],
				footer: {
					text: "⚠ По окончании беседы введите /approve или /reject чтобы принять или отклонить пользователя!!!",
				},
			}),
		],
		files: [
			{
				name: "answers.txt",
				attachment: Buffer.from(
					getAnswers(interaction.user.id)
						.map(qa => `Вопрос: ${qa.q}\nОтвет: ${qa.a}\n\n`)
						.join("")
				),
			},
		],
		components: [
			new ActionRowBuilder({
				components: [
					new ButtonBuilder({
						customId: "reject" + interaction.user.id,
						label: "Отклонить сразу",
						style: ButtonStyle.Danger,
						emoji: "✖",
					}),
				],
			}),
		],
	});

	updateVerify(interaction.user.id, "messageId", alertMessage.id);
	updateVerify(interaction.user.id, "state", States.OnConfirmation);

	await success(
		interaction.channel,
		"Поздравляю, вы прошли систему анкетирования!",
		"Теперь дождитесь ответа ответственного сотрудника для подтверждения! И да, ваша анкета не будет закрыта до тех пор, пока вас не подтвердят :)"
	);
}

module.exports = {
	checkForChannel,
	sendQuestion,
	startConversation,
	askForPassword,
	sendForConfirmation,
	endConversation
};
