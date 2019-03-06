module.exports 										= {
	name: 											"points",
	type: 											"module",
	onEnter: 										function() {
		this.module.currentPoints 					= 0;
		this.module.currentArgument 				= null;

		this.module.doInterval 						= (isForce) => {
			/*if (!isForce && !this.client.stream.isOnline) {
				console.error("[points] channel is not online.");
				return false;
			}*/

			this.module.currentPoints 				= Math.floor(Math.random() * 50) + 1;
			this.module.currentArgument 			= Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 7);

			if (this.client.sockets.passive) {
				this.client.sockets.passive.sendMessage(`❗ SORTEIO DE PONTOS! O primeiro a enviar o comando "!points raffle ${this.module.currentArgument}" receberá ${this.module.currentPoints} pontos!`);
			}
		};

		this.module.doTransaction 					= (processor, amount, action) => {
			// Check if sender have enough points
			// to complete the transaction
			if (processor.sender.points <= amount) {
				return processor.sendMessage(this.client.getLangMessage("POINTS_NOT_ENOUGH"), {
					cost: 							amount
				});
			}

			// Create a new transaction because
			// something can fail and
			// we need to revert the points transaction
			this.client.database.sequelize.transaction((t) => {
				// Remove "amount" points from the user
				return this.client.database.Members.decrement({
					points: 						amount
				}, {
					where: 							{
						id: 						processor.sender.id
					},
					transaction: 					t
				})
				.spread(() => {
					// Do the action
					return new Promise((resolve, reject) => {
						if (!action) {
							return resolve();
						}

						return action()
						.then(resolve)
						.catch(reject);
					});
				})
				.then(() => {
					this.client.emit("module.points", {
						sender: 					processor.sender,
						command: 					processor.arguments[0],
						amount: 					amount
					});

					// Send the confirmation
					processor.sendMessage(this.client.getLangMessage("POINTS_DONE"), {
						cost: 						amount
					});
				})
				.catch((e) => processor.internalError(e));
			});
		};

		setInterval(this.module.doInterval, 60 * 1000 * 10);

		this.module.doInterval();
	},
	content: 										function(processor) {
		const command 								= processor.arguments[0];

		// Check if command is defined
		if (command === undefined) {
			// Send member points
			processor.sendMessage(
				processor.getMessage(this.client.getLangMessage("POINTS_GET"))
			);
		} else {
			switch(command) {
				case "alert":
					// Process the message
					const message 					= processor.arguments.join(" ");

					// Check if message has length
					if (message.trim().length === 0) {
						return processor.sendMessage("❗ Você precisa especificar uma mensagem para usar o comando !points alert, ex.: !points alert Olá mundo!");
					}

					// Capitalize first letter
					message[0] 						= message[0].toUpperCase();

					// Create a new transaction
					this.module.doTransaction(processor, 50, () => new Promise((resolve, reject) => {
						this.client.streamlabs.addAlert(this.client.config.streamLabsToken, {
							type: 					"donation",
							image_href: 			processor.sender.picture,
							message: 				processor.sender.nickname + " enviou um alerta",
							user_message: 			message
						})
						.then(resolve)
						.catch(reject);
					}));
				break;

				case "play":
					// Create a new transaction
					this.module.doTransaction(processor, 150);
				break;

				case "raffle":
					const userArgument 						= processor.arguments[1];

					if (this.module.currentArgument !== null) {
						if (userArgument === this.module.currentArgument) {
							// Reset the this.module.current argument
							// to prevent a double shot
							this.module.currentArgument 	= null;

							// Increment winner points
							this.client.database.Members.increment({
								points: 					this.module.currentPoints
							}, {
								where: 						{
									id: 					processor.sender.id
								}
							})
							.spread(() => {
								// Notify the winner
								processor.sendMessage(`✔️ Parabéns @${processor.sender.nickname}! Você ganhou ${this.module.currentPoints} pontos!`);

								// Reset the points
								this.module.currentPoints	= 0;
							})
							.catch((e) => {
								processor.internalError(e);

								// Reset the argument
								this.module.currentArgument = command;
							});
						} else {
							processor.sendMessage(`❗ Whoops @${processor.sender.nickname}, você errou!`);
						}
					} else {
						processor.sendMessage(`❗ Ei @${processor.sender.nickname}, não tem nenhum sorteio rolando agora!`);
					}
				break;

				case "forceraffle":
					if (processor.sender.isMod) {
						this.module.doInterval.call(this, true);
					} else {
						processor.noPermission();
					}
				break;

				case "set":
					if (!processor.sender.isMod) {
						return processor.noPermission();
					}

					let setUser 					= processor.arguments[1];
					let setAmount 					= processor.arguments[2];

					if (setUser === undefined || setAmount === undefined) {
						return processor.invalidArguments();
					}

					setUser 						= parseInt(setUser, 10);
					setAmount 						= parseInt(setAmount, 10);

					this.client.database.Members.update({
						points: 					setAmount
					}, {
						where: 						{
							id: 					setUser
						}
					})
					.spread(() => {
						processor.sendMessage(this.client.getLangMessage("POINTS_SET_SUCCESS"), {
							id: 					setUser,
							amount: 				setAmount
						});
					})
					.catch((e) => processor.internalError(e));
				break;

				case "give":
					let giveUser 					= processor.arguments[1];
					let giveAmount 					= processor.arguments[2];

					if (giveUser === undefined || giveAmount === undefined) {
						return processor.invalidArguments();
					}

					giveUser 						= parseInt(giveUser, 10);
					giveAmount 						= parseInt(giveAmount, 10);

					// Check if sender has the amount to send for
					// the desired ID
					if (giveAmount > processor.sender.points) {
						return processor.sendMessage(this.client.getLangMessage("POINTS_NOT_ENOUGH"), {
							cost: 					giveAmount
						});
					}

					this.client.database.sequelize.transaction((t) => {
						return this.client.database.Members.increment({
							points: 				giveAmount
						}, {
							where: 					{
								id: 				giveUser
							},
							transaction: 			t
						})
						.spread(() => {
							return this.client.database.Members.decrement({
								points: 			giveAmount
							}, {
								where: 				{
									id: 			processor.sender.id
								},
								transaction: 		t
							});
						})
						.then(() => {
							processor.sendMessage(this.client.getLangMessage("POINTS_GIVE_SUCCESS"), {
								id: 				giveUser,
								amount: 			giveAmount
							});
						})
						.catch((e) => processor.internalError(e));
					});
				break;

				case "help":
					processor.sendMessage(this.client.getLangMessage("POINTS_OPTIONS"));
				break;

				default:
					this.client.database.getMember(processor.arguments.join(" "))
					.then((member) => {
						processor.sendMessage(this.client.getLangMessage("POINTS_GET"), {
							sender: 				member
						});
					})
					.catch((e) => processor.internalError(e));
				break;
			}
		}

		return true;
	}
};