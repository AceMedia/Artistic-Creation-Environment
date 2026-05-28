// Particle Constellation — Canvas 2D particle web with connection lines.
// Drifting particles connect to neighbours; pointer attracts or repels.
(function () {
	'use strict';

	function rand(min, max) {
		return min + Math.random() * (max - min);
	}

	function hexToRgb(hex) {
		hex = hex.replace('#', '');
		if (hex.length === 3) { hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]; }
		var n = parseInt(hex, 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function createAceConstellation(rootElement, initialConfig, options) {
		var root = rootElement && rootElement.querySelector ? rootElement : document.body;
		var runtimeOptions = options || {};
		var interactionSurface = runtimeOptions.interactionSurface && runtimeOptions.interactionSurface.addEventListener
			? runtimeOptions.interactionSurface
			: root;

		var canvas = root.querySelector('canvas');
		if (!canvas) {
			canvas = document.createElement('canvas');
			canvas.className = 'artistic-creative__canvas';
			root.appendChild(canvas);
		}
		var ctx = canvas.getContext('2d');
		if (!ctx) {
			return { applyConfig: function () {}, destroy: function () {}, setPaused: function () {} };
		}

		var config = {
			PARTICLE_COUNT: 120,
			CONNECT_DISTANCE: 160,
			POINTER_MODE: 'attract', // attract | repel | none
			POINTER_RADIUS: 180,
			PARTICLE_COLOR: '#a5b4fc',
			LINE_COLOR: '#818cf8',
			SPEED: 0.5,
			BACKGROUND_COLOR: '#0d0d1a',
			PAUSED: false,
		};

		var particles = [];
		var pointer = { x: -9999, y: -9999, active: false };
		var frameHandle = 0;
		var destroyed = false;
		var W = 0;
		var H = 0;

		function buildParticles() {
			particles = [];
			for (var i = 0; i < config.PARTICLE_COUNT; i++) {
				particles.push({
					x: rand(0, W),
					y: rand(0, H),
					vx: rand(-0.4, 0.4) * config.SPEED,
					vy: rand(-0.4, 0.4) * config.SPEED,
					r: rand(1.2, 2.8),
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
			}
		}

		function render() {
			if (destroyed) { return; }
			if (config.PAUSED) { frameHandle = requestAnimationFrame(render); return; }

			resize();

			ctx.fillStyle = config.BACKGROUND_COLOR;
			ctx.fillRect(0, 0, W, H);

			var pRgb = hexToRgb(config.PARTICLE_COLOR);
			var lRgb = hexToRgb(config.LINE_COLOR);
			var pStr = 'rgb(' + pRgb[0] + ',' + pRgb[1] + ',' + pRgb[2] + ')';
			var connectSq = config.CONNECT_DISTANCE * config.CONNECT_DISTANCE;
			var ptrRadSq = config.POINTER_RADIUS * config.POINTER_RADIUS;

			for (var i = 0; i < particles.length; i++) {
				var p = particles[i];

				// pointer interaction
				if (pointer.active) {
					var dx = p.x - pointer.x;
					var dy = p.y - pointer.y;
					var distSq = dx * dx + dy * dy;
					if (distSq < ptrRadSq && distSq > 0.01) {
						var dist = Math.sqrt(distSq);
						var force = (1 - dist / config.POINTER_RADIUS) * 1.2;
						var nx = dx / dist;
						var ny = dy / dist;
						if (config.POINTER_MODE === 'attract') {
							p.vx -= nx * force * 0.18;
							p.vy -= ny * force * 0.18;
						} else if (config.POINTER_MODE === 'repel') {
							p.vx += nx * force * 0.18;
							p.vy += ny * force * 0.18;
						}
					}
				}

				// speed clamping + friction
				var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
				var maxSpd = 1.5 * config.SPEED;
				if (spd > maxSpd) { p.vx *= maxSpd / spd; p.vy *= maxSpd / spd; }
				p.vx *= 0.995;
				p.vy *= 0.995;

				p.x += p.vx;
				p.y += p.vy;

				if (p.x < 0) { p.x = W; } else if (p.x > W) { p.x = 0; }
				if (p.y < 0) { p.y = H; } else if (p.y > H) { p.y = 0; }

				// draw particle
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = pStr;
				ctx.fill();

				// draw connecting lines
				for (var j = i + 1; j < particles.length; j++) {
					var q = particles[j];
					var dx2 = p.x - q.x;
					var dy2 = p.y - q.y;
					var d2 = dx2 * dx2 + dy2 * dy2;
					if (d2 < connectSq) {
						var alpha = (1 - Math.sqrt(d2) / config.CONNECT_DISTANCE) * 0.55;
						ctx.strokeStyle = 'rgba(' + lRgb[0] + ',' + lRgb[1] + ',' + lRgb[2] + ',' + alpha.toFixed(3) + ')';
						ctx.lineWidth = 0.8;
						ctx.beginPath();
						ctx.moveTo(p.x, p.y);
						ctx.lineTo(q.x, q.y);
						ctx.stroke();
					}
				}
			}

			frameHandle = requestAnimationFrame(render);
		}

		function applyAceConfig(incoming) {
			if (!incoming) { return; }
			var rebuildNeeded = false;
			if (incoming.constellationCount !== undefined && incoming.constellationCount !== null) {
				var n = parseInt(incoming.constellationCount, 10);
				if (!isNaN(n) && n !== config.PARTICLE_COUNT) { config.PARTICLE_COUNT = Math.max(20, Math.min(600, n)); rebuildNeeded = true; }
			}
			if (incoming.constellationConnectDistance !== undefined && incoming.constellationConnectDistance !== null) { config.CONNECT_DISTANCE = parseFloat(incoming.constellationConnectDistance) || config.CONNECT_DISTANCE; }
			if (incoming.constellationPointerMode) { config.POINTER_MODE = incoming.constellationPointerMode; }
			if (incoming.constellationParticleColor) { config.PARTICLE_COLOR = incoming.constellationParticleColor; }
			if (incoming.constellationLineColor) { config.LINE_COLOR = incoming.constellationLineColor; }
			if (incoming.constellationSpeed !== undefined && incoming.constellationSpeed !== null) { config.SPEED = parseFloat(incoming.constellationSpeed) || config.SPEED; }
			if (incoming.backgroundColor) { config.BACKGROUND_COLOR = incoming.backgroundColor; root.style.background = incoming.backgroundColor; canvas.style.background = incoming.backgroundColor; }
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

		var searchParams = new URLSearchParams(window.location.search);
		applyAceConfig({
			constellationCount: searchParams.get('constellationCount'),
			constellationConnectDistance: searchParams.get('constellationConnectDistance'),
			constellationPointerMode: searchParams.get('constellationPointerMode'),
			constellationParticleColor: searchParams.get('constellationParticleColor'),
			constellationLineColor: searchParams.get('constellationLineColor'),
			constellationSpeed: searchParams.get('constellationSpeed'),
			backgroundColor: searchParams.get('backgroundColor'),
		});
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
			setPaused: function (paused) { config.PAUSED = !!paused; },
		};
	}

	window.ArtisticCreationEnvironmentConstellation = createAceConstellation;

	if (document.body && document.body.getAttribute('data-artistic-constellation-preview') === '1') {
		window.ArtisticCreationEnvironmentConstellation(document.body);
	}
})();
