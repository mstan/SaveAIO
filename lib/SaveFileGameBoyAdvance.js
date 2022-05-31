const SaveFile = require('./SaveFile.js');
const debug = require('debug')('SaveAIO:SaveFileGameboyAdvance');
const fs = require('fs-extra');

const WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_START = 16384; // byte offset 16384
const WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_END = 16392; // byte offset 16392
const WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_DECODED = 'STATRAM0';
const WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET = 16512; // byte offset 16512

class SaveFileGameboyAdvance extends SaveFile {
	constructor(filePath) {
		super(filePath); // call parent constructor for basic initialization.
		this._wiiUVirtualConsoleContainer;
		this._gameshark;
		this._gamesharkSP;
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
			// Represents a Gameshark SP extracted save for the Gameboy Advance
			case 'gameshark_sp':
				debug('Attempting to parse Gameshark SP save');
				await this._parseGamesharkSPSave();
				break;
			// every single action replay save I came across, without exception, met 100% the file structure of the Gameshark.
			case 'action_replay':
				debug('Attempting to parse action replay save');
				await this._parseGamesharkSave();
				break;
			// Represents a Gameboy Advance save title coming from an extracted Wii U Virtual Console game.
			case 'wii_u_virtual_console':
				await this._parseWiiUVirtualConsoleSave();
				break;
			// 3DS unimplemented as 3DS extracted GBA saves using Godmode9 are raw files that don't require modification.
			default: 
				debug('Attempting to auto-detect save file type');
				await this._autoDetectSaveFileType();
		}

