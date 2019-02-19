module.exports 									= function() {
	let entries 								= [];
	let entriesOpen 							= false;

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
					entries 				= [];

					console.info("[bot] New raffle started.");

					this.emit("raffle.start");

					entriesOpen 			= true;

					processor.sendMessage(this.getLangMessage("RAFFLE_START"));
				break;

				// Clear the current raffle without restarting it
				case "clear":
					entries 				= [];

					console.info("[bot] Raffle is cleared.");
				break;

				// End the current raffle
				case "end":
					if (entriesOpen && entries.length > 0) {
						// Get a winner
						let winner 			= entries[entries.length * Math.random() | 0];
						let entriesCount 	= entries.length;

						// Reset entries
						entries 			= [];

						console.info("[bot] Raffle winner is", winner, processor.getMember(winner).nickname);

						this.emit("raffle.winner", {
							entries: 		entriesCount,
							winner: 		processor.getMember(winner)
						});

						entriesOpen 		= false;

						// Return the winner message
						processor.sendMessage(this.getLangMessage("RAFFLE_WINNER", {
							raffle: 		{
								entries: 	entriesCount,
								winner: 	processor.getMember(winner).nickname + "#" + winner
							}
						}));
					}
				break;
			}
		}

		return true;
	});
};