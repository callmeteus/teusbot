const TeusPlayer 			= require("../../libs/teusplayer");

module.exports 				= function(context) {
	let playList 			= [];
	let playListPlayer 		= new TeusPlayer({ element: "#bot-songrequest-player" });

	function skipSong() {
		playListPlayer.stop();
		playListPlayer.emit("end");
	}

	function playNextSong(song) {
		$("#bot-songrequest .bg-success").remove();

		if (playList.length === 0) {
			$("#bot-songrequest .text-muted").show();
		}

		if (song === undefined) {
			song 			= playList[0];

			if (song === undefined) {
				return false;
			}
		}

		playListPlayer.playUrl(song.url);

		$("#bot-songrequest [data-url='" + song.url + "']").addClass("bg-success");

		context.socket.emit("songrequest.listen", song.url);
	}

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
				$("#bot-songrequest").append(`<div data-url="${song.url}" class="list-group-item list-group-item-action">${song.title}</div>`);
			}
		});
	}

	context.socket.on("obs.data", (type, data) => {
		if (type === "songrequest.update") {
			playList 		= data;
			updateSongRequestPlaylist();
		}
	});

	$(document).on("click", ".bot-songrequest-play", function() {
		if (!playListPlayer.status === TeusPlayer.Status.PAUSED) {
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

	$(document).on("click", ".bot-songrequest-skip", () => skipSong());

	$(document).on("click", "#bot-songrequest .list-group-item-action", function() {
		playNextSong(playList.find((song) => song.url === $(this).attr("data-url")));
	});
};