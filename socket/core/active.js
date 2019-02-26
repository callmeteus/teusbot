const BotSocket 						= require("./socket");

class BotActiveSocket extends BotSocket {
	constructor(url, type, client) {
		super(url, type, client);

		this.giftList 					= {};
	}

	/**
	 * Register new listeners
	 */
	registerListeners() {
		super.registerListeners();

		this.on("connected", function() {
			this.emit("bot.connected");

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

			// Check if it was active client
			if (this.type === "active") {
				this.packets.getHistoryContribution();
				this.packets.getWatchLiveRewardList();

				// Check if configuration has studio configuration
				if (this.client.config.studioConfig) {
					try {
						const config 	= JSON.parse(this.client.config.studioConfig);
						this.handlers.handleStudioConfig(config, true);
					} catch(e) {
						this.packets.getStudioConfig();
					}
				} else {
					this.packets.getStudioConfig();
				}
			} else {
				// Start the timers
				this.client.startTimers();
			}

			this.doCyclePing();
		});
	}
}

module.exports 							= BotActiveSocket;