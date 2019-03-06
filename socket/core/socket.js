const ByteArray 			   					= require("byte-buffer");
const jszip 									= require("../jszip");

const realDebug 								= require("debug")("bot:socket");
const colors 									= require("colors");

const BotHandlers 								= new require("./handlers");
const BotPackets 								= new require("./packets");

const WebSocket									= require("ws");
const randomString 								= "0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM";

class BotSocket extends WebSocket {
	constructor(url, type, client) {
		super(url, [], {
			protocolVersion: 					13,
			origin: 							"https://streamcraft.com"
		});

		this.client 							= client;
		this.pingInterval 						= 1000 * 60;

		this.seq 								= 1;
		this.type								= type;

		this.server 							= url.split("/")[2];

		this.packets 							= new BotPackets(this);
		this.handlers 							= new BotHandlers(this);

		/**
		 * Random StreamCraft data
		 */

		this.ClientVer 							= 3e7;
		this.compressVer 						= 1001;
		this.MMCPR_ZLIB_COMPRESS 				= 1;
		this.MMCPR_NO_COMPRESS 					= 2;
		this.NO_ENCRYPT 						= 0;
		this.DefRet								= 0;
		this.DefLng 							= 0;
		this.ReconSec 							= 1;

		this.compressType 						= this.MMCPR_ZLIB_COMPRESS;

		// Register event listeners
		this.registerListeners();
	}

	/**
	 * Function to debug information
	 */
	debug(...args) {
		args.unshift(this.type === "passive" ? colors.blue.bgWhite(this.type) : colors.green.bgWhite(this.type));
		return realDebug(...args);
	}

	/**
	 * Convert a ByteArray to string
	 * @param  {Array} arr   	The byte array to be converted
	 * @param  {Number} length 	Number of bytes to read
	 * @return {String}		  	Final string
	 */
	byte2str(arr, length) {
		let final 								= "";

		for (let r = 0; r < arr.length && (!length || 0 !== arr[r]); r++) {
			final 								+= String.fromCharCode(arr[r]);
		}

		return final;
	}

	/**
	 * Convert a String to a ByteArray
	 * @param  {String} string 	String to be converted
	 * @param  {Number} length 	ByteArray length
	 * @return {Array}  		Final ByteArray
	 */
	str2byte(string, length) {
		let arr 								= new Array(length),
		r 										= new ByteArray(3 * string.length + 1),
		s 										= r.writeString(string);
		r.index 								= 0;

		for (let a = 0; a < length; a++) {
			arr[a] 								= (s >= a) ? r.readUnsignedByte() : 0;
		}

		return arr;
	}

	/**
	 * Get device type (bot)
	 * @param  {Number} length 	Max length
	 * @return {Array}   		ByteArray
	 */
	getDeviceType(length) {
		if (this.DeviceType && this.DeviceType.length === length) {
			return this.DeviceType;
		}

		const name 								= "StreamCraft Chat / Moderation Bot";
		this.DeviceType 						= this.str2byte(name, length);

		return this.DeviceType;
	}

	/**
	* Get device ID
	* @param  {[type]} size [description]
	* @return {[type]}		[description]
	 */
	getDeviceId(size) {
		if (!this.deviceId || this.deviceId.length !== size) {
			this.deviceId 						= this.str2byte(this.client.config.deviceId, size);
		}

		return this.deviceId;
	}

	/**
	* Create a random string
	* @param  {Number} length 	Random string length
	* @return {String}   		Generated random strnig
	*/
	static getRandomString(length) {
		let num, final 							= "";

		if (!length) {
			length 								= 4;
		}

		for (let r = 0; r < length; r++) {
			num									= Math.ceil(Math.random() * randomString.length) - 1,
			final 								+= randomString.substr(num, 1);
		}

		return final;
	}

