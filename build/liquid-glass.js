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
			bevelDepth : ds.aceLgBevelDepth  != null ? +ds.aceLgBevelDepth : preset.bevelDepth,
			bevelWidth : ds.aceLgBevelWidth  != null ? +ds.aceLgBevelWidth : preset.bevelWidth,
			frost      : ds.aceLgFrost       != null ? +ds.aceLgFrost      : preset.frost,
			shadow     : ds.aceLgShadow     !== 'false' ? preset.shadow    : false,
			specular   : ds.aceLgSpecular   !== 'false' ? preset.specular  : false,
			tilt       : ds.aceLgTilt       === 'true',
			tiltFactor : ds.aceLgTiltFactor  != null ? +ds.aceLgTiltFactor : 5,
			magnify    : ds.aceLgMagnify     != null ? +ds.aceLgMagnify    : 1,
			// Resolution only matters for the first liquidGL() call (singleton renderer).
			// 1.5 is a good balance — lower than default 2.0 to avoid GPU texture limits
			// on long WordPress pages.
			resolution : ds.aceLgResolution  != null ? +ds.aceLgResolution : 1.5,
			reveal     : ds.aceLgReveal || 'fade',
		};
	}

	// Apply per-element config to an already-initialised lens instance.
	// Called from the on.init callback so each lens gets its own settings
	// rather than everything sharing the first button's config.
	function applyLensConfig( lens, cfg ) {
		lens.options.refraction = cfg.refraction;
		lens.options.bevelDepth = cfg.bevelDepth;
		lens.options.bevelWidth = cfg.bevelWidth;
		lens.options.frost      = cfg.frost;
		lens.options.specular   = cfg.specular;
		lens.options.magnify    = cfg.magnify;
		lens.options.reveal     = cfg.reveal;
		// shadow and tilt require dedicated setter methods — direct option
		// mutation alone is insufficient for these two.
		if ( typeof lens.setShadow === 'function' ) { lens.setShadow( cfg.shadow ); }
		if ( typeof lens.setTilt   === 'function' ) {
			lens.setTilt( cfg.tilt );
			if ( cfg.tilt ) { lens.options.tiltFactor = cfg.tiltFactor; }
		}
	}

	// Find the best snapshot target — smaller capture = better GPU texture fit
	// on long WordPress pages. Prefer .wp-site-blocks (block themes) then #page,
	// then fall back to body.
	function snapshotTarget() {
		if ( document.querySelector( '.wp-site-blocks' ) ) { return '.wp-site-blocks'; }
		if ( document.querySelector( '#page' )            ) { return '#page'; }
		return 'body';
	}

	// Check WebGL availability before calling liquidGL. The built-in CSS fallback
	// is minimal (hardcoded rgba(255,255,255,0.07) + blur 12px), so we apply our
	// own richer fallback and skip calling liquidGL entirely if WebGL is absent.
	function hasWebGL() {
		try {
			var c = document.createElement( 'canvas' );
			return !!( c.getContext( 'webgl2' ) || c.getContext( 'webgl' ) );
		} catch ( e ) {
			return false;
		}
	}

	// Rich CSS fallback used when WebGL is unavailable.
	function applyCSSFallback( selector ) {
		document.querySelectorAll( selector ).forEach( function ( el ) {
			el.style.background        = 'rgba(255,255,255,0.12)';
			el.style.backdropFilter    = 'blur(20px) saturate(180%) brightness(1.15)';
			el.style.webkitBackdropFilter = el.style.backdropFilter;
			el.style.border            = '1px solid rgba(255,255,255,0.25)';
			el.style.boxShadow         = '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.35)';
			el.style.opacity           = '';
		} );
	}

	// Safety net — if liquidGL's reveal never fires (e.g. snapshot fails even
	// after retries), it leaves the lens elements at opacity:0. We restore them
	// after 5 s so buttons never permanently vanish.
	function restoreOpacityFallback( selector ) {
		setTimeout( function () {
			document.querySelectorAll( selector ).forEach( function ( el ) {
				if ( el.style.opacity === '0' ) {
					el.style.opacity = '';
				}
			} );
		}, 5000 );
	}

	// ── Button group init ──────────────────────────────────────────────────────
	function initButtons( snap, useWebGL ) {
		var btnWrappers = document.querySelectorAll( '.ace-artistic-btn--liquid-glass' );
		if ( ! btnWrappers.length ) { return; }

		btnWrappers.forEach( function ( wrapper ) {
			var link = wrapper.querySelector( '.wp-block-button__link' );
			if ( ! link ) { return; }
			link.classList.add( 'ace-lg-btn' );
			link.style.position = link.style.position || 'relative';
			link.style.zIndex   = link.style.zIndex   || '100';
			// Store a reference back to the wrapper so on.init can read per-element config.
			link._aceLgWrapper = wrapper;
			// Ensure inner text/icons sit above the WebGL canvas.
			[].forEach.call( link.childNodes, function ( node ) {
				if ( node.nodeType === 1 ) {
					node.style.position = node.style.position || 'relative';
					node.style.zIndex   = node.style.zIndex   || '3';
				}
			} );
		} );

		if ( ! useWebGL ) {
			applyCSSFallback( '.ace-lg-btn' );
			return;
		}

		// Use the first wrapper's config for shared snapshot/resolution settings
		// (the singleton renderer only reads these from the first liquidGL() call).
		var baseCfg = readConfig( btnWrappers[ 0 ] );

		try {
			liquidGL( Object.assign( {}, baseCfg, {
				target   : '.ace-lg-btn',
				snapshot : snap,
				on: {
					init: function ( lens ) {
						// Apply per-element config from each button's own data attrs.
						var wrapper = lens.el && lens.el._aceLgWrapper;
						if ( wrapper ) {
							applyLensConfig( lens, readConfig( wrapper ) );
						}
					},
				},
			} ) );
		} catch ( e ) {
			console.warn( 'ACE LiquidGL button init error:', e );
			applyCSSFallback( '.ace-lg-btn' );
		}
		restoreOpacityFallback( '.ace-lg-btn' );
	}

	// ── Creative block glass overlays ──────────────────────────────────────────
	function initCreativeBlocks( snap, useWebGL ) {
		var creativeEls = document.querySelectorAll(
			'.wp-block-artistic-creation-environment-creative[data-ace-liquid-glass="true"]'
		);
		if ( ! creativeEls.length ) { return; }

		creativeEls.forEach( function ( block ) {
			var inner = block.querySelector( '.artistic-creative__inner-container' );
			if ( ! inner ) { return; }
			inner.classList.add( 'ace-lg-creative' );
			inner.style.position = inner.style.position || 'relative';
			inner.style.zIndex   = inner.style.zIndex   || '100';
			inner._aceLgWrapper  = block;

			// Remove isolation:isolate from the outer block when glass is active —
			// it scopes z-index to the block context and interferes with the fixed
			// WebGL canvas z-index resolution done by liquidGL.
			block.style.isolation = 'auto';
		} );

		if ( ! useWebGL ) {
			applyCSSFallback( '.ace-lg-creative' );
			return;
		}

		var baseCfg = readConfig( creativeEls[ 0 ] );

		try {
			liquidGL( Object.assign( {}, baseCfg, {
				target   : '.ace-lg-creative',
				snapshot : snap,
				on: {
					init: function ( lens ) {
						var wrapper = lens.el && lens.el._aceLgWrapper;
						if ( wrapper ) {
							applyLensConfig( lens, readConfig( wrapper ) );
						}
					},
				},
			} ) );
		} catch ( e ) {
			console.warn( 'ACE LiquidGL creative block init error:', e );
			applyCSSFallback( '.ace-lg-creative' );
		}
		restoreOpacityFallback( '.ace-lg-creative' );
	}

	// ── Sticky blocks ──────────────────────────────────────────────────────────
	// Each sticky block gets its own liquidGL call to avoid z-index conflicts
	// between elements that may sit at different stacking depths.
	function initStickyBlocks( snap, useWebGL ) {
		var stickyEls = document.querySelectorAll( '[data-ace-sticky-glass="true"]' );
		stickyEls.forEach( function ( el, i ) {
			var uid = 'ace-lg-sticky-' + i;
			el.classList.add( uid );
			// Remove isolation on sticky containers for the same reason as Creative blocks.
			el.style.isolation = 'auto';
			[].slice.call( el.children ).forEach( function ( child ) {
				child.style.position = child.style.position || 'relative';
				child.style.zIndex   = child.style.zIndex   || '3';
			} );

			if ( ! useWebGL ) {
				applyCSSFallback( '.' + uid );
				return;
			}

			var cfg = readConfig( el );
			try {
				liquidGL( Object.assign( {}, cfg, {
					target   : '.' + uid,
					snapshot : snap,
					on: {
						init: function ( lens ) {
							applyLensConfig( lens, cfg );
						},
					},
				} ) );
			} catch ( e ) {
				console.warn( 'ACE LiquidGL sticky init error (', uid, '):', e );
				applyCSSFallback( '.' + uid );
			}
			restoreOpacityFallback( '.' + uid );
		} );
	}

	function init() {
		// Wait for the liquidGL global to be available (script-ordering edge case).
		if ( typeof liquidGL === 'undefined' ) {
			setTimeout( init, 200 );
			return;
		}

		// Respect the user's reduced-motion preference — CSS fallback handles things.
		if ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
			return;
		}

		// Mark the WP admin bar so liquidGL excludes it from the snapshot.
		// It's position:fixed so it would be excluded anyway, but this is explicit.
		var adminBar = document.getElementById( 'wpadminbar' );
		if ( adminBar ) { adminBar.setAttribute( 'data-liquid-ignore', '' ); }

		var snap     = snapshotTarget();
		var useWebGL = hasWebGL();

		initButtons(        snap, useWebGL );
		initCreativeBlocks( snap, useWebGL );
		initStickyBlocks(   snap, useWebGL );

		// Expose a global refresh hook so dynamic blocks or AJAX content can
		// trigger a new snapshot after DOM changes.
		window._aceRefreshGlass = function () {
			if ( window.__liquidGLRenderer__ && window.__liquidGLRenderer__.captureSnapshot ) {
				window.__liquidGLRenderer__.captureSnapshot();
			}
		};
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();

