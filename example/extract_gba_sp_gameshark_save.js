require('dotenv').config();
const SaveFileGameBoyAdvance = require('../lib/SaveFileGameBoyAdvance');

async function main() {
	let metroidgssp = new SaveFileGameBoyAdvance('src/Gameboy Advance/Gameshark SP/metroid_fusion.gsv');
	await metroidgssp.init();
	await metroidgssp.exportToFile('output/Metroid Fusion (GBA).sav');
}
main();

