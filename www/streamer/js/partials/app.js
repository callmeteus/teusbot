const socket 					= io("/streamer", {
	transports: 				["websocket"],
	autoConnect: 				false
});

(function appContext() {
	/**
	 * -----------------------------------------------------------------
	 * Initializations
	 * -----------------------------------------------------------------
	 */
	
	const appContainer 			= $("#app");

	let appData 				= {
		isRendered: 			false
	};

	let appCache 				= {};

	window.renderTemplate 		= (tpl, data, onlyReturn) => {
		let content 			= appCache[tpl] || $.ajax({
			url: 				"inc/" + tpl + ".ejs",
			method: 			"GET",
			async: 				false
		}).responseText;

		if (Object.keys(appCache).indexOf(tpl) === -1) {
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
	};

	/**
	 * -----------------------------------------------------------------
	 * Events
	 * -----------------------------------------------------------------
	 */

	$(document).on("click", "a[data-href]", function(e) {
		e.preventDefault();
		window.renderTemplate($(this).attr("data-href"));
	});

	socket.on("data", (data) => {
		appData 						= data;

		$.get("https://webapi.streamcraft.com/live/room/anchorinfo?uin=" + data.channel, (streamerData) => {
			appData.streamer 			= streamerData.data.user;

			$.get("https://webapi.streamcraft.com/live/room/anchorinfo?uin=" + data.channel, (botData) => {
				appData.bot 			= botData.data.user;
				appData.commands		= appData.commands || [];

				if (!appData.isRendered) {
					window.renderTemplate("main");
					appData.isRendered 	= true;

					socket.emit("modules");
				}
			});
		});
	});

	socket.on("connect", () => {
		$(window).trigger("bot.connected");
		socket.emit("data");
	});

	/**
	 * -----------------------------------------------------------------
	 * Misc
	 * -----------------------------------------------------------------
	 */
	
	$(document.body).tooltip({
		selector: 				"[title]"
	});
}());