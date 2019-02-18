const BotClient 			= require("./client");
const BotLanguage 			= require("../data/language.json");

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