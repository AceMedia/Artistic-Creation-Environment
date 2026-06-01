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
	};

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

	// Inject the glass CSS rules once. CSS vars are set inline on each block
	// wrapper; these rules consume them with reasonable fallbacks.
	function injectGlassCSS() {
		if ( document.getElementById( 'ace-glass-styles' ) ) { return; }
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
			'  border: 1px solid var(--ace-glass-border, rgba(255,255,255,0.2)) !important;' +
			'  box-shadow: var(--ace-glass-shadow, 0 6px 28px rgba(0,0,0,0.1)) !important;' +
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
			'}';
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
			link.style.position = link.style.position || 'relative';
			link.style.zIndex   = link.style.zIndex   || '1';
			// Tilt on hover — reads data-ace-lg-tilt from the wrapper (set by the editor).
			if ( wrapper.dataset.aceLgTilt === 'true' ) {
				var factor = wrapper.dataset.aceLgTiltFactor;
				bindTilt( wrapper, wrapper, factor );
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
			// Remove isolation:isolate so backdrop-filter composites against the
			// full page — including animated backgrounds outside the block.
			block.style.isolation = 'auto';
			inner.style.position  = inner.style.position || 'relative';
			inner.style.zIndex    = inner.style.zIndex   || '1';
		} );
	}

	// ── Sticky / group block init ───────────────────────────────────────────────
	function initStickyBlocks() {
		document.querySelectorAll( '[data-ace-sticky-glass="true"]' ).forEach( function ( el ) {
			if ( ! el.style.getPropertyValue( '--ace-glass-blur' ) ) {
				setCSSVarsFromPreset( el, el.dataset.aceLgPreset || 'default' );
			}
			el.style.isolation = 'auto';
			// Tilt on hover — opt-in via data-ace-lg-tilt attribute.
			if ( el.dataset.aceLgTilt === 'true' ) {
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