		return this._buffer;
	}

	async _autoDetectSaveFileType() {
		// Consider some sort of Promise.all() here?
		// if one succeeds, it's that save file type, presumably
		// if all reject, it's a base "none" type which we don't have to explicitly call, since that's already initialized
		// in the parent "super.init()" call.
		await this._parseWiiUVirtualConsoleSave();
		await this._parseGamesharkSave();
		await this._parseGamesharkSPSave();
	}

	// https://github.com/GoobyCorp/SAVE2VC/blob/6fcaaaa2b211a5f218f384f0005164e3ddb7a99d/SAVE2VC.py#L67
	// Naively assume that all GBA save file sizes are 32768 bytes for now. But expose it as 
	// an argument for someone to override.
	async _parseWiiUVirtualConsoleSave(saveFileSize = 32768) {
		const textDecoder = new TextDecoder('utf-8'); // Decodes an ArrayBuffer into a utf8 string

		let decodedVerificationByte = textDecoder.decode( this._buffer.slice(WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_START,WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_OFFSET_END));

		if(decodedVerificationByte != WII_U_VIRTUAL_CONSOLE_CONTAINER_VERIFICATION_DECODED ) {
			debug('This is not a valid Wii U Virtual Console Save file. Do not continue extraction process');
			return false;
		}

		// Before we start modifying and pulling things out, we may want to save this container
		// for re-injection later. Save it as is.
		this._wiiUVirtualConsoleContainer = Buffer.from(this._buffer);

		const WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_END = saveFileSize;

		// We determined where the save starts, add the save file length to it.
		const endOfSaveFileByte = WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET + saveFileSize;

		// Update the buffer to be the EXTRACTED save.
		// We're making naive assumptions for now, using startingSaveByte + an assumed length
		// of the save file here.
		this._buffer = this._buffer.slice(WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET, WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET + saveFileSize);
	}

	// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/GBA/GameShark.js#L7
	async _parseGamesharkSave() {
		const SHARK_PORT_SAVE_TEXT = 'SharkPortSave';
		const SHARK_PORT_SAVE_TEXT_OFFSET_START = 3; // start at byte 4 (array index 3)
		const SHARK_PORT_SAVE_TEXT_OFFSET_END = 17; // end at 18 bytes (array index 17)

		const textDecoder = new TextDecoder('utf8');
		const decodedHeaderText = textDecoder.decode( this._buffer.slice(SHARK_PORT_SAVE_TEXT_OFFSET_START,SHARK_PORT_SAVE_TEXT_OFFSET_END) );

		if(decodedHeaderText != SHARK_PORT_SAVE_TEXT) {
			debug('This is not a valid GameShark Save File. Do not continue extraction process');
			return false;
		}

		debug('Gameshark extraction is not yet implemented. This application will fail to process the save correctly');
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

		const GAMESHARK_SP_SAVE_OFFSET_START = 1072; // byte offset 1072
		const GAMESHARK_SP_SAVE_OFFSET_END = this._buffer.length;

		const textDecoder = new TextDecoder('utf8');
		const decodedHeaderText = textDecoder.decode( this._buffer.slice(GAMESHARK_SP_HEADER_OFFSET_START,GAMESHARK_SP_HEADER_OFFSET_END) );

		if(decodedHeaderText != GAMESHARK_SP_HEADER_TEXT) {
			debug('This is not a valid GameShark Save SP File. Do not continue extraction process');
			return false;		
		}

		const decodedGameNameText = textDecoder.decode( this._buffer.slice(GAMESHARK_SP_TARGET_GAME_NAME_OFFSET_START,GAMESHARK_SP_TARGET_GAME_NAME_OFFSET_END) );
		const decodedGameNotesText = textDecoder.decode( this._buffer.slice(GAMESHARK_SP_NOTES_OFFSET_START,GAMESHARK_SP_NOTES_OFFSET_END) );
		debug(`Decoded Gameshark SP header for game: ${decodedGameNameText}`);
		debug(`Decoded Gameshark SP notes: ${decodedGameNotesText}`);
		
		this._gamesharkSP = {
			game: decodedGameNameText,
			notes: decodedGameNotesText
		}

		this._buffer = this._buffer.slice(GAMESHARK_SP_SAVE_OFFSET_START,GAMESHARK_SP_SAVE_OFFSET_END);
	}




	/*
		NOTE: This function is not literal. This is an abstraction helper function. All this function does is let 
		the user pass a new save file that will be updated in this._buffer. this.wiiUVirtualConsoleContainer will continue
		to have the original save in it. 

		For the user to ACTUALLY get the container re-exported with the new "injected" save, they must call exportWiiUVritualConsoleSave
		below.

		The reason for this is that it will be difficult to maintain the save integrity in two places, both in this._buffer
		and this.wiiUVirtualConsoleContainer as the user may want to modify the save before exporting it

		Therefore, we will update the container at export time by injecting this._buffer into this.wiiUVirtualConsoleContainer at runtime
		below
	*/
	async injectWiiUVirtualConsoleSave(saveBufferToInject) {
		if(!this._wiiUVirtualConsoleContainer) {
			throw new Error('Not an instance of a Wii U virtual console save.')
		}

		if(saveBufferToInject.length != this._buffer.length) {
			throw new Error(`Injected save file must match the length of the original save.`);
		}

		this._buffer = saveBufferToInject;
	}

	/*
		Exports the Wii U Virtual console save that can be used in a Wii U. Recommended to re-inject using Checkpoint.
	*/
	async exportWiiUVirtualConsoleSaveToMemory() {
		if(!this._wiiUVirtualConsoleContainer) {
			throw new Error('Not an instance of a Wii U virtual console save.')
		}

		const WII_U_VIRTUAL_CONSOLE_SAVE_FILE_END_OFFSET = this._buffer.length;

		let wiiUContainerStart = this._wiiUVirtualConsoleContainer.slice(0,WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET); // from the start of the file up until the staticly known offset of where the user's save file begins.
		let wiiUContainerEnd = this._wiiUVirtualConsoleContainer.slice(WII_U_VIRTUAL_CONSOLE_SAVE_FILE_START_OFFSET + WII_U_VIRTUAL_CONSOLE_SAVE_FILE_END_OFFSET, this._wiiUVirtualConsoleContainer.length); // start of where save file is at + save file length itself. End at the end of the container file
		
		this._wiiUVirtualConsoleContainer = Buffer.concat([wiiUContainerStart,this._buffer,wiiUContainerEnd]);

		return this._wiiUVirtualConsoleContainer;
	}

	async exportWiiUVirtualConsoleSaveToDisk(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		await fs.writeFileSync(filePath, await this.exportWiiUVirtualConsoleSaveToMemory(), { encoding: null });
	}
}

module.exports = SaveFileGameboyAdvance