const Sequelize 				= require("sequelize");

const fs 						= require("fs");
const path 						= require("path");
const appRoot 					= path.dirname(require.main.filename);

class BotDatabase {
	constructor() {
		// Instantiate sequelize
		this.Sequelize 			= Sequelize;

		// Create the sequelize instance
		this.sequelize 			= new Sequelize(process.env.JAWSDB_URL, {
			dialect: 			"mysql",
			dialecOptions: 		{
				charset: 		"utf8mb4"
			}
		});

		// Define members
		this.Members 			= this.sequelize.define("member", {
			id: 				{
				type: 			Sequelize.INTEGER.UNSIGNED,
				primaryKey: 	true
			},
			nickname: 			{
				type: 			Sequelize.STRING,
				allowNull: 		false
			},
			picture: 			Sequelize.STRING,
			isMod: 				{
				type: 			Sequelize.BOOLEAN,
				defaultValue: 	false
			},
			level: 				Sequelize.INTEGER.UNSIGNED,
			messages: 			{
				type: 			Sequelize.INTEGER.UNSIGNED,
				defaultValue: 	0
			},
			totalMessages: 		{
				type: 			Sequelize.INTEGER.UNSIGNED,
				defaultValue: 	0
			},
			points: 			{
				type: 			Sequelize.FLOAT(255, 2),
				defaultValue: 	0
			},
			channel: 			{
				type: 			Sequelize.INTEGER.UNSIGNED,
				defaultValue: 	null
			}
		}, {
			charset: 			"utf8mb4"
		});

		// Define member addons
		this.MemberAddons 		= this.sequelize.define("memberAddon", {
			member: 			{
				type: 			Sequelize.INTEGER.UNSIGNED,
				references: 	{
					model: 		this.Members,
					key: 		"id"
				}
			},
			addon: 				Sequelize.STRING,
			value: 				Sequelize.STRING,
			channel: 			{
				type: 			Sequelize.INTEGER.UNSIGNED,
				defaultValue: 	null
			}
		});

		// Define bot commands
		this.BotCommands 		= this.sequelize.define("botCommand", {
			channel: 			{
				type: 			Sequelize.INTEGER.UNSIGNED,
				allowNull: 		false
			},
			name: 				{
				type: 			Sequelize.STRING,
				allowNull: 		false
			},
			type: 				{
				type: 			Sequelize.ENUM("text", "alias", "script"),
				allowNull: 		false
			},
			content: 			{
				type: 			Sequelize.STRING,
				allowNull: 		false
			},
			active: 			{
				type: 			Sequelize.BOOLEAN,
				defaultValue: 	true
			}
		});

		// Define bot configuration
		this.Configs 			= this.sequelize.define("config", {
			channel: 			Sequelize.INTEGER.UNSIGNED,
			key: 				Sequelize.STRING(325),
			value: 				Sequelize.TEXT
		}, {
			timestamps: 		false
		});

		this.MemberAddons.belongsTo(this.Members, {
			as: 				"memberAddon",
			foreignKey: 		"member",
			targetKey: 			"id"
		});

		this.Members.hasMany(this.MemberAddons, {
			as: 				"addons",
			foreignKey: 		"member",
			targetKey: 			"member"
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
			messages: 			0,
		}, {
			where: 				{
				messages: 		{
					$gt: 		0
				}
			}
		});
	}

	/**
	 * Find and update or create a bot member
	 * @param  {Object} message StreamCraft message object
	 * @return {Promise}
	 */
	getMember(message) {
		return new Promise((resolve, reject) => {
			// Check if message is set
			if (message === undefined) {
				return reject(new Error("Message or ID is not defined."));
			}

			let data 			= {};

			if (typeof message === "object") {
				// Prepare member data from message
				data 			= {
					id: 		message.FromUin,
					nickname: 	message.FromNickName.trim(),
					picture: 	message.FromHeadImg,
					isMod: 		message.FromAccess ? message.FromAccess > 1 : false,
					level: 		message.FromUserLv
				};
			} else {
				data.id 		= message;
			}

			// Find or create member
			this.Members.findOrCreate({
				where: 			{
					id: 		data.id
				},
				include: 		{
					model: 		this.MemberAddons,
					as: 		"addons",
					attributes: ["id", "addon", "value"],
					required: 	false
				},
				defaults: 		data
			})
			.spread((member, created) => {
				member 			= member.dataValues;

				// Return member
				resolve(member);

				// Check if it was created now
				// and it's a full member
				if (!created && data.nickname !== undefined) {
					// Try to update member with new data
					this.Members.update(data, {
						where: 	{
							id: data.id
						}
					})
					.catch((err) => {
						console.error("[db] error updating member", err);
					});
				}
			})
			.catch(reject);
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
			where: 				{
				id: 			id
			}
		});
	}
}

module.exports 					= BotDatabase;