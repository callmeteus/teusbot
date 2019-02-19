module.exports 							= function() {
	this.on("chat.command", function(processor) {
		if (processor.command !== "addon" || processor.arguments.length < 2) {
			return false;
		}

		const arg 						= processor.arguments.shift();
		const index 					= processor.arguments.shift();

		switch(args) {
			case "set":
				const value 			= processor.arguments.join(" ");

				// Check if it's a valid addon
				if (!this.config.addons || this.config.addons.indexOf(index) === -1) {
					return false;
				}

				// Instantiate processor sender
				const member 			= processor.sender;

				// Check if user exists or the value is equal
				if (member.addons[index] === value) {
					return false;
				}

				// Update sender addon
				member.addons[index] 	= value;

				// Update current member
				this.database.MemberAddons.upsert({
					member: 			member.id,
					addon: 				index,
					value: 				value
				})
				.then(() => {
					// Send confirmation
					processor.sendMessage(
						processor.getMessage(this.getLangMessage("ADDON_SET"), {
							addon: 		{
								value: 	value,
								index: 	index
							}
						})
					);
				})
				.catch((e) => {
					console.error("[db] addon error", e);
					processor.sendMessage("Internal error");
				});
			break;

			case "get":
				// Check if sender has addno
				if (processor.sender.addons[index] !== undefined) {
					processor.sendMessage(
						processor.getMessage(this.getLangMessage("ADDON_GET"), {
							addon: 	{
								index: 	index,
								value: 	processor.sender.addons[index]
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
			break;

			case "list":
				// Only mods can list members by addons
				if (!processor.sender.isMod) {
					return false;
				}

				const index 			= processor.arguments[0];
				const amount 			= processor.arguments[1] || 10;

				// Get members by index and that have sent one message
				this.database.MemberAddons.findAll({
					where: 				{
						addon: 			index
					},
					limit: 				amount
				})
				.then((members) => {					
					if (members.length) {
						processor.sendMessage(processor.getMessage(this.getLangMessage("ADDON_LIST"), {
							addon: 	{
								index: 		index,
								value: 		members.join(", ")
							}
						}));
					} else {
						processor.sendMessage(processor.getMessage(this.getLangMessage("ADDON_LIST_EMPTY"), {
							addon: 	{ index }
						}));
					}
				});
			break;
		}
	});
};