const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileGameboyColor');
const cloneBuffer = require('clone-buffer');

const KNOWN_SAVE_FILE_EXTENSIONS = [
];

// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/PlatformSaveSizes.js
const VALID_SAVE_FILE_SIZES = [
    512,
    1024,
    2048,
    4096,
    8192,
    16384,
    32768,
    65536
];



class SaveFileGameboyColor extends SaveFile {
	constructor(filePath,saveFileType) {
		super(filePath,saveFileType); // call parent constructor for basic initialization.

		this.validSaveFileSizes = VALID_SAVE_FILE_SIZES;
		this.knownSaveFileExtensions = KNOWN_SAVE_FILE_EXTENSIONS;
	}

	async init() {
		await super.init(); // call parent initialization function
		/*
		switch(this.saveFileType) {
			case 'system':
				debug('Save file is assumed standard system save. Nothing to extract');
				// no action to be had, the buffer, as-is, is fine.
				break;
			case 'wii_virtual_console':
				debug('Attempting to parse Wii Virtual Console save');
				await this._parseWiiVirtualConsoleSave();
			default: 
				// Throw an error if the user supplied an unsupported type.
				if(this.saveFileType) {
					throw new Error(`Unrecognized save File type: ${saveFileType}`);
				}
				// If the user did not supply one, auto-detect
				debug('Attempting to auto-detect save file type');
				await this._autoDetectSaveFileType();
		}
		*/

		return this._buffer;
	}

	/*
	async _autoDetectSaveFileType() {
		try {
			await Promise.any([
				await this._parseWiiVirtualConsoleSave()
			])
		} catch(error) {
			debug('Unable to detect save file type');
		}
		this.saveFileType = 'system';
		return this._buffer;
	}

	async _parseWiiVirtualConsoleSave() {
		debug('_parseWiiVirtualConsoleSave Unimplemented');


		this.saveFileType = 'wii_virtual_console';
		return this._buffer;
	}
	*/

}

module.exports = SaveFileGameboyColor;