process.title 						= "TeusBot App";

/**
 * Load modules
 */

const socketIo 						= require("socket.io-client");
const colors 						= require("colors");
const os 							= require("os");
const fs 							= require("fs");

const getWindowsPlayerList 			= require("./src/windows");

/**
 * Configuration
 */

const config 	 					= fs.existsSync("config.json") ? JSON.parse(fs.readFileSync("./config.json", "utf8")) : {};
config.token 						= config.token || null;
config.domain 						= config.domain || "teus.herokuapp.com";

/**
 * Initialization
 */

const socket 						= socketIo("ws://" + config.domain + "/obs", {
	autoConnect: 					false,
	transports: 					["websocket"]
});

let token 							= config["token"];

let running 						= {};

function doListener() {
	let playerList 					= null;

	// Platform check
	if (os.platform() === "win32") {
		playerList 					= getWindowsPlayerList;
	}

	// Check if playlist function is set
	if (playerList !== null) {
		// Get current playlist
		playerList()
		.then((current) => {
			// Check if current song is different than retrieved song
			if (current.song !== running.song) {
				// Update it
				running 			= current;

				// Log into the console
				console.log(colors.green("Listening to " + running.song + " on " + running.from));

				// Emit to server
				socket.emit("nowplaying.update", current);
			}
		});
	} else {
		return false;
	}
}

// On socket authenticate
socket.on("auth", function(success) {
	// Check if authentication succeeded
	if (!success) {
		console.error(colors.red("Error: authentication with TeusBot API failed. Check if your token is correct."));
		console.error(colors.red("If you have changed your API key, remove the config.json file and run the program again."));
	} else {
		console.log(colors.green("Authentication succeeded. Listening to new music changes."));
		setInterval(() => doListener(), 1000);
	}
});

socket.on("connect", () => {
	console.log(colors.green("Connected to the server."));
	socket.emit("auth", token);
});

socket.on("error", console.error);
socket.on("reconnect_attempt", (attempt) => console.log(colors.yellow("Attempting to reconnect (" + attempt + ")")));

console.info(colors.cyan(`

 _____              ______       _   
|_   _|             | ___ \\     | |  
  | | ___ _   _ ___ | |_/ / ___ | |_ 
  | |/ _ \\ | | / __|| ___ \\/ _ \\| __|
  | |  __/ |_| \\__ \\| |_/ / (_) | |_ 
  \\_/\\___|\\__,_|___/\\____/ \\___/ \\__|
                                     
                                     `));

console.info("Connecting to " + config.domain + "...");

if (token === undefined || token === null) {
	const readline 						= require("readline");

	const rl 							= readline.createInterface({
		input: 							process.stdin,
		output: 						process.stdout
	});

	console.info("Hi! It looks like it's your first run.");

	rl.question("Please, insert your TeusBot API token: ", (value) => {
		token 							= value;

		config["token"] 				= value;

		fs.writeFileSync("config.json", JSON.stringify(config));

		socket.connect();

		rl.close();
	});
} else {
	socket.connect();
}