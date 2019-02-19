const request 						= require("request");
const OAuth2 						= require("oauth20");

const credentialsStreamLabs 		= Symbol("credentialsStreamLabs");
const urlsStreamLabs 				= Symbol("urlsStreamLabs");
const getStreamLabs 				= Symbol("getStreamLabs");
const postStreamLabs 				= Symbol("postStreamLabs");

class StreamLabs extends OAuth2 {
	constructor(clientId, clientSecret, redirectUrl, scopes, socketToken="", accessToken="") {
		super(clientId, clientSecret, redirectUrl, scopes, accessToken, "https://www.streamlabs.com/api/v1.0/");
		
		this[credentialsStreamLabs] = { socketToken };

		this[urlsStreamLabs] 		= {
			socketToken: 			"socket/token",
			donations: 				"donations",
			alerts: 				"alerts"
		};

		this.request 				= request.defaults({
			baseUrl: 				"https://www.streamlabs.com/api/v1.0/"
		});
	}

	getCredentials() {
		const credentials			= super.getCredentials();
		credentials.socketToken 	= this[credentialsStreamLabs].socketToken;

		return credentials;
	}

	getDonations(limit) {
		const url 					= this[urlsStreamLabs].donations;

		const params 				= {
			access_token: 			this.getCredentials().accessToken,
			limit: 					limit,
			currency: 				"USD",
			verified: 				false
		};

		return this[getStreamLabs](url, params);
	}

	addDonation(donation) {
		const url 					= this[urlsStreamLabs].donations;
		donation.access_token 		= this.getCredentials().accessToken;

		return this[postStreamLabs](url, donation);
	}

	addAlert(alert) {
		const url 					= this[urlsStreamLabs].alerts;
		alert.access_token 			= this.getCredentials().accessToken;

		return this[postStreamLabs](url, alert);
	}

	connectWebSocket() {
		const url 					= this[urlsStreamLabs].socketToken;

		const params 				= {
		 	access_token: 			this.getCredentials().accessToken
		};

		return this[getStreamLabs](url, params).then((result) => {
			this[credentialsStreamLabs].socketToken = result.data.socket_token; 
			return result;
		});
	}

	[getStreamLabs](url, params) {
		return this.request({
			method: 				"GET",
			url: 					url,
			body: 					params
		});
	}

	[postStreamLabs](url, data) {
		return this.request({
			method: 				"POST",
			url: 					url,
			body:					data
		});
	}
}

module.exports 						= StreamLabs;