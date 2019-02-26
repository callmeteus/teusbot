const socket 					= io({
	transports: 				["websocket"]
});

(function() {
	/**
	 * -----------------------------------------------------------------
	 * Initializations
	 * -----------------------------------------------------------------
	 */
	
	const appContainer 			= $("<div/>").appendTo(document.body);
	let appToken 				= localStorage.getItem("botToken") || null;
	let appData 				= {};

	/**
	 * -----------------------------------------------------------------
	 * Functions
	 * -----------------------------------------------------------------
	 */

	let currentTpl 				= null;
	window.renderTemplate 		= function(url) {
		if (currentTpl === url) {
			return false;
		}

		$.get("inc/" + url + ".ejs", (tpl) => {
			appContainer.html(ejs.render(tpl, { data: appData }));

			currentTpl 			= url;
		});
	};

	/**
	 * -----------------------------------------------------------------
	 * Events
	 * -----------------------------------------------------------------
	 */

	$(document).on("click", "a[data-href]", function(e) {
		e.preventDefault();

		const url 				= $(this).attr("data-href");

		renderTemplate(url);
	});

	socket.on("auth", (success) => {
		if (!success) {
			renderTemplate("login");
		} else {
			socket.emit("data");
		}
	});

	socket.on("data", (data) => {
		appData 				= data;

		$.get("https://webapi.streamcraft.com/live/room/anchorinfo?uin=" + data.channel, (botData) => {
			appData.bot 		= botData.data;
			appData.commands	= appData.commands || [];

			renderTemplate("main");
		});
	});

	socket.on("connect", () => {
		if (appToken !== null) {
			socket.emit("auth", appToken);
		} else {
			renderTemplate("login");
		}
	});

	/**
	 * -----------------------------------------------------------------
	 * Misc
	 * -----------------------------------------------------------------
	 */
	
	$(document.body).tooltip({
		selector: 				"[title]"
	})
})();