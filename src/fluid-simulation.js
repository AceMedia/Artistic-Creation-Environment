/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function () {
'use strict';

var runtimeScript = document.currentScript || document.querySelector('#artistic-creation-environment-runtime-js');
var runtimeBaseUrl = '';

if (runtimeScript && runtimeScript.src) {
    runtimeBaseUrl = runtimeScript.src.split('?')[0].replace(/[^/]+$/, '');
}

// Adapted for Artistic Creation Environment.

function createAceFluidSimulation (rootElement, initialConfig, options) {
var root = rootElement && rootElement.querySelector ? rootElement : document;
var runtimeOptions = options || {};
var interactionSurface = runtimeOptions.interactionSurface && runtimeOptions.interactionSurface.addEventListener ? runtimeOptions.interactionSurface : root;
var auraSource = runtimeOptions.auraSource && runtimeOptions.auraSource.querySelectorAll ? runtimeOptions.auraSource : interactionSurface;
var messageType = 'artistic-creation-environment-preview';
var statusNode = root.querySelector('[data-artistic-fluid-status]') || root.querySelector('#status');
var searchParams = new URLSearchParams(window.location.search);

var canvas = root.querySelector('canvas');
if (!canvas) { return null; }
resizeCanvas();

var backdropPresets = {
    aurora: { r: 28, g: 18, b: 38 },
    lagoon: { r: 12, g: 42, b: 40 },
    candy: { r: 56, g: 24, b: 44 },
    sunset: { r: 70, g: 34, b: 28 },
    frost: { r: 34, g: 38, b: 56 }
};

var config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 0.45,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    PARTICLE_SHAPE: 'soft',
    PARTICLE_SPREAD: 0.36,
    FLOW_JITTER: 0.22,
    SHADING: true,
    COLORFUL: true,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    AUTOPLAY: true,
    AUTOPLAY_INTENSITY: 0.8,
    AUTOPLAY_EASING: 1.6,
    HOVER: true,
    TOUCH: true,
    TILT: false,
    WEBCAM_MOTION: false,
    WEBCAM_COLOR_MIX: false,
    WEBCAM_INTENSITY: 0.85,
    AUDIO_INPUT: 'off',
    AUDIO_INTENSITY: 0.85,
    COLOR_BOOST: 1.8,
    AURA_MODE: false,
    BACKDROP_STYLE: 'aurora',
    BACK_COLOR: { r: 16, g: 26, b: 58 },
    TRANSPARENT: false,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.36,
    BLOOM_THRESHOLD: 0.78,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: false,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
};

var tiltPermissionRequested = false;
var tiltState = {
    lastBeta: null,
    lastGamma: null,
    lastImpulseTime: 0
};
var auraPalette = [];
var auraRefreshTimer = 0;
var frameHandle = 0;
var destroyed = false;
var autoplayPulseAccumulator = 0.0;
var autoplayBloomBoost = 0.0;
var autoplayFocus = createAutoplayFocus();
var growingSplatBursts = [];
var webcamState = {
    supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    requested: false,
    enabled: false,
    stream: null,
    video: null,
    canvas: null,
    context: null,
    previousFrame: null,
    lastSampleTime: 0,
    previousCentroid: null,
    averageColor: { r: 0.34, g: 0.24, b: 0.4 },
    unsupportedNoticeShown: false
};
var audioState = {
    mode: 'off',
    stream: null,
    context: null,
    analyser: null,
    source: null,
    frequencyData: null,
    requested: false,
    enabled: false,
    unsupportedNoticeShown: false,
    lastSampleTime: 0,
    bass: 0,
    treble: 0,
    energy: 0,
    autoplayBoost: 0,
    bloomBoost: 0
};

function showStatus (message) {
    if (!statusNode) { return; }
    statusNode.textContent = message;
    statusNode.classList.add('visible');
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(function () {
        statusNode.classList.remove('visible');
    }, 1800);
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

function clamp (value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function resolveBackdropStyle (style) {
    return backdropPresets[style] ? style : 'aurora';
}

function normalizedToByteColor (color) {
    return {
        r: Math.round(clamp(color.r, 0, 1) * 255),
        g: Math.round(clamp(color.g, 0, 1) * 255),
        b: Math.round(clamp(color.b, 0, 1) * 255)
    };
}

function applyBackdropColor (colorValue, legacyStyle) {
    var parsed = parseCssColor(colorValue);
    config.BACKDROP_STYLE = resolveBackdropStyle(legacyStyle || config.BACKDROP_STYLE);
    config.BACK_COLOR = parsed ? normalizedToByteColor(parsed) : backdropPresets[config.BACKDROP_STYLE];
}

function amplifyColor (color, multiplier) {
    return preserveColorContrast(softLimitColor({
        r: color.r * multiplier,
        g: color.g * multiplier,
        b: color.b * multiplier
    }, 0.92), 0.28, 0.92);
}

function softLimitColor (color, maxChannel) {
    var peak = Math.max(color.r, color.g, color.b);
    if (peak <= maxChannel || peak <= 0.0001) {
        return color;
    }

    var scale = maxChannel / peak;
    return {
        r: color.r * scale,
        g: color.g * scale,
        b: color.b * scale
    };
}

function preserveColorContrast (color, amount, maxChannel) {
    var average = (color.r + color.g + color.b) / 3;
    return softLimitColor({
        r: average + ((color.r - average) * (1 + amount)),
        g: average + ((color.g - average) * (1 + amount)),
        b: average + ((color.b - average) * (1 + amount))
    }, maxChannel);
}

function mixColors (from, to, amount) {
    var blend = clamp(amount, 0, 1);
    return {
        r: from.r + ((to.r - from.r) * blend),
        g: from.g + ((to.g - from.g) * blend),
        b: from.b + ((to.b - from.b) * blend)
    };
}

function rotateVector (x, y, angle) {
    var cosine = Math.cos(angle);
    var sine = Math.sin(angle);
    return {
        x: (x * cosine) - (y * sine),
        y: (x * sine) + (y * cosine)
    };
}

function mapDissipationControl (value, exponent) {
    var normalized = clamp(value / 4, 0, 1);
    return Math.pow(normalized, exponent) * 4;
}

function parseCssColor (value) {
    if (!value) { return null; }

    var rgbMatch = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (rgbMatch) {
        return {
            r: clamp(parseFloat(rgbMatch[1]) / 255, 0, 1),
            g: clamp(parseFloat(rgbMatch[2]) / 255, 0, 1),
            b: clamp(parseFloat(rgbMatch[3]) / 255, 0, 1)
        };
    }

    var hex = value.replace('#', '').trim();
    if (hex.length === 3) {
        hex = hex.split('').map(function (char) { return char + char; }).join('');
    }
    if (hex.length !== 6) { return null; }

    var numeric = parseInt(hex, 16);
    if (!Number.isFinite(numeric)) { return null; }

    return {
        r: ((numeric >> 16) & 255) / 255,
        g: ((numeric >> 8) & 255) / 255,
        b: (numeric & 255) / 255
    };
}

function toFluidAuraColor (color) {
    return softLimitColor({
        r: color.r * 0.24 * config.COLOR_BOOST,
        g: color.g * 0.24 * config.COLOR_BOOST,
        b: color.b * 0.24 * config.COLOR_BOOST
    }, 0.88);
}

function getAverageImageColor (img) {
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
        return null;
    }

    try {
        var sampleCanvas = document.createElement('canvas');
        var sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
        var width = 24;
        var height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * width));

        if (!sampleContext) { return null; }

        sampleCanvas.width = width;
        sampleCanvas.height = height;
        sampleContext.drawImage(img, 0, 0, width, height);

        var data = sampleContext.getImageData(0, 0, width, height).data;
        var r = 0;
        var g = 0;
        var b = 0;
        var count = 0;

        for (var i = 0; i < data.length; i += 4) {
            var alpha = data[i + 3] / 255;
            if (alpha < 0.2) { continue; }
            r += data[i] * alpha;
            g += data[i + 1] * alpha;
            b += data[i + 2] * alpha;
            count += alpha;
        }

        if (count <= 0) { return null; }

        return {
            r: clamp((r / count) / 255, 0, 1),
            g: clamp((g / count) / 255, 0, 1),
            b: clamp((b / count) / 255, 0, 1)
        };
    } catch (error) {
        return null;
    }
}

function isVisibleAuraNode (node) {
    if (!node || node === root || !node.matches) { return false; }
    if (node.closest('.artistic-creative__layer, .artistic-creative__overlay')) { return false; }
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') { return false; }

    var style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') < 0.05) {
        return false;
    }

    return true;
}

function refreshAuraPalette () {
    if (!config.AURA_MODE || !auraSource || !auraSource.querySelectorAll) {
        auraPalette = [];
        return;
    }

    var palette = [];
    var seen = {};
    var nodes = auraSource.querySelectorAll('*');

    for (var i = 0; i < nodes.length && palette.length < 12; i++) {
        var node = nodes[i];
        if (!isVisibleAuraNode(node)) { continue; }

        var textValue = (node.textContent || '').trim();
        if (textValue) {
            var textColor = parseCssColor(window.getComputedStyle(node).color);
            if (textColor) {
                var textKey = [Math.round(textColor.r * 255), Math.round(textColor.g * 255), Math.round(textColor.b * 255)].join('-');
                if (!seen[textKey]) {
                    palette.push(toFluidAuraColor(textColor));
                    seen[textKey] = true;
                }
            }
        }

        if (node.tagName === 'IMG') {
            var imageColor = getAverageImageColor(node);
            if (imageColor) {
                var imageKey = [Math.round(imageColor.r * 255), Math.round(imageColor.g * 255), Math.round(imageColor.b * 255)].join('-');
                if (!seen[imageKey]) {
                    palette.push(toFluidAuraColor(imageColor));
                    seen[imageKey] = true;
                }
            }
        }
    }

    auraPalette = palette;
}

function blendAuraColor (color) {
    if (!config.AURA_MODE || auraPalette.length === 0) {
        return color;
    }

    var aura = auraPalette[Math.floor(Math.random() * auraPalette.length)];
    return softLimitColor({
        r: color.r * 0.42 + aura.r * 0.58,
        g: color.g * 0.42 + aura.g * 0.58,
        b: color.b * 0.42 + aura.b * 0.58
    }, 0.9);
}

function maybeRequestTiltAccess () {
    if (!config.TILT || tiltPermissionRequested) { return; }
    if (typeof DeviceOrientationEvent === 'undefined') {
        showStatus('Tilt unavailable on this device');
        return;
    }
    if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
        tiltPermissionRequested = true;
        showStatus('Tilt enabled when supported');
        return;
    }

    tiltPermissionRequested = true;
    DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === 'granted') {
            showStatus('Tilt interaction enabled');
            return;
        }

        showStatus('Tilt access denied');
    }).catch(function () {
        showStatus('Tilt access unavailable');
    });
}

function stopWebcamMotion () {
    if (webcamState.stream) {
        webcamState.stream.getTracks().forEach(function (track) {
            track.stop();
        });
    }

    webcamState.requested = false;
    webcamState.enabled = false;
    webcamState.stream = null;
    webcamState.video = null;
    webcamState.canvas = null;
    webcamState.context = null;
    webcamState.previousFrame = null;
    webcamState.lastSampleTime = 0;
    webcamState.previousCentroid = null;
    webcamState.averageColor = { r: 0.34, g: 0.24, b: 0.4 };
}

