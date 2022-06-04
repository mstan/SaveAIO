require('dotenv').config();
const SaveFileSuperNES = require('./lib/SaveFileSuperNES');
const SaveFileNintendo64 = require('./lib/SaveFileNintendo64');


async function main() {
	const superMarioWorld3DS = new SaveFileSuperNES('src/Super NES/3DS Virtual Console/Super Mario World/KTR-UAAE.ves');
	await superMarioWorld3DS.init();
	// await superMarioWorld3DS.exportToFile('output/super_mario_world.srm');
	const superMarioWorldSNES = new SaveFileSuperNES('src/Super NES/System/Super Mario World/Super Mario World.srm')
	await superMarioWorldSNES.init();
	const saveBufferToInject = await superMarioWorldSNES.exportToMemory();
	await superMarioWorld3DS.inject3DSVirtualConsoleSave(saveBufferToInject);
	await superMarioWorld3DS.export3DSVirtualConsoleSaveToDisk('output/KTR-UAAE.ves');
}
main();
