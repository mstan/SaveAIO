const SaveFile = require('../lib/SaveFilePSXLegendOfTheDragoon.js');

async function main() {
	let newGame1 = new SaveFile('./src/PSX/Legend of the Dragoon/new_game_timer_10_23.mcs');
	// let newGame1 = new SaveFile('./src/PSX/Legend of the Dragoon/dart-44.mcs');
	// The magic numbers we might want to look for here are:
	// 10(10 min), 23 (23 seconds)
	// 623s (10 min 23s in seconds)
	await newGame1.init();

	let buffer = await newGame1.exportToMemory();


	for(let i = 0; i < buffer.length; i++ ) {
		// 1 byte check
		let byte = parseInt( buffer[i] );

		let byte2LE;
		let byte2BE;
		let byte4LE;
		let byte4BE;

		try {
			byte2LE = buffer.slice(i,i+2).readUInt16LE();
			byte2BE = buffer.slice(i,i+2).readUInt16BE();
			byte4LE = buffer.slice(i,i+4).readUInt32LE();
			byte4BE = buffer.slice(i,i+4).readUInt32BE();
		} catch(error) {

		}

		let values = [ byte, byte2LE, byte2BE, byte4LE, byte4BE ];

		if( values.indexOf(628) > -1 ) {
			console.log(i, values);
		}

		if( values.indexOf(10) > -1 ) {
			console.log(i, values);
		}

		if( values.indexOf(23) > -1 ) {
			console.log(i, values);
		}
	}

	await newGame1.swapSaveFileEndian();
	buffer = await newGame1.exportToMemory();
	// now try it with a reversed buffer
	for(let i = 0; i < buffer.length; i++ ) {
		// 1 byte check
		let byte = parseInt( buffer[i] );

		let byte2LE;
		let byte2BE;
		let byte4LE;
		let byte4BE;

		try {
			byte2LE = buffer.slice(i,i+2).readUInt16LE();
			byte2BE = buffer.slice(i,i+2).readUInt16BE();
			byte4LE = buffer.slice(i,i+4).readUInt32LE();
			byte4BE = buffer.slice(i,i+4).readUInt32BE();
		} catch(error) {

		}

		let values = [ byte, byte2LE, byte2BE, byte4LE, byte4BE ];

		if( values.indexOf(628) > -1 ) {
			console.log(i, values);
		}

		if( values.indexOf(10) > -1 ) {
			console.log(i, values);
		}

		if( values.indexOf(23) > -1 ) {
			console.log(i, values);
		}
	}








}
main();