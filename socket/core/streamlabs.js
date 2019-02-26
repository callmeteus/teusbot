const request 						= require("request");

const urlsStreamLabs 				= Symbol("urlsStreamLabs");
const getStreamLabs 				= Symbol("getStreamLabs");
const postStreamLabs 				= Symbol("postStreamLabs");
const configStreamLabs 				= Symbol("configStreamLabs");

class BotStreamlabs {
	constructor(id, secret, url, scope) {
		this[urlsStreamLabs] 		= {
			token: 					"token",
			donations: 				"donations",
			alerts: 				"alerts"
		};

		url 						= url + "/streamer/streamlabs";

		this[configStreamLabs] 		= { id, secret, url, scope };

		this.request 				= request.defaults({
			baseUrl: 				"https://www.streamlabs.com/api/v1.0/",
			json: 					true
		});
	}

	getAuthorizationUrl(addon) {
		let params 					= {
			client_id: 				this[configStreamLabs].id,
			redirect_uri: 			encodeURIComponent(this[configStreamLabs].url),
			response_type: 			"code",
			scope: 					encodeURIComponent(this[configStreamLabs].scope)
        };

		return "https://www.streamlabs.com/api/v1.0/authorize?" + Object.keys(params).map(k => `${k}=${params[k]}`).join("&");
	}

	getAccessToken(token) {
		const params 				= {
			grant_type: 			"authorization_code",
			code: 					token
		};

		return this[postStreamLabs](this[urlsStreamLabs].token, params);
	}

	getDonations(token, limit) {
		const params 				= {
			access_token: 			token,
			limit: 					limit,
			currency: 				"USD",
			verified: 				false
		};

		return this[getStreamLabs](this.getUrl(this[urlsStreamLabs].donations), params);
	}

	addDonation(token, donation) {
		donation.access_token 		= token;
		return this[postStreamLabs](this[urlsStreamLabs].donations, donation);
	}

	addAlert(token, alert) {
		alert.access_token 			= token;
		return this[postStreamLabs](this[urlsStreamLabs].alerts, alert);
	}

	[getStreamLabs](url, params) {
		return new Promise((resolve, reject) => {
			this.request({
				method: 				"GET",
				url: 					url,
				body: 					params
			}, (err, response, body) => {
				if (err || response.statusCode !== 200) {
					const error 		= err || body.error + ": " + body.error_description || body.message;
					return reject(new Error(error));
				}

				resolve(body);
			});
		});
	}

	[postStreamLabs](url, data) {
		if (data.name) {
			// Strip spaces
			data.name 					= data.name.replace(/ /g, "");

			// Remove emojis
			data.name 					= data.name.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "");

			// Replace accents
			data.name 					= data.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

			// Remove special characters
			data.name 					= data.name.replace(/[^\w\s]/gi, "");
		}

		return new Promise((resolve, reject) => {
			this.request({
				method: 				"POST",
				url: 					url,
				form:					Object.assign({
					client_id: 			this[configStreamLabs].id,
					client_secret: 		this[configStreamLabs].secret,
					redirect_uri: 		this[configStreamLabs].url
				}, data)
			}, (err, response, body) => {
				if (err || response.statusCode !== 200) {
					const error 		= err || body.error + ": " + body.error_description || body.message;
					return reject(new Error(error));
				}

				resolve(body);
			});
		});
	}
}

module.exports 							= BotStreamlabs;