const fs = require("fs");


/**
 * @typedef {Object} data
 * @property {string} message
 * @property {string} image
 * @property {answerCallback} answer
 */

const data = (() => {
	try {
		return JSON.parse(fs.readFileSync("./data.json"));
	} catch (e) {
		return {
			onVerify: {},
			rulesMessages: {}
		};
	}
})();

function saveData() {
	fs.writeFileSync("./data.json", JSON.stringify(data, null, "\t"));
}


function getRulesMessages() {
	return data.rulesMessages;
}

function getRulesMessage(type) {
	return getRulesMessages()[type];
}

function setRulesMessage(type, message) {
	data.rulesMessages[type] = message.id;
}

function getAllVerify() {
	return data.onVerify;
}

function getVerify(id) {
	return data.onVerify[id];
}

function setVerify(id, object) {
	data.onVerify[id] = object;
}

function deleteVerify(id) {
	delete data.onVerify[id];
}


function getCategory() {
	return data.category;
}

function setCategory(id) {
	data.category = id;
}


function addAnswer(id, question, answer) {
	if (!fs.existsSync("./answers/")) fs.mkdirSync("./answers/");

	fs.appendFileSync(`./answers/${id}.txt` , `Вопрос: ${question.message}\nОтвет: ${answer}\n\n`);
}

function getAnswer(id) {
	if (!fs.existsSync(`./answers/${id}.txt`)) return false;
	return fs.readFileSync(`./answers/${id}.txt`).toString();
}

function deleteAnswer(id) {
	if (!fs.existsSync(`./answers/${id}.txt`)) return false;
	fs.rmSync(`./answers/${id}.txt`);
}


module.exports = {
	saveData,
	getRulesMessages, getRulesMessage, setRulesMessage,
	getAllVerify, getVerify, setVerify, deleteVerify,
	getCategory, setCategory,
	addAnswer, getAnswer, deleteAnswer
};