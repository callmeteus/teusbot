window.$ 					= require("jquery");

require("popper.js");
require("bootstrap");
require("ejs");

const io 					= require("socket.io-client");
const gifffer 				= require("gifffer/lib/gifffer");

const query 				= new URLSearchParams(window.location.search);

const app 					= {
	token: 					query.get("token"),
	module: 				query.get("module"),
	test: 					(query.get("test") === "true" || query.get("test") === "1"),
	isQueue: 				(query.get("queue") === "true" || query.get("queue") === "1"),
	queue: 					[],
	testData: 				{
		sender: 			{
			id: 			1,
			nickname: 		"Test",
			picture: 		"https://via.placeholder.com/150"

		},
		message: 			"test message",
		emote: 				{
			amount: 		1,
			emote: 			{
				name: 		"Test Emote",
				animation: 	"https://media2.giphy.com/media/nNxT5qXR02FOM/giphy.gif"
			}
		}
	}
};

// Check if token or module is set
if (app.token === null || app.module === null) {
	return alert("No token or module inserted.");
}

if (!app.token.length) {
	app.token 				= null;
}

/**
 * -----------------------------------------------------------------
 * Socket initialization
 * -----------------------------------------------------------------
 */

// Create socket.io instance
const socket 				= io("/obs", {
	autoConnect: 			false,
	transports: 			["websocket"]
});

// On socket connect
socket.on("connect", () => {
	console.info("[socket] connected");

	// Emit authentication
	socket.emit("auth", app.token);
});

// On socket authenticate
socket.on("auth", (success) => {
	console.info("[socket] authentication", success);

	// Check if authentication succeeded
	!success && alert("Authentication failed.");

	socket.emit("obs.listen", app.module);
});

/**
 * -----------------------------------------------------------------
 * Module initialization
 * -----------------------------------------------------------------
 */

const $parent 				= $("<div id='" + app.module.replace(/\./g, "-") + "-parent'/>").appendTo(document.body);

const duration 				= query.has("duration") ? parseInt(query.get("duration"), 10) : (5000);
const animateDuration 		= query.has("aduration") ? parseInt(query.get("aduration"), 10) : 1000;
const animateIn 			= query.has("in") ? query.get("in") : "fadeInLeft";
const animateOut 			= query.has("out") ? query.get("out") : "fadeOutLeft";

let template 				= null;

function appPrepareNotification($element, callback) {
	const $preload 			= $element.find("img, audio");
	const count 			= $preload.length;

	let actual 				= 0;
	let cancelled 			= false;

	if ($preload.length === 0) {
		callback();
	}

	// Preloader images
	$preload.each(function() {
		const src 			= $(this).attr("src");
		const element 		= $(this).is("audio") ? new Audio() : new Image();

		element.src 		= src;

		$(element).on("load canplaythrough", function() {
			actual++;

			if (actual === count && !cancelled) {
				callback();
			}
		});

		$(element).on("error stalled", function() {
			if (!cancelled) {
				cancelled 	= true;
				appPrepareNotification($element, callback);
			}
		});
	});

	// Replace animated images with gifffer attributes
	$element.find("img[animated]").each(function() {
		$(this).attr("data-gifffer", $(this).attr("src")).removeAttr("src");
	});
}

/**
 * Create a module notification in the screen
 * @param  {Object} data Notification data
 * @returns {Boolean} Success
 */
function appNotificate(data, callback) {
	// Check if template is loaded
	if (template === null) {
		return false;
	}

	const content 			= ejs.render(template, data);
	const $element 			= $(content);

	// Prepare element
	appPrepareNotification($element, () => {
		$element.prependTo($parent);

		let fDuration 		= duration;

		// Check if data contains emote
		if (data.emote) {
			fDuration 		= data.emote.emote.duration < 10000 ? 1000 : data.emote.emote.duration * 2;
		}

		$element.find("audio").each(function() {
			this.play();
		});

		$element.addClass("animated " + animateIn);
		$element.css("animation-duration", animateDuration + "ms");

		// Check if is to get out
		if (animateOut !== "0" && animateOut !== "false") {
			// Wait for notification duration
			setTimeout(() => {
				$element
					.removeClass(animateIn)
					.addClass(animateOut);

				// Wait for out animation end
				setTimeout(() => {
					$element.remove();

					if (callback) {
						callback();
					}
				}, animateDuration);
			}, fDuration);
		}

		// Process notification gifs
		const gifs 			= gifffer({
			playButtonStyles: {
				width: 0,
				height: 0
			}
		});

		// Play gifs after in animation complete
		setTimeout(() => {
			gifs.forEach((gif) => gif.click());
		}, animateDuration);
	});

	return true;
}

function appProcessQueue() {
	let notification 		= app.queue.shift();

	appNotificate(notification, function() {
		if (app.queue.length) {
			appProcessQueue();
		}
	});
}

// Get module template
$.get("inc/tpl/" + app.module + ".ejs", (tpl) => {
	template 				= tpl;

	// Check if test
	if (app.test) {
		// Create a test notification
		appNotificate(app.testData);
	}

	// Add event listener to module
	socket.on("obs.data", (type, data) => {
		// Check if is queue
		if (!app.isQueue) {
			// Show notification imediately
			appNotificate(data);
		} else {
			// Add notificationt to queue
			app.queue.push(data);

			if (app.queue.length === 1) {
				appProcessQueue();
			}
		}
	});

	// Open socket connection
	socket.connect();
});