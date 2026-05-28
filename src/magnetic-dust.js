// Magnetic Dust — Canvas 2D particles following a noise-based vector field.
// Trail rendering via translucent overlay per frame. Pointer is an attractor or repulsor.
(function () {
	'use strict';

	// --- Lightweight Perlin-style noise (2D) ---
	var PERM = (function () {
		var p = [];
		for (var i = 0; i < 256; i++) { p[i] = i; }
		for (var i = 255; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = p[i]; p[i] = p[j]; p[j] = t; }
		var out = [];
		for (var i = 0; i < 512; i++) { out[i] = p[i & 255]; }
		return out;
	})();

	function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
	function lerp(a, b, t) { return a + t * (b - a); }
	function grad(hash, x, y) {
		var h = hash & 3;
		var u = h < 2 ? x : y;
		var v = h < 2 ? y : x;
		return (h & 1 ? -u : u) + (h & 2 ? -v : v);
	}

	function noise2(x, y) {
		var xi = Math.floor(x) & 255;
		var yi = Math.floor(y) & 255;
		var xf = x - Math.floor(x);
		var yf = y - Math.floor(y);
		var u = fade(xf);
		var v = fade(yf);
		var aa = PERM[PERM[xi] + yi];
		var ab = PERM[PERM[xi] + yi + 1];
		var ba = PERM[PERM[xi + 1] + yi];
		var bb = PERM[PERM[xi + 1] + yi + 1];
		return lerp(
			lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
			lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
			v
		);
	}

	function hexToRgb(hex) {
		hex = hex.replace('#', '');
		if (hex.length === 3) { hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]; }
		var n = parseInt(hex, 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function createAceDust(rootElement, initialConfig, options) {
		var root = rootElement && rootElement.querySelector ? rootElement : document.body;
		var runtimeOptions = options || {};
		var interactionSurface = runtimeOptions.interactionSurface && runtimeOptions.interactionSurface.addEventListener
			? runtimeOptions.interactionSurface : root;

		var canvas = root.querySelector('canvas');
		if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'artistic-creative__canvas'; root.appendChild(canvas); }

		var ctx = canvas.getContext('2d');
		if (!ctx) { return { applyConfig: function () {}, destroy: function () {}, setPaused: function () {} }; }

		var config = {
			PARTICLE_COUNT: 600,
			FIELD_SPEED: 0.0004,
			FIELD_SCALE: 0.003,
			TRAIL_FADE: 0.06,
			DUST_COLOR: '#b8a8f8',
			POINTER_MODE: 'attract', // attract | repel | none
			POINTER_RADIUS: 150,
			POINTER_STRENGTH: 2.2,
			BACKGROUND_COLOR: '#080810',
			PAUSED: false,
		};

		var W = 0;
		var H = 0;
		var particles = [];
		var pointer = { x: -9999, y: -9999, active: false };
		var frameHandle = 0;
		var destroyed = false;
		var timeOffset = 0;

		function buildParticles() {
			particles = [];
			for (var i = 0; i < config.PARTICLE_COUNT; i++) {
				particles.push({
					x: Math.random() * W,
					y: Math.random() * H,
					life: Math.random(),
				});
			}
		}

		function resize() {
			var w = root.offsetWidth || 640;
			var h = root.offsetHeight || 360;
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
				W = w;
				H = h;
				buildParticles();
				ctx.fillStyle = config.BACKGROUND_COLOR;
				ctx.fillRect(0, 0, W, H);
			}
		}

		function render(time) {
			if (destroyed) { return; }
			if (config.PAUSED) { frameHandle = requestAnimationFrame(render); return; }

			resize();
			timeOffset = time * config.FIELD_SPEED;

			var dustRgb = hexToRgb(config.DUST_COLOR);
			var dustBase = 'rgba(' + dustRgb[0] + ',' + dustRgb[1] + ',' + dustRgb[2] + ',';

			// fade trail
			ctx.fillStyle = config.BACKGROUND_COLOR;
			ctx.globalAlpha = config.TRAIL_FADE;
			ctx.fillRect(0, 0, W, H);
			ctx.globalAlpha = 1.0;

			for (var i = 0; i < particles.length; i++) {
				var p = particles[i];

				// noise field angle
				var nx = p.x * config.FIELD_SCALE;
				var ny = p.y * config.FIELD_SCALE;
				var angle = noise2(nx + timeOffset, ny + timeOffset * 0.7) * Math.PI * 2.4;

				var speed = 1.0 + noise2(nx * 2 + 5, ny * 2 + 5) * 0.6;
				var vx = Math.cos(angle) * speed;
				var vy = Math.sin(angle) * speed;

				// pointer force
				if (pointer.active) {
					var dx = pointer.x - p.x;
					var dy = pointer.y - p.y;
					var dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
					if (dist < config.POINTER_RADIUS) {
						var force = (1 - dist / config.POINTER_RADIUS) * config.POINTER_STRENGTH;
						if (config.POINTER_MODE === 'attract') {
							vx += (dx / dist) * force;
							vy += (dy / dist) * force;
						} else if (config.POINTER_MODE === 'repel') {
							vx -= (dx / dist) * force;
							vy -= (dy / dist) * force;
						}
					}
				}

				p.x += vx;
				p.y += vy;

				// wrap
				if (p.x < 0) { p.x = W; } else if (p.x > W) { p.x = 0; }
				if (p.y < 0) { p.y = H; } else if (p.y > H) { p.y = 0; }

				p.life += 0.003;
				var alpha = 0.25 + Math.sin(p.life * Math.PI * 2) * 0.18;
				alpha = Math.max(0.05, Math.min(0.72, alpha));

				ctx.fillStyle = dustBase + alpha.toFixed(3) + ')';
				ctx.fillRect(p.x - 0.7, p.y - 0.7, 1.4, 1.4);
			}

			frameHandle = requestAnimationFrame(render);
		}

		function applyAceConfig(cfg) {
			if (!cfg) { return; }
			var rebuildNeeded = false;
			if (cfg.dustParticleCount !== undefined && cfg.dustParticleCount !== null) {
				var n = parseInt(cfg.dustParticleCount, 10);
				if (!isNaN(n) && n !== config.PARTICLE_COUNT) { config.PARTICLE_COUNT = Math.max(50, Math.min(2000, n)); rebuildNeeded = true; }
			}
			if (cfg.dustFieldSpeed !== undefined && cfg.dustFieldSpeed !== null) { config.FIELD_SPEED = parseFloat(cfg.dustFieldSpeed) || config.FIELD_SPEED; }
			if (cfg.dustFieldScale !== undefined && cfg.dustFieldScale !== null) { config.FIELD_SCALE = parseFloat(cfg.dustFieldScale) || config.FIELD_SCALE; }
			if (cfg.dustTrailFade !== undefined && cfg.dustTrailFade !== null) { config.TRAIL_FADE = parseFloat(cfg.dustTrailFade) || config.TRAIL_FADE; }
			if (cfg.dustColor) { config.DUST_COLOR = cfg.dustColor; }
			if (cfg.dustPointerMode) { config.POINTER_MODE = cfg.dustPointerMode; }
			if (cfg.backgroundColor) { config.BACKGROUND_COLOR = cfg.backgroundColor; root.style.background = cfg.backgroundColor; }
			if (rebuildNeeded && W > 0) { buildParticles(); }
		}

		function onPointerMove(e) {
			var rect = interactionSurface.getBoundingClientRect();
			pointer.active = true;
			pointer.x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
			pointer.y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
		}
		function onPointerLeave() { pointer.active = false; }
		function onMessage(e) {
			if (!e.data || e.data.type !== 'artistic-creation-environment-preview') { return; }
			applyAceConfig(e.data.config || {});
		}

		var sp = new URLSearchParams(window.location.search);
		applyAceConfig({ dustParticleCount: sp.get('dustParticleCount'), dustFieldSpeed: sp.get('dustFieldSpeed'), dustFieldScale: sp.get('dustFieldScale'), dustTrailFade: sp.get('dustTrailFade'), dustColor: sp.get('dustColor'), dustPointerMode: sp.get('dustPointerMode'), backgroundColor: sp.get('backgroundColor') });
		applyAceConfig(initialConfig || {});

		root.style.background = config.BACKGROUND_COLOR;
		window.addEventListener('message', onMessage);
		interactionSurface.addEventListener('mousemove', onPointerMove, true);
		interactionSurface.addEventListener('touchmove', onPointerMove, { passive: true, capture: true });
		interactionSurface.addEventListener('mouseleave', onPointerLeave, true);
		interactionSurface.addEventListener('touchend', onPointerLeave, true);

		resize();
		frameHandle = requestAnimationFrame(render);

		return {
			applyConfig: applyAceConfig,
			destroy: function () {
				if (destroyed) { return; }
				destroyed = true;
				if (frameHandle) { cancelAnimationFrame(frameHandle); frameHandle = 0; }
				window.removeEventListener('message', onMessage);
				interactionSurface.removeEventListener('mousemove', onPointerMove, true);
				interactionSurface.removeEventListener('touchmove', onPointerMove, true);
				interactionSurface.removeEventListener('mouseleave', onPointerLeave, true);
				interactionSurface.removeEventListener('touchend', onPointerLeave, true);
			},
			setPaused: function (p) { config.PAUSED = !!p; },
		};
	}

	window.ArtisticCreationEnvironmentDust = createAceDust;

	if (document.body && document.body.getAttribute('data-artistic-dust-preview') === '1') {
		window.ArtisticCreationEnvironmentDust(document.body);
	}
})();
