const SaveFile = require('./SaveFile.js');
const path = require('path');
const debug = require('debug')('SaveAIO:SaveFileNintendo64');

// NOTE: N64 uses its own customer character encoding, as noted here:
// If there is a need to implement decoding, reference the following:
// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/N64/TextDecoder.js

const DEX_DRIVE_SAVE_FILE_OFFSET_START = 4160; // 0x1040

const KNOWN_SAVE_FILE_EXTENSIONS = [
	'.eep', // eeprom
	'.sra',
	'.sav',
	'.fla',
	'.srm', // SRAM (libreto-mupen64?)
	'.n64' // Dex Drive
];

// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/PlatformSaveSizes.js#L27
const VALID_SAVE_FILE_SIZES = [
	512,
	2048,
	32768,
	131072,
	786432 // Dazaemon 3D
]

// TODO:
// BECAUSE we don't know system vs emulator (byte swap, endian swap), have a command that exports
// all variants with file names (.ie game_byte_swapped.sav, game_word_swapped.sav, game_word_and_endian_swapped.sav), etc

class SaveFileNintendo64 extends SaveFile {
	constructor(filePath,saveFileType) {
		super(filePath,saveFileType); // call parent constructor for basic initialization.

		this.validSaveFileSizes = VALID_SAVE_FILE_SIZES;
		this.knownSaveFileExtensions = KNOWN_SAVE_FILE_EXTENSIONS;

		this._dexDrive;
	}

