const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const { token } = require("../config");
const { saveData } = require("./components/DataManager.js");


process.on("unhandledRejection", (error) => {
	console.error(error);
	try {
		error.requestData && console.log(JSON.stringify(error.requestData, null, "\t"));
	} catch (e) {}
});
process.on("uncaughtException", console.error);
process.stdin.resume();


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


function handleInterrupt() {
	process.removeAllListeners();

	process.stdout.write("Interrupt detected, destroying client...");
	client.destroy();
	process.stdout.write("Saving data...");
	saveData();
	process.stdout.write("Done!\n");

	process.exit(0);
}

process.on("exit", handleInterrupt);
process.on("SIGINT", handleInterrupt);
process.on("SIGUSR1", handleInterrupt);
process.on("SIGUSR2", handleInterrupt);