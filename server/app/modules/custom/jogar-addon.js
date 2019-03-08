module.exports 			= {
	name: 				"points",
	type: 				"addon",
	content: 			function() {
		// Ao receber resposta do módulo de pontos
		this.client.on("module.points", (data) => {
			// Checa se o comando foi "play"
			if (data.command !== "play") {
				return false;
			}

			// Pega o nick de quem enviou o comando
			const nick 	= data.sender.addons.filter((addon) => addon.addon === "lol")[0];

			// Checa se a pessoa tem algum nick definido
			if (nick === undefined) {
				throw new Error("User doesn't have a nickname set.");
				return false;
			}

			// Encontra o módulo "jogar"
			const mod 	= this.client.commands.find((m) => m.name === "jogar" && m.type === "module");

			// Checa se quem enviou o comando já não está na lista de jogadores especiais
			if (mod.playListSpecial.indexOf(nick.value) === -1) {
				// Adiciona o mesmo à lista de jogadores especiais
				mod.playListSpecial.push(nick.value);
			}
		});
	}
}