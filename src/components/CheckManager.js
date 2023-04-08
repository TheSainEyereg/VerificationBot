const { roles } = require("../config");
const { Interaction, PermissionFlagsBits } = require("discord.js");

/**
 * 
 * @param {Interaction} interaction 
 * @param {"administrator"|"moderator"|"inspector"|"user"} type 
 * @returns {Boolean}
 */
const hasAccess = (interaction, type) =>  
	type === "user" || // Allowed for all
	interaction.member.permissions.has(PermissionFlagsBits.Administrator) || // Administrator can do anything!
	type === "moderator" && interaction.member.roles.cache.has(roles.moderator) || // moderator != inspector
	type === "inspector" && interaction.member.roles.cache.has(roles.inspector); // inspector != moderator


module.exports = { hasAccess };