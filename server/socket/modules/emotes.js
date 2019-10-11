module.exports 					= function(emote, emoteData) {
	// Process emote message
	const emoteMessage 			= this.getMessage(this.getLangMessage("CHAT_EMOTE"), {
		sender: 				user,
		emote: 					emote
	});

	// Emit chat message
	this.emit("chat.message", {
		sender: 				user,
		message: 				emoteMessage,
		special: 				true
	});

	// Emit emote sent
	this.emit("chat.emote", {
		sender: 				user,
		emote: 					emote
	});

	// TODO: make the Rocketship and the Fan Club Ticket appear on the screen
	// not using the addDonation function.
	// It's a TODO because we need to figure out a delay between
	// appearing in the screen, because you can send multiple Rocketships or
	// Fan Club Tickets at once and flood the chat.

	// Check if emote has a cost
	if (emoteData.coins > 0) {
		// Create a new donation at StreamLabs
		this.config.canReply && this.streamlabs.addDonation(this.config.streamLabsToken, {
			name: 				user.nickname,
			identifier: 		"streamcraft#" + user.id,
			amount: 			emote.cost / 100,
			currency: 			"USD",
			message: 			user.nickname + " " + emoteMessage.replace(/<(?:.|\n)*?>/gm, "")
		});
	}

	// Check if emote has any cost
	if (emoteData.silver > 0 || emoteData.cost > 0) {
		// Give points to user based on cost
		this.database.Members.increment({
			// If the cost is in silver, we just convert it into points
			// or if it's based in coins, duplicate the points
			points: 			emoteData.silver > 0 ? emoteData.silver : (emoteData.cost * 2)
		}, {
			where: 				{
				id: 			user.id,
				channel: 		this.data.data.user.uin
			}
		})
		.catch((e) => {
			console.error("[bot] error giving emote points to user:", e);
		});
	}
};