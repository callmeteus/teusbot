class BotMember {
	constructor(data) {
		this.id 			= data.id;
		this.nickname 		= data.nickname;
		this.username 		= data.username;
		this.picture 		= data.picture;
		this.level 			= data.level;
		this.access 		= data.access;

		this.isMod 			= data.access > 1;

		this.messages 		= data.messages;
		this.totalMessages 	= data.totalMessages;

		this.points 		= data.points;

		this.tag 			= data.tag;

		this.addons 		= data.addons;
	}

	isSuspicious() {
		return (
			// Is member picture null?
			this.picture === null ||
			// Member picture is from WeGamers CDN?
			this.picture.indexOf("wegamers") > -1 ||
			// Member username is null and is coming from watcher list?
			this.username === null ||
			// Member nickname is null?
			this.nickname === null
		);
	}

	getMediumMessages(from, interval = 60) {
		return this.messages * interval / ((+new Date() - from) / 1000);
	}
}

module.exports 				= BotMember;