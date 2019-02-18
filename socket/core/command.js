class BotCommand {
	constructor(command, args, socket, sender, client) {
		this.command 			= command;
		this.arguments 			= args;
		this.sender 			= sender;
		this._botClient 		= client;
		this.socket 			= socket;
	};

	getMessage(message, data) {
		return this._botClient.getMessage(message, Object.assign({
			arguments: 			this.arguments,
			sender: 			this.sender,
			command: 			this.command,
			channel: 			this._botClient.auth.getData().data.user,
			window: 			undefined,
			process: 			undefined,
			Deflate: 			undefined,
			Inflate: 			undefined,
			eval: 				undefined
		}, data));
	};

	sendMessage(message) {
		return this.socket.sendMessage(message);
	};

	getMember(id) {
		return this._botClient.getMember(id);
	};
};

module.exports 					= BotCommand;