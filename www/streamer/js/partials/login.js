$(function() {
	$.get("/api/session", (data) => {
		if (data.success === false) {
			window.renderTemplate("login");
		} else {
			socket.connect();
		}
	});

	$(document).on("submit", "#bot-login", function(e) {
		e.preventDefault();

		const $form 		= $(this);

		const email 		= $form.find("input[name=email]").val().toLowerCase();
		const password 		= $form.find("input[name=password]").val().toLowerCase();

		$form.find("input").prop("disabled", true);

		$.post("/api/auth", {
			email, password
		}, function(data) {
			if (data.error) {
				bootbox.alert(data.error);
				$form.find("input").prop("disabled", false);
			} else {
				socket.connect();
			}
		});
	});

	$(document).on("submit", "#bot-register", function(e) {
		e.preventDefault();

		const $form 		= $(this);

		const email 		= $form.find("input[name=email]").val().toLowerCase();
		const password 		= $form.find("input[name=password]").val().toLowerCase();
		const channel 		= $form.find("input[name=channel]").val().split("/");

		// Check if has 4 slashes
		if (channel.length < 4) {
			return false;
		}

		$form.find("input").prop("disabled", true);

		$.post("/api/register", {
			email, password, channel: channel[4]
		}, function(data) {
			if (data.error) {
				bootbox.alert(data.error);
				$form.find("input").prop("disabled", false);
			} else {
				bootbox.alert("Successfully registered! Now wait for anyone to aprove your register.");
			}
		});
	});
});