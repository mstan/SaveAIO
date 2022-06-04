const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileSNES');
const fs = require('fs-extra');

const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_START = 8; // 0x08
const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_END = 13; // 00xC
const VIRTUAL_CONSOLE_3DS_HEADER_THIRD_CHECK_VALUE = '0000000000'; 

const VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START = 48; // 48 bytes. .ves file, 0x30

class SaveFileSuperNES extends SaveFile {
	constructor(filePath,saveFileType) {
		super(filePath,saveFileType); // call parent constructor for basic initialization.
		
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

		this._wiiUVirtualConsole.buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_END)
		const buffer3DSHeaderSegment = Buffer.from(VIRTUAL_CONSOLE_3DS_HEADER_THIRD_CHECK_VALUE, 'utf-8');

		const first3DSBufferHalf = this._wiiUVirtualConsole.buffer.slice(0,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_START - 1);
		const second3DSBufferHalf = this._wiiUVirtualConsole.buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_END + 1, this._wiiUVirtualConsole.buffer.length );


		// initialize 3DS buffer
		this._3DSVirtualConsole = {
			buffer: Buffer.concat(first3DSBufferHalf,buffer3DSHeaderSegment,second3DSBufferHalf)
		};

		this.saveFileType = '3ds_virtual_console';
		// unitialize Wii U Virtual console
		this._wiiUVirtualConsole = undefined;
	}

	// Not implemented, since we can't reliably know what the header value should be
	// for wii U. For 3DS, we know it'll always be 0
	/*
	async convert3DSToWiiUVirtualConsole() {
	}
	*/

	// DOES NOT WORK. To figure out why integrity check fails.
	async _exportWiiUVOr3DSVirtualConsoleSaveToMemory(virtualConsoleContainer) {
		// This is a helper function that takes the two byte checksum and swaps the first byte with the second
		// we know it'll always be two bytes, so for sake of efficency, let's just make it a non-extensible function.
		function _swapChecksumEndian(buffer) {
			let tmp = buffer[0]; // temp swap variable
			// swap the first two byte endian
			buffer[0] = buffer[1];
			buffer[1] = tmp;
			// swap the second two byte endian
			tmp = buffer[2];
			buffer[2] = buffer[3];
			buffer[3] = tmp;
			
			return;
		}


		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START = 2; // 0x02
		const VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_END = 4; // 0x03
		//let VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_VALUE; // This will be dynamic based on the actual save

		// get the header of the save file
		const header = virtualConsoleContainer.buffer.slice(0,VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START);
		// build what the new save file should look like. We need this to calculate the checksum.
		virtualConsoleContainer.buffer = Buffer.concat([header,this._buffer]);
		// for calculating the new checksum, these two bytes MUST be zero, so zero them out.
		// grab the original checksum
		let oldChecksum = virtualConsoleContainer.buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_SAVE_FILE_CHECKSUM_END);	
		oldChecksum[0] = 0; // 0x00
		oldChecksum[1] = 0; // 0x00

		// how to calculate checksum: https://gbatemp.net/threads/research-snes-virtual-console-save-files.498334/post-9477546
		// sum all bytes in the array, assuming the checksum self-referencial values will be 0x00
		// take the end result, divide it by 0x10000 (65536), and subtract 1.
		let newChecksum = 0;
		for(let i = 0; i < virtualConsoleContainer.buffer.length; i++) {
			newChecksum += virtualConsoleContainer.buffer[i];
		}
		// modulo out by 0x10000
		newChecksum = newChecksum % 65536 // (65536) modulo by this amount 
		// take away 1
		newChecksum = newChecksum - 1; // subtract 1
		// now convert to a little endian byte array
		// first convert it to hex so we can pass it to a Buffer
		newChecksum = (newChecksum).toString(16);
		newChecksum = Buffer.from(newChecksum, "utf-8");
		// swap the endianness of this 2-byte buffer.
		SaveFile._swapEndian(newChecksum);
		//set the new checkSum to our buffer. Keep in mind this will update the parent buffer's reference in the same location
		// which is our intention.
		oldChecksum[0] = newChecksum[0];
		oldChecksum[1] = newChecksum[1];

		// no need to re-assign buffers here. It's already been modified. Let's just return it.
		return virtualConsoleContainer.buffer;
	}

	async exportWiiUVirtualConsoleSaveToDisk(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		return await fs.writeFileSync(filePath, await this._exportWiiUVOr3DSVirtualConsoleSaveToMemory(this._wiiUVirtualConsole), { encoding: null });
	}

	async export3DSVirtualConsoleSaveToDisk(filePath) {
		debug('Exported 3DS virtual console save file successfully');
		// await fs.mkdir(filePath, { recursive: true });
		return await fs.writeFileSync(filePath, await this._exportWiiUVOr3DSVirtualConsoleSaveToMemory(this._3DSVirtualConsole), { encoding: null });
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

	// USE THIS FOR IMPLEMENTATION REFERENCE
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

		const thirdHeaderCheck = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_HEADER_THIRD_CHECK_OFFSET_END).toString("hex")
		const parsedSaveFileType = (thirdHeaderCheck == VIRTUAL_CONSOLE_3DS_HEADER_THIRD_CHECK_VALUE) ? '3ds_virtual_console' : 'wii_u_virtual_console';

		// if the user specified a specific file type and we got the other, throw an error
		if(this.saveFileType && this.saveFileType != thirdHeaderCheck) {
			throw new Error(`Received ${this.saveFileType} as targeted save type, but got ${parsedSaveFileType} instead`)
		}

		if(!this.saveFileType) {
			this.saveFileType = parsedSaveFileType;
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

		this._buffer = this._buffer.slice(VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_START,VIRTUAL_CONSOLE_3DS_AND_WII_U_SNES_SAVE_FILE_OFFSET_END);

		return this._buffer;
	}
}

module.exports = SaveFileSuperNES;