function startWebcamMotion () {
    if (!config.WEBCAM_MOTION || webcamState.requested || webcamState.enabled) { return; }
    if (!webcamState.supported) {
        if (!webcamState.unsupportedNoticeShown) {
            webcamState.unsupportedNoticeShown = true;
            showStatus('WebCam motion unavailable');
        }
        return;
    }

    webcamState.requested = true;
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 180 }
        }
    }).then(function (stream) {
        if (destroyed || !config.WEBCAM_MOTION) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            webcamState.requested = false;
            return;
        }

        var video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('aria-hidden', 'true');
        video.srcObject = stream;

        var sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 96;
        sampleCanvas.height = 54;
        var sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
        if (!sampleContext) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            webcamState.requested = false;
            webcamState.enabled = false;
            showStatus('WebCam motion unavailable');
            return;
        }

        webcamState.stream = stream;
        webcamState.video = video;
        webcamState.canvas = sampleCanvas;
        webcamState.context = sampleContext;
        webcamState.previousFrame = null;
        webcamState.previousCentroid = null;
        webcamState.lastSampleTime = 0;

        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function () {});
        }

        webcamState.enabled = true;
        showStatus('WebCam motion enabled');
    }).catch(function () {
        webcamState.requested = false;
        webcamState.enabled = false;
        showStatus('WebCam access denied');
    });
}

function stopAudioInput () {
    if (audioState.stream) {
        audioState.stream.getTracks().forEach(function (track) {
            track.stop();
        });
    }
    if (audioState.source) {
        try {
            audioState.source.disconnect();
        } catch (error) {}
    }
    if (audioState.analyser) {
        try {
            audioState.analyser.disconnect();
        } catch (error$1) {}
    }
    if (audioState.context && audioState.context.state !== 'closed') {
        audioState.context.close().catch(function () {});
    }

    audioState.mode = 'off';
    audioState.stream = null;
    audioState.context = null;
    audioState.analyser = null;
    audioState.source = null;
    audioState.frequencyData = null;
    audioState.requested = false;
    audioState.enabled = false;
    audioState.lastSampleTime = 0;
    audioState.bass = 0;
    audioState.treble = 0;
    audioState.energy = 0;
    audioState.autoplayBoost = 0;
    audioState.bloomBoost = 0;
}

function startAudioInput () {
    var targetMode = config.AUDIO_INPUT || 'off';
    if (targetMode === 'off') { return; }
    if (audioState.requested || audioState.enabled) {
        if (audioState.mode === targetMode) { return; }
        stopAudioInput();
    }

    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!navigator.mediaDevices || !AudioContextClass) {
        if (!audioState.unsupportedNoticeShown) {
            audioState.unsupportedNoticeShown = true;
            showStatus('Audio input unavailable');
        }
        return;
    }

    audioState.requested = true;
    var mediaPromise;
    if (targetMode === 'microphone') {
        mediaPromise = navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });
    } else {
        if (!navigator.mediaDevices.getDisplayMedia) {
            audioState.requested = false;
            showStatus('System audio unavailable');
            return;
        }
        mediaPromise = navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
    }

    mediaPromise.then(function (stream) {
        if (destroyed || (config.AUDIO_INPUT || 'off') !== targetMode) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            audioState.requested = false;
            return;
        }

        var audioTracks = stream.getAudioTracks();
        if (!audioTracks.length) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            audioState.requested = false;
            audioState.enabled = false;
            showStatus(targetMode === 'system' ? 'No system audio shared' : 'Microphone unavailable');
            return;
        }

        var context = new AudioContextClass();
        var analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.82;
        var source = context.createMediaStreamSource(stream);
        source.connect(analyser);

        audioState.mode = targetMode;
        audioState.stream = stream;
        audioState.context = context;
        audioState.analyser = analyser;
        audioState.source = source;
        audioState.frequencyData = new Uint8Array(analyser.frequencyBinCount);
        audioState.requested = false;
        audioState.enabled = true;
        audioState.lastSampleTime = 0;

        if (context.state === 'suspended') {
            context.resume().catch(function () {});
        }

        showStatus(targetMode === 'system' ? 'System audio enabled' : 'Microphone enabled');
    }).catch(function () {
        audioState.requested = false;
        audioState.enabled = false;
        showStatus(targetMode === 'system' ? 'System audio denied' : 'Microphone access denied');
    });
}

function syncSensorInputs () {
    if (config.WEBCAM_MOTION) {
        startWebcamMotion();
    } else if (webcamState.enabled || webcamState.requested) {
        stopWebcamMotion();
    }

    if ((config.AUDIO_INPUT || 'off') !== 'off') {
        startAudioInput();
    } else if (audioState.enabled || audioState.requested) {
        stopAudioInput();
    }
}

function updateWebcamMotion (dt) {
    if (!config.WEBCAM_MOTION || !webcamState.enabled || !webcamState.video || !webcamState.context || config.PAUSED) {
        return;
    }
    if (webcamState.video.readyState < 2) { return; }

    webcamState.lastSampleTime += dt;
    if (webcamState.lastSampleTime < 0.085) { return; }
    webcamState.lastSampleTime = 0;

    var sampleCanvas = webcamState.canvas;
    var sampleContext = webcamState.context;
    var video = webcamState.video;
    var width = sampleCanvas.width;
    var height = sampleCanvas.height;

    sampleContext.save();
    sampleContext.scale(-1, 1);
    sampleContext.drawImage(video, -width, 0, width, height);
    sampleContext.restore();

    var frame = sampleContext.getImageData(0, 0, width, height).data;
    if (!webcamState.previousFrame) {
        webcamState.previousFrame = new Uint8ClampedArray(frame);
        return;
    }

    var columns = 6;
    var rows = 4;
    var cellWidth = Math.floor(width / columns);
    var cellHeight = Math.floor(height / rows);
    var strongestCells = [];
    var totalMotion = 0;
    var centroidX = 0;
    var centroidY = 0;
    var averageR = 0;
    var averageG = 0;
    var averageB = 0;
    var averageSamples = 0;

    for (var row = 0; row < rows; row++) {
        for (var column = 0; column < columns; column++) {
            var diff = 0;
            var samples = 0;

            for (var y = row * cellHeight; y < Math.min(height, (row + 1) * cellHeight); y += 2) {
                for (var x = column * cellWidth; x < Math.min(width, (column + 1) * cellWidth); x += 2) {
                    var index = ((y * width) + x) * 4;
                    averageR += frame[index];
                    averageG += frame[index + 1];
                    averageB += frame[index + 2];
                    averageSamples++;
                    var luminance = (frame[index] * 0.299) + (frame[index + 1] * 0.587) + (frame[index + 2] * 0.114);
                    var previous = (webcamState.previousFrame[index] * 0.299) + (webcamState.previousFrame[index + 1] * 0.587) + (webcamState.previousFrame[index + 2] * 0.114);
                    diff += Math.abs(luminance - previous) / 255;
                    samples++;
                }
            }

            var normalized = samples > 0 ? diff / samples : 0;
            if (normalized < 0.055) { continue; }

            var pointX = (column + 0.5) / columns;
            var pointY = (row + 0.5) / rows;
            totalMotion += normalized;
            centroidX += pointX * normalized;
            centroidY += pointY * normalized;
            strongestCells.push({
                motion: normalized,
                x: pointX,
                y: pointY
            });
        }
    }

    webcamState.previousFrame = new Uint8ClampedArray(frame);

    if (averageSamples > 0) {
        var sampledAverageColor = preserveColorContrast(softLimitColor({
            r: averageR / (averageSamples * 255),
            g: averageG / (averageSamples * 255),
            b: averageB / (averageSamples * 255)
        }, 0.76), 0.2, 0.76);
        webcamState.averageColor = {
            r: (webcamState.averageColor.r * 0.76) + (sampledAverageColor.r * 0.24),
            g: (webcamState.averageColor.g * 0.76) + (sampledAverageColor.g * 0.24),
            b: (webcamState.averageColor.b * 0.76) + (sampledAverageColor.b * 0.24)
        };
    }

    if (totalMotion <= 0.12 || strongestCells.length === 0) {
        webcamState.previousCentroid = null;
        return;
    }

    centroidX /= totalMotion;
    centroidY /= totalMotion;
    strongestCells.sort(function (a, b) {
        return b.motion - a.motion;
    });

    var centroid = { x: centroidX, y: centroidY };
    var centroidDx = 0;
    var centroidDy = 0;
    if (webcamState.previousCentroid) {
        centroidDx = correctDeltaX(centroid.x - webcamState.previousCentroid.x);
        centroidDy = correctDeltaY(centroid.y - webcamState.previousCentroid.y);
    }
    webcamState.previousCentroid = centroid;

    var motionPhase = clamp((totalMotion - 0.12) * 2.8 * config.WEBCAM_INTENSITY, 0, 1);
    var webcamForce = (160 + (motionPhase * 380)) * config.WEBCAM_INTENSITY;
    var webcamRadius = 0.26 + (motionPhase * 0.3);
    var limit = Math.min(2, strongestCells.length);

    for (var i = 0; i < limit; i++) {
        var cell = strongestCells[i];
        var localX = cell.x - centroid.x;
        var localY = cell.y - centroid.y;
        var dx = (centroidDx * 5200 * config.WEBCAM_INTENSITY) + (localX * webcamForce);
        var dy = (centroidDy * 5200 * config.WEBCAM_INTENSITY) + (localY * webcamForce);
        var webcamBaseColor = generateColor();
        if (config.WEBCAM_COLOR_MIX) {
            webcamBaseColor = preserveColorContrast(mixColors(
                webcamBaseColor,
                webcamState.averageColor,
                0.24 + (motionPhase * 0.14)
            ), 0.18, 0.86);
        }
        var color = amplifyColor(webcamBaseColor, 0.95 + (motionPhase * 0.45));
        emitCreativeSplat(cell.x, 1 - cell.y, dx, -dy, color, {
            radiusMultiplier: webcamRadius
        });
    }
}

function updateAudioInput (dt) {
    if ((config.AUDIO_INPUT || 'off') === 'off' || !audioState.enabled || !audioState.analyser || !audioState.frequencyData || config.PAUSED) {
        audioState.bass *= 0.9;
        audioState.treble *= 0.9;
        audioState.energy *= 0.9;
        audioState.autoplayBoost *= 0.9;
        audioState.bloomBoost *= 0.9;
        return;
    }

    if (audioState.context && audioState.context.state === 'suspended') {
        audioState.context.resume().catch(function () {});
        return;
    }

    audioState.lastSampleTime += dt;
    if (audioState.lastSampleTime < 0.06) { return; }
    audioState.lastSampleTime = 0;

    audioState.analyser.getByteFrequencyData(audioState.frequencyData);
    var bins = audioState.frequencyData;
    var low = 0;
    var mid = 0;
    var high = 0;
    var lowCount = 0;
    var midCount = 0;
    var highCount = 0;

    for (var i = 0; i < bins.length; i++) {
        var normalized = bins[i] / 255;
        if (i < 12) {
            low += normalized;
            lowCount++;
        } else if (i < 48) {
            mid += normalized;
            midCount++;
        } else if (i < 120) {
            high += normalized;
            highCount++;
        }
    }

    low = lowCount ? low / lowCount : 0;
    mid = midCount ? mid / midCount : 0;
    high = highCount ? high / highCount : 0;

    var overall = (low * 0.5) + (mid * 0.32) + (high * 0.18);
    var bassPhase = clamp((low - 0.04) * 2.8 * config.AUDIO_INTENSITY, 0, 1);
    var treblePhase = clamp((high - 0.03) * 3.2 * config.AUDIO_INTENSITY, 0, 1);
    var energyPhase = clamp((overall - 0.045) * 2.4 * config.AUDIO_INTENSITY, 0, 1);
    audioState.bass = (audioState.bass * 0.72) + (bassPhase * 0.28);
    audioState.treble = (audioState.treble * 0.7) + (treblePhase * 0.3);
    audioState.energy = (audioState.energy * 0.68) + (energyPhase * 0.32);
    audioState.autoplayBoost = clamp((audioState.bass * 0.5) + (audioState.energy * 0.7) + (audioState.treble * 0.25), 0, 1);
    audioState.bloomBoost = clamp((audioState.treble * 0.7) + (audioState.energy * 0.55), 0, 1);

    if (overall < 0.045) { return; }

    var anchorX = 0.2 + ((mid + (high * 0.35)) * 0.55);
    var anchorY = 0.5 + ((Math.random() - 0.5) * 0.28) - (audioState.energy * 0.08);
    var radiusMultiplier = 0.18 + (bassPhase * 0.42);
    var forceScale = (70 + (bassPhase * 120) + (treblePhase * 90)) * config.AUDIO_INTENSITY;
    var angle = (Math.random() * Math.PI * 2) + ((audioState.treble - audioState.bass) * 0.9);
    var dx = Math.cos(angle) * forceScale * (0.45 + (treblePhase * 0.35));
    var dy = Math.sin(angle) * forceScale * (0.45 + (bassPhase * 0.25));
    var baseAudioColor = generateColor();
    var audioTint = preserveColorContrast(softLimitColor({
        r: clamp(0.24 + (high * 0.42) + (mid * 0.18), 0, 1),
        g: clamp(0.2 + (mid * 0.34) + (high * 0.12), 0, 1),
        b: clamp(0.22 + (low * 0.2) + (mid * 0.08), 0, 1)
    }, 0.72), 0.16, 0.72);
    var color = preserveColorContrast(
        amplifyColor(
            mixColors(baseAudioColor, blendAuraColor(audioTint), 0.1 + (energyPhase * 0.12)),
            0.74 + (energyPhase * 0.42)
        ),
        0.22 + (treblePhase * 0.12),
        0.88
    );

    emitCreativeSplat(clamp(anchorX + ((Math.random() - 0.5) * 0.12), 0.06, 0.94), clamp(anchorY, 0.08, 0.92), dx, dy, color, {
        radiusMultiplier: radiusMultiplier
    });

    if (treblePhase > 0.32) {
        emitCreativeSplat(clamp(anchorX + ((Math.random() - 0.5) * 0.2), 0.05, 0.95), clamp(anchorY + ((Math.random() - 0.5) * 0.18), 0.08, 0.92), dx * 0.28, dy * 0.28, color, {
            radiusMultiplier: 0.12 + (treblePhase * 0.16)
        });
    }
}

