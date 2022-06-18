const SaveFile = require('./lib/SaveFile.js');

/*
async function main() {
	let newGame1 = new SaveFile('./src/PSX/Legend of the Dragoon/new_game_timer_10_23.mcs');
	let newGame2 = new SaveFile('./src/PSX/Legend of the Dragoon/new_game_timer_11_29.mcs');
	await newGame1.init();
	await newGame2.init();
	let buffer = await newGame2.exportToMemory();
	let deltas = await newGame1.compareDelta(buffer,1);

	console.log(deltas);
}
main();
*/
const decoder = new TextDecoder('utf8');
async function main() {
	let newGame1 = new SaveFile('./src/PSX/Legend of the Dragoon/new_game_timer_10_23.mcs');
	await newGame1.init();
	const gold = newGame1._buffer.slice(660,664);
	const goldDisplay = newGame1._buffer.slice(412,416);

	const dartLevel = newGame1._buffer.slice(0x53E,0x53F);
	newGame1._buffer[0x53E] = 0xC3;
	console.log(dartLevel);
	await newGame1.exportToFile('./output/lotd_modified.mcs');

}
main();