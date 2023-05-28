const { roles } = require("../config");
const { GuildMember, PermissionFlagsBits } = require("discord.js");

/**
 * @typedef {"administrator"|"moderator"|"inspector"|"user"} AccessType
 */

/**
 * 
 * @param {GuildMember} member 
 * @param {AccessType | Array.<AccessType>} types 
 * @returns {Boolean}
 */
const hasAccess = (member, types) => {
	for (const type of typeof types === "string" ? [types] : types) {
		if (
			type === "user" || // Allowed for all
			member.permissions.has(PermissionFlagsBits.Administrator) || // Administrator can do anything!
			type === "moderator" && member.roles.cache.has(roles.moderator) || // moderator != inspector
			type === "inspector" && member.roles.cache.has(roles.inspector) // inspector != moderator
		) return true;
	}
	return false;
}


module.exports = { hasAccess };