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

		if (!layer.querySelector('[data-artistic-fluid-status]')) {
			var status = document.createElement('div');
			status.className = 'artistic-creative__status';
			status.setAttribute('data-artistic-fluid-status', '');
			status.setAttribute('aria-live', 'polite');
			layer.appendChild(status);
		}
	}

	function initLayers() {
		if (typeof window.ArtisticCreationEnvironmentFluid !== 'function') {
			return;
		}

		Array.prototype.forEach.call(
			document.querySelectorAll('.artistic-creative__layer[data-artistic-config]'),
			function (layer) {
				if (layer.dataset.artisticFluidMounted === '1') {
					return;
				}

				ensureMarkup(layer);
				window.ArtisticCreationEnvironmentFluid(layer, parseConfig(layer), {
					interactionSurface: layer.parentElement,
					auraSource: layer.parentElement,
				});
				layer.dataset.artisticFluidMounted = '1';
			}
		);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initLayers);
	} else {
		initLayers();
	}
})();
