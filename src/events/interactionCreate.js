const { Events, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { hasAccess } = require("../components/checkManager");
const { findVerify, updateVerify, createUser, getVerify, getUser, addAnswer } = require("../components/dataManager");
const { States, RegExps } = require("../components/constants");
const { success, critical, warning } = require("../components/messages");
const { startConversation, endConversation, sendQuestion, askForPassword, sendForConfirmation } = require("../components/conversationManager");
const { addToWhitelist, register } = require("../components/rconManager");
const { roles, settings } = require("../config");
const { logInspection } = require("../components/loggingManager");
const questions = require("../components/questions");
const { generatePassword } = require("../components/actionManager");


module.exports = {
	event: Events.InteractionCreate,
	/**
	 * 
	 * @param {import("discord.js").Interaction} interaction 
	 * @returns 
	 */
	async execute(interaction) {
		if (interaction.isButton()) {
			if (interaction.customId.startsWith("reject") || interaction.customId.startsWith("approve")) {
				if (!hasAccess(interaction.member, "inspector")) return interaction.reply({
					ephemeral: true,
					embeds: [
						warning(null, "Ошибка доступа!", "Данные кнопки только для проверяющих!", {embed: true})
					]
				});

				try {
					const userId = interaction.customId.match(RegExps.Number)?.[0];
					const verify = getVerify(userId);
					const member = await interaction.guild.members.fetch(userId);
		
					if (getUser(userId)) return endConversation(interaction.guild, member.user);
		
					if (interaction.customId.startsWith("reject")) {
						const modal = new ModalBuilder({
							title: "Причина отклонения заявки",
							customId: "rejectReason"+userId
						});
			
						const reason = new TextInputBuilder({
							customId: "reason",
							label: "Введите причину",
							style: TextInputStyle.Short,
							minLength: 8,
							maxLength: 40
						})
			
						modal.addComponents(new ActionRowBuilder().addComponents(reason));
						
						await interaction.showModal(modal);
						return;
					}

					if (verify.state !== States.OnConfirmation) return interaction.reply({
						ephemeral: true,
						embeds: [
							critical(null, "Слишком рано", "Человек ещё не прошел процедуру верификации!", {embed: true})
						]
					});

					await interaction.deferUpdate();

					success(member, "Ваша заявка принята, добро пожаловать!")
						.catch(() => null);
		
					if (!settings.serverless) {
						const wlRes = await addToWhitelist(verify.nickname);
						const regRes = await register(verify.nickname, verify.tempPassword);

						if (!wlRes.status || !regRes.status)
							throw new Error(wlRes.message || regRes.message);
					}
					
					createUser(userId, verify.nickname, member.joinedTimestamp, [], interaction.user.id, interaction.createdTimestamp, verify.answers);
					
					await member.roles.add(roles.approved);
					await logInspection(interaction, verify);

					await endConversation(interaction.guild, member.user);
				} catch (e) {
					interaction[interaction.deferred ? "followUp" : "reply"]({
						ephemeral: true,
						embeds: [
							critical(null, "Ошибка взаимодействия!", `Сообщение: \`${e.message}\``, {embed: true})
						]
					})
				}
			}

			if (interaction.customId.startsWith("start")) {
				const { guild, user } = interaction;

				await interaction.deferReply({ ephemeral: true });

				if (getUser(user.id)) return interaction.editReply({
					embeds: [
						warning(null, "Анкета уже пройдена", "Вы уже прошли процедуру подтверждения!", {embed: true})
					]
				});

				const verify = getVerify(user.id);
				if (verify) return interaction.editReply({
					embeds: [
						warning(null, "Анкета уже открыта", `Канал с анкетой уже существует!\nКанал: <#${verify.channelId}>`, {embed: true})
					]
				});

				const channel = await startConversation(guild, user);

				return interaction.editReply({
					embeds: [
						success(null, "Анкета открыта", `Для вас был создан канал с анкетой!\nКанал: <#${channel.id}>`, {embed: true})
					]
				});
			}

			if (interaction.customId.startsWith("answer")) {
				let verify = findVerify("channelId", interaction.channel.id);
				if (!verify || verify.state !== States.OnAnswers || verify.channelId !== interaction.channel.id)
					return;

				if (verify.userId !== interaction.user.id) return interaction.reply({
					ephemeral: true,
					embeds: [
						warning(null, "Ошибка доступа!", "Данные кнопки доступны только проходящим тест пользователям!", {embed: true})
					]
				});

				try {
					await interaction.deferUpdate();

					const questionOrder = verify.questionOrder.split(",");
					const question = questions[questionOrder[verify.question]];

					if (question.type !== "quiz")
						return;

					const quizAnswer = interaction.customId.match(RegExps.Number)?.[0];
					const answerOrder = verify.answerOrder?.split(",") ?? [0, 1, 2, 3, 4, 5];
					const answer = answerOrder[quizAnswer];
					
					const { components } = interaction.message;
					const component = components[0].components.find(c => c.customId === interaction.customId);

					let result = !question.correct || question.correct.includes(Number(answer));

					if (question.answer)
						result = await question.answer(interaction.channel, interaction.member, answer);
					
					verify = getVerify(verify.userId)

					if (!verify || verify.state === States.ShouldEnd)
						return await endConversation(interaction.guild, interaction.user);

					const answerEntry = question.answers[Number(answer)];
					addAnswer(interaction.user.id, question.message, (result ? "" : "[❌] ") + (typeof answerEntry === "string" ? answerEntry : answerEntry.text));
	
					if (!result) {
						if (component.data.style === ButtonStyle.Primary)
							component.data.style = ButtonStyle.Danger;

						component.data.disabled = true;
	
						await interaction.editReply({ components });
	
						updateVerify(interaction.user.id, "wrongCount", ++verify.wrongCount);
	
						if (verify.wrongCount === 12) {
							await critical(
								interaction.user,
								"Вы заблокированы!",
								"Вы неправильно ответили слишком много раз!",
								{ thumbnail: settings.logoUrl }
							)
								.catch(() => null);
			
							await interaction.member.ban({reason: `Слишком много неправильных ответов`});
						}
						
						if (verify.wrongCount % 5 === 0) {
							updateVerify(interaction.user.id, "mutedUntil", Date.now() + 5 * 60e3);
	
							await interaction.member.timeout(5 * 60e3, "Правила не читал ¯\\_(ツ)_/¯");

							const mutedMessage = await critical(
								interaction.channel,
								"Эй!",
								"Дорогой Друг,ознакомься с правилами! Можешь повторить попытку через 5 минут :)",
								{ thumbnail: settings.logoUrl }
							);
							updateVerify(interaction.user.id, "mutedMessageId", mutedMessage.id);
						}
	
						return;
					}
				} catch (e) {
					console.error(e);
					critical(interaction.channel, "Ошибка обработки ответа!", `Информация: \`${e.message}\``);
					return;
				}

				if (component.data.style === ButtonStyle.Primary)
					component.data.style = ButtonStyle.Success;

				for (const component of components[0].components)
					component.data.disabled = true;

				await interaction.editReply({ components });

				if (verify.question >= questions.length - 1)
					return !settings.serverless ? await askForPassword(interaction) : await sendForConfirmation(interaction);

				updateVerify(interaction.user.id, "question", ++verify.question);
				await sendQuestion(interaction.channel, verify);
			}
		}
		
		if (interaction.customId === "generatePassword" || interaction.customId === "requestPassword") {
			const verify = findVerify("channelId", interaction.channel.id);
			if (!verify) return;

			if (verify.userId !== interaction.user.id) return interaction.reply({
				ephemeral: true,
				embeds: [
					warning(null, "Ошибка доступа!", "Устанавливать пароль только может пользователь проходящий анкету!", {embed: true})
				]
			});

			if (interaction.customId === "requestPassword") {
				const modal = new ModalBuilder({
					title: "Запрос пароля",
					customId: "passwordModal"
				});
	
				const password = new TextInputBuilder({
					customId: "password",
					label: "Введите пароль для сервера",
					style: TextInputStyle.Short,
					minLength: 10,
					maxLength: 30
				})
	
				modal.addComponents(new ActionRowBuilder().addComponents(password));
				
				await interaction.showModal(modal);
			} else {
				await interaction.deferUpdate();

				const { components } = interaction.message;
				for (const component of components[0].components)
					component.data.disabled = true;

				await interaction.editReply({ components });

				const password = generatePassword(verify.nickname);

				updateVerify(interaction.user.id, "tempPassword", password);

				await sendForConfirmation(interaction);

				await interaction.followUp({
					ephemeral: true,
					embeds: [
						warning(null, "Пароль cгенерирован!", `Это сообщение видите только вы. Это ваш пароль для доступа к серверу Chunky. Скачайте этот .txt файл и сохраните его, чтобы не потерять. Никогда не сообщайте свой пароль никому, включая администрацию проекта, поскольку ваш аккаунт — это ваша ответственность.\nВаш пароль: \`\`\`\n${password}\n\`\`\``, { embed: true })
					],
					files: [{
						name: "passwordChunky.txt",
						attachment: Buffer.from(`Пароль: ${password}\nНик: ${verify.nickname}`)
					}]
				})
			}
		}


		if (interaction.isModalSubmit()) {
			if (interaction.customId === "passwordModal") {
				const verify = findVerify("channelId", interaction.channel.id);
				if (!verify) return;

				const password = interaction.fields.getTextInputValue("password");
				
				if (!RegExps.Password.test(password)) return interaction.reply({
					ephemeral: true,
					embeds: [
						warning(null, "Недопустимые символы!", "Пароль содержит символы, которые не могут быть использованы в пароле! Попробуйте ещё раз!", {embed: true})
					]
				})

				await interaction.deferUpdate();

				const { components } = interaction.message;
				for (const component of components[0].components)
					component.data.disabled = true;

				const component = components[0].components.find(c => c.customId === "requestPassword");
				if (component) {
					component.data.disabled = true;
					component.data.style = ButtonStyle.Success;
					component.data.label = "Пароль принят!";
				}

				await interaction.editReply({ components });

				updateVerify(interaction.user.id, "tempPassword", password);

				await sendForConfirmation(interaction);
			}

			if (interaction.customId.startsWith("rejectReason")) {
				const userId = interaction.customId.match(RegExps.Number)?.[0];
				const verify = getVerify(userId);
				const member = await interaction.guild.members.fetch(userId);
				const reason = interaction.fields.getTextInputValue("reason");

				await interaction.deferUpdate();
				
				await critical(
					member,
					"К сожалению, ваша заявка была отклонена!",
					`Жизнь порой преподносит разочарования, и причины могут быть разные. Если вы считаете, что вашу анкету отклонили ошибочно, пожалуйста, сообщите об этом \`vadxc\`. Мы всегда открыты для обратной связи и готовы рассмотреть вашу ситуацию.\nПричина: \`${reason}\`\nПроверяющий: \`${interaction.user.tag}\``,
					{ thumbnail: settings.logoUrl }
				)
					.catch(() => null);
					
				await member.ban({reason: `Заблокирован ${interaction.user.tag} через систему подачи заявок (${reason})`});
				
				await logInspection(interaction, verify);

				await endConversation(interaction.guild, member.user);
			}
		}

	
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) return;
			
			if (!hasAccess(interaction.member, command.access)) return interaction.reply({
				ephemeral: true,
				embeds: [
					warning(null, "Нет доступа к команде!", "Данная команда недоступна для вас!", {embed: true})
				]
			})
			
			await interaction.deferReply({ ephemeral: !command.notEphemeral });
	
			try {
				await command.execute(interaction);
			} catch (e) {
				console.error(e);
				interaction.editReply({
					embeds: [
						critical(null, "Ошибка команды!", `Код: \`${e.message}\``, {embed: true})
					]
				})
			}
		}
	}
}