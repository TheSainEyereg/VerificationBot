const Database = require("better-sqlite3");
const { guildId } = require("../config");
const { RegExps } = require("./constants");

const db = new Database("database.db");

db.exec(`CREATE TABLE IF NOT EXISTS "settings" (
	"guildId" TEXT PRIMARY KEY,
	"rulesJSON" TEXT,
	"categories" TEXT,
	"timestamp" INTEGER
)`);
db.prepare("INSERT OR IGNORE INTO settings(guildId) VALUES(?)").run(guildId);

db.exec(`CREATE TABLE IF NOT EXISTS "verify" (
	"userId" TEXT PRIMARY KEY,
	"channelId" TEXT,
	"state" INTEGER,
	"openUntil" INTEGER,
	"mutedUntil" INTEGER,
	"question" INTEGER,
	"quizOrder" TEXT,
	"quizAnswerOrder" TEXT,
	"wrongCount" TEXT,
	"answers" TEXT,
	"messageId" TEXT,
	"nickname" TEXT COLLATE NOCASE,
	"tempPassword" TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS "users" (
	"userId" TEXT PRIMARY KEY,
	"name" TEXT COLLATE NOCASE,
	"oldNames" TEXT,
	"banedAt" INTEGER,
	"banedUntil" INTEGER,
	"bannedBy" TEXT,
	"banReason"  TEXT,
	"approvedBy" TEXT,
	"approvedAt" INTEGER,
	"answers" TEXT,
	"firstJoined" INTEGER,
	"knownServers" TEXT
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
			return cache.categories = res.categories.match(RegExps.Number) || []; // It should crash when no categories property but if something go wrong we'll get [] instead of null
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

/**
 * @returns {number}
 */
function getTimestamp() {
	return db.prepare("SELECT timestamp FROM settings WHERE guildId = ?").get(guildId)?.timestamp || 0;
}

function saveTimestamp() {
	db.prepare("UPDATE settings SET timestamp = ? WHERE guildId = ?").run(Date.now(), guildId);
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

function getUserByName(name) {
	return db.prepare(`SELECT * FROM users WHERE name = ? OR oldNames LIKE ?`).get(name, `%,${name},%`);
}

function createUser(id, name, firstJoined, knownServers, approvedBy, approvedAt, answers) {
	db.prepare("INSERT OR IGNORE INTO users(userId, name, firstJoined, knownServers, approvedBy, approvedAt, answers) VALUES(?, ?, ?, ?, ?, ?, ?)")
		.run(id, name, firstJoined, knownServers.join(","), approvedBy, approvedAt, answers);
}

function updateUserName(id, name, save = true) {
	const user = getUser(id);

	if (!user) throw new Error("User not found");

	const oldNames = (user.oldNames?.match(RegExps.MinecraftName) || []).filter(n => n !== name);
	save && RegExps.MinecraftName.test(user.name) && oldNames.push(user.name);

	db.prepare(`UPDATE users SET name = ?, oldNames = ? WHERE userId = ?`).run(name, oldNames.join(","), id);
}

function updateUser(id, item, value) {
	db.prepare(`UPDATE users SET ${item} = ? WHERE userId = ?`).run(value, id);
}

function deleteUser(id) {
	return db.prepare("DELETE FROM users WHERE userId = ?").run(id);
}

function closeDB() {
	db.close();
}

module.exports = {
	getTimestamp, saveTimestamp,
	getRulesMessages, getRulesMessage, setRulesMessage,
	getCategories, addCategory, deleteCategory,
	getAllVerify, getVerify, findVerify, createVerify, updateVerify, deleteVerify,
	addAnswer, getAnswers, deleteAnswers,
	getAllUsers, getUser, getUserByName, createUser, updateUser, updateUserName, deleteUser,
	closeDB
};