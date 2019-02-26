class BotPackets {
	constructor(socket) {
		this.socket  					= socket;
	}

	/**
	 * Request studio configuration
	 */
	getStudioConfig() {
		const seq 						= this.socket.seqno();

		const data 						= {
			ConfigureType: 				287
		};

		this.socket.sendPacket(300102, this.socket.jsonstr(data, seq), seq);
	}

	getWatchLiveRewardList(initFlag = 1) {
		const seq 						= this.socket.seqno();

		const data 						= {
			RoomId: 					this.socket._sid,
			InitFlag: 					initFlag
		};

		this.socket.sendPacket(900083, this.socket.jsonstr(data, seq), seq);
	}

	getHistoryContribution(offset = 0) {
		const seq 						= this.socket.seqno();

		const data 						= {
			RoomId: 					this.socket._sid,
			Offset: 					offset
		};

		this.socket.sendPacket(300113, this.socket.jsonstr(data, seq), seq);
	}

	muteUser(userId, toggle) {
		const seq 						= this.socket.seqno();

		const data 						= {
			StudioId: 					this.socket._sid,
			GagUin: 					userId,
			OpType: 					toggle
		};

		this.socket.sendPacket(300106, this.socket.jsonstr(data, seq), seq);
	}

	kickUser(userId) {
		const seq 						= this.socket.seqno();

		const data 						= {
			StudioId: 					this.socket._sid,
			OutUin: 					userId
		};

		this.socket.sendPacket(300107, this.socket.jsonstr(data, seq), seq)
	}

	setUserAuthority(user, toggle, access) {
		const seq 						= this.socket.seqno();

		const data 						= {
			StudioId: 					this.socket._sid,
			OpType: 					toggle,
			OpUin: 						user,
			Access: 					access || 2
		};

		this.socket.sendPacket(300112, this.socket.jsonstr(data, seq), seq)
	}

	signIn(token, uin, sid) {
		this.socket._token 				= token;
		this.socket._uin 				= uin;
		this.socket._sid 				= parseInt(sid, 10);
	}

	reauth() {
		const seq 						= this.socket.seqno();

		const data 						= {
			RandomEncryKey: 			this.socket.wrapper(Math.random().toString(12).substring(2))
		};

		this.socket.attaches(data);
		this.socket.sendPacket(300003, this.socket.jsonstr(data, seq), seq);
	}

	enter(videoId) {
		const seq 						= this.socket.seqno();

		this.socket._vid 				= videoId ? parseInt(videoId, 10) : 0;

		const data 						= {
			StudioId: 					this.socket._sid,
			VideoId: 					this.socket._vid
		};

		this.socket.sendPacket(300100, this.socket.jsonstr(data, seq), seq);
	}
}

module.exports 							= BotPackets;