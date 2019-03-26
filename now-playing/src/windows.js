const exec 							= require("child_process").exec;

module.exports 						= function getWindowsPlayerList() {
	let prohibitedNames 			= ["live dashboard - youtube", "painel - youtube", "painel ao vivo - youtube"];

	return new Promise((resolve, reject) => {
		const psList 				= exec("chcp 65001 | powershell.exe -command \"& Get-Process spotify, chrome, firefox, opera | select ProcessName, MainWindowTitle\"");

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
				resolve("No music application is running.");
				return true;
			}

			// Remove first lines
			lines.splice(0, 2);

			// Iterate over lines
			lines.some((line) => {
				// Get process name
				const processName 	= line.substr(0, processSize).trim().toLowerCase();

				// Get process title
				const title 		= line.substr(processSize, line.length).trim();

				// Minified window title
				const min 			= title.toLowerCase().trim();

				let isProhibited 	= false;

				prohibitedNames.some((item) => {
					if (min.indexOf(item) > -1) {
						isProhibited	= true;
						return true;
					}

					return false;
				});

				// Check if has title
				if (title.length === 0 || isProhibited) {
					return false;
				}

				switch(processName) {
					case "chrome":
					case "firefox":
					case "opera":
						// Check if has YouTube in the title
						if (min.indexOf("- youtube") > -1) {
							resolve({ song: title.split(" - YouTube")[0], from: "YouTube" });
							return true;
						}
					break;

					case "spotify":
						// Bug fix for Spotify drag thing
						if (min !== "n/a" && min !== "drag" && min !== "anglehiddenwindow") {
							resolve({ song: title.indexOf("Spotify") > -1 ? "Paused" : title, from: "Spotify" });
							return true;
						}
					break;
				}
			});

			resolve("None");
		});
	});
};