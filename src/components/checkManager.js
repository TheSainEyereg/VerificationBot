const { roles } = require("../config");
const { GuildMember, PermissionFlagsBits } = require("discord.js");

/**
 * 
 * @param {GuildMember} member 
 * @param {"administrator"|"moderator"|"inspector"|"user"} type 
 * @returns {Boolean}
 */
const hasAccess = (member, type) =>  
	type === "user" || // Allowed for all
	member.permissions.has(PermissionFlagsBits.Administrator) || // Administrator can do anything!
	type === "moderator" && member.roles.cache.has(roles.moderator) || // moderator != inspector
	type === "inspector" && member.roles.cache.has(roles.inspector); // inspector != moderator


module.exports = { hasAccess };