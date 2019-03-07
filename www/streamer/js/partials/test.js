$(document).on("click", "a[href='#nav-enter']", function(e) {
	e.preventDefault();

	$(this).addClass("disabled");

	socket.emit("bot.enter");

	socket.once("bot.enter", (data) => {
		if (data.error) {
			return bootbox.alert(data.error);
		}

		$(this).removeClass("disabled");

		if (data.isIn) {
			$(this).addClass("btn-success").text("Leave channel");
		} else {
			$(this).removeClass("btn-success").text("Enter channel");
		}
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