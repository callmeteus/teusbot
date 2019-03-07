/**
 * TeusPlayer
 * A multi-service web audio player
 */

class TeusPlayer extends EventTarget {
	static get Status() {
		return {
			LOADING: 					-1,
			READY: 						0,
			PLAYING: 					1,
			PAUSED: 					2,
			STOPPED: 					3
		};
	}

	constructor(options) {
		super();

		this.options 					= options;
		this.element 					= document.querySelector(options.element);

		this.lastItem 					= {};
		this.currentItem				= {};

		this.status 					= TeusPlayer.Status.READY;

		this.players 					= {};
		this.elements 					= {};
	}

	createElementFor(type, tag = "iframe") {
		let element 					= document.createElement(tag);
		element.id 						= this.element.id + "-" + type;

		element.allow 					= "autoplay";
		element.frameborder 			= "0";
		element.scrolling 				= "no";

		this.element.appendChild(element);
		this.element.style.display 		= "none";

		this.on("play", () => this.status = TeusPlayer.Status.PLAYING);
		this.on("pause", () => this.status = TeusPlayer.Status.PAUSED);
		this.on("stop", () => this.status = TeusPlayer.Status.STOPPED);

		this.on("error", (e) => {
			this.status 				= TeusPlayer.Status.STOPPED;
			console.error("teusplayer error:", e);
		});

		return element;
	}

	init() {
		return new Promise((resolve, reject) => {
			if (this.elements[this.currentItem.type] !== undefined) {
				return resolve();
			}

			if (this.currentItem.type === "youtube") {
				window.onYouTubeIframeAPIReady 	= () => {
					this.elements.youtube 		= this.createElementFor("youtube", "div");

					delete window.onYouTubeIframeAPIReady;
					resolve();
				};

				// YouTube script needs special handle using onYouTubeIframeAPIReady
				$.getScript("https://www.youtube.com/iframe_api");
			} else
			if (this.currentItem.type === "soundcloud") {
				// Get SoundCloud script
				$.getScript("https://w.soundcloud.com/player/api.js", () => {
					this.elements.soundcloud 	= this.createElementFor("soundcloud", "iframe");
					resolve();
				});
			} else
			if (this.currentItem.type === "vimeo") {
				// Get Vimeo script
				$.getScript("https://player.vimeo.com/api/player.js", () => {
					this.elements.vimeo 			= this.createElementFor("vimeo", "iframe");
					resolve();
				});
			}
		});
	}

	on(event, callback) {
		this.addEventListener(event, callback);
	}

	emit(event, data) {
		return this.dispatchEvent(new CustomEvent(event, data));
	}

	playVimeo() {
		this.elements.vimeo.src 			= "https://player.vimeo.com/video/" + this.currentItem.id;
		

		if (!this.players.vimeo) {
			this.players.vimeo 				= new Vimeo.Player(this.elements.vimeo);

			this.players.vimeo.on("loaded", () => this.players.vimeo.play());

			this.players.vimeo.on("play", () => this.emit("play"));
			this.players.vimeo.on("pause", () => this.emit("pause"));
			this.players.vimeo.on("error", () => this.emit("error"));
			this.players.vimeo.on("ended", () => this.emit("end"));
			this.players.vimeo.on("progress", (e) => this.emit("progress", {
				position: 					e.seconds,
				duration: 					e.duration
			}));
		}

		return this.players.vimeo;
	}

	playSoundCloud() {
		this.elements.soundcloud.src 	= "https://w.soundcloud.com/player?url=" + this.currentItem.url + "&auto_play=1&sharing=0";

		if (!this.players.soundcloud) {
			this.players.soundcloud 	= new SC.Widget(this.elements.soundcloud);

			this.players.soundcloud.bind(SC.Widget.Events.ERROR, () => this.emit("error"));
			this.players.soundcloud.bind(SC.Widget.Events.PLAY, () => this.emit("play"));
			this.players.soundcloud.bind(SC.Widget.Events.PAUSE, () => this.emit("pause"));
			this.players.soundcloud.bind(SC.Widget.Events.FINISH, () => this.emit("end"));
			this.players.soundcloud.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => this.emit("progress", {
				position: 					e.currentPosition,
				duration: 					this.players.soundcloud.getDuration()
			}));
		}

		return this.players.soundcloud;
	}

	playYouTube() {
		if (this.players.youtube) {
			this.players.youtube.loadVideoById(this.currentItem.id);
		} else {
			this.players.youtube 			= new YT.Player(this.elements.youtube.id, {
				height: 					360,
				width: 						640,
				videoId: 					this.currentItem.id,
				events: 					{
					onReady: 				() => this.players.youtube.playVideo(),
					onError: 				(e) => this.emit("error", { message: e.data }),
					onStateChange: 			(e) => {
						if (e.data === YT.PlayerState.PLAYING) {
							this.emit("play");
						} else
						if (e.data === YT.PlayerState.ENDED) {
							this.emit("end");
						} else
						if (e.data === YT.PlayerState.PAUSED) {
							this.emit("pause");
						}
					}
				}
			});
		}

		return this.players.youtube;
	}

	play() {
		if (this.currentItem.url === undefined) {
			return false;
		} else
		if (this.currentItem.type === "youtube") {
			this.currentItem.player 		= this.playYouTube();
		} else
		if (this.currentItem.type === "soundcloud") {
			this.currentItem.player 		= this.playSoundCloud();
		} else
		if (this.currentItem.type === "vimeo") {
			this.currentItem.player 		= this.playVimeo();
		} else {
			return false;
		}

		return true;
	}

	pause() {
		if (this.currentItem.url === undefined) {
			return false;
		} else
		if (this.currentItem.type === "youtube") {
			return this.currentItem.player.pauseVideo();
		} else
		if (this.currentItem.type === "soundcloud" || this.currentItem.type === "vimeo") {
			return this.currentItem.player.pause();
		} else {
			return false;
		}
	}

	stop() {
		if (this.currentItem.url === undefined) {
			return false;
		} else
		if (this.currentItem.type === "youtube") {
			this.currentItem.player.stopVideo();
		} else
		if (this.currentItem.type === "soundcloud" || this.currentItem.type === "vimeo") {
			this.currentItem.player.pause();
		} else {
			return false;
		}

		this.emit("stop");

		return true;
	}

	playUrl(url) {
		this.lastItem 					= this.currentItem;

		this.currentItem 				= {
			url: 						url
		};

		if (this.element === null) {
			this.element 				= document.querySelector(this.options.element);

			if (this.element === null) {
				return false;
			}
		}

		if (url.indexOf("youtu.be") > -1 || url.indexOf("youtube.com") > -1) {
			this.currentItem.id 		= url.indexOf("youtu.be") > -1 ? url.split("youtu.be/")[1] : url.split("?v=")[1];
			this.currentItem.type 		= "youtube";
		} else
		if (url.indexOf("soundcloud.com") > -1) {
			this.currentItem.type 		= "soundcloud";
		} else
		if (url.indexOf("vimeo.com") > -1) {
			this.currentItem.id 		= url.split("vimeo.com/")[1];
			this.currentItem.type 		= "vimeo";
		} else {
			return false;
		}

		this.init().then(() => this.play());

		return this.currentItem;
	}
}