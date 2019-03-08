const BotSocket 						= require("./socket");

class BotActiveSocket extends BotSocket {
	constructor(url, type, client) {
		super(url, type, client);
	}

	/**
	 * Register new listeners
	 */
	registerListeners() {
		super.registerListeners();

		this.on("connected", function() {
			this.emit("bot.connected");

			// Sign in socket
			this.packets.signIn(this.client.data.user.token, this.client.data.user.uin, this.client.data.data.user.roomid);

			if (this.type === "active") {
				// Send authentication packet
				this.packets.reauth();
			} else {
				// Send enter packet
				this.packets.enter();
			}
		});

		this.on("disconnected", () => {
			this.emit("bot.disconnected");
		});

		/* ----------------------------------------------------------------------------- */

		this.on("bot.login", (data) => {
			if (!data.success === true) {
				return false;
			}

			// Start ping
			this.doCyclePing();

			// Check if it was active client
			if (this.type !== "active") {
				// Start the timers
				this.client.startTimers();
			} else {
				this.packets.getHistoryContribution();
				this.packets.getWatchLiveRewardList();
				this.packets.getStudioConfig();
			}
		});
	}
}

module.exports 							= BotActiveSocket;