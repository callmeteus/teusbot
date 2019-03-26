module.exports 												= function(io) {
	io.of("/obs").on("connect", (socket) => {
		// On authenticate
		socket.on("auth", (token) => {
			// Find a channel with the given token
			this.database.Configs.findOne({
				where: 										{
					key: 									"token",
					value: 									token
				},
				attributes: 								["channel"]
			})
			.then((channel) => {
				// Check if channel exists
				if (channel !== null) {
					socket.channel 							= channel.channel;
					socket.join(socket.channel);
					socket.emit("auth", true);
				} else {
					socket.emit("auth", false);
				}
			});
		});

		// On update now playing
		socket.on("nowplaying.update", (data) => {
			this.getClient(socket.channel)
			.then((client) => {
				const mod 									= client.getModule("nowplaying");

				if (mod !== undefined) {
					mod.pending 							= {
						song: 								data.song || null,
						from: 								data.from || null
					};
				}
			});
		});
	});

	io.of("/streamer").on("connect", (socket) => {
		if (socket.handshake.session.channel === undefined) {
			return socket.disconnect();
		}

		socket.channel 										= socket.handshake.session.channel;

		// Join channel room
		socket.join(socket.channel);

		/**
		 * Data packet
		 */
		socket.on("data", () => {
			let data 										= {};

			this.database.getConfig(socket.channel)
			.then((config) => {
				data 										= Object.assign({}, config);

				delete data.password;
				delete data.deviceId;
				delete data.studioConfig;

				data.stream 								= {};
				data.isOnline 								= false;

				return new Promise((resolve, reject) => {
					return this.getClient(socket.channel)
					.then((client) => {
						data.isOnline 						= true;
						data.stream 						= client.stream;

						resolve(data);
					})
					.catch(resolve);
				});
			})
			.then((data) => {
				socket.config 								= data;
				return this.database.getCommands(socket.channel)
			})
			.then((commands) => {
				data.commands 								= commands;

				return this.database.getTimers(socket.channel);
			})
			.then((timers) => {
				data.timers 								= timers;
				socket.emit("data", data);
			})
			.catch((err) => {
				throw err;
			});
		});

		/**
		 * Modules information packet
		 */
		socket.on("modules", () => {
			this.getClient(socket.channel)
			.then((client) => {
				if (client.getModule("songrequest") !== undefined) {
					socket.emit("obs.data", "songrequest.update", client.getModule("songrequest").playlist);
				}

				if (client.getModule("nowplaying") !== undefined) {
					socket.emit("obs.data", "nowplaying.update", client.getModule("nowplaying").current);
				}
			});
		});

		/**
		 * Command add packet
		 */
		socket.on("command.add", (data) => {
			if (typeof data !== "object") {
				return false;
			}

			data.channel 									= socket.channel;
			data.name 										= data.name ? data.name.replace("!", "").toLowerCase() : null;

			// Check if command exists
			this.database.BotCommands.findOne({
				where: 										{
					name: 									data.name,
					channel: 								data.channel
				}
			})
			.then((found) => {
				if (found === null) {
					return this.database.BotCommands.create(data);
				} else {
					data.id 								= found.id;

					return this.database.BotCommands.update(data, {
						where: 								{
							id: 							data.id
						}
					});
				}
			})
			.then((command) => {
				socket.emit("command.add", command.toJSON());

				// Get bot active client
				this.getClient(socket.channel)
				.then((client) => {
					// Find the command
					const id 								= client.commands.findIndex((t) => t.id === command.id);

					// Check if command exists
					if (id === -1) {
						// Register the new command
						client.registerCommand(command.toJSON());
					} else {
						// Update command values
						Object.keys(command).forEach((key) => {
							client.commands[id][key] 		= command[key];
						});
					}
				});
			})
			.catch((err) => {
				socket.emit("command.add", {
					command: 								data.name,
					error: 									err.message
				});
			});
		});

		/**
		 * Command remove packet
		 */
		socket.on("command.remove", (id) => {
			this.database.BotCommands.destroy({
				where: 										{
					id: 									id,
					channel: 								socket.channel
				}
			})
			.then(() => {
				socket.emit("command.remove", {
					command: 								id
				});

				// Get bot active client
				this.getClient(socket.channel)
				.then((client) => {
					// Remove command from currently connected client
					client.commands.splice(client.commands.findIndex((c) => c.id === id), 1);
				});
			})
			.catch((err) => {
				socket.emit("command.remove", {
					command: 								id,
					error: 									err.message
				});
			})
		});

		/**
		 * Timer add packet
		 */
		socket.on("timer.add", (data) => {
			if (typeof data !== "object") {
				return false;
			}

			data.channel 									= socket.channel;
			data.name 										= data.name ? data.name : null;

			if (data.type === "command" && data.content[0] === "!") {
				data.content 								= data.content.substr(1, data.content.length);
			}

			// Check if timer exists
			this.database.BotTimers.findOne({
				where: 										{
					name: 									data.name,
					channel: 								data.channel
				}
			})
			.then((found) => {
				if (found === null) {
					return this.database.BotTimers.create(data);
				} else {
					data.id 								= found.id;

					return this.database.BotTimers.update(data, {
						where: 								{
							id: 							data.id
						}
					});
				}
			})
			.then((timer) => {
				socket.emit("timer.add", timer.toJSON());

				// Get bot active client
				this.getClient(socket.channel)
				.then((client) => {
					// Find the timer
					const id 								= client.timers.findIndex((t) => t.id === timer.id);

					// Check if timer exists
					if (id === -1) {
						// Register the new timer
						const id 							= client.registerTimer(timer.toJSON()) - 1;

						// Start the timer
						client.startTimer(id);
					} else {
						// Update timer values
						Object.keys(timer).forEach((key) => {
							client.timers[id][key] 			= timer[key];
						});
					}
				});
			})
			.catch((err) => {
				socket.emit("timer.add", {
					timer: 									data.name,
					error: 									err.message
				});
			});
		});

		/**
		 * Timer remove packet
		 */
		socket.on("timer.remove", (id) => {
			this.database.BotTimers.destroy({
				where: 										{
					id: 									id,
					channel: 								socket.channel
				}
			})
			.then(() => {
				socket.emit("timer.remove", {
					timer: 									id
				});

				// Get bot active client
				this.getClient(socket.channel)
				.then((client) => {
					const timer 	 						= client.timers.findIndex((t) => t.id === id);

					// Stop the timer
					client.stopTimer(client.timers[timer]);

					// Remove timer from currently connected client
					client.timers.splice(timer, 1);
				});
			})
			.catch((err) => {
				socket.emit("timer.remove", {
					timer: 									id,
					error: 									err.message
				});
			})
		});

		/**
		 * Bot enter / leave channel packet
		 */
		socket.on("bot.enter", () => {
			// Get current bot client
			this.getClient(socket.channel)
			.then((client) => {
				// End if it's connected
				client.end();

				// Remove from client handler
				this.clients.splice(client.instance - 1, 1);

				socket.emit("bot.enter", {
					isIn: 									false
				});
			})
			.catch((e) => {
				// Create a new bot client
				this.createBotClient(socket.channel)
				.then((client) => {
					// Start it
					return this.startBotClient(client);
				})
				.then(() => {
					socket.emit("bot.enter", {
						isIn: 								true
					});
				})
				.catch((err) => {
					socket.emit("bot.enter", {
						error: 								err.message
					});

					throw err;
				});
			});
		});

		/**
		 * StreamLabs test packet
		 */
		socket.on("bot.test", (type) => {
			if (type === "alert") {
				this.streamlabs.addAlert(socket.config.streamLabsToken, {
					type: 									"donation",
					image_href: 							"http://placekitten.com/408/287",
					duration: 								10000,
					message: 								"This is a test donate alert.",
					user_message: 							"Sent by Teus Bot"
				});
			} else
			if (type === "donation") {
				this.streamlabs.addDonation(socket.config.streamLabsToken, {
					name: 									this.auth.getData().user.nickname,
					identifier: 							"streamcraft#123test",
					amount: 								0.1,
					currency: 								"USD",
					message: 								"This is a test donation"
				});
			}
		});

		/**
		 * Bot reload modules
		 */
		socket.on("bot.modules.reload", () => {
			this.getClient(socket.channel)
			.then((client) => {
				// First remove all modules
				client.commands.forEach((mod, index) => {
					if (mod.type === "module" || mod.type === "addon") {
						client.commands.splice(index, 1);
					}
				});

				// Then register it all again
				this.loadClientModules(client);
			});
		});

		/**
		 * Bot command packet
		 */
		socket.on("bot.command", (command, args) => {
			this.getClient(socket.channel)
			.then((client) => {				
				client.processCommand(client.createCommand(command, args, client.sockets.passive, client.botMember));

				socket.emit("bot.command", {
					command: 								command,
					success: 								true
				});
			})
			.catch((e) => {
				socket.emit("bot.command", {
					command: 								command,
					success: 								false
				});
			});
		});

		/**
		 * Bot settings update
		 */
		socket.on("settings.update", (key, value) => {
			if (key === undefined || value === undefined || key === "active") {
				return false;
			}

			value 											= String(value);

			this.database.Configs.count({
				where: 										{
					key: 									key,
					channel: 								socket.channel
				}
			})
			.then((count) => {
				if (count) {
					return this.database.Configs.update({
						value: 								value
					}, {
						where: 								{
							key: 							key,
							channel:						socket.channel
						}
					});
				} else {
					return this.database.Configs.create({
						channel: 							socket.channel,
						key: 								key,
						value: 								value
					});
				}
			})
			.then((result) => {
				// Get bot client and update config if it's connected
				this.getClient(socket.channel)
				.then((client) => {
					client.config[index] 					= value;
				});

				socket.emit("settings.update", {
					key: 									result.key,
					value: 									result.value
				});
			})
			.catch((e) => {
				socket.emit("settings.update", {
					error: 									e.message
				});

				throw e;
			})
		});

		/**
		 * SongRequest listen packet
		 */
		socket.on("songrequest.listen", (url) => {
			// Get bot client and update module Song Request if it's connected
			this.getClient(socket.channel)
			.then((client) => {				
				const mod 									= client.getModule("songrequest");
				const song 									= mod.playlist.find((song) => song.url === url);

				mod.song 									= song.title;
			});
		});

		/**
		 * SongRequest end listening packet
		 */
		socket.on("songrequest.end", () => {
			// Get bot client and update module Song Request if it's connected
			this.getClient(socket.channel)
			.then((client) => {				
				const mod 									= client.getModule("songrequest");
				const song 									= mod.playlist.findIndex((song) => song.title === mod.song);

				mod.playlist.splice(song, 1);

				mod.song 									= null;
			});
		});
	});
};