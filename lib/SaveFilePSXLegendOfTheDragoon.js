// https://github.com/mcred/Dragoon-Editor
const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFilePSXLegendOfTheDragoon');
const fs = require('fs-extra');

// Every character is 44 (0x2C) bytes from each other.
const CHARACTERS = ['DART', 'LAVITZ', 'SHANA', 'ROSE', 'HASCHEL', 'ALBERT', 'MERU', 'KONGOL', 'MIRANDA'];
const DART_CHARACTER_OFFSET = 0x5AC;

class Character {
	constructor(parent,name,index) {
		this.parent = parent;
		this.name = name;
		this.index; // character index. From an array perspective (starting at index 0), which character is this in the save?
		this.offset = DART_CHARACTER_OFFSET + (index * 44);
		this._XP;
		this._HP; 
		this._MP; // MP. Can be 20, 40, 60, 80, or 100. TODO: Understand if item modifiers impact this value
		this._SP;
		this._SPMax;
		this._Level; // Regular character level. Max 60
		this._DLevel; // Dragoon Level. Between 1 and 5
		this._Weapon;
		this._Helmet;
		this._Chest;
		this._Boots;
		this._Accessory;

		this._PartyMember1;
		this._PartyMember2;
		this._PartyMember3;
	}

	async getXP() {
		return this._XP.readInt32LE();
	}

	async setXP(xp) {
		if(xp < 0 || xp > 2147483647) {
			throw new Error('XP must be greater than 0 and less than 2147483647');
		}
		this._XP.writeUInt32LE(xp);
	}

	async getHP() {
		return this._HP.readUInt16LE();
	}

	async setHP(hp) {
		if(hp < 0 || hp > 65535) {
			throw new Error('HP must be greater than 0 and less than 65535');
		}
		this._HP.writeUInt16LE(hp);
	}

	async getMP() {
		return this._MP.readUInt16LE();
	}

	async setMP(mp) {
		if(mp < 0 || mp > 65535) {
			throw new Error('MP must be greater than 0 and less than 65535');
		}
		this._MP.writeUInt16LE(mp);
	}

	async getSP() {
		return this._SP.readUInt16LE();
	}

	async setSP(sp) {
		if(sp < 0 || sp > 65535) {
			throw new Error('SP must be greater than 0 and less than 65535');
		}
		this._SP.writeUInt16LE(sp);
	}

	async getSPMax() {
		return this._SPMax.readUInt16LE();
	}

	async setSPMax(sp) {
		if(sp < 0 || sp > 65535) {
			throw new Error('SP must be greater than 0 and less than 65535');
		}
		this._SPMax.writeUInt16LE(sp);
	}

	async getLevel() {
		return parseInt(this._Level[0], 16);
	}

	async setLevel(level) {
		if( isNaN(level) ) {
			throw new Error(`Level must be a number. Received ${level}`);
		}
		if( level < 1 || level > 60 ) {
			throw new Error(`Level must be between 1 and 60. Received ${level}`);
		}
		this._Level[0] = level; // (level).toString(16) made the in-game level 30 when using 48?
		debug(`Setting level for ${this.name} to ${level}`);	
	}

	async getDLevel() {
		return parseInt(this._DLevel[0], 16);
	}

	async setDLevel(level) {
		if( isNaN(level) ) {
			throw new Error(`Level must be a number. Received ${level}`);
		}
		if( level < 1 || level > 5 ) {
			throw new Error(`Dragoon Level must be between 1 and 5. Received ${level}`);
		}
		this._Level[0] = (level).toString(16);
		debug(`Setting Dragoon level for ${this.name} to ${level}`);	
	}

	// Everything below here should be a raw value plus enum.
	async getWeapon() {
		return parseInt(this._weapon[0], 16);
	}

	async getHelmet() {
		return parseInt(this._helmet[0], 16);
	}

	async getChest() {
		return parseInt(this._chest[0], 16);
	}

	async getBoots() {
		return parseInt(this._boots[0], 16);
	}

	async getAccessory() {
		return parseInt(this._accessory[0], 16);
	}

	async test() {
		return this.setXP();
	}


