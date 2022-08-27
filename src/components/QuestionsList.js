import { Message } from "discord.js";
import { settings } from "../../config.js";
import { getVerify } from "./DataManager.js";
import { regular, warning, critical, success } from "./Messages.js";
import { endConversation } from "./QuestionsManager.js";

const yesAnswer = ["да", "конечно", "ес", "есс", "естесственно", "кнчн", "а как же", "конечно же", "yes", "right", "true", "ну да", "дэм", "нуда"];
const noAnswer = ["нет", "никогда", "no", "false", "неа", "не", "ноу"];

/**
 * 
 * @param {string} text 
 * @param {Array} array
 * @returns 
 */
const findInArray = (text, array) => text.split(" ").find(w => array.includes(w.toLowerCase()));

/**
 * @callback answerCallback
 * @param {Message} message
 * @returns {Promise<boolean>}
 */

/**
 * @typedef {Object} question
 * @property {string} message
 * @property {string} image
 * @property {answerCallback} answer
 */

/** @type {question[]} */
const questions = [
	{
		message: "Вы хотите попасть на сервер?",
		async answer(message) {
			if (findInArray(message.content, noAnswer)) {
				try {
					const DMChannel = await message.author.createDM();
					if (DMChannel) await critical(DMChannel, "Всего хорошего :)");
				} catch (e) {}

				await message.member.ban({reason: "Не хочет играть"});

				return false;
			}
			if (findInArray(message.content, yesAnswer)) {
				return true;
			}

			await warning(message, "Не совсем вас понял", "Напишите да или нет");
			return false;
		}
	},
	{
		message: "Сколько вам лет?",
		async answer(message) {
			if (isNaN(message.content)) {
				await warning(message, "Неверный формат!", "Вы должны ввести число!");
				return false;
			}
			if (message.content < settings.minAge) {
				try {
					const DMChannel = await message.author.createDM();
					if (DMChannel) await critical(DMChannel, "Вы ешё слишком молоды, чтобы играть на сервере!", "Напишите Olejka#4300 для оспаривания блокировки.");	
				} catch (e) {}
				await message.member.ban({reason: "Слишком молодой"});

				await endConversation(message.guild, message.author);

				return false;
			}
			return true;
		}
	},
	{
		message: "Какой ваш ник в Minecraft?",
		async answer(message) {
			const matches = /^[a-zA-Z0-9_]{2,16}$/mg.test(message.content);
			if (!matches) {
				await warning(message, "Неверный формат!", "Ваш ник не соответствует формату, убедитесь, что вы ввели его правильно!");
				return false;
			}
			getVerify(message.author.id).nickname = message.content;

			try {
				await message.member.setNickname(message.content);
			} catch (e) {
				await warning(message, "Не смог сменить вам имя!", `Пожалуйста, самостоятельно измените ваш ник в Discord на ник в игре!\n\`${e.message}\``);
			}
			return true;
		}
	},
	{
		message: "Сколько вы играете в Minecraft?",
		async answer(message) {
			const number = message.content.match(/[0-9]/g)?.[0];
			if (isNaN(number)) {
				await warning(message, "Вы должны написать хоть одно число в вашем сообщении!")
				return false;
			}
			return true;
		}
	},
	{
		message: "У вас установлен мод на голосовой чат? (PlasmoVoice)",
		async answer(message) {
			if (findInArray(message.content, noAnswer)) {
				await warning(message, "Обязательно скачай мод!", "Fabric: https://www.curseforge.com/minecraft/mc-mods/plasmo-voice/files/3903845 \nForge: https://www.curseforge.com/minecraft/mc-mods/plasmo-voice/files/3903846 ");
				return true;
			}
			if (findInArray(message.content, yesAnswer)) {
				return true;
			}

			await warning(message, "Не очень понятно", "Напишите да или нет");
			return false;
		}
	},
	{
		message: "У вас установлен мод на эмоции? (EmoteCraft)",
		async answer(message) {
			if (findInArray(message.content, noAnswer)) {
				await warning(message, "Обязательно скачай мод!", "Fabric: https://www.curseforge.com/minecraft/mc-mods/emotecraft/files/3931121 \nForge: https://www.curseforge.com/minecraft/mc-mods/emotecraft-forge/files/3931122 ");
				return true;
			}
			if (findInArray(message.content, yesAnswer)) {
				return true;
			}

			await warning(message, "Не смог понять вас", "Напишите да или нет");
			return false;
		}
	},
	{
		message: "Сколько вы планируйте проводить часов в неделю на сервере?",
		async answer(message) {
			const number = message.content.match(/[0-9]/g)?.[0];
			if (isNaN(number)) {
				await warning(message, "Хух? А где цифра?", "Вы должны написать хоть одно число в вашем сообщении!")
				return false;
			}
			return true;
		}
	},
	{
		message: "На каких типах серверов, вы играли в Minecraft?",
		async answer(message) {
			if (message.content.length > 300) {
				await warning(message, "Максимум 300 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Оцените свой уровень игры",
		async answer(message) {
			if (message.content.length > 50) {
				await warning(message, "Максимум 50 символов!", "Пишите коротко и ясно!");
				return false;
			}
			return true;
		}
	},
	{
		message: "К какому типу игроков, вы себя отнесете?",
		async answer(message) {
			if (message.content.length > 100) {
				await warning(message, "Максимум 100 символов!", "Пишите коротко и ясно!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Почему вы выбрали именно наш сервер?",
		async answer(message) {
			if (message.content.length > 300) {
				await warning(message, "Максимум 300 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Откуда вы узнали о нашем сервере?",
		async answer(message) {
			if (message.content.length > 300) {
				await warning(message, "Максимум 300 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Расскажите нам, немного о себе.",
		async answer(message) {
			if (message.content.length > 300) {
				await warning(message, "Максимум 300 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Чем вы будете заниматься на сервере?",
		async answer(message) {
			if (message.content.length > 100) {
				await warning(message, "Максимум 100 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Будете ли вы принимать участие в жизни сервера?",
		async answer(message) {
			if (message.content.length > 200) {
				await warning(message, "Максимум 200 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Вы любите красные пряники?",
		async answer(message) {
			if (!/(да)?,?( +)?только с чаем/gi.test(message.content)) {
				await critical(message, "Эй!", "Дорогой Друг,ознакомся с правилами! Можешь повтроить попытку через 5 минут :)");

				await message.member.timeout(5 * 60 * 1000, "Правила не читал ¯\\_(ツ)_/¯");

				return false;
			}
			return true;
		}
	},
	{
		message: "Хотите попить со мной круасаны с чаем?",
		async answer(message) {
			if (!/(нет)?,?( +)?ты,?( +)?всего лишь машина/gi.test(message.content)) {
				await critical(message, "Эй!", "Дорогой Друг,ознакомся с правилами! Можешь повтроить попытку через 5 минут :)");

				await message.member.timeout(5 * 60 * 1000, "Правила не читал ¯\\_(ツ)_/¯");

				return false;
			}
			return true;
		}
	},
	// {
	// 	message: "Вы ознакомились с правилами нашего сервера?",
	// 	async answer(message) {
	// 		if (!message.content.toLowerCase().includes("алмаз") && !message.content.toLowerCase().includes("незерит")) {
	// 			await critical(message, "Эй!", "Кто-то не очень внимательно читал правила! Вернись через 5 минут!");

	// 			await message.member.timeout(5 * 60 * 1000, "Правила не читал ¯\\_(ツ)_/¯");

	// 			return false;
	// 		}

	// 		return true;
	// 	}
	// },
	{
		message: "Вы видите игрока на спавне, которого постоянно убивают,ваши действия.",
		image: "https://cdn.discordapp.com/attachments/698534749169385483/1006644672057315348/2022-08-09_22.24.35.png",
		async answer(message) {
			if (message.content.length > 300) {
				await warning(message, "Максимум 300 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Вы увидели брошеный сундук,ваши действия.",
		image: "https://media.discordapp.net/attachments/698534749169385483/1006636972292444200/2022-08-09_21.55.37.png",
		async answer(message) {
			if (message.content.length > 300) {
				await warning(message, "Максимум 300 символов!");
				return false;
			}
			return true;
		}
	}
]

export default questions;