function applyAceConfig (nextConfig) {
    if (!nextConfig) { return; }

    config.DYE_RESOLUTION = clamp(toNumber(nextConfig.dyeResolution, config.DYE_RESOLUTION), 128, 2048);
    config.SIM_RESOLUTION = clamp(toNumber(nextConfig.simResolution, config.SIM_RESOLUTION), 32, 256);
    config.DENSITY_DISSIPATION = clamp(toNumber(nextConfig.densityDissipation, config.DENSITY_DISSIPATION), 0, 4);
    config.VELOCITY_DISSIPATION = clamp(toNumber(nextConfig.velocityDissipation, config.VELOCITY_DISSIPATION), 0, 4);
    config.PRESSURE = clamp(toNumber(nextConfig.pressure, config.PRESSURE), 0, 1);
    config.CURL = clamp(toNumber(nextConfig.curl, config.CURL), 0, 50);
    config.SPLAT_RADIUS = clamp(toNumber(nextConfig.splatRadius, config.SPLAT_RADIUS), 0.01, 4);
    config.PARTICLE_SHAPE = ['soft', 'spray', 'ribbon', 'ring', 'comet'].indexOf(nextConfig.particleShape) !== -1 ? nextConfig.particleShape : config.PARTICLE_SHAPE;
    config.PARTICLE_SPREAD = clamp(toNumber(nextConfig.particleSpread, config.PARTICLE_SPREAD), 0, 1.5);
    config.FLOW_JITTER = clamp(toNumber(nextConfig.flowJitter, config.FLOW_JITTER), 0, 1.25);
    config.SHADING = toBool(nextConfig.shading, config.SHADING);
    config.COLORFUL = toBool(nextConfig.colorful, config.COLORFUL);
    config.BLOOM = toBool(nextConfig.bloom, config.BLOOM);
    config.BLOOM_INTENSITY = clamp(toNumber(nextConfig.bloomIntensity, config.BLOOM_INTENSITY), 0.1, 2);
    config.BLOOM_THRESHOLD = clamp(toNumber(nextConfig.bloomThreshold, config.BLOOM_THRESHOLD), 0, 1);
    config.SUNRAYS = toBool(nextConfig.sunrays, config.SUNRAYS);
    config.SUNRAYS_WEIGHT = clamp(toNumber(nextConfig.sunraysWeight, config.SUNRAYS_WEIGHT), 0.3, 1);
    config.AUTOPLAY = toBool(nextConfig.autoplay, config.AUTOPLAY);
    config.AUTOPLAY_INTENSITY = clamp(toNumber(nextConfig.autoplayIntensity, config.AUTOPLAY_INTENSITY), 0.2, 2);
    config.AUTOPLAY_EASING = clamp(toNumber(nextConfig.autoplayEasing, config.AUTOPLAY_EASING), 0.5, 2.5);
    config.HOVER = toBool(nextConfig.hover, config.HOVER);
    config.TOUCH = toBool(nextConfig.touch, config.TOUCH);
    config.TILT = toBool(nextConfig.tilt, config.TILT);
    config.WEBCAM_MOTION = toBool(nextConfig.webcamMotion, config.WEBCAM_MOTION);
    config.WEBCAM_COLOR_MIX = toBool(nextConfig.webcamColorMix, config.WEBCAM_COLOR_MIX);
    config.WEBCAM_INTENSITY = clamp(toNumber(nextConfig.webcamIntensity, config.WEBCAM_INTENSITY), 0.2, 2);
    config.AUDIO_INPUT = ['off', 'microphone', 'system'].indexOf(nextConfig.audioInput) !== -1 ? nextConfig.audioInput : config.AUDIO_INPUT;
    config.AUDIO_INTENSITY = clamp(toNumber(nextConfig.audioIntensity, config.AUDIO_INTENSITY), 0.2, 2);
    config.COLOR_BOOST = clamp(toNumber(nextConfig.colorBoost, config.COLOR_BOOST), 1, 3);
    config.AURA_MODE = toBool(nextConfig.auraMode, config.AURA_MODE);
    applyBackdropColor(nextConfig.backgroundColor, nextConfig.backdropStyle || config.BACKDROP_STYLE);
    refreshAuraPalette();
    syncSensorInputs();

    if (typeof gl !== 'undefined' && gl) {
        updateKeywords();
        initFramebuffers();
    }

    if (nextConfig.randomSplats) {
        multipleSplats(clamp(Math.round(toNumber(nextConfig.randomSplats, 8)), 1, 32));
    }
}

function pointerPrototype () {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.initialized = false;
    this.color = [30, 0, 300];
    this.lastHoverSplatTime = 0;
    this.hoverCarry = 0;
    this.filteredDeltaX = 0;
    this.filteredDeltaY = 0;
    this.sampledFluidColor = null;
    this.sampledFluidEnergy = 0;
    this.sampledFluidX = -1;
    this.sampledFluidY = -1;
    this.lastFluidSampleTime = 0;
}

var pointers = [];
var splatStack = [];
pointers.push(new pointerPrototype());

var ref = getWebGLContext(canvas);
var gl = ref.gl;
var ext = ref.ext;

if (isMobile()) {
    config.DYE_RESOLUTION = 512;
}
if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
}

function getWebGLContext (canvas) {
    var params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

    var gl = canvas.getContext('webgl2', params);
    var isWebGL2 = !!gl;
    if (!isWebGL2)
        { gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params); }

    var halfFloat;
    var supportLinearFiltering;
    if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    var halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    var formatRGBA;
    var formatRG;
    var formatR;

    if (isWebGL2)
    {
        formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    }
    else
    {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    return {
        gl: gl,
        ext: {
            formatRGBA: formatRGBA,
            formatRG: formatRG,
            formatR: formatR,
            halfFloatTexType: halfFloatTexType,
            supportLinearFiltering: supportLinearFiltering
        }
    };
}

function getSupportedFormat (gl, internalFormat, format, type)
{
    if (!supportRenderTextureFormat(gl, internalFormat, format, type))
    {
        switch (internalFormat)
        {
            case gl.R16F:
                return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F:
                return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default:
                return null;
        }
    }

    return {
        internalFormat: internalFormat,
        format: format
    }
}

function supportRenderTextureFormat (gl, internalFormat, format, type) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status == gl.FRAMEBUFFER_COMPLETE;
}

function startGUI () {
    return;
}

function isMobile () {
    return /Mobi|Android/i.test(navigator.userAgent);
}

function captureScreenshot () {
    var res = getResolution(config.CAPTURE_RESOLUTION);
    var target = createFBO(res.width, res.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, gl.NEAREST);
    render(target);

    var texture = framebufferToTexture(target);
    texture = normalizeTexture(texture, target.width, target.height);

    var captureCanvas = textureToCanvas(texture, target.width, target.height);
    var datauri = captureCanvas.toDataURL();
    downloadURI('fluid.png', datauri);
    URL.revokeObjectURL(datauri);
}

function framebufferToTexture (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    var length = target.width * target.height * 4;
    var texture = new Float32Array(length);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, texture);
    return texture;
}

var fluidColorSampleBuffer = new Float32Array(4);

function sampleFluidColorAt (texcoordX, texcoordY) {
    if (!dye || !dye.read || !dye.read.fbo) { return null; }

    var target = dye.read;
    var x = clamp(Math.round(clamp(texcoordX, 0, 1) * (target.width - 1)), 0, target.width - 1);
    var y = clamp(Math.round(clamp(texcoordY, 0, 1) * (target.height - 1)), 0, target.height - 1);
    var previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, fluidColorSampleBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);

    return {
        r: clamp(fluidColorSampleBuffer[0], 0, 1),
        g: clamp(fluidColorSampleBuffer[1], 0, 1),
        b: clamp(fluidColorSampleBuffer[2], 0, 1)
    };
}

function getColorEnergy (color) {
    if (!color) { return 0; }

    var peak = Math.max(color.r, color.g, color.b);
    var average = (color.r + color.g + color.b) / 3;
    return Math.max(peak, average);
}

function getColorChroma (color) {
    if (!color) { return 0; }

    return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
}

function samplePointerFluidState (pointer) {
    var now = window.performance && typeof window.performance.now === 'function'
        ? window.performance.now()
        : Date.now();
    var movedSinceLastSample = Math.abs(pointer.texcoordX - pointer.sampledFluidX) + Math.abs(pointer.texcoordY - pointer.sampledFluidY);

    if (pointer.sampledFluidColor && movedSinceLastSample < 0.0035 && (now - pointer.lastFluidSampleTime) < 32) {
        return {
            color: pointer.sampledFluidColor,
            energy: pointer.sampledFluidEnergy
        };
    }

    var color = sampleFluidColorAt(pointer.texcoordX, pointer.texcoordY);
    var energy = getColorEnergy(color);

    pointer.sampledFluidColor = color;
    pointer.sampledFluidEnergy = energy;
    pointer.sampledFluidX = pointer.texcoordX;
    pointer.sampledFluidY = pointer.texcoordY;
    pointer.lastFluidSampleTime = now;

    return {
        color: color,
        energy: energy
    };
}

function normalizeTexture (texture, width, height) {
    var result = new Uint8Array(texture.length);
    var id = 0;
    for (var i = height - 1; i >= 0; i--) {
        for (var j = 0; j < width; j++) {
            var nid = i * width * 4 + j * 4;
            result[nid + 0] = clamp01(texture[id + 0]) * 255;
            result[nid + 1] = clamp01(texture[id + 1]) * 255;
            result[nid + 2] = clamp01(texture[id + 2]) * 255;
            result[nid + 3] = clamp01(texture[id + 3]) * 255;
            id += 4;
        }
    }
    return result;
}

function clamp01 (input) {
    return Math.min(Math.max(input, 0), 1);
}

function textureToCanvas (texture, width, height) {
    var captureCanvas = document.createElement('canvas');
    var ctx = captureCanvas.getContext('2d');
    captureCanvas.width = width;
    captureCanvas.height = height;

    var imageData = ctx.createImageData(width, height);
    imageData.data.set(texture);
    ctx.putImageData(imageData, 0, 0);

    return captureCanvas;
}

function downloadURI (filename, uri) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

