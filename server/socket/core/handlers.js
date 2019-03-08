const colors 								= require("colors");

class BotHandlers {
	constructor(socket) {
		this.socket 						= socket;
	}

	handleWatchLiveRewardList(response) {
		//this.socket.debug("rewardList", response);
		return true;
	}

	handleHistoryContribution(response, data) {
		//this.socket.debug("historyContribution", response);
		return true;
	}

	handleGiftList(list) {
		const giftList 						= [];

		list.forEach(function(gift) {
			giftList.push({
				id: 						gift.GiftId,
				type: 						gift.GiftType,
				name: 						gift.GiftName,
				icon: 						gift.Icon,
				image: 						gift.Image,
				animation: 					gift.WebAnimation,
				coins: 						gift.Coin,
				crystal: 					gift.Crystal,
				duration: 					gift.WebAnimationLen,
				silver: 					gift.Silver
			});
		});

		return giftList;
	}

	handleStudioConfig(response) {
		const giftList 						= this.handleGiftList(response.LiveGiftConf.GiftList);

		if (this.socket.client.config.giftList === null) {
			this.socket.debug("saving studio config");

			this.socket.client.database.Configs.create({
				channel: 					this.socket.client.data.data.user.uin,
				key: 						"giftList",
				value: 						JSON.stringify(giftList)
			})
			.catch((err) => {
				console.error("[db] error inserting gift list", err);
			});
		} else
		if (JSON.stringify(this.socket.client.config.giftList) !== JSON.stringify(giftList)) {
			this.socket.debug("updating studio config");

			this.socket.client.database.Configs.update({
				channel: 					this.socket.client.data.data.user.uin,
				key: 						"giftList",
				value: 						JSON.stringify(giftList)
			}, {
				where: 						{
					channel: 				this.socket.client.data.data.user.uin,
					key: 					"giftList"
				}
			})
			.catch((err) => {
				console.error("[db] error updating gift list", err);
			});

			this.socket.client.config.giftList 	= giftList;
		}

		return this.socket.emit("bot.gifts", giftList);
	}

	handleAuth(response) {
		// Login success
		if (response.BaseResponse.Ret === 0) {
			this.socket.ReconSec 			= 1;

			this.socket.debug("login succes");

			return this.socket.emit("bot.login", {
				success: 					true
			});
		}

		// If reached here, something wrong happened.
		setTimeout(() => this.socket.packets.reauth(), 1000 * this.socket.ReconSec);

		this.socket.debug(colors.red("login error"), response.BaseResponse.ErrMsg.Buff);

		return this.socket.emit("bot.login", {
			success:						false
		});
	}

	handleEnter(response) {
		// Login succeed
		if (response.BaseResponse.Ret === 0) {
			return this.socket.emit("bot.login", {
				success: 					true
			});
		} else {
			// -369 = kick maybe?
			if (response.BaseResponse.Ret === -369) {
				this.socket.emit("disconnected", response.BaseResponse.ErrMsg.Buff);
				this.socket.debug("login -369", response.BaseResponse.ErrMsg.Buff);
			}

			this.socket.debug("enter error", response.BaseResponse.ErrMsg.Buff);

			return this.socket.emit("bot.login", {
				success:					false
			});
		}
	}
}

module.exports 								= BotHandlers;