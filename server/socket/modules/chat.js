module.exports 							= function(message, socket) {
	// Get text from message content
	const text 							= message.MsgContent.Buff;

	// Bot has been connected in another place
	if (message.MsgType === 20008) {
		socket.debug("the bot account has been connected in another place, service terminated.");
		return this.emit("bot.disconnect", "another_device");
	}

	// Assign message channel
	message.Channel 					= this.data.data.user.uin;

	// Get member from database
	this.database.getMember(message)
	.then((user) => {
		// Check if it's the bot user
		if (user.id === this.data.user.uin) {
			this.botMember 				= user;
		}

		let data 						= {};
		let isDataMessage 				= false;

		// Check if text message is JSON
		if (text.indexOf("{\n") > -1) {
			// Parse JSON
			data 						= JSON.parse(text);
			isDataMessage 				= true;
		}

		// Trigger process data message function
		this.processDataMessage(message, user, data);

		// Check if message has length
		// or if it's a data message
		if (text.replace(/ /g).length === 0 || isDataMessage) {
			return false;
		}

		// Emit the message
		this.emit("chat.message", {
			sender: 					user,
			message: 					text
		});

		// Check if stream is online
		// or is debug
		if (this.stream.online || this.isDebug) {
			const firstLetter 			= text[0];

			// Check if it's a command
			if (firstLetter === "!" || firstLetter === "+" || firstLetter === "/") {
				let args 				= text.split(" ");
				let command 			= args.shift();
				let realCommand 		= command.substr(1, command.length - 1);

				const processor 		= this.createCommand(realCommand, args, socket, user);

				// Call the processor
				this.processCommand(processor);
			}

			// Increment user messages, total messages and points
			this.database.Members.increment({
				messages: 				1,
				totalMessages: 			1,
				points: 				this.config.pointsPerMessage || 0.2
			}, {
				where: 					{
					id: 				user.id,
					channel: 			this.data.data.user.uin
				}
			});
		}
	})
	.catch((e) => {
		this.sockets.passive.debug("Error getting member data: " + e.message);
	});
};