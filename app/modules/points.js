module.exports 								= {
	name: 									"points",
	type: 									"module",
	content: 								function(processor) {
		const command 						= processor.arguments.shift();

		const doTransaction 				= (amount, action) => {
			// Check if sender have enough points
			// to complete the transaction
			if (processor.sender.points <= amount) {
				return processor.sendMessage(
					processor.getMessage(this.getLangMessage("POINTS_NOT_ENOUGH"), {
						cost: 				amount
					})
				);
			}

			// Create a new transaction because
			// something can fail and
			// we need to revert the points transaction
			this.database.sequelize.transaction((t) => {
				// Remove "amount" points from the user
				return this.database.Members.decrement({
					points: 				amount
				}, {
					where: 					{
						id: 				processor.sender.id
					},
					transaction: 			t
				})
				.spread(() => {
					return new Promise((resolve, reject) => {
						if (!action) {
							return resolve();
						}

						// Do the action
						return action.then(() => resolve())
						.catch((e) => {
							t.rollback();
							reject();
						});
					});
				})
				.then(() => {
					this.emit("module.points", {
						sender: 			processor.sender,
						command: 			command,
						amount: 			amount
					});

					// Send the confirmation
					processor.sendMessage(
						processor.getMessage(this.getLangMessage("POINTS_DONE"), {
							cost: 			amount
						})
					);
				})
				.catch((e) => {
					processor.sendMessage(
						processor.getMessage(this.getLangMessage("INTERNAL_ERROR"))
					);

					console.error("[db] points transaction error", e);
				});
			});
		}

		if (command === undefined) {
			// Send member points
			processor.sendMessage(
				processor.getMessage(this.getLangMessage("POINTS_GET"))
			);
		} else {
			switch(command) {
				case "alert":
					// Process the message
					const message 		= processor.arguments.join(" ");

					// Check if message has length
					if (message.length === 0) {
						return processor.sendMessage("Você precisa especificar uma mensagem para usar o comando !points alert, ex.: !points alert Olá mundo!");
					}

					// Create a new transaction
					doTransaction(10, this.streamlabs.addAlert(this.config.streamLabsToken, {
						type: 			"donation",
						image_href: 	processor.sender.picture,
						message: 		processor.sender.nickname + " enviou um alerta",
						user_message: 	message
					}));
				break;

				case "play":
					// Create a new transaction
					doTransaction(Number.MAX_VALUE);
				break;

				default:
				case "help":
					processor.sendMessage(this.getLangMessage("POINTS_OPTIONS"));
				break;
			}
		}

		return true;
	}
};