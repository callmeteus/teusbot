module.exports 				= function(socket, app) {
	require("ejs");

	let timeout 			= null;

	function renderBet(data) {
		// Render bet
		app.container.html(
			ejs.render(app.template, data)
		);

		clearTimeout(timeout);
	}

	function updateBet(data) {
		let sum 			= 0;

		Object.values(data.options).forEach((option) => {
			sum 			+= option.length;
		});

		Object.keys(data.options).forEach((option) => {
			const percent 	= Math.round((data.options[option].length / sum) * 100);
			app.container.find("[data-option='" + option + "'] .votes").text(`${percent}%`);
		});
	}

	socket.on("obs.data", (type, data) => {
		if (type === "bet.start") {
			renderBet(data);
		} else
		if (type === "bet.vote") {
			if (data.name !== app.container.find("h3").text()) {
				renderBet(data);
			}

			updateBet(data);
		} else
		if (type === "bet.end") {
			updateBet(data);

			app.container.find("[data-option='" + data.winner + "']").addClass("bg-success");

			timeout 		= setTimeout(() => {
				app.container.fadeOut(1000, () => {
					app.container.html("");
				});
			}, 10000);
		}
	});
};