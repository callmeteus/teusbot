let voting 									= {};

module.exports 								= {
	name: 									"vote",
	type: 									"module",
	content: 								function(processor) {
		switch(processor.command) {
			case "vote":
				if (Object.keys(voting).length > 0) {
					const index 			= processor.arguments[0].toLowerCase();

					// Check if index exists and if
					// user has voted on it
					if (voting[index] !== undefined && voting[index].indexOf(processor.sender.id) === -1) {
						// Add one vote
						voting[index].push(processor.sender.id);
					}
				}
			break;

			case "votestart":
				if (!processor.sender.isMod) {
					return processor.noPermission();
				}

				// Check if have at least 2 arguments
				if (processor.arguments.length < 2) {
					return false;
				}

				processor.arguments.forEach(function(arg) {
					voting[arg.toLowerCase()] 	= [];
				});

				processor.sendMessage(this.getLangMessage("VOTE_START", { 
					vote: 						{
						options:  				processor.arguments.join(", ").toLowerCase()
					}
				}));
			break;

			case "voteend":
				if (!processor.sender.isMod) {
					return processor.noPermission();
				}

				let message 					= "";

				let result 						= Object.keys(voting).sort(function(a, b) {
					return voting[b].length - voting[a].length;
				});

				result.forEach(function(vote) {
					message 					+= vote + " obteve " + voting[vote].length + " voto(s). ";
				});

				voting 							= {};

				processor.sendMessage(this.getLangMessage("VOTE_END", {
					vote: 						{
						results: 				message
					}
				}));
			break;
		}
	}
};