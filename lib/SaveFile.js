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
		debug(this.saveFileName);
		debug(this.saveFileExtension);

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

	// https://www.geeksforgeeks.org/smallest-power-of-2-greater-than-or-equal-to-n/
	// Used to add padding to a save if the user doesn't specify a specific number
	// Saves generally seem to follow a power of 2 step, so just go to the closest power of 2 
	// (inclusive of the current power of 2)
	static _calculateNextPowerOf2(number) {
		let count = 0;

		if(number && !(number & ( number -1 ))) {
			return number;
		}

		while( number != 0 ) {
			number >>= 1;
			count += 1;
		}

		return 1 << count;
	}

	async expandSaveWhitespace(bytes) {
		// If the user did not specify a bytes amount, let's try to get them up to the next power of 2
		// by design, if the number provided IS a pwoer of 2, _calculateNextPowerOf2 will return itself, and this will
		// result in a no-operation functino.
		if(!bytes) {
			bytes = SaveFile._calculateNextPowerOf2(this._buffer.length);
		}


		if(!this._buffer || !this._buffer.length) {
			throw new Error('Save file buffer is not initialized.');
		}
		if(this._buffer.length == bytes) {
			debug(`INFO: No operation occurred. Save is already ${bytes} bytes in length.`);
			return;
		} 
		if(this._buffer.length > bytes) {
			debug(`WARNING: No operation occurred. Save is ${this._buffer.length}, which is larger than the target of ${bytes}.`);
			return;
		}

		const bytesToExpand = bytes - this._buffer.length; // Whitespace buffer only
		debug(`Expanding buffer by ${bytesToExpand}`); 
		const bufferPadding = new Buffer.alloc(bytesToExpand);

		const expandedBuffer = Buffer.concat([this._buffer,bufferPadding]);

		this._buffer = expandedBuffer;
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
	}

	// based on: https://github.com/ssokolow/saveswap/blob/master/saveswap.py#L157
	// bytes here represents how many bytes represent a "word".
	// For example, bytes = 2 means that in array [1,2,3,4], there are two "words",
	// [1,2] and [3,4]. They will be swapped and rejoined at [3,4,1,2]

	async swapEndian(bytes = 8) {
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
	async smartDetectFileType() {
		debug('Unimplemented');
	}

	// This doesn't reliably work. Figure out if there's a better method to assume here.
	/* 
	async calculateEndian(bytes = 8) {
		// 0 is not an acceptable swap amount
		if(bytes == 0) {
			throw new Error('Endian must be greater than 0');
		}
		// endian counting must be even
		if(bytes % 2 != 0 ) {
			throw new Error('The number of bytes being endian counted must be a multiple of 2');
		}
		// The file being parsed must not have any "partial swaps". It must evenly divide into the save file size.
		if(this._buffer.length % bytes != 0) {
			throw new Error(`The save file is not a multiple of ${bytes}. Save file length is ${this._buffer.length}`)
		}

		let byteLeftHalf = 0;
		let byteRightHalf = 0

		// enumerate through the entire buffer by "bytes" defined steps
		for(let i = 0; i < this._buffer.length; i += bytes) {
			// enumerate through the individual byte
			for(let j = 0; j < bytes; j++) {
				// NOTE: Endians are always divisible by 2, meaning there is no case of where j == bytes / 2 
				// if this is the "first half" of the byte, reading the byte left-to-right
				if( j < bytes / 2) {
					// Was this value occupied by a non zero value? If it was, increment our left half by 1.
					if( this._buffer[i] != 0 ) {
						byteLeftHalf++;
					}
				// if this is the "second half" of the byte, reading the byte left-to-right
				} else if ( j > bytes / 2) {
					// Was this value occupied by a non zero value? If it as, increment our right half by 1.
					if( this._buffer[i] != 0 ) {
						byteRightHalf++;
					}
				} // end else if ( j > bytes / 2 )
			} // end for (let j = 0; j < bytes; j++ )
		} // end for (let i = 0; i < this._buffer.length; i += bytes )

		console.log(byteLeftHalf,byteRightHalf);

		
		// an endian is where the "most significant (biggest number" byte is stored at the lowest point in memory,
		// or the address that comes first
		// Therefore, if the right half is occupied most often, it means the left is occupied less often, which is
		// normal with how we read left-to-right. Therefore, if byteLeftHalf occurs left often than byteRightHalf,
		// assume it's a big endian. If the opposite is true, assume little endian
		
		if(byteLeftHalf > byteRightHalf) {
			debug('File is assumed to be a little endian file');
			return 'little';
		} else if (byteLeftHalf < byteRightHalf) {
			return 'big';
		} else {
			debug('File is assumed to be a big endian file');
			return 'unknown';
		}

	}
	*/
}

module.exports = SaveFile;