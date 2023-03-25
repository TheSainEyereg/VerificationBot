const { Rcon } = require("rcon-client");


function getWhitelist() {}

function addToWhitelist(nickname) {}

function removeFromWhitelist(nickname) {}

function clearWhitelist() {}

function register(nickname, password) {
	console.log(nickname, password)
}

function updatePassword(nickname, password) {}

function getBans(page) {}

function banUser(nickname) {}

function unbanUser(nickname) {}


module.exports = {
	getWhitelist, addToWhitelist, removeFromWhitelist, clearWhitelist,
	register, updatePassword,
	getBans, banUser, unbanUser
}