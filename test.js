require('dotenv').config();
const SaveFileGameBoyAdvance = require('./lib/SaveFileGameBoyAdvance');
const SaveFileNintendo64 = require('./lib/SaveFileNintendo64');

async function main() {
	const megamanBattleNetwork3GBA = new SaveFileGameBoyAdvance('src/Gameboy Advance/Everdrive GBA X5/megaman_battle_network_3_white.sav','system'); // import our GBA save to an instance
	await megamanBattleNetwork3GBA.init(); // initialize it
	/*
	const megamanBattleNetwork3WiiUVC = new SaveFileGameBoyAdvance('src/Gameboy Advance/WiiUVC/Megaman Battle Network 3 White/data_008_0000.bin'); // Import our Wii U virtual console into an instance
	await megamanBattleNetwork3WiiUVC.init(); // initialize it
	const saveBufferToInject = await megamanBattleNetwork3GBA.exportToMemory();
	await megamanBattleNetwork3WiiUVC.injectWiiUVirtualConsoleSave(saveBufferToInject); // inject a memory buffer of our GBA save into the Virtual Console one
	await megamanBattleNetwork3WiiUVC.exportWiiUVirtualConsoleSaveToDisk('output/Wii U/Virtual Console/Megaman Battle Network 3 White/data_008_000.bin');
	*/
}
main();


