// const Buffer = require('buffer').Buffer;
const fs = require('fs-extra');
const debug = require('debug')('SaveAIO:SaveFile');
const endianness = require('endianness');
const path = require('path');

class SaveFile {
	constructor(filePath,saveFileType) {	
		this.saveFilePath = filePath; // the (input) save file path
		this._buffer; // the buffer of the save file 
		this.littleEndian; // determines if the file is big or little endian.
		this.saveFileName = path.parse(filePath).name; // 
		this.saveFileExtension = path.parse(filePath).ext;
		// Refers to the type of save file the save belongs to.
		// example: gameshark, gameshark_sp, wii_u_virtual_console (GBA)
		this.saveFileType = saveFileType;
	}
	

	// initialize this save program by reading in the save file as a buffer
	async init() {
		if(this._buffer) {
			throw new Error('Save file already initialized');
		}

		this._buffer = await fs.readFileSync(this.saveFilePath,null);
		// this._buffer.length to get the bytes length.
	}

	async compareDelta(saveBufferToCompare, bytes = 1) {
		const textDecoder = new TextDecoder('utf-8');

		let deltas = [];
		for(let i = 0; i < this._buffer.length; i = i + bytes ) {
			let theseBytes = this._buffer.slice(i, i + bytes);
			let thoseBytes = saveBufferToCompare.slice(i, i + bytes);

			if( Buffer.compare(theseBytes,thoseBytes) !== 0 ) {
				let delta = {
					index: i,
					original: theseBytes,
					new: thoseBytes
				}

				debug( textDecoder.decode(theseBytes), textDecoder.decode(thoseBytes) );

				deltas.push(delta);
			}
		}

		return deltas;
	}

	// Exports a copy of the base game save file to memory. Makes a deep copy
	// to decouple it from this instance.
	async exportToMemory() {
		return Buffer.from(this._buffer);
	}
	
	// Export the save out to a file.
	async exportToFile(filePath) {
		debug(`Exported save to ${filePath}`)
		await fs.writeFileSync(filePath, this._buffer, { encoding: null, recursive: true });
	}

	async expandSaveFileWhitespace() {
		// https://www.geeksforgeeks.org/smallest-power-of-2-greater-than-or-equal-to-n/
		// Used to add padding to a save if the user doesn't specify a specific number
		// Saves generally seem to follow a power of 2 step, so just go to the next closest power of 2 
		function _calculateNextPowerOf2(number) {
			let count = 0;

			if(number && !(number & ( number -1 ))) {
				return number;
			}

			while( number != 0 ) {
				number >>= 1;
				count += 1;
			}

			// if our number is the same as what got put in, we want to go
			// to the next power of 2 after, so do a 2 << count;
			if(1 << count == number) {
				return 2 << count;
			}
			// Return the nearest power of 2 otherwise.
			return 1 << count;
		}


		const bytesToExpand = _calculateNextPowerOf2(this._buffer.length);	
		await this.setSaveFileSize(bytesToExpand);
		return this._buffer;
	}

	async setSaveFileSize(bytes) {
		if(!this._buffer || !this._buffer.length) {
			throw new Error('Save file buffer is not initialized.');
		}
		if(this._buffer.length <= 0) {
			debug(`INFO: Cannot expand save by 0 or negative bytes.`);
			return;
		} 
		if(this._buffer.length > bytes) {
			debug(`WARNING: No operation occurred. Save is ${this._buffer.length}, which is larger than the target of ${bytes}.`);
			return;
		}
		debug(`Expanding buffer by ${bytes}`); 
		const bufferPadding = new Buffer.alloc(bytes);

		const expandedBuffer = Buffer.concat([this._buffer,bufferPadding]);

		this._buffer = expandedBuffer;
		return this._buffer;
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
	async injectSave(saveBufferToInject) {
		if(!this._gamesharkSP) {
			throw new Error('This target save is not an instance of a Gameshark SP save.')
		}

		if(saveBufferToInject.length != this._buffer.length) {
			throw new Error(`Injected save file must match the length of the original save.`);
		}

		this._buffer = Buffer.from(saveBufferToInject);
		return this._buffer;
	}

	async trimSaveWhitespace() {
		let whitespaceStartIndex;
		// enumerate from the back of the binary to the front, looking where each one is 0.
		for(let i = this._buffer.length - 1; i > 0; i--) {
			if( this._buffer[i] != 0) {
				whitespaceStartIndex = i + 1;
				break;
			}
		}

		debug(`Trimming ${this._buffer.length - whitespaceStartIndex} bytes of whitespace`);
		this._buffer = this._buffer.slice(0,whitespaceStartIndex);
		debug(`Buffer is now ${this._buffer.length} bytes`);
		return this._buffer;
	}

	static async _swapEndian(buffer,bytes = 2) {
			// 0 is not an acceptable swap amount
		if(bytes == 0) {
			throw new Error('The number of bytes being endian swapped must be greater than 0');
		}
		// endian swapping must be even
		if(bytes % 2 != 0 ) {
			throw new Error('The number of bytes being endian swapped must be a multiple of 2');
		}
		// The file being swapped must not have any "partial swaps". It must evenly divide into the save file size.
		if(!buffer || buffer.length % bytes != 0) {
			throw new Error(`The buffer is not a multiple of ${bytes}. Buffer file length is ${this._buffer.length}`)
		}
		debug('Swapping static buffer endianness');
		await endianness(buffer,bytes); // swaps in place. No re-assignment required.
		return buffer;
	}


	// based on: https://github.com/ssokolow/saveswap/blob/master/saveswap.py#L157
	// bytes here represents how many bytes represent a "word".
	// For example, bytes = 2 means that in array [1,2,3,4], there are two "words",
	// [1,2] and [3,4]. They will be swapped and rejoined as [3,4,1,2]
	async swapSaveFileEndian(bytes = 8) {
		// 0 is not an acceptable swap amount
		if(bytes == 0) {
			throw new Error('The number of bytes being endian swapped must be greater than 0');
		}
		// endian swapping must be even
		if(bytes % 2 != 0 ) {
			throw new Error('The number of bytes being endian swapped must be a multiple of 2');
		}
		// The file being swapped must not have any "partial swaps". It must evenly divide into the save file size.
		if(this._buffer.length % bytes != 0) {
			throw new Error(`The save file is not a multiple of ${bytes}. Save file length is ${this._buffer.length}`)
		}
		debug('Swapping save file endianness');
		endianness(this._buffer,bytes); // swaps in place. No re-assignment required.
	}

	// use file extension/name to try and filter through. Then can parse according
	// to each file type's "smart identification"
	/* 
	async smartDetectFileType() {
		debug('Unimplemented');
	}
	*/
}

module.exports = SaveFile;