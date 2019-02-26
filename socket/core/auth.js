const request 						= require("request");

module.exports 						= function() {
	// Set defaults
	let requestClient 				= request.defaults({
		headers: 					{
			"origin": 				"https://streamcraft.com",
			"referer": 				"https://streamcraft.com",
			"user-agent": 			"Teus Bot - A StreamCraft Chatbot (https://github.com/theprometeus/teusbot)"
		},
		jar: 						true
	});

	return 							{
		getStudioInfo: 				function(studio) {
			return new Promise((resolve, reject) => {
				let url 			= "https://webapi.streamcraft.com/live/room/anchorinfo?";
					url 			+= "_t=" + (+new Date());
					url 			+= "&uin=" + studio;

				// Request studio inco
				return requestClient(url, (err, response, body) => {
					// Check if request succeeded
					if (err || response.statusCode !== 200) {
						return reject(new Error(err || response.statusCode));
					}

					let data;

					// Try to parse JSON
					try {
						// Save data to private var
						data 		= Object.assign({}, data, JSON.parse(body));

						// Check if studio info is retrieved correctly
						if (data.code === -1) {
							return reject(new Error("Error retrieving studio info: " + JSON.stringify(data)));
						} else {
							return resolve(data);
						}
					} catch(e) {
						return reject(new Error("Failed to parse JSON for " + body));
					}
				});
			});
		},

		getInfo: 					function(channel) {
			return new Promise((resolve, reject) => {
				requestClient("https://webapi.streamcraft.com/tools/common/info?_t=" + +new Date(), (err, response, body) => {
					if (err || response.statusCode !== 200) {
						return callback(false);
					}

					let data;

					try {
						data 			= Object.assign({}, data, JSON.parse(body));
					} catch(e) {
						console.error("[http] failed to parse json for", body);
						return reject(new Error("Failed to parse JSON for " + body));
					}

					this.getStudioInfo(channel)
					.then((studio) => {
						resolve(Object.assign(data, studio));
					})
					.catch(reject);
				});
			});
		},

		login: 						function(email, password) {
			return new Promise((resolve, reject) => {
				requestClient({
					uri: 				"https://webapi.streamcraft.com/login", 
					method: 			"POST",
					json: 				{
						isauto: 		0,
						account: 		email,
						loginpw: 		password
					}
				}, function(err, response, data) {
					if (err || response.statusCode !== 200) {
						return reject(new Error(err || response.statusCode));
					}

					// Check if succeeded
					if (!data.success) {
						return reject(new Error(data.msg));
					}

					resolve(data);
				});
			});
		},

		request: 					requestClient
	};
};