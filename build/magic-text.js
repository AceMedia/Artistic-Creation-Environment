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

	var TYPE_COLORS = {
		aurora:  [ '#4ade80', '#a78bfa', '#34d399', '#818cf8', '#c084fc', '#ffffff' ],
		neon:    null, // resolved at runtime from --ace-neon-color
		prism:   [ '#ff0080', '#ff8c00', '#ffe600', '#00e5ff', '#0070ff', '#a550ff', '#ffffff' ],
		plasma:  [ '#a78bfa', '#db2777', '#7c3aed', '#e879f9', '#818cf8', '#ffffff' ],
		inferno: [ '#dc2626', '#f97316', '#fbbf24', '#fef3c7', '#ef4444', '#ffffff' ],
	};

	// Maps text-format class names to their type keys.
	var TEXT_CLASS_TYPE_MAP = {
		'ace-aurora-text':  'aurora',
		'ace-neon-text':    'neon',
		'ace-prism-text':   'prism',
		'ace-plasma-text':  'plasma',
		'ace-inferno-text': 'inferno',
	};

	// Detect which artistic type applies to el (button or text span).
	function getArtisticType( el ) {
		var cls = el.className || '';
		// Button class pattern
		var match = cls.match( /\bace-artistic-btn--(\w+)\b/ );
		if ( match ) return match[ 1 ];
		// Text span class pattern
		for ( var textCls in TEXT_CLASS_TYPE_MAP ) {
			if ( el.classList && el.classList.contains( textCls ) ) {
				return TEXT_CLASS_TYPE_MAP[ textCls ];
			}
		}
		return null;
	}

	// Extract hex colours from the element's CSS variables / classes.
	// Result is cached on the element so getComputedStyle is only called once per element.
	function getElementColors( el ) {
		if ( el._aceColors ) return el._aceColors;
		var colors = [];
		var type = getArtisticType( el );

		if ( type && type !== 'magic' ) {
			if ( type === 'neon' ) {
				try {
					var neonColor = getComputedStyle( el ).getPropertyValue( '--ace-neon-color' ).trim();
					colors = neonColor ? [ neonColor, '#ffffff' ] : [ '#00f5ff', '#ffffff' ];
				} catch ( e ) {
					colors = [ '#00f5ff', '#ffffff' ];
				}
			} else {
				colors = TYPE_COLORS[ type ] || DEFAULT_COLORS;
			}
		} else {
			// Magic (text or button) — read --ace-magic-gradient
			try {
				var gradVal = getComputedStyle( el ).getPropertyValue( '--ace-magic-gradient' ).trim();
				if ( gradVal ) {
					var found = gradVal.match( /#[0-9a-fA-F]{6}/g );
					if ( found && found.length >= 2 ) colors = found;
				}
			} catch ( e ) {}
			if ( colors.length < 2 ) colors = DEFAULT_COLORS.slice( 0, -1 );
			colors = colors.concat( [ '#ffffff' ] );
		}

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

	var ARTISTIC_TEXT_SELECTOR = [
		'.ace-magic-text',
		'.ace-aurora-text',
		'.ace-neon-text',
		'.ace-prism-text',
		'.ace-plasma-text',
		'.ace-inferno-text',
	].join( ', ' );

	// Ambient sparkles: periodically spawn at random positions within every visible
	// artistic text span or .ace-artistic-btn--sparkles button, regardless of mouse position.
	function startAmbient() {
		if ( _ambientInterval ) return;
		_ambientInterval = setInterval( function () {
			var els = document.querySelectorAll( ARTISTIC_TEXT_SELECTOR + ', .ace-artistic-btn--sparkles' );
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
		// Bind mouse-move sparkles to all artistic text spans.
		( root || document ).querySelectorAll( ARTISTIC_TEXT_SELECTOR ).forEach( function ( el ) {
			if ( el._aceMagicBound ) return;
			el._aceMagicBound = true;
			el.addEventListener( 'mousemove', function ( e ) {
				onMouseMove( e, el );
			} );
		} );

		// Bind mouse-move sparkles to buttons with the sparkle option enabled.
		// Colors are read from the wrapper element which holds type-specific CSS vars.
		( root || document ).querySelectorAll( '.ace-artistic-btn--sparkles .wp-block-button__link' ).forEach( function ( link ) {
			if ( link._aceMagicBtnBound ) return;
			link._aceMagicBtnBound = true;
			var wrapper = link.closest( '.ace-artistic-btn--sparkles' );
			link.addEventListener( 'mousemove', function ( e ) {
				onMouseMove( e, wrapper || link );
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
						var isArtisticNode =
							node.classList.contains( 'ace-artistic-btn--sparkles' ) ||
							[ 'ace-magic-text', 'ace-aurora-text', 'ace-neon-text',
							  'ace-prism-text', 'ace-plasma-text', 'ace-inferno-text',
							].some( function ( c ) { return node.classList.contains( c ); } );
						if ( node.classList && isArtisticNode ) {
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

