module.exports 							= function(context) {
	const io 							= require("socket.io-client");

	context.socket 						= io("/streamer", {
		transports: 					["websocket"],
		autoConnect: 					false
	});

	context.socket.on("data", (data) => {
		appData 						= data;

		$.get("https://webapi.streamcraft.com/live/room/anchorinfo?uin=" + data.channel, (streamerData) => {
			appData.streamer 			= streamerData.data.user;

			appData.stream 				= appData.stream.title ? appData.stream : {
				title: 					streamerData.data.streams.LiveTitle,
				views: 					streamerData.data.streams.TotalViewCount,
				viewers: 				0
			};

			$.get("https://webapi.streamcraft.com/live/room/anchorinfo?uin=" + data.channel, (botData) => {
				appData.bot 			= botData.data.user;
				appData.commands		= appData.commands || [];

				if (!appData.isRendered) {
					context.renderTemplate("main");
					appData.isRendered 	= true;

					context.socket.emit("modules");
				}
			});
		});
	});

	context.socket.on("connect", () => {
		$(window).trigger("bot.connected");
		context.socket.emit("data");
	});

	/**
	 * -----------------------------------------------------------------
	 * Initializations
	 * -----------------------------------------------------------------
	 */

	const appContainer 			= $("#container");
	const appPreloader 			= $("#preloader");

	context.appContainer 		= appContainer;
	context.appPreloader 		= appPreloader;

	let appData 				= {
		isRendered: 			false
	};

	let appCache 				= {};

	context.renderTemplate 		= (tpl, data, onlyReturn) => {
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
			renderTemplate: 	(tpl, data) => context.renderTemplate(tpl, Object.assign({}, renderData, data), true)
		};

		content 				= ejs.render(content, renderData);

		if (onlyReturn) {
			return content;
		} else {
			appPreloader.hide();
			appContainer.show().html(content);
		}
	};
};

/**
 * -----------------------------------------------------------------
 * Events
 * -----------------------------------------------------------------
 */

$(document).on("click", "a[data-href]", function(e) {
	e.preventDefault();
	context.renderTemplate($(this).attr("data-href"));
});

/**
 * -----------------------------------------------------------------
 * Misc
 * -----------------------------------------------------------------
 */

$(document.body).tooltip({
	selector: 				"[title]"
});