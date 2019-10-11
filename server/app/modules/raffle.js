let entries 					= [];
let entriesOpen 				= false;

const arrRandomize 				= (arr) => {
	return arr.sort(function() {
		return 0.5 - Math.random();
	});
};

const raffleClear 				= () => {
	entries 					= [];
};

const raffleStart 				= function(processor) {
	raffleClear();
	entriesOpen 				= true;
	processor.sendMessage(this.client.getLangMessage("RAFFLE_START"));
};

const raffleEnd 				= function(processor) {
	if (entriesOpen && entries.length > 0) {
		// Get a winner
		let winner 				= entries[entries.length * Math.random() | 0];
		let entriesCount 		= entries.length;

		processor.getMember(winner)
		.then((member) => {
			// Clear entries
			raffleClear(processor);

			console.info("[bot] raffle winner is", winner, member.nickname);

			entriesOpen 		= false;

			const message 		= this.client.getLangMessage("RAFFLE_WINNER", {
				raffle: 		{
					entries: 	entriesCount,
					winner: 	member.nickname + "#" + winner
				}
			});

			// Return the winner message
			processor.sendMessage(message, true);

			// Create a StreamLabs alert
			this.client.streamlabs.addAlert(this.client.config.streamLabsToken,{
				type: 			"donation",
				message: 		"Parabéns " + member.nickname + "!",
				image_href: 	member.picture,
				user_message: 	message,
				duration: 		10000
			});
		})
		.catch((e) => {
			console.error("[bot] raffle end error:", e);
			
			// Send an internal error message
			processor.noPermission();
		});
	}
};

const raffleMessage 			= function(processor) {
	this.client.database.Members.findOne({
		attributes: 			["id", "nickname"],
		where: 					{
			messages: 			{
				$gt: 			1
			}
		},
		order: 					[["messages", "DESC"], this.client.database.Sequelize.fn("RANDOM")]
	})
	.then((member) => {
		// Return the winner message
		processor.sendMessage(this.client.getLangMessage("RAFFLE_MSG_WINNER", {
			raffle: 			{
				winner: 		member.nickname + "#" + member.id
			}
		}));
	})
	.catch((e) => {
		processor.internalError(e);
	});
};

const raffleViewers 				= function(processor) {
	this.client.once("bot.members", (viewers) => {
		viewers 					= arrRandomize(viewers);

		let winner 					= {};

		// Get random winner that is not the bot itselt
		do {
			winner 					= viewers[viewers.length * Math.random() | 0];
		} while(
			winner.Uin === this.socket.client.data.user.uin ||
			winner.NickName.indexOf("Guest") === 0
		);

		console.info("[bot] raffle winner is", winner.Uin, winner.NickName);

		entriesOpen 				= false;

		const message 				= this.client.getLangMessage("RAFFLE_WINNER", {
			raffle: 				{
				entries: 			viewers.length,
				winner: 			winner.NickName + "#" + winner.Uin
			}
		});

		// Return the winner message
		processor.sendMessage(message, true);

		// Create a StreamLabs alert
		this.client.streamlabs.addAlert(this.client.config.streamLabsToken,{
			type: 					"donation",
			message: 				"Parabéns " + winner.NickName + "!",
			image_href: 			winner.Picture,
			user_message: 			message,
			duration: 				10000
		});
	});

	// Emit get members packet
	this.client.sockets.active.packets.getMembers();
};

module.exports 						= {
	name: 							"raffle",
	type: 							"module",
	content: 						function(processor) {
		// Check if has arguments and raffle entries are open
		if (processor.arguments.length === 0 && entriesOpen) {
			const medium 			= processor.sender.getMediumMessages(this.client.stream.started, 30);

			/*
			// Check if medium is below 0.15 and raffle needs active users
			if (medium < 0.15 && this.client.config.raffleNeedActive) {
				return processor.sendLangMessage("RAFFLE_NOT_SUITABLE");
			}*/

			// Check if user isn't already in the raffle
			if (entries.indexOf(processor.sender.id) === -1) {
				// Add nickname to the entries
				entries.push(processor.sender.id);

				// Randomize the array every time someone
				// join the raffle
				entries 			= arrRandomize(entries);
			}
		} else
		if (processor.arguments.length) {
			// Check if it's a mod
			if (processor.sender.isMod) {
				// Process command
				switch(processor.arguments[0]) {
					// Start a new raffle
					case "start":
						raffleStart.call(this, processor);
					break;

					// Clear the current raffle without restarting it
					case "clear":
						raffleClear.call(this, processor);
					break;

					// End the current raffle
					case "end":
						raffleEnd.call(this, processor);
					break;

					// Raffle over viewers
					case "viewers":
						raffleViewers.call(this, processor);
					break;

					// Select random winner ordered by number of sent messages
					case "message":
					case "messages":
						raffleMessage.call(this, processor);
					break;
				}
			} else {
				return processor.noPermission();
			}
		} else {
			return processor.sendLangMessage("RAFFLE_NOT_STARTED");
		}

		return true;
	}
};