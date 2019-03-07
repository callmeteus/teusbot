const md5 						= require("md5");

module.exports 					= function(router, bot) {
	router.get("/api/session", (req, res) => {
		res.json({ success: req.session.channel !== undefined });
	});

	router.post("/api/auth", (req, res) => {
		const data 				= {
			email: 				req.body.email,
			password: 			md5(req.body.password)
		};

		bot.database.Configs.findOne({
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

			data.channel 		= email.channel;

			return bot.database.Configs.count({
				where: 			{
					channel: 	data.channel,
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

			req.session.channel = data.channel;
			
			res.json({ success: true });
		})
		.catch((err) => {
			res.json({ success: false, error: "Internal error." });
			throw err;
		});
	});

	router.post("/api/register", (req, res) => {
		const data 				= {
			email: 				req.body.email,
			password: 			md5(req.body.password)
		};

		// Count users with given email or channels
		bot.database.Configs.count({
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
				return req.json({ success: false, error: "Email or channel already exists." });
			}

			// Try to authenticate with StreamCraft
			return bot.auth.login(data.email, data.password);
		})
		.then(() => {
			bot.database.Configs.bulkCreate([
				{ key: "email", value: data.email, channel: data.channel },
				{ key: "password", value: data.password, channel: data.channel },
				{ key: "active", value: 0, channel: data.channel },
				{ key: "deviceId", value: Math.random().toString(12).substring(2), channel: data.channel }
			])
			.spread(() => {
				req.json({ success: true, channel: data.channel });
			})
			.catch((err) => {
				req.json({ success: false, error: "Internal error." });

				throw err;
			});
		})
		.catch((err) => {
			socket.emit("register", {
				error: 			err
			});
		});
	});

	router.get("/streamer/streamlabs", (req, res) => {
		// Check if user is logged in
		if (!req.session.channel) {
			return res.end();
		}

		// Check if code is defined
		if (req.query.code === undefined) {
			const url 				= bot.streamlabs.getAuthorizationUrl();

			// Redirect to authorization
			res.redirect(url);
		} else {
			// Connect the Streamlabs
			bot.streamlabs.getAccessToken(req.query.code)
			.then((res) => {
				return bot.database.Configs.upsert({
					key: 			"streamLabsToken",
					channel: 		req.session.channel,
					value: 			res.access_token
				});
			})
			.then(() => res.send("<script>window.close();</script>"))
			.catch((err) => {
				res.send("Error");
				throw err;
			});
		}
	});
};