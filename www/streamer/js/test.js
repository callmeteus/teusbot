$(document).on("click", "a[href='#nav-enter']", function(e) {
	e.preventDefault();

	$(this).addClass("disabled");

	socket.emit("bot.enter");

	socket.once("bot.enter", () => {
		$(this).removeClass("disabled");
	});
});

$(document).on("click", "a[href='#nav-test-alert']", function(e) {
	e.preventDefault();
	socket.emit("bot.test", "alert");
});

$(document).on("click", "a[href='#nav-test-donation']", function(e) {
	e.preventDefault();
	socket.emit("bot.test", "donation");
});