import djs, {MessageEmbed, Message, TextChannel} from "discord.js";

const colors = {
	regular: "#e8cb38",
	url: "#1194f0",
	success: "#44e838",
	warning: "#e5e838",
	critical: "#e83838"
}
/**
 * Regular message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.embed - Should I return embed
 * @param {djs.ColorResolvable} opt.color - Color
 * @param {string} opt.image - image url
 * @returns Promise<Message> | Embed
 */
function regular(source, title, description, opt) {
	const channel = source?.channel || source;
	const embed = new MessageEmbed({color: opt?.color || colors.regular});
	title && embed.setTitle(title);
	description && embed.setDescription(description);
	opt?.image && embed.setImage(opt.image);
	if (opt?.embed) return embed;
	return channel.send({embeds: [embed]});
}
/**
 * Message with a link
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} url - The url to send
 * @param {String} text - The text for the url
 * @param {Object} [opt] - Optional parameters
 * @param {Boolean} opt.footer - Custom footer text
 * @param {Boolean} opt.embed - Should I return embed
 * @returns Promise<Message> | Embed
 */
function url(source, url, text, opt) {
	const channel = source.channel || source;
	const embed = new MessageEmbed({
		color: colors.url,
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
 * @returns Promise<Message> | Embed
 */
function success(source, title, description, opt) {
	return regular(source, opt?.circle ? ":green_circle: "+title : ":white_check_mark: "+title, description, Object.assign({color: colors.success}, opt));
}
/**
 * Warning message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.circle - Replaces emoji with a solid color emoji
 * @param {Boolean} opt.embed - Should I return embed
 * @returns Promise<Message> | Embed
 */
function warning(source, title, description, opt) {
	return regular(source, opt?.circle ? ":yellow_circle: "+title : ":warning: "+title, description, Object.assign({color: colors.warning}, opt));
}
/**
 * Critical message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.circle - Replaces emoji with a solid color emoji
 * @param {Boolean} opt.embed - Should I return embed
 * @returns Promise<Message> | Embed
 */
function critical(source, title, description, opt) {
	return regular(source, opt?.circle ? ":red_circle: "+title : ":no_entry_sign: "+title, description, Object.assign({color: colors.critical}, opt));
}

/**
 * Question message
 * @param {Message|TextChannel} source - A message or text channel to send the message to
 * @param {String} title - Titile
 * @param {String} description - Description
 * @param {Object} [opt] - Optional parameters 
 * @param {Boolean} opt.circle - Replaces emoji with a solid color emoji
 * @param {Boolean} opt.embed - Should I return embed
 * @returns Promise<Message> | Embed
 */
function question(source, title, description, opt) {
	return regular(source, opt?.circle ? ":blue_circle: "+title : ":question: "+title, description, Object.assign({color: colors.critical}, opt));
}

export {regular, url, success, warning, critical, question, colors};