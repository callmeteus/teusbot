module.exports 							= function(context) {
	const io 							= require("socket.io-client");

	context.socket 						= io("/streamer", {
		transports: 					["websocket"],
		autoConnect: 					false
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

	context.appData 			= {
		isRendered: 			false,
		commands: 				[],
		timers: 				[]
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
			data: 				Object.assign(context.appData, data),
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

	/**
	 * -----------------------------------------------------------------
	 * Socket Events
	 * -----------------------------------------------------------------
	 */

	context.socket.on("data", (data) => {
		context.appData 				= Object.assign({}, context.appData, data);

		$.get("https://webapi.streamcraft.com/live/room/anchorinfo?uin=" + data.channel, (streamerData) => {
			context.appData.streamer 	= streamerData.data.user;

			context.appData.stream 		= context.appData.stream.title ? context.appData.stream : {
				title: 					streamerData.data.streams.LiveTitle,
				views: 					streamerData.data.streams.TotalViewCount,
				viewers: 				0
			};

			$.get("https://webapi.streamcraft.com/live/room/anchorinfo?uin=" + data.channel, (botData) => {
				context.appData.bot 	= botData.data.user;

				if (!context.appData.isRendered) {
					context.renderTemplate("main");
					context.appData.isRendered 	= true;

					context.socket.emit("modules");
				}
			});
		});
	});

	context.socket.on("connect", () => {
		$(window).trigger("bot.connected");
		context.socket.emit("data");
	});
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