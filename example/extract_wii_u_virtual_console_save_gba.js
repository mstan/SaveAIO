require('dotenv').config();
const SaveFileGameBoyAdvance = require('../lib/SaveFileGameBoyAdvance');

async function main() {
	let mmbn3vc = new SaveFileGameBoyAdvance('src/Gameboy Advance/Wii U Virtual Console/Megaman Battle Network 3 White/data_008_0000.bin','wii_u_virtual_console');
	await mmbn3vc.init(); // init should determine this is a VC title
	await mmbn3vc.exportToFile('output/Megaman Battle Network 3 White (GBA).sav');	
}
main();