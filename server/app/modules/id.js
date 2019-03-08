module.exports 						= {
	name: 							"id",
	type: 							"module",
	content: 						function(processor) {
		processor.sendMessage(`@${processor.sender.nickname} ID: ${processor.sender.id}`);
	}
};