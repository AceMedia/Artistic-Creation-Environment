// src/liquid-glass.js — ACE LiquidGL frontend init wrapper.
// Initialises WebGL glass effects on magic buttons, Creative block overlays,
// and sticky blocks that have the liquid glass option enabled in the editor.
// Dependencies: html2canvas.vendor.js and liquidGL.vendor.js must load first.
( function () {
	'use strict';

	if ( window._aceLiquidGlassLoaded ) { return; }
	window._aceLiquidGlassLoaded = true;

	// Built-in liquidGL presets, mirroring the values from the library.
	var PRESETS = {
		'default': { refraction: 0,     bevelDepth: 0.052, bevelWidth: 0.211, frost: 2,   shadow: true,  specular: true  },
		'alien'  : { refraction: 0.073, bevelDepth: 0.2,   bevelWidth: 0.156, frost: 2,   shadow: true,  specular: false },
		'pulse'  : { refraction: 0.03,  bevelDepth: 0,     bevelWidth: 0.273, frost: 0,   shadow: false, specular: false },
		'frost'  : { refraction: 0,     bevelDepth: 0.035, bevelWidth: 0.119, frost: 0.9, shadow: true,  specular: true  },
		'edge'   : { refraction: 0.047, bevelDepth: 0.136, bevelWidth: 0.076, frost: 2,   shadow: true,  specular: false },
	};

	// Read liquidGL config from a wrapper element's data attributes.
	// Falls back to the named preset for any value not explicitly overridden.
	function readConfig( el ) {
		var ds     = el.dataset || {};
		var preset = PRESETS[ ds.aceLgPreset ] || PRESETS['default'];
		return {
			refraction : ds.aceLgRefraction != null ? +ds.aceLgRefraction : preset.refraction,
			bevelDepth : ds.aceLgBevelDepth != null ? +ds.aceLgBevelDepth : preset.bevelDepth,
			bevelWidth : ds.aceLgBevelWidth != null ? +ds.aceLgBevelWidth : preset.bevelWidth,
			frost      : ds.aceLgFrost      != null ? +ds.aceLgFrost      : preset.frost,
			shadow     : ds.aceLgShadow    !== 'false' ? preset.shadow    : false,
			specular   : ds.aceLgSpecular  !== 'false' ? preset.specular  : false,
			tilt       : ds.aceLgTilt      === 'true',
			tiltFactor : ds.aceLgTiltFactor != null ? +ds.aceLgTiltFactor : 5,
			magnify    : ds.aceLgMagnify    != null ? +ds.aceLgMagnify    : 1,
			resolution : ds.aceLgResolution != null ? +ds.aceLgResolution : 1.5,
			reveal     : ds.aceLgReveal || 'fade',
		};
	}

	// Kick off a liquidGL group for a given CSS selector.
	function initGroup( selector, cfg ) {
		try {
			liquidGL( Object.assign( {}, cfg, { target: selector, snapshot: 'body' } ) );
		} catch ( e ) {
			console.warn( 'ACE LiquidGL init error (' + selector + '):', e );
		}
	}

	function init() {
		// Wait for the liquidGL global to be available (script ordering edge case).
		if ( typeof liquidGL === 'undefined' ) {
			setTimeout( init, 200 );
			return;
		}

		// Respect the user's reduced-motion preference — CSS fallback handles the rest.
		if ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
			return;
		}

		// ── 1. Magic buttons ──────────────────────────────────────────────────────
		// Each .ace-artistic-btn--liquid-glass wrapper holds the config data attrs.
		// The <a> inside is what liquidGL targets so the WebGL canvas sits beneath it.
		var btnWrappers = document.querySelectorAll( '.ace-artistic-btn--liquid-glass' );
		if ( btnWrappers.length ) {
			var btnCfg = readConfig( btnWrappers[ 0 ] );
			btnWrappers.forEach( function ( wrapper ) {
				var link = wrapper.querySelector( '.wp-block-button__link' );
				if ( ! link ) { return; }
				link.classList.add( 'ace-lg-btn' );
				link.style.position = link.style.position || 'relative';
				link.style.zIndex   = link.style.zIndex   || '100';
				// Ensure inner text/icons sit above the WebGL canvas.
				[].forEach.call( link.childNodes, function ( node ) {
					if ( node.nodeType === 1 ) {
						node.style.position = node.style.position || 'relative';
						node.style.zIndex   = node.style.zIndex   || '3';
					}
				} );
			} );
			initGroup( '.ace-lg-btn', btnCfg );
		}

		// ── 2. Creative block content overlays ────────────────────────────────────
		// The inner container of the Creative block becomes the glass lens.
		var creativeEls = document.querySelectorAll(
			'.wp-block-artistic-creation-environment-creative[data-ace-liquid-glass="true"]'
		);
		if ( creativeEls.length ) {
			var creativeCfg = readConfig( creativeEls[ 0 ] );
			creativeEls.forEach( function ( block ) {
				var inner = block.querySelector( '.artistic-creative__inner-container' );
				if ( ! inner ) { return; }
				inner.classList.add( 'ace-lg-creative' );
				inner.style.position = inner.style.position || 'relative';
				inner.style.zIndex   = inner.style.zIndex   || '100';
			} );
			initGroup( '.ace-lg-creative', creativeCfg );
		}

		// ── 3. Sticky blocks ──────────────────────────────────────────────────────
		// Each sticky block gets its own liquidGL call to avoid z-index conflicts
		// between elements that may sit at different depths in the stacking context.
		var stickyEls = document.querySelectorAll( '[data-ace-sticky-glass="true"]' );
		stickyEls.forEach( function ( el, i ) {
			var uid = 'ace-lg-sticky-' + i;
			el.classList.add( uid );
			[].slice.call( el.children ).forEach( function ( child ) {
				child.style.position = child.style.position || 'relative';
				child.style.zIndex   = child.style.zIndex   || '3';
			} );
			initGroup( '.' + uid, readConfig( el ) );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
