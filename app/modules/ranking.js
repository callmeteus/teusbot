module.exports 									= function() {
	this.on("chat.command", function(processor) {
		// Check if it's the ranking command
		if (processor.command !== "ranking") {
			return true;
		}

		// Check if has arguments
		if (processor.arguments.length > 0) {
			// Process command
			switch(processor.arguments[0]) {
				// Charm / like ranking
				case "like":
				case "likes":
				case "charm":
				case "charms":
					let topCharm 			= this.database.get("members").sortBy("totalCharm").take(10).value();
					let charmPos 			= 0;

					let finalCharm 			= "";

					topCharm.forEach((u) => {
						charmPos++;
						finalCharm 			+= charmPos + ": " + u.nickname + " - " + (u.totalCharm || 0) + " ";
					});

					return processor.sendMessage(finalCharm);
				break;

				// Messaging ranking
				case "message":
				case "messages":
					let topMessages 		= this.database.get("members").sortBy("totalMessages").take(10).value();
					let messagePos 			= 0;

					let finalMsg 			= "";

					topMessages.forEach((u) => {
						messagePos++;
						finalMsg 			+= messagePos + ": " + u.nickname + " - " + (u.totalMessages || 0) + " ";
					});

					return processor.sendMessage(finalMsg);
				break;
			}
		} else {
			processor.sendMessage(this.getLangMessage("RANKING_OPTIONS"));
		}
	});
};