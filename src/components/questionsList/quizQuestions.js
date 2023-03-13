/**
 * @typedef {Object} quizQuestions
 * @property {String} message
 * @property {String[]} answers
 * @property {String[]} correct
 */

/** @type {quizQuestions[]} */
const questions = [
	{
		message: "Вы увидели нарушителя правил который нарушает правила при вас, ваши действия?",
		answers: [
			"Пройти мимо", //0
			"Обезвредить нарушителя", //1 +
			"Сообщить модератору или администратору" //2 +
		],
		correct: [1,2]
	},
	{
		message: "Вы увидели человека, который издает неприятные звуки в голосовой чат, ваши действия?",
		answers: [
			"Пройти мимо", //0
			"Заглушить его", //1 +
			"Сообщить модератору или администратору" //2 +
		],
		correct: [1,2]
	},
	{
		message: "Вы увидели валяющийся ресурсы, ваши действия?",
		answers: [
			"Подобрать, ожидать владельца ресурсов", //0 +
			"Сообщить модератору или администратору", //1
			"Игнорировать" //2 +
		],
		correct: [0,2]
	},
	{
		message: "Вы увидели брошенную территорию, ваши действия?",
		answers: [
			"Присвоить территорию себе, и забрать ресурсы", //0
			"Обговорить присвоение территорий себе с владельцем терры", //1 +
			"Сообщить модератору или администратору" //2 +
		],
		correct: [1,2]
	},
	{
		message: "Когда вы гуляли по cпавну, сзади вас взорвался крипер, ваши действия?",
		answers: [
			"Забыть об этом", //0
			"Вернуться на место взрыва, и застроить за собой блоки", //1 +
			"Сообщить модератору или администратору" //2
		],
		correct: [1]
	},
	{
		message: "Вы увидели чужой регион, но вы очень голодны, вы cможете взять морковку и снова посадить ее назад?",
		answers: [
			"Конечно! Морковь возобновляемый ресурс", //0
			"Нет, Это считается гриферством", //1 +
			"Возьму 1-6 морковки, потом подожду когда вырастет она снова" //2 +
		],
		correct: [1,2]
	},
	{
		message: "Вы увидели брошенный сундук, ваши действия?",
		answers: [
			"Пройти мимо", //0 +
			"Возьму немного обычных ресурсов", //1
			"Оповещу игроков, что нашел брошенный сундук" //2 +
		],
		correct: [0,2]
	},
	{
		message: "Вы нечаянно убили игрока, ваши действия?",
		answers: [
			"Извинюсь, и отдам ресурсы", //0 +
			"Сообщу модератору/администратору об убийстве ", //1 +
			"Пройду мимо, и оставлю ресурсы лежать на земле" //2
		],
		correct: [0,1]
	},
	{
		message: "Вы увидели игрока без голосового чата, ваши действия?",
		answers: [
			"Пройти мимо", //0 +
			"Сообщу модератору/администратору об этом", //1 +
			"Сказать игроку чтобы скачал мод на голосовой чат" //2 +
		],
		correct: [0,1,2]
	},
	{
		message: "Вы увидели запрещенную анимацию, ваши действия?",
		answers: [
			"Пройти мимо", //0
			"Сообщу модератору/администратору об этом", //1 +
			"Сказать Игроку чтобы немедленно убрал эту анимацию" //2 +
		],
		correct: [1,2]
	},
	{
		message: "Вы увидели/услышали оскорбление в сторону игрока, ваши действия?",
		answers: [
			"Игнорировать", //0
			"Сообщу модератору/администратору об этом" //1 +
		],
		correct: [1]
	},
	{
		message: "Вы ознакомились с правилами сервера?",
		answers: [
			"Да, я ознакомился с правилами сервера", //0 +
			"Нет, я не ознакомился о правилах сервера", //1
			"..." //2
		],
		correct: [0]
	}
]

module.exports = questions;