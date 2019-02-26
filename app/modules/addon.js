module.exports 						= {
	name: 							"addon",
	type: 							"module",
	content: 						function(processor) {
		if (processor.arguments.length < 2) {
			return processor.sendMessage(
				processor.getMessage(this.getLangMessage("ADDON_OPTIONS"), {
					addons: 			this.config.addons.join("ou ")
				})
			);
		}

		let subCommand 				= processor.arguments.shift();
		const index 				= processor.arguments.shift();

		// Check if it's a valid addon
		if (!this.config.addons || this.config.addons.indexOf(index) === -1) {
			return false;
		}

		if (subCommand === "set") {
			const value 			= processor.arguments.join(" ");

			// Check if value is empty
			// Because, for any reason, some people don't get
			// how to use "!addon set (something) (anything)" ¯\_(ツ)_/¯
			if (value.length === 0) {
				return processor.sendMessage(
					processor.getMessage(this.getLangMessage("ADDON_VALUE_EMPTY"), {
						addon: 		index
					})
				);
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
				processor.sendMessage(
					processor.getMessage(this.getLangMessage("INTERNAL_ERROR"))
				);
			});
		} else
		if (subCommand === "get") {
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
		} else
		if (subCommand === "list") {
			// Only mods can list members by addons
			if (!processor.sender.isMod) {
				return processor.noPermission();
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
				processor.sendMessage(
					processor.getMessage(this.getLangMessage("INTERNAL_ERROR"))
				);
			});
		}
	}
};