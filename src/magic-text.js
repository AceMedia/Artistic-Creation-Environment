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
			// Aurora text fill
			'.ace-aurora-text{',
			'  background:',
			'    linear-gradient(120deg,transparent 25%,rgba(255,255,255,0.3) 50%,transparent 75%),',
			'    var(--ace-aurora-gradient,linear-gradient(90deg,#4ade80,#22d3ee,#34d399,#818cf8,#c084fc,#4ade80));',
			'  background-size:320% 100%,200% auto;',
			'  -webkit-background-clip:text;background-clip:text;',
			'  -webkit-text-fill-color:transparent;',
			'  animation:ace-magic-shimmer 4s ease-in-out infinite alternate;',
			'  display:inline;',
			'}',
			// Neon text fill
			'.ace-neon-text{',
			'  color:var(--ace-neon-color,#00f5ff);',
			'  -webkit-text-fill-color:var(--ace-neon-color,#00f5ff);',
			'  text-shadow:0 0 6px var(--ace-neon-color,#00f5ff),0 0 18px var(--ace-neon-color,#00f5ff),0 0 36px var(--ace-neon-color,#00f5ff);',
			'  display:inline;',
			'}',
			// Prism text fill
			'.ace-prism-text{',
			'  background:linear-gradient(90deg,#ff0080,#ff8c00,#ffe600,#00e5ff,#0070ff,#a550ff,#ff0080);',
			'  background-size:200% auto;',
			'  -webkit-background-clip:text;background-clip:text;',
			'  -webkit-text-fill-color:transparent;',
			'  animation:ace-prism-sweep 3s linear infinite;',
			'  display:inline;',
			'}',
			'@keyframes ace-prism-sweep{0%{background-position:0% center;}100%{background-position:200% center;}}',
			// Plasma text fill
			'.ace-plasma-text{',
			'  background:',
			'    linear-gradient(120deg,transparent 25%,rgba(255,255,255,0.2) 50%,transparent 75%),',
			'    linear-gradient(90deg,#7c3aed,#db2777,#a78bfa,#e879f9,#818cf8,#7c3aed);',
			'  background-size:320% 100%,200% auto;',
			'  -webkit-background-clip:text;background-clip:text;',
			'  -webkit-text-fill-color:transparent;',
			'  animation:ace-magic-shimmer 3.5s ease-in-out infinite alternate;',
			'  display:inline;',
			'}',
			// Inferno text fill
			'.ace-inferno-text{',
			'  background:',
			'    linear-gradient(120deg,transparent 25%,rgba(255,200,100,0.3) 50%,transparent 75%),',
			'    var(--ace-inferno-gradient,linear-gradient(90deg,#dc2626,#f97316,#fbbf24,#fef3c7,#ef4444,#dc2626));',
			'  background-size:320% 100%,200% auto;',
			'  -webkit-background-clip:text;background-clip:text;',
			'  -webkit-text-fill-color:transparent;',
			'  animation:ace-magic-shimmer 2.5s ease-in-out infinite alternate;',
			'  display:inline;',
			'}',
			'.ace-sparkle-layer{position:fixed;top:0;left:0;width:100%;height:100%;',
			'  pointer-events:none;overflow:visible;z-index:99999;}',
			'.ace-sparkle{position:absolute;pointer-events:none;',
			'  animation:ace-sparkle-out 0.65s ease-out forwards;}',
			'@keyframes ace-sparkle-out{',
			'  0%{opacity:1;transform:scale(1) rotate(0deg);}',
			'  100%{opacity:0;transform:scale(0.1) rotate(160deg);}',
			'}',
			// Aurora: elongated oval drifting upward
			'@keyframes ace-aurora-glow-out{',
			'  0%{opacity:0.85;transform:translateY(0) scaleX(1);}',
			'  100%{opacity:0;transform:translateY(-20px) scaleX(0.7);}',
			'}',
			// Neon: short arc flash
			'@keyframes ace-neon-arc-out{',
			'  0%{opacity:0;} 10%{opacity:1;} 100%{opacity:0;}',
			'}',
			// Prism: diamond shard spin-fade
			'@keyframes ace-prism-shard-out{',
			'  0%{opacity:0.9;transform:rotate(45deg) scale(1);}',
			'  100%{opacity:0;transform:rotate(145deg) scale(0.15);}',
			'}',
			// Plasma: orb pulse-fade
			'@keyframes ace-plasma-orb-out{',
			'  0%{opacity:0.8;transform:scale(0.5);}',
			'  30%{opacity:0.95;transform:scale(1.2);}',
			'  100%{opacity:0;transform:scale(0.3);}',
			'}',
			// Inferno: rising ember
			'@keyframes ace-ember-out{',
			'  0%{opacity:1;transform:translateY(0) scale(1);}',
			'  100%{opacity:0;transform:translateY(-16px) scale(0.25);}',
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

	var AURORA_TYPE_COLORS = {
		aurora:    [ '#4ade80', '#22d3ee', '#34d399', '#818cf8', '#c084fc', '#ffffff' ],
		sunset:    [ '#f97316', '#ec4899', '#f59e0b', '#ef4444', '#fb923c', '#ffffff' ],
		deepspace: [ '#8b5cf6', '#a855f7', '#6366f1', '#c084fc', '#4338ca', '#ffffff' ],
	};

	var INFERNO_TYPE_COLORS = {
		hot:  [ '#dc2626', '#f97316', '#fbbf24', '#fef3c7', '#ef4444', '#ffffff' ],
		warm: [ '#f97316', '#fb923c', '#fed7aa', '#fef3c7', '#fdba74', '#ffffff' ],
		cool: [ '#1d4ed8', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe', '#ffffff' ],
		dark: [ '#7f1d1d', '#991b1b', '#b45309', '#d97706', '#78350f', '#ffffff' ],
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

	// Extracts all colour stops from a CSS gradient string.
	// Handles rgb()/rgba() (WP theme presets) as well as #rrggbb and #rgb notation.
	function parseGradientColors( gradVal ) {
		var colors = [];
		var seen = {};
		function add( hex ) {
			var h = hex.toLowerCase();
			if ( ! seen[ h ] ) { seen[ h ] = true; colors.push( h ); }
		}
		// rgb()/rgba() — WP theme gradients always use this format
		var m, rgbRe = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
		while ( ( m = rgbRe.exec( gradVal ) ) !== null ) {
			add( '#' +
				( '0' + parseInt( m[ 1 ], 10 ).toString( 16 ) ).slice( -2 ) +
				( '0' + parseInt( m[ 2 ], 10 ).toString( 16 ) ).slice( -2 ) +
				( '0' + parseInt( m[ 3 ], 10 ).toString( 16 ) ).slice( -2 )
			);
		}
		// 6-digit hex (#rrggbb), not followed by more hex chars
		var hexRe = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
		while ( ( m = hexRe.exec( gradVal ) ) !== null ) { add( '#' + m[ 1 ].toLowerCase() ); }
		// 3-digit hex (#rgb → #rrggbb)
		var hex3Re = /#([0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
		while ( ( m = hex3Re.exec( gradVal ) ) !== null ) {
			var c = m[ 1 ];
			add( '#' + c[ 0 ] + c[ 0 ] + c[ 1 ] + c[ 1 ] + c[ 2 ] + c[ 2 ] );
		}
		return colors;
	}

	// Extract hex colours from the element's CSS variables / classes.
	// Result is cached on the element so getComputedStyle is only called once per element.
	function getElementColors( el ) {
		var isTextSpan = el.tagName && el.tagName.toLowerCase() === 'span';
		if ( ! isTextSpan && el._aceColors ) return el._aceColors;
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
			} else if ( type === 'aurora' ) {
				try {
					var auroraPalette = getComputedStyle( el ).getPropertyValue( '--ace-aurora-palette' ).trim() || 'aurora';
					colors = AURORA_TYPE_COLORS[ auroraPalette ] || AURORA_TYPE_COLORS.aurora;
				} catch ( e ) {
					colors = AURORA_TYPE_COLORS.aurora;
				}
			} else if ( type === 'inferno' ) {
				try {
					var infernoColorKey = getComputedStyle( el ).getPropertyValue( '--ace-inferno-color' ).trim() || 'hot';
					colors = INFERNO_TYPE_COLORS[ infernoColorKey ] || INFERNO_TYPE_COLORS.hot;
				} catch ( e ) {
					colors = INFERNO_TYPE_COLORS.hot;
				}
			} else {
				colors = TYPE_COLORS[ type ] || DEFAULT_COLORS;
			}
		} else {
			// Magic (text or button) — read --ace-magic-gradient
			// parseGradientColors handles rgb() (WP theme presets) as well as hex.
			try {
				var gradVal = getComputedStyle( el ).getPropertyValue( '--ace-magic-gradient' ).trim();
				if ( gradVal ) {
					colors = parseGradientColors( gradVal );
				}
			} catch ( e ) {}
			if ( colors.length < 2 ) colors = DEFAULT_COLORS.slice( 0, -1 );
			colors = colors.concat( [ '#ffffff' ] );
		}

		if ( ! isTextSpan ) el._aceColors = colors;
		return colors;
	}

	// ── Type-specific particle creators ──────────────────────────────────────

	function createAuroraGlow( x, y, colors ) {
		var w = 7 + Math.random() * 7;
		var h = w * ( 2.5 + Math.random() * 1.5 );
		var color = colors[ Math.floor( Math.random() * colors.length ) ];
		var ox = ( Math.random() - 0.5 ) * 30;
		var oy = ( Math.random() - 0.5 ) * 16;
		var el = document.createElement( 'div' );
		el.style.cssText =
			'position:absolute;pointer-events:none;' +
			'width:' + w + 'px;height:' + h + 'px;' +
			'left:' + ( x + ox - w / 2 ) + 'px;top:' + ( y + oy - h / 2 ) + 'px;' +
			'border-radius:50%;' +
			'background:radial-gradient(ellipse at center,' + color + ' 0%,transparent 72%);' +
			'animation:ace-aurora-glow-out 0.9s ease-out forwards;';
		getContainer().appendChild( el );
		setTimeout( function () { if ( el.parentNode ) el.parentNode.removeChild( el ); }, 1000 );
	}

	function createNeonArc( x, y, colors ) {
		var len = 10 + Math.random() * 16;
		var ang = Math.random() * 360;
		var color = colors[ Math.floor( Math.random() * colors.length ) ] || '#00f5ff';
		var el = document.createElement( 'div' );
		el.style.cssText =
			'position:absolute;pointer-events:none;' +
			'width:' + len + 'px;height:2px;' +
			'left:' + ( x - len / 2 ) + 'px;top:' + ( y - 1 ) + 'px;' +
			'background:' + color + ';border-radius:2px;' +
			'box-shadow:0 0 4px ' + color + ',0 0 8px ' + color + ';' +
			'transform-origin:center;transform:rotate(' + ang + 'deg);' +
			'animation:ace-neon-arc-out 0.45s ease-out forwards;';
		getContainer().appendChild( el );
		setTimeout( function () { if ( el.parentNode ) el.parentNode.removeChild( el ); }, 500 );
	}

	function createPrismShard( x, y, colors ) {
		var size = 8 + Math.random() * 8;
		var hue = Math.random() * 360;
		var ox = ( Math.random() - 0.5 ) * 28;
		var oy = ( Math.random() - 0.5 ) * 28;
		var el = document.createElement( 'div' );
		el.style.cssText =
			'position:absolute;pointer-events:none;' +
			'width:' + size + 'px;height:' + size + 'px;' +
			'left:' + ( x + ox - size / 2 ) + 'px;top:' + ( y + oy - size / 2 ) + 'px;' +
			'background:linear-gradient(135deg,' +
			'  hsl(' + hue + ',100%,68%),' +
			'  hsl(' + ( ( hue + 90 ) % 360 ) + ',100%,72%),' +
			'  hsl(' + ( ( hue + 180 ) % 360 ) + ',100%,68%));' +
			'animation:ace-prism-shard-out 0.7s ease-out forwards;';
		getContainer().appendChild( el );
		setTimeout( function () { if ( el.parentNode ) el.parentNode.removeChild( el ); }, 750 );
	}

	function createPlasmaOrb( x, y, colors ) {
		var size = 10 + Math.random() * 12;
		var color = colors[ Math.floor( Math.random() * colors.length ) ];
		var ox = ( Math.random() - 0.5 ) * 24;
		var oy = ( Math.random() - 0.5 ) * 24;
		var el = document.createElement( 'div' );
		el.style.cssText =
			'position:absolute;pointer-events:none;' +
			'width:' + size + 'px;height:' + size + 'px;' +
			'left:' + ( x + ox - size / 2 ) + 'px;top:' + ( y + oy - size / 2 ) + 'px;' +
			'border-radius:50%;' +
			'background:radial-gradient(circle,' + color + ' 0%,transparent 72%);' +
			'animation:ace-plasma-orb-out 0.6s ease-out forwards;';
		getContainer().appendChild( el );
		setTimeout( function () { if ( el.parentNode ) el.parentNode.removeChild( el ); }, 700 );
	}

	function createEmber( x, y, colors ) {
		var size = 4 + Math.random() * 4;
		var color = colors[ Math.floor( Math.random() * colors.length ) ];
		var ox = ( Math.random() - 0.5 ) * 20;
		var oy = ( Math.random() - 0.5 ) * 8;
		var el = document.createElement( 'div' );
		el.style.cssText =
			'position:absolute;pointer-events:none;' +
			'width:' + size + 'px;height:' + size + 'px;' +
			'left:' + ( x + ox - size / 2 ) + 'px;top:' + ( y + oy - size / 2 ) + 'px;' +
			'border-radius:50%;' +
			'background:' + color + ';' +
			'box-shadow:0 0 ' + ( size * 1.6 ) + 'px ' + color + ';' +
			'animation:ace-ember-out 0.55s ease-out forwards;';
		getContainer().appendChild( el );
		setTimeout( function () { if ( el.parentNode ) el.parentNode.removeChild( el ); }, 600 );
	}

	// Routes to the correct particle creator based on the element's artistic type.
	// Only magic (text or button-with-sparkles) gets star sparkles.
	function createTypeParticle( x, y, el ) {
		var type = getArtisticType( el );
		var colors = getElementColors( el );
		if ( ! type || type === 'magic' ) {
			createSparkle( x, y, colors );
		} else if ( type === 'aurora' ) {
			createAuroraGlow( x, y, colors );
		} else if ( type === 'neon' ) {
			createNeonArc( x, y, colors );
		} else if ( type === 'prism' ) {
			createPrismShard( x, y, colors );
		} else if ( type === 'plasma' ) {
			createPlasmaOrb( x, y, colors );
		} else if ( type === 'inferno' ) {
			createEmber( x, y, colors );
		}
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
			createTypeParticle( e.clientX, e.clientY, el );
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
			// Spawn 1–2 particles randomly distributed across elements
			var count = Math.random() > 0.55 ? 2 : 1;
			for ( var i = 0; i < count; i++ ) {
				var el = els[ Math.floor( Math.random() * els.length ) ];
				var rect = el.getBoundingClientRect();
				if ( rect.width < 1 || rect.height < 1 ) continue;
				var cx = rect.left + Math.random() * rect.width;
				var cy = rect.top + Math.random() * rect.height;
				// Buttons in this list always have .ace-artistic-btn--sparkles (magic only)
				if ( el.classList && el.classList.contains( 'ace-artistic-btn--sparkles' ) ) {
					createSparkle( cx, cy, getElementColors( el ) );
				} else {
					createTypeParticle( cx, cy, el );
				}
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
			} ).observe( document.body || document.documentElement, { childList: true, subtree: true } );
		}
	}

	if ( document.readyState === 'loading' || ! document.body ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();

