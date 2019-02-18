const fs 									= require("fs");
const EventEmitter 							= require("events");

const BotAuthenticator						= require("./core/auth");
const BotMember 							= require("./core/member");
const BotCommand 							= require("./core/command");
const BotDatabase 							= require("./core/database");

const BotActiveSocket 						= require("./core/active");

class BotClient extends EventEmitter {
	constructor(socket) {
		super();

		// Save socket instance
		this.socket 		 				= socket;

		// Start charm amount
		this.charmAmount 					= 0;

		// Socket handler
		this.sockets 						= {};

		// Set db defaults
		this.setDatabaseDefaults();

		// Reset members messages
		this.resetMembers();

		// Save database instance
		this.database 						= new BotDatabase();
		
		// Get database config
		this.config 						= this.database.get("config").value();

		// Create a new bot authentication client
		this.auth 							= new BotAuthenticator(this.config);
	};

	setDatabaseDefaults() {
		// Set database defaults
		return this.database.defaults({
			config: 						{
				email: 						null,
				password: 					null,
				channel: 					null,
				canReply: 					true,
				deviceId: 					BotActiveSocket.getRandomString(16),
				addons: 					[]
			},
			members: 						[]
		})
		.write();
	};

	resetMembers() {
		// Reset members current messages and charm
		return this.database.get("members").value().forEach(member => {
			this.database.get("members").find({ id: member.id }).assign({
				messages: 					0,
				charm: 						0
			})
			.write();
		});
	};

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

	/**
	 * Check if member exists
	 * @param  {Number} id 		Member ID
	 * @return {Boolean}
	 */
	memberExists(id) {
		return this.getMember(id) !== undefined;
	};

	/**
	 * Add a new member to the database
	 * @param {Object} data 	Member data
	 */
	addMember(data) {
		return this.database.get("members").push(data).write();
	};

	getMember(id) {
		return new BotMember(this.database.get("members").find({ id: id }).value());
	};

	getCharmAmount() {
		return this.charmAmount;
	};

	getMessage(message, data) {
		return new Function(...Object.keys(data), "return `" + message + "`;")(...Object.values(data));
	};

	getBotMember() {
		return new BotMember({
    		id: 							this.auth.getData().user.id,
    		nickname:						this.auth.getData().user.nickname,
    		level: 							1,
    		messages: 						0,
    		charm: 							0,
    		isMod: 							true
    	});
	};

	start() {
		this.auth.login(this.config.email, this.config.password, (err, result) => {
			this.emit("bot.auth", result, err);

			if (!err) {
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

			// Check if member exists
			// If not, add it to database
			if (!this.memberExists(message.FromUin)) {
				this.addMember(new BotMember(message));
			}

			// Update user basic data
			// and get corrected user data
			const user 						= this.database.get("members").find({ id: message.FromUin }).assign({
				isMod: 						message.FromAccess > 1,
				level: 						message.FromUserLv,
				picture: 					message.FromHeadImg
			})
			.write();

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

				// Member join
				if (message.MsgType === 20002) {
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
				} else
				// Like (charm) sent
				if (message.MsgType === 4) {
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
				} else
				// Gift (emote) 
				if (message.MsgType === 20015) {
					// Prepare emote data
					const emote 			= {
						id: 				data.GiftId,
						amount: 			data.Nums,
						cost: 				data.SendEventCost,
						emote: 				this.config.giftList && this.config.giftList[data.GiftId]
					};

					// Emit chat message
					this.emit("chat.message", {
						sender: 			user,
						message: 			this.getMessage(this.getLangMessage("CHAT_EMOTE"), {
							sender: 		user,
							emote: 			emote
						})
					});

					// Emit emote sent
					this.emit("chat.emote", {
						sender: 			user,
						emote: 				emote
					});
				} else
				// Channel follow
				if (message.MsgType === 10005) {
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
				}

				return false;
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
			} else {
				// Increase message number for member
				this.database.get("members").find({ id: user.id }).update("messages", n => n ? n + 1 : 1).write();

				// Increase message total number for member
				this.database.get("members").find({ id: user.id }).update("totalMessages", n => n ? n + 1 : 1).write();
			}
		});

		return socket;
	};
}

module.exports 								= BotClient;