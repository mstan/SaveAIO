const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileNintendo64');
const cloneBuffer = require('clone-buffer');

class SaveFileNintendo64 extends SaveFile {
	constructor(filePath) {
		super(filePath); // call parent constructor for basic initialization.
	}

	async init() {
		await super.init(); // call parent initialization function
		switch(this.saveFileType) {
			case 'system':
				debug('Save file is assumed standard system save. Nothing to extract');
				// no action to be had, the buffer, as-is, is fine.
				break;
			case 'wii_virtual_console':
				debug('Attempting to parse Wii Virtual Console save');
				await this._parseWiiVirtualConsoleSave();
			default: 
				debug('Attempting to auto-detect save file type');
				await this._autoDetectSaveFileType();
		}

		return this._buffer;
	}

	async _autoDetectSaveFileType() {
		await this._parseWiiVirtualConsoleSave();
	}

	async _parseWiiVirtualConsoleSave() {
		debug('_parseWiiVirtualConsoleSave Unimplemented');
	}

	// Set default to 2 bytes instead of SaveFile's default 8 byte. 
	// https://github.com/ssokolow/saveswap/blob/master/saveswap.py#L157 
	// suggests 16-bit (interpreting at 2 bytes) would be what I want here
	async swapEndian(bytes = 2) {
		debug('Swapping 2 byte endian for Nintendo 64')
		super.swapEndian(bytes);
	}

	async swapWords(bytes = 2) {
		if(this._buffer.length % bytes != 0) {
			throw new Error(`Buffer is not a multiple of ${bytes}`)
		}

		for(let i = 0; i < this._buffer.length; i += (bytes * 2) ) {
			const FIRST_BYTE_OFFSET_START = i; // this is where we begin. This is the first byte
			const FIRST_BYTE_OFFSET_END = i + bytes - 1; // this is where we end. This the end of the first byte 
			const SECOND_BYTE_OFFSET_START = FIRST_BYTE_OFFSET_END + 1;
			const SECOND_BYTE_OFFSET_END = SECOND_BYTE_OFFSET_START + bytes - 1;
			// Although these are sub-buffer references, modifying them will still modify the original, which is what want!
			let tempArray = this._buffer.slice(FIRST_BYTE_OFFSET_START, FIRST_BYTE_OFFSET_END + 1); // add +1 to be inclusive of last byte
			let tempArray2 = this._buffer.slice(SECOND_BYTE_OFFSET_START,SECOND_BYTE_OFFSET_END + 1); // add +1 to be inclusive of last byte

			if( Buffer.compare(tempArray,tempArray2) != 0) {
				// These weren't the same, so let's do a swap operations swapping the individual bytes in each
				for(let j = 0; j < bytes; j++ ) {
					let tempValue = tempArray[j]; // temporarily store the reference tempArray to i.
					tempArray[j] = tempArray2[j]; // set tempArray[i] to what tempArray2 has. This will update the base buffer, too.
					tempArray2[j] = tempValue; // set tempArray2[i] to tempValue, which was previously a reference to tempArray[i]. This will update the base buffer, too.
				}
			}
		}
		debug('Swapped words in buffer');
	}

}

module.exports = SaveFileNintendo64;