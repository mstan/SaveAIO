const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileGameboyAdvance');

class SaveFileGameboyAdvance extends SaveFile {
	constructor(filePath,saveFileType) {
		super(filePath); // call parent constructor for basic initialization.
		this.gamesharkHeader;
		this.actionReplayHeader;
		this.wiiUVirtualConsoleContainer;

		this.saveFileType = saveFileType;
	}

	async init() {
		await super.init(); // call parent initialization function

		await this._parseWiiUVirtualConsoleSave();
		/*
		switch(this.saveFileType) {
			case 'none':
				debug('Save file is a standard save. Nothing to extract');
				// no action to be had, the buffer, as-is, is fine.
				break;
			case 'gameshark':
				await this._parseGamesharkSave();
				break;
			case 'action_replay':
				await this._parseActionReplaySave();
				break;
			case 'wii_u_virtual_console':
				await this._parseWiiUVirtualConsoleSave();
				break;
			default: 
				await this._autoDetectSaveFileType();
		}
		*/
	}

	async _autoDetectSaveFileType() {
		// do some sort of Promise.all here.
		// if one succeeds, it's that save file type, presumably
		// if all reject, it's a base "none" type.
	}

	// https://github.com/GoobyCorp/SAVE2VC/blob/6fcaaaa2b211a5f218f384f0005164e3ddb7a99d/SAVE2VC.py#L67
	// Naively assume that all GBA save file sizes are 32768 bytes for now. But expose it as 
	// an argument for someone to override.
	async _parseWiiUVirtualConsoleSave(saveFileSize = 32768) {
		const BITS = 8; // 8 bit; 1 byte
		const WII_U_CONTAINER_SAVE_FILE_STARTING_BYTE_DECODED = 'STATRAM0';
		let startingSaveByte; // this represents the first byte of where the save begins

		debug('Attempt to parse Wii U Virtual console save.');

		const utf8decoder = new TextDecoder('utf-8'); // Decodes an ArrayBuffer into a utf8 string
		const uint8array = new Uint8Array(this.buffer); // Take our buffer, break it into a utf8Array

		// Start enumerating through our int8Array, jumping every 8 [bits] (1 byte)
		for(let i = 0 ; i < uint8array.length; i+= BITS) {
			const byte = uint8array.slice(i, i+= BITS ); // create a self-contained byte array
			const decodedByte = utf8decoder.decode(byte); // decode our byte into a string

			// if this matches our magic decoded string, let's save the byte after as the offset.
			if(decodedByte.indexOf(WII_U_CONTAINER_SAVE_FILE_STARTING_BYTE_DECODED) > -1 ) {
				startingSaveByte = i + 1; // should this be a +1, or is not +1? Is STATRAM0 a part of the GBA save?
				break;
			}
		}

		// if this is null past this point, this wasn't a valid Wii U virtual console save. Throw an error.
		if(!startingSaveByte) {
			throw new Error('This file was not detected as a valid Wii U Virtual console save.');
		}

		// Before we start modifying and pulling things out, we may want to save this container
		// for re-injection later. Save it as is.
		this.wiiUVirtualConsoleContainer = this.buffer;

		// We determined where the save starts, add the save file length to it.
		const endOfSaveFileByte = startingSaveByte + saveFileSize;


		// Update the buffer to be the EXTRACTED save.
		// We're making naive assumptions for now, using startingSaveByte + an assumed length
		// of the save file here.

		// TODO: THIS FAILS FOR SOME REASON. Maybe an endian swap should occur here?
		this.buffer = this.buffer.slice(startingSaveByte, startingSaveByte + saveFileSize);
		// await this.swapEndian();
	}

	async _parseGamesharkSave() {
	}

	async _parseActionReplaySave() {

	}


	async injectWiiUVirtualConsoleSave() {
		// Should we check to see if the save being passed is a special type or just strip it?
		
		// update the regular buffer.
		// ALSO update the WiiU Buffer?
	}

	async exportWiiUVirtualConsoleSave() {
		// export wiiUVirtualConsoleContainer
		// should the buffer be assumed to be updated, or should we just insert the save in real
		// time into the container?

		// if we just inject in real time, is an inject function necessary? /Probably/, but continue to consider.
	}

}

module.exports = SaveFileGameboyAdvance