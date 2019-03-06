const exec 							= require("child_process").exec;
const fs 							= require("fs");

function getCurrentPlaying() {
	return new Promise((resolve, reject) => {
		const psList 				= exec("chcp 65001 | powershell.exe -command \"& Get-Process spotify, chrome | select ProcessName, MainWindowTitle\"");

		let result 					= "";

		psList.stdout.on("data", (data) => {
			result 					+= data;
		});

		psList.on("close", () => {
			// Split text into lines
			let lines 				= result.toString("utf8").split("\r\n");

			// Skip first elements (empty line)
			lines.shift();

			// Calculate process name max size
			let processSize 		= lines[0].split(" ")[0].length + 1;

			// Check if has 3 or more lines
			if (lines.length < 3) {
				return resolve("No music application is running.");
			}

			// Filter lines that has no content or it's part of the specs
			lines.splice(0, 2);

			// Iterate over lines
			for(let i = 0; i < lines.length; i++) {
				const line 			= lines[i];

				// Get process name
				const processName 	= line.substr(0, processSize).trim().toLowerCase();

				// Get process title
				const title 		= line.substr(processSize, line.length).trim();

				// Minified window title
				const min 			= title.toLowerCase().trim();

				// Check if has title
				if (title.length === 0) {
					continue;
				}

				switch(processName) {
					case "chrome":
					case "firefox":
					case "opera":
						// Check if has YouTube in the title
						if (min.indexOf("- youtube") > -1) {
							return resolve(title.split(" - YouTube")[0]);
						}
					break;

					case "spotify":
						// Bug fix for Spotify drag thing
						if (min !== "n/a" && min !== "drag" && min !== "anglehiddenwindow") {
							return resolve(title.indexOf("Spotify") > -1 ? "Paused" : title);
						}
					break;
				}
			}

			return resolve("None");
		});
	});
}

module.exports 						= {
	name: 							"nowplaying",
	type: 							"module",
	onEnter: 						function() {
		setInterval(() => {
			getCurrentPlaying().then((playing) => {
				this.module.song	= playing;

				fs.writeFileSync(__dirname + "/../../data/nowplaying.txt", playing, "utf8");
			});
		}, 1000);
	},
	content: 						function(processor) {
		return processor.sendMessage(this.module.song);
	}
};