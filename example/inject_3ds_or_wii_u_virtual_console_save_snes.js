// TODO: Validate why save doesn't work.
require('dotenv').config();
const SaveFileSuperNES = require('../lib/SaveFileSuperNES');

async function main() {
	const superMarioWorld3DS = new SaveFileSuperNES('src/Super NES/3DS Virtual Console/Super Mario World/KTR-UAAE.ves');
	// Though not _technically_ 3DS, a Wii U SNES save is the exact same, and can be substituted in.
	//const superMarioWorld3DS = new SaveFileSuperNES('src/Super NES/Wii U Virtual Console/Super Mario World/WUP-JAAE.ves');
	await superMarioWorld3DS.init();
	// await superMarioWorld3DS.exportToFile('output/super_mario_world.srm');
	const superMarioWorldSNES = new SaveFileSuperNES('src/Super NES/System/Super Mario World/Super Mario World.srm')
	await superMarioWorldSNES.init();
	const saveBufferToInject = await superMarioWorldSNES.exportToMemory();
	await superMarioWorld3DS.injectSave(saveBufferToInject);
	await superMarioWorld3DS.export3DSVirtualConsoleSaveToDisk('output/KTR-UAAE.ves');
}
main();