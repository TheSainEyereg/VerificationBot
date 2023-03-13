const { Message } = require("discord.js");
const { settings } = require("../../config");
const { updateVerify } = require("../dataManager");
const { States } = require("../enums");
const { warning, critical } = require("../messages");

const yesAnswer = ["да", "конечно", "ес", "есс", "естественно", "кнчн", "а как же", "конечно же", "yes", "right", "true", "ну да", "дэм", "нуда", "+"];
const noAnswer = ["нет", "никогда", "no", "false", "неа", "не", "ноу", "-"];

/**
 * 
 * @param {string} text 
 * @param {Array} array
 * @returns Boolean
 */
const findInArray = (text, array) => !! text.split(" ").find(w => array.includes(w.toLowerCase()));

/**
 * @callback AnswerCallback
 * @param {Message} message
 * @returns {Promise<boolean>}
 */

/**
 * @typedef {Object} textQuestion
 * @property {String} message
 * @property {String} [image]
 * @property {AnswerCallback} answer
 */

/** @type {textQuestion[]} */
const questions = [
	{
		message: "Сколько вам лет?",
		async answer(message) {
			const number = message.content.match(/[0-9]+/g)?.[0];
			if (isNaN(number)) {
				await warning(message, "Вы должны написать хоть одно число в вашем сообщении!")
				return false;
			}
			if (parseInt(number) < settings.minAge) {
				updateVerify(message.author.id, "state", States.ShouldEnd);

				try {
					const DMChannel = await message.author.createDM();
					if (DMChannel) await critical(DMChannel, "Вы ешё слишком молоды, чтобы играть на сервере!", "Напишите Olejka#4300 для оспаривания блокировки.");	
				} catch (e) {}

				await message.member.ban({reason: "Слишком молодой"});

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
			updateVerify(message.author.id, "nickname", message.content)
			await message.channel.edit({name: message.content});

			try {
				await message.member.setNickname(message.content);
			} catch (e) {
				await warning(message, "Не смог сменить вам имя!", `Пожалуйста, самостоятельно измените ваш ник в Discord на ник в игре!\n\`${e.message}\``);
			}
			return true;
		}
	},
	{
		message: "Сколько вы играете в Minecraft? С какой версии?",
		async answer(message) {
			if (!message.content.match(/[0-9]/g).length) {
				await warning(message, "Вы должны написать хоть одно число в вашем сообщении!")
				return false;
			}
			return true;
		}
	},
	{
		message: "Как вы узнали о нас?",
		async answer(message) {
			if (message.content.length > 500) {
				await warning(message, "Максимум 500 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Чем вы будете заниматься на сервере?",
		async answer(message) {
			if (message.content.length > 500) {
				await warning(message, "Максимум 500 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Вы играли на подобных ванильных серверах?",
		async answer(message) {
			if (message.content.length > 500) {
				await warning(message, "Максимум 500 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "На каких типах серверов, вы играли?",
		async answer(message) {
			if (message.content.length > 500) {
				await warning(message, "Максимум 500 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Сколько вы будете проводить времени на нашем сервере?",
		async answer(message) {
			if (message.content.length > 500) {
				await warning(message, "Максимум 500 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "Расскажите подробно о себе.",
		async answer(message) {
			if (message.content.length > 500) {
				await warning(message, "Максимум 500 символов!");
				return false;
			}
			return true;
		}
	},
	{
		message: "У вас установлен мод на голосовой чат? (PlasmoVoice)",
		async answer(message) {
			if (findInArray(message.content, noAnswer)) {
				await warning(message, "Обязательно скачай мод!", "Fabric: https://www.curseforge.com/minecraft/mc-mods/plasmo-voice/ \nForge: https://www.curseforge.com/minecraft/mc-mods/plasmo-voice/ ");
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
				await warning(message, "Обязательно скачай мод!", "Fabric: https://www.curseforge.com/minecraft/mc-mods/emotecraft/ \nForge: https://www.curseforge.com/minecraft/mc-mods/emotecraft-forge/ ");
				return true;
			}
			if (findInArray(message.content, yesAnswer)) {
				return true;
			}

			await warning(message, "Не смог понять вас", "Напишите да или нет");
			return false;
		}
	}
]

module.exports = questions;