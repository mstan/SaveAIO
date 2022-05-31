require('dotenv').config();
const SaveFileGameBoyAdvance = require('./lib/SaveFileGameBoyAdvance');
const SaveFileNintendo64 = require('./lib/SaveFileNintendo64');

/*
async function gba() {
	let mmbn3 = new SaveFileGameBoyAdvance('test/Gameboy Advance/Everdrive GB X5/megaman_battle_network_3_white.sav');
	await mmbn3.init();
	await mmbn3.calculateEndian();
	await mmbn3.swapEndian();
	await mmbn3.calculateEndian();
	//await mmbn3.expandSaveWhitespace();
	//await mmbn3.trimSaveWhitespace();
	//await mmbn3.export('temp.sav');
}
gba();
*/


/*
async function gbaWiiUVC() {
	let mmbn3vc = new SaveFileGameBoyAdvance('test/Gameboy Advance/WiiUVC/megaman_battle_network_3_data_008_0000.bin','wii_u_virtual_console');
	await mmbn3vc.init(); // init should determine this is a VC title
	await mmbn3vc.export('mmbn3.sav');	
}
gbaWiiUVC();
*/

/*
async function gbaGameshark() {
	let mmbn3gs = new SaveFileGameBoyAdvance('test/Gameboy Advance/Gameshark/megaman_battle_network_3_blue.sps','gameshark');
	await mmbn3gs.init(); // init should determine this is a Gameshark title
}
gbaGameshark();
*/

/*
async function gbaGamesharkSP() {
	let metroidgssp = new SaveFileGameBoyAdvance('test/Gameboy Advance/Gameshark SP/metroid_fusion.gsv');
	await metroidgssp.init();
	//await metroidgssp.trimSaveWhitespace();
	await metroidgssp.export('metroid_fusion.sav');
}
gbaGamesharkSP();
*/

async function n64() {
	let pokemonStadium2 = new SaveFileNintendo64('test/Nintendo 64/Evedrive X7/Pokemon Stadium 2 (USA).fla');
	await pokemonStadium2.init();
	await pokemonStadium2.swapEndian();
	await pokemonStadium2.swapWords();
	await pokemonStadium2.export('POKEMON STADIUM 2.fla');
}
n64()