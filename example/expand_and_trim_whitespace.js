require('dotenv').config();
const SaveFileGameBoyAdvance = require('../lib/SaveFileGameBoyAdvance');

async function main() {
	let mmbn3 = new SaveFileGameBoyAdvance('src/Gameboy Advance/Everdrive GBA X5/megaman_battle_network_3_white.sav');
	await mmbn3.init();
	await mmbn3.setSaveFileSize(2 * 32768); // expand to 64 kb save
	await mmbn3.trimSaveWhitespace(); // reduce all excess whitespace on save file
	await mmbn3.exportToFile('output/Megaman Battle Network 3 White (GBA).sav');
}
main();

