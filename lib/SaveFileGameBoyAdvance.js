const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileGameboyAdvance');
const fs = require('fs-extra');

const WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_START = 16384; // byte offset 16384
const WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_END = 16392; // byte offset 16392
const WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_DECODED = 'STATRAM0';
const WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET = 16512; // byte offset 16512

const GAMESHARK_SP_SAVE_OFFSET_START = 1072; // byte offset 1072

const KNOWN_SAVE_FILE_EXTENSIONS = [
	'.sav',
	'.bin' // for Wii U Virtual Console save extracts
];

// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/PlatformSaveSizes.js
const VALID_SAVE_FILE_SIZES = [
    512,
    8192,
    16384,
    32768,
    65536,
    131072,
];


class SaveFileGameboyAdvance extends SaveFile {
	constructor(filePath, saveFileType) {
		super(filePath,saveFileType); // call parent constructor for basic initialization.

		this._wiiUVirtualConsole;
		this._gameshark;
		this._gamesharkSP;

		this.validSaveFileSizes = VALID_SAVE_FILE_SIZES;
		this.knownSaveFileExtensions = KNOWN_SAVE_FILE_EXTENSIONS;

	}

	async init() {
		await super.init(); // call parent initialization function
		switch(this.saveFileType) {
			case 'system':
				debug('Save file is assumed standard system save. Nothing to extract');
				// no action to be had, the buffer, as-is, is fine.
				break;
			// Represents a gameshark extracted save for the Gameboy Advance
			case 'gameshark':
				debug('Attempting to parse gameshark save');
				await this._parseGamesharkSave();
				break;
			// every single action replay save I came across, without exception, met 100% the file structure of the Gameshark.
			case 'action_replay':
				debug('Attempting to parse action replay save');
				await this._parseGamesharkSave();
				break;
			// Represents a Gameshark SP extracted save for the Gameboy Advance
			case 'gameshark_sp':
				debug('Attempting to parse Gameshark SP save');
				await this._parseGamesharkSPSave();
				break;
			// Represents a Gameboy Advance save title coming from an extracted Wii U Virtual Console game.
			case 'wii_u_virtual_console':
				await this._parseWiiUVirtualConsoleSave(32768);
				break;
			// 3DS unimplemented as 3DS extracted GBA saves using Godmode9 are raw files that don't require modification.
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
		// We reasonably only expect any one of these to be successful, so if any
		/// return true, we're good.
		try {
			await Promise.any([
				await this._parseWiiUVirtualConsoleSave(this._wiiUVirtualConsoleGameSaveSize),
				await this._parseGamesharkSave(),
				await this._parseGamesharkSPSave()
			])		
		} catch(error) {
			debug('Unable to detect save file type. Assuming File is a system type save file');
			this.saveFileType = 'system';
		}
		// No matter the outcome, we're always returning this._buffer for our user since it'll be valid no matter what.
		return this._buffer;

	}

	// https://github.com/GoobyCorp/SAVE2VC/blob/6fcaaaa2b211a5f218f384f0005164e3ddb7a99d/SAVE2VC.py#L67
	// Naively assume that all GBA save file sizes are 32768 bytes for now. But expose it as 
	// an argument for someone to override.
	async _parseWiiUVirtualConsoleSave() {
		const textDecoder = new TextDecoder('utf-8'); // Decodes an ArrayBuffer into a utf8 string
		let decodedVerificationByte = textDecoder.decode( this._buffer.slice(WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_START,WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_END));
		if(decodedVerificationByte != WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_DECODED ) {
			throw new Error('Not a valid Wii U Virtual console save file.');
		}

		// Before we start modifying and pulling things out, we may want to save this container
		// for re-injection later. Save it as is.
		this._wiiUVirtualConsole = {
			buffer: Buffer.from(this._buffer)
		}


		super.trimSaveWhitespace(); // trim whitespace to help us get ahold of the actual save without whitespace.
		const WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_END = this._buffer.length;

		// Update the buffer to be the EXTRACTED save.
		// We're making naive assumptions for now, using startingSaveByte + an assumed length
		// of the save file here.
		this._buffer = this._buffer.slice(WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET,WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_END);
		this.saveFileType = 'wii_u_virtual_console';
		return this._buffer;
	}

	// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/GBA/GameShark.js#L7
	async _parseGamesharkSave() {
		const SHARK_PORT_SAVE_TEXT = 'SharkPortSave';
		const SHARK_PORT_SAVE_TEXT_OFFSET_START = 3; // start at byte 4 (array index 3)
		const SHARK_PORT_SAVE_TEXT_OFFSET_END = 17; // end at 18 bytes (array index 17)

		const textDecoder = new TextDecoder('utf8');
		const decodedHeaderText = textDecoder.decode( this._buffer.slice(SHARK_PORT_SAVE_TEXT_OFFSET_START,SHARK_PORT_SAVE_TEXT_OFFSET_END) );

		if(decodedHeaderText != SHARK_PORT_SAVE_TEXT) {
			throw new Error('Not a valid Gameshark save file');
		}
		this.saveFileType = 'gameshark';
		debug('Gameshark GBA extraction is not yet implemented.');
		// return this._buffer;
	}

	// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/GBA/GameSharkSP.js
	async _parseGamesharkSPSave() {
		const GAMESHARK_SP_HEADER_TEXT = 'ADVSAVEG';
		const GAMESHARK_SP_HEADER_OFFSET_START = 0; // Byte offset 0
		const GAMESHARK_SP_HEADER_OFFSET_END = 8; // Byte offset 8 
		// Name of game this file was created for
		const GAMESHARK_SP_TARGET_GAME_NAME_OFFSET_START = 11; // byte offset 11 
		const GAMESHARK_SP_TARGET_GAME_NAME_OFFSET_END = 23; // byte offset 23
		// arbitrary text notes stored by gameshark sp metadata
		const GAMESHARK_SP_NOTES_OFFSET_START = 44; // byte offset 44
		const GAMESHARK_SP_NOTES_OFFSET_END = 1067; // byte offset 1067

		const GAMESHARK_SP_SAVE_OFFSET_END = this._buffer.length;

		const textDecoder = new TextDecoder('utf8');
		const decodedHeaderText = textDecoder.decode( this._buffer.slice(GAMESHARK_SP_HEADER_OFFSET_START,GAMESHARK_SP_HEADER_OFFSET_END) );

		if(decodedHeaderText != GAMESHARK_SP_HEADER_TEXT) {
			throw new Error('Not a a valid GameShark Save SP save file.');	
		}

		const decodedGameNameText = textDecoder.decode( this._buffer.slice(GAMESHARK_SP_TARGET_GAME_NAME_OFFSET_START,GAMESHARK_SP_TARGET_GAME_NAME_OFFSET_END) );
		const decodedGameNotesText = textDecoder.decode( this._buffer.slice(GAMESHARK_SP_NOTES_OFFSET_START,GAMESHARK_SP_NOTES_OFFSET_END) );
		debug(`Decoded Gameshark SP header for game: ${decodedGameNameText}`);
		debug(`Decoded Gameshark SP notes: ${decodedGameNotesText}`);
		
		this._gamesharkSP = {
			buffer: Buffer.from(this._buffer),
			game: decodedGameNameText,
			notes: decodedGameNotesText
		}

		this.saveFileType = 'gameshark_sp';
		this._buffer = this._buffer.slice(GAMESHARK_SP_SAVE_OFFSET_START,GAMESHARK_SP_SAVE_OFFSET_END);
		return this._buffer;
	}

	/*
		Exports the Wii U Virtual console save that can be used in a Wii U. Recommended to re-inject using Checkpoint.
	*/
	async exportWiiUVirtualConsoleSaveToMemory() {
		if(!this._wiiUVirtualConsole) {
			throw new Error('This save is not an instance of a Wii U virtual console save.')
		}

		const WII_U_VIRTUAL_CONSOLE_SAVE_FILE_END_OFFSET = this._buffer.length;

		let wiiUContainerStart = this._wiiUVirtualConsole.buffer.slice(0,WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET); // from the start of the file up until the staticly known offset of where the user's save file begins.
		let wiiUContainerEnd = this._wiiUVirtualConsole.buffer.slice(WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET + WII_U_VIRTUAL_CONSOLE_SAVE_FILE_END_OFFSET, this._wiiUVirtualConsole.buffer.length); // start of where save file is at + save file length itself. End with whitespace.
		this._wiiUVirtualConsole.buffer = Buffer.concat([wiiUContainerStart,this._buffer,wiiUContainerEnd]);

		return this._wiiUVirtualConsole.buffer;
	}

	async exportWiiUVirtualConsoleSaveToFile(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		return await fs.writeFileSync(filePath, await this.exportWiiUVirtualConsoleSaveToMemory(), { encoding: null });
	}


	async exportGamesharkSPSaveToMemory() {
		if(!this._gamesharkSP) {
			throw new Error('This save is not an instance of a Gameshark SP save.')
		}

		const GAMESHARK_SP_SAVE_FILE_END_OFFSET = this._buffer.length;
		// get the header so we can prepend it.
		let gamesharkSPHeader = this._gamesharkSP.buffer.slice(0,GAMESHARK_SP_SAVE_OFFSET_START); // from the start of the file up until the staticly known offset of where the user's save file begins.
		// attach header to the file. We know that save files go to the end of the file, so no need to add anything beyond.
		this._gamesharkSP.buffer = Buffer.concat([gamesharkSPHeader,this._buffer]);

		return this._gamesharkSP.buffer;
	}

	async exportGamesharkSPSaveToFile(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		return await fs.writeFileSync(filePath, await this.exportGamesharkSPSaveToMemory(), { encoding: null });
	}

	async exportWiiUVirtualConsoleSaveToDisk(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		return await fs.writeFileSync(filePath, await this.exportWiiUVirtualConsoleSaveToMemory(), { encoding: null });
	}

}

module.exports = SaveFileGameboyAdvance;