require('dotenv').config();
const SaveFileGameBoyAdvance = require('./lib/SaveFileGameBoyAdvance');

async function main() {
	/*
	// let mmbn3 = new SaveFileGameBoyAdvance('test/GameboyAdvance/mmbn3.sav');
	await mmbn3.init();
	await mmbn3.expandBufferWhitespace(32768 * 2);
	//await mmbn3.trimBufferWhitespace();
	await mmbn3.export('temp.sav');
	*/

	let mmbn3vc = new SaveFileGameBoyAdvance('test/GameboyAdvance/WiiUVC/data_008_0000.bin','wii_u_virtual_console');
	await mmbn3vc.init(); // init should determine this is a VC title
	await mmbn3vc.export('mmbn3.sav');
}
main();