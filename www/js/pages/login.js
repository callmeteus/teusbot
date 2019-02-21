$(function() {
	$("#app-login form").off("submit").on("submit", function(e) {
		e.preventDefault();

		const $form 		= $(this);

		const email 		= $form.find("input[name=email]").val().toLowerCase();
		const password 		= $form.find("input[name=password]").val().toLowerCase();

		$form.find("input").prop("disabled", true);

		socket.once("login", (data) => {
			if (data.success === false) {
				$form.find("input").prop("disabled", false);
			} else {
				localStorage.setItem("botToken", data.token);
			}
		});

		socket.emit("login", {
			email: 			email,
			password: 		password
		});
	});
});