const md5 							= require("md5");

module.exports 						= function(io) {
	io.on("connect", (socket) => {
		socket.on("login", (data) => {
			// Hash the password
			data.password 			= md5(data.password);

			// Check if email and password are right
			if (data.email === this.config.email && data.password === this.config.password) {
				// Generate new token
				this.config.token 	= md5(+new Date());

				// Update database token
				this.database.Configs.update({
					token: 			this.config.token
				}, {
					where: 			{
						id: 		this.config.id
					}
				})
				.spread(() => {
					socket.emit("login", {
						success: 	true,
						token: 		this.config.token
					});
				});
			} else {
				socket.emit("login", {
					success: 		false
				});
			}
		});

		socket.on("auth", (token) => {
			console.info("[bot] authentication", token, this.config.token);

			if (this.config.token === token) {
				socket.emit("auth", true);
				socket.join("bot");

				socket.token 		= token;
			} else {
				socket.emit("auth", false);
			}
		});

		socket.on("data", () => {
			if (!socket.token) {
				return false;
			}

			const data 				= Object.assign({}, this.config);

			delete data.password;
			delete data.slId;
			delete data.slToken;
			delete data.slAccessToken;
			delete data.deviceId;

			data.commands 			= this.commands;
			data.bot 				= this.auth.getData();
			data.timers 			= this.timers;

			socket.emit("data", data);
		});

		socket.on("test", (type) => {
			if (!socket.token) {
				return false;
			}

			if (type === "alert") {
				this.streamlabs.addAlert({
					type: 			"donation",
					image_href: 	"http://placekitten.com/408/287",
					duration: 		10000,
					message: 		"This is a test donate alert.",
					user_message: 	"Sent by teus bot"
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