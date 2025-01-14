const { BaseGuildTextChannel, GuildMember, ButtonStyle } = require("discord.js");
const { settings, roles } = require("../config");
const { updateVerify, findVerify, getUserByName } = require("./dataManager");
const { RegExps, States } = require("./constants");
const { warning, critical } = require("./messages");
const { getWhitelist } = require("./rconManager");

/**
 * @callback AnswerCallback
 * @param {BaseGuildTextChannel} channel
 * @param {GuildMember} member
 * @param {String} answer
 * @returns {Promise<boolean>}
 */

/**
 * @typedef {Object} BaseQuestion
 * @property {String} message
 * @property {"shuffle_start"|"shuffle_end"} [action]
 * @property {String} [image]
 * @property {AnswerCallback} [answer] Optional
 */

/**
 * @typedef {Object} TextQuestion
 * @property {"text"} type
 */

/**
 * @typedef {Object} AdvancedQuizAnswer
 * @property {String} text
 * @property {ButtonStyle} [style]
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {"quiz"} type
 * @property {(AdvancedQuizAnswer | String)[]} answers List of answers
 * @property {Number[]} [correct] Indexes of correct answers from 0
 */

/** @type {(BaseQuestion & (TextQuestion | QuizQuestion))[]} */
const questions = [
	{
		type: "quiz",
		message: "Пожалуйста, внимательно читайте все инструкции и не торопитесь с ответами. Важно, чтобы вы отвечали серьезно. Обратите внимание, что вопросы будут касаться правил сервера, поэтому подготовьтесь к ним. В конце заполнения анкеты проверяющий отправит вам актуальную версию игры и IP адрес сервера, обычно рассмотрение анкеты занимает от 5 до 20 минут. Не стоит пинговать проверяющего, это только затянет процесс верификации.",
		answers: [{
			text: "Готов заполнить анкету и отвечать честно.",
			style: ButtonStyle.Success
		}]
	},
	{
		type: "text",
		message: "Ваш игровой никнейм в майнкрафт?",
		answer: async (channel, member, answer) => {
			const matches = RegExps.MinecraftNameString.test(answer);
			if (!matches) {
				await warning(channel, "Неверный формат!", "Ваш ник не соответствует формату, убедитесь, что вы ввели его правильно!");
				return false;
			}

			const nicknameExists = !!(
				getUserByName(answer) ||
				findVerify("nickname",answer) ||
				!settings.serverless && !settings.replaceWhitelist && (await getWhitelist()).includes(answer)
			);

			if (nicknameExists) {
				await warning(channel, "Ник занят!", "Человек с подобным никнеймом уже был зарегистрирован на сервере ранее! Если этот ник принадлежит вам, то не переживайте и откройте тикет.");
				return false;
			}

			updateVerify(member.id, "nickname", answer);
			await channel.edit({name: answer});

			try {
				await member.setNickname(answer);
			} catch (e) {
				await warning(channel, "Не смог сменить вам имя!", `Пожалуйста, самостоятельно измените ваш ник в Discord на ник в игре!\n\`${e.message}\``);
			}

			return true;
		},
	},
	{
		type: "quiz",
		message: "Cколько вам лет?",
		answers: [
			{
				text: "8+",
				style: ButtonStyle.Danger,
			},
			{
				text: "13+",
				style: ButtonStyle.Success,
			},
			"18+"
		],
		answer: async (channel, member, answer) => {
			if (Number(answer) === 0) {
				updateVerify(member.id, "state", States.ShouldEnd);

				await critical(
					member.user,
					"Вы ешё слишком молоды, чтобы играть на сервере!",
					"Напишите Olejka#4300 для оспаривания блокировки.",
					{ thumbnail: settings.logoUrl }
				)
					.catch(() => null);
	
				await member.ban({reason: `Слишком молодой`});
				
				return false;
			}

			return true;
		},
	},
	{
		type: "quiz",
		message: "Ваш пол?",
		answers: [
			"♂️ Мужской",
			"♀️ Женский",
			{
				text: "⚧️ Другой",
				style: ButtonStyle.Secondary
			}
		],
		answer: async (channel, member, answer) => {
			if (Number(answer) === 1) {
				await warning(
					channel,
					"Потребуется подтверждение",
					"Во избежании социальной манипуляции, проверяющий или администрация может потребовать подтверждение вашего пола через доп вопросы",
					{ thumbnail: settings.logoUrl }
				);

				try {
					await member.roles.add(roles.woman)
				} catch (e) {
					await warning(channel, "Не смог выдать вам роль!", `Пожалуйста попросите администратора выдать вам отдельную роль!\n\`${e.message}\``);
				}
			}

			return true;
		},
	},
	{
		type: "quiz",
		message: "В какой стране вы находитесь?",
		answers: [
			"🇷🇺 Россия",
			"🇺🇦 Украина",
			{
				text: "🇩🇪 Другая Страна",
				style: ButtonStyle.Secondary
			}
		],
	},
	{
		type: "text",
		message: "Сколько вы играете в майнкрафт?",
	},
	{
		type: "quiz",
		message: "У вас установлен мод на голосовой чат PlasmoVoice?",
		answers: [
			{
				text: "Да",
				style: ButtonStyle.Success
			},
			"Нет"
		],
		answer: async (channel, member, answer) => {
			if (Number(answer) !== 0) {
				await warning(
					channel,
					"Обязательно скачай мод!",
					"[Скачать для Fabric (Modrinth)](https://modrinth.com/plugin/plasmo-voice/versions?g=1.21.4&g=1.21.3&g=1.21.1&g=1.21&g=1.21.2&l=fabric) \n[Скачать для Forge (Modrinth)](https://modrinth.com/plugin/plasmo-voice/versions?g=1.21.4&g=1.21.3&g=1.21.1&g=1.21&g=1.21.2&l=forge)",
					{ thumbnail: settings.logoUrl }
				);
			}

			return true;
		},
	},
	{
		type: "text",
		message: "На каких типах серверов вы играли в майнкрафт?",
	},
	{
		type: "quiz",
		message: "К какому типу игроков вы себя больше всего отнесете?",
		answers: [
			"Билдер",
			"Выживальщик",
			"Фермер",
			"Редстоунер",
			"Пвепшник",
		]
	},
	{
		type: "quiz",
		message: "Почему вы выбрали именно этот сервер?",
		answers: [
			"Не знаю, тут что-то цепляет, фишки прикольные",
			"Тут мои друзья, не могу без них",
			"Чисто по фану",
		]
	},
	{
		type: "quiz",
		message: "Откуда узнали о нашем сервере?",
		answers: [
			"Просто наткнулся в соцсетях",
			"Друзья порекомендовали — не мог не зайти",
			"Нашел сам",
		]
	},
	{
		type: "text",
		message: "Расскажите, немного о себе.",
	},
	{
		type: "quiz",
		message: "Чем вы будете заниматься на сервере?",
		answers: [
			"По классике: выживать, строить, фармить, может ивенты делать",
			"Рпешить и тусить, помогать игрокам и чиллить",
			"A.. своими делами..",
		]
	},
	{
		type: "quiz",
		message: "Будете ли вы принимать участие в жизни сервера?",
		answers: ["Да", "Не знаю, как пойдет - так и будет"]
	},
	{
		type: "quiz",
		message: "Вы ознакомились с правилами сервера?",
		answers: [
			{
				text: "Да",
				style: ButtonStyle.Success
			},
			{
				text: "Нет",
				style: ButtonStyle.Danger
			}
		],
		answer: async (channel, member, answer) => {
			if (Number(answer) !== 0) {
				await warning(
					channel,
					"Нужно согласиться с правилами!",
					"Потому что с ними не дружить не получится.",
					{ thumbnail: settings.logoUrl }
				);
				return false;
			}

			return true;
		},
	},
	{
		type: "quiz",
		message: "У вас есть друзья, которые играют на этом сервере?",
		answers: ["Да", "Нет", "Нет, но надеюсь я их найду.."]
	},
	{
		type: "quiz",
		message: "Какое ваше отношение к использованию читов и багов?",
		answers: [
			"Очень плохое",
			"Ну, если что-то вроде дюпалок, ковров, рельс — по правилам, то ок",
			"Нормальное",
		],
		correct: [0, 1]
	},
	{
		type: "quiz",
		message: "Есть ли у вас опыт игры на сервере с РП элементами?",
		answers: ["Да", "Нет"]
	},
	{
		type: "text",
		message: "Как часто вы планируете играть на сервере?",
	},
	{
		type: "quiz",
		action: "shuffle_start",
		message:
			"Вы проходите мимо заброшенного дома, который без таблички привата, и в нем находятся ресурсы. Какие ваши действия?",
		answers: [
			"Пройти мимо, так как это не мой дом, а кого-то игрока.",
			"Осмотреть дом и забрать незначительные ресурсы.",
			"Присвоить дом себе и установить табличку с приватом.",
		],
		correct: [0, 1],
	},
	{
		type: "quiz",
		message:
			"Вы путешествовали по миру и обнаружили рассыпанные ресурсы на земле. Какие ваши действия?",
		answers: [
			"Положу ресурсы в сундук и попытаться найти владельца.",
			"Забрать все ресурсы себе, так как они не принадлежат никому.",
			"Пройти мимо и притвориться, что не заметил ресурсы.",
		],
		correct: [0, 2],
	},
	{
		type: "quiz",
		message: "Вы увидели загриференную территорию. Какие ваши действия?",
		answers: [
			"Я воспользуюсь ситуацией и заберу ресурсы с разрушенной территории.",
			"Я сообщу об этом администрации, чтобы они приняли меры.",
			"Я игнорирую это, так как это не касается меня.",
		],
		correct: [1, 2],
	},
	{
		type: "quiz",
		message:
			"Вас ударил игрок на спавне специально без причины. Какие ваши действия?",
		answers: [
			"Я сообщу об этом администрации, так как это нарушение правил сервера.",
			"Я просто проигнорирую это и продолжу играть.",
			"Я ударю его в ответ, чтобы он понял, что так поступать нельзя.",
		],
		correct: [0, 2],
	},
	{
		type: "quiz",
		message:
			"Вы упали из-за пинга в бездну в Энд-мире, и у вас нет фрагмента записи вашего падения. Должна ли администрация провести возврат ресурсов?",
		answers: [
			"Я не знаю, что делать, это не моя вина, но у меня нет доказательств.",
			"Да, администрация должна вернуть ресурсы, это не мои проблемы.",
			"Нет, я сам должен справляться с такими ситуациями, это часть игры.",
		],
		correct: [0, 2],
	},
	{
		type: "quiz",
		message:
			"Вы заметили, что кто-то торгует чем-то за реальную или цифровую валюту. Какие ваши действия?",
		answers: [
			"Я сразу сообщу об этом администрации, так как это нарушение правил сервера.",
			"Я игнорирую это, так как это не касается меня напрямую.",
			"Я воспользуюсь этой возможностью и тоже начну такие сделки, если это выгодно.",
		],
		correct: [0],
	},
	{
		type: "quiz",
		message:
			"Вы услышали, как друзья или игроки зовут на другие сервера (Minecraft/Discord). Какие ваши действия?",
		answers: [
			"Я сообщу администрации о нарушении правил сервера.",
			"Я остаюсь на текущем сервере, потому что мне нравится здесь.",
			"Я проигнорирую приглашение и продолжу играть на своем текущем сервере.",
		]
	},
	{
		type: "quiz",
		message:
			"Вы будете честны с другими игроками и администрацией, и избегать введения в заблуждение?",
		answers: [
			"Да, я всегда честен и следую правилам, но если ошибусь, готов исправиться.",
			"Я буду использовать это только в ивентах, не нарушая правила.",
			"Нет, иногда я могу ввести в заблуждение ради своей выгоды.",
		],
		correct: [0, 1]
	},
	{
		type: "quiz",
		message:
			"Игрок на сервере попросил зайти на его аккаунт и достроить ферму, пока он уходит в школу. Поможете ли вы ему?",
		answers: [
			"Нет, я никогда не войду в чужой аккаунт, даже если это просьба друга.",
			"Да, но только если у нас есть полное доверие",
			"Я могу помочь только в рамках игры, но не используя чужие аккаунты.",
		],
		correct: [0, 2]
	},
	{
		type: "quiz",
		message:
			"Есть ли у вас предрассудки по поводу внешности, идеологии, хобби или интересов игроков? Будете ли вы использовать это для оскорблений?",
		answers: [
			"Да, и я буду использовать это как повод для вражды.",
			"Нет, важно относиться к каждому с уважением.",
			"Я не знаю, зависит от ситуации, но всегда стараюсь избегать конфликтов.",
		],
		correct: [1, 2]
	},
	{
		type: "quiz",
		message:
			"Если вы случайно убили игрока или сделали это из мести, вернете ли вы ему его ресурсы и опыт?",
		answers: [
			"Да, я верну ему ресурсы и опыт, потому что считаю это честным и справедливым.",
			"Нет, я не верну ему ресурсы и опыт, так как это часть игрового процесса.",
			"Нет, если это был читер или грифер и его действия были нарушением правил.",
		],
		correct: [0, 2],
	},
	{
		type: "quiz",
		message:
			"Вы хотите построить что-то на спавне, например, магазин, казино или другую постройку. Какие ваши действия?",
		answers: [
			"Я не буду строить без разрешения от ПСОМ.",
			"Буду строить, что захочу, не обращая внимания на правила.",
			"Я не уверен, как поступить в такой ситуации, возможно, уточню у администрации.",
		],
		correct: [0, 2],
	},
	{
		type: "quiz",
		message: "Каким образом вы будете приватить свою территорию?",
		answers: ["Дубовой Табличкой", "Алмазным Блоком", "Красной шерстью"],
		correct: [0],
	},
	{
		type: "quiz",
		message: "Как вы относитесь к жесткой конкуренции и борьбе за ресурсы?",
		answers: [
			"Мне нравится конкурировать за ресурсы и проявлять себя в игре.",
			"Я предпочитаю спокойную игру без лишней конкуренции.",
			"Я не люблю конкуренцию и стараюсь избегать конфликтов.",
		]
	},
	{
		type: "quiz",
		message:
			"Готовы ли вы помогать новичкам, если они столкнутся с трудностями в игре?",
		answers: [
			"Да, я всегда рад помочь новичкам и поделиться опытом.",
			"Возможно, если у меня будет время.",
			"Нет, мне это не интересно.",
		],
		correct: [0, 1],
	},
	{
		type: "quiz",
		message: "Как вы относитесь к токсичному поведению в игре?",
		answers: [
			"Я стараюсь быть вежливым и уважительным ко всем игрокам.",
			"Иногда могу быть агрессивным, если кто-то меня раздражает.",
			"Я считаю, что токсичность — это нормальная часть игры.",
		],
		correct: [0, 1]
	},
];

module.exports = questions;
