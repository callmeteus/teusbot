module.exports 									= {
	name: 										"ranking",
	type: 										"module",
	content: 									function(processor) {
		// Check if has arguments
		if (processor.arguments.length > 0) {
			// Process command
			switch(processor.arguments[0]) {
				// Messaging ranking
				case "message":
				case "messages":
					this.client.database.Members.findAll({
						attributes: 		["nickname", "totalMessages"],
						order: 				[["totalMessages", "DESC"]],
						limit: 				10,
						where: 				{
							id: 			{
								$not: 		this.client.data.data.user.uin
							}
						}
					})
					.then((members) => {
						let finalMsg 		= "";
						let messagePos 		= 1;

						members.forEach((u) => {
							finalMsg 		+= messagePos++ + "º: " + u.nickname + " 👉 " + (u.totalMessages || 0) + " ";
						});

						processor.sendMessage(finalMsg);
					})
					.catch((e) => {
						processor.internalError(e);
					});
				break;

				// Points ranking
				case "point":
				case "points":
					this.client.database.Members.findAll({
						attributes: 		["nickname", "points"],
						order: 				[["points", "DESC"]],
						limit: 				10,
						where: 				{
							id: 			{
								$not: 		this.client.data.data.user.uin
							}
						}
					})
					.then((members) => {
						let finalMsg 		= "";
						let messagePos 		= 1;

						members.forEach((u) => {
							finalMsg 		+= messagePos++ + "º: " + u.nickname + " 👉 " + ((u.points || 0).toFixed(2)) + "  ";
						});

						processor.sendMessage(finalMsg);
					})
					.catch((e) => {
						processor.internalError(e);
					});
				break;
			}
		} else {
			processor.sendMessage(this.client.getLangMessage("RANKING_OPTIONS"));
		}

		return true;
	}
};