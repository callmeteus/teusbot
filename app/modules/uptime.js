module.exports 						= {
	name: 							"uptime",
	type: 							"module",
	content: 						function(processor) {
		if (!this.client.stream.online) {
			return processor.sendMessage(
				processor.getMessage(this.client.getLangMessage("UPTIME_OFFLINE"))
			);
		}

		const end 				= new Date();
		const start 			= this.client.stream.started;

		let uptime 				= (end - start) / 1000;

		const upHours 			= Math.floor(uptime / 60 / 60);
		uptime 					-= upHours * 60 * 60;

		const upMinutes 		= Math.floor(uptime / 60);
		uptime 					-= upMinutes * 60;

		const upSeconds 		= Math.floor(uptime / 60);

		return processor.sendMessage(
			processor.getMessage(this.client.getLangMessage("UPTIME"), {
				uptime: 		{
					hours: 		("" + upHours).padStart(2, "0"),
					minutes: 	("" + upMinutes).padStart(2, "0"),
					seconds: 	("" + upSeconds).padStart(2, "0")
				}
			})
		);
	}
};