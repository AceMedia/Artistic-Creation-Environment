(function () {
	'use strict';

	var RAW_CONFIG = window.ACE_VIEW_TRANSITIONS || {};
	var CONTENT_SELECTORS = String(RAW_CONFIG.contentSelector || '#page, .wp-site-blocks, main, body')
		.split(',')
		.map(function (selector) {
			return selector.trim();
		})
		.filter(Boolean);
	var SITE_URL = RAW_CONFIG.siteUrl || window.location.origin + '/';
	var EXCLUDE_LIST = Array.isArray(RAW_CONFIG.excludeList) ? RAW_CONFIG.excludeList : [];
	var DEBUG_ENABLED = !!RAW_CONFIG.debug;

	function debugLog() {
		if (!DEBUG_ENABLED || !window.console || typeof window.console.debug !== 'function') {
			return;
		}

		var args = Array.prototype.slice.call(arguments);
		args.unshift('[ACE]');
		window.console.debug.apply(window.console, args);
	}

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
		if (effect === 'ascii-world') return window.ArtisticCreationEnvironmentAscii;
		if (effect === 'liquid-splash') return window.ArtisticCreationEnvironmentFluid;
		if (effect === 'aurora-flow') return window.ArtisticCreationEnvironmentAurora;
		if (effect === 'particle-constellation') return window.ArtisticCreationEnvironmentConstellation;
		if (effect === 'neon-topography') return window.ArtisticCreationEnvironmentTopo;
		if (effect === 'glass-caustics') return window.ArtisticCreationEnvironmentCaustics;
		if (effect === 'magnetic-dust') return window.ArtisticCreationEnvironmentDust;
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

	function isLeafInteractiveElement(node, block) {
		if (!node || node.nodeType !== 1 || node.closest('.wp-block-artistic-creation-environment-creative') !== block) {
			return false;
		}

		if (node.matches('.artistic-creative__inner-container, .artistic-creative__layer, .artistic-creative__overlay')) {
			return false;
		}

		if (node.matches('h1, h2, h3, h4, h5, h6, p, figure, blockquote, ul, ol, pre, table, .wp-block-button, .wp-block-buttons, .wp-block-image, .wp-block-heading, .wp-block-quote, .wp-block-pullquote, .wp-block-list, .wp-block-table, .wp-block-preformatted, .wp-block-code')) {
			return true;
		}

		if (!hasWordPressBlockClass(node)) {
			return false;
		}

		return !node.matches('.wp-block-columns, .wp-block-column, .wp-block-group, .wp-block-cover, .wp-block-media-text, .wp-block-artistic-creation-environment-creative');
	}

	function getInteractiveTargets(block, targetsContainer) {
		var candidates = Array.prototype.filter.call(targetsContainer.querySelectorAll('*'), function (node) {
			return isLeafInteractiveElement(node, block);
		});

		var leafTargets = candidates.filter(function (node) {
			return !candidates.some(function (otherNode) {
				return otherNode !== node && node.contains(otherNode);
			});
		});

		return leafTargets.length
			? leafTargets
			: Array.prototype.filter.call(targetsContainer.children || [], function (node) {
					return node && node.nodeType === 1;
			  });
	}

	function mountChildInteractivity(block) {
		if (!block || block.dataset.artisticChildInteractiveMounted === '1' || !block.getAttribute('data-ace-child-interaction-mode')) {
			return;
		}

		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		var mode = block.getAttribute('data-ace-child-interaction-mode') || 'none';
		var targetsContainer = getInteractiveTargetsContainer(block);

		if (!targetsContainer || mode === 'none') {
			return;
		}

		var computedStyle = window.getComputedStyle(block);
		var intensity = Math.max(0, parseFloat(computedStyle.getPropertyValue('--ace-child-interaction-intensity')) || 0);
		var radius = Math.max(1, parseFloat(computedStyle.getPropertyValue('--ace-child-interaction-radius')) || 0);
		var depth = Math.max(0, parseFloat(computedStyle.getPropertyValue('--ace-child-interaction-depth')) || 0);
		var idle = Math.max(0, parseFloat(computedStyle.getPropertyValue('--ace-child-interaction-idle')) || 0);

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
				nodeStates.set(node, { x: 0, y: 0, scale: 1, rotate: 0, direction: index % 2 === 0 ? 1 : -1 });
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
				var targetX = idleAmount > 0 ? Math.sin(time + index * 0.73) * idleAmount * 0.22 : 0;
				var targetY = idleAmount > 0 ? Math.cos(time * 1.17 + index * 0.61) * idleAmount * 0.18 : 0;
				var targetScale = idleAmount > 0 && mode === 'pulse' ? 1 + Math.sin(time * 1.35 + index * 0.8) * idle * 0.035 : 1;
				var targetRotate = idleAmount > 0 && (mode === 'orbit' || mode === 'drift') ? Math.sin(time * 0.82 + index * 0.55) * idle * 3.5 : 0;

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
						targetX += (normalX * 0.35 - normalY * 0.4 * state.direction) * depth * easedForce;
						targetY += (normalY * 0.28 + normalX * 0.2 * state.direction) * depth * easedForce;
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

	function initLayers(root) {
		var scope = root && root.querySelectorAll ? root : document;

		Array.prototype.forEach.call(scope.querySelectorAll('.artistic-creative__layer[data-artistic-config]'), function (layer) {
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
		});

		Array.prototype.forEach.call(scope.querySelectorAll('.wp-block-artistic-creation-environment-creative[data-ace-child-interaction-mode]'), mountChildInteractivity);
	}

	function setDocumentHints(doc) {
		document.documentElement.lang = doc.documentElement.getAttribute('lang') || document.documentElement.lang;
		if (doc.documentElement.dir) {
			document.documentElement.dir = doc.documentElement.dir;
		}
	}

	function applyCssVariables(doc) {
		var newStyle = doc.querySelector('style[data-ace-transition-vars], style#ace-transition-vars');
		var existing = document.head.querySelector('style[data-ace-transition-vars], style#ace-transition-vars');

		if (newStyle) {
			var clone = newStyle.cloneNode(true);
			clone.setAttribute('data-ace-transition-vars', '');
			if (existing && existing.parentNode) {
				existing.parentNode.replaceChild(clone, existing);
			} else {
				document.head.appendChild(clone);
			}
		}
	}

	function enableDocumentTransition() {
		document.documentElement.classList.remove('ace-view-transition-fade-out');
		document.documentElement.classList.remove('ace-view-transition-fade-in');
	}

	function applySharedElementNames(doc) {
		Array.prototype.forEach.call(doc.querySelectorAll('[data-view-transition-name]'), function (node) {
			var name = node.getAttribute('data-view-transition-name');
			if (name) {
				node.style.viewTransitionName = name;
			}
		});
	}

	function stripHash(url) {
		return url.origin + url.pathname + url.search;
	}

	function isEligibleNavigationLink(anchor) {
		if (!anchor || anchor.tagName !== 'A') {
			return false;
		}

		if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
			debugLog('skip: target or download link', anchor.href);
			return false;
		}

		if (anchor.closest('[aria-hidden="true"], [inert]')) {
			debugLog('skip: hidden/inert link', anchor.href);
			return false;
		}

		if (anchor.classList && anchor.classList.contains('ab-item')) {
			debugLog('skip: admin bar link', anchor.href);
			return false;
		}

		var href = anchor.getAttribute('href');
		if (!href || href.charAt(0) === '#') {
			return false;
		}

		var url;
		try {
			url = new URL(href, window.location.href);
		} catch (error) {
			return false;
		}

		if (url.origin !== window.location.origin) {
			debugLog('skip: external URL', url.href);
			return false;
		}

		if (stripHash(url) === stripHash(window.location)) {
			debugLog('skip: hash-only link', url.href);
			return false;
		}

		if (/(?:^|\/)(wp-admin|wp-login\.php|wp-json)(?:\/|$)/.test(url.pathname) || /[?&](preview|customize)=/i.test(url.search + url.hash)) {
			debugLog('skip: wp admin/login/json/preview/customizer', url.href);
			return false;
		}

		if (Array.isArray(EXCLUDE_LIST) && EXCLUDE_LIST.length) {
			for (var i = 0; i < EXCLUDE_LIST.length; i += 1) {
				if (!EXCLUDE_LIST[i]) {
					continue;
				}
				try {
					if (anchor.matches(EXCLUDE_LIST[i]) || anchor.closest(EXCLUDE_LIST[i])) {
						debugLog('skip: excluded selector', EXCLUDE_LIST[i], url.href);
						return false;
					}
				} catch (error) {}
			}
		}

		return true;
	}

	function shouldUseSameDocumentMode() {
		return String(RAW_CONFIG.transitionMode || 'cross-document') === 'same-document';
	}

	function hasReducedMotion() {
		return !!(RAW_CONFIG.respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	}

	function loadPage(url, options) {
		options = options || {};
		return window.fetch(url, {
			credentials: 'same-origin',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'X-ACE-View-Transition': '1',
			},
			redirect: 'follow',
		}).then(function (response) {
			if (!response.ok) {
				throw new Error('Request failed: ' + response.status);
			}
			return response.text();
		}).then(function (html) {
			var parser = new DOMParser();
			var nextDoc = parser.parseFromString(html, 'text/html');
			var nextTitle = nextDoc.title || '';
			var replacement = null;

			for (var i = 0; i < CONTENT_SELECTORS.length; i += 1) {
				replacement = nextDoc.querySelector(CONTENT_SELECTORS[i]);
				if (replacement) {
					break;
				}
			}

			if (!replacement) {
				replacement = nextDoc.body;
			}

			if (!replacement) {
				throw new Error('No replacement root found');
			}

			function swapDocument() {
				document.title = nextTitle;

				var nextBody = nextDoc.body.cloneNode(true);
				document.body.replaceWith(nextBody);
				// Inline scripts are not re-executed here; this is the first stable pass for page-shell swaps.
				setDocumentHints(nextDoc);
				applyCssVariables(nextDoc);
				applySharedElementNames(document);
				initLayers(document.body);
				enableDocumentTransition();
			}

			if (document.startViewTransition) {
				return document.startViewTransition(function () {
					swapDocument();
				}).finished.then(function () {
					return {
						url: url.href,
						title: nextTitle,
						document: nextDoc,
					};
				});
			}

			document.documentElement.classList.add('ace-view-transition-fade-out');
			swapDocument();
			document.documentElement.classList.add('ace-view-transition-fade-in');

			return Promise.resolve({
				url: url.href,
				title: nextTitle,
				document: nextDoc,
			});
		});
	}

	function navigate(url, replaceState) {
		return loadPage(url).then(function (result) {
			if (!replaceState) {
				window.history.pushState({ aceViewTransition: true, url: result.url }, '', result.url);
			} else {
				window.history.replaceState({ aceViewTransition: true, url: result.url }, '', result.url);
			}

			document.dispatchEvent(new CustomEvent('ace:view-transition:navigated', { detail: { url: result.url } }));
			debugLog('navigated', result.url);
		}).catch(function (error) {
			debugLog('navigation failed, falling back', error && error.message ? error.message : error);
			window.location.href = url.href;
		});
	}

	function onDocumentClick(event) {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}

		var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
		if (!anchor || !isEligibleNavigationLink(anchor) || !shouldUseSameDocumentMode() || hasReducedMotion()) {
			if (!shouldUseSameDocumentMode()) {
				debugLog('skip: same-document mode disabled');
			} else if (hasReducedMotion()) {
				debugLog('skip: reduced motion');
			}
			return;
		}

		event.preventDefault();
		debugLog('intercepting navigation', anchor.href);
		navigate(new URL(anchor.getAttribute('href'), window.location.href), false);
	}

	function onPopState(event) {
		if (!shouldUseSameDocumentMode()) {
			return;
		}

		debugLog('popstate', window.location.href);
		loadPage(new URL(window.location.href), { popstate: true }).catch(function () {
			window.location.reload();
		});
	}

	function enableNavigationController() {
		if (!('startViewTransition' in document)) {
			debugLog('unsupported browser: document.startViewTransition missing');
			return;
		}

		if (!shouldUseSameDocumentMode()) {
			return;
		}

		document.addEventListener('click', onDocumentClick, true);
		window.addEventListener('popstate', onPopState);
		debugLog('same-document navigation controller enabled');
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			initLayers(document);
			enableNavigationController();
		});
	} else {
		initLayers(document);
		enableNavigationController();
	}
})();
