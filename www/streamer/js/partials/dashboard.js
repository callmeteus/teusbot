$(window).on("bot.connected", () => {
	socket.on("obs.data", (type, data) => {
		switch(type) {
			case "chat.message":
				const $message 	= `
					<div class="list-group-item">
						<img src="${data.sender.picture}" align="absmiddle" width="32" /> 
						<a href="https://streamcraft.com/user/${data.sender.id}" target="_blank">${data.sender.nickname}</a> 
						${data.message}
					</div>
				`;

				$("#bot-chat").prepend($message);
				$("#bot-chat").find(".list-group-item:gt(10)").remove();

				if (data.special) {
					$("#bot-events").append($message);
				}
			break;

			case "stream.update":
				Object.keys(data).forEach((index) => {
					$(".stream-" + index).html(data[index]);
				});
			break;
		}
	});
});