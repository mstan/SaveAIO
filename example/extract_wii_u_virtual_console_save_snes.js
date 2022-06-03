require('dotenv').config();
const SaveFileSuperNES = require('../lib/SaveFileSuperNES');
const SaveFileNintendo64 = require('../lib/SaveFileNintendo64');

async function main() {
	const superMarioWorld3DS = new SaveFileSuperNES('src/Super NES/3DS Virtual Console/Super Mario World/KTR-UAAE.ves');
	await superMarioWorld3DS.init();
	await superMarioWorld3DS.exportToFile('output/super_mario_world.srm');
}
main();
