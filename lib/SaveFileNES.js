const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileNES');
const fs = require('fs-extra');

const KNOWN_SAVE_FILE_EXTENSIONS = [
	'.sav', // Emulators like Nesticle UE
	'.ves' // Wii U Virtual Console Saviine extraction
];

// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/PlatformSaveSizes.js
const VALID_SAVE_FILE_SIZES = [
    512,
    1024,
    2048,
    4096,
    8192,
    16384,
    32768, // The usual max size of files that the MiSTer NES core will generate
    65536,
    131072 // The MiSTer NES core will sometimes generate files this big, so maybe some games require them?
];


class SaveFileNES extends SaveFile {
	constructor(filePath,saveFileType) {
		super(filePath,saveFileType); // call parent constructor for basic initialization.

		this.validSaveFileSizes = VALID_SAVE_FILE_SIZES;
		this.knownSaveFileExtensions = KNOWN_SAVE_FILE_EXTENSIONS;
		
		this._wiiUVirtualConsole;
		this._3DSVirtualConsole;

	}

	async init() {
		await super.init(); // call parent initialization function
		switch(this.saveFileType) {
			case 'wii_u_virtual_console':
				debug('Attempting to parse Wii U virtual console save');
				await this._parseWiiUVirtualConsoleSave();
				break;
			default: 
				// Throw an error if the user supplied an unsupported type.
				if(this.saveFileType) {
					throw new Error(`Unrecognized save File type: ${this.saveFileType}`);
				}
				// If the user did not supply one, auto-detect
				debug('Attempting to auto-detect save file type');
				await this._autoDetectSaveFileType();
		}

		return this._buffer;
	}

	async _autoDetectSaveFileType() {
		try {
			await Promise.any([
				await this._parseWiiUVirtualConsoleSave()
			])
		} catch(error) {
			debug(error);
			debug('Unable to detect special save file type. Assuming system save file.');
			this.saveFileType = 'system';
		}
		return this._buffer;
	}

	async exportWiiUVirtualConsoleSaveToDisk(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		const buffer = await this._exportWiiUVOr3DSVirtualConsoleSaveToMemory(this._wiiUVirtualConsole)
		return await fs.writeFileSync(filePath, buffer, { encoding: null });
	}

	async _parseWiiUVirtualConsoleSave() {
		function _saveIsPowerOf2(header,buffer) {
			let length = buffer.length - header;


			// Is the save, without the header, a power of 2?
			if(length && (length & (length -1 )) === 0 ) {
				return true;
			}

			return false;

			//TODO: Eventually consider a way to trim the trailing whitespace and re-check if the length minus
			// header is a power of 2
		}

		// TODO: I know nothing of this 32 byte structure whatsoever, so I cannot do any safe assertions about whether
		// it is valid or not.
		const WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START = 32; // (0x21) 33rd byte 

		// Right now the only check we're doing is if the save is a power of 2.
		if( _saveIsPowerOf2(WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START, this._buffer) == false ) {
			debug('Save is not a Wii U Virtual Console NES save');
		}

		this._buffer = this._buffer.slice(WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START,this._buffer.length);
		return this._buffer;
	}
}

module.exports = SaveFileNES;