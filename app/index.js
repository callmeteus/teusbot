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
 * Bot modules
 * -----------------------------------------------------------------
 */

// Load and handler custom commands
const BotCommands 			= require.main.require("../data/commands.json");

// Handle commands
BotClient.on("chat.command", function(processor) {
	// Check if command exists
	if (BotCommands[processor.command] !== undefined) {
		const handler 		= BotCommands[processor.command];

		// Check if it's a text command
		if (handler.type === "text") {
			let txt 		= handler.content;

			// Convert text into chat message
			txt 			= processor.getMessage(txt);

			// Send the message
			processor.sendMessage(txt);
		} else 
		// Check if it's an alias command
		if (handler.type === "alias") {
			// Separate command from arguments
			const args 		= handler.content.split(" ");
			const cmd 		= args.shift().replace("!", "");

			const command 	= BotClient.createCommand(cmd, args, BotClient.sockets.passive, processor.sender);

			// Emit a new command as alias
			BotClient.emit("chat.command", command);
		} else {
			console.error("[bot] unknown command type '" + handler.type + "' for command", processor.command);
		}
	}
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

	app_startup();
});

/**
 * -----------------------------------------------------------------
 * Startup
 * -----------------------------------------------------------------
 */

function app_startup() {
	// Static WWW folder
	app.use(express.static("./www/"));

	console.info("[bot] initializating client...");

	BotClient.init()
	.then(() => {
		const serverPort 			= process.env.PORT ? process.env.PORT : (BotClient.config && BotClient.config.port ? BotClient.config.port : 3200);

		// Start express and socket.io
		server.listen(serverPort, function() {
			console.info("[bot] listening on port", serverPort);

			// Start bot client
			BotClient.start();
		});
	});
}

process.on("uncaughtException", function(err) {
    console.log(err);
}); 