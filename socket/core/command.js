class BotCommand {
	constructor(command, args, socket, sender, client) {
		// Convert command to lowercase
		this.command 			= command.toLowerCase();
		this.arguments 			= args;
		this.sender 			= sender;
		this._botClient 		= client;
		this.socket 			= socket;
	}

	getMessage(message, data) {
		return this._botClient.getMessage(message, Object.assign({
			arguments: 			this.arguments,
			sender: 			this.sender,
			command: 			this.command,
			channel: 			this._botClient.data.data.user,
			stream: 			this._botClient.stream,
			window: 			undefined,
			process: 			undefined,
			Deflate: 			undefined,
			Inflate: 			undefined,
			eval: 				undefined
		}, data));
	}

	sendLangMessage(message, data) {
		return this.socket.sendMessage(
			this.getMessage(this._botClient.getLangMessage(message), data)
		);
	}

	sendMessage(message, data) {
		return this.socket.sendMessage(this.getMessage(message, data));
	}

	getMember(id) {
		return this._botClient.database.getMember(id, this._botClient.data.data.user.uin);
	}

	noPermission() {
		return this.sendMessage(this.getMessage(this._botClient.getLangMessage("NO_PERMISSION")));
	}

	internalError(e) {
		console.error("[internal error]", e);
		return this.sendMessage(this.getMessage(this._botClient.getLangMessage("INTERNAL_ERROR")));
	}

	invalidArguments() {
		return this.sendMessage(this.getMessage(this._botClient.getLangMessage("INVALID_ARGUMENTS")));
	}

	triggerCommand(name, args) {
		const command 			= this._botClient.createCommand(name, args, this.socket, this.sender);
		console.log(command);
		return this._botClient.processCommand(command);
	}
}

module.exports 					= BotCommand;