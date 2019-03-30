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

const config 	 					= fs.existsSync("config.json") ? require("./config") : {};

const appDomain 					= "127.0.0.1:3200";

/**
 * Initialization
 */

const socket 						= socketIo("ws://" + appDomain + "/obs", {
	autoConnect: 					false,
	transports: 					["websocket"]
});

let token 							= config["token"];

let running 						= {};

function doListener() {
	let playerList 					= null;

	if (os.platform() === "win32") {
		playerList 					= getWindowsPlayerList;
	}

	if (playerList !== null) {
		playerList()
		.then((current) => {
			if (current.song !== running.song) {
				running 			= current;

				console.log(colors.green("Listening to " + running.song + " on " + running.from));

				socket.emit("nowplaying.update", current);
			}
		});
	} else {
		return false;
	}
}

socket.on("auth", function(success) {
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

if (token === undefined) {
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