const Sequelize 				= require("sequelize");

const fs 						= require("fs");
const path 						= require("path");
const appRoot 					= path.dirname(require.main.filename);

class BotDatabase {
	constructor(deviceId) {
		this.Sequelize 			= Sequelize;

		this.sequelize 			= new Sequelize("db", "root", "root", {
			dialect: 			"sqlite",
			storage: 			path.join(appRoot, "/../", "data", "db.sqlite")
		});

		// Define members
		this.Members 			= this.sequelize.define("member", {
			id: 				{
				type: 			Sequelize.INTEGER,
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
			level: 				Sequelize.INTEGER,
			charm: 				{
				type: 			Sequelize.INTEGER,
				defaultValue: 	0
			},
			messages: 			{
				type: 			Sequelize.INTEGER,
				defaultValue: 	0
			},
			totalCharm: 		{
				type: 			Sequelize.INTEGER,
				defaultValue: 	0
			},
			totalMessages: 		{
				type: 			Sequelize.INTEGER,
				defaultValue: 	0
			},
			points: 			{
				type: 			Sequelize.FLOAT(100, 2),
				defaultValue: 	0
			}
		});

		// Define member addons
		this.MemberAddons 		= this.sequelize.define("memberAddon", {
			member: 			{
				type: 			Sequelize.INTEGER,
				references: 	{
					model: 		this.Members,
					key: 		"id"
				}
			},
			addon: 				Sequelize.STRING,
			value: 				Sequelize.STRING,
		});

		// Define bot configuration
		this.Configs 			= this.sequelize.define("config", {
			email: 				{
				type: 			Sequelize.STRING(325),
				validate: 		{
					isEmail: 	true
				}
			},
			password: 			Sequelize.STRING(32),
			channel: 			Sequelize.INTEGER,
			canReply: 			{
				type: 			Sequelize.BOOLEAN,
				defaultValue: 	true
			},
			deviceId: 			Sequelize.STRING(16),
			addons: 			Sequelize.JSON,
			token: 				Sequelize.STRING(32),
			slId: 				Sequelize.STRING,
			slToken: 			Sequelize.STRING,
			slAccessToken: 		Sequelize.STRING
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
		return this.sequelize.sync().then(() => {
			return this.resetMembers();
		});
	}

	/**
	 * Get current bot configuration
	 * @return {Promise}
	 */
	getConfig() {
		return new Promise((resolve, reject) => {
			this.Configs.findOne()
			.then((config) => {
				resolve(JSON.parse(JSON.stringify(config)));
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
			charm: 				0
		}, {
			where: 				{
				messages: 		{
					$gt: 		0
				}
			},
			$or: 				[
				{
					charm: 		{
						$gt: 	0
					}
				}
			]
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