const EventEmitter 							= require("events");
const m3u8Parser 							= require("m3u8-parser").Parser;

const BotCommand 							= require("./core/command");
const BotActiveSocket 						= require("./core/active");

const botApp 								= Symbol("botApp");
const botLanguage 							= Symbol("botLanguage");

class BotClient extends EventEmitter {
	constructor(app) {
		super();

		this.isDebug 						= true;

		// Save app instance
		this[botApp] 						= app;

		// Save database instance
		this.database 						= app.database;

		// Save Streamlabs instance
		this.streamlabs 					= app.streamlabs;

		// Stream data
		this.stream 						= {
			// Stream status
			online: 						false,
			// Stream start date
			started: 						new Date(),
			// Stream title
			title: 							null,
			// Stream viewers
			viewers: 						0,
			// Stream views
			views: 							0
		};

		// Socket handler
		this.sockets 						= {};

		// Config handler
		this.config 						= {};

		// Commands handler
		this.commands 						= [];

		// Timers handlers
		this.timers 						= [];

		// Data handler
		this.data 							= {};

		// Bot member
		this.botMember 						= {};

		// Language handler
		this[botLanguage] 					= [];

		// Client instance id
		this.instance 						= null;
	}

	emit(type, data, endpoint = ["streamer", "obs"]) {
		super.emit(type, data);

		if (!Array.isArray(endpoint)) {
			endpoint 						= [endpoint];
		}

		if (!Array.isArray(data)) {
			data 							= Object.assign({}, data);

			if (type === "chat.command") {
				delete data._botClient;
				delete data.socket;
			}
		}

		if (!this.data.data) {
			return false;
		}

		endpoint.forEach((end) => this[botApp].io.of("/" + end).in(this.data.data.user.uin).emit("obs.data", type, data));
	}

	getLangMessage(index, data) {
		const language 						= this[botLanguage].find((item) => item.key === index);

		if (language === undefined) {
			return "Missing translation for '" + index + "'";
		}

		let message 						= language.value;

		// Check if message contains data
		if (data) {
			message 						= this.getMessage(message, data);
		}

		// Return message
		return message;
	}

	getMessage(message, data) {
		return new Function(...Object.keys(data), "return `" + message + "`;")(...Object.values(data));
	}

	start() {
		return new Promise((resolve, reject) => {
			// Authenticate the bot with given configuration
			this[botApp].auth.login(this.config.email, this.config.password)
			.then(() => {
				// Get bot user info
				return this[botApp].auth.getInfo(this.config.channel);
			})
			.then((data) => {
				// Set channel data
				this.data 					= data;

				// Get language items filtering by language
				this[botLanguage] 			= this[botApp].languages.filter((item) => item.language === this.config.language);

				this.createClient("passive");
				this.createClient("active");

				const authData 				= this.data;

				this.emit("bot.data", authData);
				this.emit("bot.ready");

				// Get stream basic data
				this.stream.online 			= (authData.data.streams.LiveStatus === 1);
				this.stream.title 			= authData.data.streams.LiveTitle;

				// Check if stream is online
				if (!authData.data.streams.RecvRtmpResolutionList.length) {
					return resolve();
				}

				// Get M3U8 file to parse stream start time
				this[botApp].auth.request({
					url: 					authData.data.streams.RecvRtmpResolutionList[0].ResolutionHls,
					method: 				"GET",
					json: 					false
				}, (err, res, body) => {
					if (err) {
						return reject(new Error("Error retrieving m3u8 stream information file: " + err));
					}

					const parser 			= new m3u8Parser();

					parser.push(body);
					parser.end();

					// Calculate stream start date
					this.stream.started 	= new Date();
					this.stream.started 	= this.stream.started.getTime() + ((parser.manifest.mediaSequence * parser.manifest.targetDuration) * 1000);

					this.stream.online 		= true;

					resolve();
				});
			})
			.catch((err) => {
				console.error("[error] authentication error for", this.config.email, err);
				reject(err);
			});
		});
	}

	/**
	 * End the client
	 */
	end() {
		Object.values(this.sockets).forEach((socket) => socket.close());
	}

	/**
	 * Create a command handler
	 * @param  {String} command 	Command name
	 * @param  {Array} args			Command arguments
	 * @param  {BotSocket} socket  	Command socket
	 * @param  {Object} sender  	Sender data
	 * @return {BotCommand}
	 */
	createCommand(command, args, socket, sender) {
		return new BotCommand(command, args, socket, sender, this);
	}

	/**
	 * Registers a command
	 * @param  {Object} data    	Command data
	 * @return {Number}
	 */
	registerCommand(data) {
		// Copy command data
		const command 						= Object.assign({}, data);

		// Check if is an addon
		if (command.type === "addon") {
			// Instantiate it
			return command.content.call(this.getCommandContext(command));
		}

		// Check if contains onEnter
		if (command.onEnter !== undefined) {
			command.onEnter.call(this.getCommandContext(command));
		}

		const finalCommand 					= command.type === "text" || command.type === "alias" ? {
			name: 							command.name ? command.name.toLowerCase() : null,
			type: 							command.type,
			content: 						command.content
		} : command;

		return this.commands.push(finalCommand);
	}

