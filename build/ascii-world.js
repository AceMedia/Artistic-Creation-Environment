(function () {
'use strict';

var LEGACY_ASCII_BACKGROUND_COLOR = '#020617';

function createAceAsciiWorld (rootElement, initialConfig, options) {
var root = rootElement && rootElement.querySelector ? rootElement : document.body;
var runtimeOptions = options || {};
var interactionSurface = runtimeOptions.interactionSurface && runtimeOptions.interactionSurface.addEventListener ? runtimeOptions.interactionSurface : root;
var messageType = 'artistic-creation-environment-preview';
var searchParams = new URLSearchParams(window.location.search);
var statusNode = root.querySelector('[data-artistic-fluid-status]') || root.querySelector('#status');
var asciiNode = root.querySelector('.artistic-creative__ascii') || root.querySelector('pre');
var canvasNode = root.querySelector('canvas');
var sourceCanvas = document.createElement('canvas');
var sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
var sourceData = null;
var destroyed = false;
var frameHandle = 0;
var sourceImage = null;
var sourceImageUrl = '';
var sourceReady = false;
var sourceAspectRatio = 2.05;
var sourceAsciiLines = [' '];
var sourceAsciiMetrics = { columns: 1, rows: 1 };
var layout = { width: 1, height: 1, columns: 96, rows: 48 };
var pointer = {
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    energy: 0,
    active: false
};
var config = {
    DENSITY: 128,
    FONT_SIZE: 11,
    TINT_COLOR: '#7dd3fc',
    GLOW: 0.38,
    CONTRAST: 1.14,
    MOTION: 0.72,
    INTERACTION: 0.88,
    NOISE: 0.08,
    INVERT: false,
    SOURCE: 'world-map',
    IMAGE_URL: '',
    IMAGE_WIDTH: 0,
    IMAGE_HEIGHT: 0,
    ASCII_TEXT: '',
    CHARSET: 'atlas',
    BACKGROUND_COLOR: 'transparent',
    PAUSED: false
};
var CHARSET_PRESETS = {
    atlas: ' .,:;irsXA253hMHGS#9B&@',
    dense: ' .\'`^",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    glow: '  .:-=+*#%@',
    blocks: '  .:░▒▓█'
};
var hostBlock = root && root.parentElement ? root.parentElement : null;
var nestedCreativeBlock = hostBlock && hostBlock.parentElement
    ? hostBlock.parentElement.closest('.wp-block-artistic-creation-environment-creative')
    : null;

if (!asciiNode || !sourceContext) { return null; }

asciiNode.setAttribute('aria-hidden', 'true');
if (canvasNode) {
    canvasNode.setAttribute('aria-hidden', 'true');
}

function showStatus (message) {
    if (!statusNode) { return; }
    statusNode.textContent = message;
    statusNode.classList.add('visible');
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(function () {
        statusNode.classList.remove('visible');
    }, 1800);
}

function clamp (value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function toNumber (value, fallback) {
    var next = Number(value);
    return Number.isFinite(next) ? next : fallback;
}

function toBool (value, fallback) {
    if (value === undefined || value === null || value === '') { return fallback; }
    if (typeof value === 'boolean') { return value; }
    return value === '1' || value === 'true';
}

function getCharset (preset) {
    return CHARSET_PRESETS[preset] || CHARSET_PRESETS.atlas;
}

function getAsciiMetrics (text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    var widest = 0;

    lines.forEach(function (line) {
        widest = Math.max(widest, line.length);
    });

    return {
        columns: Math.max(1, widest),
        rows: Math.max(1, lines.length)
    };
}

function getAsciiLines (text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n');

    if (!lines.length) {
        return [' '];
    }

    return lines;
}

function getSourceAspectRatio () {
    if (config.SOURCE === 'image') {
        if (config.IMAGE_WIDTH > 0 && config.IMAGE_HEIGHT > 0) {
            return Math.max(0.2, config.IMAGE_WIDTH / config.IMAGE_HEIGHT);
        }

        if (sourceImage && sourceImage.width > 0 && sourceImage.height > 0) {
            return Math.max(0.2, sourceImage.width / sourceImage.height);
        }
    }

    if (config.SOURCE === 'ascii-art' && config.ASCII_TEXT) {
        var metrics = getAsciiMetrics(config.ASCII_TEXT);
        return Math.max(0.2, metrics.columns / metrics.rows);
    }

    return 2.05;
}

function updateAsciiStyle () {
    var width = root.clientWidth || root.offsetWidth || window.innerWidth || 1;
    var height = root.clientHeight || root.offsetHeight || 1;
    var fontSize = clamp(config.FONT_SIZE, 7, 18);
    var letterSpacing = clamp((14 - fontSize) * 0.018, 0, 0.12);
    var characterWidth = Math.max(1, fontSize * (0.58 + (letterSpacing * 0.2)));
    var characterHeight = Math.max(1, fontSize * 0.84);
    var aspectRatio = getSourceAspectRatio();
    var desiredColumns = clamp(Math.round(config.DENSITY * (width / 1200)), 40, 220);
    var columns = clamp(
        Math.min(
            desiredColumns,
            Math.max(24, Math.floor(width / characterWidth)),
            Math.max(24, Math.floor((height * aspectRatio) / characterWidth))
        ),
        24,
        220
    );
    var rows = clamp(
        Math.round((columns * characterWidth) / Math.max(characterHeight * aspectRatio, 1)),
        12,
        160
    );

    asciiNode.style.fontSize = fontSize + 'px';
    asciiNode.style.letterSpacing = letterSpacing + 'em';
    asciiNode.style.lineHeight = '0.84';
    asciiNode.style.color = config.TINT_COLOR;
    asciiNode.style.textShadow = '0 0 ' + Math.round(12 + (config.GLOW * 28)) + 'px ' + config.TINT_COLOR;
    root.style.backgroundColor = config.BACKGROUND_COLOR;
    layout.columns = columns;
    layout.rows = rows;
    sourceAspectRatio = aspectRatio;
}

function resizeSourceCanvas () {
    var width = clamp(Math.round(layout.columns * 2.1), 120, 420);
    var height = clamp(layout.rows, 24, 180);

    if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
        sourceCanvas.width = width;
        sourceCanvas.height = height;
    }

    layout.width = root.clientWidth || root.offsetWidth || 1;
    layout.height = root.clientHeight || root.offsetHeight || 1;
    layout.rows = height;
}

function drawWorldMap () {
    var width = sourceCanvas.width;
    var height = sourceCanvas.height;

    sourceContext.clearRect(0, 0, width, height);
    sourceContext.fillStyle = '#000';
    sourceContext.fillRect(0, 0, width, height);
    sourceContext.fillStyle = '#fff';

    function blob (points) {
        sourceContext.beginPath();
        sourceContext.moveTo(points[0][0] * width, points[0][1] * height);
        for (var index = 1; index < points.length; index++) {
            sourceContext.lineTo(points[index][0] * width, points[index][1] * height);
        }
        sourceContext.closePath();
        sourceContext.fill();
    }

    function dot (x, y, radius) {
        sourceContext.beginPath();
        sourceContext.arc(x * width, y * height, Math.max(1, radius * width), 0, Math.PI * 2);
        sourceContext.fill();
    }

    blob([
        [0.055, 0.245], [0.09, 0.18], [0.14, 0.14], [0.19, 0.13], [0.245, 0.155],
        [0.28, 0.19], [0.295, 0.245], [0.287, 0.29], [0.258, 0.325], [0.23, 0.34],
        [0.214, 0.378], [0.19, 0.445], [0.168, 0.515], [0.142, 0.595], [0.11, 0.64],
        [0.082, 0.612], [0.072, 0.545], [0.083, 0.46], [0.095, 0.39], [0.073, 0.31]
    ]);
    blob([
        [0.18, 0.66], [0.205, 0.635], [0.226, 0.61], [0.244, 0.58], [0.257, 0.536],
        [0.272, 0.485], [0.291, 0.432], [0.314, 0.408], [0.336, 0.425], [0.325, 0.48],
        [0.305, 0.545], [0.286, 0.615], [0.259, 0.708], [0.237, 0.792], [0.205, 0.858],
        [0.176, 0.825], [0.181, 0.748], [0.195, 0.69]
    ]);
    blob([
        [0.318, 0.102], [0.35, 0.076], [0.394, 0.07], [0.424, 0.095], [0.402, 0.134],
        [0.36, 0.145], [0.333, 0.126]
    ]);
    blob([
        [0.37, 0.16], [0.414, 0.118], [0.474, 0.098], [0.548, 0.1], [0.605, 0.125],
        [0.656, 0.155], [0.71, 0.146], [0.778, 0.16], [0.842, 0.145], [0.905, 0.175],
        [0.95, 0.225], [0.925, 0.268], [0.872, 0.282], [0.818, 0.293], [0.766, 0.306],
        [0.722, 0.337], [0.692, 0.365], [0.646, 0.382], [0.594, 0.386], [0.548, 0.345],
        [0.512, 0.312], [0.467, 0.286], [0.42, 0.248], [0.382, 0.205]
    ]);
    blob([
        [0.48, 0.345], [0.525, 0.362], [0.568, 0.408], [0.558, 0.498], [0.535, 0.595],
        [0.51, 0.705], [0.474, 0.81], [0.44, 0.762], [0.447, 0.648], [0.43, 0.552],
        [0.412, 0.47], [0.425, 0.388]
    ]);
    blob([
        [0.78, 0.59], [0.82, 0.566], [0.876, 0.59], [0.907, 0.66], [0.886, 0.738],
        [0.834, 0.79], [0.79, 0.762], [0.768, 0.674]
    ]);
    blob([
        [0.704, 0.426], [0.73, 0.41], [0.755, 0.428], [0.746, 0.468], [0.716, 0.474]
    ]);
    blob([
        [0.742, 0.382], [0.758, 0.368], [0.772, 0.387], [0.762, 0.41], [0.744, 0.404]
    ]);
    blob([
        [0.635, 0.452], [0.651, 0.447], [0.66, 0.465], [0.651, 0.496], [0.636, 0.492]
    ]);
    blob([
        [0.154, 0.57], [0.176, 0.556], [0.198, 0.568], [0.186, 0.595], [0.165, 0.603]
    ]);
    dot(0.865, 0.424, 0.008);
    dot(0.884, 0.456, 0.006);
    dot(0.901, 0.488, 0.006);
    dot(0.93, 0.84, 0.01);
    dot(0.952, 0.882, 0.007);
    dot(0.455, 0.182, 0.007);
    dot(0.472, 0.198, 0.006);

    sourceReady = true;
    sourceData = sourceContext.getImageData(0, 0, width, height).data;
}

function loadImageSource (imageUrl) {
    sourceReady = false;

    if (!imageUrl) {
        sourceImage = null;
        sourceImageUrl = '';
        sourceAspectRatio = 2.05;
        drawWorldMap();
        return;
    }

    if (sourceImageUrl === imageUrl && sourceImage) {
        sourceReady = true;
        return;
    }

    sourceImageUrl = imageUrl;
    sourceImage = new Image();
    sourceImage.crossOrigin = 'anonymous';
    sourceImage.onload = function () {
        if (destroyed || !sourceContext) { return; }
        var width = sourceCanvas.width;
        var height = sourceCanvas.height;
        sourceAspectRatio = Math.max(0.2, sourceImage.width / Math.max(sourceImage.height, 1));
        var scale = Math.min(width / sourceImage.width, height / sourceImage.height);
        var renderWidth = sourceImage.width * scale;
        var renderHeight = sourceImage.height * scale;
        var offsetX = (width - renderWidth) / 2;
        var offsetY = (height - renderHeight) / 2;

        sourceContext.clearRect(0, 0, width, height);
        sourceContext.fillStyle = '#000';
        sourceContext.fillRect(0, 0, width, height);
        sourceContext.drawImage(sourceImage, offsetX, offsetY, renderWidth, renderHeight);
        sourceReady = true;
        sourceData = sourceContext.getImageData(0, 0, width, height).data;
    };
    sourceImage.onerror = function () {
        sourceImage = null;
        drawWorldMap();
        showStatus('ASCII image fallback active');
    };
    sourceImage.src = imageUrl;
}

function refreshSource () {
    sourceAspectRatio = getSourceAspectRatio();
    resizeSourceCanvas();
    if (config.SOURCE === 'ascii-art') {
        sourceAsciiLines = getAsciiLines(config.ASCII_TEXT);
        sourceAsciiMetrics = getAsciiMetrics(config.ASCII_TEXT);
        sourceReady = true;
        sourceData = null;
        sourceImage = null;
        sourceImageUrl = '';
        return;
    }

    if (config.SOURCE === 'image' && config.IMAGE_URL) {
        loadImageSource(config.IMAGE_URL);
        return;
    }

    sourceImage = null;
    sourceImageUrl = '';
    drawWorldMap();
}

function sampleBrightness (u, v) {
    if (!sourceReady || !sourceData) {
        return 0;
    }

    var sampleX = clamp(Math.round(u * (sourceCanvas.width - 1)), 0, sourceCanvas.width - 1);
    var sampleY = clamp(Math.round(v * (sourceCanvas.height - 1)), 0, sourceCanvas.height - 1);
    var index = (sampleY * sourceCanvas.width + sampleX) * 4;
    var alpha = sourceData[index + 3] / 255;
    var luma = ((sourceData[index] * 0.2126) + (sourceData[index + 1] * 0.7152) + (sourceData[index + 2] * 0.0722)) / 255;
    return clamp(luma * alpha, 0, 1);
}

function sampleAsciiCharacter (u, v) {
    var safeU = clamp(u, 0, 1);
    var safeV = clamp(v, 0, 1);
    var lineIndex = clamp(
        Math.round(safeV * Math.max(sourceAsciiMetrics.rows - 1, 0)),
        0,
        Math.max(sourceAsciiMetrics.rows - 1, 0)
    );
    var line = sourceAsciiLines[lineIndex] || '';
    var characterIndex = clamp(
        Math.round(safeU * Math.max(sourceAsciiMetrics.columns - 1, 0)),
        0,
        Math.max(sourceAsciiMetrics.columns - 1, 0)
    );

    return line.charAt(characterIndex) || ' ';
}

function applyAceConfig (nextConfig) {
    if (!nextConfig) { return; }

    config.DENSITY = clamp(toNumber(nextConfig.asciiDensity, config.DENSITY), 48, 240);
    config.FONT_SIZE = clamp(toNumber(nextConfig.asciiFontSize, config.FONT_SIZE), 7, 18);
    config.TINT_COLOR = nextConfig.asciiTintColor || config.TINT_COLOR;
    config.GLOW = clamp(toNumber(nextConfig.asciiGlow, config.GLOW), 0, 1);
    config.CONTRAST = clamp(toNumber(nextConfig.asciiContrast, config.CONTRAST), 0.4, 2.6);
    config.MOTION = clamp(toNumber(nextConfig.asciiMotion, config.MOTION), 0, 2);
    config.INTERACTION = clamp(toNumber(nextConfig.asciiInteraction, config.INTERACTION), 0, 2);
    config.NOISE = clamp(toNumber(nextConfig.asciiNoise, config.NOISE), 0, 0.4);
    config.INVERT = toBool(nextConfig.asciiInvert, config.INVERT);
    config.SOURCE =
        nextConfig.asciiSource === 'image'
            ? 'image'
            : nextConfig.asciiSource === 'ascii-art'
                ? 'ascii-art'
                : 'world-map';
    config.IMAGE_URL = nextConfig.asciiImageUrl || '';
    config.IMAGE_WIDTH = Math.max(0, toNumber(nextConfig.asciiImageWidth, config.IMAGE_WIDTH) || 0);
    config.IMAGE_HEIGHT = Math.max(0, toNumber(nextConfig.asciiImageHeight, config.IMAGE_HEIGHT) || 0);
    config.ASCII_TEXT = String(nextConfig.asciiCustomText || '');
    config.CHARSET = nextConfig.asciiCharacterSet || config.CHARSET;
    config.BACKGROUND_COLOR =
        nextConfig.backgroundColor &&
        String(nextConfig.backgroundColor).toLowerCase() !== LEGACY_ASCII_BACKGROUND_COLOR
            ? nextConfig.backgroundColor
            : 'transparent';

    updateAsciiStyle();
    refreshSource();
}

function onMessage (event) {
    if (!event.data || event.data.type !== messageType) { return; }
    applyAceConfig(event.data.config || {});
    showStatus('ASCII preview updated');
}

function updatePointer (clientX, clientY) {
    var rect = interactionSurface.getBoundingClientRect ? interactionSurface.getBoundingClientRect() : root.getBoundingClientRect();
    pointer.targetX = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    pointer.targetY = clamp((clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
    pointer.energy = 1;
    pointer.active = true;
}

function onMouseMove (event) {
    updatePointer(event.clientX, event.clientY);
}

function onTouchMove (event) {
    if (!event.targetTouches || !event.targetTouches[0]) { return; }
    updatePointer(event.targetTouches[0].clientX, event.targetTouches[0].clientY);
}

function onMouseLeave () {
    pointer.active = false;
}

function resizeAscii () {
    var width = root.clientWidth || root.offsetWidth || 1;
    var height = root.clientHeight || root.offsetHeight || 1;

    if (layout.width !== width || layout.height !== height) {
        layout.width = width;
        layout.height = height;
        updateAsciiStyle();
        refreshSource();
        return true;
    }

    return false;
}

function renderAscii () {
    var charset = getCharset(config.CHARSET);
    var now = Date.now() * 0.001;
    var motionTime = now * (0.28 + (config.MOTION * 0.72));
    var output = [];

    pointer.x += (pointer.targetX - pointer.x) * 0.14;
    pointer.y += (pointer.targetY - pointer.y) * 0.14;
    pointer.energy *= pointer.active ? 0.96 : 0.88;
    if (pointer.energy < 0.015) {
        pointer.active = false;
    }

    for (var row = 0; row < layout.rows; row++) {
        var rowChars = '';
        for (var column = 0; column < layout.columns; column++) {
            var u = layout.columns > 1 ? column / (layout.columns - 1) : 0;
            var v = layout.rows > 1 ? row / (layout.rows - 1) : 0;
            var driftX = ((Math.sin((v * 9.5) + motionTime) * 0.014) + (Math.cos((row * 0.17) - (motionTime * 0.7)) * 0.006)) * config.MOTION;
            var driftY = ((Math.cos((u * 7.5) - (motionTime * 1.15)) * 0.012) + (Math.sin((column * 0.11) + (motionTime * 0.55)) * 0.004)) * config.MOTION;
            var offsetU = u + driftX;
            var offsetV = v + driftY;

            if (pointer.active) {
                var dx = u - pointer.x;
                var dy = v - pointer.y;
                var distance = Math.sqrt((dx * dx) + (dy * dy));
                var influence = Math.max(0, 1 - (distance / 0.26)) * pointer.energy * config.INTERACTION;
                offsetU -= dx * influence * 0.16;
                offsetV -= dy * influence * 0.22;
            }

            if (config.SOURCE === 'ascii-art') {
                var asciiNoise = ((Math.sin((column * 9.913) + (row * 6.271) + (motionTime * 22.4)) + 1) * 0.5) * config.NOISE;
                var asciiOffsetU = offsetU + ((asciiNoise - 0.25) * 0.04);
                var asciiOffsetV = offsetV + ((asciiNoise - 0.25) * 0.07);
                rowChars += sampleAsciiCharacter(asciiOffsetU, asciiOffsetV);
                continue;
            }

            var brightness = sampleBrightness(clamp(offsetU, 0, 1), clamp(offsetV, 0, 1));
            if (brightness <= 0.035) {
                rowChars += charset.charAt(0);
                continue;
            }

            var normalizedLand = clamp((brightness - 0.035) / 0.965, 0, 1);
            var contrastBrightness = clamp(((normalizedLand - 0.42) * config.CONTRAST) + 0.62, 0, 1);
            var landPresence = clamp((brightness - 0.035) / 0.22, 0, 1);
            var noise = ((Math.sin((column * 12.9898) + (row * 78.233) + (motionTime * 34.7)) + 1) * 0.5) * config.NOISE * landPresence;
            var finalBrightness = clamp((contrastBrightness * 0.78) + 0.22 + noise, 0, 1);

            if (config.INVERT) {
                finalBrightness = 1 - finalBrightness;
            }

            rowChars += charset.charAt(Math.round(finalBrightness * (charset.length - 1)));
        }
        output.push(rowChars);
    }

    asciiNode.textContent = output.join('\n');
}

function update () {
    if (destroyed) { return; }
    if (!config.PAUSED) {
        resizeAscii();
        renderAscii();
    }

    frameHandle = requestAnimationFrame(update);
}

    applyAceConfig(Object.assign({
    asciiDensity: searchParams.get('asciiDensity'),
    asciiFontSize: searchParams.get('asciiFontSize'),
    asciiTintColor: searchParams.get('asciiTintColor'),
    asciiGlow: searchParams.get('asciiGlow'),
    asciiContrast: searchParams.get('asciiContrast'),
    asciiMotion: searchParams.get('asciiMotion'),
    asciiInteraction: searchParams.get('asciiInteraction'),
    asciiNoise: searchParams.get('asciiNoise'),
    asciiInvert: searchParams.get('asciiInvert'),
    asciiSource: searchParams.get('asciiSource'),
    asciiImageUrl: searchParams.get('asciiImageUrl'),
    asciiImageWidth: searchParams.get('asciiImageWidth'),
    asciiImageHeight: searchParams.get('asciiImageHeight'),
    asciiCustomText: searchParams.get('asciiCustomText'),
    asciiCharacterSet: searchParams.get('asciiCharacterSet'),
    backgroundColor: searchParams.get('backgroundColor')
}, initialConfig || {}));

window.addEventListener('message', onMessage);
interactionSurface.addEventListener('mousemove', onMouseMove, true);
interactionSurface.addEventListener('touchmove', onTouchMove, { passive: true, capture: true });
interactionSurface.addEventListener('mouseleave', onMouseLeave, true);
update();

return {
    applyConfig: applyAceConfig,
    destroy: function destroy () {
        if (destroyed) { return; }
        destroyed = true;
        if (frameHandle) {
            cancelAnimationFrame(frameHandle);
            frameHandle = 0;
        }
        window.removeEventListener('message', onMessage);
        interactionSurface.removeEventListener('mousemove', onMouseMove, true);
        interactionSurface.removeEventListener('touchmove', onTouchMove, true);
        interactionSurface.removeEventListener('mouseleave', onMouseLeave, true);
    },
    setPaused: function setPaused (paused) {
        config.PAUSED = !!paused;
    }
};
}

window.ArtisticCreationEnvironmentAscii = createAceAsciiWorld;

if (document.body && document.body.getAttribute('data-artistic-ascii-preview') === '1') {
    window.ArtisticCreationEnvironmentAscii(document.body);
}
})();
