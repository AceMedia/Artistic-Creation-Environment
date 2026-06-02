// src/liquid-glass.js — ACE glass effects frontend init (CSS backdrop-filter).
// CSS custom properties are baked into each element's style attribute on save
// by the editor (index.js). This script injects the CSS rules that consume
// those vars, and sets them as a JS fallback for any blocks saved before the
// CSS-vars approach was introduced.
( function () {
	'use strict';

	if ( window._aceLiquidGlassLoaded ) { return; }
	window._aceLiquidGlassLoaded = true;

	// Raw preset values — must mirror GLASS_PRESET_VALUES in index.js.
	var PRESETS = {
		'default': { refraction: 0,     bevelDepth: 0.052, bevelWidth: 0.211, frost: 2,   shadow: true,  specular: true  },
		'alien'  : { refraction: 0.073, bevelDepth: 0.2,   bevelWidth: 0.156, frost: 2,   shadow: true,  specular: false },
		'pulse'  : { refraction: 0.03,  bevelDepth: 0,     bevelWidth: 0.273, frost: 0,   shadow: false, specular: false },
		'frost'  : { refraction: 0,     bevelDepth: 0.035, bevelWidth: 0.119, frost: 0.9, shadow: true,  specular: true  },
		'edge'   : { refraction: 0.047, bevelDepth: 0.136, bevelWidth: 0.076, frost: 2,   shadow: true,  specular: false },
		'demo-nav' : { refraction: 0,     bevelDepth: 0.052, bevelWidth: 0.211, frost: 2,   shadow: true,  specular: true  },
		'demo-card': { refraction: 0,     bevelDepth: 0.1,   bevelWidth: 0.17,  frost: 2,   shadow: true,  specular: true  },
		'crystal'  : { refraction: 0.026, bevelDepth: 0.119, bevelWidth: 0.057, frost: 0,   shadow: true,  specular: true  },
		'morph'    : { refraction: 0,     bevelDepth: 0.052, bevelWidth: 0.211, frost: 7,   shadow: false, specular: true  },
		'custom' : { refraction: 0,     bevelDepth: 0.052, bevelWidth: 0.211, frost: 2,   shadow: true,  specular: true  },
	};

	// Reads liquidGL options from an element's data-ace-lg-* attributes.
	// Falls back to the preset's raw values when an attribute is absent.
	var _lgIdCounter = 0;
	var _mutationObserver = null;
	var _initScheduled = false;
	var _refreshScheduled = false;
	var _refreshBound = false;
	var GLASS_ATTRS = [
		'data-ace-lg-preset',
		'data-ace-lg-refraction',
		'data-ace-lg-bevel-depth',
		'data-ace-lg-bevel-width',
		'data-ace-lg-frost',
		'data-ace-lg-shadow',
		'data-ace-lg-specular',
		'data-ace-lg-tilt',
		'data-ace-lg-tilt-factor',
		'data-ace-lg-magnify',
		'data-ace-lg-reveal',
		'data-ace-lg-resolution',
		'data-ace-glass-tint',
		'data-ace-glass-tint-opacity',
		'data-ace-liquid-glass',
		'data-ace-sticky-glass',
	];
	function readLGOptions( el ) {
		var preset = PRESETS[ el.dataset.aceLgPreset ] || PRESETS['default'];
		function num( val, fallback ) { return ( val !== undefined && val !== '' ) ? parseFloat( val ) : fallback; }
		return {
			refraction: num( el.dataset.aceLgRefraction,  preset.refraction ),
			bevelDepth: num( el.dataset.aceLgBevelDepth,  preset.bevelDepth ),
			bevelWidth: num( el.dataset.aceLgBevelWidth,  preset.bevelWidth !== undefined ? preset.bevelWidth : 0.211 ),
			frost:      num( el.dataset.aceLgFrost,       preset.frost ),
			specular:   el.dataset.aceLgSpecular !== 'false',
			shadow:     el.dataset.aceLgShadow   !== 'false',
			tilt:       el.dataset.aceLgTilt === 'true',
			tiltFactor:  num( el.dataset.aceLgTiltFactor,  5 ),
			magnify:     num( el.dataset.aceLgMagnify,     1 ),
			reveal:      el.dataset.aceLgReveal === 'fade' ? 'fade' : 'none',
			resolution:  num( el.dataset.aceLgResolution,  2.0 ),
		};
	}

	// Attempt WebGL glass rendering via the liquidGL library for a single element.
	// When WebGL is available, liquidGL places a fixed-position canvas clipped to
	// the element's bounds — we then suppress the CSS backdrop-filter on that element
	// so the two glass layers don't stack and double-blur.
	// Silently falls back to CSS if liquidGL is absent or WebGL is unavailable.
	function getEffectiveZ( el ) {
		var node = el;
		while ( node && node !== document.body ) {
			var style = window.getComputedStyle( node );
			if ( style.position !== 'static' && style.zIndex !== 'auto' ) {
				var z = parseInt( style.zIndex, 10 );
				if ( ! isNaN( z ) ) { return z; }
			}
			node = node.parentElement;
		}
		return 0;
	}

	function ensureLiquidGLStacking( el ) {
		if ( window.getComputedStyle( el ).position === 'static' ) {
			el.style.position = 'relative';
		}
		var ownZ = parseInt( window.getComputedStyle( el ).zIndex, 10 );
		if ( isNaN( ownZ ) || ownZ < 3001 ) {
			el.style.zIndex = '3001';
		}
		var node = el.parentElement;
		while ( node && node !== document.body ) {
			var style = window.getComputedStyle( node );
			var z     = parseInt( style.zIndex, 10 );
			var createsStack = ( style.position !== 'static' && style.zIndex !== 'auto' ) ||
				style.transform !== 'none' ||
				style.filter !== 'none' ||
				parseFloat( style.opacity ) < 1 ||
				style.isolation === 'isolate';
			if ( createsStack && ( isNaN( z ) || z < 3001 ) ) {
				if ( style.position === 'static' ) {
					node.style.position = 'relative';
				}
				node.style.zIndex = '3001';
				node.classList.add( 'ace-liquidgl-stack' );
			}
			node = node.parentElement;
		}
	}

	function warnLiquidGLError( message, error ) {
		if ( window.console && typeof window.console.warn === 'function' ) {
			window.console.warn( message, error );
		}
	}

	function getFirstLens( glassEffect ) {
		return Array.isArray( glassEffect ) ? glassEffect[0] : glassEffect;
	}

	function isLiquidGLLens( lens, el ) {
		return !! ( lens && lens.renderer && lens.options && lens.el === el );
	}

	function activateWebGLLens( lens, el, owner ) {
		if ( ! isLiquidGLLens( lens, el ) ) { return false; }
		el.__aceLiquidGLLens = lens;
		el.classList.add( 'ace-liquidgl-target' );
		( owner || el ).classList.add( 'ace-liquidgl-webgl' );
		return true;
	}

	function refreshExistingLens( el, opts, owner ) {
		var lens = el.__aceLiquidGLLens;
		if ( ! isLiquidGLLens( lens, el ) ) { return false; }
		var previousShadow = lens.options.shadow;
		var previousTilt = lens.options.tilt;
		Object.keys( opts ).forEach( function ( key ) {
			lens.options[ key ] = opts[ key ];
		} );
		if ( previousShadow !== opts.shadow && typeof lens.setShadow === 'function' ) {
			lens.setShadow( opts.shadow );
		}
		if ( previousTilt !== opts.tilt && typeof lens.setTilt === 'function' ) {
			lens.setTilt( opts.tilt );
		}
		if ( typeof lens.updateMetrics === 'function' ) {
			lens.updateMetrics();
		}
		if ( lens.renderer && typeof lens.renderer.render === 'function' ) {
			lens.renderer.render();
		}
		if ( lens.renderer && typeof lens.renderer.captureSnapshot === 'function' ) {
			lens.renderer.captureSnapshot();
		}
		if ( lens._initCalled ) {
			activateWebGLLens( lens, el, owner );
		}
		return true;
	}

	function callLiquidGL( el, opts, owner ) {
		if ( typeof window.liquidGL !== 'function' ) { return false; }
		el.classList.add( 'liquidGL' );
		if ( ! el.id ) {
			el.id = 'ace-gl-' + ( ++_lgIdCounter );
		}
		ensureLiquidGLStacking( el );
		if ( refreshExistingLens( el, opts, owner ) ) {
			return true;
		}
		var glassEffect = null;
		var originalInit = opts.on && opts.on.init;
		var liquidOpts = Object.assign( {}, opts, {
			on: Object.assign( {}, opts.on || {}, {
				init: function ( instance ) {
					activateWebGLLens( instance, el, owner );
					if ( typeof originalInit === 'function' ) {
						originalInit( instance );
					}
				},
			} ),
		} );
		try {
			glassEffect = window.liquidGL( Object.assign( { target: '#' + el.id, snapshot: 'body' }, liquidOpts ) );
		} catch ( e ) {
			warnLiquidGLError( 'ACE liquidGL: WebGL initialisation failed; CSS glass fallback remains active.', e );
		}

		// The liquidGL Lens constructor ALWAYS sets these inline styles synchronously:
		//   el.style.opacity        = 0         (hides the element entirely)
		//   el.style.backdropFilter = "none"    (kills the CSS glass fallback)
		//   el.style.pointerEvents  = "none"    (blocks all clicks — never restored)
		// We undo them unconditionally so elements are always visible and interactive.
		//
		// EXTRA HAZARD — fade-reveal cross-element trampling:
		// When ANY glass element uses reveal:'fade', liquidGL's animate loop iterates
		// ALL renderer lenses and resets their opacity to 0 at frame 0.  This makes
		// every other non-fade glass element vanish for 1 second.
		// Fix: add class 'ace-gl-opaque' (opacity:1 !important) for 2.5 s so the
		// !important rule wins over liquidGL's inline assignment during the animation.
		if ( opts.reveal !== 'fade' ) {
			el.style.removeProperty( 'opacity' );
			el.classList.add( 'ace-gl-opaque' );
			setTimeout( function () { el.classList.remove( 'ace-gl-opaque' ); }, 2500 );
		}
		el.style.removeProperty( 'backdrop-filter' );
		el.style.removeProperty( '-webkit-backdrop-filter' );
		el.style.removeProperty( 'pointer-events' );
		var lens = getFirstLens( glassEffect );
		if ( isLiquidGLLens( lens, el ) ) {
			el.__aceLiquidGLLens = lens;
			return true;
		}
		return false;
	}

	function normalizeGlassTarget( target ) {
		if ( window.getComputedStyle( target ).position === 'static' ) {
			target.style.position = 'relative';
		}
		target.classList.add( 'liquidGL', 'ace-liquid-glass-wrap' );
		target.setAttribute( 'data-ace-liquid-glass-wrap', 'true' );
		Array.prototype.forEach.call( target.children || [], function ( child ) {
			if ( child.classList ) {
				child.classList.add( 'ace-liquid-glass-content' );
			}
		} );
		return target;
	}

	function syncTargetShapeFromContent( target, content ) {
		if ( ! target || ! content ) { return; }
		var contentStyle = window.getComputedStyle( content );
		var targetStyle  = window.getComputedStyle( target );
		[
			'border-top-left-radius',
			'border-top-right-radius',
			'border-bottom-right-radius',
			'border-bottom-left-radius',
		].forEach( function ( property ) {
			var current = targetStyle.getPropertyValue( property );
			var next    = contentStyle.getPropertyValue( property );
			if ( ( ! current || current === '0px' ) && next && next !== '0px' ) {
				target.style.setProperty( property, next );
			}
		} );
		if ( ! target.style.overflow ) {
			target.style.overflow = 'visible';
		}
	}

	function refreshLiquidGLLenses() {
		var renderer = window.__liquidGLRenderer__;
		if ( ! renderer || ! Array.isArray( renderer.lenses ) ) { return; }
		renderer.lenses.forEach( function ( lens ) {
			if ( ! lens || ! lens.el || ! lens.el.getAttribute || lens.el.getAttribute( 'data-ace-liquid-glass-wrap' ) !== 'true' ) {
				return;
			}
			lens._baseRect = null;
			if ( typeof lens.updateMetrics === 'function' ) {
				lens.updateMetrics();
			}
			if ( typeof lens._shadowSyncFn === 'function' ) {
				lens._shadowSyncFn();
			}
			if ( lens._mirrorActive && typeof lens._mirrorClipUpdater === 'function' ) {
				lens._mirrorClipUpdater();
			}
		} );
		if ( typeof renderer.render === 'function' ) {
			renderer.render();
		}
	}

	function scheduleLensRefresh() {
		if ( _refreshScheduled ) { return; }
		_refreshScheduled = true;
		window.requestAnimationFrame( function () {
			_refreshScheduled = false;
			refreshLiquidGLLenses();
		} );
	}

	function bindLensRefresh() {
		if ( _refreshBound ) { return; }
		_refreshBound = true;
		window.addEventListener( 'scroll', scheduleLensRefresh, { passive: true } );
		window.addEventListener( 'resize', scheduleLensRefresh, { passive: true } );
		if ( window.visualViewport ) {
			window.visualViewport.addEventListener( 'scroll', scheduleLensRefresh, { passive: true } );
			window.visualViewport.addEventListener( 'resize', scheduleLensRefresh, { passive: true } );
		}
	}

	// Convert raw preset values to CSS custom property string/values.
	function presetToCSSVars( p ) {
		var blur    = Math.round( p.frost * 8 );
		var sat     = Math.round( 150 + p.refraction * 600 );
		var bright  = p.specular ? 1.2 : 1.08;
		var tintA   = ( 0.06 + p.refraction * 0.5 ).toFixed( 2 );
		var borderA = ( 0.18 + p.bevelDepth ).toFixed( 2 );
		var shadow  = p.shadow
			? '0 6px 28px rgba(0,0,0,0.14)' + ( p.specular ? ', inset 0 1px 0 rgba(255,255,255,0.5)' : '' )
			: 'none';
		return {
			'--ace-glass-blur'      : blur + 'px',
			'--ace-glass-saturate'  : sat + '%',
			'--ace-glass-brightness': String( bright ),
			'--ace-glass-tint'      : 'rgba(255,255,255,' + tintA + ')',
			'--ace-glass-shadow'    : shadow,
			'--ace-glass-border'    : 'rgba(255,255,255,' + borderA + ')',
		};
	}

	// Set CSS vars on an element from a named preset — used as a fallback for
	// older saved blocks that don't have CSS vars baked into their style attribute.
	function setCSSVarsFromPreset( el, presetName ) {
		var p    = PRESETS[ presetName ] || PRESETS['default'];
		var vars = presetToCSSVars( p );
		Object.keys( vars ).forEach( function ( key ) {
			el.style.setProperty( key, vars[ key ] );
		} );
	}

	// Reads tint data attributes from an element and applies them as CSS vars.
	// data-ace-glass-tint        — colour value (hex / rgb / var(--wp--...))
	// data-ace-glass-tint-opacity — 0-100 integer; becomes the CSS percentage
	//
	// Strategy: compute the actual rgba() value via a temporary DOM element so
	// that any CSS color (including theme palette CSS vars) resolves correctly.
	// We then override --ace-glass-tint to that rgba, which is used universally
	// by the glass CSS rules.  No color-mix() support required.
	function applyTintFromDataAttrs( el ) {
		var tint    = el.dataset.aceGlassTint;
		var opacity = parseInt( el.dataset.aceGlassTintOpacity, 10 );
		if ( isNaN( opacity ) ) { opacity = 15; }

		if ( ! tint ) { return; }

		// Set the vars used by the @supports color-mix() path in the CSS.
		el.style.setProperty( '--ace-glass-tint-color',  tint );
		el.style.setProperty( '--ace-glass-tint-amount', opacity + '%' );

		// Also compute and set --ace-glass-tint as a plain rgba() so the
		// background rule works on every browser without color-mix() support.
		var alpha = ( opacity / 100 ).toFixed( 2 );
		var rgba  = resolveColorToRGBA( tint, alpha );
		if ( rgba ) {
			el.style.setProperty( '--ace-glass-tint', rgba );
		}
	}

	// Resolves any CSS colour value (hex, rgb, named, or CSS custom property
	// reference) to an rgba() string by briefly appending a hidden element to
	// the live document so that CSS variables resolve in the correct context.
	function resolveColorToRGBA( color, alpha ) {
		try {
			var tmp = document.createElement( 'div' );
			tmp.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;';
			document.body.appendChild( tmp );
			tmp.style.setProperty( 'background-color', color );
			var bg = window.getComputedStyle( tmp ).backgroundColor;
			document.body.removeChild( tmp );
			// getComputedStyle returns rgb(...) or rgba(...)
			var m = bg.match( /[\d.]+/g );
			if ( m && m.length >= 3 ) {
				return 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + alpha + ')';
			}
		} catch ( e ) { /* silent */ }
		return null;
	}

	// Inject the glass CSS rules once. CSS vars are set inline on each block
	// wrapper; these rules consume them with reasonable fallbacks.
	// --ace-glass-tint is overridden by applyTintFromDataAttrs() to a computed
	// rgba() value, so tinted glass works on every browser without color-mix().
	// The @supports color-mix() block is a progressive enhancement for browsers
	// that support it — it uses --ace-glass-tint-color which can hold CSS custom
	// property references (e.g. theme palette vars) without JS colour-parsing.
	function injectGlassCSS() {
		if ( document.getElementById( 'ace-glass-styles' ) ) { return; }
		var colorMixBlock = ( window.CSS && typeof window.CSS.supports === 'function' &&
			window.CSS.supports( 'background', 'color-mix(in srgb, white 1%, transparent)' ) )
			? (
				// Buttons
				'@supports(background:color-mix(in srgb,white 1%,transparent)){' +
				'.ace-artistic-btn--liquid-glass .wp-block-button__link{' +
				'background:color-mix(in srgb,var(--ace-glass-tint-color,white) var(--ace-glass-tint-amount,12%),transparent)!important}' +
				'.wp-block-artistic-creation-environment-creative[data-ace-liquid-glass="true"] .artistic-creative__inner-container{' +
				'background:color-mix(in srgb,var(--ace-glass-tint-color,white) var(--ace-glass-tint-amount,8%),transparent)!important}' +
				'[data-ace-sticky-glass="true"]{' +
				'background:color-mix(in srgb,var(--ace-glass-tint-color,white) var(--ace-glass-tint-amount,10%),transparent)!important}' +
				'}'
			) : '';

		var css =
			'.ace-liquid-glass-wrap {' +
			'  isolation: auto;' +
			'}' +
			'.ace-liquid-glass-content,' +
			'.ace-liquid-glass-wrap > * {' +
			'  position: relative; z-index: 2;' +
			'}' +
			// ── Glass buttons ────────────────────────────────────────────────
			'.ace-artistic-btn--liquid-glass .wp-block-button__link {' +
			'  background: var(--ace-glass-tint, rgba(255,255,255,0.12)) !important;' +
			'  backdrop-filter:' +
			'    blur(var(--ace-glass-blur, 16px))' +
			'    saturate(var(--ace-glass-saturate, 180%))' +
			'    brightness(var(--ace-glass-brightness, 1.15));' +
			'  -webkit-backdrop-filter:' +
			'    blur(var(--ace-glass-blur, 16px))' +
			'    saturate(var(--ace-glass-saturate, 180%))' +
			'    brightness(var(--ace-glass-brightness, 1.15));' +
			'  border: 1px solid var(--ace-glass-border, rgba(255,255,255,0.3)) !important;' +
			'  box-shadow: var(--ace-glass-shadow, 0 4px 24px rgba(0,0,0,0.12)) !important;' +
			'  text-shadow: 0 1px 2px rgba(0,0,0,0.25);' +
			'  position: relative; z-index: 2;' +
			'}' +
			// ── Creative block glass overlay ─────────────────────────────────
			'.wp-block-artistic-creation-environment-creative[data-ace-liquid-glass="true"]' +
			'  .artistic-creative__inner-container {' +
			'  background: var(--ace-glass-tint, rgba(255,255,255,0.08)) !important;' +
			'  backdrop-filter:' +
			'    blur(var(--ace-glass-blur, 20px))' +
			'    saturate(var(--ace-glass-saturate, 150%))' +
			'    brightness(var(--ace-glass-brightness, 1.1));' +
			'  -webkit-backdrop-filter:' +
			'    blur(var(--ace-glass-blur, 20px))' +
			'    saturate(var(--ace-glass-saturate, 150%))' +
			'    brightness(var(--ace-glass-brightness, 1.1));' +
			'  border: 1px solid var(--ace-glass-border, rgba(255,255,255,0.2)) !important;' +
			'  box-shadow: var(--ace-glass-shadow, 0 8px 32px rgba(0,0,0,0.1)) !important;' +
			'  position: relative; z-index: 1;' +
			'}' +
			// ── Sticky glass blocks ───────────────────────────────────────────
			'[data-ace-sticky-glass="true"] {' +
			'  background: var(--ace-glass-tint, rgba(255,255,255,0.1)) !important;' +
			'  backdrop-filter:' +
			'    blur(var(--ace-glass-blur, 18px))' +
			'    saturate(var(--ace-glass-saturate, 160%))' +
			'    brightness(var(--ace-glass-brightness, 1.12));' +
			'  -webkit-backdrop-filter:' +
			'    blur(var(--ace-glass-blur, 18px))' +
			'    saturate(var(--ace-glass-saturate, 160%))' +
			'    brightness(var(--ace-glass-brightness, 1.12));' +
			'  box-shadow: var(--ace-glass-shadow, 0 6px 28px rgba(0,0,0,0.1)) !important;' +
			'}' +
			// Only apply the glass white-edge border when the block has no native WP border.
			'[data-ace-sticky-glass="true"]:not([data-ace-glass-no-border]) {' +
			'  border: 1px solid var(--ace-glass-border, rgba(255,255,255,0.2)) !important;' +
			'}' +
			// ── Glass text ───────────────────────────────────────────────────
			'.ace-glass-text {' +
			'  background: linear-gradient(' +
			'    135deg,' +
			'    rgba(255,255,255,0.95) 0%, rgba(190,225,255,0.85) 20%,' +
			'    rgba(255,255,255,0.6) 40%, rgba(170,210,255,0.80) 60%,' +
			'    rgba(240,250,255,0.90) 80%, rgba(255,255,255,0.95) 100%' +
			'  );' +
			'  -webkit-background-clip: text; background-clip: text;' +
			'  -webkit-text-fill-color: transparent; color: transparent;' +
			'  filter:' +
			'    drop-shadow(0 1px 0 rgba(255,255,255,0.8))' +
			'    drop-shadow(0 2px 5px rgba(0,0,0,0.25))' +
			'    drop-shadow(0 0 14px rgba(150,200,255,0.35));' +
			'  display: inline;' +
			'  -webkit-box-decoration-break: clone; box-decoration-break: clone;' +
			'}' +
			// ── WebGL-active mode ────────────────────────────────────────────
			// Once liquidGL succeeds, the canvas supplies refraction/bevel/specular.
			// Keep foreground content, but remove CSS glass fallback from targets.
			'.ace-liquidgl-target {' +
			'  z-index: 3001;' +
			'  background: transparent !important;' +
			'  background-image: none !important;' +
			'  backdrop-filter: none !important;' +
			'  -webkit-backdrop-filter: none !important;' +
			'  box-shadow: none !important;' +
			'}' +
			'.ace-liquidgl-stack {' +
			'  z-index: 3001;' +
			'}' +
			'.ace-liquidgl-webgl.ace-artistic-btn--liquid-glass .wp-block-button__link {' +
			'  background: transparent !important;' +
			'  backdrop-filter: none !important;' +
			'  -webkit-backdrop-filter: none !important;' +
			'  box-shadow: none !important;' +
			'}' +
			// ── Opacity guard ────────────────────────────────────────────────
			// Protects non-fade glass elements from liquidGL's cross-element fade
			// animation, which resets ALL renderer lenses' opacity to 0 at frame 0.
			'.ace-gl-opaque { opacity: 1 !important; }' +
			// Progressive enhancement: color-mix() for theme CSS var colours
			colorMixBlock;
		var s    = document.createElement( 'style' );
		s.id     = 'ace-glass-styles';
		s.textContent = css;
		document.head.appendChild( s );
	}

	// Binds a smooth 3D perspective tilt on mousemove — replaces liquidGL's
	// tilt uniforms. Respects prefers-reduced-motion.
	// el     — element to transform (the glass surface)
	// target — element to listen on (often the same as el)
	// factor — max tilt in degrees (default 5)
	function bindTilt( el, target, factor ) {
		if ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
			return;
		}
		var f = Number( factor ) || 5;
		el.style.willChange  = 'transform';
		el.style.transition  = 'transform 0.12s ease-out';

		target.addEventListener( 'mousemove', function ( e ) {
			var rect = target.getBoundingClientRect();
			var rotY =  ( ( e.clientX - rect.left  - rect.width  / 2 ) / ( rect.width  / 2 ) ) * f;
			var rotX = -( ( e.clientY - rect.top   - rect.height / 2 ) / ( rect.height / 2 ) ) * f;
			el.style.transform = 'perspective(600px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
		} );

		target.addEventListener( 'mouseleave', function () {
			el.style.transition = 'transform 0.3s ease-out';
			el.style.transform  = '';
			setTimeout( function () { el.style.transition = 'transform 0.12s ease-out'; }, 300 );
		} );
	}

	// ── Button init ────────────────────────────────────────────────────────────
	function initButtons() {
		document.querySelectorAll( '.ace-artistic-btn--liquid-glass' ).forEach( function ( wrapper ) {
			var link = wrapper.querySelector( '.wp-block-button__link' );
			if ( ! link ) { return; }
			syncTargetShapeFromContent( wrapper, link );
			// Fallback: if no CSS vars baked in (older saved blocks), set from preset.
			if ( ! wrapper.style.getPropertyValue( '--ace-glass-blur' ) ) {
				setCSSVarsFromPreset( wrapper, wrapper.dataset.aceLgPreset || 'default' );
			}
			// Apply tint from data attributes — editor bakes these in for new saves;
			// this covers any older blocks that predate the tint feature.
			applyTintFromDataAttrs( wrapper );
			callLiquidGL(
				normalizeGlassTarget( wrapper ),
				readLGOptions( wrapper ),
				wrapper
			);
			scheduleLensRefresh();
			// CSS tilt is only the fallback for when WebGL is not available;
			// liquidGL handles its own tilt when WebGL renders.
			if ( wrapper.dataset.aceLgTilt === 'true' && window.__liquidGLNoWebGL__ ) {
				bindTilt( wrapper, wrapper, wrapper.dataset.aceLgTiltFactor );
			}
		} );
	}

	// ── Creative block init ─────────────────────────────────────────────────────
	function initCreativeBlocks() {
		document.querySelectorAll(
			'.wp-block-artistic-creation-environment-creative[data-ace-liquid-glass="true"]'
		).forEach( function ( block ) {
			var inner = block.querySelector( '.artistic-creative__inner-container' );
			if ( ! inner ) { return; }
			// Fallback: set CSS vars from preset if not already baked in.
			if ( ! block.style.getPropertyValue( '--ace-glass-blur' ) ) {
				setCSSVarsFromPreset( block, block.dataset.aceLgPreset || 'default' );
			}
			applyTintFromDataAttrs( block );
			block.classList.add( 'artistic-creative--liquid-glass' );
			// Remove isolation:isolate so backdrop-filter composites against the
			// full page — including animated backgrounds outside the block.
			block.style.isolation = 'auto';
			inner.style.position  = inner.style.position || 'relative';
			callLiquidGL(
				normalizeGlassTarget( inner ),
				readLGOptions( block ),
				block
			);
			scheduleLensRefresh();
		} );
	}

	// ── Sticky / group block init ───────────────────────────────────────────────
	function initStickyBlocks() {
		document.querySelectorAll( '[data-ace-sticky-glass="true"]' ).forEach( function ( el ) {
			if ( ! el.style.getPropertyValue( '--ace-glass-blur' ) ) {
				setCSSVarsFromPreset( el, el.dataset.aceLgPreset || 'default' );
			}
			applyTintFromDataAttrs( el );
			el.style.isolation = 'auto';
			callLiquidGL(
				normalizeGlassTarget( el ),
				readLGOptions( el ),
				el
			);
			scheduleLensRefresh();
			// CSS tilt fallback when WebGL is not available.
			if ( el.dataset.aceLgTilt === 'true' && window.__liquidGLNoWebGL__ ) {
				bindTilt( el, el, el.dataset.aceLgTiltFactor );
			}
		} );
	}

	function syncDynamicContent() {
		if ( typeof window.liquidGL !== 'function' || ! window.__liquidGLRenderer__ ) { return; }
		if ( typeof window.liquidGL.registerDynamic === 'function' ) {
			[
				'.ace-glass-text',
				'.ace-magic-text',
				'.ace-aurora-text',
				'.ace-neon-text',
				'.ace-prism-text',
				'.ace-plasma-text',
				'.ace-inferno-text',
				'.liquidGL',
				'.ace-liquidgl-target',
				'.artistic-creative--liquid-glass',
				'.artistic-creative__layer',
				'.artistic-creative__overlay',
				'.artistic-creative--child-interactivity',
			].forEach( function ( selector ) {
				try {
					window.liquidGL.registerDynamic( selector );
				} catch ( e ) {
					warnLiquidGLError( 'ACE liquidGL: Dynamic element registration failed for ' + selector + '.', e );
				}
			} );
		}
		if ( typeof window.liquidGL.syncWith === 'function' && ! window.__aceLiquidGLSynced ) {
			window.__aceLiquidGLSynced = true;
			try {
				window.liquidGL.syncWith();
			} catch ( e ) {
				warnLiquidGLError( 'ACE liquidGL: Scroll sync failed; base render loop remains active.', e );
			}
		}
	}

	function isGlassElement( el ) {
		return !! ( el && el.nodeType === 1 && (
			el.matches( '.ace-artistic-btn--liquid-glass, [data-ace-liquid-glass="true"], [data-ace-sticky-glass="true"]' ) ||
			el.querySelector( '.ace-artistic-btn--liquid-glass, [data-ace-liquid-glass="true"], [data-ace-sticky-glass="true"]' )
		) );
	}

	function scheduleInit() {
		if ( _initScheduled ) { return; }
		_initScheduled = true;
		window.requestAnimationFrame( function () {
			_initScheduled = false;
			initButtons();
			initCreativeBlocks();
			initStickyBlocks();
			syncDynamicContent();
		} );
	}

	function observeGlassChanges() {
		if ( _mutationObserver || typeof MutationObserver === 'undefined' || ! document.body ) { return; }
		_mutationObserver = new MutationObserver( function ( mutations ) {
			var shouldInit = mutations.some( function ( mutation ) {
				if ( mutation.type === 'attributes' ) {
					return GLASS_ATTRS.indexOf( mutation.attributeName ) !== -1 &&
						isGlassElement( mutation.target );
				}
				if ( mutation.type === 'childList' ) {
					return Array.prototype.some.call( mutation.addedNodes, isGlassElement );
				}
				return false;
			} );
			if ( shouldInit ) {
				scheduleInit();
			}
		} );
		_mutationObserver.observe( document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: GLASS_ATTRS,
		} );
	}

	function init() {
		injectGlassCSS();
		initButtons();
		initCreativeBlocks();
		initStickyBlocks();
		syncDynamicContent();
		observeGlassChanges();
		bindLensRefresh();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
