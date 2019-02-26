$(document).on("submit", "#add-command form", function(e) {
	e.preventDefault();

	const $form 		= $(this);

	const id 			= parseInt($form.find("[name=id]").val());
	const name 			= $form.find("[name=name]").val();
	const type 			= $form.find("[name=type]").val();
	const content 		= $form.find("[name=content]").val();

	socket.once("command.add", (data) => {
		$form.find(":input").prop("disabled", false);

		if (data.error) {
			return alert(data.error);
		}

		$form.find(":input").val("");
	});

	socket.emit("command.add", { id, name, type, content });
});