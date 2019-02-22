const http 					= require("http");
const socketIo 				= require("socket.io");
const express 				= require("express");
const glob 					= require("glob");
const path 					= require("path");
const fs 					= require("fs");

/**
 * -----------------------------------------------------------------
 * Initializations
 * -----------------------------------------------------------------
 */

// Create express application and HTTP server
const app 					= express();
const server 				= http.Server(app);

// Create socket.io application
const io 					= socketIo(server, {
	serveClient: 			true
});

// Create a new bot client
const BotClient 			= new require.main.require("../socket/index")(null, io);

// Use socket.io client
require("./io").call(BotClient, io);

// On bot data
BotClient.on("bot.data", function(data) {
	console.log("[bot] bot name is", data.user.nickname);
	console.log("[bot] channel name is", data.data.user.nickname);
});

// Listen to chat messages
BotClient.on("chat.message", function(data) {
	console.log("chat", data.sender.nickname, data.message);
});

/**
 * -----------------------------------------------------------------
 * Startup
 * -----------------------------------------------------------------
 */

function doStartup() {
	// Static WWW folder
	app.use(express.static("./www/"));

	require("./web")(app, BotClient);

	console.info("[bot] initializating client...");

	BotClient.init()
	.then(() => {
		const serverPort 			= process.env.PORT || (BotClient.config && BotClient.config.port ? BotClient.config.port : 3200);

		// Start express and socket.io
		server.listen(serverPort, function() {
			console.info("[bot] listening on port", serverPort);

			// Start bot client
			BotClient.start();
		});
	});
}

/**
 * -----------------------------------------------------------------
 * Bot modules
 * -----------------------------------------------------------------
 */

// Load and handler custom commands
const BotCommands 			= require.main.require("../data/commands.json");

// Iterate over commands
BotCommands.forEach((command) => {
	// Register command
	BotClient.registerCommand(command);
});

// Load and handler custom commands
const BotTimers 			= require.main.require("../data/timers.json");

// Iterate over timers
BotTimers.forEach((timer) => {
	// Register timer
	BotClient.registerCommand(timer);
});

// Load all modules
glob(path.join(__dirname, "modules", "**/*.js"), function(err, files) {
	// Check if any error ocurred
	if (err) {
		throw err;
	}

	// Iterate over modules
	files.forEach(function(file) {
		try {
			// Load the module
			require(file).call(BotClient);
			console.info("[bot] module enabled:", path.basename(file));
		} catch(e) {
			throw new Error("Error enabling module " + path.basename(file) + ": " + e);
		}
	});

	console.info("[bot]", files.length, "modules loaded");

	doStartup();
});

/**
 * -----------------------------------------------------------------
 * Handlers
 * -----------------------------------------------------------------
 */

process.on("uncaughtException", function(err) {
    console.log(err);
}); 