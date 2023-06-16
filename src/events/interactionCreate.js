const { Events, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { hasAccess } = require("../components/checkManager");
const { findVerify, updateVerify, createUser, getVerify } = require("../components/dataManager");
const { States, RegExps } = require("../components/constants");
const { critical, warning } = require("../components/messages");
const { quizQuestions } = require("../components/questionsList");
const { endConversation, sendQuestion, askForPassword, sendForConfirmation } = require("../components/questionsManager");
const { addToWhitelist, register } = require("../components/rconManager");
const { roles } = require("../config");
const { settings } = require("../config/config.prod");


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
				})

				await interaction.deferUpdate();

				try {
					const userId = interaction.customId.match(RegExps.Number)?.[0];
					const verify = getVerify(userId);
					const member = await interaction.guild.members.fetch(userId);
		
					if (member.roles.cache.has(roles.approved)) return interaction.followUp({
						ephemeral: true,
						embeds: [
							critical(null, "Вердикт уже вынесен", "Данный человек уже был верифицирован!", {embed: true})
						]
					})
		
					if (interaction.customId.startsWith("reject")) {
						try {
							const DMChannel = await member.user.createDM();
							if (DMChannel) await critical(DMChannel, "К сожалению, ваша заявка была отклонена, всего вам хорошего!", `Модератор: \`${interaction.user.tag}\``);
						} catch (e) {}
							
						await member.ban({reason: `Заблокирован ${interaction.user.tag} через систему подачи заявок!`});
					}
					
					if (interaction.customId.startsWith("approve")) {
						if (verify.state !== States.OnConfirmation) return interaction.followUp({
							ephemeral: true,
							embeds: [
								critical(null, "Слишком рано", "Человек ещё не прошел процедуру верификации!", {embed: true})
							]
						})

						try {
							const DMChannel = await member.user.createDM();
							if (DMChannel) await success(DMChannel, "Ваша заявка принята, добро пожаловать!");
						} catch (e) {}
			
						createUser(userId, verify.nickname, verify.answers);

						if (!settings.serverless) {
							const wlRes = await addToWhitelist(verify.nickname);
							const regRes = await register(verify.nickname, verify.tempPassword);
	
							if (!wlRes.status || !regRes.status) throw new Error(wlRes.message || regRes.message);
						}

						await member.roles.add(roles.approved);
					}

					endConversation(interaction.guild, member.user);
				} catch (e) {
					//console.error(e);
					interaction.followUp({
						ephemeral: true,
						embeds: [
							critical(null, "Ошибка взаимодействия!", `Сообщение: \`${e.message}\``, {embed: true})
						]
					})
				}
			}

			if (interaction.customId.startsWith("answer")) {
				const verify = findVerify("channelId", interaction.channel.id);
				if (!verify) return;

				if (verify.userId !== interaction.user.id) return interaction.reply({
					ephemeral: true,
					embeds: [
						warning(null, "Ошибка доступа!", "Данные кнопки доступны только проходящим тест пользователям!", {embed: true})
					]
				});

				await interaction.deferUpdate();

				try {
					const quizAnswer = interaction.customId.match(RegExps.Number)?.[0];
					
					const quizOrder = verify.quizOrder.split(",");
					const answerOrder = verify.quizAnswerOrder.split(",");
					
					const question = quizQuestions[quizOrder[verify.question]];
					const answer = answerOrder[quizAnswer];
					const { components } = interaction.message;
					const component = components[0].components.find(c => c.customId === interaction.customId);

					if (!question.correct.includes(parseInt(answer))) {
						component.data.style = ButtonStyle.Danger;
						component.data.disabled = true;

						await interaction.editReply({ components });
						
						if (++verify.wrongCount >= 3) {
							updateVerify(interaction.user.id, "wrongCount", 0);
							updateVerify(interaction.user.id, "mutedUntil", Date.now() + 5 * 60e3);

							await critical(interaction.channel, "Эй!", "Дорогой Друг,ознакомься с правилами! Можешь повторить попытку через 5 минут :)");
							await interaction.member.timeout(5 * 60e3, "Правила не читал ¯\\_(ツ)_/¯");

							return;
						}

						updateVerify(interaction.user.id, "wrongCount", verify.wrongCount);

						return;
					}

					component.data.style = ButtonStyle.Success;

					for (const component of components[0].components) component.data.disabled = true;
					await interaction.editReply({ components });
					
					
					if (verify.question >= quizQuestions.length-1) {
						await askForPassword(interaction);
						return;
					}


					updateVerify(interaction.user.id, "question", ++verify.question);
			
					sendQuestion(interaction.channel, verify);

				} catch (e) {
					console.error(e);
					interaction.followUp({
						ephemeral: true,
						embeds: [
							critical(null, "Ошибка обработки ответа!", `Информация: \`${e.message}\``, {embed: true})
						]
					})
				}
			}
		}
		
		if (interaction.customId === "requestPassword") {
			const verify = findVerify("channelId", interaction.channel.id);
			if (!verify) return;

			if (verify.userId !== interaction.user.id) return interaction.reply({
				ephemeral: true,
				embeds: [
					warning(null, "Ошибка доступа!", "Вводить пароль только может пользователь проходящий анкету!", {embed: true})
				]
			});

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
				const component = components[0].components.find(c => c.customId === "requestPassword");
				if (component) {
					component.data.disabled = true;
					component.data.style = ButtonStyle.Success;
					component.data.label = "Пароль принят!";
					await interaction.editReply({ components });
				}

				updateVerify(interaction.user.id, "tempPassword", password);

				await sendForConfirmation(interaction);
			}
		}

	
		if (interaction.isCommand()) {
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