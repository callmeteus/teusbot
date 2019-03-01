module.exports 						= function(router, bot) {
	router.get("/streamer/streamlabs", (req, res) => {
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
					channel: 		req.query.token,
					value: 			res.access_token
				});
			})
			.then(() => res.redirect("/"))
			.catch((err) => {
				console.error(err);
				res.send("Error");
				throw err;
			});
		}
	});
};