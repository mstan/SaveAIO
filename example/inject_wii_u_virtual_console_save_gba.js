require('dotenv').config();
const SaveFileGameBoyAdvance = require('../lib/SaveFileGameBoyAdvance');

async function main() {
	const metroidFusionWiiU = new SaveFileGameBoyAdvance('src/Gameboy Advance/WiiU VC/Metroid Fusion/data_008_0000.bin',null,{ wiiUVirtualConsoleGameSaveSize: 32768 });
	await metroidFusionWiiU.init();

	const metroidFusionGBA = new SaveFileGameBoyAdvance('src/Gameboy Advance/Everdrive GBA X5/metroid_fusion.sav','system');
	await metroidFusionGBA.init();
	const saveBufferToInject = await metroidFusionGBA.exportToMemory();	
	
	await metroidFusionWiiU.injectWiiUVirtualConsoleSave(saveBufferToInject);
	await metroidFusionWiiU.exportWiiUVirtualConsoleSaveToDisk('output/data_008_000.bin');

}
main();