var Material = function Material (vertexShader, fragmentShaderSource) {
    this.vertexShader = vertexShader;
    this.fragmentShaderSource = fragmentShaderSource;
    this.programs = [];
    this.activeProgram = null;
    this.uniforms = [];
};

Material.prototype.setKeywords = function setKeywords (keywords) {
    var hash = 0;
    for (var i = 0; i < keywords.length; i++)
        { hash += hashCode(keywords[i]); }

    var program = this.programs[hash];
    if (program == null)
    {
        var fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
        program = createProgram(this.vertexShader, fragmentShader);
        this.programs[hash] = program;
    }

    if (program == this.activeProgram) { return; }

    this.uniforms = getUniforms(program);
    this.activeProgram = program;
};

Material.prototype.bind = function bind () {
    gl.useProgram(this.activeProgram);
};

var Program = function Program (vertexShader, fragmentShader) {
    this.uniforms = {};
    this.program = createProgram(vertexShader, fragmentShader);
    this.uniforms = getUniforms(this.program);
};

Program.prototype.bind = function bind () {
    gl.useProgram(this.program);
};

function createProgram (vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        { throw gl.getProgramInfoLog(program); }

    return program;
}

function getUniforms (program) {
    var uniforms = [];
    var uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < uniformCount; i++) {
        var uniformName = gl.getActiveUniform(program, i).name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
}

function compileShader (type, source, keywords) {
    source = addKeywords(source, keywords);

    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        { throw gl.getShaderInfoLog(shader); }

    return shader;
};

function addKeywords (source, keywords) {
    if (keywords == null) { return source; }
    var keywordsString = '';
    keywords.forEach(function (keyword) {
        keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
}

var baseVertexShader = compileShader(gl.VERTEX_SHADER, "\n    precision highp float;\n\n    attribute vec2 aPosition;\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform vec2 texelSize;\n\n    void main () {\n        vUv = aPosition * 0.5 + 0.5;\n        vL = vUv - vec2(texelSize.x, 0.0);\n        vR = vUv + vec2(texelSize.x, 0.0);\n        vT = vUv + vec2(0.0, texelSize.y);\n        vB = vUv - vec2(0.0, texelSize.y);\n        gl_Position = vec4(aPosition, 0.0, 1.0);\n    }\n");

var blurVertexShader = compileShader(gl.VERTEX_SHADER, "\n    precision highp float;\n\n    attribute vec2 aPosition;\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    uniform vec2 texelSize;\n\n    void main () {\n        vUv = aPosition * 0.5 + 0.5;\n        float offset = 1.33333333;\n        vL = vUv - texelSize * offset;\n        vR = vUv + texelSize * offset;\n        gl_Position = vec4(aPosition, 0.0, 1.0);\n    }\n");

var blurShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    uniform sampler2D uTexture;\n\n    void main () {\n        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;\n        sum += texture2D(uTexture, vL) * 0.35294117;\n        sum += texture2D(uTexture, vR) * 0.35294117;\n        gl_FragColor = sum;\n    }\n");

var copyShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying highp vec2 vUv;\n    uniform sampler2D uTexture;\n\n    void main () {\n        gl_FragColor = texture2D(uTexture, vUv);\n    }\n");

var clearShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying highp vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform float value;\n\n    void main () {\n        gl_FragColor = value * texture2D(uTexture, vUv);\n    }\n");

var colorShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n\n    uniform vec4 color;\n\n    void main () {\n        gl_FragColor = color;\n    }\n");

var checkerboardShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform float aspectRatio;\n\n    #define SCALE 25.0\n\n    void main () {\n        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));\n        float v = mod(uv.x + uv.y, 2.0);\n        v = v * 0.1 + 0.8;\n        gl_FragColor = vec4(vec3(v), 1.0);\n    }\n");

var displayShaderSource = "\n    precision highp float;\n    precision highp sampler2D;\n\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uTexture;\n    uniform sampler2D uBloom;\n    uniform sampler2D uSunrays;\n    uniform sampler2D uDithering;\n    uniform vec2 ditherScale;\n    uniform vec2 texelSize;\n\n    vec3 linearToGamma (vec3 color) {\n        color = max(color, vec3(0));\n        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));\n    }\n\n    vec3 preservePeakSoftClamp (vec3 color, float limit) {\n        float peak = max(color.r, max(color.g, color.b));\n        if (peak <= limit) return color;\n        float compression = limit / peak;\n        return mix(color, color * compression, 0.94);\n    }\n\n    vec3 boostChroma (vec3 color, float amount) {\n        float luma = dot(color, vec3(0.299, 0.587, 0.114));\n        return max(vec3(0.0), vec3(luma) + ((color - vec3(luma)) * (1.0 + amount)));\n    }\n\n    vec3 sustainColorMix (vec3 color) {\n        float peak = max(color.r, max(color.g, color.b));\n        float trough = min(color.r, min(color.g, color.b));\n        float chroma = max(peak - trough, 0.0);\n        float energy = max(peak, dot(color, vec3(0.299, 0.587, 0.114)));\n        float sustain = (1.0 - smoothstep(0.08, 0.34, chroma)) * smoothstep(0.05, 0.48, energy);\n        return boostChroma(color, 0.12 + (sustain * 0.28));\n    }\n\n    void main () {\n        vec3 c = texture2D(uTexture, vUv).rgb;\n\n    #ifdef SHADING\n        vec3 lc = texture2D(uTexture, vL).rgb;\n        vec3 rc = texture2D(uTexture, vR).rgb;\n        vec3 tc = texture2D(uTexture, vT).rgb;\n        vec3 bc = texture2D(uTexture, vB).rgb;\n\n        float dx = length(rc) - length(lc);\n        float dy = length(tc) - length(bc);\n\n        vec3 n = normalize(vec3(dx, dy, length(texelSize)));\n        vec3 l = vec3(0.0, 0.0, 1.0);\n\n        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);\n        c *= diffuse;\n    #endif\n\n    #ifdef BLOOM\n        vec3 bloom = texture2D(uBloom, vUv).rgb;\n    #endif\n\n    #ifdef SUNRAYS\n        float sunrays = texture2D(uSunrays, vUv).r;\n        c *= sunrays;\n    #ifdef BLOOM\n        bloom *= sunrays;\n    #endif\n    #endif\n\n    #ifdef BLOOM\n        float noise = texture2D(uDithering, vUv * ditherScale).r;\n        noise = noise * 2.0 - 1.0;\n        bloom += noise / 255.0;\n        bloom = boostChroma(bloom, 0.42);\n        bloom = preservePeakSoftClamp(bloom, 0.6);\n        bloom = linearToGamma(bloom) * 0.86;\n        bloom = boostChroma(bloom, 0.16);\n        c += bloom;\n    #endif\n\n        c = sustainColorMix(c);\n        c = preservePeakSoftClamp(c, 0.78);\n        float peak = max(c.r, max(c.g, c.b));\n        float trough = min(c.r, min(c.g, c.b));\n        float chroma = max(peak - trough, 0.0);\n        float a = clamp(max(peak, dot(c, vec3(0.299, 0.587, 0.114)) + (chroma * 0.42)), 0.0, 0.9);\n        gl_FragColor = vec4(c, a);\n    }\n";

var bloomPrefilterShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform vec3 curve;\n    uniform float threshold;\n\n    void main () {\n        vec3 c = texture2D(uTexture, vUv).rgb;\n        float br = max(c.r, max(c.g, c.b));\n        float rq = clamp(br - curve.x, 0.0, curve.y);\n        rq = curve.z * rq * rq;\n        c *= max(rq, br - threshold) / max(br, 0.0001);\n        gl_FragColor = vec4(c, 0.0);\n    }\n");

var bloomBlurShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uTexture;\n\n    void main () {\n        vec4 sum = vec4(0.0);\n        sum += texture2D(uTexture, vL);\n        sum += texture2D(uTexture, vR);\n        sum += texture2D(uTexture, vT);\n        sum += texture2D(uTexture, vB);\n        sum *= 0.25;\n        gl_FragColor = sum;\n    }\n");

var bloomFinalShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uTexture;\n    uniform float intensity;\n\n    vec3 boostChroma (vec3 color, float amount) {\n        float luma = dot(color, vec3(0.299, 0.587, 0.114));\n        return max(vec3(0.0), vec3(luma) + ((color - vec3(luma)) * (1.0 + amount)));\n    }\n\n    void main () {\n        vec4 sum = vec4(0.0);\n        sum += texture2D(uTexture, vL);\n        sum += texture2D(uTexture, vR);\n        sum += texture2D(uTexture, vT);\n        sum += texture2D(uTexture, vB);\n        sum *= 0.25;\n        sum.rgb = boostChroma(sum.rgb, 0.38);\n        gl_FragColor = vec4(sum.rgb * intensity, 0.0);\n    }\n");

var sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n\n    void main () {\n        vec4 c = texture2D(uTexture, vUv);\n        float br = max(c.r, max(c.g, c.b));\n        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);\n        gl_FragColor = c;\n    }\n");

var sunraysShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n\n    varying vec2 vUv;\n    uniform sampler2D uTexture;\n    uniform float weight;\n\n    #define ITERATIONS 16\n\n    void main () {\n        float Density = 0.3;\n        float Decay = 0.95;\n        float Exposure = 0.7;\n\n        vec2 coord = vUv;\n        vec2 dir = vUv - 0.5;\n\n        dir *= 1.0 / float(ITERATIONS) * Density;\n        float illuminationDecay = 1.0;\n\n        float color = texture2D(uTexture, vUv).a;\n\n        for (int i = 0; i < ITERATIONS; i++)\n        {\n            coord -= dir;\n            float col = texture2D(uTexture, coord).a;\n            color += col * illuminationDecay * weight;\n            illuminationDecay *= Decay;\n        }\n\n        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);\n    }\n");

var splatShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n\n    varying vec2 vUv;\n    uniform sampler2D uTarget;\n    uniform float aspectRatio;\n    uniform vec3 color;\n    uniform vec2 point;\n    uniform float radius;\n\n    void main () {\n        vec2 p = vUv - point.xy;\n        p.x *= aspectRatio;\n        vec3 splat = exp(-dot(p, p) / radius) * color;\n        vec3 base = texture2D(uTarget, vUv).xyz;\n        gl_FragColor = vec4(base + splat, 1.0);\n    }\n");

var advectionShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n\n    varying vec2 vUv;\n    uniform sampler2D uVelocity;\n    uniform sampler2D uSource;\n    uniform vec2 texelSize;\n    uniform vec2 dyeTexelSize;\n    uniform float dt;\n    uniform float dissipation;\n\n    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {\n        vec2 st = uv / tsize - 0.5;\n\n        vec2 iuv = floor(st);\n        vec2 fuv = fract(st);\n\n        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);\n        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);\n        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);\n        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);\n\n        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);\n    }\n\n    void main () {\n    #ifdef MANUAL_FILTERING\n        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;\n        vec4 result = bilerp(uSource, coord, dyeTexelSize);\n    #else\n        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;\n        vec4 result = texture2D(uSource, coord);\n    #endif\n        float decay = 1.0 + dissipation * dt;\n        gl_FragColor = result / decay;\n    }",
    ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
);

var divergenceShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uVelocity;\n\n    void main () {\n        float L = texture2D(uVelocity, vL).x;\n        float R = texture2D(uVelocity, vR).x;\n        float T = texture2D(uVelocity, vT).y;\n        float B = texture2D(uVelocity, vB).y;\n\n        vec2 C = texture2D(uVelocity, vUv).xy;\n        if (vL.x < 0.0) { L = -C.x; }\n        if (vR.x > 1.0) { R = -C.x; }\n        if (vT.y > 1.0) { T = -C.y; }\n        if (vB.y < 0.0) { B = -C.y; }\n\n        float div = 0.5 * (R - L + T - B);\n        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);\n    }\n");

var curlShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uVelocity;\n\n    void main () {\n        float L = texture2D(uVelocity, vL).y;\n        float R = texture2D(uVelocity, vR).y;\n        float T = texture2D(uVelocity, vT).x;\n        float B = texture2D(uVelocity, vB).x;\n        float vorticity = R - L - T + B;\n        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);\n    }\n");

var vorticityShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision highp float;\n    precision highp sampler2D;\n\n    varying vec2 vUv;\n    varying vec2 vL;\n    varying vec2 vR;\n    varying vec2 vT;\n    varying vec2 vB;\n    uniform sampler2D uVelocity;\n    uniform sampler2D uCurl;\n    uniform float curl;\n    uniform float dt;\n\n    void main () {\n        float L = texture2D(uCurl, vL).x;\n        float R = texture2D(uCurl, vR).x;\n        float T = texture2D(uCurl, vT).x;\n        float B = texture2D(uCurl, vB).x;\n        float C = texture2D(uCurl, vUv).x;\n\n        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));\n        force /= length(force) + 0.0001;\n        force *= curl * C;\n        force.y *= -1.0;\n\n        vec2 vel = texture2D(uVelocity, vUv).xy;\n        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);\n    }\n");

var pressureShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uPressure;\n    uniform sampler2D uDivergence;\n\n    void main () {\n        float L = texture2D(uPressure, vL).x;\n        float R = texture2D(uPressure, vR).x;\n        float T = texture2D(uPressure, vT).x;\n        float B = texture2D(uPressure, vB).x;\n        float C = texture2D(uPressure, vUv).x;\n        float divergence = texture2D(uDivergence, vUv).x;\n        float pressure = (L + R + B + T - divergence) * 0.25;\n        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);\n    }\n");

var gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, "\n    precision mediump float;\n    precision mediump sampler2D;\n\n    varying highp vec2 vUv;\n    varying highp vec2 vL;\n    varying highp vec2 vR;\n    varying highp vec2 vT;\n    varying highp vec2 vB;\n    uniform sampler2D uPressure;\n    uniform sampler2D uVelocity;\n\n    void main () {\n        float L = texture2D(uPressure, vL).x;\n        float R = texture2D(uPressure, vR).x;\n        float T = texture2D(uPressure, vT).x;\n        float B = texture2D(uPressure, vB).x;\n        vec2 velocity = texture2D(uVelocity, vUv).xy;\n        velocity.xy -= vec2(R - L, T - B);\n        gl_FragColor = vec4(velocity, 0.0, 1.0);\n    }\n");

var blit = (function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return function (destination) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
})();

var dye;
var velocity;
var divergence;
var curl;
var pressure;
var bloom;
var bloomFramebuffers = [];
var sunrays;
var sunraysTemp;

var ditheringTexture = createTextureAsync((runtimeBaseUrl || '') + 'LDR_LLL1_0.png');

var blurProgram            = new Program(blurVertexShader, blurShader);
var copyProgram            = new Program(baseVertexShader, copyShader);
var clearProgram           = new Program(baseVertexShader, clearShader);
var colorProgram           = new Program(baseVertexShader, colorShader);
var checkerboardProgram    = new Program(baseVertexShader, checkerboardShader);
var bloomPrefilterProgram  = new Program(baseVertexShader, bloomPrefilterShader);
var bloomBlurProgram       = new Program(baseVertexShader, bloomBlurShader);
var bloomFinalProgram      = new Program(baseVertexShader, bloomFinalShader);
var sunraysMaskProgram     = new Program(baseVertexShader, sunraysMaskShader);
var sunraysProgram         = new Program(baseVertexShader, sunraysShader);
var splatProgram           = new Program(baseVertexShader, splatShader);
var advectionProgram       = new Program(baseVertexShader, advectionShader);
var divergenceProgram      = new Program(baseVertexShader, divergenceShader);
var curlProgram            = new Program(baseVertexShader, curlShader);
var vorticityProgram       = new Program(baseVertexShader, vorticityShader);
var pressureProgram        = new Program(baseVertexShader, pressureShader);
var gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);

var displayMaterial = new Material(baseVertexShader, displayShaderSource);