	/**
	 * Get the command function context
	 * @param  {Object} module [description]
	 * @return {Object}        [description]
	 */
	getCommandContext(module) {
		return {
			client: 						this,
			module: 						module,
			socket: 						this.sockets.passive
		};
	}

	/**
	 * Process a command
	 * @param  {BotCommand} processor Command processor
	 * @return {Boolean}
	 */
	processCommand(processor) {
		if (processor.command === "commands" || processor.command === "comandos") {
			return processor.sendMessage(
				this.commands
				.filter((cmd) => {
					return cmd !== null && cmd.type !== "addon";
				})
				.map((cmd) => {
					return "!" + cmd.name;
				})
				.join(", ")
			);
		}

		// Get all available command handlers
		const handlers 						= this.commands.filter((cmd) => cmd.name === processor.command);

		// Check if command exists
		if (handlers.length === 0) {
			return false;
		}

		// Iterate over all handlers
		handlers.forEach((handler) => {
			// Check if it's a text command
			if (handler.type === "text") {
				// Send the message
				processor.sendMessage(processor.getMessage(handler.content));
			} else 
			// Check if it's an alias command
			if (handler.type === "alias") {
				// Separate command from arguments
				const args 					= handler.content.split(" ");
				const cmd 					= args.shift().replace("!", "");

				// Add current command arguments
				processor.arguments.forEach((arg) => args.push(arg));

				// Create the processor
				const command 				= this.createCommand(cmd, args, this.sockets.passive, processor.sender);

				this.processCommand(command);
			} else
			// Check if it's a module command
			if (handler.type === "module") {
				handler.content.call(this.getCommandContext(handler), processor);
			} else {
				console.error("[bot] unknown command type", handler.type, "for command", processor.command);
			}
		});

		return false;
	}

	/**
	 * Get a module by it's name
	 * @param  {String} name Module name
	 * @return {Object}      Module data
	 */
	getModule(name) {
		return this.commands.find((m) => m.name === name);
	}

	/**
	 * Registers a timer
	 * @param  {Object} data 		Timer data
	 * @return {Object}
	 */
	registerTimer(data) {
		return this.timers.push({
			name: 							data.name || null,
			type: 							data.type || "invalid",
			content: 						data.content || null,
			interval: 						data.interval ? data.interval * 60 * 1000 : Number.MAX_SAFE_INTEGER,
			sequential: 					data.sequential || false
		});
	}

	/**
	 * Starts all bot timers
	 */
	startTimers() {
		// Iterate over all timers
		this.timers.forEach((timer) => {
			// Check if timer type is text
			if (timer.type === "text") {
				// Create a new instance to send 'timer.content' every 'timer.interval'
				timer.instance 				= setInterval(() => this.sockets.passive.sendMessage(timer.content), timer.interval);
			} else
			// Check if timer type is command
			if (timer.type === "command") {
				// Split timer content
				let command 				= timer.content.split(" ");

				// Create the command handler
				command 					= this.createCommand(command.shift().replace("!", ""), command, this.sockets.passive, this.botMember);

				// Create a new instance to run 'command' every 'timer.interval'
				timer.instance 				= setInterval(() => this.processCommand(command), timer.interval);
			}
		});
	}

	/**
	 * Stops all bot timers
	 */
	stopTimers() {
		// Iterate over all timers
		this.timers.forEach((timer) => {
			// Check if timer is active
			if (timer.instance) {
				// Clear timer interval
				clearInterval(timer.instance);
			}
		});
	}

