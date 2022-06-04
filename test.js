require('dotenv').config();
const SaveFilePSX = require('./lib/SaveFilePSX');


async function main() {
	const ff7DexDrive = new SaveFilePSX('src/Playstation/DexDrive/Final Fantasy VII/final-fantasy-vii.26303.gme');
	await ff7DexDrive.init();
	await ff7DexDrive.exportToFile('output/ffvii.gme');
}
main();
