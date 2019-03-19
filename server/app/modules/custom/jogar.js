module.exports 										= {
	name: 											"jogar",
	type: 											"module",
	onEnter: 										function() {
		// Lista de jogadores da colheita atual
		this.module.playList 						= [];
		// Lista de jogadores que já participaram de alguma partida
		this.module.playListAll 					= [];
		// Lista de jogadores especiais
		this.module.playListSpecial 				= [];
		// Estado de abertura da colheita
		this.module.playListOpen 					= false;
	},
	content: 										function(processor) {
		// Pega o primeiro argumento
		const cmd 									= processor.arguments[0];

		// Checa se não há nenhum argumento e
		// se a colheita está aberta
		if (cmd === undefined) {
			// Checa se a colheita está aberta
			if (this.module.playListOpen === true) {
				// Pega o nickname no LoL de quem enviou o comando
				let nickname						= processor.sender.addons.filter((addon) => addon.addon === "lol")[0];

				// Checa se a pessoa que enviou o comando tem
				// o addon "lol" definido
				if (nickname === undefined) {
					// Se não tiver, envia uma mensagem
					// avisando para colocar o nickname
					return processor.sendMessage(`❓ Você ainda não definiu um nickname no League of Legends ${processor.sender.nickname} 😢 Use o comando !nick (seu nick) para definir`);
				} else {
					// Pega somente o valor do nickname
					nickname 						= nickname.value;
				}

				// Checa se a pessoa já jogou durante a stream
				if (this.module.playListAll.indexOf(nickname) > -1) {
					return processor.sendMessage(`❌ ${processor.sender.nickname} você já jogou durante a stream atual.`);
				} else
				// Checa se a pessoa já jogou durante a stream
				if (this.module.playList.indexOf(nickname) > -1) {
					return processor.sendMessage(`❌ ${processor.sender.nickname} você já está na espera atual.`);
				} else
				// Checa se a pessoa está na lista especial
				if (this.module.playListSpecial.indexOf(nickname) > -1) {
					return processor.sendMessage(`❌ ${processor.sender.nickname} você já está na lista de espera de prioridade.`);
				} else {
					// Adiciona o nick no LoL na
					// lista para o sorteio aleatório
					this.module.playList.push(nickname);

					// Randomiza a lista de jogadores toda vez
					// que alguém entrar na lista
					this.module.playList 			= this.module.playList.sort(function() {
						return .5 - Math.random();
					});
				}
			} else {
				// Avisa que a colheita não está aberta
				processor.sendMessage(`❌ ${processor.sender.nickname} a colheita não está aberta.`);
			}
		} else {
			switch(cmd) {
				// Comando para inciar a colheita de nicks
				case "start":
					// Checa se é moderador, se não cancela sem permissão
					if (!processor.sender.isMod) {
						return processor.noPermission();
					}

					// Limpa a lista de jogadores
					this.module.playList 			= [];

					// Abre a lista de jogadores
					this.module.playListOpen 		= true;

					// Anuncia que a colheita iniciou
					processor.sendMessage("❗ A colheita começou! Se você deseja jogar neste round e já tem seu nick definido, digite \"!jogar\", se não, digite \"!jogar [seu nick no LoL]\" e logo após, digite \"!jogar novamente.\"");
				break;

				// Comando para encerrar a colheita de nicks
				case "end":
					// Checa se é moderador, se não cancela sem permissão
					if (!processor.sender.isMod) {
						return processor.noPermission();
					}

					let amount						= processor.arguments[1];

					if (amount === undefined) {
						amount 						= 4;
					} else {
						amount 						= parseInt(amount);
					}

					// Calcula a quantidade de jogadores especiais
					// que serão selecionados
					const specialAmount 			= (this.module.playListSpecial.length > 2) ? 2 : this.module.playListSpecial.length;

					// Remove da quantidade de jogadores normais o número de jogadores especiais
					amount 							-= specialAmount;

					// Pega os jogadores da lista especial e os remove
					const players 					= this.module.playListSpecial.splice(0, specialAmount);

					// Argumento para limpar a lista de jogadores atual
					const canClear 					= processor.arguments[2];

					// Enquanto o valor de "i" não foi o número de jogadores
					// que queremos selecionar ("amount")
					for(let i = 0; i < amount; i++) {
						// Seleciona um jogador aleatório da lista da colheita
						let player 					= this.module.playList[i];

						// Checa se o jogador existe e se já não foi selecionado
						if (player !== undefined && players.indexOf(player) === -1) {
							// Se não foi, adiciona ele à lista de jogadores atuais
							players.push(player);

							// E adiciona ele à lista de jogadores que já participaram na stream
							this.module.playListAll.push(player);
						}
					}

					// Fecha a lista de jogadores
					this.module.playListOpen 		= false;

					// Checa se pode limpar a lista de jogadores atuais
					if (!canClear || canClear === "1") {
						// Limpa a lista de jogadores atuais
						this.module.playList 		= [];
					}

					// Anuncia os jogadores selecionados
					processor.sendMessage(`✔️ A colheita de nicks foi finalizada 👉 Jogadores: ${players.join(", ")}`, true);
				break;

				// Comando para limpar a colheita de nicks
				case "clear":
					// Checa se é moderador, se não cancela sem permissão
					if (!processor.sender.isMod) {
						return processor.noPermission();
					}

					// Recebe o tipo de lista que deve ser limpa
					// com o valor padrão de "current" (atual)
					const type 						= processor.arguments[1] || "current";

					// Checa se o tipo é "current"
					if (type === "current") {
						// Limpa a lista de jogadores atuais
						this.module.playList 		= [];
					} else
					// Checa se o tipo é "todos"
					if (type === "all") {
						// Limpa a lista de jogadores que já participaram durante a stream
						this.module.playListAll 	= [];
					}

					processor.sendMessage(`✔️ A lista da colheita foi limpa.`);
				break;

				// Exibe todos os jogadores presentes nas listas para jogar
				case "list":
					// Checa se é moderador, se não cancela sem permissão
					if (!processor.sender.isMod) {
						return processor.noPermission();
					}

					processor.sendMessage(`👉 Lista de prioridade: ${this.module.playListSpecial.join(", ")} 👉 Lista geral: ${this.module.playList.join(", ")}`);
				break;

				// Comando para remover um jogador da lista de jogadores
				// que já participaram na stream
				case "remove":
					// Checa se é moderador, se não cancela sem permissão
					if (!processor.sender.isMod) {
						return processor.noPermission();
					}

					// Recebe o nick do jogador
					const nickToRemove 				= processor.arguments.slice(1, processor.arguments.length);
					// Pega o índice do jogador na lista de jogadores que já participaram
					const index 					= this.module.playListAll.indexOf(nickToRemove);

					// Checa se o nick foi definido
					if (nickToRemove !== undefined) {
						// Checa se o nick existe na lista de jogadores que já participaram
						if (index === -1) {
							// Anuncia que ele não está listado
							processor.sendMessage(`❌ ${nickToRemove} ainda não participou de nenhuma partida.`);
						} else {
							// Remove o nick da lista de jogadores que já participaram
							this.module.playListAll.splice(index, 1);

							// Anuncia que o nick foi removido
							processor.sendMessage(`✔️ O nickname ${nickToRemove} foi removido da lista de jogadores que já participaram.`);
						}
					}
				break;

				default:
					let newNick 					= processor.arguments.join(" ");
					processor.triggerCommand("addon", ["set", "lol", newNick]);
				break;
			}
		}
	}
};