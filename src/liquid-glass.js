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
		'default': { refraction: 0,     bevelDepth: 0.052, frost: 2,   shadow: true,  specular: true  },
		'alien'  : { refraction: 0.073, bevelDepth: 0.2,   frost: 2,   shadow: true,  specular: false },
		'pulse'  : { refraction: 0.03,  bevelDepth: 0,     frost: 0,   shadow: false, specular: false },
		'frost'  : { refraction: 0,     bevelDepth: 0.035, frost: 0.9, shadow: true,  specular: true  },
		'edge'   : { refraction: 0.047, bevelDepth: 0.136, frost: 2,   shadow: true,  specular: false },
		'custom' : { refraction: 0,     bevelDepth: 0.052, frost: 2,   shadow: true,  specular: true  },
	};

	// Reads liquidGL options from an element's data-ace-lg-* attributes.
	// Falls back to the preset's raw values when an attribute is absent.
	var _lgIdCounter = 0;
	function readLGOptions( el ) {
		var preset = PRESETS[ el.dataset.aceLgPreset ] || PRESETS['default'];
		function num( val, fallback ) { return ( val !== undefined && val !== '' ) ? parseFloat( val ) : fallback; }
		return {
			refraction: num( el.dataset.aceLgRefraction,  preset.refraction ),
			bevelDepth: num( el.dataset.aceLgBevelDepth,  preset.bevelDepth ),
			bevelWidth: num( el.dataset.aceLgBevelWidth,  0.211 ),
			frost:      num( el.dataset.aceLgFrost,       preset.frost ),
			specular:   el.dataset.aceLgSpecular !== 'false',
			shadow:     el.dataset.aceLgShadow   !== 'false',
			tilt:       el.dataset.aceLgTilt === 'true',
			tiltFactor: num( el.dataset.aceLgTiltFactor, 5 ),
			magnify:    num( el.dataset.aceLgMagnify,    1 ),
		};
	}

	// Attempt WebGL glass rendering via the liquidGL library for a single element.
	// When WebGL is available, liquidGL places a fixed-position canvas clipped to
	// the element's bounds — we then suppress the CSS backdrop-filter on that element
	// so the two glass layers don't stack and double-blur.
	// Silently falls back to CSS if liquidGL is absent or WebGL is unavailable.
	function callLiquidGL( el, opts ) {
		if ( typeof window.liquidGL !== 'function' ) { return; }
		if ( ! el.id ) {
			el.id = 'ace-gl-' + ( ++_lgIdCounter );
		}
		try {
			window.liquidGL( Object.assign( { target: '#' + el.id }, opts ) );
		} catch ( e ) { /* silent — CSS fallback remains active */ }

		// The liquidGL Lens constructor runs synchronously and immediately overrides
		// three inline styles on the element before any async rendering occurs:
		//   el.style.opacity          = 0       (hides the element entirely)
		//   el.style.backdropFilter   = "none"  (kills the CSS glass fallback)
		//   el.style.background       = "transparent"
		// The element is invisible until liquidGL calls _reveal() async (after
		// html2canvas captures the page) — this is what caused the header to vanish.
		//
		// Fix: undo the opacity and backdrop-filter overrides immediately after the
		// constructor runs. The element then stays visible with CSS glass while
		// liquidGL renders its first WebGL frame. When _reveal() fires it restores
		// opacity to the saved original ('' || 1 = 1) so nothing conflicts.
		// We leave background:transparent so the WebGL canvas below shows through.
		if ( ! window.__liquidGLNoWebGL__ ) {
			el.style.removeProperty( 'opacity' );
			el.style.removeProperty( 'backdrop-filter' );
			el.style.removeProperty( '-webkit-backdrop-filter' );
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
		var colorMixBlock = ( CSS && typeof CSS.supports === 'function' &&
			CSS.supports( 'background', 'color-mix(in srgb, white 1%, transparent)' ) )
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
			'  color: rgba(255,255,255,0.95) !important;' +
			'  text-shadow: 0 1px 2px rgba(0,0,0,0.25);' +
			'  position: relative; z-index: 1;' +
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
			// Fallback: if no CSS vars baked in (older saved blocks), set from preset.
			if ( ! wrapper.style.getPropertyValue( '--ace-glass-blur' ) ) {
				setCSSVarsFromPreset( wrapper, wrapper.dataset.aceLgPreset || 'default' );
			}
			// Apply tint from data attributes — editor bakes these in for new saves;
			// this covers any older blocks that predate the tint feature.
			applyTintFromDataAttrs( wrapper );
			link.style.position = link.style.position || 'relative';
			link.style.zIndex   = link.style.zIndex   || '1';
			// WebGL glass via liquidGL — data attrs come from the wrapper element.
			callLiquidGL( link, readLGOptions( wrapper ) );
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
			// Remove isolation:isolate so backdrop-filter composites against the
			// full page — including animated backgrounds outside the block.
			block.style.isolation = 'auto';
			inner.style.position  = inner.style.position || 'relative';
			inner.style.zIndex    = inner.style.zIndex   || '1';
			// WebGL glass via liquidGL using the preset values from the block element.
			callLiquidGL( inner, readLGOptions( block ) );
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
			// WebGL glass via liquidGL — options baked as data attrs by the save filter.
			callLiquidGL( el, readLGOptions( el ) );
			// CSS tilt fallback when WebGL is not available.
			if ( el.dataset.aceLgTilt === 'true' && window.__liquidGLNoWebGL__ ) {
				bindTilt( el, el, el.dataset.aceLgTiltFactor );
			}
		} );
	}

	function init() {
		injectGlassCSS();
		initButtons();
		initCreativeBlocks();
		initStickyBlocks();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
