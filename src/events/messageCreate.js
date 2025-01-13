const { Events, Message } = require("discord.js");
const { getVerify, addAnswer, updateVerify, findVerify } = require("../components/dataManager");
const { critical, warning } = require("../components/messages");
const { sendQuestion, askForPassword, sendForConfirmation } = require("../components/conversationManager");
const { States } = require("../components/constants");
const questions = require("../components/questions");


module.exports = {
	event: Events.MessageCreate,
	/**
	 * @param {Message} message
	 */
	async execute(message) {
		if (message.author.bot)
			return;
	
		const verify = getVerify(message.author.id);
		if (!verify || verify.state !== States.OnAnswers || verify.channelId !== message.channel.id)
			return;

		const question = questions[verify.question];
		

		if (message.content.length === 0)
			return warning(message, "Ответ не может быть пустым!");

		if (message.content.length > 1000)
			return warning(message, "Ответ не может быть длиннее 1000 символов!");

		let result = true;

		try {
			if (question.answer)
				result = await question.answer(message.channel, message.member, message.content);
		} catch (e) {
			console.error(e);
			critical(message.channel, "Ошибка обработки ответа!", `Информация: \`${e.message}\``);
			return;
		}

		addAnswer(message.author.id, question.message, (result ? "" : "[❌] ") + message.content);

		if (!result)
			return;

		if (verify.question >= questions.length - 1)
			return !settings.serverless ? await askForPassword(interaction) : await sendForConfirmation(interaction);

		updateVerify(message.author.id, "question", ++verify.question);
		await sendQuestion(message.channel, verify);
	}
}