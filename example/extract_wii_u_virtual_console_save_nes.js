require('dotenv').config();
const SaveFileNES = require('../lib/SaveFileNES');

async function main() {
	let lozWiiU = new SaveFileNES('src/NES/Wii U Virtual Console/Legend of Zelda/WUP-FBAE.ves','wii_u_virtual_console');
	await lozWiiU.init(); // init should determine this is a VC title
	await lozWiiU.exportToFile('output/Legend of Zelda.sav');	
}
main();