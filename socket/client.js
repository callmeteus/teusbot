const fs 									= require("fs");
const EventEmitter 							= require("events");

const BotAuthenticator						= require("./core/auth");
const BotCommand 							= require("./core/command");
const BotDatabase 							= require("./core/database");
const BotActiveSocket 						= require("./core/active");
const BotStreamlabs 						= require("./core/streamlabs");

class BotClient extends EventEmitter {
	constructor(socket) {
		super();

		// Save socket instance
		this.socket 		 				= socket;

		// Start charm amount
		this.charmAmount 					= 0;

		// Socket handler
		this.sockets 						= {};

		// Config handler
		this.config 						= {};

		// Save database instance
		this.database 						= new BotDatabase(BotActiveSocket.getRandomString(16));

		// Commands handler
		this.commands 						= {};
	}

	init() {
		return new Promise((resolve, reject) => {
			// Startup the database
			this.database.start().then(() => {
				// Get bot config
				return this.database.getConfig().then((config) => {
					// Save config
					this.config 			= config;

					// Create a new bot authentication client
					this.auth 				= new BotAuthenticator(this.config);

					const slConfig 			= {
						id: 				process.env.STREAMLABS_ID || this.config.slId,
						secret: 			process.env.STREAMLABS_SECRET || this.config.slToken,
						url: 				process.env.STREAMLABS_SECRET ? "https://teus.herokuapp.com" : "http://127.0.0.1:3200/streamlabs",
						scopes: 			"donations.create alerts.create"
					};

					// Create a new streamlabs instance
					this.streamlabs 		= new BotStreamlabs(slConfig.id, slConfig.secret, slConfig.url, slConfig.scopes, "", this.config.slAccessToken);

					// Success
					resolve();
				});
			})
			.catch(reject);
		});
	}

	emit(type, ...args) {
		super.emit(type, ...args);

		// Check if client has socket
		if (this.socket) {
			const data 						= Object.assign({}, arguments[1]);

			if (type === "chat.command") {
				delete data._botClient;
				delete data.socket;
			}

			this.socket.to("bot").emit(type, data);
		}
	}

	getCharmAmount() {
		return this.charmAmount;
	}

	getMessage(message, data) {
		return new Function(...Object.keys(data), "return `" + message + "`;")(...Object.values(data));
	}

	getBotMember() {
		return {
			id: 							this.auth.getData().user.id,
			nickname:						this.auth.getData().user.nickname,
			level: 							1,
			messages: 						0,
			charm: 							0,
			isMod: 							true
		}
	}

