const TeusPlayer 			= require("../../libs/teusplayer");

module.exports 				= function(context) {
	let playList 			= [];
	let playListPlayer 		= new TeusPlayer({ element: "#bot-songrequest-player" });

	function skipSong() {
		playListPlayer.stop();
		playListPlayer.emit("end");
	}

	function updatePlaylistVisual() {
		if (playList.length === 0) {
			$("#bot-songrequest .text-muted").show();
		}
	}

	function playNextSong(song) {
		$("#bot-songrequest .bg-success").remove();

		updatePlaylistVisual();

		if (song === undefined) {
			song 			= playList[0];

			if (song === undefined) {
				return false;
			}
		}

		playListPlayer.playUrl(song.url);
		playListPlayer.setVolume(localStorage.getItem("botVolume") || 100);

		$("#bot-songrequest [data-url='" + song.url + "']").addClass("bg-success");

		context.socket.emit("songrequest.listen", song.url);
	}

	playListPlayer.on("play", () => {
		$(".bot-songrequest-play").addClass("btn-success").removeClass("btn-secondary");
		$(".bot-songrequest-play").find(".fa").addClass("fa-pause").removeClass("fa-play");
	});

	playListPlayer.on("end", () => {
		context.socket.emit("songrequest.end");

		$(".bot-songrequest-play").removeClass("btn-success").addClass("btn-secondary");
		$(".bot-songrequest-play").find(".fa").removeClass("fa-pause").addClass("fa-play");

		playList.shift();
		playNextSong();
	});

	playListPlayer.on("error", () => skipSong());

	function updateSongRequestPlaylist() {
		if (!playList.length) {
			return false;
		}

		$("#bot-songrequest .text-muted").hide();

		playList.forEach((song) => {
			if (!$("#bot-songrequest [data-url='" + song.url + "']").length) {
				$("#bot-songrequest").append(`
					<div data-url="${song.url}" class="list-group-item list-group-item-action d-flex justify-items-between">
						<span class="col-9">${song.title}</span>

						<div class="col-3">
							<button class="btn btn-danger" title="Remove song from playlist">
								<i class="fa fa-fw fa-times"></i>
							</button>
						</div>
					</div>
				`);
			}
		});
	}

	/* ------------------------------------------------------------------------------ */

	// On receive obs data
	context.socket.on("obs.data", (type, data) => {
		// On playlist update
		if (type === "songrequest.update") {
			playList 		= data;
			updateSongRequestPlaylist();
		} else
		// On song remove
		if (type === "songrequest.remove") {
			// Remove from page
			$("#bot-songrequest [data-url='" + data.url + "']").remove();

			// Remove from playlist
			playList.splice(playList.findIndex((song) => song.url === data.url), 1);

			updatePlaylistVisual();
		}
	});

	// On click play button
	$(document).on("click", ".bot-songrequest-play", function() {
		if (playListPlayer.status === TeusPlayer.Status.PAUSED) {
			playListPlayer.play();
		} else
		if (playListPlayer.status === TeusPlayer.Status.PLAYING) {
			playListPlayer.pause();
		} else {
			playNextSong();
		}

		$(this).toggleClass("btn-success btn-secondary");
		$(this).find(".fa").toggleClass("fa-play fa-pause");
	});

	// On click skip button
	$(document).on("click", ".bot-songrequest-skip", () => skipSong());

	// On click a song
	$(document).on("click", "#bot-songrequest .list-group-item-action", function() {
		playNextSong(playList.find((song) => song.url === $(this).attr("data-url")));
	});

	// On click song remove
	$(document).on("click", "#bot-songrequest .list-group-item-action .btn-danger", function(e) {
		e.preventDefault();
		e.stopPropagation();

		$(this).prop("disabled", true);

		context.socket.emit("bot.command", "songrequest", ["remove", $(this).parents(".list-group-item").data("url")]);
	});

	// On volume change
	$(document).on("change", ".bot-songrequest-volume", function() {
		const volume 		= this.value;

		localStorage.setItem("botVolume", volume);

		playListPlayer.setVolume(volume);
	});
};