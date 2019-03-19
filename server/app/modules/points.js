const request 										= require("request");

function getGifUrl(gif) {
	return new Promise((resolve, reject) => {
		if (gif.indexOf("media.giphy") > -1) {
			return resolve(gif);
		}

		request({
			url: 					gif,
			method: 				"GET",
			insecure: 				true,
			rejectUnauthorized: 	false,
			followAllRedirects: 	true,
			headers: 				{
				"User-Agent": 		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36"
			}
		}, function(err, response, body) {
			if (err) {
				return processor.internalError(err);
			}

			const url 				= /\<meta property\=\"og\:image\" content\=\"(.*)\"(\/)?\>/gi.exec(body);

			if (url === null) {
				return reject();
			}

			resolve(url[1]);
		});
	});
}

function getInstantUrl(instant) {
	return new Promise((resolve, reject) => {
		if (instant.indexOf("/media/sounds/") > -1) {
			return resolve(instant);
		}

		request({
			url: 					instant,
			method: 				"GET",
			insecure: 				true,
			rejectUnauthorized: 	false,
			followAllRedirects: 	true,
			headers: 				{
				"User-Agent": 		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36"
			}
		}, function(err, response, body) {
			if (err) {
				return processor.internalError(err);
			}

			const url 				= /onmousedown\=\"play\(\'(.*)\'\)\"/gi.exec(body);

			if (url === null) {
				return reject();
			}

			resolve("https://www.myinstants.com" + url[1]);
		});
	});
}

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
			processor.sendLangMessage("POINTS_GET");
		} else {
			switch(command) {
				case "alert":
					// Process the message
					const alertMessage 				= processor.arguments.slice(1).join(" ");

					// Check if message has length
					if (alertMessage.trim().length === 0) {
						return processor.sendLangMessage("POINTS_ALERT_NOMESSAGE");
					}

					// Capitalize first letter
					alertMessage[0] 				= alertMessage[0].toUpperCase();

					// Create a new transaction
					this.module.doTransaction(processor, 50, () => new Promise((resolve, reject) => {
						this.client.streamlabs.addAlert(this.client.config.streamLabsToken, {
							type: 					"donation",
							image_href: 			processor.sender.picture,
							message: 				processor.sender.nickname + " enviou um alerta",
							user_message: 			alertMessage
						})
						.then(() => {
							this.client.emit("chat.message", {
								sender: 			processor.sender,
								message: 			"sent an alert: " + alertMessage,
								special: 			true
							});

							resolve();
						})
						.catch(reject);
					}));
				break;

				case "gif":
					// Get the GIF link
					const gif 						= processor.arguments.slice(1)[0];

					// Get the message
					const gifMessage 				= processor.arguments.slice(2).join(" ");

					// Capitalize first letter
					gifMessage[0] 					= gifMessage[0].toUpperCase();

					if (gif.indexOf("giphy.com") === -1) {
						return processor.sendLangMessage("POINTS_GIF_INVALID");
					} else {
						getGifUrl(gif)
						.then((url) => {
							this.module.doTransaction(processor, 100, () => new Promise((resolve, reject) => {
								this.client.streamlabs.addAlert(this.client.config.streamLabsToken, {
									type: 			"donation",
									image_href: 	url,
									sound_href: 	"about:blank",
									message: 		processor.sender.nickname + " enviou um GIF",
									user_message: 	gifMessage
								})
								.then(() => {
									this.client.emit("chat.message", {
										sender: 	processor.sender,
										message: 	"sent a GIF" + (gifMessage.length ? " with a message: " + gifMessage : ""),
										special: 	true
									});

									resolve();
								})
								.catch(reject);
							}));
						});
					}
				break;

				case "instant":
					// Get the instant link
					const instant 					= processor.arguments.slice(1)[0];

					// Get the message
					const instantMessage 			= processor.arguments.slice(2).join(" ");

					// Capitalize first letter
					instantMessage[0] 				= instantMessage[0].toUpperCase();

					if (instant.indexOf("myinstants.com") === -1) {
						return processor.sendLangMessage("POINTS_INSTANT_INVALID");
					} else {
						getInstantUrl(instant)
						.then((url) => {
							this.module.doTransaction(processor, 100, () => new Promise((resolve, reject) => {
								this.client.streamlabs.addAlert(this.client.config.streamLabsToken, {
									type: 			"donation",
									image_href: 	processor.sender.picture,
									sound_href: 	url,
									message: 		processor.sender.nickname + " enviou um instant",
									user_message: 	instantMessage
								})
								.then(() => {
									this.client.emit("chat.message", {
										sender: 	processor.sender,
										message: 	"sent an instant" + (instantMessage.length ? " with a message: " + instantMessage : ""),
										special: 	true
									});

									resolve();
								})
								.catch(reject);
							}));
						});
					}
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
					processor.getMember(processor.arguments.join(" "))
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