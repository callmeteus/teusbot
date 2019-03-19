const request 						= require("request");
const utf8 							= require("utf8");

const generalRegex 					= /\<title\>(.*)\<\/title\>/gi;
const youtubeRegex 					= /document\.title \= \"(.*)\"/gi;
const mobileRegex 					= /m\.(.*)\.com/i;

module.exports 						= {
	name: 							"songrequest",
	type: 							"module",
	onEnter: 						function() {
		this.module.playlist 		= [];
		this.module.isOpen 			= true;
		this.module.song 			= null;
	},
	content: 						function(processor) {
		let index 					= processor.arguments[0];

		if (index === "open") {
			if (!processor.sender.isMod) {
				return processor.noPermission();
			}

			this.module.isOpen 		= true;

			return processor.sendLangMessage("SONGREQUEST_OPEN");
		} else
		if (index === "close") {
			if (!processor.sender.isMod) {
				return processor.noPermission();
			}

			this.module.isOpen 		= false;

			return processor.sendLangMessage("SONGREQUEST_CLOSE");
		} else
		if (!this.module.isOpen) {
			return processor.sendLangMessage("SONGREQUEST_CLOSED");
		}

		let url;
		let hostname;

		if (mobileRegex.test(index)) {
			index 					= index.replace(mobileRegex, "$1.com");
		}

		try {
			url 					= new URL(index);
			hostname 				= url.hostname.indexOf("www.") > -1 ? url.hostname.split("www.")[1] : url.hostname;

			if (hostname !== "youtu.be" && hostname !== "youtube.com" && hostname !== "vimeo.com" && hostname !== "soundcloud.com") {
				throw new Error("Invalid streaming website.");
			}
		} catch(e) {
			return processor.sendLangMessage("SONGREQUEST_INVALID");
		}

		const song 					= {
			url: 					index
		};

		request({
			url: 					index,
			method: 				"GET",
			insecure: 				true,
			rejectUnauthorized: 	false,
			followAllRedirects: 	true,
			headers: 				{
				"User-Agent": 		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36"
			}
		}, (err, res, body) => {
			if (err) {
				return processor.internalError(err);
			}

			let retries 			= 0;

			while(song.title === undefined && retries < 5) {
				try {
					switch(hostname) {
						case "youtu.be":
						case "youtube.com":
							song.title 	= youtubeRegex.exec(body)[1];
							song.title 	= song.title.substr(0, song.title.length - 10);
						break;

						case "vimeo.com":
							song.title 	= generalRegex.exec(body)[1];
							song.title 	= song.title.substr(0, song.title.length - 9);
						break;

						case "soundcloud.com":
							song.title 	= generalRegex.exec(body)[1];
							song.title 	= (song.title.substr(song.title.lastIndexOf("by") + 3).split(" | ")[0] + " - " + song.title.substr(0, song.title.lastIndexOf("by") - 1))
						break;
					}
				} catch(e) {
					retries++;
				}
			}

			if (song.title === undefined) {
				return processor.internalError(new Error("Impossible to get song title for " + index));
			}

			if (this.module.playlist.find((s) => s.url === song.url) !== undefined) {
				return processor.sendLangMessage("SONGREQUEST_DUPLICATE");
			}

			song.title 				= decodeURIComponent(JSON.parse('"' + song.title + '"'));

			this.module.playlist.push(song);
			this.client.emit("songrequest.update", this.module.playlist, "streamer");

			return processor.sendLangMessage("SONGREQUEST_SUCCESS", {
				song: 				song.title
			});
		});
	}
};