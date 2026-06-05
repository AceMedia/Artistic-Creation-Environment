import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const files = [
	'liquid-splash.html',
	'ascii-world.html',
	'fluid-simulation.js',
	'ascii-world.js',
	'frontend.js',
	'LDR_LLL1_0.png',
	'aurora-flow.js',
	'aurora-flow.html',
	'particle-constellation.js',
	'particle-constellation.html',
	'neon-topography.js',
	'neon-topography.html',
	'glass-caustics.js',
	'glass-caustics.html',
	'magnetic-dust.js',
	'magnetic-dust.html',
	'scramble-text.js',
	'magic-text.js',
	'ace-btn-effects.js',
	'liquid-glass.js',
	'liquidGL.vendor.js',
	'html2canvas.vendor.js',
];

await mkdir( 'build', { recursive: true } );

await Promise.all(
	files.map( async ( file ) => {
		const destination = join( 'build', file );
		await mkdir( dirname( destination ), { recursive: true } );
		await copyFile( join( 'src', file ), destination );
	} )
);

process.stdout.write( `Copied ${ files.length } effect assets into build/.\n` );
