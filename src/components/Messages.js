const {ColorResolvable, EmbedBuilder, Message, TextChannel} = require("discord.js");
const { Colors } = require("./enums");

/**
 * Regular message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.embed - Should I return embed
 * @param {ColorResolvable} opt.color - Color
 * @param {string} opt.image - image url
 * @param {string} opt.content - message content
 * @returns Promise<Message> | Embed
 */
function regular(source, title, description, opt) {
	/** @type {TextChannel} */
	const channel = source?.channel || source;
	const embed = new EmbedBuilder({color: opt?.color || Colors.Regular});
	title && embed.setTitle(title);
	description && embed.setDescription(description);
	opt?.image && embed.setImage(opt.image);
	if (opt?.embed) return embed;
	return channel.send(Object.assign({embeds: [embed]}, opt?.content && {content: opt.content}, ));
}
/**
 * Message with a link
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} url - The url to send
 * @param {String} text - The text for the url
 * @param {Object} [opt] - Optional parameters
 * @param {Boolean} opt.footer - Custom footer text
 * @param {Boolean} opt.embed - Should I return embed
 * @param {string} opt.content - message content
 * @returns Promise<Message> | Embed
 */
function url(source, url, text, opt) {
	const channel = source.channel || source;
	const embed = new EmbedBuilder({
		color: Colors.Url,
		title: text,
		url
	});
	if (opt?.embed) return embed;
	return channel.send({embeds: [embed]});
}

/**
 * Success message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.circle - Replaces emoji with a solid color emoji
 * @param {Boolean} opt.embed - Should I return embed
 * @param {string} opt.content - message content
 * @returns Promise<Message> | Embed
 */
function success(source, title, description, opt) {
	return regular(source, opt?.circle ? ":green_circle: "+title : ":white_check_mark: "+title, description, Object.assign({color: Colors.Success}, opt));
}
/**
 * Warning message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.circle - Replaces emoji with a solid color emoji
 * @param {Boolean} opt.embed - Should I return embed
 * @param {string} opt.content - message content
 * @returns Promise<Message> | Embed
 */
function warning(source, title, description, opt) {
	return regular(source, opt?.circle ? ":yellow_circle: "+title : ":warning: "+title, description, Object.assign({color: Colors.Warning}, opt));
}
/**
 * Critical message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.circle - Replaces emoji with a solid color emoji
 * @param {Boolean} opt.embed - Should I return embed
 * @param {string} opt.content - message content
 * @returns Promise<Message> | Embed
 */
function critical(source, title, description, opt) {
	return regular(source, opt?.circle ? ":red_circle: "+title : ":no_entry_sign: "+title, description, Object.assign({color: Colors.Critical}, opt));
}

/**
 * Question message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.circle - Replaces emoji with a solid color emoji
 * @param {Boolean} opt.embed - Should I return embed
 * @param {string} opt.content - message content
 * @returns Promise<Message> | Embed
 */
function question(source, title, description, opt) {
	return regular(source, opt?.circle ? ":blue_circle: "+title : ":question: "+title, description, Object.assign({color: Colors.Question}, opt));
}

module.exports = {regular, url, success, warning, critical, question};