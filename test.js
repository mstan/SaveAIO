const SaveFile = require('./lib/SaveFilePSXLegendOfTheDragoon.js');

async function main() {
	let lotd = new SaveFile('./output/dart-10.mcs');
	await lotd.init();

	/*
	console.log( await lotd._characters['DART'].test(48) );
	console.log( await lotd._characters['LAVITZ'].test(48) );
	console.log( await lotd._characters['SHANA'].test(48) );
	console.log( await lotd._characters['ROSE'].test(48) );
	console.log( await lotd._characters['HASCHEL'].test(48) );
	console.log( await lotd._characters['ALBERT'].test(48) );
	console.log( await lotd._characters['MERU'].test(48) );
	console.log( await lotd._characters['KONGOL'].test(48) );
	console.log( await lotd._characters['MIRANDA'].test(48) );

	*/

	await lotd._characters['DART'].setLevel(48);
	await lotd._characters['LAVITZ'].setLevel(48);
	await lotd._characters['SHANA'].setLevel(48);
	await lotd._characters['ROSE'].setLevel(48);
	await lotd._characters['HASCHEL'].setLevel(48);
	await lotd._characters['ALBERT'].setLevel(48);
	await lotd._characters['MERU'].setLevel(48);
	await lotd._characters['KONGOL'].setLevel(48);
	await lotd._characters['MIRANDA'].setLevel(48);

	await lotd.setPartyMember(2,"empty");
	await lotd.setPartyMember(3,"empty");

	for(let i = 0; i < lotd._buffer.length; i++ ) {
		if( parseInt(lotd._buffer[i], 10) == 31 ) {
			lotd._buffer[i] = parseInt(58, 16);
		}		
	}

	await lotd.exportToFile('./output/lotd-all-level-48-time.mcs');
}
main();
