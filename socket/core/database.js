const LowDB 			= require("lowdb");
const FileSync 			= require("lowdb/adapters/FileSync");

class BotDatabase {
	constructor() {
		this._database 	= LowDB(new FileSync("./data/database.json"));
	};

	getMember(id) {
		return new Promise((resolve, reject) => {
			resolve(this._database.get("members").find({ id: id }).value());
		});
	};

	memberExists(id) {
		return new Promise((resolve, reject) => {
			resolve(this.getMember(id) !== undefined);
		});
	};

	addMember(data) {
		return new Promise((resolve, reject) => {
			resolve(this._database.get("members").push(data).write());
		});
	};
};

module.exports 			= BotDatabase;