	async init() {
		let offset = this.offset;

		this._XP = this.parent._buffer.slice(offset, offset + 4); // 4 bytes
		this._HP = this.parent._buffer.slice(offset + 8, offset + 10); // 2 bytes
		this._MP = this.parent._buffer.slice(offset + 10, offset + 12); // 2 bytes
		this._SP = this.parent._buffer.slice(offset + 12, offset + 14); // 2 bytes
		this._SPMax = this.parent._buffer.slice(offset + 14, offset + 16); // 2 bytes
		this._Level = this.parent._buffer.slice(offset + 18, offset + 19); // 1 byte
		this._DLevel = this.parent._buffer.slice(offset + 19, offset + 20); // 1 byte
		this._Weapon = this.parent._buffer.slice(offset + 20, offset + 21); // 1 byte
		this._Helmet = this.parent._buffer.slice(offset + 21, offset + 22); // 1 byte
		this._Chest = this.parent._buffer.slice(offset + 22, offset + 23) // 1 byte
		this._Boots = this.parent._buffer.slice(offset + 23, offset + 24) // 1 byte
		this._Accessory = this.parent._buffer.slice(offset + 24, offset + 25); // 1 byte
	}
}



class SaveFilePSXLegendOfTheDragoon extends SaveFile {
	constructor(filePath,saveFileType) {
		super(filePath,saveFileType); // call parent constructor for basic initialization.
		this._characters = {};
		this._party = [];
	}

	_checkSaveFileSize(bytes = 8320) {
		if(this._buffer.length != bytes) {
			throw new Error(`Save is incorrect size. Expected ${bytes}, but got ${this._buffer.length}`)
		}
	}

	async _initializeCharacters() {
		// TODO: Consider expanding characters array to key/values object, then only take Object.keys for here.
		for(let i = 0; i < CHARACTERS.length; i++) {
			let character = new Character(this,CHARACTERS[i],i);
			await character.init();
			this._characters[CHARACTERS[i]] = character;
		}
	}

	/*
		The party is stored in two places, there's the actual party
		and then what's displayed on the save file on the save file menu
		screen.

		Only the first party member byte changes when swapping an in-memory
		party member

		But if we turn it into an "empty" slot, the 4 bytes all change to 0xFF
	
		0x208 (520) (Party Member 1 start)	
		0x20C (524) (Party Member 2 start)
		0x210 (528) (Party Member 3 start)

		0x308 (776) (Party Member 1 start)	
		0x30C (780) (Party Member 2 start)
		0x310 (784) (Party Member 3 start)

		EMPTY (0xFF 0xFF 0xFF 0xFF)
		DART (0x00 0x00 0x00 0x00) 
		LAVITZ (0x01 0x00 0x00 0x00)
		SHANA (0x02 0x00 0x00 0x00 )
		ROSE (0x03 0x00 0x00 0x00)
		HASCHEL (0x04 0x00 0x00 0x00)
		ALBERT (0x05 0x00 0x00 0x00)
		MERU (0x06 0x00 0x00 0x00)
		KONGOL (0x07 0x00 0x00 0x00)
		MIRANDA (0x08 0x00 0x00 0x00)
	*/
	async _initializeParty() {
		this._party[0] = this._buffer.slice(520,524); // first party member
		this._party[1] = this._buffer.slice(524,528); // second party member
		this._party[2] = this._buffer.slice(528,532); // third party member
	}

	async init() {
		await super.init(); // call parent initialization function
		this._checkSaveFileSize(); // Make sure it meets a LotD save file size
		await this._initializeCharacters(); // Initialize all characters and metadata
		await this._initializeParty(); // Initialize who is what party slot
		return this._buffer;
	}

	async setPartyMember(slot,member) {
		if(!slot) {
			throw new Error('Party Member slot must be specified');
		}
		if(slot < 0 || slot > 3) {
			throw new Error('Party Member slot must be between 1 and 3');
		}

		let bytes;

		switch (member.toUpperCase()) {
			case 'DART':
				bytes = 0x00000000;
				break;
			case 'LAVITZ':
				bytes = 0x01000000;
				break;
			case 'SHANA':
				bytes = 0x02000000;
				break;
			case 'ROSE':
				bytes = 0x03000000;
				break;
			case 'HASCHEL':
				bytes = 0x04000000;
				break;
			case 'ALBERT':
				bytes = 0x05000000;
				break;
			case 'MERU':
				bytes = 0x06000000;
				break;
			case 'KONGOL':
				bytes = 0x07000000;
				break;
			case 'MIRANDA':
				bytes = 0x08000000;
				break;
			case 'EMPTY':
				bytes = 0xFFFFFFFF;
				break;
		}

		this._party[slot - 1].writeUInt32LE(bytes);
	}

	async getPartyMember(slot) {
		if(!slot) {
			throw new Error('Party Member slot must be specified');
		}

		// have enum lookup
	}


}

module.exports = SaveFilePSXLegendOfTheDragoon;