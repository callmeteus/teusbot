module.exports 						= function(context) {
	context.socket.on("obs.data", (type, data) => {
		switch(type) {
			case "chat.message":
				const $message 		= $(`
					<div class="list-group-item">
						<img src="${data.sender.picture}" align="absmiddle" width="32" />
						<span class="badge badge-primary">${data.sender.tag}</span>
						<a href="https://streamcraft.com/user/${data.sender.id}" target="_blank">${data.sender.nickname}</a> 
						${data.message}
					</div>
				`);

				$("#bot-chat").prepend($message);
				$("#bot-chat").find(".list-group-item:gt(25)").remove();
				$("#bot-chat").find(".list-group-item.text-muted").remove();

				if (data.special) {
					const $special 	= $message.clone();
					$special.addClass("border-left-0 border-right-0 bg-success text-white");

					$special.find("a").addClass("text-white");

					setInterval(() =>  $special.removeClass("bg-success text-white").find("a").removeClass("text-white"), 10000);

					$("#bot-events").prepend($special);
					$("#bot-events").find(".list-group-item.text-muted").remove();
				}
			break;

			case "stream.update":
				Object.keys(data).forEach((index) => {
					$(".stream-" + index).html(data[index]);
				});
			break;
		}
	});
};