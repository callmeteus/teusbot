const colors 						= require("colors");

class BotHandlers {
	constructor(socket) {
		this.socket 				= socket;
	}

	handleWatchLiveRewardList(response) {
		this.socket.debug("rewardList", response);
		return true;
	}

	handleHistoryContribution(response) {
		this.socket.debug("historyContribution", response);
		return true;
	}

	handleStudioConfig(response, force) {
		const giftList 				= {};

		response.LiveGiftConf.GiftList.forEach(function(gift) {
			giftList[gift.GiftId] 	= {
				id: 				gift.GiftId,
				type: 				gift.GiftType,
				name: 				gift.GiftName,
				icon: 				gift.Icon,
				image: 				gift.Image,
				animation: 			gift.WebAnimation,
				coins: 				gift.Coin,
				crystal: 			gift.Crystal,
				duration: 			gift.WebAnimationLen
			};
		});

		this.socket.client.config.giftList = giftList;

		if (!force) {
			this.socket.client.database.Configs.upsert({
				channel: 			this.socket.client.data.data.user.uin,
				key: 				"studioConfig",
				value: 				JSON.stringify(response)
			}, {
				where: 				{
					channel: 		this.socket.client.data.data.user.uin,
					key: 			"studioConfig"
				}
			})
			.catch((err) => {
				console.error("[db] error upserting channel studio config", err);
			});
		}

		return this.socket.emit("giftList", giftList);
	}

	handleAuth(response) {
		// Login success
		if (response.BaseResponse.Ret === 0) {
			this.socket.ReconSec 			= 1;

			return this.socket.emit("bot.login", {
				success: 			true
			});
		}

		// If reached here, something wrong happened.
		setTimeout(() => this.socket.packets.reauth(), 1000 * this.socket.ReconSec);

		this.socket.debug(colors.red("login error"), response.BaseResponse.ErrMsg.Buff);

		return this.socket.emit("bot.login", {
			success:				false
		});
	}

	handleEnter(response) {
		// Login succeed
		if (response.BaseResponse.Ret === 0) {
			return this.socket.emit("bot.login", {
				success: 			true
			});
		} else {
			// -369 = kick maybe?
			if (response.BaseResponse.Ret === -369) {
				this.socket.emit("disconnected", response.BaseResponse.ErrMsg.Buff);
				this.socket.debug("login -369", response.BaseResponse.ErrMsg.Buff);
			}

			this.socket.debug("enter error", response.BaseResponse.ErrMsg.Buff);

			return this.socket.emit("bot.login", {
				success:			false
			});
		}
	}
}

module.exports 						= BotHandlers;