	start() {
		if (this.config === null) {
			return false;
		}

		// Authenticate the bot with given configuration
		this.auth.login(this.config.email, this.config.password, (err, result) => {
			if (err) {
				throw new Error(err);
			}

			this.emit("bot.auth", result, err);

			// Check if any error happened
			if (!err) {
				// Get bot user info
				this.auth.getInfo(() => {
					this.createClient("passive");
					this.createClient("active");

					this.emit("bot.data", this.auth.getData());
					this.emit("bot.ready");
				});
			}
		});
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
	 * Register a command
	 * @param  {String} command 	Command without the "!"
	 * @param  {Object} data    	Command data
	 * @return {Object}
	 */
	registerCommand(command, data) {
		this.commands[command] 		= data;
		return this.commands[command];
	}

	/**
	 * Process a command
	 * @param  {BotCommand} processor Command processor
	 * @return {Boolean}
	 */
	processCommand(processor) {
		// Check if command exists
		if (this.commands[processor.command] !== undefined) {
			const handler 		= this.commands[processor.command];

			// Check if it's a text command
			if (handler.type === "text") {
				let txt 		= handler.content;

				// Convert text into chat message
				txt 			= processor.getMessage(txt);

				// Send the message
				processor.sendMessage(txt);
			} else 
			// Check if it's an alias command
			if (handler.type === "alias") {
				// Separate command from arguments
				const args 		= handler.content.split(" ");
				const cmd 		= args.shift().replace("!", "");

				const command 	= this.createCommand(cmd, args, this.sockets.passive, processor.sender);

				// Emit a new command as alias
				this.emit("chat.command", command);
			} else {
				console.error("[bot] unknown command type '" + handler.type + "' for command", processor.command);
			}

			return true;
		}

		return false;
	};

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

			// Member quit?
			case 20003:
				// Instantiate channel data
				const channel 			= this.auth.getData().data.user;

				// Update current viewers and views
				channel.viewers 		= data.RealCount;
				channel.views 			= data.TotalViewCount;
			break;

			// Member join
			case 20002:
				// Instantiate channel data
				const channel 			= this.auth.getData().data.user;

				// Update current viewers and views
				channel.viewers 		= data.RealCount;
				channel.views 			= data.TotalViewCount;

				// Emit chat message
				this.emit("chat.message", {
					sender: 			user,
					message: 			this.getMessage(this.getLangMessage("CHAT_JOIN"), {
						sender: 		user
					})
				});

				// Emit chat join
				this.emit("chat.join", {
					sender: 			user
				});
			break;

			// Like (charm) sent
			case 4:
				// Increase member charm and total charm amount
				this.database.Members.increment(["charm", "totalCharm"], {
					where: 				{
						id: 			user.id
					}
				});

				// Save total charm count
				this.charmAmount 		= data.RecvUinCharm;

				// Emit chat message
				this.emit("chat.message", {
					sender: 			user,
					message: 			this.getMessage(this.getLangMessage("CHAT_CHARM"), {
						sender: 		user,
						charm: 			{
							amount: 	data.CharmCount
						}
					})
				});

				// Emit charm amount
				this.emit("chat.charm", {
					sender: 			user,
					amount: 			data.CharmCount,
					total: 				data.RecvUinCharm
				});
			break;

			// Gift (emote) 
			case 20015:
				// Prepare emote data
				const emote 			= {
					id: 				data.GiftId,
					amount: 			data.Nums,
					cost: 				data.SendEventCost,
					emote: 				this.config.giftList && this.config.giftList[data.GiftId]
				};

				// Process emote message
				const emoteMessage 		= this.getMessage(this.getLangMessage("CHAT_EMOTE"), {
					sender: 			user,
					emote: 				emote
				});

				// Emit chat message
				this.emit("chat.message", {
					sender: 			user,
					message: 			emoteMessage
				});

				// Emit emote sent
				this.emit("chat.emote", {
					sender: 			user,
					emote: 				emote
				});

				// Create a new donation at streamlabs
				this.streamlabs.addDonation({
					name: 				user.nickname,
					identifier: 		"streamcraft#" + user.id,
					amount: 			emote.cost / 100,
					currency: 			"USD",
					message: 			emoteMessage
				});
			break;

			// Channel follow
			case 10005:
				// Emit chat message
				this.emit("chat.message", {
					sender: 			user,
					message: 			this.getMessage(this.getLangMessage("CHAT_FOLLOW"), {
						sender: 		user
					})
				});

				// Emit emote sent
				this.emit("chat.follow", {
					sender: 			user
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
		url									= url || this.auth.getData().ws[type];

		const socket 						= new BotActiveSocket(url, type, this);

		this.sockets[type] 					= socket;

		// On socket error, reconnect
		socket.on("error", () => {
			if (retry === 3) {
				console.error("[bot] giving up. Impossible to reconnect to", type, "server!");
				return false;
			}

			console.info("[bot] trying to reconnect in", socket.ReconSec, "seconds");

			const newUrl 					= url.indexOf("5566") > -1 ? url.replace("5566", "6677") : url.replace("6677", "5566");
			setTimeout(() => this.createClient(type, newUrl, retry ? retry + 1 : 1), socket.ReconSec++ * 1000);
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

			// Get member from database
			this.database.getMember(message)
			.then((user) => {
				// Bot has been connected in another place
				if (message.MsgType === 20008) {
					this.debug("bot has been connected in another place.");

					return this.emit("bot.disconnect", "another_device");
				}

				// Check if text message is JSON
				if (text.indexOf("{\n") > -1) {
					// Parse JSON
					const data 					= JSON.parse(text);

					socket.debug("type", message.MsgType, "json", data);

					return this.processDataMessage(message, user, data);
				}

				// Emit the message
				this.emit("chat.message", {
					sender: 					user,
					message: 					text
				});

				// Check if it's a command
				if (text.split(" ")[0][0] === "!") {
					let args 					= text.split(" ");
					let command 				= args.shift();
					let realCommand 			= command.substr(1, command.length - 1);

					const processor 			= this.createCommand(realCommand, args, socket, user);

					// Check if command can be processed
					if (!this.processCommand(processor)) {
						// If not, emit the command
						this.emit("chat.command", processor);
					}
				}

				// Increment user messages, total messages and points
				this.database.Members.increment({
					messages: 					1,
					totalMessages: 				1,
					points: 					0.2
				}, {
					where: 						{
						id: 					user.id
					}
				});
			});
		});

		return socket;
	}
}

module.exports 								= BotClient;