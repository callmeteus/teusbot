module.exports 				= function(context) {
	$(document).on("submit", "#add-timer form", function(e) {
		e.preventDefault();

		const $form 		= $(this);

		const id 			= parseInt($form.find("[name=id]").val(), 10);
		const name 			= $form.find("[name=name]").val();
		const type 			= $form.find("[name=type]").val();
		const content 		= $form.find("[name=content]").val();
		const interval 		= $form.find("[name=interval]").val();

		context.socket.once("timer.add", (data) => {
			$form.find(":input").prop("disabled", false);

			if (data.error) {
				return context.bootbox.alert(data.error);
			}

			$form.find("input").val("");

			$("#nav-timers .list-group").append(context.renderTemplate("partials/timer", { timer: data }, true));

			context.bootbox.alert("Timer successfully added!");
		});

		context.socket.emit("timer.add", { id, name, type, content, interval });
	});

	$(document).on("click", ".bot-timer [data-type=remove]", function(e) {
		e.preventDefault();

		const $timer 		= $(this).parents(".bot-timer");

		const timer 		= $timer.attr("data-timer");
		const id 			= $timer.attr("data-id");

		context.bootbox.confirm("Are you sure you want to remove <em>!" + timer + "</em>?", function(result) {
			if (!result) {
				return true;
			}

			context.socket.once("timer.remove", (data) => {
				if (data.error) {
					return context.bootbox.alert(data.error);
				}

				context.bootbox.alert("Timer successfully removed!");

				$timer.remove();
			});

			context.socket.emit("timer.remove", parseInt(id, 10));
		});
	});
};