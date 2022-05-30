// const Buffer = require('buffer').Buffer;
const fs = require('fs-extra');
const debug = require('debug')('SaveAIO:SaveFile');
const endianness = require('endianness');

class SaveFile {
	constructor(filePath) {	
		this.saveFilePath = filePath; // the (input) save file path
		this.buffer; // the buffer of the save file 
		this.littleEndian; // determines if the file is big or little endian.
	}
	

	// initialize this save program by reading in the save file as a buffer
	async init() {
		this.buffer = await fs.readFileSync(this.saveFilePath,null);
		// this.buffer.length to get the bytes length.
	}
	
	// Export the save out to a file.
	async export(filePath) {
		debug(`Exported save to ${filePath}`)
		await fs.writeFileSync(filePath, this.buffer, { encoding: null });
	}

	async expandBufferWhitespace(bytes = 32768) {
		if(!this.buffer || !this.buffer.length) {
			throw new Error('Save file buffer is not initialized.');
		}
		if(this.buffer.length == bytes) {
			debug(`INFO: No operation occurred. Save is already ${bytes} bytes in length.`);
			return;
		} 
		if(this.buffer.length > bytes) {
			debug(`WARNING: No operation occurred. Save is ${this.buffer.length}, which is larger than the target of ${bytes}.`);
			return;
		}

		const bytesToExpand = bytes - this.buffer.length;
		debug(`Expanding buffer by ${bytesToExpand}`);
		const bufferPadding = new Buffer.alloc(bytesToExpand);

		const expandedBuffer = Buffer.concat([this.buffer,bufferPadding]);

		this.buffer = expandedBuffer;
	}

	async trimBufferWhitespace() {
		// define this buffer as a Uint8Array.
		const uint8array = new Uint8Array(this.buffer);

		let whitespaceStartIndex;
		// enumerate from the back of the binary to the front, looking where each one is 0.
		for(let i = uint8array.length - 1; i > 0; i--) {
			if( uint8array[i] != 0) {
				whitespaceStartIndex = i + 1;
				break;
			}
		}

		debug(`Trimming ${this.buffer.length - whitespaceStartIndex} bytes of whitespace`);
		this.buffer = this.buffer.slice(0,whitespaceStartIndex);
		debug(`Buffer is now ${this.buffer.length} bytes`);
	}

	async swapEndian(bytes = 8) {
		if(bytes == 0) {
			throw new Error('The number of bytes being endian swapped must be greater than 0');
		}
		if(bytes % 2 != 0 ) {
			throw new Error('The number of bytes being endian swapped must be a multiple of 2');
		}
		
		debug('Swapping save file endianness');
		await endianness(this.buffer,bytes);
	}

}

module.exports = SaveFile;