let entries 					= [];
let entriesOpen 				= false;

const raffleClear 				= () => {
	entries 					= [];
	console.info("[bot] raffle is cleared.");
};

const raffleStart 				= function(processor) {
	raffleClear();

	console.info("[bot] New raffle started.");

	this.emit("raffle.start");

	entriesOpen 				= true;

	processor.sendMessage(this.getLangMessage("RAFFLE_START"));
};

const raffleEnd 				= function(processor) {
	if (entriesOpen && entries.length > 0) {
		// Get a winner
		let winner 				= entries[entries.length * Math.random() | 0];
		let entriesCount 		= entries.length;

		this.database.getMember(winner)
		.then((member) => {
			// Clear entries
			raffleClear(processor);

			console.info("[bot] raffle winner is", winner, member.nickname);

			this.emit("raffle.winner", {
				entries: 		entriesCount,
				winner: 		member
			});

			entriesOpen 		= false;

			const message 		= this.getLangMessage("RAFFLE_WINNER", {
				raffle: 		{
					entries: 	entriesCount,
					winner: 	member.nickname + "#" + winner
				}
			});

			// Return the winner message
			processor.sendMessage(message);

			// Create a StreamLabs alert
			this.streamlabs.addAlert(this.config.streamLabsToken,{
				type: 			"donation",
				message: 		"Parabéns " + member.nickname + "!",
				image_href: 	member.picture,
				user_message: 	message,
				duration: 		10000
			})
		})
		.catch((e) => {
			console.error("[bot] raffle end error:", e);
			
			// Send an internal error message
			processor.noPermission();
		});
	}
};

const raffleMessage 			= function(processor) {
	this.database.Members.findOne({
		attributes: 			["id", "nickname"],
		where: 					{
			messages: 			{
				$gt: 			1
			}
		},
		order: 					[["messages", "DESC"], this.database.Sequelize.fn("RANDOM")]
	})
	.then((member) => {
		// Return the winner message
		processor.sendMessage(this.getLangMessage("RAFFLE_MSG_WINNER", {
			raffle: 			{
				winner: 		member.nickname + "#" + member.id
			}
		}));
	})
	.catch((e) => {
		console.error("[bot] raffle end error:", e);
		processor.noPermission();
	});
};

module.exports 						= {
	name: 							"raffle",
	type: 							"module",
	content: 						function(processor) {
		// Check if has arguments
		if (processor.arguments.length === 0 && entriesOpen && entries.indexOf(processor.sender.id) === -1) {
			// Add nickname to the entries
			entries.push(processor.sender.id);

			// Randomize the array every time someone
			// join the raffle
			entries 				= entries.sort(function() {
				return .5 - Math.random();
			});

			console.info("[bot]", processor.sender.id, processor.sender.nickname, "entered the raffle.");
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