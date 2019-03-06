let entries 					= [];
let entriesOpen 				= false;

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

		this.client.database.getMember(winner)
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
			processor.sendMessage(message);

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

module.exports 						= {
	name: 							"raffle",
	type: 							"module",
	content: 						function(processor) {
		// Check if has arguments and raffle entries are open
		if (processor.arguments.length === 0 && entriesOpen) {
			// Check if user isn't already in the raffle
			if (entries.indexOf(processor.sender.id) === -1) {
				// Add nickname to the entries
				entries.push(processor.sender.id);

				// Randomize the array every time someone
				// join the raffle
				entries 			= entries.sort(function() {
					return 0.5 - Math.random();
				});
			}
		} else
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

				// Select random winner ordered by number of sent messages
				case "message":
				case "messages":
					raffleMessage.call(this, processor);
				break;
			}
		} else {
			return processor.noPermission();
		}

		return true;
	}
};