function initFramebuffers () {
    var simRes = getResolution(config.SIM_RESOLUTION);
    var dyeRes = getResolution(config.DYE_RESOLUTION);

    var texType = ext.halfFloatTexType;
    var rgba    = ext.formatRGBA;
    var rg      = ext.formatRG;
    var r       = ext.formatR;
    var filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    if (dye == null)
        { dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering); }
    else
        { dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering); }

    if (velocity == null)
        { velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering); }
    else
        { velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering); }

    divergence = createFBO      (simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl       = createFBO      (simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure   = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

    initBloomFramebuffers();
    initSunraysFramebuffers();
}

function initBloomFramebuffers () {
    var res = getResolution(config.BLOOM_RESOLUTION);

    var texType = ext.halfFloatTexType;
    var rgba = ext.formatRGBA;
    var filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

    bloomFramebuffers.length = 0;
    for (var i = 0; i < config.BLOOM_ITERATIONS; i++)
    {
        var width = res.width >> (i + 1);
        var height = res.height >> (i + 1);

        if (width < 2 || height < 2) { break; }

        var fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.push(fbo);
    }
}

function initSunraysFramebuffers () {
    var res = getResolution(config.SUNRAYS_RESOLUTION);

    var texType = ext.halfFloatTexType;
    var r = ext.formatR;
    var filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays     = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}

function createFBO (w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var texelSizeX = 1.0 / w;
    var texelSizeY = 1.0 / h;

    return {
        texture: texture,
        fbo: fbo,
        width: w,
        height: h,
        texelSizeX: texelSizeX,
        texelSizeY: texelSizeY,
        attach: function attach (id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
}

function createDoubleFBO (w, h, internalFormat, format, type, param) {
    var fbo1 = createFBO(w, h, internalFormat, format, type, param);
    var fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read () {
            return fbo1;
        },
        set read (value) {
            fbo1 = value;
        },
        get write () {
            return fbo2;
        },
        set write (value) {
            fbo2 = value;
        },
        swap: function swap () {
            var temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    }
}

function resizeFBO (target, w, h, internalFormat, format, type, param) {
    var newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO.fbo);
    return newFBO;
}

function resizeDoubleFBO (target, w, h, internalFormat, format, type, param) {
    if (target.width == w && target.height == h)
        { return target; }
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
}

function createTextureAsync (url) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

    var obj = {
        texture: texture,
        width: 1,
        height: 1,
        attach: function attach (id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };

    var image = new Image();
    image.onload = function () {
        obj.width = image.width;
        obj.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;

    return obj;
}

function updateKeywords () {
    var displayKeywords = [];
    if (config.SHADING) { displayKeywords.push("SHADING"); }
    if (config.BLOOM) { displayKeywords.push("BLOOM"); }
    if (config.SUNRAYS) { displayKeywords.push("SUNRAYS"); }
    displayMaterial.setKeywords(displayKeywords);
}

updateKeywords();
initFramebuffers();
var bootConfig = Object.assign({
    dyeResolution: searchParams.get('dyeResolution'),
    simResolution: searchParams.get('simResolution'),
    densityDissipation: searchParams.get('densityDissipation'),
    velocityDissipation: searchParams.get('velocityDissipation'),
    pressure: searchParams.get('pressure'),
    curl: searchParams.get('curl'),
    splatRadius: searchParams.get('splatRadius'),
    particleShape: searchParams.get('particleShape'),
    particleSpread: searchParams.get('particleSpread'),
    flowJitter: searchParams.get('flowJitter'),
    shading: searchParams.get('shading'),
    colorful: searchParams.get('colorful'),
    bloom: searchParams.get('bloom'),
    bloomIntensity: searchParams.get('bloomIntensity'),
    bloomThreshold: searchParams.get('bloomThreshold'),
    sunrays: searchParams.get('sunrays'),
    sunraysWeight: searchParams.get('sunraysWeight'),
    autoplay: searchParams.get('autoplay'),
    autoplayIntensity: searchParams.get('autoplayIntensity'),
    autoplayEasing: searchParams.get('autoplayEasing'),
    hover: searchParams.get('hover'),
    touch: searchParams.get('touch'),
    tilt: searchParams.get('tilt'),
    webcamMotion: searchParams.get('webcamMotion'),
    webcamIntensity: searchParams.get('webcamIntensity'),
    audioInput: searchParams.get('audioInput'),
    audioIntensity: searchParams.get('audioIntensity'),
    colorBoost: searchParams.get('colorBoost'),
    auraMode: searchParams.get('auraMode'),
    backgroundColor: searchParams.get('backgroundColor'),
    backdropStyle: searchParams.get('backdropStyle'),
}, initialConfig || {});
applyAceConfig(bootConfig);
seedFluidState();

function onMessage (event) {
    if (!event.data || event.data.type !== messageType) { return; }
    applyAceConfig(event.data.config || {});
    showStatus('Fluid preview updated');
}

window.addEventListener('message', onMessage);

var lastUpdateTime = Date.now();
var colorUpdateTimer = 0.0;
var autoplayTimer = 0.0;
update();

function update () {
    if (destroyed) { return; }
    var dt = calcDeltaTime();
    if (resizeCanvas())
        { initFramebuffers(); }
    if (config.AURA_MODE) {
        auraRefreshTimer += dt;
        if (auraRefreshTimer >= 1.2) {
            auraRefreshTimer = 0;
            refreshAuraPalette();
        }
    }
    updateColors(dt);
    updateAutoplay(dt);
    updateWebcamMotion(dt);
    updateAudioInput(dt);
    updateGrowingSplatBursts(dt);
    applyInputs();
    if (!config.PAUSED)
        { step(dt); }
    render(null);
    frameHandle = requestAnimationFrame(update);
}

function calcDeltaTime () {
    var now = Date.now();
    var dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

function resizeCanvas () {
    var parent = canvas.parentElement || root;
    var fallbackWidth = root.clientWidth || root.offsetWidth || parent.clientWidth || parent.offsetWidth || 1;
    var fallbackHeight = root.clientHeight || root.offsetHeight || parent.clientHeight || parent.offsetHeight || 1;
    var width = scaleByPixelRatio(canvas.clientWidth || fallbackWidth);
    var height = scaleByPixelRatio(canvas.clientHeight || fallbackHeight);
    if (canvas.width != width || canvas.height != height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

function updateColors (dt) {
    if (!config.COLORFUL) { return; }

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach(function (p) {
            p.color = generateColor();
        });
    }
}

function enqueueGrowingSplatBurst (x, y, dx, dy, color, options) {
    var settings = options || {};
    var radiusMultiplier = settings.radiusMultiplier === undefined ? 1 : settings.radiusMultiplier;

    growingSplatBursts.push({
        x: x,
        y: y,
        dx: dx,
        dy: dy,
        color: color,
        injectDye: settings.injectDye !== false,
        particleShape: settings.particleShape || config.PARTICLE_SHAPE || 'soft',
        particleSpread: settings.particleSpread,
        flowJitter: settings.flowJitter,
        radiusStart: radiusMultiplier * (settings.radiusStartMultiplier === undefined ? 0.16 : settings.radiusStartMultiplier),
        radiusEnd: radiusMultiplier * (settings.radiusEndMultiplier === undefined ? 1 : settings.radiusEndMultiplier),
        velocityStart: settings.velocityStart === undefined ? 0.42 : settings.velocityStart,
        velocityEnd: settings.velocityEnd === undefined ? 1.08 : settings.velocityEnd,
        steps: Math.max(2, Math.round(toNumber(settings.steps, 4))),
        duration: clamp(toNumber(settings.duration, 0.16), 0.05, 0.42),
        elapsed: toNumber(settings.delay, 0) * -1,
        emittedSteps: 0
    });
}

function updateGrowingSplatBursts (dt) {
    if (config.PAUSED || growingSplatBursts.length === 0) { return; }

    growingSplatBursts = growingSplatBursts.filter(function (burst) {
        burst.elapsed += dt;
        if (burst.elapsed < 0) { return true; }

        var progress = clamp(burst.elapsed / burst.duration, 0, 1);
        var easedProgress = progress * progress * (3.0 - (2.0 * progress));
        var targetSteps = Math.min(burst.steps, Math.ceil(easedProgress * burst.steps));

        while (burst.emittedSteps < targetSteps) {
            var stepProgress = (burst.emittedSteps + 1) / burst.steps;
            var easedStep = stepProgress * stepProgress * (3.0 - (2.0 * stepProgress));
            var velocityScale = burst.velocityStart + ((burst.velocityEnd - burst.velocityStart) * easedStep);
            var radiusMultiplier = burst.radiusStart + ((burst.radiusEnd - burst.radiusStart) * easedStep);
            emitCreativeSplat(burst.x, burst.y, burst.dx * velocityScale, burst.dy * velocityScale, burst.color, {
                radiusMultiplier: radiusMultiplier,
                injectDye: burst.injectDye,
                particleShape: burst.particleShape,
                particleSpread: burst.particleSpread,
                flowJitter: burst.flowJitter
            });
            burst.emittedSteps++;
        }

        return burst.emittedSteps < burst.steps || progress < 1;
    });
}

function createAutoplayFocus () {
    return {
        x: 0.16 + (Math.random() * 0.68),
        y: 0.14 + (Math.random() * 0.72),
        driftX: (Math.random() - 0.5) * 0.3,
        driftY: (Math.random() - 0.5) * 0.28,
        orbitRadiusX: 0.02 + (Math.random() * 0.055),
        orbitRadiusY: 0.018 + (Math.random() * 0.05),
        orbitTurns: 0.8 + (Math.random() * 1.2),
        orbitPhase: Math.random() * Math.PI * 2,
        swirl: Math.random() > 0.5 ? 1 : -1
    };
}

function resetAutoplayFocus () {
    autoplayFocus = createAutoplayFocus();
}

function getAutoplayAnchor (progress) {
    var orbitAngle = autoplayFocus.orbitPhase + (progress * autoplayFocus.orbitTurns * Math.PI * 2);
    return {
        x: clamp(autoplayFocus.x + (autoplayFocus.driftX * progress) + (Math.cos(orbitAngle) * autoplayFocus.orbitRadiusX), 0.08, 0.92),
        y: clamp(autoplayFocus.y + (autoplayFocus.driftY * progress) + (Math.sin(orbitAngle) * autoplayFocus.orbitRadiusY), 0.08, 0.92)
    };
}

function emitAutoplaySplat (phase, isBurst) {
    var intensity = clamp(config.AUTOPLAY_INTENSITY, 0.2, 2);
    var spiralPhase = isBurst ? clamp(0.68 + (phase * 0.24), 0, 1) : phase;
    var anchor = getAutoplayAnchor(spiralPhase);
    var orbitAngle = autoplayFocus.orbitPhase + (spiralPhase * autoplayFocus.orbitTurns * Math.PI * 2);
    var spiralTurns = 1.35 + (intensity * 0.4) + (isBurst ? 0.35 : 0);
    var spiralAngle = orbitAngle + (autoplayFocus.swirl * spiralPhase * Math.PI * 2 * spiralTurns);
    var spiralRadius = (isBurst ? 0.014 + (phase * 0.032) : 0.005 + (spiralPhase * 0.05)) * (0.88 + (intensity * 0.16));
    var laneX = clamp(anchor.x + (Math.cos(spiralAngle) * spiralRadius), 0.03, 0.97);
    var laneY = clamp(anchor.y + (Math.sin(spiralAngle) * spiralRadius), 0.03, 0.97);
    var radiusMultiplier = (isBurst ? 0.64 : 0.18 + (phase * 0.66)) * (0.96 + (intensity * 0.08));
    var forceMultiplier = (isBurst ? 0.026 : 0.006 + (phase * phase * 0.017)) * (0.88 + (intensity * 0.12));
    var colorMultiplier = (isBurst ? 1.16 : 0.66 + (phase * 0.68)) * (0.96 + (intensity * 0.08));
    var tangentX = -Math.sin(orbitAngle) * autoplayFocus.swirl;
    var tangentY = Math.cos(orbitAngle) * autoplayFocus.swirl;
    var radialX = laneX - anchor.x;
    var radialY = laneY - anchor.y;
    var spiralTangentX = -Math.sin(spiralAngle) * autoplayFocus.swirl;
    var spiralTangentY = Math.cos(spiralAngle) * autoplayFocus.swirl;
    var rushDistance = (isBurst ? 0.018 + (phase * 0.028) : 0.01 + (spiralPhase * 0.04)) * (0.94 + (intensity * 0.14));
    var rushStartX = clamp(laneX - (spiralTangentX * rushDistance) - (radialX * 0.85), 0.03, 0.97);
    var rushStartY = clamp(laneY - (spiralTangentY * rushDistance) - (radialY * 0.85), 0.03, 0.97);
    var rushToLaneX = laneX - rushStartX;
    var rushToLaneY = laneY - rushStartY;
    var randomFlowX = (Math.random() - 0.5) * (0.03 + (phase * 0.06));
    var randomFlowY = (Math.random() - 0.5) * (0.03 + (phase * 0.06));
    var flowX = (autoplayFocus.driftX * 1.9) + (tangentX * (0.06 + (phase * 0.14))) + (spiralTangentX * (0.16 + (spiralPhase * 0.26))) + (rushToLaneX * (3.1 + (spiralPhase * 1.35))) + (radialX * 0.42) + randomFlowX;
    var flowY = (autoplayFocus.driftY * 1.9) + (tangentY * (0.06 + (phase * 0.14))) + (spiralTangentY * (0.16 + (spiralPhase * 0.26))) + (rushToLaneY * (3.1 + (spiralPhase * 1.35))) + (radialY * 0.42) + randomFlowY;
    var dx = 1000 * forceMultiplier * flowX;
    var dy = 1000 * forceMultiplier * flowY;
    var color = amplifyColor(generateColor(), colorMultiplier);

    enqueueGrowingSplatBurst(rushStartX, rushStartY, dx, dy, color, {
        radiusMultiplier: radiusMultiplier,
        radiusStartMultiplier: isBurst ? 0.08 : 0.12,
        radiusEndMultiplier: 1.08,
        velocityStart: isBurst ? 0.7 : 0.56,
        velocityEnd: isBurst ? 1.34 : 1.18,
        duration: isBurst ? 0.16 : 0.19,
        steps: isBurst ? 4 : 3,
        particleSpread: config.PARTICLE_SPREAD + (isBurst ? 0.08 : 0.02),
        flowJitter: Math.max(0.04, config.FLOW_JITTER * 0.55)
    });
}

function updateAutoplay (dt) {
    if (!config.AUTOPLAY) {
        autoplayPulseAccumulator = 0;
        autoplayBloomBoost *= 0.84;
        return;
    }

    var audioAutoplayBoost = (config.AUDIO_INPUT || 'off') !== 'off' ? audioState.autoplayBoost : 0;
    autoplayTimer += dt;
    var interval = clamp(1.35 - (config.AUTOPLAY_INTENSITY * 0.35) - (audioAutoplayBoost * 0.22), 0.72, 1.45);
    var progress = clamp(autoplayTimer / interval, 0, 1);
    var eased = Math.pow(progress, config.AUTOPLAY_EASING);
    var bloomPhase = eased * eased * (3.0 - (2.0 * eased));
    var softPhase = Math.pow(bloomPhase, 1.85);

    autoplayBloomBoost = (autoplayBloomBoost * 0.86) + (((softPhase * softPhase) * (0.08 + (config.AUTOPLAY_INTENSITY * 0.05))) * 0.14);

    autoplayPulseAccumulator += dt * ((0.22 + (config.AUTOPLAY_INTENSITY * 0.08) + (audioAutoplayBoost * 0.14)) + (softPhase * (0.62 + (config.AUTOPLAY_INTENSITY * 0.24) + (audioAutoplayBoost * 0.18))));

    while (autoplayPulseAccumulator >= 1) {
        emitAutoplaySplat(softPhase, false);
        autoplayPulseAccumulator -= 1;
    }

    if (autoplayTimer < interval) { return; }

    autoplayTimer -= interval;
    autoplayPulseAccumulator *= 0.2;

    for (var i = 0; i < Math.max(1, Math.round(0.5 + (config.AUTOPLAY_INTENSITY * 0.34) + (audioAutoplayBoost * 0.24))); i++) {
        emitAutoplaySplat(0.52 + (softPhase * 0.18), true);
    }

    resetAutoplayFocus();
}

function applyInputs () {
    if (splatStack.length > 0)
        { multipleSplats(splatStack.pop()); }

    pointers.forEach(function (p) {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });
}

function step (dt) {
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, velocity.width, velocity.height);

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl.fbo);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write.fbo);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence.fbo);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write.fbo);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (var i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write.fbo);
        pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write.fbo);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering)
        { gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY); }
    var velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, mapDissipationControl(config.VELOCITY_DISSIPATION, 1.85));
    blit(velocity.write.fbo);
    velocity.swap();

    gl.viewport(0, 0, dye.width, dye.height);

    if (!ext.supportLinearFiltering)
        { gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY); }
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, mapDissipationControl(config.DENSITY_DISSIPATION, 1.65));
    blit(dye.write.fbo);
    dye.swap();
}

function render (target) {
    if (config.BLOOM)
        { applyBloom(dye.read, bloom); }
    if (config.SUNRAYS) {
        applySunrays(dye.read, dye.write, sunrays);
        blur(sunrays, sunraysTemp, 1);
    }

    if (target == null || !config.TRANSPARENT) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
    }
    else {
        gl.disable(gl.BLEND);
    }

    var width = target == null ? gl.drawingBufferWidth : target.width;
    var height = target == null ? gl.drawingBufferHeight : target.height;
    gl.viewport(0, 0, width, height);

    var fbo = target == null ? null : target.fbo;
    if (!config.TRANSPARENT)
        { drawColor(fbo, normalizeColor(config.BACK_COLOR)); }
    if (target == null && config.TRANSPARENT)
        { drawCheckerboard(fbo); }
    drawDisplay(fbo, width, height);
}

function drawColor (fbo, color) {
    colorProgram.bind();
    gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
    blit(fbo);
}

function drawCheckerboard (fbo) {
    checkerboardProgram.bind();
    gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    blit(fbo);
}

function drawDisplay (fbo, width, height) {
    displayMaterial.bind();
    if (config.SHADING)
        { gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height); }
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    if (config.BLOOM) {
        gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
        gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
        var scale = getTextureScale(ditheringTexture, width, height);
        gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
    }
    if (config.SUNRAYS)
        { gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3)); }
    blit(fbo);
}

function applyBloom (source, destination) {
    if (bloomFramebuffers.length < 2)
        { return; }

    var last = destination;

    gl.disable(gl.BLEND);
    bloomPrefilterProgram.bind();
    var knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    var curve0 = config.BLOOM_THRESHOLD - knee;
    var curve1 = knee * 2;
    var curve2 = 0.25 / knee;
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    gl.viewport(0, 0, last.width, last.height);
    blit(last.fbo);

    bloomBlurProgram.bind();
    for (var i = 0; i < bloomFramebuffers.length; i++) {
        var dest = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, dest.width, dest.height);
        blit(dest.fbo);
        last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (var i$1 = bloomFramebuffers.length - 2; i$1 >= 0; i$1--) {
        var baseTex = bloomFramebuffers[i$1];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        blit(baseTex.fbo);
        last = baseTex;
    }

    gl.disable(gl.BLEND);
    bloomFinalProgram.bind();
    gl.uniform2f(bloomFinalProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    var audioBloomBoost = (config.AUDIO_INPUT || 'off') !== 'off' ? audioState.bloomBoost : 0;
    var bloomIntensityMultiplier = clamp(1 + (audioBloomBoost * 0.42) + (autoplayBloomBoost * 0.12), 0.6, 1.28);
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY * bloomIntensityMultiplier);
    gl.viewport(0, 0, destination.width, destination.height);
    blit(destination.fbo);
}

