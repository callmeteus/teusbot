module.exports 								= function() {
	this.on("chat.command", function(processor) {
		if (processor.command !== "addon" || !processor.arguments.length) {
			return true;
		}

		switch(processor.arguments.shift()) {
			case "set":
				if (processor.arguments[0] !== undefined) {
					const index 			= processor.arguments.shift();
					const value 			= processor.arguments.join(" ");

					// Check if it's a valid addon
					if (!this.config.addons || this.config.addons.indexOf(index) === -1) {
						return false;
					}

					// Get the current user
					const user 				= this.database.get("members").find({
						id: 				processor.sender.id
					})
					.value();

					// Check if user exists or the value is equal
					if (user === undefined || user.addons[index] === value) {
						return false;
					}

					// Update the user addon
					this.database.get("members").find({
						id: 				processor.sender.id
					}).assign({
						addons: 			{
							[index]: 		value
						}
					}).write();

					// Send confirmation
					processor.sendMessage(
						processor.getMessage(this.getLangMessage("ADDON_SET"), {
							addon: 			{
								value: 		value,
								index: 		index
							}
						})
					);
				}
			break;

			case "get":
				if (processor.arguments[0] !== undefined) {
					const index 			= processor.arguments[0];
					
					const member 			= this.database.get("members").find({
						id: 				processor.sender.id
					})
					.value();

					if (member.addons[index] !== undefined) {
						processor.sendMessage(
							processor.getMessage(this.getLangMessage("ADDON_GET"), {
								addon: 	{
									index: 	index,
									value: 	member.addons[index]
								}
							})
						);
					} else {
						processor.sendMessage(
							processor.getMessage(this.getLangMessage("ADDON_EMPTY"), {
								addon: 	{
									index: 	index
								}
							})
						);
					}
				}
			break;

			case "list":
				// Only mods can list users by addons
				if (!processor.sender.isMod) {
					return false;
				}

				if (processor.arguments[0] !== undefined) {
					const index 			= processor.arguments[0];
					const amount 			= processor.arguments[1] || 10;

					// Get users by index and that have sent one message
					const users 			= this.database.get("members")
					.filter((u) => {
						return u.addons[index] !== undefined && u.messages > 0;
					})
					.shuffle()
					.take(amount)
					.map("addons." + index)
					.value();

					if (users.length) {
						processor.sendMessage(processor.getMessage(this.getLangMessage("ADDON_LIST"), {
							addon: 	{
								index: 		index,
								value: 		users.join(", ")
							}
						}));
					} else {
						processor.sendMessage(processor.getMessage(this.getLangMessage("ADDON_LIST_EMPTY"), {
							addon: 	{
								index: 		index
							}
						}));
					}
				}
			break;
		}
	});
};