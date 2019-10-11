const Sequelize 					= require("sequelize");
const fs 							= require("fs");

const BotMember 					= require("./member");

class BotDatabase {
	constructor() {
		// Instantiate sequelize
		this.Sequelize 				= Sequelize;

		// Create the sequelize instance
		this.sequelize 				= new Sequelize(process.env.JAWSDB_URL || process.env.JAWSDB_MARIA_URL, {
			dialect: 				"mysql",
			dialecOptions: 			{
				charset: 			"utf8mb4"
			},
			logging: 				false
		});

		// Define members
		this.Members 				= this.sequelize.define("member", {
			id: 					{
				type: 				Sequelize.INTEGER.UNSIGNED,
				primaryKey: 		true
			},
			username: 				{
				type: 				Sequelize.STRING,
				allowNull: 			true,
				defaultValue: 		null,
				validate: 			{
					min: 			1
				}
			},
			nickname: 				{
				type: 				Sequelize.STRING,
				allowNull: 			false,
				validate: 			{
					min: 			1
				}
			},
			picture: 				{
				type: 				Sequelize.STRING,
				allowNull: 			false,
				defaultValue: 		"http://127.0.0.1/img/default.png"
			},
			level: 					Sequelize.INTEGER.UNSIGNED,
			messages: 				{
				type: 				Sequelize.INTEGER.UNSIGNED,
				defaultValue: 		0
			},
			totalMessages: 			{
				type: 				Sequelize.INTEGER.UNSIGNED,
				defaultValue: 		0
			},
			points: 				{
				type: 				Sequelize.FLOAT(255, 2).UNSIGNED,
				defaultValue: 		0
			},
			channel: 				{
				type: 				Sequelize.INTEGER.UNSIGNED,
				defaultValue: 		null
			},
			access: 				{
				type: 				Sequelize.INTEGER.UNSIGNED,
				defaultValue: 		1
			}
		}, {
			charset: 				"utf8mb4"
		});

		// Define member addons
		this.MemberAddons 			= this.sequelize.define("memberAddon", {
			member: 				{
				type: 				Sequelize.INTEGER.UNSIGNED,
				references: 		{
					model: 			this.Members,
					key: 			"id"
				}
			},
			addon: 					Sequelize.STRING,
			value: 					Sequelize.STRING,
			channel: 				{
				type: 				Sequelize.INTEGER.UNSIGNED,
				defaultValue: 		null
			}
		});

		// Define bot commands
		this.BotCommands 			= this.sequelize.define("botCommand", {
			channel: 				{
				type: 				Sequelize.INTEGER.UNSIGNED,
				allowNull: 			false
			},
			name: 					{
				type: 				Sequelize.STRING,
				allowNull: 			false
			},
			type: 					{
				type: 				Sequelize.ENUM("text", "alias", "script"),
				allowNull: 			false
			},
			content: 				{
				type: 				Sequelize.STRING,
				allowNull: 			false
			}
		});

		// Define bot timers
		this.BotTimers 				= this.sequelize.define("botTimer", {
			channel: 				{
				type: 				Sequelize.INTEGER.UNSIGNED,
				allowNull: 			false
			},
			name: 					{
				type: 				Sequelize.STRING,
				allowNull: 			false
			},
			type: 					{
				type: 				Sequelize.ENUM("text", "command"),
				allowNull: 			false
			},
			content: 				{
				type: 				Sequelize.STRING,
				allowNull: 			false
			},
			interval: 				{
				type: 				Sequelize.INTEGER,
				defaultValue: 		1
			}
		});

		// Define bot language
		this.BotLanguages 			= this.sequelize.define("botLanguage", {
			language: 				Sequelize.ENUM("pt", "en"),
			key: 					Sequelize.STRING,
			value: 					Sequelize.STRING(500)
		});

		// Define bot configuration
		this.Configs 				= this.sequelize.define("config", {
			channel: 				Sequelize.INTEGER.UNSIGNED,
			key: 					Sequelize.STRING(325),
			value: 					Sequelize.TEXT
		}, {
			timestamps: 			false
		});

		this.MemberAddons.belongsTo(this.Members, {
			as: 					"memberAddon",
			foreignKey: 			"member",
			targetKey: 				"id"
		});

		this.Members.hasMany(this.MemberAddons, {
			as: 					"addons",
			foreignKey: 			"member",
			targetKey: 				"member"
		});
	}