function applySunrays (source, mask, destination) {
    gl.disable(gl.BLEND);
    sunraysMaskProgram.bind();
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
    gl.viewport(0, 0, mask.width, mask.height);
    blit(mask.fbo);

    sunraysProgram.bind();
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
    gl.viewport(0, 0, destination.width, destination.height);
    blit(destination.fbo);
}

function blur (target, temp, iterations) {
    blurProgram.bind();
    for (var i = 0; i < iterations; i++) {
        gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
        gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
        blit(temp.fbo);

        gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
        gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
        blit(target.fbo);
    }
}

function splatPointer (pointer) {
    var movement = Math.sqrt((pointer.deltaX * pointer.deltaX) + (pointer.deltaY * pointer.deltaY));
    if (movement <= 0.00005) { return; }

    if (!pointer.down) {
        if (movement < 0.00026) { return; }

        pointer.filteredDeltaX = (pointer.filteredDeltaX * 0.66) + (pointer.deltaX * 0.34);
        pointer.filteredDeltaY = (pointer.filteredDeltaY * 0.66) + (pointer.deltaY * 0.34);
        pointer.hoverCarry += movement;

        var speedPhase = clamp((movement - 0.00026) * 1180, 0, 1);
        var easedSpeed = speedPhase * speedPhase * (3.0 - (2.0 * speedPhase));
        var gentlePhase = Math.pow(easedSpeed, 1.45);
        var fluidSample = samplePointerFluidState(pointer);
        var sampledEnergy = fluidSample.energy;
        var sampledChroma = getColorChroma(fluidSample.color);
        var spacing = clamp(0.0033 - (easedSpeed * 0.00205), 0.00125, 0.0033);
        if (pointer.hoverCarry < spacing) { return; }

        var hoverColorBlend = (0.014 + (easedSpeed * 0.052)) * (sampledEnergy > 0.14 ? 0.72 : 1.0);
        var hoverColorContrast = 0.1 + (gentlePhase * 0.08) + ((0.1 - Math.min(sampledChroma, 0.1)) * 0.2);
        var hoverColorMaxChannel = 0.64 + (easedSpeed * 0.07);
        var hoverBaseColor = fluidSample.color
            ? mixColors(fluidSample.color, pointer.color, 0.6 + (easedSpeed * 0.12))
            : pointer.color;
        var hoverColor = preserveColorContrast(
            mixColors(hoverBaseColor, generateColor(), hoverColorBlend),
            hoverColorContrast,
            hoverColorMaxChannel
        );
        var hoverForce = 0.016 + (easedSpeed * 0.07);
        var hoverRadius = 0.072 + (easedSpeed * 0.095);
        var segmentX = pointer.texcoordX - pointer.prevTexcoordX;
        var segmentY = pointer.texcoordY - pointer.prevTexcoordY;
        var segmentDeltaX = correctDeltaX(segmentX);
        var segmentDeltaY = correctDeltaY(segmentY);
        var filteredMagnitude = Math.sqrt((pointer.filteredDeltaX * pointer.filteredDeltaX) + (pointer.filteredDeltaY * pointer.filteredDeltaY));
        var segmentMagnitude = Math.sqrt((segmentDeltaX * segmentDeltaX) + (segmentDeltaY * segmentDeltaY));
        var directionX = segmentMagnitude > 0.000001 ? segmentDeltaX / segmentMagnitude : 0;
        var directionY = segmentMagnitude > 0.000001 ? segmentDeltaY / segmentMagnitude : 0;
        var motionMagnitude = Math.max(filteredMagnitude * (0.42 + (easedSpeed * 0.24)), segmentMagnitude * (0.86 + (easedSpeed * 0.12)));
        var dx = directionX * motionMagnitude * config.SPLAT_FORCE * hoverForce;
        var dy = directionY * motionMagnitude * config.SPLAT_FORCE * hoverForce;
        var steps = easedSpeed > 0.88 ? 2 : 1;
        var splatColor = hoverColor;

        for (var i = 0; i < steps; i++) {
            var t = (i + 1) / steps;
            var x = pointer.prevTexcoordX + (segmentX * t);
            var y = pointer.prevTexcoordY + (segmentY * t);
            emitCreativeSplat(clamp(x, 0.01, 0.99), clamp(y, 0.01, 0.99), dx, dy, splatColor, {
                radiusMultiplier: hoverRadius,
                injectDye: true,
                particleSpread: config.PARTICLE_SPREAD + (easedSpeed * 0.08),
                flowJitter: config.FLOW_JITTER + (easedSpeed * 0.04)
            });
            splatColor = mixColors(splatColor, pointer.color, 0.04 + (easedSpeed * 0.08));
        }

        pointer.color = mixColors(pointer.color, hoverColor, 0.02 + (easedSpeed * 0.04));
        pointer.hoverCarry = Math.max(0, pointer.hoverCarry - (steps * spacing));
        return;
    }

    var dx = pointer.deltaX * config.SPLAT_FORCE;
    var dy = pointer.deltaY * config.SPLAT_FORCE;
    emitCreativeSplat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

function emitCreativeSplat (x, y, dx, dy, color, options) {
    var settings = options || {};
    var injectDye = settings.injectDye !== false;
    var radiusMultiplier = settings.radiusMultiplier === undefined ? 1 : settings.radiusMultiplier;
    var particleShape = settings.particleShape || config.PARTICLE_SHAPE || 'soft';
    var particleSpread = clamp(
        toNumber(
            settings.particleSpread,
            settings.spread === undefined ? config.PARTICLE_SPREAD : settings.spread
        ),
        0,
        1.5
    );
    var flowJitter = clamp(
        toNumber(settings.flowJitter, config.FLOW_JITTER),
        0,
        1.25
    );
    var speed = Math.sqrt((dx * dx) + (dy * dy));
    var direction = speed > 0.0001
        ? { x: dx / speed, y: dy / speed }
        : rotateVector(1, 0, Math.random() * Math.PI * 2);
    var perpendicular = {
        x: -direction.y,
        y: direction.x
    };
    var jitterRotation = (Math.random() - 0.5) * (0.18 + (flowJitter * 0.9));
    var rotatedFlow = rotateVector(dx, dy, jitterRotation);
    var offsetScale = (0.003 + (particleSpread * 0.018)) * (0.88 + (radiusMultiplier * 0.16));

    if (particleShape === 'soft') {
        splat(x, y, rotatedFlow.x, rotatedFlow.y, color, {
            radiusMultiplier: radiusMultiplier,
            injectDye: injectDye
        });
        return;
    }

    if (particleShape === 'spray') {
        var sprayCount = 3 + Math.round(particleSpread * 2);
        for (var sprayIndex = 0; sprayIndex < sprayCount; sprayIndex++) {
            var sprayAngle = Math.random() * Math.PI * 2;
            var sprayDistance = (0.18 + (Math.random() * 0.82)) * offsetScale;
            var sprayFlow = rotateVector(
                rotatedFlow.x * (0.74 + (Math.random() * 0.32)),
                rotatedFlow.y * (0.74 + (Math.random() * 0.32)),
                (Math.random() - 0.5) * (0.28 + (flowJitter * 1.45))
            );
            var sprayColor = injectDye
                ? preserveColorContrast(
                    mixColors(color, generateColor(), 0.05 + (particleSpread * 0.08)),
                    0.12,
                    0.82
                )
                : color;
            splat(
                clamp(x + (Math.cos(sprayAngle) * sprayDistance), 0.01, 0.99),
                clamp(y + (Math.sin(sprayAngle) * sprayDistance), 0.01, 0.99),
                sprayFlow.x,
                sprayFlow.y,
                sprayColor,
                {
                    radiusMultiplier: radiusMultiplier * (0.28 + (Math.random() * 0.42)),
                    injectDye: injectDye
                }
            );
        }
        return;
    }

    if (particleShape === 'ribbon') {
        for (var ribbonIndex = -1; ribbonIndex <= 1; ribbonIndex++) {
            var ribbonOffset = ribbonIndex * offsetScale * 0.92;
            splat(
                clamp(x + (perpendicular.x * ribbonOffset), 0.01, 0.99),
                clamp(y + (perpendicular.y * ribbonOffset), 0.01, 0.99),
                rotatedFlow.x + (perpendicular.x * ribbonIndex * speed * 0.05),
                rotatedFlow.y + (perpendicular.y * ribbonIndex * speed * 0.05),
                color,
                {
                    radiusMultiplier: radiusMultiplier * (ribbonIndex === 0 ? 0.8 : 0.48),
                    injectDye: injectDye
                }
            );
        }
        return;
    }

    if (particleShape === 'ring') {
        var ringSegments = 5 + Math.round(particleSpread * 2);
        var ringOffsetScale = offsetScale * 1.05;
        for (var ringIndex = 0; ringIndex < ringSegments; ringIndex++) {
            var ringAngle = (ringIndex / ringSegments) * Math.PI * 2;
            var ringDirection = {
                x: Math.cos(ringAngle),
                y: Math.sin(ringAngle)
            };
            splat(
                clamp(x + (ringDirection.x * ringOffsetScale), 0.01, 0.99),
                clamp(y + (ringDirection.y * ringOffsetScale), 0.01, 0.99),
                (rotatedFlow.x * 0.72) + (ringDirection.x * speed * 0.08),
                (rotatedFlow.y * 0.72) + (ringDirection.y * speed * 0.08),
                color,
                {
                    radiusMultiplier: radiusMultiplier * 0.26,
                    injectDye: injectDye
                }
            );
        }
        return;
    }

    if (particleShape === 'comet') {
        splat(x, y, rotatedFlow.x, rotatedFlow.y, color, {
            radiusMultiplier: radiusMultiplier * 0.9,
            injectDye: injectDye
        });

        for (var cometIndex = 1; cometIndex <= 3; cometIndex++) {
            var cometPhase = cometIndex / 3;
            var trailOffset = offsetScale * cometIndex * 1.25;
            splat(
                clamp(x - (direction.x * trailOffset), 0.01, 0.99),
                clamp(y - (direction.y * trailOffset), 0.01, 0.99),
                rotatedFlow.x * (0.5 - (cometPhase * 0.12)),
                rotatedFlow.y * (0.5 - (cometPhase * 0.12)),
                injectDye ? mixColors(color, generateColor(), 0.03 * cometIndex) : color,
                {
                    radiusMultiplier: radiusMultiplier * (0.4 - (cometPhase * 0.14)),
                    injectDye: injectDye
                }
            );
        }
        return;
    }

    splat(x, y, rotatedFlow.x, rotatedFlow.y, color, {
        radiusMultiplier: radiusMultiplier,
        injectDye: injectDye
    });
}

function multipleSplats (amount, options) {
    var settings = options || {};
    var colorMultiplier = settings.colorMultiplier === undefined ? 10.0 : settings.colorMultiplier;
    var forceMultiplier = settings.forceMultiplier === undefined ? 1 : settings.forceMultiplier;
    var spread = settings.spread === undefined ? 0.5 : settings.spread;
    var boostMultiplier = settings.boostMultiplier === undefined ? 1 : settings.boostMultiplier;

    for (var i = 0; i < amount; i++) {
        var color = amplifyColor(generateColor(), colorMultiplier * config.COLOR_BOOST * boostMultiplier);
        var x = Math.random();
        var y = Math.random();
        var dx = 1000 * forceMultiplier * spread * (Math.random() - 0.5);
        var dy = 1000 * forceMultiplier * spread * (Math.random() - 0.5);
        emitCreativeSplat(x, y, dx, dy, color, {
            particleSpread: config.PARTICLE_SPREAD
        });
    }
}

function seedFluidState () {
    for (var i = 0; i < 9; i++) {
        var color = amplifyColor(generateColor(), 6.2 * config.COLOR_BOOST);
        var x = Math.random();
        var y = Math.random();
        var dx = 1000 * 0.48 * (Math.random() - 0.5);
        var dy = 1000 * 0.48 * (Math.random() - 0.5);
        enqueueGrowingSplatBurst(x, y, dx, dy, color, {
            radiusMultiplier: 0.92 + (Math.random() * 0.28),
            radiusStartMultiplier: 0.08,
            radiusEndMultiplier: 1.12,
            velocityStart: 0.38,
            velocityEnd: 1.16,
            duration: 0.18 + (Math.random() * 0.08),
            steps: 4,
            delay: Math.random() * 0.06,
            particleSpread: config.PARTICLE_SPREAD + 0.06,
            flowJitter: config.FLOW_JITTER * 0.8
        });
    }
}

function splat (x, y, dx, dy, color, options) {
    var settings = options || {};
    var injectDye = settings.injectDye !== false;
    var radiusMultiplier = settings.radiusMultiplier === undefined ? 1 : settings.radiusMultiplier;

    gl.viewport(0, 0, velocity.width, velocity.height);
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius((config.SPLAT_RADIUS / 100.0) * clamp(radiusMultiplier, 0.12, 2.4)));
    blit(velocity.write.fbo);
    velocity.swap();

    if (!injectDye) { return; }

    gl.viewport(0, 0, dye.width, dye.height);
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write.fbo);
    dye.swap();
}

