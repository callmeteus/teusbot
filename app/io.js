const md5 							= require("md5");

module.exports 						= function(io) {
	io.on("connect", (socket) => {
		socket.on("login", (data) => {
			// Hash the password
			data.password 			= md5(data.password);

			this.database.Configs.findOne({
				where: 				{
					key: 			"email",
					value: 			data.email
				},
				attributes: 		["channel"]
			})
			.then((email) => {
				if (email === null) {
					return socket.emit("login", {
						error: 		"Invalid email address"
					});
				}

				return this.database.Configs.count({
					where: 			{
						channel: 	email.channel,
						key: 		"password",
						value: 		data.password
					}
				});
			})
			.then((count) => {
				if (count === 0) {
					return socket.emit("login", {
						error: 		"The password you've entered is incorrect."
					});
				}

				// Generate new token
				socket.token 		= md5(+new Date());

				// Update database token
				return this.database.Configs.create({
					key: 			"token",
					channel: 		email.channel,
					value: 			socket.token
				});
			})
			.then(() => {
				socket.emit("login", {
					token: 			socket.token
				});
			})
			.catch((err) => {
				socket.emit("login", {
					error: 			"Internal error"
				});

				throw err;
			});
		});

		socket.on("register", (data) => {
			// Hash the password
			data.password 			= md5(data.password);

			// Count users with given email or channels
			this.database.Configs.count({
				where: 				[
					{
						key: 		"email",
						value: 		data.email
					},
					{
						channel: 	data.channel
					}
				]
			})
			.then((count) => {
				// Check is any user has the
				// email or channel ID
				if (count > 0) {
					return socket.emit("register", {
						error: 		"Email or channel already exists."	
					});
				}

				// Try to authenticate with StreamCraft
				return this.auth.login(data.email, data.password);
			})
			.then(() => {
				this.database.Configs.bulkCreate([
					{ key: "email", value: data.email, channel: data.channel },
					{ key: "password", value: data.password, channel: data.channel },
					{ key: "active", value: 0, channel: data.channel },
					{ key: "deviceId", value: Math.random().toString(12).substring(2), channel: data.channel }
				])
				.spread(() => {
					socket.emit("register", {
						channel: 	data.channel
					})
				})
				.catch((err) => {
					socket.emit("register", {
						error: 		"Internal error"
					});

					throw err;
				});
			})
			.catch((err) => {
				socket.emit("register", {
					error: 			err
				})
			});
		});

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

					socket.emit("auth", true);
				} else {
					socket.emit("auth", false);
				}
			});
		});

		socket.on("data", () => {
			if (!socket.token) {
				return false;
			}

			let data 				= {};

			this.database.getConfig(socket.channel)
			.then((config) => {
				data 				= Object.assign({}, config);

				delete data.password;
				delete data.deviceId;

				data.isOnline 		= (this.getClient(socket.channel) !== undefined);

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

		socket.on("command.add", (data) => {
			if (!socket.token || typeof data !== "object") {
				return false;
			}

			data.channel 			= socket.channel;
			data.name 				= data.name ? data.name.replace("!", "") : null;

			this.database.BotCommands.upsert(data).then((command) => {
				socket.emit("command.add", command);
			})
			.catch((err) => {
				socket.emit("command.add", {
					error: 			err.message
				})
			});
		});

		socket.on("bot.enter", () => {
			let client 				= this.getClient(socket.channel);

			if (client === undefined) {
				this.createBotClient(socket.channel)
				.then((client) => {;
					return this.startBotClient(client)
				})
				.then(() => {
					socket.emit("bot.enter", true);
				})
				.catch((err) => {
					socket.emit("bot.enter", false);
					throw err;
				});
			}
		});

		socket.on("bot.test", (type) => {
			if (!socket.token) {
				return false;
			}

			if (type === "alert") {
				this.streamlabs.addAlert({
					type: 			"donation",
					image_href: 	"http://placekitten.com/408/287",
					duration: 		10000,
					message: 		"This is a test donate alert.",
					user_message: 	"Sent by Teus Bot"
				});
			} else
			if (type === "donation") {
				this.streamlabs.addDonation({
					name: 			this.auth.getData().user.nickname,
					identifier: 	"streamcraft#123test",
					amount: 		0.1,
					currency: 		"USD",
					message: 		"This is a test donation"
				});
			}
		});
	});
};