	/**
	 * Process data message
	 * @param  {Object} message  	StreamCraft message object
	 * @param  {Object} user		Message sender
	 * @param  {Object} data		Message data
	 * @return {Boolean}
	 */
	processDataMessage(message, user, data) {
		switch(message.MsgType) {
			// Unhandled action
			default:
				console.log("[bot] unhandled data message", message.MsgType, data);
			break;

			// Mute
			// TODO: handle this packet properly
			case 20005:
				const from 					= data.AdminUin;
				const to 					= data.GagUin;
				const length 				= data.GagTimeLne;
				const expires 				= data.GagExpire;
			break;

			// Authority change
			// TODO: handle this packet properly
			case 20019:
				const level 				= data.Access;
				const admin					= data.AdminUin;
			break;

			// Stream status?
			case 20000:
				this.stream.online 			= (data.Status === 1);
				this.stream.title 			= data.Title;
				this.stream.started 		= new Date();

				this.emit("stream.update", this.stream, "/stream");
			break;

			// Member quit
			case 20003:
			case 20002:
				// Update current viewers and views
				this.stream.viewers 		= data.RealCount;
				this.stream.views 			= data.TotalViewCount;

				this.emit("stream.update", this.stream, "/stream");

			// Member join
			case 20002:
				// Emit chat message
				this.emit("chat.message", {
					sender: 				user,
					message: 				this.getMessage(this.getLangMessage("CHAT_JOIN"), {
						sender: 			user
					})
				});

				// Emit chat join
				this.emit("chat.join", {
					sender: 				user
				});
			break;

			// Like (charm) sent
			// Just ignore it
			case 4:

			break;

			// Gift (emote) 
			case 20015:
				// Prepare emote data
				const emote 				= {
					id: 					data.GiftId,
					amount: 				data.Nums,
					cost: 					data.SendEventCost,
					emote: 					this.config.giftList[data.GiftId]
				};

				// Process emote message
				const emoteMessage 			= this.getMessage(this.getLangMessage("CHAT_EMOTE"), {
					sender: 				user,
					emote: 					emote
				});

				// Emit chat message
				this.emit("chat.message", {
					sender: 				user,
					message: 				emoteMessage,
					special: 				true
				});

				// Emit emote sent
				this.emit("chat.emote", {
					sender: 				user,
					emote: 					emote
				});

				// Create a new donation at StreamLabs
				this.streamlabs.addDonation(this.config.streamLabsToken, {
					name: 					user.nickname,
					identifier: 			"streamcraft#" + user.id,
					amount: 				emote.cost / 100,
					currency: 				"USD",
					message: 				user.nickname + " " + emoteMessage.replace(/<(?:.|\n)*?>/gm, "")
				});
			break;

			// Channel follow
			case 10005:
				// Emit chat message
				this.emit("chat.message", {
					sender: 				user,
					message: 				this.getMessage(this.getLangMessage("CHAT_FOLLOW"), {
						sender: 			user
					}),
					special: 				true
				});

				// Emit emote sent
				this.emit("chat.follow", {
					sender: 				user
				});
			break;
		}

		return true;
	}

	/**
	 * Creates a new WebSocket client
	 * @param  {String}  type   	Client type (active or passive)
	 * @param  {String}  url		Server URL
	 * @param  {Number}  retry 		Retry times
	 * @return {WebSocket}			Client WebSocket
	 */
	createClient(type, url, retry) {
		url									= url || this.data.ws[type];

		const socket 						= new BotActiveSocket(url, type, this);
		this.sockets[type] 					= socket;

		socket.debug("connecting...");

		// On socket error, reconnect
		socket.on("error", () => {
			if (retry === 3) {
				console.error("[bot] giving up. Impossible to reconnect to", type, "server!");

				// Check if active server failed
				if (type === "active") {
					// Pass authority to passive server
					// Maybe this works
					this.sockets.active 	= this.sockets.passive;
					this.sockets.packets.active.getStudioConfig();

					console.info("[bot] active authority is now with passive socket");
				}

				return false;
			}

			console.info("[bot] trying to reconnect in", socket.ReconSec, "seconds");

			const newUrl 					= url.indexOf("5566") > -1 ? url.replace("5566", "6677") : url.replace("6677", "5566");

			setTimeout(() => {
				this.createClient(type, newUrl, retry ? retry + 1 : 1);
			}, socket.ReconSec++ * 1000);
		});

		// On receive gift list
		socket.on("giftList", (list) => {
			this.config 					= this.config || {};
			this.config.giftList 			= list;
		});

		// On receive chat
		socket.on("chat", (message) => {
			// Get text from message content
			const text 						= message.MsgContent.Buff;

			// Bot has been connected in another place
			if (message.MsgType === 20008) {
				socket.debug("bot has been connected in another place.");
				return this.emit("bot.disconnect", "another_device");
			}

			// Assign message channel
			message.Channel 					= this.data.data.user.uin;

			// Get member from database
			this.database.getMember(message)
			.then((user) => {
				// Check if it's the bot user
				if (user.id === this.data.user.uin) {
					this.botMember 				= user;
				}

				// Check if text message is JSON
				if (text.indexOf("{\n") > -1) {
					// Parse JSON
					const data 					= JSON.parse(text);
					return this.processDataMessage(message, user, data);
				}

				// Emit the message
				this.emit("chat.message", {
					sender: 					user,
					message: 					text
				});

				// Check if stream is online
				// or is debug
				if (this.stream.online || this.isDebug) {
					const firstLetter 			= text.split(" ")[0][0];

					// Check if it's a command
					if (firstLetter === "!" || firstLetter === "+" || firstLetter === "/") {
						let args 				= text.split(" ");
						let command 			= args.shift();
						let realCommand 		= command.substr(1, command.length - 1);

						const processor 		= this.createCommand(realCommand, args, socket, user);

						// Call the processor
						this.processCommand(processor);
					}

					// Increment user messages, total messages and points
					this.database.Members.increment({
						messages: 				1,
						totalMessages: 			1,
						points: 				this.config.pointsPerMessage || 0.2
					}, {
						where: 					{
							id: 				user.id
						}
					});
				}
			});
		});

		return socket;
	}
}

module.exports 								= BotClient;