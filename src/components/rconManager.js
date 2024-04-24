const { Rcon } = require("rcon-client");
const { rcon, settings } = require("../config");
const { RegExps } = require("./constants");
const fs = require("fs");

/** @type {Map.<String, Rcon>} */
const servers = new Map();

for (const [name, config] of Object.entries(rcon.servers)) servers.set(name, new Rcon(config));


/**
 * @typedef {Object} ServerResponse
 * @property {String} name
 * @property {Boolean} status
 * @property {String} message
*/

/**
 * @typedef {Object} Result
 * @property {Boolean} status
 * @property {String} [message] Only if status is false
 * @property {Array.<ServerResponse>} [answers] Only if status is true
*/

/**
 * @param {Array.<String>} serverNames
 * @param {String} command
 * @returns {Promise<Result>}
 */
async function runCommand(serverNames, command) {
	const serverList = serverNames.map(name => ({ name, server: servers.get(name) }));
	for (const { name, server } of serverList) {
		if (!server) return { status: false, message: `Сервер "${name}" не найден в списке доступных для выполнения команд!` };

		if (!server.socket || server.socket.readyState !== "open" && server.socket.connecting) {
			try {
				await server.connect();
			} catch (error) {
				return { status: false, message: `Сервер "${name}" на данный момент не доступен!` };
			}
		}
	}

	const answers = [];
	for (const { name, server } of serverList) {
		try {
			const response = await server.send(command);
			answers.push({ name, status: true, message: response });
		} catch (error) {
			answers.push({ name, status: false, message: error.toString() });
		}
	}

	const firstFailed = answers.find(answer => !answer.status);
	if (firstFailed) {
		return { status: false, message: `Сервер "${firstFailed.name}" не смог выполнить команду! (${firstFailed.message})`, answers };
	}

	return { status: true, answers };
}

function closeRcon() {
	let count = 0;
	
	servers.forEach(server => {
		if (server.socket) {
			server.end();
			server.socket = null;
			count++;
		}
	});

	return count;
}


/** @returns {Promise<Array.<String>, Error>} */
async function getWhitelist() {
	/* Temporary implementation */

	const list = fs.readFileSync(settings.staticWhitelist).toString();
	return list.replace(/,/g, "").match(RegExps.MinecraftName);

	/* We need another way of getting whitelist (RCON 4096 limit) */ return;

	const { answers, message, status } = await runCommand(rcon.whitelist, "easywl list");
	if (!status) throw new Error(message);

	const whitelists = answers.map(answer => answer.message.replace(/§.|,/g, "").replace(" ", "\n").match(RegExps.MinecraftName));

	return whitelists.reduce((a, b) => a.length > b.length ? a : b);
}

function addToWhitelist(nickname) {
	return runCommand(rcon.whitelist, `easywl add ${nickname}`);
}

function removeFromWhitelist(nickname) {
	return runCommand(rcon.whitelist, `easywl remove ${nickname}`);
}


function register(nickname, password) {
	return runCommand(rcon.auth, `authme register ${nickname} ${password}`);
}

function updatePassword(nickname, password) {
	return runCommand(rcon.auth, `authme password ${nickname} ${password}`);
}


/** @returns {Array.<String>} */
function getBans(page) { }

function banUser(nickname) {
	return runCommand(rcon.bans, `ban ${nickname}`);
}

function unbanUser(nickname) {
	return runCommand(rcon.bans, `unban ${nickname}`);
}


module.exports = {
	runCommand, closeRcon,
	getWhitelist, addToWhitelist, removeFromWhitelist,
	register, updatePassword,
	getBans, banUser, unbanUser
}