require('dotenv').config();
const SaveFileNintendo64 = require('../lib/SaveFileNintendo64');

async function main() {
	let pokemonStadium2 = new SaveFileNintendo64('src/Nintendo 64/Evedrive X7/Pokemon Stadium 2 (USA).fla');
	await pokemonStadium2.init();
	await pokemonStadium2.swapEndian();
	await pokemonStadium2.swapWords();
	await pokemonStadium2.exportToFile('output/Pokemon Stadium 2 (N64, Project 64).fla');
}
main();