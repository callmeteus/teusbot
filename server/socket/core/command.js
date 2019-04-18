const botSocket 				= Symbol("botSocket");
const botClient 				= Symbol("botClient");

class BotCommand {
	constructor(command, args, socket, sender, client) {
		// Convert command to lowercase
		this.command 			= command.toLowerCase();
		this.arguments 			= args ? args.map((arg) => arg.replace(/[\{,\},\$]/g, "")) : [];
		this.sender 			= sender;

		// Instantiate client and socket using symbols
		// for better security
		this[botClient] 		= client;
		this[botSocket]			= socket;
	}

	getMessage(message, data) {
		return this[botClient].getMessage(message, Object.assign({
			arguments: 			this.arguments,
			sender: 			this.sender,
			command: 			this.command,
			channel: 			this[botClient].data.data.user,
			stream: 			this[botClient].stream,
			window: 			undefined,
			process: 			undefined,
			Deflate: 			undefined,
			Inflate: 			undefined,
			eval: 				undefined
		}, data));
	}

	sendLangMessage(message, data) {
		return this[botSocket].sendMessage(
			this.getMessage(this[botClient].getLangMessage(message), data)
		);
	}

	sendMessage(message) {
		return this[botClient].config.canReply && this[botSocket].sendMessage(message);
	}

	getMember(id) {
		return this[botClient].database.getMember(id, this[botClient].data.data.user.uin);
	}

	noPermission() {
		return this.sendMessage(this.getMessage(this[botClient].getLangMessage("NO_PERMISSION")));
	}

	internalError(e) {
		console.error("[internal error]", e);
		return this.sendMessage(this.getMessage(this[botClient].getLangMessage("INTERNAL_ERROR")));
	}

	invalidArguments() {
		return this.sendMessage(this.getMessage(this[botClient].getLangMessage("INVALID_ARGUMENTS")));
	}

	triggerCommand(name, args) {
		const command 			= this[botClient].createCommand(name, args, this[botSocket], this.sender);
		return this[botClient].processCommand(command);
	}
}

module.exports 					= BotCommand;