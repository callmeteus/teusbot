const http 					= require("http");
const socketIo 				= require("socket.io");
const express 				= require("express");

const BotApp 				= require("./app");

// Check if is debug
if (process.env.NODE_ENV !== "production") {
	// Require dotenv
	require("dotenv").config();
}

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

// Create a bot instance
const bot 					= new BotApp(io);

// Use socket.io client
require("./io").call(bot, io);

/**
 * -----------------------------------------------------------------
 * Startup
 * -----------------------------------------------------------------
 */

function doStartup() {
	// Static WWW folder
	app.use(express.static("./www/"));

	require("./web")(app, bot);

	console.info("[bot] initializating client...");

	bot.init()
	.then(() => {
		const serverPort 			= process.env.PORT || 3200;

		// Start express and socket.io
		server.listen(serverPort, function() {
			console.info("[bot] listening on port", serverPort);
		});
	})
	.catch((err) => {
		console.error("startup error:", err);
	});
}

/**
 * -----------------------------------------------------------------
 * Handlers
 * -----------------------------------------------------------------
 */

process.on("uncaughtException", function(err) {
    console.log(err);
});

/* -------------------------------------------------------------------
	COMMAND LINE EVAL
------------------------------------------------------------------- */

var readline 		= require("readline");

var rl 				= readline.createInterface({
	input: 			process.stdin,
	output: 		process.stdout
});

rl.on("line", function(data) {
	try {
		console.log(eval(data.toString().trim()));
	} catch(e) {
		console.error(e);
	}
});

// Start
doStartup();