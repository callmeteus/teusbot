class BotBet {
	constructor(name) {
		this.name 						= name;
		this.options 					= {};
	}

	addOption(option) {
		const arr 						= [];
		this.options[option] 			= arr;

		return arr;
	}

	addVote(mod, type, user, amount = 10) {
		return new Promise((resolve, reject) => {
			const option 				= this.options[type];
			let keep 					= true;

			if (option === undefined) {
				return reject();
			}

			Object.values(this.options).forEach((option) => {
				if (option.indexOf(user) > -1) {
					keep 				= false;
				}
			});

			if (!keep) {
				return reject();
			}

			return mod.client.database.Members.decrement({
				points: 				amount
			}, {
				where: 					{
					id: 				user
				}
			})
			.spread(() => {
				option.push(user);
				resolve();
			})
			.catch(reject);
		});
	}

	end(mod, winner) {
		return new Promise((resolve, reject) => {
			const option 				= this.options[winner];

			if (option === undefined) {
				return reject();
			}

			return mod.client.database.Members.increment({
				points: 				10 + (10 * (option.length / 100))
			}, {
				where: 					{
					id: 				option
				}
			})
			.spread(resolve)
			.catch(reject);
		});
	}
}

module.exports 							= {
	name: 								"apostar",
	type: 								"module",
	onEnter: 							function() {
		this.module.bets 				= {};
	},
	content: 							function(processor) {
		const cmd 						= processor.arguments.shift();
		const name 						= processor.arguments.shift();

		switch(cmd) {
			default:
				const bet 				= this.module.bets[cmd];
				const points 			= 10;//parseInt(processor.arguments.shift() || 10, 10);

				// Check if it's a number
				if (isNaN(points)) {
					return processor.sendMessage(`❌ Insira um número válido de pontos para apostar.`);
				} else
				if (bet === undefined) {
					return processor.sendMessage(`❌ Não há uma aposta com o nome '${cmd}' aberta.`);
				}

				bet.addVote(this, name, processor.sender.id, points)
				.then(() => this.client.emit("bet.vote", bet))
				.catch((e) => processor.internalError(e));
			break;

			case "start":
				const options 			= processor.arguments;
				const newBet 	 		= new BotBet(name);

				options.forEach((option) => newBet.addOption(option));

				this.module.bets[name] 	= newBet;

				processor.sendMessage(`❗ Apostas abertas! Você pode apostar utilizando !apostar ${name} (${options.join(", ")})`);

				this.client.emit("bet.start", newBet);
			break;

			case "end":
				const winBet 			= this.module.bets[name];
				const winner 			= processor.arguments.shift();

				winBet.end(this, winner)
				.then((option) => {
					processor.sendMessage(`❗ As apostas para ${name} terminaram! A opção vencedora é '${winner}', com ${winBet.options[winner].length} ganhadores`);

					this.client.emit("bet.end", Object.assign(winBet, { winner }));
				})
				.catch((e) => processor.internalError(e));
			break;
		}
	}
};