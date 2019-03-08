module.exports 			= function(context) {
	$(document).on("change", "#bot-settings :input", function() {
		const $el 		= $(this);
		const name 		= $el.attr("name");
		const value 	= $el.is("[type=checkbox]") ? ($el.is(":checked") ? 1 : 0) : $el.val();

		$el.prop("disabled", true);

		context.socket.once("settings.update", (data) => {
			if (data.error) {
				return context.bootbox.alert(data.error);
			}

			$el.prop("disabled", false);
		});

		context.socket.emit("settings.update", name, value);
	});
};