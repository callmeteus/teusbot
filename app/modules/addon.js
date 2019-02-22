module.exports 							= function() {
	this.on("chat.command", function(processor) {
		if (processor.command !== "addon" || processor.arguments.length < 2) {
			return false;
		}

		var args 						= processor.arguments.shift();
		var index 						= processor.arguments.shift();

		switch(args) {
			case "set":
				const value 			= processor.arguments.join(" ");

				// Check if it's a valid addon
				if (!this.config.addons || this.config.addons.indexOf(index) === -1) {
					return false;
				}

				const setAddon 			= processor.sender.addons.filter((addon) => addon.addon === index)[0];

				// Check if user exists or the value is equal
				if (setAddon && setAddon.value === value) {
					return false;
				}

				// Update current member
				this.database.MemberAddons.upsert({
					id: 				setAddon ? setAddon.id : null,
					member: 			processor.sender.id,
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
					
					// Send an internal error message
					processor.sendMessage(this.getLangMessage("INTERNAL_ERROR"));
				});
			break;

			case "get":
				const getAddon 			= processor.sender.addons.filter((addon) => addon.addon === index)[0];

				// Check if sender has addon
				if (getAddon !== undefined) {
					processor.sendMessage(
						processor.getMessage(this.getLangMessage("ADDON_GET"), {
							addon: 	{
								index: 	index,
								value: 	getAddon.value
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

				const amount 			= processor.arguments[0] || 10;

				// Get members by index and that have sent one message
				this.database.Members.findAll({
					where: 				{
						messages: 		{
							$gt: 		1
						}
					},
					include: 			{
						as: 			"addons",
						model:  		this.database.MemberAddons,
						where: 			{
							addon: 		index
						},
						required: 		true
					},
					limit: 				amount,
					order: 				this.database.Sequelize.fn("RANDOM")
				})
				.then((members) => {
					if (members.length) {
						processor.sendMessage(processor.getMessage(this.getLangMessage("ADDON_LIST"), {
							addon: 	{
								index: 	index,
								value: 	members.map((member) => member.addons[0].dataValues.value).join(", ")
							}
						}));
					} else {
						processor.sendMessage(processor.getMessage(this.getLangMessage("ADDON_LIST_EMPTY"), {
							addon: 		{ index }
						}));
					}
				})
				.catch((e) => {
					console.error("[db] addon error", e);
					
					// Send an internal error message
					processor.sendMessage(this.getLangMessage("INTERNAL_ERROR"));
				});
			break;
		}
	});
};