	// TODO: document this
	crypt(t, e) {
		var n 									= 0,
			r 									= 0,
			s 									= new ByteArray(t.length);

		t.index 								= 0,
		e.index 								= 0;

		for (var a = 0; a < t.length; a++) {
			r 									= a % e.length,
			e.index 							= r,
			n 									= t.readUnsignedByte() ^ e.readUnsignedByte(),
			s.writeUnsignedByte(n);
		}

		return s;
	}

	/**
	 * Send a ping to the server
	 */
	ping() {
		const packet 							= new ByteArray(16);

		packet.writeUnsignedInt(16, packet.BIG_ENDIAN);
		packet.writeUnsignedShort(16, packet.BIG_ENDIAN);
		packet.writeUnsignedShort(1, packet.BIG_ENDIAN);
		packet.writeUnsignedInt(600100, packet.BIG_ENDIAN);
		packet.writeUnsignedInt(0, packet.BIG_ENDIAN);

		this.send(packet.buffer);
	}

	/**
	 * Register a cycle ping timer
	 */
	doCyclePing() {
		this.ping();

		this.debug("doCyclePing registered");

		this.pingTimer 							= setInterval(() => {
			this.ping();
		}, this.pingInterval);
	}

		/**
		* Create a packet with a data buffer to be sent
		* @param  {Object} data Buffer data
		* @return {Object}		Packet
	*/
	wrapper(data) {
		return {
			Buff: 								data
		};
	}

	/**
	* Attaches useful insformation to the packet
	* @param  {Object} packet Packet to receive the information
	* @return {Object}		Packet with information
	*/
	attaches(packet) {
		packet.TimeZone 						= "GMT-3";
		packet.Language 						= "en";
		packet.Country 							= "China";
		packet.CountryCode 						= "cn";
		packet.RandomEncryKey 					= {
			Buff: 								BotSocket.getRandomString(4)
		};

		return packet;
	}

	/**
	* Create a packet JSON string to be attached to the packet
	* @param  {Object} data 	Aditional data to be attached
	* @param  {Number} seq 	Sequential number
	* @return {Object}   		New JSON string
	*/
	jsonstr(data, seq) {
		const packet 							= {
			BaseRequest: 						{
				SessionKey: 					this.str2byte(this._token, 36),
				Uin: 							this._uin,
				DeviceID: 						this.getDeviceId(16),
				ClientVersion: 					this.ClientVer,
				DeviceType: 					this.getDeviceType(132),
				Scene: 							0,
				Seq: 							seq
			}
		};

		for (let r in data) {
			packet[r] 							= data[r];
		}

		return JSON.stringify(packet);
	}

	/**
		* Generate a sequential number
		* @return {Number}		Unique sequential number for this session
	*/
	seqno() {
		return this.seq++;
	}

