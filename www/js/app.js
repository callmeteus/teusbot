const socket 				= io({
	transports: 			["websocket"]
});

(function() {
	/**
	 * -----------------------------------------------------------------
	 * Initializations
	 * -----------------------------------------------------------------
	 */
	
	const appContainer 		= $("<div/>").appendTo(document.body);
	let appToken 			= localStorage.getItem("botToken") || null;
	let appData 			= {};

	/**
	 * -----------------------------------------------------------------
	 * Functions
	 * -----------------------------------------------------------------
	 */

	window.renderTemplate 	= function(url) {
		$.get("/inc/" + url + ".ejs", (tpl) => {
			appContainer.html(ejs.render(tpl, { data: appData }));
		});
	};

	/**
	 * -----------------------------------------------------------------
	 * Events
	 * -----------------------------------------------------------------
	 */

	$(document).on("click", "a[data-href]", function(e) {
		e.preventDefault();

		const url 			= $(this).attr("data-href");

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
		appData 			= data;
		renderTemplate("main");
	});

	socket.on("connect", () => {
		if (appToken !== null) {
			socket.emit("auth", appToken);
		} else {
			renderTemplate("login");
		}
	});
})();