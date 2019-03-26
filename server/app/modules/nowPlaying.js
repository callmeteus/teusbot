module.exports 							= {
	name: 								"nowplaying",
	type: 								"module",
	onEnter: 							function() {
		this.module.current 			= {
			song: 						"None",
			from: 						"None"
		};

		this.module.pending 			= {};

		setInterval(() => {
			const songRequest 			= this.client.getModule("songrequest");

			new Promise((resolve, reject) => {
				// Check if song request is open
				if (songRequest.isOpen && songRequest.song) {
					// Get the song from SongRequest
					resolve({ song: songRequest.song, from: "Song Request" });
				} else {
					// Get the song from current playing
					resolve(this.module.pending);
				}
			})
			.then((current) => {
				// Check if is playing a different song
				if (current.song !== this.module.current.song) {
					this.module.current = {
						song: 			current.song,
						from: 			current.from
					};

					// Send the update to client
					this.client.emit("nowplaying.update", this.module.current);
				}
			});
		}, 1000);
	},
	content: 							function(processor) {
		return processor.sendMessage(this.module.current.song);
	}
};