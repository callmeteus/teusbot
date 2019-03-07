module.exports 						= function(io) {
	io.of("/obs").on("connect", (socket) => {
		socket.on("auth", (token) => {
			this.database.Configs.findOne({
				where: 				{
					key: 			"token",
					value: 			token
				},
				attributes: 		["channel"]
			})
			.then((channel) => {
				if (channel !== null) {
					socket.channel 	= channel.channel;
					socket.token 	= token;

					socket.join(socket.channel);

					socket.emit("auth", true);
				} else {
					socket.emit("auth", false);
				}
			});
		});
	});

	io.of("/streamer").on("connect", (socket) => {
		if (socket.handshake.session.channel === undefined) {
			return socket.disconnect();
		}

		socket.channel 				= socket.handshake.session.channel;

		// Join channel room
		socket.join(socket.channel);

		/**
		 * Data packet
		 */
		socket.on("data", () => {
			let data 				= {};

			this.database.getConfig(socket.channel)
			.then((config) => {
				data 				= Object.assign({}, config);

				delete data.password;
				delete data.deviceId;
				delete data.studioConfig;
				delete data.token;
				delete data.streamLabsToken;

				const client 		= this.getClient(socket.channel);
				data.isOnline 		= (client !== undefined);

				if (data.isOnline) {
					data.stream 	= client.stream;
				} else {
					data.stream 	= {};
				}

				socket.config 		= data;

				return this.database.getCommands(socket.channel);
			})
			.then((commands) => {
				data.commands 		= commands;
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
			const client 		= this.getClient(socket.channel);

			if (client === undefined) {
				return false;
			}

			if (client.getModule("songrequest") !== undefined) {
				socket.emit("obs.data", "songrequest.update", client.getModule("songrequest").playlist);
			}
		});

		/**
		 * Command add packet
		 */
		socket.on("command.add", (data) => {
			if (typeof data !== "object") {
				return false;
			}

			data.channel 			= socket.channel;
			data.name 				= data.name ? data.name.replace("!", "") : null;

			this.database.BotCommands.findOne({
				where: 				{
					name: 			data.name,
					channel: 		data.channel
				}
			})
			.then((found) => {
				let result;

				if (found === null) {
					result 			= this.database.BotCommands.create(data);
				} else {
					data.id 		= found.id;

					result 			= this.database.BotCommands.update(data, {
						where: 		{
							id: 	data.id
						}
					});
				}

				result.then((command) => {
					socket.emit("command.add", command);
				})
				.catch((err) => {
					socket.emit("command.add", {
						command: 	data.name,
						error: 		err.message
					});
				});
			});
		});

		/**
		 * Command remove packet
		 */
		socket.on("command.remove", (id) => {
			this.database.BotCommands.destroy({
				where: 				{
					id: 			id,
					channel: 		socket.channel
				}
			})
			.then(() => {
				socket.emit("command.remove", {
					command: 		id
				})
			})
			.catch((err) => {
				socket.emit("command.remove", {
					command: 		id,
					error: 			err.message
				})
			})
		});

		/**
		 * Bot enter / leave channel packet
		 */
		socket.on("bot.enter", () => {
			let client 				= this.getClient(socket.channel);

			if (client === undefined) {
				this.createBotClient(socket.channel)
				.then((client) => {
					return this.startBotClient(client);
				})
				.then(() => {
					socket.emit("bot.enter", {
						isIn: 		true
					});
				})
				.catch((err) => {
					socket.emit("bot.enter", {
						error: 		err.message
					});

					throw err;
				});
			} else {
				client.end();

				this.clients.splice(client.instance - 1, 1);

				socket.emit("bot.enter", {
					isIn: 			false
				});
			}
		});

		/**
		 * StreamLabs test packet
		 */
		socket.on("bot.test", (type) => {
			if (type === "alert") {
				this.streamlabs.addAlert(socket.config.streamLabsToken, {
					type: 			"donation",
					image_href: 	"http://placekitten.com/408/287",
					duration: 		10000,
					message: 		"This is a test donate alert.",
					user_message: 	"Sent by Teus Bot"
				});
			} else
			if (type === "donation") {
				this.streamlabs.addDonation(socket.config.streamLabsToken, {
					name: 			this.auth.getData().user.nickname,
					identifier: 	"streamcraft#123test",
					amount: 		0.1,
					currency: 		"USD",
					message: 		"This is a test donation"
				});
			}
		});

		/**
		 * Bot command packet
		 */
		socket.on("bot.command", (command, args) => {
			if (!socket.token) {
				return false;
			}

			const client 			= this.getClient(socket.channel);

			if (client === undefined) {
				return socket.emit("bot.command", {
					command: 		command,
					success: 		false
				});
			} else {
				client.processCommand(client.createCommand(command, args, client.sockets.passive, client.botMember));

				return socket.emit("bot.command", {
					command: 		command,
					success: 		true
				});
			}
		});

		/**
		 * SongRequest listen packet
		 */
		socket.on("songrequest.listen", (url) => {
			if (!socket.token) {
				return false;
			}

			const mod 				= this.getClient(socket.channel).getModule("songrequest");
			const song 				= mod.playlist.find((song) => song.url === url);

			mod.song 				= song.title;
		});

		/**
		 * SongRequest end listening packet
		 */
		socket.on("songrequest.end", () => {
			const mod 				= this.getClient(socket.channel).getModule("songrequest");
			const song 				= mod.playlist.findIndex((song) => song.title === mod.song);

			mod.playlist.splice(song, 1);

			mod.song 				= null;
		});
	});
};