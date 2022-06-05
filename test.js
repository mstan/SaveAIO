require('dotenv').config();
const SaveFileNES = require('./lib/SaveFileNES');


async function main() {
	const legendOfZelda = new SaveFileNES('src/NES/Wii/Legend of Zelda/the-legend-of-zelda.19461.bin');
	await legendOfZelda.init();
	await legendOfZelda.exportToFile('output/loz.sav');
}
main();
