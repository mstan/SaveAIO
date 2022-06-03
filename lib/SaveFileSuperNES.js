const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileSNES');

class SaveFileSuperNES extends SaveFile {
	constructor(filePath,saveFileType) {
		super(filePath,saveFileType); // call parent constructor for basic initialization.
	}

	async init() {
		await super.init(); // call parent initialization function
		switch(this.saveFileType) {
			case 'everdrive':
			case 'sd2snes_pro':
			case 'system':
				debug('Save file is assumed standard system save. Nothing to extract');
				this.saveFileType = 'system';
				// no action to be had, the buffer, as-is, is fine.
				break;
			case '3ds_virtual_console':
			case 'wii_u_virtual_console':
			case 'wii_u_or_3ds_virtual_console':
				debug('Attempting to parse Wii Virtual Console save');
				await this._parseWiiUOr3DSVirtualConsoleSave();
			default: 
				// Throw an error if the user supplied an unsupported type.
				if(this.saveFileType) {
					throw new Error(`Unrecognized save File type: ${saveFileType}`);
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
				await this._parseWiiUOr3DSVirtualConsoleSave()
			])
		} catch(error) {
			debug(error);
			debug('Unable to detect special save file type. Assuming system save file.');
		}
		this.saveFileType = 'system';
		return this._buffer;
	}

	// USE THIS FOR IMPLEMENTATION REFERENCE
	// https://gbatemp.net/threads/research-snes-virtual-console-save-files.498334/
	async _parseWiiUOr3DSVirtualConsoleSave() {
		// https://gbatemp.net/threads/how-to-extract-snes-virtual-console-saves-from-3ds-to-pc.433063/post-6970371
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_START = 0; // 0x00
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_END = 3; // 0x01
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_VALUE = '010001'; // 0x0100

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START = 2; // 0x02
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_END = 4; // 0x03
		//let VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM; // This will be dynamic based on the actual save

		// This is the game ID. Since this can wildly vary, we're not checking this right now.
		// const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_GAME_ID_OFFSET_START = 4; // 0x04
		// const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_GAME_ID_OFFSET_END = 6;  // 0x05
		// let VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM; // could be used in save file name.

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_OFFSET_START = 6; // 0x06
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_OFFSET_END = 8; // 0x07
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_VALUE = '0000'; // 0x00

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_START = 8; // 0x08
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_END = 13; // 00xC
		const VIRTUAL_CONSOLE_3DS_HEADER_THIRD_CHECK_VALUE = '0000000000'; // 0x00 for 3ds ONLY. For Wii U it'll be a dyanmic non-0 value

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_OFFSET_START = 13; // 0x0d
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_OFFSET_END = 16; 
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_VALUE = '000000';

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_CHECK_OFFSET_START = 16; // 0x10
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_CHECK_OFFSET_END = 24; // 0x10
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_VALUE = 'c13586a565cb942c'; // Needs to be this exactly, apparently

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_OFFSET_START = 32; // 0x20
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_OFFSET_END = 49; // 16 (0x10) bytes long
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_VALUE = '0000000000000000000000000000000000';

		// start of actual save
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START = 48; // 48 bytes. .ves file, 0x30
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_END = this._buffer.length;

		// 256
		//const firstHeaderCheck = parseInt( this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_END).toString("hex"), 16);
		const firstHeaderCheck = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_END).toString("hex") == VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_VALUE;
		const secondHeaderCheck = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_OFFSET_END).toString("hex") == VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_VALUE;
		const fourthHeaderCheck = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_OFFSET_END).toString("hex") == VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_VALUE;
		const fifthHeaderCheck = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_CHECK_OFFSET_END).toString("hex") == VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_VALUE;
		const sixthHeaderCheck = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_OFFSET_END).toString("hex") == VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_VALUE;

		const validHeaderChecks = [firstHeaderCheck,secondHeaderCheck,fourthHeaderCheck,fifthHeaderCheck,sixthHeaderCheck];

		if(validHeaderChecks.indexOf(false) > -1) {
			throw new Error('Not a valid Wii U or 3DS Virtual Console Save.');
		}

		const thirdHeaderCheck = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_END).toString("hex")
		this.saveFileType = (thirdHeaderCheck == VIRTUAL_CONSOLE_3DS_HEADER_THIRD_CHECK_VALUE) ? '3ds_virtual_console' : 'wii_u_virtual_console';

		this._buffer = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_END);



		return this._buffer;
	}
}

module.exports = SaveFileSuperNES;