module.exports 										= function() {
	this.on("chat.command", function(processor) {
		if (processor.command !== "points") {
			return false;
		}

		if (processor.arguments.length === 0) {
			// Send member points
			processor.sendMessage(
				processor.getMessage(this.getLangMessage("POINTS_GET"))
			);
		} else {
			switch(processor.arguments.shift()) {
				case "alert":
					if (processor.sender.points <= 10) {
						processor.sendMessage(
							processor.getMessage(this.getLangMessage("POINTS_NOT_ENOUGH"))
						);
					} else {
						// Process the message
						const message 				= processor.arguments.join(" ");

						// Check if message has length
						if (message.length === 0) {
							return false;
						}

						// Create a new transaction because
						// the alert creation can fail and
						// we need to revert the points transaction
						this.database.sequelize.transaction((t) => {
							// Remove 10 points from the user
							return this.database.Members.decrement({
								points: 			10
							}, {
								where: 				{
									id: 			processor.sender.id
								},
								transaction: 		t
							})
							.spread(() => {
								// Create the alert
								return this.streamlabs.addAlert({
									type: 			"donation",
									image_href: 	processor.sender.picture,
									message: 		processor.sender.nickname + " enviou um alerta",
									user_message: 	message
								})
								.then(() => {
									// Send the confirmation
									processor.sendMessage(
										processor.getMessage(this.getLangMessage("POINTS_DONE"))
									);
								})
								.catch((e) => {
									// Send an internal error message
									processor.sendMessage(this.getLangMessage("INTERNAL_ERROR"));

									throw e;
								});
							});
						});
					}
				break;
			}
		}

		return true;
	});
};