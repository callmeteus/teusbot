module.exports 									= {
	name: 										"ranking",
	type: 										"module",
	onEnter: 									function() {
		this.module.sendTop 					= function(processor, list, arg) {
			let finalMsg 						= "";

			list.forEach((u, index) => {
				finalMsg 						+= (index + 1) + "º: " + u.nickname + " 👉 " + ((u[arg] || 0).toFixed(2)) + "  ";
			});

			processor.sendMessage(finalMsg);
		};
	},
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
					.then((items) => this.module.sendTop(processor, items, "totalMessages"))
					.catch(processor.internalError);
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
					.then((items) => this.module.sendTop(processor, items, "points"))
					.catch(processor.internalError);
				break;

				case "fans":
				case "fan":
				case "intimacy":
					this.client.once("bot.fans", (items) => this.module.sendTop(processor, items, "intimacy"));
					this.client.sockets.passive.packets.getLiveFansList();
				break;
			}
		} else {
			processor.sendMessage(this.client.getLangMessage("RANKING_OPTIONS"));
		}

		return true;
	}
};