	/**
	* Register default listeners
	*/
	registerListeners() {
		// On connection error
		this.on("error", function(err) {
			this.debug("error", err);
		});

		// On connection close
		this.on("close", function() {
			this.debug(colors.red("disconnected"));

			// Clear ping timer
			clearInterval(this.pingTimer);

			this.emit("disconnected");
		});

		// On connection open
		this.on("open", function() {
			this.debug(colors.green("connected to " + this.server));

			// Set websocket binary type to array buffer
			this.binaryType 					= "arraybuffer";

			this.emit("connected");
		});

		// On connection message
		this.on("message", function(data) {
			let buffer 							= new Uint8Array(data);
			let packet 							= new ByteArray(buffer);
			let response 						= {};

			response.pocketLen 					= packet.readUnsignedInt(ByteArray.BIG_ENDIAN),
			response.headerLength 				= packet.readUnsignedShort(ByteArray.BIG_ENDIAN),
			response.version 					= packet.readUnsignedShort(ByteArray.BIG_ENDIAN),
			response.cmd 						= packet.readUnsignedInt(ByteArray.BIG_ENDIAN),
			response.seq 						= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);

			this.debug(colors.red("<<"), response.cmd);

			// 81 pong
			if (response.cmd === 10600100) {
				this.debug("pong received");
				return true;
			} else
			// Message sent confirmation
			if (response.cmd === 10300103) {
				return true;
			} else
			// ST???
			if (response.cmd === 600016) {
				response.St 					= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);

				this.debug("st", response.St);

				// 4096 = password changed?
				if (response.St === 4096) {
					this.debug("password changed, re-login needed");
					this.emit("bot.passwordChange");
					this.disconnect();
				}

				return this.emit("st", response.St);
			} else
			// Chat message
			if (response.cmd === 300104) {
				response.Len 					= packet.readInt(ByteArray.BIG_ENDIAN);

				const json						= new ByteArray(packet.raw.slice(packet.index, -1)).readString();

				response.Response 				= JSON.parse(json);

				return this.emit("chat", response.Response);
			} else
			// ???
			// A 82 packet response after enter
			if (response.cmd === 300141) {
				response.Len					= packet.readInt(ByteArray.BIG_ENDIAN);
				const json						= new ByteArray(packet.raw.slice(packet.index, -1)).readString();
				response.Response				= JSON.parse(json);

				this.debug("300104", response.Response);

				return true;
			} else {
				// Skip one byte
				packet.readByte();

				response.Ret 					= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);
				response.clientVersion 			= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);
				response.CmdId 					= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);
				response.Uin 					= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);
				response.Lan 					= packet.readUnsignedShort(ByteArray.BIG_ENDIAN);

				response.DeviceId 				= new Array(16);

				// Fill up device ID (16 bytes)
				for (let i = 0; i < 16; i++) {
					response.DeviceId[i] 		= packet.readByte();
				}

				response.CompressVersion 		= packet.readUnsignedShort(ByteArray.BIG_ENDIAN);
				response.CompressAlgorithm 		= packet.readUnsignedShort(ByteArray.BIG_ENDIAN);
				response.CryptAlgorithm 		= packet.readUnsignedShort(ByteArray.BIG_ENDIAN);
				response.CompressLen 			= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);
				response.CompressedLen 			= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);
				response.iInt1 					= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);
				response.iInt2 					= packet.readUnsignedInt(ByteArray.BIG_ENDIAN);

				let compressedData 				= packet.raw.slice(packet.index, -1);

				// Check if has any compressed data
				if (compressedData.byteLength > 0) {
					if (this.MMCPR_ZLIB_COMPRESS === response.CompressAlgorithm) {
						let result;
						let string 				= "";

						try {
							let inflate 		= new Inflate();

							inflate.push(compressedData, true);
							
							// Check if any error ocurred
							if (inflate.err || inflate.result.byteLength !== response.CompressLen) {
								if (!inflate.err) {
									inflate.err = "uncompress length not matchs.";
								}

								return this.debug("zlib uncompress error:" + inflate.err);
							}

							result 				= inflate.result;
						} catch (t) {
							return this.debug("zlib compress error:" + t);
						}

						string 					= new ByteArray(result).readString();

						// Parse JSON from string
						try {
							string				= string.replace(/"GoldBoxId":.(\d+),/g, "\"GoldBoxId\":\"$1\","),
							response.Response   = JSON.parse(string);
						} catch (t) {
							return this.debug("[error] json parse error:" + t + "!");
						}
					}

					// Check if response contains the session key, and decrypt it???
					// It's useful but... welp
					if (response.Response && response.Response.SessionKey) {
						response.Response.SessionKey = this.byte2str(response.Response.SessionKey, true);

						if (response.Ret === 401) {
							return this.debug("[error] ip is deactivated???");
						}
					}
				}
			}

			switch(response.cmd) {
				// Default command
				default:
					this.debug(colors.red("unhandled packet " + response.cmd));

					console.dir(response);

					if (response.Response) {
						console.dir(response.Response);
					}

					this.emit("packet.response", response);
				break;

				// Watch live reward list
				case 900083:
					this.handlers.handleWatchLiveRewardList(response.Response);
				break;

				// History contribution
				case 10300113:
					this.handlers.handleHistoryContribution(response.Response);
				break;

				// Reauth packet
				case 10300003:
					this.handlers.handleAuth(response.Response);
				break;

				// Studio enter packet
				case 10300100:
					this.handlers.handleEnter(response.Response);
				break;

				// Channel config
				case 10300102:
					this.handlers.handleStudioConfig(response.Response);
				break;
			}
		});
	}

	sendPacket(packetId, packetJson, packetSeq) {
		// Create the binary packet data
		let packet 					= new ByteArray(3 * packetJson.length + 74);

		// Create the JSON string binary data
		let string 					= new ByteArray(3 * packetJson.length);

		// Write the JSON string into the JSON binary string data
		string.writeString(packetJson);

		// Get the JSON string byte length
		let stringLength 			= (string = string.slice(0, string.index)).byteLength;

		// Check for compression type
		if (this.client.compressType === this.client.MMCPR_ZLIB_COMPRESS) {
			// Create a new ZLib deflate buffer
			let buffer 				= new Deflate();

			try {
				buffer.push(string.raw, true);

				if (buffer.err) {
					return console.error("zlib tal", buffer.err);
				}

			// Get a byte array from the buffer
			string 				= new ByteArray(buffer.result);
			} catch (packetId) {
				return console.error("zlib compress error:" + packetId + "!");
			}
		}

		const packetSize 			= string.byteLength + 74;

		packet.writeUnsignedInt(packetSize, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedShort(16, ByteArray.BIG_ENDIAN);
		packet.writeUnsignedShort(1, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedInt(packetId, ByteArray.BIG_ENDIAN);
		packet.writeUnsignedInt(packetSeq, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedByte(190);

		packet.writeUnsignedInt(this.DefRet, ByteArray.BIG_ENDIAN);
		packet.writeUnsignedInt(this.ClientVer, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedInt(packetId, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedInt(this._uin, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedShort(this.DefLng, ByteArray.BIG_ENDIAN);

		// Write the last deviceId
		packet.write(this.deviceId);

		packet.writeUnsignedShort(this.compressVer, ByteArray.BIG_ENDIAN);
		packet.writeUnsignedShort(this.compressType, ByteArray.BIG_ENDIAN);
		packet.writeUnsignedShort(this.NO_ENCRYPT, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedInt(stringLength, ByteArray.BIG_ENDIAN);
		packet.writeUnsignedInt(string.byteLength, ByteArray.BIG_ENDIAN);

		packet.writeUnsignedInt(0, ByteArray.BIG_ENDIAN);
		packet.writeUnsignedInt(0, ByteArray.BIG_ENDIAN);

		new Uint8Array(packet.buffer).set(string.raw, packet.index);
		packet.index 				+= string.byteLength;
		packet.writeUnsignedByte(237);
		packet 						= packet.slice(0, packet.index);

		this.send(packet.buffer);

		this.debug(colors.green(">>"), packetId);
	}

	sendMessage(message, emoji, emojiAmount) {
		const seq					= this.seqno(),
			amount					= emojiAmount ? parseInt(emojiAmount) : 0,
			date					= Math.ceil((new Date).getTime() / 1000),
			id						= `IGG_TEXT#${this._sid}#${this._uin}#${amount}#${date}`,
			data					= {
			Count: 					1,
				List: 				[{
					MsgType: 		1,
					StudioId: 		this._sid,
					ToUin: 			amount,
					ClientMsgId: 	this.wrapper(id),
					MsgContent: 	this.wrapper(message),
					EmojiFlag: 		emoji,
					CreateTime: 	date
				}]
		};

		this.debug(">", message);

		// Check if bot can reply or
		// if the stream is online
		// and it's not a debug
		if ((!this.client.config.canReply || !this.client.stream.online) && !this.client.isDebug) {
			return false;
		}

		// Send the message to server
		this.sendPacket(300103, this.jsonstr(data, seq), seq);

		// Send message to client listener
		this.client.emit("chat.message", {
			sender:					this.client.getBotMember(),
			message: 				message
		});
	}
}

module.exports 						= BotSocket;