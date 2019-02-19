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

		// Create a new streamlabs instance
		this.streamlabs 					= new BotStreamlabs(process.env.STREAMLABS_ID, process.env.STREAMLABS_SECRET, "http://teus.herokuapp.com", "donations.create alerts.create");
	};

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
			if (type === "chat.command") {
				delete arguments[1]._botClient;
				delete arguments[1].socket;
			}

			this.socket.to("bot").emit(type, arguments[1]);
		}
	};

	getCharmAmount() {
		return this.charmAmount;
	};

	getMessage(message, data) {
		return new Function(...Object.keys(data), "return `" + message + "`;")(...Object.values(data));
	};

	getBotMember() {
		return {
    		id: 							this.auth.getData().user.id,
    		nickname:						this.auth.getData().user.nickname,
    		level: 							1,
    		messages: 						0,
    		charm: 							0,
    		isMod: 							true
    	};
	};

	start() {
		if (this.config === null) {
			return false;
		}

		// Authenticate the bot with given configuration
		this.auth.login(this.config.email, this.config.password, (err, result) => {
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
	};

	createCommand(command, args, socket, sender) {
		return new BotCommand(command, args, socket, sender, this);
	};

	processDataMessage(message, user, data) {
		switch(message.MsgType) {
			// Default action
			default:
				this.debug("unhandled data message", message.MsgType, data);
				return false;
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

				this.emit("chat.join", {
					sender: 			user
				});
			break;

			// Like (charm) sent
			case 4:		
				// Increase member charm amount
				this.database.get("members").find({ id: user.id }).update("charm", n => n ? n + data.CharmCount : 1).write();

				// Increase member total charm amount
				this.database.get("members").find({ id: user.id }).update("totalCharm", n => n ? n + data.CharmCount : 1).write();

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
				this.streamlabs.addDonations({
					name: 				user.nickname,
					identifier: 		"streamcraft#" + user.id,
					amount: 			emote.cost / 1000,
					currency: 			"USD",
					message: 			emoteMessage
				});

				// Create a new alert at streamlabs
				this.streamlabs.addDonations({
					type: 				"donate",
					image_href: 		emote.animation,
					duration: 			emote.duration * 2,
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
	};

	/**
	 * Creates a new WebSocket client
	 * @param  {String}  type   	Client type (active or passive)
	 * @param  {String}  url     	Server URL
	 * @param  {Boolean} isRetry 	Is a retry?
	 * @return {WebSocket}        	Client WebSocket
	 */
	createClient(type, url, isRetry) {
	   	url									= url || this.auth.getData().ws[type];

	    const socket 						= new BotActiveSocket(url, type, this);

	    this.sockets[type] 					= socket;

	    // On socket error, reconnect
	    socket.on("error", () => {
	    	const newUrl 					= url.indexOf("5566") > -1 ? url.replace("5566", "6677") : url.replace("6677", "5566");
	    	setTimeout(() => this.createClient(type, newUrl, true), socket.ReconSec++ * 1000);
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
			this.database.getMember(message, (user) => {
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

					// Emit the command
					this.emit("chat.command", this.createCommand(realCommand, args, socket, user));
				}

				// Increment user messages
				this.database.Members.increment(["messages", "totalMessages"], { id: user.id });
			});
		});

		return socket;
	};
}

module.exports 								= BotClient;