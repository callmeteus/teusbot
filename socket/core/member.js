class BotMember {
	constructor(data) {
		this.id 				= data.FromUin || data.id;
		this.nickname 			= data.FromNickName || data.nickname;
		this.picture 			= data.FromHeadImg || data.picture;
		this.isMod 				= data.FromAccess ? data.FromAccess > 1 : data.isMod;
		this.level 				= data.FromUserLv || data.level;
		this.charm 				= data.charm || 0;
		this.messages 			= data.messages || 0;

		this.totalCharm 		= data.totalCharm || 0;
		this.totalMessages 		= data.totalMessages || 0;

		// Additional data
		this.addons 			= data.addons || {};
	};
};

module.exports 					= BotMember;