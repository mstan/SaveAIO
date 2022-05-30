require('dotenv').config();
const SaveFileGameBoyAdvance = require('./lib/SaveFileGameBoyAdvance');

/*
async function gba() {
	let mmbn3 = new SaveFileGameBoyAdvance('test/GameboyAdvance/Everdrive GB X5/megaman_battle_network_3_white.sav');
	await mmbn3.init();
	await mmbn3.expandSaveWhitespace(32768 * 2);
	await mmbn3.trimSaveWhitespace();
	await mmbn3.export('temp.sav');
}
gba();
*/

/*
async function gbaWiiUVC() {
	let mmbn3vc = new SaveFileGameBoyAdvance('test/GameboyAdvance/WiiUVC/megaman_battle_network_3_data_008_0000.bin','wii_u_virtual_console');
	await mmbn3vc.init(); // init should determine this is a VC title
	await mmbn3vc.export('mmbn3.sav');	
}
gbaWiiUVC();
*/

/*
async function gbaGameshark() {
	let mmbn3gs = new SaveFileGameBoyAdvance('test/GameboyAdvance/Gameshark/megaman_battle_network_3_blue.sps','gameshark');
	await mmbn3gs.init(); // init should determine this is a Gameshark title
}
gbaGameshark();
*/

async function gbaGamesharkSP() {
	let metroidgssp = new SaveFileGameBoyAdvance('test/GameboyAdvance/Gameshark SP/metroid_fusion.gsv');
	await metroidgssp.init();
	//await metroidgssp.trimBufferWhitespace();
	await metroidgssp.export('metroid_fusion.sav');
}
gbaGamesharkSP();