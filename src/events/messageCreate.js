const { Events } = require("discord.js");
const { getVerify, addAnswer, updateVerify } = require("../components/dataManager");
const { critical, regular } = require("../components/messages");
const { endConversation, sendForConfirmation, sendQuestion } = require("../components/questionsManager");
const { textQuestions } = require("../components/questionsList");
const { roles } = require("../config");
const { States } = require("../components/enums");


module.exports = {
	event: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot) return;
	
		const verify = getVerify(message.author.id);
		if (!verify || (verify.state !== States.OnText) && (verify.state !== States.OnPassword) || verify.channelId !== message.channel.id) return;

		const currentQuestion = textQuestions[verify.question];
		
		try {
			const answer = await currentQuestion.answer(message);
	
			if (!answer) return;

			addAnswer(message.author.id, currentQuestion.message, message.content);
			
			if (verify.question >= textQuestions.length-1) {
				await sendForConfirmation(message);
				return;
			}
	
			updateVerify(message.author.id, "question", ++verify.question);
	
			sendQuestion(message, verify.question);
		} catch (e) {
			console.error(e);
			critical(message, "Ой! Ошибка!", `Код: \`${e.message}\``);
		}

		if (verify.state === States.ShouldEnd) return endConversation(message.guild, message.author);
	}
}