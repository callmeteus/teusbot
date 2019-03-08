module.exports 						= {
	name: 							"addon",
	type: 							"module",
	content: 						function(processor) {
		if (processor.arguments.length < 2) {
			return processor.sendMessage(
				processor.getMessage(this.client.getLangMessage("ADDON_OPTIONS"), {
					addons: 			this.client.config.addons.join("ou ")
				})
			);
		}

		let subCommand 				= processor.arguments.shift();
		const index 				= processor.arguments.shift();

		// Check if it's a valid addon
		if (!this.client.config.addons || this.client.config.addons.indexOf(index) === -1) {
			return false;
		}

		if (subCommand === "set") {
			const value 			= processor.arguments.join(" ");

			// Check if value is empty
			// Because, for any reason, some people don't get
			// how to use "!addon set (something) (anything)" ¯\_(ツ)_/¯
			if (value.length === 0) {
				return processor.sendMessage(
					processor.getMessage(this.client.getLangMessage("ADDON_VALUE_EMPTY"), {
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
			this.client.database.MemberAddons.upsert({
				id: 				setAddon ? setAddon.id : null,
				member: 			processor.sender.id,
				addon: 				index,
				value: 				value,
				channel: 			this.client.data.user.uin
			})
			.then(() => {
				// Send confirmation
				processor.sendMessage(
					processor.getMessage(this.client.getLangMessage("ADDON_SET"), {
						addon: 		{
							value: 	value,
							index: 	index
						}
					})
				);
			})
			.catch((e) => processor.internalError(e));
		} else
		if (subCommand === "get") {
			const getAddon 			= processor.sender.addons.filter((addon) => addon.addon === index)[0];

			// Check if sender has addon
			if (getAddon !== undefined) {
				processor.sendMessage(
					processor.getMessage(this.client.getLangMessage("ADDON_GET"), {
						addon: 	{
							index: 	index,
							value: 	getAddon.value
						}
					})
				);
			} else {
				processor.sendMessage(
					processor.getMessage(this.client.getLangMessage("ADDON_EMPTY"), {
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
			this.client.database.Members.findAll({
				where: 				{
					messages: 		{
						$gt: 		1
					}
				},
				include: 			{
					as: 			"addons",
					model:  		this.client.database.MemberAddons,
					where: 			{
						addon: 		index
					},
					required: 		true
				},
				limit: 				amount,
				order: 				this.client.database.Sequelize.fn("RANDOM")
			})
			.then((members) => {
				if (members.length) {
					processor.sendMessage(processor.getMessage(this.client.getLangMessage("ADDON_LIST"), {
						addon: 	{
							index: 	index,
							value: 	members.map((member) => member.addons[0].dataValues.value).join(", ")
						}
					}));
				} else {
					processor.sendMessage(processor.getMessage(this.client.getLangMessage("ADDON_LIST_EMPTY"), {
						addon: 		{ index }
					}));
				}
			})
			.catch((e) => {
				processor.internalError(e);
			});
		}
	}
};