function correctRadius (radius) {
    var aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1)
        { radius *= aspectRatio; }
    return radius;
}

function emitClickBlast (texcoordX, texcoordY, baseColor) {
    var sampledColor = sampleFluidColorAt(texcoordX, texcoordY);
    var sampledEnergy = getColorEnergy(sampledColor);
    var blastColor = preserveColorContrast(
        mixColors(sampledColor || baseColor, baseColor, sampledEnergy > 0.05 ? 0.32 : 0.52),
        0.18,
        0.82
    );
    var blastSegments = 6;
    var blastForce = 180 + (config.SPLAT_FORCE * 0.022);
    var blastRadius = 0.14 + (config.SPLAT_RADIUS * 0.32);
    var blastOffset = 0.014 + (config.SPLAT_RADIUS * 0.012);

    for (var blastIndex = 0; blastIndex < blastSegments; blastIndex++) {
        var blastAngle = (blastIndex / blastSegments) * Math.PI * 2;
        var outwardX = Math.cos(blastAngle);
        var outwardY = Math.sin(blastAngle);
        emitCreativeSplat(
            clamp(texcoordX + (outwardX * blastOffset), 0.02, 0.98),
            clamp(texcoordY + (outwardY * blastOffset), 0.02, 0.98),
            outwardX * blastForce,
            outwardY * blastForce,
            blastColor,
            {
                radiusMultiplier: blastRadius,
                injectDye: sampledEnergy < 0.06,
                particleShape: 'ring',
                particleSpread: config.PARTICLE_SPREAD + 0.2,
                flowJitter: Math.max(0.04, config.FLOW_JITTER * 0.38)
            }
        );
    }
}

function getRelativePosition (clientX, clientY) {
    var surfaceRect = interactionSurface && interactionSurface.getBoundingClientRect ? interactionSurface.getBoundingClientRect() : null;
    var rect = surfaceRect && surfaceRect.width > 0 && surfaceRect.height > 0 ? surfaceRect : canvas.getBoundingClientRect();
    var localX = clamp(clientX - rect.left, 0, rect.width || 1);
    var localY = clamp(clientY - rect.top, 0, rect.height || 1);
    var canvasWidth = rect.width || canvas.clientWidth || 1;
    var canvasHeight = rect.height || canvas.clientHeight || 1;
    var normalizedX = localX / canvasWidth;
    var normalizedY = localY / canvasHeight;

    return {
        x: clamp(normalizedX, 0, 1) * canvas.width,
        y: clamp(normalizedY, 0, 1) * canvas.height
    };
}

function onMouseDown (e) {
    maybeRequestTiltAccess();
    var position = getRelativePosition(e.clientX, e.clientY);
    var pointer = pointers.find(function (p) { return p.id == -1; });
    if (pointer == null)
        { pointer = new pointerPrototype(); }
    updatePointerDownData(pointer, -1, position.x, position.y);
    emitClickBlast(pointer.texcoordX, pointer.texcoordY, pointer.color);
}

interactionSurface.addEventListener('mousedown', onMouseDown, true);

function onMouseMove (e) {
    var pointer = pointers[0];
    var position = getRelativePosition(e.clientX, e.clientY);
    if (!pointer.down && !config.HOVER) { return; }
    updatePointerMoveData(pointer, position.x, position.y);
    if (!pointer.down) {
        pointer.deltaX *= 0.35;
        pointer.deltaY *= 0.35;
    }
}

interactionSurface.addEventListener('mousemove', onMouseMove, true);

function onMouseLeave () {
    if (pointers[0] && !pointers[0].down) {
        pointers[0].moved = false;
        pointers[0].deltaX = 0;
        pointers[0].deltaY = 0;
    }
}

interactionSurface.addEventListener('mouseleave', onMouseLeave, true);

function onMouseUp () {
    updatePointerUpData(pointers[0]);
}

window.addEventListener('mouseup', onMouseUp);

function onTouchStart (e) {
    if (!config.TOUCH) { return; }
    e.preventDefault();
    maybeRequestTiltAccess();
    var touches = e.targetTouches;
    while (touches.length >= pointers.length)
        { pointers.push(new pointerPrototype()); }
    for (var i = 0; i < touches.length; i++) {
        var position = getRelativePosition(touches[i].clientX, touches[i].clientY);
        updatePointerDownData(pointers[i + 1], touches[i].identifier, position.x, position.y);
        emitClickBlast(pointers[i + 1].texcoordX, pointers[i + 1].texcoordY, pointers[i + 1].color);
    }
}

interactionSurface.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });

function onTouchMove (e) {
    if (!config.TOUCH) { return; }
    e.preventDefault();
    var touches = e.targetTouches;
    for (var i = 0; i < touches.length; i++) {
        var pointer = pointers[i + 1];
        if (!pointer.down) { continue; }
        var position = getRelativePosition(touches[i].clientX, touches[i].clientY);
        updatePointerMoveData(pointer, position.x, position.y);
    }
}

interactionSurface.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });

function onTouchEnd (e) {
    if (!config.TOUCH) { return; }
    var touches = e.changedTouches;
    var loop = function ( i ) {
        var pointer = pointers.find(function (p) { return p.id == touches[i].identifier; });
        if (pointer == null) { return; }
        updatePointerUpData(pointer);
    };

    for (var i = 0; i < touches.length; i++)
    loop( i );
}

window.addEventListener('touchend', onTouchEnd);

function onDeviceOrientation (e) {
    if (!config.TILT) { return; }
    if (e.beta === null && e.gamma === null) { return; }

    var beta = clamp(toNumber(e.beta, 0), -45, 45);
    var gamma = clamp(toNumber(e.gamma, 0), -45, 45);
    var now = Date.now();

    if (tiltState.lastBeta === null || tiltState.lastGamma === null) {
        tiltState.lastBeta = beta;
        tiltState.lastGamma = gamma;
        return;
    }

    var deltaBeta = beta - tiltState.lastBeta;
    var deltaGamma = gamma - tiltState.lastGamma;
    tiltState.lastBeta = beta;
    tiltState.lastGamma = gamma;

    if (Math.abs(deltaBeta) + Math.abs(deltaGamma) < 1.25) { return; }
    if (now - tiltState.lastImpulseTime < 90) { return; }

    tiltState.lastImpulseTime = now;

    emitCreativeSplat(
        clamp(0.5 + (gamma / 120), 0.08, 0.92),
        clamp(0.5 - (beta / 120), 0.08, 0.92),
        deltaGamma * 220,
        deltaBeta * -220,
        amplifyColor(generateColor(), 8.0 * config.COLOR_BOOST)
    );
}

window.addEventListener('deviceorientation', onDeviceOrientation);

function onKeyDown (e) {
    if (e.code === 'KeyP')
        { config.PAUSED = !config.PAUSED; }
    if (e.key === ' ')
        { splatStack.push(parseInt(Math.random() * 20) + 5); }
}

window.addEventListener('keydown', onKeyDown);

function updatePointerDownData (pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.initialized = true;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
    pointer.lastHoverSplatTime = 0;
    pointer.hoverCarry = 0;
    pointer.filteredDeltaX = 0;
    pointer.filteredDeltaY = 0;
    pointer.sampledFluidColor = null;
    pointer.sampledFluidEnergy = 0;
    pointer.sampledFluidX = pointer.texcoordX;
    pointer.sampledFluidY = pointer.texcoordY;
    pointer.lastFluidSampleTime = 0;
}

function updatePointerMoveData (pointer, posX, posY) {
    if (!pointer.initialized) {
        pointer.initialized = true;
        pointer.texcoordX = posX / canvas.width;
        pointer.texcoordY = 1.0 - posY / canvas.height;
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
        pointer.deltaX = 0;
        pointer.deltaY = 0;
        pointer.color = generateColor();
        pointer.hoverCarry = 0;
        pointer.filteredDeltaX = 0;
        pointer.filteredDeltaY = 0;
        pointer.sampledFluidColor = null;
        pointer.sampledFluidEnergy = 0;
        pointer.sampledFluidX = pointer.texcoordX;
        pointer.sampledFluidY = pointer.texcoordY;
        pointer.lastFluidSampleTime = 0;
        return;
    }

    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

function updatePointerUpData (pointer) {
    pointer.down = false;
    pointer.lastHoverSplatTime = 0;
    pointer.hoverCarry = 0;
    pointer.filteredDeltaX = 0;
    pointer.filteredDeltaY = 0;
    pointer.sampledFluidColor = null;
    pointer.sampledFluidEnergy = 0;
    pointer.sampledFluidX = pointer.texcoordX;
    pointer.sampledFluidY = pointer.texcoordY;
    pointer.lastFluidSampleTime = 0;
}

function correctDeltaX (delta) {
    var aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) { delta *= aspectRatio; }
    return delta;
}

function correctDeltaY (delta) {
    var aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) { delta /= aspectRatio; }
    return delta;
}

function generateColor () {
    var c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c = {
        r: c.r * (0.19 * config.COLOR_BOOST),
        g: c.g * (0.19 * config.COLOR_BOOST),
        b: c.b * (0.19 * config.COLOR_BOOST)
    };
    return blendAuraColor(preserveColorContrast(softLimitColor(c, 0.82), 0.24, 0.82));
}

function HSVtoRGB (h, s, v) {
    var r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r: r,
        g: g,
        b: b
    };
}

function normalizeColor (input) {
    var output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };
    return output;
}

function wrap (value, min, max) {
    var range = max - min;
    if (range == 0) { return min; }
    return (value - min) % range + min;
}

function getResolution (resolution) {
    var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1)
        { aspectRatio = 1.0 / aspectRatio; }

    var min = Math.round(resolution);
    var max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        { return { width: max, height: min }; }
    else
        { return { width: min, height: max }; }
}

function getTextureScale (texture, width, height) {
    return {
        x: width / texture.width,
        y: height / texture.height
    };
}

function scaleByPixelRatio (input) {
    var pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}

function hashCode (s) {
    if (s.length == 0) { return 0; }
    var hash = 0;
    for (var i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
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
        interactionSurface.removeEventListener('mousedown', onMouseDown, true);
        interactionSurface.removeEventListener('mousemove', onMouseMove, true);
        interactionSurface.removeEventListener('mouseleave', onMouseLeave, true);
        window.removeEventListener('mouseup', onMouseUp);
        interactionSurface.removeEventListener('touchstart', onTouchStart, true);
        interactionSurface.removeEventListener('touchmove', onTouchMove, true);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('deviceorientation', onDeviceOrientation);
        window.removeEventListener('keydown', onKeyDown);
        stopWebcamMotion();
        stopAudioInput();
    },
    setPaused: function setPaused (paused) {
        config.PAUSED = !!paused;
    }
};
}

window.ArtisticCreationEnvironmentFluid = createAceFluidSimulation;

if (document.body && document.body.getAttribute('data-artistic-fluid-preview') === '1') {
    window.ArtisticCreationEnvironmentFluid(document.body);
}
})();
