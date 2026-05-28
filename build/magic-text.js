( function () {
	'use strict';

	// Guard against duplicate initialisation (e.g. script enqueued twice).
	if ( window._aceMagicTextInit ) return;
	window._aceMagicTextInit = true;

	var DEFAULT_COLORS = [ '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#a78bfa', '#ffffff' ];
	var SPARKLE_PATH = 'M0,-10 L2.2,-2.2 L10,0 L2.2,2.2 L0,10 L-2.2,2.2 L-10,0 L-2.2,-2.2 Z';
	var container;
	var _ambientInterval = null;

	function injectStyles() {
		if ( document.getElementById( 'ace-magic-text-styles' ) ) return;
		var style = document.createElement( 'style' );
		style.id = 'ace-magic-text-styles';
		style.textContent = [
			'.ace-magic-text{',
			'  background:',
			'    linear-gradient(120deg,transparent 25%,rgba(255,255,255,0.42) 50%,transparent 75%),',
			'    var(--ace-magic-gradient,linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#a78bfa,#ff6b6b));',
			'  background-size:320% 100%,200% auto;',
			'  -webkit-background-clip:text;',
			'  background-clip:text;',
			'  -webkit-text-fill-color:transparent;',
			'  text-shadow:0 6px 20px rgba(160,160,160,0.26);',
			'  animation:ace-magic-shimmer 3s ease-in-out infinite alternate;',
			'  display:inline;',
			'}',
			'@keyframes ace-magic-shimmer{',
			'  0%{background-position:-70% center,0% center;}',
			'  100%{background-position:170% center,100% center;}',
			'}',
			'.ace-sparkle-layer{position:fixed;top:0;left:0;width:100%;height:100%;',
			'  pointer-events:none;overflow:visible;z-index:99999;}',
			'.ace-sparkle{position:absolute;pointer-events:none;',
			'  animation:ace-sparkle-out 0.65s ease-out forwards;}',
			'@keyframes ace-sparkle-out{',
			'  0%{opacity:1;transform:scale(1) rotate(0deg);}',
			'  100%{opacity:0;transform:scale(0.1) rotate(160deg);}',
			'}',
		].join( '' );
		document.head.appendChild( style );
	}

	function getContainer() {
		if ( ! container || ! container.isConnected ) {
			container = document.createElement( 'div' );
			container.className = 'ace-sparkle-layer';
			document.body.appendChild( container );
		}
		return container;
	}

	// Extract hex colours from the element's --ace-magic-gradient custom property.
	// Result is cached on the element so getComputedStyle is only called once per span.
	function getElementColors( el ) {
		if ( el._aceColors ) return el._aceColors;
		var colors = [];
		try {
			var gradVal = getComputedStyle( el ).getPropertyValue( '--ace-magic-gradient' ).trim();
			if ( gradVal ) {
				var found = gradVal.match( /#[0-9a-fA-F]{6}/g );
				if ( found && found.length >= 2 ) colors = found;
			}
		} catch ( e ) {}
		if ( colors.length < 2 ) colors = DEFAULT_COLORS.slice( 0, -1 );
		colors = colors.concat( [ '#ffffff' ] ); // always include white
		el._aceColors = colors;
		return colors;
	}

	function createSparkle( x, y, colors ) {
		// Non-uniform size: skewed toward mid-range with occasional large stars
		var size = 12 + Math.pow( Math.random(), 0.65 ) * 24; // ~12–36 px
		var colList = colors || DEFAULT_COLORS;
		var color = colList[ Math.floor( Math.random() * colList.length ) ];
		var offsetX = ( Math.random() - 0.5 ) * 32;
		var offsetY = ( Math.random() - 0.5 ) * 32;

		var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		svg.setAttribute( 'class', 'ace-sparkle' );
		svg.setAttribute( 'viewBox', '-12 -12 24 24' );
		svg.style.cssText =
			'width:' + size + 'px;' +
			'height:' + size + 'px;' +
			'left:' + ( x + offsetX - size / 2 ) + 'px;' +
			'top:' + ( y + offsetY - size / 2 ) + 'px;' +
			'filter:drop-shadow(0 0 5px ' + color + ');';

		var path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
		path.setAttribute( 'd', SPARKLE_PATH );
		path.setAttribute( 'fill', color );
		svg.appendChild( path );

		getContainer().appendChild( svg );
		setTimeout( function () { svg.remove(); }, 700 );
	}

	var _throttle = null;

	function onMouseMove( e, el ) {
		if ( _throttle ) return;
		_throttle = setTimeout( function () { _throttle = null; }, 35 );
		if ( Math.random() > 0.4 ) {
			createSparkle( e.clientX, e.clientY, getElementColors( el ) );
		}
	}

	// Ambient sparkles: periodically spawn at random positions within every visible
	// .ace-magic-text element, regardless of mouse position.
	function startAmbient() {
		if ( _ambientInterval ) return;
		_ambientInterval = setInterval( function () {
			var els = document.querySelectorAll( '.ace-magic-text' );
			if ( ! els.length ) {
				clearInterval( _ambientInterval );
				_ambientInterval = null;
				return;
			}
			// Spawn 1–2 sparkles randomly distributed across elements
			var count = Math.random() > 0.55 ? 2 : 1;
			for ( var i = 0; i < count; i++ ) {
				var el = els[ Math.floor( Math.random() * els.length ) ];
				var rect = el.getBoundingClientRect();
				if ( rect.width < 1 || rect.height < 1 ) continue;
				createSparkle(
					rect.left + Math.random() * rect.width,
					rect.top + Math.random() * rect.height,
					getElementColors( el )
				);
			}
		}, 220 );
	}

	function attachListeners( root ) {
		( root || document ).querySelectorAll( '.ace-magic-text' ).forEach( function ( el ) {
			if ( el._aceMagicBound ) return;
			el._aceMagicBound = true;
			el.addEventListener( 'mousemove', function ( e ) {
				onMouseMove( e, el );
			} );
		} );
	}

	function init() {
		injectStyles();
		attachListeners();
		startAmbient();

		if ( window.MutationObserver ) {
			new MutationObserver( function ( mutations ) {
				mutations.forEach( function ( m ) {
					m.addedNodes.forEach( function ( node ) {
						if ( node.nodeType !== 1 ) return;
						if ( node.classList && node.classList.contains( 'ace-magic-text' ) ) {
							attachListeners( node.parentElement );
						} else if ( node.querySelectorAll ) {
							attachListeners( node );
						}
						startAmbient();
					} );
				} );
			} ).observe( document.body, { childList: true, subtree: true } );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();

