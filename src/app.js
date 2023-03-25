const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const { token } = require("./config");
const { closeDB, saveTimestamp } = require("./components/dataManager");


process.stdin.resume();

// process.on("unhandledRejection", (error) => {
// 	console.error(error);
// 	try {
// 		error.requestData && console.log(JSON.stringify(error.requestData, null, "\t"));
// 	} catch (e) {}
// });
// process.on("uncaughtException", console.error);


const client = new Client({
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers, //Whitelist required after 100 servers
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent, //Whitelist required after 100 servers
		GatewayIntentBits.DirectMessages
	],
	partials: [Partials.Channel, Partials.Message]
})

process.stdout.write("Parsing events...");
const eventsPath = path.join(__dirname, "events")
for (const file of fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"))) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	client[event.once ? "once" : "on"](event.event, event.execute);
}
process.stdout.write("Done!\n");

client.login(token);


function handleError(e) {
	console.error(e);
	process.exit(1);
}

process.on("unhandledRejection", handleError);
process.on("uncaughtException", handleError)


function handleInterrupt(code) {
	process.removeAllListeners();

	process.stdout.write("🔴 Interrupt detected, destroying client...");
	client.destroy();
	process.stdout.write("Saving timestamp...");
	saveTimestamp();
	process.stdout.write("Closing DB...");
	closeDB();
	process.stdout.write(`Done! (${code})\n`);

	process.exit(code);
}

process.on("exit", handleInterrupt);
process.on("SIGINT", handleInterrupt);
process.on("SIGUSR1", handleInterrupt);
process.on("SIGUSR2", handleInterrupt);