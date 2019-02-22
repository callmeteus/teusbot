module.exports 						= function() {
	let entries 					= [];
	let entriesOpen 				= false;

	const raffleClear 				= () => {
		entries 					= [];
		console.info("[bot] raffle is cleared.");
	};

	const raffleStart 				= (processor) => {
		raffleClear();

		console.info("[bot] New raffle started.");

		this.emit("raffle.start");

		entriesOpen 				= true;

		processor.sendMessage(this.getLangMessage("RAFFLE_START"));
	};

	const raffleEnd 				= (processor) => {
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

				// Return the winner message
				processor.sendMessage(this.getLangMessage("RAFFLE_WINNER", {
					raffle: 		{
						entries: 	entriesCount,
						winner: 	member.nickname + "#" + winner
					}
				}));
			})
			.catch((e) => {
				console.error("[bot] raffle end error:", e);
				
				// Send an internal error message
				processor.sendMessage(this.getLangMessage("INTERNAL_ERROR"));
			});
		}
	};

	const raffleMessage 			= (processor) => {
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
			processor.sendMassege("Internal error");
		});
	};

	this.on("chat.command", function(processor) {
		// Check if it's the raffle command
		if (processor.command !== "raffle") {
			return true;
		}

		// Check if has arguments
		if (processor.arguments.length === 0 && entriesOpen && entries.indexOf(processor.sender.id) === -1) {
			// Add nickname to the entries
			// TODO: make a list of users that chatted before on BotClient and
			// then use the user ID instead of the nickname here
			entries.push(processor.sender.id);

			console.info("[bot]", processor.sender.id, processor.sender.nickname, "entered the raffle.");
		} else
		// Check if it's a mod
		if (processor.sender.isMod) {
			// Process command
			switch(processor.arguments[0]) {
				// Start a new raffle
				case "start":
					raffleStart(processor);
				break;

				// Clear the current raffle without restarting it
				case "clear":
					raffleClear(processor);
				break;

				// End the current raffle
				case "end":
					raffleEnd(processor);
				break;

				// Select random winner ordered by number of sent messages
				case "message":
				case "messages":
					raffleMessage(processor);
				break;
			}
		}

		return true;
	});
};