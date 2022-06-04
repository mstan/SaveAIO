const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileSNES');
const fs = require('fs-extra');


// This is the datetime of an SNES Wii U/3DS save file offset.
// On 3DS, this is always zero. On Wii U, this CAN be zero, but it doesn't matter
/*
const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_DATETIME_CHECK_OFFSET_START = 8; // 0x08
const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_DATETIME_CHECK_OFFSET_END = 13; // 00xC
const VIRTUAL_CONSOLE_3DS_HEADER_THIRD_CHECK_VALUE = '0000000000'; 
*/

const VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START = 48; // 48 bytes. .ves file, 0x30

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
    65536,
    131072
];


class SaveFileSuperNES extends SaveFile {
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
			case 'everdrive':
			case 'sd2snes_pro':
			case 'system':
				debug('Save file is assumed standard system save. Nothing to extract');
				this.saveFileType = 'system';
				// no action to be had, the buffer, as-is, is fine.
				break;
			case '3ds_virtual_console':
			case 'wii_u_virtual_console':
			case '3ds_or_wii_u_virtual_console':
				debug('Attempting to parse Wii U/3DS Virtual Console save');
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
			this.saveFileType = 'system';
		}
		return this._buffer;
	}


	// Untested. Also need to test exported save after validating this.
	// Does the 3DS even care if this header is different? is this function necessary?
	async convertWiiUto3DSVirtualConsoleSave() {
		if(!this._wiiUVirtualConsole) {
			throw new Error('This save is not an instance of a Wii U virtual console save.')
		}

		// initialize 3DS buffer
		this._3DSVirtualConsole = {
			buffer: this._wiiUVirtualConsole.buffer
		};
		this.saveFileType = '3ds_virtual_console';
		// unitialize Wii U Virtual console
		this._wiiUVirtualConsole = undefined;
		return this._3DSVirtualConsole.buffer;
	}

	async convert3DStoWiiUVirtualConsoleSave() {
		if(!this._3DSVirtualConsole) {
			throw new Error('This save is not an instance of a 3DS virtual console save.')
		}

		// initialize Wii U buffer
		this._wiiUVirtualConsole = {
			buffer: this._3DSVirtualConsole.buffer
		};
		this.saveFileType = 'wii_u_virtual_console';
		// unitialize Wii U Virtual console
		this._3DSVirtualConsole = undefined;
		return this._wiiUVirtualConsole.buffer;
	}


	// DOES NOT WORK. To figure out why integrity check fails.
	// TODO: Cross-reference with https://www.reddit.com/r/3dshacks/comments/78s8cu/research_snes_virtual_console_save_files/
	async _exportWiiUVOr3DSVirtualConsoleSaveToMemory(virtualConsoleContainer) {
		/*
		function _calculateChecksum16(buffer) {
			// This is the starting byte. We do this to exclude the first static byte (always 0x0100)
			// as well as the checksum stored location itself (to stop a self-referencial check sum calculation)

			let newChecksum = 0;
			for(let i = VIRTUAL_CONSOLE_CHECKSUM_16_STARTING_BYTE; i < buffer.length; i++) {
				newChecksum += buffer[i];
			}
			// modulo out by 0x10000
			newChecksum = newChecksum % 65536 // (0x10000) modulo by this amount 
			// now convert to a little endian byte array
			// first convert it to hex so we can pass it to a Buffer
			newChecksum = (newChecksum).toString(16);
			return Buffer.from(newChecksum, "utf-8");
		}
		*/
		function _calculateChecksum16(buffer) {
			const VIRTUAL_CONSOLE_CHECKSUM_16_STARTING_BYTE = 3;
			let newChecksum16 = 0;
			for(let i = VIRTUAL_CONSOLE_CHECKSUM_16_STARTING_BYTE; i < buffer.length; i++) {
				if(i % 4 == 0 & i >=8) {
					newChecksum16 = newChecksum16 + buffer[i];
				}
			} 
			newChecksum16 = newChecksum16 % 65536; // (0x100000000)
			return Buffer.from(newChecksum16.toString(16), "utf-8");
		}

		function _calculateChecksum32(buffer) {
			const VIRTUAL_CONSOLE_CHECKSUM_32_BYTE_OFFSET_START = 28;
			let newCheckSum32;
			for(let i = 0; i < buffer.length; i++) {
				if(i % 4 == 0 & i >=16 && i != VIRTUAL_CONSOLE_CHECKSUM_32_BYTE_OFFSET_START) {
					newCheckSum32 = newCheckSum32 + bytes.getUint32(i);
				}
			} 
			return newChecksum32 % 4294967296; // (0x100000000)
		}

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START = 2; // 0x02
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_END = 4; // 0x03
		//let VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_VALUE; // This will be dynamic based on the actual save

		// get the header of the save file
		const header = virtualConsoleContainer.buffer.slice(0,VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START);
		// build what the new save file should look like. We need this to calculate the checksum.
		virtualConsoleContainer.buffer = Buffer.concat([header,this._buffer]);

		// how to calculate checksum: https://gbatemp.net/threads/research-snes-virtual-console-save-files.498334/post-9477546
		// sum all bytes in the array, assuming the checksum self-referencial values will be 0x00
		// take the end result, divide it by 0x10000 (65536), and subtract 1.
		let newChecksum = _calculateChecksum16(virtualConsoleContainer.buffer);
		// swap the endianness of this 2-byte buffer.
		await SaveFile._swapEndian(newChecksum);
		//set the new checkSum to our buffer. Keep in mind this will update the parent buffer's reference in the same location
		debug(virtualConsoleContainer.buffer[VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START]);
		virtualConsoleContainer.buffer[VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START] = newChecksum[0];
		virtualConsoleContainer.buffer[VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START+1] = newChecksum[1];
		virtualConsoleContainer.buffer[VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START+2] = newChecksum[2];
		virtualConsoleContainer.buffer[VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START+3] = newChecksum[3];
		// no need to re-assign buffers here. It's already been modified. Let's just return it.
		return virtualConsoleContainer.buffer;
	}

	async exportWiiUVirtualConsoleSaveToDisk(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		const buffer = await this._exportWiiUVOr3DSVirtualConsoleSaveToMemory(this._wiiUVirtualConsole)
		return await fs.writeFileSync(filePath, buffer, { encoding: null });
	}

	async export3DSVirtualConsoleSaveToDisk(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		const buffer = await this._exportWiiUVOr3DSVirtualConsoleSaveToMemory(this._3DSVirtualConsole)
		const result = await fs.writeFileSync(filePath, buffer, { encoding: null });
		debug('Exported 3DS virtual console save file successfully');
		return result;
	}

	async _injectWiiUVOr3DSVirtualConsoleSave(saveBufferToInject) {
		if(saveBufferToInject.length != this._buffer.length) {
			throw new Error(`Injected save file must match the length of the original save.`);
		}

		this._buffer = Buffer.from(saveBufferToInject);
		return this._buffer;
	}

	async inject3DSVirtualConsoleSave(saveBufferToInject) {
		if(!this._3DSVirtualConsole) {
			throw new Error('This target save is not an instance of a 3DS virtual console save.')
		}

		return await this._injectWiiUVOr3DSVirtualConsoleSave(saveBufferToInject);
	}	

	async injectWiiUVirtualConsoleSave(saveBufferToInject) {
		if(!this._wiiUVirtualConsole) {
			throw new Error('This target save is not an instance of a Wii U virtual console save.')
		}

		return await this._injectWiiUVOr3DSVirtualConsoleSave(saveBufferToInject);
	}

	// https://gbatemp.net/threads/research-snes-virtual-console-save-files.498334/
	async _parseWiiUOr3DSVirtualConsoleSave() {
		// https://gbatemp.net/threads/how-to-extract-snes-virtual-console-saves-from-3ds-to-pc.433063/post-6970371
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_START = 0; // 0x00
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_OFFSET_END = 3; // 0x01
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIRST_CHECK_VALUE = '010001'; // 0x0100

		// This is the game ID. Since this can wildly vary, we're not checking this right now.
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_GAME_ID_OFFSET_START = 4; // 0x04
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_GAME_ID_OFFSET_END = 6;  // 0x05

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_OFFSET_START = 6; // 0x06
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_OFFSET_END = 8; // 0x07
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SECOND_CHECK_VALUE = '0000'; // 0x00

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_OFFSET_START = 13; // 0x0d
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_OFFSET_END = 16; 
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FOURTH_CHECK_VALUE = '000000';

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_CHECK_OFFSET_START = 16; // 0x10
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_CHECK_OFFSET_END = 24; // 0x10
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_FIFTH_VALUE = 'c13586a565cb942c'; // Needs to be this exactly, apparently

		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_OFFSET_START = 32; // 0x20
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_OFFSET_END = 49; // 16 (0x10) bytes long
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SIXTH_CHECK_VALUE = '0000000000000000000000000000000000';

		// end of actual save
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


		if(this.saveFileType == '3ds_virtual_console') {
			this._3DSVirtualConsole = { 
				buffer: this._buffer
			}
		}
		if(this.saveFileType == 'wii_u_virtual_console') {
			this._wiiUVirtualConsole = {
				buffer: this._buffer
			}
		}

		if(!this.saveFileType) {
			this.saveFileType = '3ds_or_wii_u_virtual_console';
			// assign buffer in both places
			this._3DSVirtualConsole = { 
				buffer: this._buffer
			}
			this._wiiUVirtualConsole = {
				buffer: this._buffer
			}
		}

		this._buffer = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_END);
		return this._buffer;
	}
}

module.exports = SaveFileSuperNES;