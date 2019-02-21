module.exports 						= function(router, BotClient) {
	router.get("/streamlabs", (req, res) => {
		if (req.query["code"] === undefined) {
			res.redirect(BotClient.streamlabs.authorizationUrl());
		} else {
			BotClient.streamlabs.connect(req.query["code"]).then((res) => {
				BotClient.database.Configs.update({
					slAccessToken: 	BotClient.streamlabs.getCredentials().accessToken
				}, {
					where: 			{
						id: 		BotClient.config.id
					}
				});

				res.redirect("/");
			})
			.catch((err) => {
				throw err;
			});
		}
	});
};