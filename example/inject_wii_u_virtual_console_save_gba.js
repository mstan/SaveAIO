require('dotenv').config();
const SaveFileGameBoyAdvance = require('../lib/SaveFileGameBoyAdvance');

async function main() {
	const saveFilePathGBA = 'src/Gameboy Advance/Everdrive GBA X5/megaman_battle_network_3_white.sav';
	const megamanBattleNetwork3GBA = new SaveFileGameBoyAdvance(saveFilePathGBA,'system'); // import our GBA save to an instance
	await megamanBattleNetwork3GBA.init(); // initialize it
	// Export this as the buffer we want to inject
	// As an added benefit, we can reasonably assume the lenght of this buffer is going to be the length of the save file we're overridding
	// so we can pass its length as the argument for wiiUVirtualConsoleGameSaveSize
	const saveBufferToInject = await megamanBattleNetwork3GBA.exportToMemory(); // create an in-memory object to leverage later

	const saveFilePathWiiUVC = 'src/Gameboy Advance/WiiUVC/Megaman Battle Network 3 White/data_008_0000.bin';
	const megamanBattleNetwork3WiiUVC = new SaveFileGameBoyAdvance(saveFilePathWiiUVC,'wii_u_virtual_console', { wiiUVirtualConsoleGameSaveSize: saveBufferToInject.length }); // Import our Wii U virtual console into an instance
	await megamanBattleNetwork3WiiUVC.init(); // initialize it
	await megamanBattleNetwork3WiiUVC.injectWiiUVirtualConsoleSave(saveBufferToInject); // inject a memory buffer of our GBA save into the Virtual Console one
	
	const outputFilePathWiiUVC = 'output/Wii U/Virtual Console/Megaman Battle Network 3 White/data_008_000.bin';
	await megamanBattleNetwork3WiiUVC.exportWiiUVirtualConsoleSaveToDisk(outputFilePathWiiUVC); // write the file to disk to be used in a Wii U system.
}
main();


