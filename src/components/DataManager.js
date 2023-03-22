const fs = require("fs");
const Database = require("better-sqlite3");
const { guildId } = require("../config");

const db = new Database("database.db");

db.exec(`CREATE TABLE IF NOT EXISTS "settings" (
	"guildId"		TEXT PRIMARY KEY,
	"rulesJSON"		TEXT,
	"categories"	TEXT
)`);
db.prepare("INSERT OR IGNORE INTO settings(guildId) VALUES(?)").run(guildId);

db.exec(`CREATE TABLE IF NOT EXISTS "verify" (
	"userId"			TEXT PRIMARY KEY,
	"channelId"			TEXT,
	"state"				INTEGER,
	"openUntil"			INTEGER,
	"mutedUntil"		INTEGER,
	"question"			INTEGER,
	"answers"			TEXT,
	"quizOrder"			TEXT,
	"quizAnswerOrder"	TEXT,
	"wrongCount"		TEXT,
	"messageId" 		TEXT,
	"nickname"			TEXT,
	"tempPassword"		TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS "users" (
	"userId"	TEXT PRIMARY KEY,
	"name"		TEXT,
	"oldNames"	TEXT,
	"bannedUntil"	INTEGER,
	"banReason" TEXT
)`);


const cache = {}

function getRulesMessages() {
	if (!cache.rulesMessages) {
		try {
			const res = db.prepare("SELECT rulesJSON FROM settings WHERE guildId = ?").get(guildId);
			return cache.rulesMessages = JSON.parse(res.rulesJSON) || {};
		} catch (e) {};

		return cache.rulesMessages = {}
	}
	
	return cache.rulesMessages;
}

function getRulesMessage(type) {
	return getRulesMessages()[type]
}

function setRulesMessage(type, message) {
	cache.rulesMessages[type] = message.id;
	db.prepare("UPDATE settings SET rulesJSON = ? WHERE guildId = ?").run(JSON.stringify(cache.rulesMessages), guildId);
}


function getCategories() {
	if (!cache.categories) {
		try {
			const res = db.prepare("SELECT categories FROM settings WHERE guildId = ?").get(guildId);
			return cache.categories = res.categories.match(/[0-9]+/g) || []; // It should crash when no categories property but if something go wrong we'll get [] instead of null
		} catch (e) {};

		return cache.categories = []
	}
	
	return cache.categories;
}

function addCategory(id) {
	cache.categories.push(id);
	db.prepare("UPDATE settings SET categories = ? WHERE guildId = ?").run(cache.categories.join(","), guildId);
}

function deleteCategory(id) {
	cache.categories.splice(cache.categories.indexOf(id), 1);
	db.prepare("UPDATE settings SET categories = ? WHERE guildId = ?").run(cache.categories.join(","), guildId);
}


function getAllVerify() {
	return db.prepare("SELECT * FROM verify").all();
}

function getVerify(id) {
	return db.prepare("SELECT * FROM verify WHERE userId = ?").get(id);
}

function createVerify(id, channelId, openUntil, quizOrder) {
	db.prepare("INSERT OR IGNORE INTO verify(userId, channelId, openUntil, quizOrder, question, state, wrongCount) VALUES(?, ?, ?, ?, 0, 0, 0)").run(id, channelId, openUntil, quizOrder);
}

function findVerify(item, value, all) {
	const stmt = db.prepare(`SELECT * FROM verify WHERE ${item} = ?`);
	return all ? stmt.all(value) : stmt.get(value);
}

function updateVerify(id, item, value) {
	db.prepare(`UPDATE verify SET ${item} = ? WHERE userId = ?`).run(value, id);
}

function deleteVerify(id) {
	return db.prepare("DELETE FROM verify WHERE userId = ?").run(id);
}

/**
 * 
 * @param {String} id - ID 
 * @param {String} q - question
 * @param {String} a - answer
 */
function addAnswer(id, q, a) {
	const answers = getAnswers(id);

	answers.push({q, a});
	
	updateVerify(id, "answers", JSON.stringify(answers));
}

function getAnswers(id) {
	if (!cache["answers"+id]) {
		try {
			const res = db.prepare("SELECT answers FROM verify WHERE userId = ?").get(id);
			return cache["answers"+id] = JSON.parse(res.answers) || [];
		} catch (e) {}

		return cache["answers"+id] = [];
	}

	return cache["answers"+id];
}

function deleteAnswers(id) {
	delete cache["answers"+id];
	updateVerify(id, "answers", null);
}


function getAllUsers() {
	return db.prepare("SELECT * FROM users").all();
}

function getUser(id) {
	return db.prepare("SELECT * FROM users WHERE userId = ?").get(id);
}

function createUser(id, name) {
	db.prepare("INSERT OR IGNORE INTO users(userId, name) VALUES(?, ?)").run(id, name);
}

function getUserByName(name) {
	return db.prepare(`SELECT * FROM users WHERE name = ?`).get(name);
}

function updateUser(id, item, value) {
	db.prepare(`UPDATE users SET ${item} = ? WHERE userId = ?`).run(value, id);
}

function deleteUser(id) {
	return db.prepare("DELETE FROM users WHERE userId = ?").run(id);
}


function saveData() {}

function closeDB() {
	db.close();
}

module.exports = {
	saveData,
	getRulesMessages, getRulesMessage, setRulesMessage,
	getCategories, addCategory, deleteCategory,
	getAllVerify, getVerify, findVerify, createVerify, updateVerify, deleteVerify,
	addAnswer, getAnswers, deleteAnswers,
	getAllUsers, getUser, getUserByName, createUser, updateUser, deleteUser,
	closeDB
};