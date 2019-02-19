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

			this.signIn(this.client.auth.getData().user.token, this.client.auth.getData().user.uin, this.client.auth.getData().data.user.roomid);

			if (this.type === "active") {
				// Send authentication packet
				this.reauth();
			} else {
				// Send enter packet
				this.enter();
			}
		});

		this.on("disconnected", () => {
			this.emit("bot.disconnected");
		});

		/* ----------------------------------------------------------------------------- */

		this.on("bot.login", (data) => {
			if (data.success === true && this.type === "active") {
				this.client.sockets.active.getStudioConfig();
				this.client.sockets.active.getHistoryContribution();
				this.client.sockets.active.getWatchLiveRewardList();
			}

			this.doCyclePing();
		});
	}

	/**
	 * Request studio configuration
	 */
	getStudioConfig() {
		const seq 						= this.seqno();
			const data 					= {
			ConfigureType: 				287
		};

		this.sendPacket(300102, this.jsonstr(data, seq), seq);
	}

	getWatchLiveRewardList(initFlag = 1) {
		const seq 						= this.seqno();

		const data 						= {
			RoomId: 					this._sid,
			InitFlag: 					initFlag
		};

		this.sendPacket(900083, this.jsonstr(data, seq), seq);
	}

	getHistoryContribution(offset = 0) {
		const seq 						= this.seqno();

		const data 						= {
			RoomId: 					this._sid,
			Offset: 					offset
		};

		this.sendPacket(300113, this.jsonstr(data, seq), seq);
	}

	signIn(token, uin, sid) {
		this._token 					= token;
		this._uin 						= uin;
		this._sid 						= parseInt(sid, 10);
	}

	reauth() {
		const seq 						= this.seqno();

		const data 						= {
			RandomEncryKey: 			this.wrapper(BotSocket.getRandomString(4))
		};

		this.attaches(data);
		this.sendPacket(300003, this.jsonstr(data, seq), seq);
	}

	enter(videoId) {
		const seq 						= this.seqno();

		this._vid 						= videoId ? parseInt(videoId, 10) : 0;

		const data 						= {
			StudioId: 					this._sid,
			VideoId: 					this._vid
		};

		this.sendPacket(300100, this.jsonstr(data, seq), seq);
	}
}

module.exports 							= BotActiveSocket;