module.exports 				= function(context) {
	$(document).on("submit", "#add-command form", function(e) {
		e.preventDefault();

		const $form 		= $(this);

		const id 			= parseInt($form.find("[name=id]").val(), 10);
		const name 			= $form.find("[name=name]").val();
		const type 			= $form.find("[name=type]").val();
		const content 		= $form.find("[name=content]").val();

		context.socket.once("command.add", (data) => {
			$form.find(":input").prop("disabled", false);

			if (data.error) {
				return context.bootbox.alert(data.error);
			}

			$form.find("input").val("");

			// Get content
			const content 	= context.renderTemplate("partials/command", { cmd: data }, true);

			// Check if it was an edit
			if (!data.isEdit) {
				// Append new command
				$("#nav-commands .list-group").append(content);
			} else {
				// Replace actual command with new command content
				$(".bot-command[data-id=" + id + "]").replaceWith(content);
			}

			// Set new command data
			const index 					= context.appData.commands.findIndex((cmd) => cmd.id === id);
			context.appData.commands[index] = data;

			// Alert success
			context.bootbox.alert("Command successfully " + (data.isEdit ? "saved" : "added") + "!");
		});

		context.socket.emit("command.add", { id, name, type, content });
	});

	$(document).on("click", ".bot-command [data-type=edit]", function(e) {
		e.preventDefault();

		const $command 		= $(this).parents(".bot-command");
		const $modal 		= $("#add-command");

		const command 		= $command.attr("data-command");
		const id 			= parseInt($command.attr("data-id"), 10);

		$modal.modal("show");

		const data 			= context.appData.commands.find((cmd) => cmd.id === id);

		Object.keys(data).forEach((key) => {
			$modal.find("[name=" + key + "]").val(data[key]);
		});
	});

	$(document).on("click", ".bot-command [data-type=remove]", function(e) {
		e.preventDefault();

		const $command 		= $(this).parents(".bot-command");

		const command 		= $command.attr("data-command");
		const id 			= $command.attr("data-id");

		context.bootbox.confirm("Are you sure you want to remove <em>!" + command + "</em>?", function(result) {
			if (!result) {
				return true;
			}

			context.socket.once("command.remove", (data) => {
				if (data.error) {
					return context.bootbox.alert(data.error);
				}

				context.bootbox.alert("Command successfully removed!");

				$command.remove();
			});

			context.socket.emit("command.remove", parseInt(id, 10));
		});
	});
};