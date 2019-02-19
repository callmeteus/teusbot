const Sequelize 				= require("sequelize");

const fs 						= require("fs");
const path 						= require("path");

const appRoot 					= path.dirname(require.main.filename);

class BotDatabase {
	constructor(deviceId) {
		this.database 			= new Sequelize("db", "root", "root", {
			dialect: 			"sqlite",
			storage: 			path.join(appRoot, "/../", "data", "db.sqlite")
		});

		// Define members
		this.Members 			= this.database.define("member", {
			id: 				{
				type: 			Sequelize.INTEGER,
				primaryKey: 	true
			},
			nickname: 			Sequelize.STRING,
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
			}
		});

		// Define member addons
		this.MemberAddons 		= this.database.define("memberAddon", {
			member: 			{
				type: 			Sequelize.INTEGER,
				primaryKey: 	true
			},
			addon: 				Sequelize.STRING,
			value: 				Sequelize.STRING,
		});

		// Define bot configuration
		this.Configs 			= this.database.define("config", {
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
			token: 				Sequelize.STRING(32)
		});
	};

	/**
	 * Start the database sync
	 * @return {Promise}
	 */
	start() {
		return this.database.sync();
	};

	/**
	 * Get current bot configuration
	 * @return {Promise}
	 */
	getConfig() {
		return this.Configs.findOne();
	};

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
	};

	/**
	 * Find and update or create a bot member
	 * @param  {Object} message StreamCraft message object
	 * @return {Promise}
	 */
	getMember(message) {
		return new Promise((resolve, reject) => {
			// Check if message is set
			if (message === undefined) {
				return reject(new Error("Message is not defined."));
			}

			// Prepare member data from message
			const data 			= {
				id: 			message.FromUin,
				nickname: 		message.FromNickName,
				picture: 		message.FromHeadImg,
				isMod: 			message.FromAccess ? message.FromAccess > 1 : false,
				level: 			message.FromUserLv
			};

			// Find or create member
			this.Members.findOrCreate({
				where: 			{
					id: 		data.id
				},
				defaults: 		data
			})
			.then((member) => {
				console.log(member.toObject);

				// Return member
				resolve(member.get({ plain: true }));

				// Try to update member with new data
				this.Members.update(data, {
					where: 		{
						id: 	data.id
					}
				})
				.catch((err) => {
					console.error("[db] error updating member", err);
				});
			})
			.catch(reject);
		});
	};

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
	};
}

module.exports 					= BotDatabase;