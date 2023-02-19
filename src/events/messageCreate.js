const { Events } = require("discord.js");
const { getVerify, addAnswer } = require("../components/DataManager");
const { critical, regular } = require("../components/Messages");
const { endConversation, sendForConfirmation } = require("../components/QuestionsManager");
const { textQuestions } = require("../components/QuestionsList");
const { roles } = require("../../config");


module.exports = {
	event: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot) return;
	
		const verify = getVerify(message.author.id);
		if (!verify || verify.onConfirmation || verify.channel != message.channel.id) return;
		
		if (message.member.roles.cache.has(roles.approved)) return endConversation(message.guild, message.author);
	
		const currentQuestion = textQuestions[verify.question];
	
		try {
			const answer = await currentQuestion.answer(message);

			if (!answer) {
				verify.onSameQuestion++;
				return; //TODO
			};
	
			addAnswer(message.author.id, currentQuestion.message, message.content);
			
			if (verify.question >= textQuestions.length-1) {
				await sendForConfirmation(message);
				return;
			}
	
			verify.question++;
			verify.onSameQuestion = 0;
	
			const newQuestion = textQuestions[verify.question];
			regular(message, verify.question == textQuestions.length-1 ? "Последний вопрос" : "Вопрос "+(verify.question+1), newQuestion.message, {image: newQuestion.image});
		} catch (e) {
			console.error(e);
			critical(message, "Ой! Ошибка!", `Код: \`${e.message}\``);
		}

		if (verify.shouldEnd) return endConversation(message.guild, message.author);
	}
}