	async init() {
		await super.init(); // call parent initialization function

		// NOTE: WII VC
		// Wii VC will likely not be implemented as extraction tools
		// are required to parse out the save at all.
		// Once parsed out, the save file is a standard save file.
		// A user can simply place the save file from here back in its place 
		// to rebuild the save accordingly.
		// Save "unpacking" requires a tool known as FE100. What it unpacks
		// appears to be an .fla file that doesn't require any special modifications
		// https://www.reddit.com/r/WiiHacks/comments/izwgv0/need_help_compressing_a_fla_save_from_not64_to_a/
		// probably best to not bother implementing this here?

		switch(this.saveFileType) {
			// NOTE: We can't tell the difference between an emulator (Project64) vs "native" (Everdrive/cart dump)
			// because the only differences are endian/wordswapped. There are no special headers, etc to differentiate
			// So we will have to group all of them as "system".
			case 'everdrive':
			case 'system':
				debug('Save file is assumed standard system save. Nothing to extract');
				// no action to be had, the buffer, as-is, is fine.
				break;
			case 'dex_drive':
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
		

		return this._buffer;
	}

	async exportVariantsToMemory() {
		await this.swapSaveFileEndian(); // swap endians from
		const endianSwapped = Buffer.from(this._buffer); // capture a copy of the array
		await this.swapSaveFileWords(); // swap words
		const endianAndWordSwapped = Buffer.from(this._buffer); // capture a copy of endian + wordSwapped
		await this.swapSaveFileEndian(); // swap the endians back so it's only word swapped
		const wordSwapped = Buffer.from(this._buffer);
		await this.swapSaveFileWords(); // back to the original since we don't want to modify it
		
		return {
			original: this._buffer,
			endianSwapped,
			wordSwapped,
			endianAndWordSwapped,
		}
	}

	// We decide to do all the swapping again here rather than pulling from
	// exportVariantsToMemory since we'd have to implement a separate exportToFile function that can
	// take an arbitrary buffer
	async exportVariantsToDisk(filePath) {
		const { root, dir, ext, name } = path.parse(filePath);

		await super.exportToFile(filePath);

		await this.swapSaveFileEndian(); // swap endians to reverse original
		filePath = path.join( root, dir, name + '_endianSwapped' + ext );
		await super.exportToFile(filePath);

		await this.swapSaveFileWords(); // swap words
		filePath = path.join( root, dir, name + '_endianAndWordSwapped' + ext );
		await super.exportToFile(filePath);

		await this.swapSaveFileEndian();
		filePath = path.join( root, dir, name + '_wordSwapped' + ext );
		await super.exportToFile(filePath);

		await this.swapSaveFileWords(); // back to original.
	}

	async _autoDetectSaveFileType() {
		try {
			await Promise.any([
				await this._parseDexDriveSave()
			])
		} catch(error) {
			debug(error);
			debug('Unable to detect save file type');
			this.saveFileType = 'system';
		}
		return this._buffer;
	}

	async injectDexDriveSave(saveBufferToInject) {
		if(!this._dexDrive) {
			throw new Error('This target save is not an instance of a Gameshark SP save.')
		}

		if(saveBufferToInject.length != this._buffer.length) {
			throw new Error(`Injected save file must match the length of the original save.`);
		}

		this._buffer = Buffer.from(saveBufferToInject);

		return this._buffer;
	}

	async exportDexDriveSaveToMemory() {
		if(!this._gamesharkSP) {
			throw new Error('This save is not an instance of a Gameshark SP save.')
		}

		const DEX_DRIVE_SAVE_FILE_END_OFFSET = this._buffer.length;
		// get the header so we can prepend it.
		let dexDriveHeader = this._gamesharkSP.buffer.slice(0,DEX_DRIVE_SAVE_FILE_OFFSET_START); // from the start of the file up until the staticly known offset of where the user's save file begins.
		// attach header to the file. We know that save files go to the end of the file, so no need to add anything beyond.
		this._dexDrive.buffer = Buffer.concat([dexDriveHeader,this._buffer]);

		return this._dexDrive.buffer;
	}

	async exportDexDriveSaveToFile(filePath) {
		// await fs.mkdir(filePath, { recursive: true });
		return await fs.writeFileSync(filePath, await this.exportGamesharkSPSaveToMemory(), { encoding: null });
	}

	// https://github.com/euan-forrester/save-file-converter/blob/main/frontend/src/save-formats/N64/DexDrive.js
	// https://github.com/bryc/mempak/wiki/DexDrive-.N64-format
	async _parseDexDriveSave() {
		const DEX_DRIVE_ENCODING = 'US-ASCII';
		const textDecoder = new TextDecoder(DEX_DRIVE_ENCODING);

		const DEX_DRIVE_HEADER_OFFSET_START = 0; // 0x00;
		const DEX_DRIVE_HEADER_OFFSET_END = 11 // 0x0C
		const DEX_DRIVE_HEADER_VALUE = '123-456-STD';

		const DEX_DRIVE_COMMENTS_OFFSET_START = 64; // 0x40
		const DEX_DRIVE_COMMENTS_OFFSET_END = 4096 // 0x1000
		const DEX_DRIVE_COMMENTS_LENGTH = 256; // Each comment is 256 bytes long. There can be 16 in total.

		const DEX_DRIVE_SAVE_FILE_OFFSET_END =  this._buffer.length; // should be + 4160 + 32768
		
		const dexDriveHeader = textDecoder.decode( this._buffer.slice(DEX_DRIVE_HEADER_OFFSET_START,DEX_DRIVE_HEADER_OFFSET_END) );

		if(DEX_DRIVE_HEADER_VALUE != dexDriveHeader) {
			throw new Error('Not a valid DexDrive N64 Save.')
		}

		// get all comments stored on DexDrive.
		const comments = [];

		for(let i = DEX_DRIVE_COMMENTS_OFFSET_START; i < DEX_DRIVE_COMMENTS_OFFSET_END; i = i + DEX_DRIVE_COMMENTS_LENGTH ) {
			let commentText = textDecoder.decode( this._buffer.slice(i,i + DEX_DRIVE_COMMENTS_LENGTH) );
			commentText = commentText.replace(/[^\x01-\x7F]/g, ""); // parse out null terminator and non-ascii data
			comments.push(commentText);
		}

		this._dexDrive = {
			buffer: this._buffer,
			comments
		}
		this.saveFileType = 'dex_drive';
		this._buffer = this._buffer.slice(DEX_DRIVE_SAVE_FILE_OFFSET_START,DEX_DRIVE_SAVE_FILE_OFFSET_END);
		return this._buffer;
	}

	// Set default to 2 bytes instead of SaveFile's default 8 byte. 
	// https://github.com/ssokolow/saveswap/blob/master/saveswap.py#L157 
	// suggests 16-bit (interpreting at 2 bytes) would be what I want here
	async swapSaveFileEndian(bytes = 2) {
		debug('Swapping 2 byte endian for Nintendo 64')
		super.swapSaveFileEndian(bytes);
	}

	/*
		The definition of a "word" here is a collection of bytes in an array-like configuration
		For example in [1,2,3,4], if you assume that a "word" is two bytes, this is two words:
		[1,2] and [3,4]
		By setting our bytes argument to to, in [1,2,3,4], we would swap [1,2] and [3,4]
		resulting in an outcome of [3,4,1,2]

		if we had [1,2,3,4,5,6,7,8] with bytes set to 2, we would end up with
		[3,4,1,2,7,8,5,6]

		if bytes = 4, we would end up with:
		[5,6,7,8,1,2,3,4]
	*/
	async swapSaveFileWords(bytes = 2) {
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
		return this._buffer;
	}

	/*
	// We can't make a distinction between whether we're going to or from an emulator/(Everdrive/Native), so just make a generic convert function
	async convertNintendo64Save() {
		this.swapSaveFileEndian();
		this.swapSaveFileWords();

		return this._buffer;
	}
	*/

	async trimSaveWhitespace(bytes) {
		if( VALID_SAVE_FILE_SIZES.indexOf(bytes) == -1 ) {
			throw new Error(`Save file byte size must be one of: ` + JSON.stringify(this.VALID_SAVE_FILE_SIZES) );
		}
		super.trimSaveWhitespace();
	}

	async expandSaveWhitespace(bytes) {
		if( VALID_SAVE_FILE_SIZES.indexOf(bytes) == -1 ) {
			throw new Error(`Save file byte size must be one of: ` + JSON.stringify(this.VALID_SAVE_FILE_SIZES) );
		}
		super.expandSaveWhitespace();
	}
}

module.exports = SaveFileNintendo64;