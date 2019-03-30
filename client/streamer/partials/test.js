module.exports 				= function(context) {
	$(document).on("click", "a[href='#nav-enter']", function(e) {
		e.preventDefault();

		$(this).addClass("disabled");

		context.socket.emit("bot.enter");

		context.socket.once("bot.enter", (data) => {
			if (data.error) {
				return context.bootbox.alert(data.error);
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
		context.socket.emit("bot.test", "alert");
	});

	$(document).on("click", "a[href='#nav-test-donation']", function(e) {
		e.preventDefault();
		context.socket.emit("bot.test", "donation");
	});

	$(document).on("click", "a[href='#nav-reload-modules']", function(e) {
		e.preventDefault();
		context.socket.emit("bot.reload.modules");
	});

	$(document).on("click", "a[href='#nav-command-send']", function(e) {
		e.preventDefault();
		
		context.bootbox.prompt("Enter the command", function(string) {
			string 			= string.split(" ");

			const command 	= string.shift().replace("!", "");
			const args 		= string;

			context.socket.emit("bot.command", command, args);
		});
	});
};