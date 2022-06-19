const SaveFile = require('../lib/SaveFilePSXLegendOfTheDragoon.js');

async function main() {
	let newGame1 = new SaveFile('./src/PSX/Legend of the Dragoon/new_game_timer_10_23.mcs');
	let newGame2 = new SaveFile('./src/PSX/Legend of the Dragoon/new_game_timer_11_29.mcs');
	await newGame1.init();
	await newGame2.init();
	let buffer = await newGame2.exportToMemory();
	let deltas = await newGame1.compareDelta(buffer,4);
	// await newGame1.exportToFile('./output/dart-10.mcs');
	console.log(deltas);


	// some magic numbers. 
	// save 1 time is 623s
	// save 2 time is 689s
	for(let i = 0; i < deltas.length; i++ ) {
		let time1LE = deltas[i].original.readUInt32LE();
		let time2LE = deltas[i].new.readUInt32LE();
		let time1BE = deltas[i].original.readUInt32BE();
		let time2BE = deltas[i].new.readUInt32BE();

		console.log(time1LE, time2LE, time1BE, time2BE);
	}



}
main();