const socket 					= io({
	transports: 				["websocket"]
});

(function appContext() {
	/**
	 * -----------------------------------------------------------------
	 * Initializations
	 * -----------------------------------------------------------------
	 */
	
	const appContainer 			= $("#app");
	let appToken 				= localStorage.getItem("botToken") || null;
	let appData 				= {};

	let appCache 				= {};
	window.renderTemplate 		= (tpl, data, onlyReturn) => {
		let content 			= appCache[tpl] || $.ajax({
			url: 				"inc/" + tpl + ".ejs",
			method: 			"GET",
			async: 				false
		}).responseText;

		if (!appCache[tpl]) {
			appCache[tpl] 		= content;
		}

		const renderData 		= {
			data: 				Object.assign(appData, data),
			renderTemplate: 	(tpl, data) => renderTemplate(tpl, Object.assign({}, renderData, data), true)
		};

		content 				= ejs.render(content, renderData);

		if (onlyReturn) {
			return content;
		} else {
			appContainer.html(content);
		}
	}

	/**
	 * -----------------------------------------------------------------
	 * Events
	 * -----------------------------------------------------------------
	 */

	$(document).on("click", "a[data-href]", function(e) {
		e.preventDefault();
		renderTemplate($(this).attr("data-href"));
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