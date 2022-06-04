require('dotenv').config();
const SaveFileSuperNES = require('./lib/SaveFileSuperNES');
const SaveFileNintendo64 = require('./lib/SaveFileNintendo64');


async function main() {
	const superMario64DexDrive = new SaveFileNintendo64('src/Nintendo 64/DexDrive/Super Mario 64/super-mario-64.1091.n64');
	await superMario64DexDrive.init();
	await superMario64DexDrive.exportVariantsToDisk('output/super_mario_64.fla');
}
main();
