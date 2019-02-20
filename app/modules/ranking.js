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
					this.database.Members.findAll({
						attributes: 		["nickname", "totalCharm"],
						order: 				[["totalCharm", "DESC"]],
						limit: 				10
					})
					.then((members) => {
						let finalCharm 		= "";
						let charmPos 		= 1;

						members.forEach((u) => {
							finalCharm 		+= charmPos++ + ": " + u.nickname + " - " + (u.totalCharm || 0) + " ";
						});

						processor.sendMessage(finalCharm);
					});
				break;

				// Messaging ranking
				case "message":
				case "messages":
					this.database.Members.findAll({
						attributes: 		["nickname", "totalMessages"],
						order: 				[["totalMessages", "DESC"]],
						limit: 				10
					})
					.then((members) => {
						let finalMsg 		= "";
						let messagePos 		= 1;

						members.forEach((u) => {
							finalMsg 		+= messagePos++ + ": " + u.nickname + " - " + (u.totalMessages || 0) + " ";
						});

						processor.sendMessage(finalMsg);
					});
				break;
			}
		} else {
			processor.sendMessage(this.getLangMessage("RANKING_OPTIONS"));
		}

		return true;
	});
};