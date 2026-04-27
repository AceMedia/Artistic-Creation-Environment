(function () {
	'use strict';

	function parseConfig(node) {
		if (!node) {
			return {};
		}

		try {
			return JSON.parse(node.getAttribute('data-artistic-config') || '{}');
		} catch (error) {
			return {};
		}
	}

	function ensureMarkup(layer) {
		if (!layer.querySelector('canvas')) {
			var canvas = document.createElement('canvas');
			canvas.className = 'artistic-creative__canvas';
			layer.appendChild(canvas);
		}

		if (!layer.querySelector('.artistic-creative__ascii')) {
			var ascii = document.createElement('pre');
			ascii.className = 'artistic-creative__ascii';
			ascii.setAttribute('aria-hidden', 'true');
			layer.appendChild(ascii);
		}

		if (!layer.querySelector('[data-artistic-fluid-status]')) {
			var status = document.createElement('div');
			status.className = 'artistic-creative__status';
			status.setAttribute('data-artistic-fluid-status', '');
			status.setAttribute('aria-live', 'polite');
			layer.appendChild(status);
		}
	}

	function getRuntime(effect) {
		if (effect === 'ascii-world') {
			return window.ArtisticCreationEnvironmentAscii;
		}

		if (effect === 'liquid-splash') {
			return window.ArtisticCreationEnvironmentFluid;
		}

		return null;
	}

	function hasWordPressBlockClass(node) {
		return !!(
			node &&
			node.classList &&
			Array.prototype.some.call(node.classList, function (className) {
				return className.indexOf('wp-block-') === 0;
			})
		);
	}

	function getInteractiveTargetsContainer(block) {
		return block.querySelector('.artistic-creative__inner-container') || null;
	}

	function getInteractiveTargets(block, targetsContainer) {
		var candidates = Array.prototype.filter.call(
			targetsContainer.querySelectorAll('*'),
			function (node) {
				return (
					hasWordPressBlockClass(node) &&
					node.closest('.wp-block-artistic-creation-environment-creative') === block
				);
			}
		);
		var leafTargets = candidates.filter(function (node) {
			return !candidates.some(function (otherNode) {
				return otherNode !== node && node.contains(otherNode);
			});
		});

		return leafTargets.length
			? leafTargets
			: Array.prototype.filter.call(
					targetsContainer.children || [],
					function (node) {
						return node && node.nodeType === 1;
					}
			  );
	}

	function mountChildInteractivity(block) {
		if (
			!block ||
			block.dataset.artisticChildInteractiveMounted === '1' ||
			!block.getAttribute('data-ace-child-interaction-mode')
		) {
			return;
		}

		if (
			window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			return;
		}

		var mode = block.getAttribute('data-ace-child-interaction-mode') || 'none';
		var targetsContainer = getInteractiveTargetsContainer(block);

		if (!targetsContainer || mode === 'none') {
			return;
		}

		var computedStyle = window.getComputedStyle(block);
		var intensity = Math.max(
			0,
			parseFloat(
				computedStyle.getPropertyValue('--ace-child-interaction-intensity')
			) || 0
		);
		var radius = Math.max(
			1,
			parseFloat(
				computedStyle.getPropertyValue('--ace-child-interaction-radius')
			) || 0
		);
		var depth = Math.max(
			0,
			parseFloat(
				computedStyle.getPropertyValue('--ace-child-interaction-depth')
			) || 0
		);
		var idle = Math.max(
			0,
			parseFloat(
				computedStyle.getPropertyValue('--ace-child-interaction-idle')
			) || 0
		);

		if (intensity <= 0 || depth <= 0) {
			return;
		}

		var frameHandle = 0;
		var pointer = { x: 0, y: 0, active: false };
		var nodeStates = new WeakMap();
		targetsContainer.classList.add('artistic-creative__interactive-targets');

		function getTargets() {
			return getInteractiveTargets(block, targetsContainer);
		}

		function getState(node, index) {
			if (!nodeStates.has(node)) {
				nodeStates.set(node, {
					x: 0,
					y: 0,
					scale: 1,
					rotate: 0,
					direction: index % 2 === 0 ? 1 : -1,
				});
			}

			return nodeStates.get(node);
		}

		function update() {
			var targets = getTargets();
			var time = performance.now() * 0.0012;

			targets.forEach(function (node, index) {
				node.classList.add('artistic-creative__interactive-target');
				var state = getState(node, index);
				var rect = node.getBoundingClientRect();
				var centerX = rect.left + rect.width * 0.5;
				var centerY = rect.top + rect.height * 0.5;
				var idleAmount = idle * depth;
				var targetX =
					idleAmount > 0
						? Math.sin(time + index * 0.73) * idleAmount * 0.22
						: 0;
				var targetY =
					idleAmount > 0
						? Math.cos(time * 1.17 + index * 0.61) * idleAmount * 0.18
						: 0;
				var targetScale =
					idleAmount > 0 && mode === 'pulse'
						? 1 + Math.sin(time * 1.35 + index * 0.8) * idle * 0.035
						: 1;
				var targetRotate =
					idleAmount > 0 && (mode === 'orbit' || mode === 'drift')
						? Math.sin(time * 0.82 + index * 0.55) * idle * 3.5
						: 0;

				if (pointer.active) {
					var dx = centerX - pointer.x;
					var dy = centerY - pointer.y;
					var distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
					var force = Math.max(0, 1 - distance / radius);
					var easedForce = force * force * intensity;
					var normalX = dx / distance;
					var normalY = dy / distance;

					if (mode === 'repel') {
						targetX += normalX * depth * easedForce;
						targetY += normalY * depth * easedForce;
						targetRotate += state.direction * easedForce * 7;
					} else if (mode === 'attract') {
						targetX -= normalX * depth * easedForce;
						targetY -= normalY * depth * easedForce;
						targetRotate -= state.direction * easedForce * 6;
					} else if (mode === 'orbit') {
						targetX += -normalY * depth * easedForce * 0.92 * state.direction;
						targetY += normalX * depth * easedForce * 0.92 * state.direction;
						targetScale += easedForce * 0.035;
						targetRotate += state.direction * easedForce * 10;
					} else if (mode === 'drift') {
						targetX +=
							(normalX * 0.35 - normalY * 0.4 * state.direction) *
							depth *
							easedForce;
						targetY +=
							(normalY * 0.28 + normalX * 0.2 * state.direction) *
							depth *
							easedForce;
						targetRotate += normalX * easedForce * 8;
						targetScale += easedForce * 0.02;
					} else if (mode === 'pulse') {
						targetY -= depth * easedForce * 0.22;
						targetScale += easedForce * 0.1;
					}
				}

				state.x += (targetX - state.x) * 0.18;
				state.y += (targetY - state.y) * 0.18;
				state.scale += (targetScale - state.scale) * 0.16;
				state.rotate += (targetRotate - state.rotate) * 0.16;

				node.style.setProperty('--ace-child-offset-x', state.x.toFixed(2) + 'px');
				node.style.setProperty('--ace-child-offset-y', state.y.toFixed(2) + 'px');
				node.style.setProperty('--ace-child-scale', state.scale.toFixed(4));
				node.style.setProperty('--ace-child-rotate', state.rotate.toFixed(2) + 'deg');
			});

			frameHandle = window.requestAnimationFrame(update);
		}

		function onPointerMove(event) {
			pointer.x = event.clientX;
			pointer.y = event.clientY;
			pointer.active = true;
		}

		function onPointerLeave() {
			pointer.active = false;
		}

		function resetTarget(node) {
			node.classList.remove('artistic-creative__interactive-target');
			node.style.removeProperty('--ace-child-offset-x');
			node.style.removeProperty('--ace-child-offset-y');
			node.style.removeProperty('--ace-child-scale');
			node.style.removeProperty('--ace-child-rotate');
		}

		block.addEventListener('pointermove', onPointerMove, true);
		block.addEventListener('pointerleave', onPointerLeave, true);
		block.addEventListener('pointercancel', onPointerLeave, true);
		update();
		block.dataset.artisticChildInteractiveMounted = '1';
		block.__aceChildInteractivityCleanup = function () {
			if (frameHandle) {
				window.cancelAnimationFrame(frameHandle);
				frameHandle = 0;
			}
			block.removeEventListener('pointermove', onPointerMove, true);
			block.removeEventListener('pointerleave', onPointerLeave, true);
			block.removeEventListener('pointercancel', onPointerLeave, true);
			targetsContainer.classList.remove('artistic-creative__interactive-targets');
			getTargets().forEach(resetTarget);
			delete block.__aceChildInteractivityCleanup;
		};
	}

	function initLayers() {
		Array.prototype.forEach.call(
			document.querySelectorAll('.artistic-creative__layer[data-artistic-config]'),
			function (layer) {
				if (layer.dataset.artisticFluidMounted === '1') {
					return;
				}

				var config = parseConfig(layer);
				var runtime = getRuntime(config.effect);

				if (typeof runtime !== 'function') {
					return;
				}

				ensureMarkup(layer);
				runtime(layer, config, {
					interactionSurface: layer.parentElement,
					auraSource: layer.parentElement,
				});
				layer.dataset.artisticFluidMounted = '1';
			}
		);

		Array.prototype.forEach.call(
			document.querySelectorAll(
				'.wp-block-artistic-creation-environment-creative[data-ace-child-interaction-mode]'
			),
			mountChildInteractivity
		);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initLayers);
	} else {
		initLayers();
	}
})();
