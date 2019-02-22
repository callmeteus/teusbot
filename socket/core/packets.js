const WebSocket						= require("ws");
const colors 						= require("colors");

class BotPackets extends WebSocket {
	constructor(url, type, client) {
		super(url);

		this.config					= this.config || {};
	}

	handleWatchLiveRewardList(response) {
		this.debug("rewardList", response);
		return true;
	}

	handleHistoryContribution(response) {
		this.debug("historyContribution", response);
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

		this.config.giftList 		= giftList;

		if (!force) {
			this.client.database.Configs.upsert({
				channel: 			this.config.channel,
				key: 				"studioConfig",
				value: 				JSON.stringify(response)
			}, {
				where: 				{
					channel: 		this.config.channel,
					key: 			"studioConfig"
				}
			})
			.catch((err) => {
				console.error("[db] error upserting channel studio config", err);
			});
		}

		return this.emit("giftList", giftList);
	}

	handleAuth(response) {
		// Login success
		if (response.BaseResponse.Ret === 0) {
			this.ReconSec 			= 1;

			return this.emit("bot.login", {
				success: 			true
			});
		}

		// If it reached here, something wrong happened.
		setTimeout(() => {
			this.reauth();
		}, 1000 * this.ReconSec);

		this.debug(colors.red("login error"), response.BaseResponse.ErrMsg.Buff);

		return this.emit("bot.login", {
			success:					false
		});
	}

	handleEnter(response) {
		// Login succeed
		if (response.BaseResponse.Ret === 0) {
			return this.emit("bot.login", {
				success: 			true
			});
		} else {
			// -369 = kick maybe?
			if (response.BaseResponse.Ret === -369) {
				this.emit("disconnected", response.BaseResponse.ErrMsg.Buff);
				this.debug("login -369", response.BaseResponse.ErrMsg.Buff);
			}

			this.debug("enter error", response.BaseResponse.ErrMsg.Buff);

			return this.emit("bot.login", {
				success:		false
			});
		}
	}
}

module.exports 						= BotPackets;