	/**
	 * Start the database sync
	 * @return {Promise}
	 */
	start() {
		return this.sequelize.sync({
			alter: 				true
		}).then(() => {
			return this.resetMembers();
		});
	}

	/**
	 * Get current bot commands
	 * @return {Promise}
	 */
	getCommands(channel) {
		return new Promise((resolve, reject) => {
			this.BotCommands.findAll({
				where: 				{
					channel: 		channel
				},
				attributes: 		["id", "name", "type", "content", "createdAt", "updatedAt"]
			})
			.then(resolve)
			.catch(reject);
		});
	}

	/**
	 * Get current bot timers
	 * @return {Promise}
	 */
	getTimers(channel) {
		return new Promise((resolve, reject) => {
			this.BotTimers.findAll({
				where: 				{
					channel: 		channel
				},
				attributes: 		["id", "name", "type", "content", "interval", "createdAt", "updatedAt"]
			})
			.then(resolve)
			.catch(reject);
		});
	}

	/**
	 * Get current bot configuration
	 * @return {Promise}
	 */
	getConfig(channel) {
		return new Promise((resolve, reject) => {
			this.Configs.findAll({
				where: 				{
					channel: 		channel
				}
			})
			.then((data) => {
				const config 		= {};

				data.forEach((f) => {
					config[f.key]	= f.value;
				});

				config.addons 		= config.addons ? config.addons.split(",") : [];
				config.channel 		= channel;
				config.canReply 	= config.canReply === "1";
				config.autoEnter 	= config.autoEnter === "1";
				config.active 		= config.active === "1";
				config.language 	= config.language || "en";
				config.giftList 	= config.giftList ? JSON.parse(config.giftList) : null;

				resolve(config);
			})
			.catch(reject);
		});
	}

	/**
	 * Reset current stream bot members data
	 * @return {Promise}
	 */
	resetMembers() {
		// Reset members current messages and charm
		// where messages or charm are greater than zero
		return this.Members.update({
			messages: 				0,
		}, {
			where: 					{
				messages: 			{
					$gt: 			0
				}
			}
		});
	}

	/**
	 * Find and update or create a bot member
	 * @param  {Object} message StreamCraft message object
	 * @param  {Number} channel StreamCraft channel ID
	 * @return {Promise}
	 */
	getMember(message, channel) {
		return new Promise((resolve, reject) => {
			// Check if message is set
			if (message === undefined) {
				return reject(new Error("Message or user ID is not defined."));
			}

			let data 				= {};
			let messageData;

			if (typeof message === "object") {
				if (message.FromUin !== undefined) {
					// Prepare member data from message
					data 			= {
						id: 		message.FromUin,
						nickname: 	message.FromNickName.trim(),
						picture: 	message.FromHeadImg,
						level: 		message.FromUserLv,
						channel: 	message.Channel,
						access: 	message.FromAccess,
						tag: 		message.MeddlShowName
					};
				} else {
					data 			= {
						id: 		message.Uin,
						nickname: 	message.NickName,
						username: 	message.UserName,
						picture: 	message.HeadImg,
						level: 		message.LV,
						access: 	message.Access,
					};
				}

				data.username 		= data.username || null;
			} else {
				data.id 			= message;
			}

			const memberWhere 		= {
				id: 				data.id,
				channel: 			channel ? channel : data.channel
			};

			// Find or create member
			this.Members.findOrCreate({
				where: 				memberWhere,
				include: 			{
					model: 			this.MemberAddons,
					as: 			"addons",
					attributes: 	["id", "addon", "value"],
					required: 		false
				},
				defaults: 			data
			})
			.spread((member, created) => {
				const final 		= new BotMember(Object.assign({}, member.get(), data));

				resolve(final);

				// Check if it was created now
				// and if it is a full member
				if (!created && data.nickname !== undefined) {
					if (data.username === null && final.username !== null) {
						delete data.username;
					}

					// Try to update member with new data
					this.Members.update(data, {
						where: 		memberWhere
					});
				}
			})
			.catch((e) => {
				console.error(e);
				reject(e);
			});
		});
	}

	/**
	 * Updates a bot member
	 * @param  {[type]} id   [description]
	 * @param  {[type]} data [description]
	 * @return {[type]}      [description]
	 */
	updateMember(id, data) {
		return this.Members.update(data, {
			where: 					{
				id: 				id
			}
		});
	}
}

module.exports 						= BotDatabase;