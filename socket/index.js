const fs 					= require("fs");
const path 					= require("path");

const appRoot 				= path.dirname(require.main.filename);

// Create bot data files if they doesn't exists
!fs.existsSync(path.join(appRoot, "../", "data", "language.json")) && fs.writeFileSync(path.join(appRoot, "../", "data", "language.json"), "{}");
!fs.existsSync(path.join(appRoot, "../", "data", "commands.json")) && fs.writeFileSync(path.join(appRoot, "../", "data", "commands.json"), "{}");

const BotClient 			= require("./client");
const BotLanguage 			= require.main.require("../data/language.json");

module.exports 				= function(config, socket) {
	const Client 			= new BotClient(socket);

	Client.getLangMessage 	= function(index, data) {
		if (!BotLanguage[index]) {
			return "Missing translation for '" + index + "'";
		}

		let message 		= BotLanguage[index];

		// Check if message contains data
		if (data) {
			message 		= this.getMessage(message, data);
		}

		// Return message
		return message;
	};

	return Client;
};