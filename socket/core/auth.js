const request 						= require("request");

module.exports 						= function(config) {
	let _data 						= {};

	// Set defaults
	let requestClient 				= request.defaults({
		headers: 					{
			"origin": 				"https://streamcraft.com",
			"referer": 				"https://streamcraft.com",
			"user-agent": 			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
		},
		jar: 						true
	});

	return 							{
		getData: 					function() {
			return _data;
		},

		getStudioInfo: 				function(callback) {
			let url 				= "https://webapi.streamcraft.com/live/room/anchorinfo?";
				url 				+= "_t=" + (+new Date());
				url 				+= "&uin=" + config.channel;

			// Request studio inco
			return requestClient(url, (err, response, body) => {
				// Check if request succeeded
				if (err || response.statusCode !== 200) {
					return callback(false);
				}

				// Try to parse JSON
				try {
					// Save data to private var
					_data 			= Object.assign({}, _data, JSON.parse(body));

					// Check if studio info is retrieved correctly
					if (_data.code === -1) {
						return callback(false);
					} else {
						return callback && callback(_data);
					}
				} catch(e) {
					console.error("[http] failed to parse json for", body);
					return callback(false);
				}
			});
		},

		getInfo: 					function(callback) {
			return requestClient("https://webapi.streamcraft.com/tools/common/info?_t=" + +new Date(), (err, response, body) => {
				if (err || response.statusCode !== 200) {
					return callback(false);
				}

				try {
					_data 			= Object.assign({}, _data, JSON.parse(body));
				} catch(e) {
					console.error("[http] failed to parse json for", body);
					return callback(false);
				}

				this.getStudioInfo((data) => callback && callback(data));
			});
		},

		login: 						function(email, password, callback) {
			return requestClient({
				uri: 				"https://webapi.streamcraft.com/login", 
				method: 			"POST",
				json: 				{
					isauto: 		0,
					account: 		email,
					loginpw: 		password
				}
			}, function(err, response, data) {
				if (err || response.statusCode !== 200) {
					return callback(false);
				}

				// Check if succeeded
				if (!data.success) {
					return callback(data.msg);
				}

				callback(null, data.success);
			});
		},

		request: 					requestClient
	};
};