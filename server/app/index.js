const http 							= require("http");
const socketIo 						= require("socket.io");
const express 						= require("express");
const expressSession 				= require("express-session");
const bodyParser 					= require("body-parser");
const sharedSession 				= require("express-socket.io-session");

const BotApp 						= require("./app");

// Check if is debug
if (process.env.NODE_ENV !== "production") {
	// Require dotenv
	require("dotenv").config();

	// Require bundle
	require("./bundle");
}

/**
 * -----------------------------------------------------------------
 * Initializations
 * -----------------------------------------------------------------
 */

// Create express application and HTTP server
const app 							= express();
const server 						= http.Server(app);

// Create socket.io application
const io 							= socketIo(server, {
	serveClient: 					true
});

// Create a bot instance
const bot 							= new BotApp(io);

/**
 * -----------------------------------------------------------------
 * Startup
 * -----------------------------------------------------------------
 */

function doStartup() {
	const session 					= expressSession({
		secret: 					"abcdefgh",
		resave: 					false,
		saveUninitialized: 			false
	});

	app.use(bodyParser({
		extended: 					false
	}));

	// Session
	app.use(session);

	// Static WWW folder
	app.use(express.static("client/www/"));

	// Use shared session
	io.of("/streamer").use(sharedSession(session, {
		autoSave: 				true
	}));

	// Use socket.io client
	require("./io").call(bot, io);

	// Use web endpoints
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

const readline 						= require("readline");

const rl 							= readline.createInterface({
	input: 							process.stdin,
	output: 						process.stdout
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