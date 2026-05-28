( function () {
	'use strict';

	var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var LOWER = 'abcdefghijklmnopqrstuvwxyz';
	var INTERVAL_MS = 30;
	var REVEAL_RATE = 1 / 3;

	function scramble( el ) {
		var original = el.dataset.aceOriginal;

		if ( ! original ) {
			original = el.textContent;
			el.dataset.aceOriginal = original;
		}

		var iteration = 0;
		clearInterval( el._aceScrambleTimer );

		el._aceScrambleTimer = setInterval( function () {
			el.textContent = original
				.split( '' )
				.map( function ( char, idx ) {
					if ( char === ' ' ) return ' ';
					if ( idx < iteration ) return original[ idx ];
					if ( char >= 'a' && char <= 'z' ) {
						return LOWER[ Math.floor( Math.random() * LOWER.length ) ];
					}
					if ( char >= 'A' && char <= 'Z' ) {
						return UPPER[ Math.floor( Math.random() * UPPER.length ) ];
					}
					return char;
				} )
				.join( '' );

			iteration += REVEAL_RATE;

			if ( iteration >= original.length ) {
				clearInterval( el._aceScrambleTimer );
				el.textContent = original;
			}
		}, INTERVAL_MS );
	}

	function init() {
		document.querySelectorAll( '.ace-scramble-text' ).forEach( function ( el ) {
			el.style.cursor = 'default';
			el.addEventListener( 'mouseenter', function () {
				scramble( el );
			} );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
