const spawn 					= require("child_process").spawn;
const fs 						= require("fs");

function getCurrentPlaying() {
	return new Promise((resolve, reject) => {
		const psList 			= spawn("powershell.exe", ["Get-Process spotify, chrome | select MainWindowTitle"]);

		let result 				= "";

		psList.stdout.on("data", (data) => {
			result 				+= data;
		});

		psList.on("close", () => {
			let lines 			= result.toString("utf8").split("\r\n");

			if (lines.length < 3) {
				return resolve("No music application is running.");
			}

			lines 				= lines.filter((line) => line.replace(/ /g, "").length > 2 && line.indexOf("MainWindowTitle") === -1 && line.indexOf("---------------") === -1);

			lines.forEach((title) => {
				let min 		= title.toLowerCase().trim();

				if (min.indexOf("google chrome") > -1 || min.indexOf("firefox") > -1) {
					if (min.indexOf("youtube") > -1) {
						return resolve(title.replace(" - Google Chrome", "").replace(" - YouTube", ""));
					}
				} else
				if (min !== "n/a" && min !== "drag" && min !== "anglehiddenwindow") {
					return resolve(title.indexOf("Spotify") > -1 ? "Paused" : title);
				}
			});

			resolve("None");
		});
	});
}

let nowPlaying 					= null;

module.exports 					= {
	name: 						"nowplaying",
	type: 						"module",
	preload: 					function() {
		setInterval(() => {
			getCurrentPlaying().then((playing) => {
				nowPlaying 		= playing;

				fs.writeFileSync(__dirname + "/../../data/nowplaying.txt", playing, "utf8");
			});
		}, 1000);
	},
	content: 					function(processor) {
		return processor.sendMessage(nowPlaying);
	}
};