import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { Fragment, cloneElement, useEffect, useRef, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { useDispatch, useSelect } from '@wordpress/data';
import { createHigherOrderComponent, useResizeObserver } from '@wordpress/compose';
import { registerFormatType, toggleFormat, applyFormat, removeFormat } from '@wordpress/rich-text';
import {
	BlockVerticalAlignmentToolbar,
	BlockControls,
	ColorPalette,
	InspectorControls,
	InnerBlocks,
	MediaUpload,
	MediaUploadCheck,
	RichTextToolbarButton,
	useBlockProps,
	useInnerBlocksProps,
	useSettings,
} from '@wordpress/block-editor';
import {
	Button,
	Notice,
	PanelBody,
	Popover,
	RangeControl,
	ResizableBox,
	SelectControl,
	TextareaControl,
	ToolbarButton,
	ToolbarGroup,
	ToggleControl,
} from '@wordpress/components';

import './editor.scss';

const pluginData = window.artisticCreationEnvironment || {};
const defaultEffect = pluginData.defaultEffect || 'liquid-splash';
const defaults = pluginData.defaults || {};
const effectCatalog = pluginData.effects || {};
const FLUID_EFFECT = 'liquid-splash';
const ASCII_EFFECT = 'ascii-world';
const AURORA_EFFECT = 'aurora-flow';
const CONSTELLATION_EFFECT = 'particle-constellation';
const TOPO_EFFECT = 'neon-topography';
const CAUSTICS_EFFECT = 'glass-caustics';
const DUST_EFFECT = 'magnetic-dust';

const QUALITY_OPTIONS = [
	{ label: __( 'High', 'artistic-creation-environment' ), value: 1024 },
	{ label: __( 'Medium', 'artistic-creation-environment' ), value: 512 },
	{ label: __( 'Low', 'artistic-creation-environment' ), value: 256 },
	{ label: __( 'Very low', 'artistic-creation-environment' ), value: 128 },
];

const SIM_RESOLUTION_OPTIONS = [
	{ label: '32', value: 32 },
	{ label: '64', value: 64 },
	{ label: '128', value: 128 },
	{ label: '256', value: 256 },
];

const AUDIO_INPUT_OPTIONS = [
	{ label: __( 'Off', 'artistic-creation-environment' ), value: 'off' },
	{
		label: __( 'Microphone', 'artistic-creation-environment' ),
		value: 'microphone',
	},
	{
		label: __( 'System audio', 'artistic-creation-environment' ),
		value: 'system',
	},
];

const FLUID_PRESET_OPTIONS = [
	{ label: __( 'Custom', 'artistic-creation-environment' ), value: 'custom' },
	{
		label: __( 'Paint Storm', 'artistic-creation-environment' ),
		value: 'paint-storm',
	},
	{
		label: __( 'Silk Drift', 'artistic-creation-environment' ),
		value: 'silk-drift',
	},
	{
		label: __( 'Prism Orbit', 'artistic-creation-environment' ),
		value: 'prism-orbit',
	},
	{
		label: __( 'Ink Bloom', 'artistic-creation-environment' ),
		value: 'ink-bloom',
	},
];

const PARTICLE_SHAPE_OPTIONS = [
	{ label: __( 'Soft orb', 'artistic-creation-environment' ), value: 'soft' },
	{
		label: __( 'Spray cluster', 'artistic-creation-environment' ),
		value: 'spray',
	},
	{
		label: __( 'Ribbon smear', 'artistic-creation-environment' ),
		value: 'ribbon',
	},
	{ label: __( 'Halo ring', 'artistic-creation-environment' ), value: 'ring' },
	{
		label: __( 'Comet trail', 'artistic-creation-environment' ),
		value: 'comet',
	},
];

const CONTENT_EFFECT_PRESET_OPTIONS = [
	{ label: __( 'None', 'artistic-creation-environment' ), value: 'none' },
	{ label: __( 'Glass', 'artistic-creation-environment' ), value: 'glass' },
	{ label: __( 'Frost', 'artistic-creation-environment' ), value: 'frost' },
	{
		label: __( 'Inverted', 'artistic-creation-environment' ),
		value: 'invert',
	},
	{ label: __( 'Neon glow', 'artistic-creation-environment' ), value: 'glow' },
	{ label: __( 'Custom', 'artistic-creation-environment' ), value: 'custom' },
];

const CHILD_CONTENT_EFFECT_BLOCKS = [
	'core/heading',
	'core/paragraph',
	'core/list',
	'core/quote',
	'core/pullquote',
	'core/preformatted',
	'core/code',
	'core/button',
];

const BLEND_MODE_OPTIONS = [
	{ label: __( 'Normal', 'artistic-creation-environment' ), value: 'normal' },
	{
		label: __( 'Multiply', 'artistic-creation-environment' ),
		value: 'multiply',
	},
	{ label: __( 'Screen', 'artistic-creation-environment' ), value: 'screen' },
	{ label: __( 'Overlay', 'artistic-creation-environment' ), value: 'overlay' },
	{ label: __( 'Darken', 'artistic-creation-environment' ), value: 'darken' },
	{
		label: __( 'Lighten', 'artistic-creation-environment' ),
		value: 'lighten',
	},
	{
		label: __( 'Colour dodge', 'artistic-creation-environment' ),
		value: 'color-dodge',
	},
	{
		label: __( 'Colour burn', 'artistic-creation-environment' ),
		value: 'color-burn',
	},
	{
		label: __( 'Hard light', 'artistic-creation-environment' ),
		value: 'hard-light',
	},
	{
		label: __( 'Soft light', 'artistic-creation-environment' ),
		value: 'soft-light',
	},
	{
		label: __( 'Difference', 'artistic-creation-environment' ),
		value: 'difference',
	},
	{
		label: __( 'Exclusion', 'artistic-creation-environment' ),
		value: 'exclusion',
	},
	{ label: __( 'Hue', 'artistic-creation-environment' ), value: 'hue' },
	{
		label: __( 'Saturation', 'artistic-creation-environment' ),
		value: 'saturation',
	},
	{
		label: __( 'Colour', 'artistic-creation-environment' ),
		value: 'color',
	},
	{
		label: __( 'Luminosity', 'artistic-creation-environment' ),
		value: 'luminosity',
	},
	{
		label: __( 'Plus lighter', 'artistic-creation-environment' ),
		value: 'plus-lighter',
	},
];

const VERTICAL_ALIGN_OPTIONS = [
	{ label: __( 'Top', 'artistic-creation-environment' ), value: 'top' },
	{ label: __( 'Middle', 'artistic-creation-environment' ), value: 'center' },
	{ label: __( 'Bottom', 'artistic-creation-environment' ), value: 'bottom' },
];

const ASCII_SOURCE_OPTIONS = [
	{
		label: __( 'Built-in world map', 'artistic-creation-environment' ),
		value: 'world-map',
	},
	{
		label: __( 'Custom ASCII art', 'artistic-creation-environment' ),
		value: 'ascii-art',
	},
	{
		label: __( 'Image override', 'artistic-creation-environment' ),
		value: 'image',
	},
];

const ASCII_CHARACTER_SET_OPTIONS = [
	{ label: __( 'Atlas', 'artistic-creation-environment' ), value: 'atlas' },
	{ label: __( 'Dense', 'artistic-creation-environment' ), value: 'dense' },
	{ label: __( 'Glow', 'artistic-creation-environment' ), value: 'glow' },
	{ label: __( 'Blocks', 'artistic-creation-environment' ), value: 'blocks' },
];

const DEFAULT_CONTENT_SURFACE_COLOR = '#ffffff';
const CHILD_INTERACTION_MODE_OPTIONS = [
	{ label: __( 'None', 'artistic-creation-environment' ), value: 'none' },
	{ label: __( 'Push away', 'artistic-creation-environment' ), value: 'repel' },
	{
		label: __( 'Pull inward', 'artistic-creation-environment' ),
		value: 'attract',
	},
	{ label: __( 'Orbit', 'artistic-creation-environment' ), value: 'orbit' },
	{ label: __( 'Float drift', 'artistic-creation-environment' ), value: 'drift' },
	{ label: __( 'Pulse', 'artistic-creation-environment' ), value: 'pulse' },
];
const RESIZABLE_BOX_ENABLE_OPTION = {
	top: false,
	right: false,
	bottom: true,
	left: false,
	topRight: false,
	bottomRight: false,
	bottomLeft: false,
	topLeft: false,
};

const EFFECT_OPTIONS = [
	{
		label: __( 'Site default', 'artistic-creation-environment' ),
		value: 'site-default',
	},
	{
		label:
			effectCatalog[ FLUID_EFFECT ]?.label ||
			__( 'Fluid Simulation', 'artistic-creation-environment' ),
		value: FLUID_EFFECT,
	},
	{
		label:
			effectCatalog[ ASCII_EFFECT ]?.label ||
			__( 'ASCII World', 'artistic-creation-environment' ),
		value: ASCII_EFFECT,
	},
	{
		label:
			effectCatalog[ AURORA_EFFECT ]?.label ||
			__( 'Aurora Flow', 'artistic-creation-environment' ),
		value: AURORA_EFFECT,
	},
	{
		label:
			effectCatalog[ CONSTELLATION_EFFECT ]?.label ||
			__( 'Particle Constellation', 'artistic-creation-environment' ),
		value: CONSTELLATION_EFFECT,
	},
	{
		label:
			effectCatalog[ TOPO_EFFECT ]?.label ||
			__( 'Neon Topography', 'artistic-creation-environment' ),
		value: TOPO_EFFECT,
	},
	{
		label:
			effectCatalog[ CAUSTICS_EFFECT ]?.label ||
			__( 'Glass Caustics', 'artistic-creation-environment' ),
		value: CAUSTICS_EFFECT,
	},
	{
		label:
			effectCatalog[ DUST_EFFECT ]?.label ||
			__( 'Magnetic Dust', 'artistic-creation-environment' ),
		value: DUST_EFFECT,
	},
];

const DEFAULT_BACKGROUND_COLOR = '#1c1226';
const LEGACY_ASCII_BACKGROUND_COLOR = '#020617';
const DEFAULT_OVERLAY_COLOR = '#000000';
const DEFAULT_BLOCK_MIN_HEIGHT = 320;
const MIN_BLOCK_HEIGHT = 120;
const DEFAULT_ASCII_TINT_COLOR = '#7dd3fc';
const LEGACY_BACKDROP_COLORS = {
	aurora: '#1c1226',
	lagoon: '#0c2a28',
	candy: '#38182c',
	sunset: '#46221c',
	frost: '#222638',
};

const FLUID_PRESETS = {
	'paint-storm': {
		aceCreativeBackgroundParticleShape: 'spray',
		aceCreativeBackgroundParticleSpread: 1.1,
		aceCreativeBackgroundFlowJitter: 0.72,
		aceCreativeBackgroundAutoplay: true,
		aceCreativeBackgroundAutoplayIntensity: 1.25,
		aceCreativeBackgroundAutoplayEasing: 1.9,
		aceCreativeBackgroundColorBoost: 2.35,
		aceCreativeBackgroundBloom: true,
		aceCreativeBackgroundBloomIntensity: 0.5,
		aceCreativeBackgroundBloomThreshold: 0.72,
		aceCreativeBackgroundCurl: 38,
		aceCreativeBackgroundSplatRadius: 0.55,
		aceCreativeBackgroundShading: true,
	},
	'silk-drift': {
		aceCreativeBackgroundParticleShape: 'ribbon',
		aceCreativeBackgroundParticleSpread: 0.42,
		aceCreativeBackgroundFlowJitter: 0.16,
		aceCreativeBackgroundAutoplay: true,
		aceCreativeBackgroundAutoplayIntensity: 0.72,
		aceCreativeBackgroundAutoplayEasing: 2.2,
		aceCreativeBackgroundColorBoost: 1.7,
		aceCreativeBackgroundBloom: true,
		aceCreativeBackgroundBloomIntensity: 0.28,
		aceCreativeBackgroundBloomThreshold: 0.82,
		aceCreativeBackgroundCurl: 22,
		aceCreativeBackgroundSplatRadius: 0.36,
		aceCreativeBackgroundShading: true,
	},
	'prism-orbit': {
		aceCreativeBackgroundParticleShape: 'ring',
		aceCreativeBackgroundParticleSpread: 0.86,
		aceCreativeBackgroundFlowJitter: 0.38,
		aceCreativeBackgroundAutoplay: true,
		aceCreativeBackgroundAutoplayIntensity: 0.95,
		aceCreativeBackgroundAutoplayEasing: 1.5,
		aceCreativeBackgroundColorBoost: 2.15,
		aceCreativeBackgroundBloom: true,
		aceCreativeBackgroundBloomIntensity: 0.62,
		aceCreativeBackgroundBloomThreshold: 0.7,
		aceCreativeBackgroundCurl: 34,
		aceCreativeBackgroundSplatRadius: 0.48,
		aceCreativeBackgroundAuraMode: true,
		aceCreativeBackgroundShading: true,
	},
	'ink-bloom': {
		aceCreativeBackgroundParticleShape: 'comet',
		aceCreativeBackgroundParticleSpread: 0.58,
		aceCreativeBackgroundFlowJitter: 0.48,
		aceCreativeBackgroundAutoplay: true,
		aceCreativeBackgroundAutoplayIntensity: 0.82,
		aceCreativeBackgroundAutoplayEasing: 1.7,
		aceCreativeBackgroundColorBoost: 2,
		aceCreativeBackgroundBloom: false,
		aceCreativeBackgroundBloomIntensity: 0.22,
		aceCreativeBackgroundBloomThreshold: 0.84,
		aceCreativeBackgroundCurl: 44,
		aceCreativeBackgroundSplatRadius: 0.68,
		aceCreativeBackgroundShading: true,
	},
};

const CONTENT_EFFECT_PRESETS = {
	none: {
		aceCreativeContentBlendMode: 'normal',
		aceCreativeContentBackdropBlur: 0,
		aceCreativeContentSurfaceOpacity: 0,
		aceCreativeContentBorderOpacity: 0,
		aceCreativeContentSurfaceColor: DEFAULT_CONTENT_SURFACE_COLOR,
		aceCreativeContentInvert: false,
	},
	glass: {
		aceCreativeContentBlendMode: 'screen',
		aceCreativeContentBackdropBlur: 16,
		aceCreativeContentSurfaceOpacity: 0.14,
		aceCreativeContentBorderOpacity: 0.24,
		aceCreativeContentSurfaceColor: DEFAULT_CONTENT_SURFACE_COLOR,
		aceCreativeContentInvert: false,
	},
	frost: {
		aceCreativeContentBlendMode: 'overlay',
		aceCreativeContentBackdropBlur: 24,
		aceCreativeContentSurfaceOpacity: 0.2,
		aceCreativeContentBorderOpacity: 0.3,
		aceCreativeContentSurfaceColor: DEFAULT_CONTENT_SURFACE_COLOR,
		aceCreativeContentInvert: false,
	},
	invert: {
		aceCreativeContentBlendMode: 'difference',
		aceCreativeContentBackdropBlur: 0,
		aceCreativeContentSurfaceOpacity: 0.08,
		aceCreativeContentBorderOpacity: 0.16,
		aceCreativeContentSurfaceColor: DEFAULT_CONTENT_SURFACE_COLOR,
		aceCreativeContentInvert: true,
	},
	glow: {
		aceCreativeContentBlendMode: 'screen',
		aceCreativeContentBackdropBlur: 10,
		aceCreativeContentSurfaceOpacity: 0.1,
		aceCreativeContentBorderOpacity: 0.18,
		aceCreativeContentSurfaceColor: '#d8f3ff',
		aceCreativeContentInvert: false,
	},
};

const ATTRIBUTE_DEFINITIONS = {
	aceCreativeBackgroundEffect: {
		type: 'string',
		default: 'site-default',
	},
	aceCreativeBackgroundPreset: {
		type: 'string',
		default: 'custom',
	},
	aceCreativeOverlayColor: {
		type: 'string',
		default: DEFAULT_OVERLAY_COLOR,
	},
	aceCreativeOverlayOpacity: {
		type: 'number',
		default: 0.2,
	},
	aceCreativeBackgroundColor: {
		type: 'string',
	},
	aceCreativeBackgroundDyeResolution: { type: 'number' },
	aceCreativeBackgroundSimResolution: { type: 'number' },
	aceCreativeBackgroundDensityDissipation: { type: 'number' },
	aceCreativeBackgroundVelocityDissipation: { type: 'number' },
	aceCreativeBackgroundPressure: { type: 'number' },
	aceCreativeBackgroundCurl: { type: 'number' },
	aceCreativeBackgroundSplatRadius: { type: 'number' },
	aceCreativeBackgroundParticleShape: {
		type: 'string',
		default: 'soft',
	},
	aceCreativeBackgroundParticleSpread: {
		type: 'number',
		default: 0.36,
	},
	aceCreativeBackgroundFlowJitter: {
		type: 'number',
		default: 0.22,
	},
	aceCreativeBackgroundShading: { type: 'boolean' },
	aceCreativeBackgroundColorful: { type: 'boolean' },
	aceCreativeBackgroundBloom: { type: 'boolean' },
	aceCreativeBackgroundBloomIntensity: { type: 'number' },
	aceCreativeBackgroundBloomThreshold: { type: 'number' },
	aceCreativeBackgroundSunrays: { type: 'boolean' },
	aceCreativeBackgroundSunraysWeight: { type: 'number' },
	aceCreativeBackgroundAutoplay: { type: 'boolean' },
	aceCreativeBackgroundAutoplayIntensity: { type: 'number' },
	aceCreativeBackgroundAutoplayEasing: { type: 'number' },
	aceCreativeBackgroundHover: { type: 'boolean' },
	aceCreativeBackgroundTouch: { type: 'boolean' },
	aceCreativeBackgroundTilt: { type: 'boolean' },
	aceCreativeBackgroundWebcamMotion: { type: 'boolean' },
	aceCreativeBackgroundWebcamColorMix: { type: 'boolean' },
	aceCreativeBackgroundWebcamIntensity: { type: 'number' },
	aceCreativeBackgroundAudioInput: { type: 'string' },
	aceCreativeBackgroundAudioIntensity: { type: 'number' },
	aceCreativeBackgroundColorBoost: { type: 'number' },
	aceCreativeBackgroundAuraMode: { type: 'boolean' },
	aceCreativeBackgroundBackdropStyle: { type: 'string' },
	aceCreativeAsciiSource: {
		type: 'string',
		default: 'world-map',
	},
	aceCreativeAsciiImageUrl: {
		type: 'string',
		default: '',
	},
	aceCreativeAsciiImageId: {
		type: 'number',
	},
	aceCreativeAsciiImageWidth: {
		type: 'number',
	},
	aceCreativeAsciiImageHeight: {
		type: 'number',
	},
	aceCreativeAsciiCustomText: {
		type: 'string',
		default: '',
	},
	aceCreativeAsciiCharacterSet: {
		type: 'string',
		default: 'atlas',
	},
	aceCreativeAsciiDensity: {
		type: 'number',
		default: 128,
	},
	aceCreativeAsciiFontSize: {
		type: 'number',
		default: 11,
	},
	aceCreativeAsciiTintColor: {
		type: 'string',
		default: DEFAULT_ASCII_TINT_COLOR,
	},
	aceCreativeAsciiGlow: {
		type: 'number',
		default: 0.38,
	},
	aceCreativeAsciiContrast: {
		type: 'number',
		default: 1.14,
	},
	aceCreativeAsciiMotion: {
		type: 'number',
		default: 0.72,
	},
	aceCreativeAsciiInteraction: {
		type: 'number',
		default: 0.88,
	},
	aceCreativeAsciiNoise: {
		type: 'number',
		default: 0.08,
	},
	aceCreativeAsciiInvert: {
		type: 'boolean',
		default: false,
	},
	aceCreativeContentEffectPreset: {
		type: 'string',
		default: 'none',
	},
	aceCreativeContentBlendMode: {
		type: 'string',
		default: 'normal',
	},
	aceCreativeContentBackdropBlur: {
		type: 'number',
		default: 0,
	},
	aceCreativeContentSurfaceOpacity: {
		type: 'number',
		default: 0,
	},
	aceCreativeContentBorderOpacity: {
		type: 'number',
		default: 0,
	},
	aceCreativeContentSurfaceColor: {
		type: 'string',
		default: DEFAULT_CONTENT_SURFACE_COLOR,
	},
	aceCreativeContentInvert: {
		type: 'boolean',
		default: false,
	},
	aceCreativeChildInteractionMode: {
		type: 'string',
		default: 'none',
	},
	aceCreativeChildInteractionIntensity: {
		type: 'number',
		default: 1,
	},
	aceCreativeChildInteractionRadius: {
		type: 'number',
		default: 220,
	},
	aceCreativeChildInteractionDepth: {
		type: 'number',
		default: 44,
	},
	aceCreativeChildInteractionIdle: {
		type: 'number',
		default: 0.18,
	},
	aceCreativeVerticalAlign: {
		type: 'string',
		default: 'top',
	},
	// --- Aurora Flow ---
	aceCreativeAuroraSpeed: { type: 'number', default: 1.0 },
	aceCreativeAuroraPalette: { type: 'string', default: 'aurora' },
	aceCreativeAuroraIntensity: { type: 'number', default: 1.0 },
	aceCreativeAuroraBands: { type: 'number', default: 5 },
	aceCreativeAuroraPointerInfluence: { type: 'number', default: 0.5 },
	// --- Particle Constellation ---
	aceCreativeConstellationCount: { type: 'number', default: 120 },
	aceCreativeConstellationConnectDistance: { type: 'number', default: 160 },
	aceCreativeConstellationPointerMode: { type: 'string', default: 'attract' },
	aceCreativeConstellationParticleColor: { type: 'string', default: '#a5b4fc' },
	aceCreativeConstellationLineColor: { type: 'string', default: '#818cf8' },
	aceCreativeConstellationSpeed: { type: 'number', default: 0.5 },
	// --- Neon Topography ---
	aceCreativeTopoSpeed: { type: 'number', default: 1.0 },
	aceCreativeTopoLineDensity: { type: 'number', default: 8 },
	aceCreativeTopoColorScheme: { type: 'string', default: 'cyan' },
	aceCreativeTopoPointerInfluence: { type: 'number', default: 0.6 },
	aceCreativeTopoGlow: { type: 'number', default: 1.0 },
	// --- Glass Caustics ---
	aceCreativeCausticsSpeed: { type: 'number', default: 0.8 },
	aceCreativeCausticsRefraction: { type: 'number', default: 1.0 },
	aceCreativeCausticsColorTemp: { type: 'string', default: 'cool' },
	aceCreativeCausticsPointerInfluence: { type: 'number', default: 0.6 },
	aceCreativeCausticsBrightness: { type: 'number', default: 1.2 },
	// --- Magnetic Dust ---
	aceCreativeDustParticleCount: { type: 'number', default: 600 },
	aceCreativeDustFieldSpeed: { type: 'number', default: 0.0004 },
	aceCreativeDustFieldScale: { type: 'number', default: 0.003 },
	aceCreativeDustTrailFade: { type: 'number', default: 0.06 },
	aceCreativeDustColor: { type: 'string', default: '#b8a8f8' },
	aceCreativeDustPointerMode: { type: 'string', default: 'attract' },
};

const resolveValue = ( attributes, key ) =>
	attributes?.[ key ] !== undefined
		? attributes[ key ]
		: defaults[ key ] !== undefined
			? defaults[ key ]
			: ATTRIBUTE_DEFINITIONS[ key ]?.default;

const resolveLegacyBackdropColor = ( backdropStyle ) =>
	LEGACY_BACKDROP_COLORS[ backdropStyle ] || DEFAULT_BACKGROUND_COLOR;

const getExplicitAsciiBackgroundColor = ( attributes = {} ) => {
	const value = attributes.aceCreativeBackgroundColor;

	if ( typeof value !== 'string' || ! value ) {
		return undefined;
	}

	return value.toLowerCase() === LEGACY_ASCII_BACKGROUND_COLOR
		? undefined
		: value;
};

const resolveBackgroundColor = ( attributes = {} ) => {
	const resolvedEffect = resolveEffect(
		attributes.aceCreativeBackgroundEffect || 'site-default'
	);

	if ( resolvedEffect === ASCII_EFFECT ) {
		return getExplicitAsciiBackgroundColor( attributes ) || 'transparent';
	}

	return (
		attributes.aceCreativeBackgroundColor ||
		defaults.aceCreativeBackgroundColor ||
		resolveLegacyBackdropColor(
			resolveValue( attributes, 'aceCreativeBackgroundBackdropStyle' )
		)
	);
};

const getMinHeightValue = ( attributes = {} ) => {
	const rawValue = attributes?.style?.dimensions?.minHeight;

	if ( typeof rawValue === 'number' ) {
		return rawValue;
	}

	if ( typeof rawValue !== 'string' ) {
		return undefined;
	}

	const parsedValue = parseInt( rawValue, 10 );
	return Number.isFinite( parsedValue ) ? parsedValue : undefined;
};

const getContentPresetValues = ( attributes = {} ) => {
	const preset =
		attributes.aceCreativeContentEffectPreset &&
		CONTENT_EFFECT_PRESETS[ attributes.aceCreativeContentEffectPreset ]
			? CONTENT_EFFECT_PRESETS[ attributes.aceCreativeContentEffectPreset ]
			: CONTENT_EFFECT_PRESETS.none;

	return {
		blendMode:
			attributes.aceCreativeContentBlendMode ??
			preset.aceCreativeContentBlendMode,
		backdropBlur:
			attributes.aceCreativeContentBackdropBlur ??
			preset.aceCreativeContentBackdropBlur,
		surfaceOpacity:
			attributes.aceCreativeContentSurfaceOpacity ??
			preset.aceCreativeContentSurfaceOpacity,
		borderOpacity:
			attributes.aceCreativeContentBorderOpacity ??
			preset.aceCreativeContentBorderOpacity,
		surfaceColor:
			attributes.aceCreativeContentSurfaceColor ??
			preset.aceCreativeContentSurfaceColor,
		invert:
			attributes.aceCreativeContentInvert ?? preset.aceCreativeContentInvert,
	};
};

const hasContentEffects = ( attributes = {} ) => {
	const contentValues = getContentPresetValues( attributes );

	return (
		( attributes.aceCreativeContentEffectPreset || 'none' ) !== 'none' &&
			( attributes.aceCreativeContentEffectPreset || 'none' ) !== 'custom' ||
		contentValues.backdropBlur > 0 ||
		contentValues.surfaceOpacity > 0 ||
		contentValues.borderOpacity > 0 ||
		contentValues.invert ||
		contentValues.blendMode !== 'normal'
	);
};

const getChildInteractivityValues = ( attributes = {} ) => ( {
	mode: attributes.aceCreativeChildInteractionMode || 'none',
	intensity:
		attributes.aceCreativeChildInteractionIntensity ??
		ATTRIBUTE_DEFINITIONS.aceCreativeChildInteractionIntensity.default,
	radius:
		attributes.aceCreativeChildInteractionRadius ??
		ATTRIBUTE_DEFINITIONS.aceCreativeChildInteractionRadius.default,
	depth:
		attributes.aceCreativeChildInteractionDepth ??
		ATTRIBUTE_DEFINITIONS.aceCreativeChildInteractionDepth.default,
	idle:
		attributes.aceCreativeChildInteractionIdle ??
		ATTRIBUTE_DEFINITIONS.aceCreativeChildInteractionIdle.default,
} );

const hasChildInteractivity = ( attributes = {} ) => {
	const values = getChildInteractivityValues( attributes );

	return (
		values.mode !== 'none' &&
		values.intensity > 0 &&
		values.radius > 0 &&
		values.depth > 0
	);
};

const getOuterClassName = ( attributes = {} ) =>
	[
		'artistic-creative',
		hasContentEffects( attributes )
			? 'artistic-creative--content-effects'
			: null,
		hasChildInteractivity( attributes )
			? 'artistic-creative--child-interactivity'
			: null,
	]
		.filter( Boolean )
		.join( ' ' );

const getContentEffectStyle = ( attributes = {} ) => {
	const contentValues = getContentPresetValues( attributes );

	if ( ! hasContentEffects( attributes ) ) {
		return undefined;
	}

	const preset = attributes.aceCreativeContentEffectPreset || 'none';
	const presetShadow =
		preset === 'glow'
			? '0 0 22px rgba(125, 240, 255, 0.38), 0 0 44px rgba(255, 120, 224, 0.18)'
			: preset === 'glass'
				? '0 18px 48px rgba(15, 23, 42, 0.16)'
				: preset === 'frost'
					? '0 20px 52px rgba(15, 23, 42, 0.2)'
					: preset === 'invert'
						? '0 10px 28px rgba(0, 0, 0, 0.18)'
						: 'none';
	const presetSaturate =
		preset === 'glow'
			? 180
			: preset === 'glass'
				? 150
				: preset === 'frost'
					? 165
					: 100;
	return {
		'--ace-content-blend-mode': contentValues.blendMode || 'normal',
		'--ace-content-backdrop-blur': `${ contentValues.backdropBlur || 0 }px`,
		'--ace-content-surface-opacity': String(
			contentValues.surfaceOpacity || 0
		),
		'--ace-content-border-opacity': String(
			contentValues.borderOpacity || 0
		),
		'--ace-content-surface-color':
			contentValues.surfaceColor || DEFAULT_CONTENT_SURFACE_COLOR,
		'--ace-content-invert': contentValues.invert ? '1' : '0',
		'--ace-content-shadow': presetShadow,
		'--ace-content-saturate': `${ presetSaturate }%`,
	};
};

const getChildInteractivityStyle = ( attributes = {} ) => {
	if ( ! hasChildInteractivity( attributes ) ) {
		return undefined;
	}

	const values = getChildInteractivityValues( attributes );

	return {
		'--ace-child-interaction-intensity': String( values.intensity || 0 ),
		'--ace-child-interaction-radius': `${ values.radius || 0 }px`,
		'--ace-child-interaction-depth': `${ values.depth || 0 }px`,
		'--ace-child-interaction-idle': String( values.idle || 0 ),
	};
};

const getBlockDataAttributes = ( attributes = {} ) =>
	hasChildInteractivity( attributes )
		? {
				'data-ace-child-interaction-mode':
					getChildInteractivityValues( attributes ).mode,
		  }
		: {};

const getVerticalAlignStyle = ( attributes = {} ) => {
	const verticalAlign = attributes.aceCreativeVerticalAlign || 'top';

	if ( verticalAlign === 'top' ) {
		return undefined;
	}

	return {
		'--ace-vertical-justify':
			verticalAlign === 'bottom' ? 'flex-end' : 'center',
	};
};

const getEditorBlockStyle = ( attributes = {} ) => {
	const contentStyle = getContentEffectStyle( attributes ) || {};
	const childInteractivityStyle =
		getChildInteractivityStyle( attributes ) || {};
	const verticalAlignStyle = getVerticalAlignStyle( attributes ) || {};
	const blockStyle = {
		...contentStyle,
		...childInteractivityStyle,
		...verticalAlignStyle,
	};

	if ( attributes?.style?.dimensions?.minHeight ) {
		return Object.keys( blockStyle ).length ? blockStyle : undefined;
	}

	return {
		...blockStyle,
		minHeight: `${ DEFAULT_BLOCK_MIN_HEIGHT }px`,
	};
};

const getSavedBlockStyle = ( attributes = {} ) => {
	const blockStyle = {
		...( getContentEffectStyle( attributes ) || {} ),
		...( getChildInteractivityStyle( attributes ) || {} ),
		...( getVerticalAlignStyle( attributes ) || {} ),
	};

	return Object.keys( blockStyle ).length ? blockStyle : undefined;
};

const resolveEffect = ( effectValue ) => {
	if ( effectValue === 'site-default' ) {
		return defaultEffect;
	}

	return effectValue || '';
};

const getRuntimeFactory = ( effect ) => {
	if ( effect === ASCII_EFFECT ) {
		return window.ArtisticCreationEnvironmentAscii;
	}

	if ( effect === FLUID_EFFECT ) {
		return window.ArtisticCreationEnvironmentFluid;
	}

	if ( effect === AURORA_EFFECT ) {
		return window.ArtisticCreationEnvironmentAurora;
	}

	if ( effect === CONSTELLATION_EFFECT ) {
		return window.ArtisticCreationEnvironmentConstellation;
	}

	if ( effect === TOPO_EFFECT ) {
		return window.ArtisticCreationEnvironmentTopo;
	}

	if ( effect === CAUSTICS_EFFECT ) {
		return window.ArtisticCreationEnvironmentCaustics;
	}

	if ( effect === DUST_EFFECT ) {
		return window.ArtisticCreationEnvironmentDust;
	}

	return null;
};

const getCreativeInteractiveTargets = ( blockElement ) =>
	blockElement?.querySelector(
		'.artistic-creative__inner-container > .block-editor-inner-blocks > .block-editor-block-list__layout'
	 ) ||
	blockElement?.querySelector(
		'.artistic-creative__inner-container > .block-editor-block-list__layout'
	 ) ||
	blockElement?.querySelector( '.artistic-creative__inner-container' ) ||
	null;

const createCreativeChildInteractivity = ( blockElement ) => {
	if (
		! blockElement?.querySelector ||
		typeof window === 'undefined' ||
		window.matchMedia?.( '(prefers-reduced-motion: reduce)' )?.matches
	) {
		return null;
	}

	const mode =
		blockElement.getAttribute( 'data-ace-child-interaction-mode' ) || 'none';

	if ( mode === 'none' ) {
		return null;
	}

	const targetsContainer = getCreativeInteractiveTargets( blockElement );

	if ( ! targetsContainer ) {
		return null;
	}

	const computedStyle = window.getComputedStyle( blockElement );
	const intensity = Math.max(
		0,
		parseFloat(
			computedStyle.getPropertyValue(
				'--ace-child-interaction-intensity'
			)
		) || 0
	);
	const radius = Math.max(
		1,
		parseFloat(
			computedStyle.getPropertyValue( '--ace-child-interaction-radius' )
		) || 0
	);
	const depth = Math.max(
		0,
		parseFloat(
			computedStyle.getPropertyValue( '--ace-child-interaction-depth' )
		) || 0
	);
	const idle = Math.max(
		0,
		parseFloat(
			computedStyle.getPropertyValue( '--ace-child-interaction-idle' )
		) || 0
	);

	if ( intensity <= 0 || depth <= 0 ) {
		return null;
	}

	targetsContainer.classList.add( 'artistic-creative__interactive-targets' );

	let frameHandle = 0;
	let destroyed = false;
	const pointer = {
		x: 0,
		y: 0,
		active: false,
	};
	const nodeStates = new WeakMap();
	const targetFilter = ( node ) =>
		node?.nodeType === 1 &&
		! node.classList.contains( 'block-list-appender' ) &&
		! node.classList.contains( 'block-editor-default-block-appender' );
	const getTargets = () =>
		Array.from( targetsContainer.children || [] ).filter( targetFilter );
	const getNodeState = ( node, index ) => {
		if ( ! nodeStates.has( node ) ) {
			nodeStates.set( node, {
				x: 0,
				y: 0,
				scale: 1,
				rotate: 0,
				direction: index % 2 === 0 ? 1 : -1,
			} );
		}

		return nodeStates.get( node );
	};
	const resetNode = ( node ) => {
		node.style.setProperty( '--ace-child-offset-x', '0px' );
		node.style.setProperty( '--ace-child-offset-y', '0px' );
		node.style.setProperty( '--ace-child-scale', '1' );
		node.style.setProperty( '--ace-child-rotate', '0deg' );
	};
	const onPointerMove = ( event ) => {
		pointer.x = event.clientX;
		pointer.y = event.clientY;
		pointer.active = true;
	};
	const onPointerLeave = () => {
		pointer.active = false;
	};
	const update = () => {
		if ( destroyed ) {
			return;
		}

		const targets = getTargets();
		const time = performance.now() * 0.0012;

		targets.forEach( ( node, index ) => {
			const state = getNodeState( node, index );
			const rect = node.getBoundingClientRect();
			const centerX = rect.left + rect.width * 0.5;
			const centerY = rect.top + rect.height * 0.5;
			const idleAmount = idle * depth;
			let targetX =
				idleAmount > 0
					? Math.sin( time + index * 0.73 ) * idleAmount * 0.22
					: 0;
			let targetY =
				idleAmount > 0
					? Math.cos( time * 1.17 + index * 0.61 ) * idleAmount * 0.18
					: 0;
			let targetScale =
				idleAmount > 0 && mode === 'pulse'
					? 1 + Math.sin( time * 1.35 + index * 0.8 ) * idle * 0.035
					: 1;
			let targetRotate =
				idleAmount > 0 && ( mode === 'orbit' || mode === 'drift' )
					? Math.sin( time * 0.82 + index * 0.55 ) * idle * 3.5
					: 0;

			if ( pointer.active ) {
				const dx = centerX - pointer.x;
				const dy = centerY - pointer.y;
				const distance = Math.max( 1, Math.sqrt( dx * dx + dy * dy ) );
				const force = Math.max( 0, 1 - distance / radius );
				const easedForce = force * force * intensity;
				const normalX = dx / distance;
				const normalY = dy / distance;

				if ( mode === 'repel' ) {
					targetX += normalX * depth * easedForce;
					targetY += normalY * depth * easedForce;
					targetRotate += state.direction * easedForce * 7;
				} else if ( mode === 'attract' ) {
					targetX -= normalX * depth * easedForce;
					targetY -= normalY * depth * easedForce;
					targetRotate -= state.direction * easedForce * 6;
				} else if ( mode === 'orbit' ) {
					targetX +=
						-normalY * depth * easedForce * 0.92 * state.direction;
					targetY +=
						normalX * depth * easedForce * 0.92 * state.direction;
					targetScale += easedForce * 0.035;
					targetRotate += state.direction * easedForce * 10;
				} else if ( mode === 'drift' ) {
					targetX +=
						( normalX * 0.35 -
							normalY * 0.4 * state.direction ) *
						depth *
						easedForce;
					targetY +=
						( normalY * 0.28 +
							normalX * 0.2 * state.direction ) *
						depth *
						easedForce;
					targetRotate += normalX * easedForce * 8;
					targetScale += easedForce * 0.02;
				} else if ( mode === 'pulse' ) {
					targetY -= depth * easedForce * 0.22;
					targetScale += easedForce * 0.1;
				}
			}

			state.x += ( targetX - state.x ) * 0.18;
			state.y += ( targetY - state.y ) * 0.18;
			state.scale += ( targetScale - state.scale ) * 0.16;
			state.rotate += ( targetRotate - state.rotate ) * 0.16;

			node.style.setProperty(
				'--ace-child-offset-x',
				`${ state.x.toFixed( 2 ) }px`
			);
			node.style.setProperty(
				'--ace-child-offset-y',
				`${ state.y.toFixed( 2 ) }px`
			);
			node.style.setProperty(
				'--ace-child-scale',
				state.scale.toFixed( 4 )
			);
			node.style.setProperty(
				'--ace-child-rotate',
				`${ state.rotate.toFixed( 2 ) }deg`
			);
		} );

		frameHandle = window.requestAnimationFrame( update );
	};

	blockElement.addEventListener( 'pointermove', onPointerMove, true );
	blockElement.addEventListener( 'pointerleave', onPointerLeave, true );
	blockElement.addEventListener( 'pointercancel', onPointerLeave, true );
	update();

	return {
		destroy() {
			if ( destroyed ) {
				return;
			}

			destroyed = true;
			if ( frameHandle ) {
				window.cancelAnimationFrame( frameHandle );
				frameHandle = 0;
			}
			blockElement.removeEventListener( 'pointermove', onPointerMove, true );
			blockElement.removeEventListener( 'pointerleave', onPointerLeave, true );
			blockElement.removeEventListener( 'pointercancel', onPointerLeave, true );
			targetsContainer.classList.remove(
				'artistic-creative__interactive-targets'
			);
			getTargets().forEach( resetNode );
		},
	};
};

const getEffectConfig = ( attributes = {}, options = {} ) => {
	const effect = resolveEffect(
		attributes.aceCreativeBackgroundEffect || 'site-default'
	);
	const explicitAsciiBackgroundColor =
		effect === ASCII_EFFECT
			? getExplicitAsciiBackgroundColor( attributes )
			: undefined;
	const shouldIncludeBackgroundColor =
		( effect === ASCII_EFFECT
			? !! explicitAsciiBackgroundColor
			: attributes.aceCreativeBackgroundColor !== undefined ) ||
		( options.includeBackgroundColor && effect !== ASCII_EFFECT );
	const baseConfig = {
		effect,
		...( shouldIncludeBackgroundColor
			? { backgroundColor: resolveBackgroundColor( attributes ) }
			: {} ),
	};

	if ( effect === ASCII_EFFECT ) {
		return {
			...baseConfig,
			asciiSource: resolveValue( attributes, 'aceCreativeAsciiSource' ),
			asciiImageUrl: resolveValue( attributes, 'aceCreativeAsciiImageUrl' ),
			asciiImageWidth: resolveValue(
				attributes,
				'aceCreativeAsciiImageWidth'
			),
			asciiImageHeight: resolveValue(
				attributes,
				'aceCreativeAsciiImageHeight'
			),
			asciiCustomText: resolveValue(
				attributes,
				'aceCreativeAsciiCustomText'
			),
			asciiCharacterSet: resolveValue(
				attributes,
				'aceCreativeAsciiCharacterSet'
			),
			asciiDensity: resolveValue( attributes, 'aceCreativeAsciiDensity' ),
			asciiFontSize: resolveValue( attributes, 'aceCreativeAsciiFontSize' ),
			asciiTintColor: resolveValue(
				attributes,
				'aceCreativeAsciiTintColor'
			),
			asciiGlow: resolveValue( attributes, 'aceCreativeAsciiGlow' ),
			asciiContrast: resolveValue(
				attributes,
				'aceCreativeAsciiContrast'
			),
			asciiMotion: resolveValue( attributes, 'aceCreativeAsciiMotion' ),
			asciiInteraction: resolveValue(
				attributes,
				'aceCreativeAsciiInteraction'
			),
			asciiNoise: resolveValue( attributes, 'aceCreativeAsciiNoise' ),
			asciiInvert: resolveValue( attributes, 'aceCreativeAsciiInvert' ),
		};
	}

	if ( effect !== FLUID_EFFECT ) {
		if ( effect === AURORA_EFFECT ) {
			return {
				...baseConfig,
				auroraSpeed: resolveValue( attributes, 'aceCreativeAuroraSpeed' ),
				auroraPalette: resolveValue( attributes, 'aceCreativeAuroraPalette' ),
				auroraIntensity: resolveValue( attributes, 'aceCreativeAuroraIntensity' ),
				auroraBands: resolveValue( attributes, 'aceCreativeAuroraBands' ),
				auroraPointerInfluence: resolveValue( attributes, 'aceCreativeAuroraPointerInfluence' ),
			};
		}

		if ( effect === CONSTELLATION_EFFECT ) {
			return {
				...baseConfig,
				constellationCount: resolveValue( attributes, 'aceCreativeConstellationCount' ),
				constellationConnectDistance: resolveValue( attributes, 'aceCreativeConstellationConnectDistance' ),
				constellationPointerMode: resolveValue( attributes, 'aceCreativeConstellationPointerMode' ),
				constellationParticleColor: resolveValue( attributes, 'aceCreativeConstellationParticleColor' ),
				constellationLineColor: resolveValue( attributes, 'aceCreativeConstellationLineColor' ),
				constellationSpeed: resolveValue( attributes, 'aceCreativeConstellationSpeed' ),
			};
		}

		if ( effect === TOPO_EFFECT ) {
			return {
				...baseConfig,
				topoSpeed: resolveValue( attributes, 'aceCreativeTopoSpeed' ),
				topoLineDensity: resolveValue( attributes, 'aceCreativeTopoLineDensity' ),
				topoColorScheme: resolveValue( attributes, 'aceCreativeTopoColorScheme' ),
				topoPointerInfluence: resolveValue( attributes, 'aceCreativeTopoPointerInfluence' ),
				topoGlow: resolveValue( attributes, 'aceCreativeTopoGlow' ),
			};
		}

		if ( effect === CAUSTICS_EFFECT ) {
			return {
				...baseConfig,
				causticsSpeed: resolveValue( attributes, 'aceCreativeCausticsSpeed' ),
				causticsRefraction: resolveValue( attributes, 'aceCreativeCausticsRefraction' ),
				causticsColorTemp: resolveValue( attributes, 'aceCreativeCausticsColorTemp' ),
				causticsPointerInfluence: resolveValue( attributes, 'aceCreativeCausticsPointerInfluence' ),
				causticsBrightness: resolveValue( attributes, 'aceCreativeCausticsBrightness' ),
			};
		}

		if ( effect === DUST_EFFECT ) {
			return {
				...baseConfig,
				dustParticleCount: resolveValue( attributes, 'aceCreativeDustParticleCount' ),
				dustFieldSpeed: resolveValue( attributes, 'aceCreativeDustFieldSpeed' ),
				dustFieldScale: resolveValue( attributes, 'aceCreativeDustFieldScale' ),
				dustTrailFade: resolveValue( attributes, 'aceCreativeDustTrailFade' ),
				dustColor: resolveValue( attributes, 'aceCreativeDustColor' ),
				dustPointerMode: resolveValue( attributes, 'aceCreativeDustPointerMode' ),
			};
		}

		return baseConfig;
	}

	return {
		...baseConfig,
		dyeResolution: resolveValue( attributes, 'aceCreativeBackgroundDyeResolution' ),
		simResolution: resolveValue( attributes, 'aceCreativeBackgroundSimResolution' ),
		densityDissipation: resolveValue(
			attributes,
			'aceCreativeBackgroundDensityDissipation'
		),
		velocityDissipation: resolveValue(
			attributes,
			'aceCreativeBackgroundVelocityDissipation'
		),
		pressure: resolveValue( attributes, 'aceCreativeBackgroundPressure' ),
		curl: resolveValue( attributes, 'aceCreativeBackgroundCurl' ),
		splatRadius: resolveValue( attributes, 'aceCreativeBackgroundSplatRadius' ),
		particleShape: resolveValue(
			attributes,
			'aceCreativeBackgroundParticleShape'
		),
		particleSpread: resolveValue(
			attributes,
			'aceCreativeBackgroundParticleSpread'
		),
		flowJitter: resolveValue( attributes, 'aceCreativeBackgroundFlowJitter' ),
		shading: resolveValue( attributes, 'aceCreativeBackgroundShading' ),
		colorful: resolveValue( attributes, 'aceCreativeBackgroundColorful' ),
		bloom: resolveValue( attributes, 'aceCreativeBackgroundBloom' ),
		bloomIntensity: resolveValue(
			attributes,
			'aceCreativeBackgroundBloomIntensity'
		),
		bloomThreshold: resolveValue(
			attributes,
			'aceCreativeBackgroundBloomThreshold'
		),
		sunrays: resolveValue( attributes, 'aceCreativeBackgroundSunrays' ),
		sunraysWeight: resolveValue(
			attributes,
			'aceCreativeBackgroundSunraysWeight'
		),
		autoplay: resolveValue( attributes, 'aceCreativeBackgroundAutoplay' ),
		autoplayIntensity: resolveValue(
			attributes,
			'aceCreativeBackgroundAutoplayIntensity'
		),
		autoplayEasing: resolveValue(
			attributes,
			'aceCreativeBackgroundAutoplayEasing'
		),
		hover: resolveValue( attributes, 'aceCreativeBackgroundHover' ),
		touch: resolveValue( attributes, 'aceCreativeBackgroundTouch' ),
		tilt: resolveValue( attributes, 'aceCreativeBackgroundTilt' ),
		webcamMotion: resolveValue(
			attributes,
			'aceCreativeBackgroundWebcamMotion'
		),
		...( attributes.aceCreativeBackgroundWebcamColorMix
			? { webcamColorMix: true }
			: {} ),
		webcamIntensity: resolveValue(
			attributes,
			'aceCreativeBackgroundWebcamIntensity'
		),
		audioInput: resolveValue( attributes, 'aceCreativeBackgroundAudioInput' ),
		audioIntensity: resolveValue(
			attributes,
			'aceCreativeBackgroundAudioIntensity'
		),
		colorBoost: resolveValue( attributes, 'aceCreativeBackgroundColorBoost' ),
		auraMode: resolveValue( attributes, 'aceCreativeBackgroundAuraMode' ),
		backdropStyle: resolveValue(
			attributes,
			'aceCreativeBackgroundBackdropStyle'
		),
	};
};

const getSerializedEffectConfig = ( attributes = {}, options = {} ) => {
	const effectConfig = getEffectConfig( attributes, options );

	if ( effectConfig.effect === ASCII_EFFECT ) {
		if ( effectConfig.asciiSource !== 'image' ) {
			delete effectConfig.asciiImageUrl;
			delete effectConfig.asciiImageWidth;
			delete effectConfig.asciiImageHeight;
		}

		if ( effectConfig.asciiSource !== 'ascii-art' ) {
			delete effectConfig.asciiCustomText;
		}

		return effectConfig;
	}

	if ( effectConfig.effect !== FLUID_EFFECT ) {
		return effectConfig;
	}

	if (
		effectConfig.particleShape ===
		ATTRIBUTE_DEFINITIONS.aceCreativeBackgroundParticleShape.default
	) {
		delete effectConfig.particleShape;
	}

	if (
		effectConfig.particleSpread ===
		ATTRIBUTE_DEFINITIONS.aceCreativeBackgroundParticleSpread.default
	) {
		delete effectConfig.particleSpread;
	}

	if (
		effectConfig.flowJitter ===
		ATTRIBUTE_DEFINITIONS.aceCreativeBackgroundFlowJitter.default
	) {
		delete effectConfig.flowJitter;
	}

	return effectConfig;
};

const renderEffectMarkup = ( effect ) => (
	<>
		{ effect === FLUID_EFFECT && (
			<canvas className="artistic-creative__canvas" aria-hidden="true" />
		) }
		{ effect === ASCII_EFFECT && (
			<pre className="artistic-creative__ascii" aria-hidden="true" />
		) }
		<div
			className="artistic-creative__status"
			data-artistic-fluid-status
			aria-live="polite"
		/>
	</>
);

const getOverlayStyle = ( attributes = {} ) => ( {
	backgroundColor:
		attributes.aceCreativeOverlayColor ||
		DEFAULT_OVERLAY_COLOR,
	opacity:
		attributes.aceCreativeOverlayOpacity ??
		ATTRIBUTE_DEFINITIONS.aceCreativeOverlayOpacity.default,
} );

const getLayerStyle = (
	attributes = {},
	includeFallback = false,
	effect = ''
) => {
	if ( effect === ASCII_EFFECT ) {
		return {
			backgroundColor: resolveBackgroundColor( attributes ),
		};
	}

	if (
		attributes.aceCreativeBackgroundColor === undefined &&
		! includeFallback
	) {
		return undefined;
	}

	return {
		backgroundColor: resolveBackgroundColor( attributes ),
	};
};

const splitWrapperClasses = ( className = '' ) => {
	const outerClasses = [];
	const innerClasses = [ 'artistic-creative__inner-container' ];

	className
		.split( /\s+/ )
		.filter( Boolean )
		.forEach( ( currentClassName ) => {
			if (
				currentClassName.startsWith( 'is-layout-' ) ||
				currentClassName.startsWith( 'is-content-justification-' ) ||
				currentClassName.startsWith( 'wp-container-' )
			) {
				innerClasses.push( currentClassName );
				return;
			}

			outerClasses.push( currentClassName );
		} );

	return {
		outerClassName: outerClasses.join( ' ' ),
		innerClassName: [ ...new Set( innerClasses ) ].join( ' ' ),
	};
};

const getDefaultLayoutConfig = ( attributes = {} ) => {
	const layout = attributes?.layout;

	if ( layout && typeof layout === 'object' ) {
		return layout;
	}

	return {
		type: 'constrained',
	};
};

const getInnerLayoutProps = ( blockProps = {}, attributes = {} ) => {
	const layoutClasses = ( blockProps.className || '' )
		.split( /\s+/ )
		.filter(
			( currentClassName ) =>
				currentClassName &&
				( currentClassName.startsWith( 'is-layout-' ) ||
					currentClassName.startsWith( 'is-content-justification-' ) ||
					currentClassName.startsWith( 'wp-container-' ) )
		);
	const defaultLayout = getDefaultLayoutConfig( attributes );
	const layoutType =
		layoutClasses.find( ( currentClassName ) =>
			currentClassName.startsWith( 'is-layout-' )
		) || ! defaultLayout?.type
			? null
			: `is-layout-${ defaultLayout.type }`;
	const blockBaseClass = ( blockProps.className || '' )
		.split( /\s+/ )
		.find( ( currentClassName ) =>
			currentClassName.startsWith( 'wp-block-' )
		);
	const layoutStyleEntries = Object.entries( blockProps.style || {} ).filter(
		( [ key ] ) =>
			key.startsWith( '--wp--style--block-gap' ) ||
			key.startsWith( '--wp--custom--gap' ) ||
			key === 'justifyContent' ||
			key === 'flexWrap' ||
			key === 'columnGap' ||
			key === 'rowGap'
	);

	return {
		className: [
			'artistic-creative__inner-container',
			layoutType,
			layoutType && blockBaseClass
				? `${ blockBaseClass }-${ layoutType }`
				: null,
			...layoutClasses,
		]
			.filter( Boolean )
			.join( ' ' ),
		...( layoutStyleEntries.length
			? { style: Object.fromEntries( layoutStyleEntries ) }
			: {} ),
		...( blockProps[ 'data-layout' ]
			? { 'data-layout': blockProps[ 'data-layout' ] }
			: defaultLayout
				? { 'data-layout': JSON.stringify( defaultLayout ) }
				: {} ),
	};
};

const EditorBackgroundLayer = ( props = {} ) => {
	const {
		attributes = {},
		effectConfig = {},
		editorMode,
		hasPreviewRuntime,
		previewRef,
	} = props;
	if ( ! effectConfig.effect ) {
		return null;
	}

	if ( editorMode === 'preview' && hasPreviewRuntime ) {
		return (
			<div
				ref={ previewRef }
				className="artistic-creative__layer artistic-creative__layer--editor"
				aria-hidden="true"
				style={ getLayerStyle( attributes, true, effectConfig.effect ) }
			>
				{ renderEffectMarkup( effectConfig.effect ) }
			</div>
		);
	}

	return (
		<div
			className="artistic-creative__layer artistic-creative__layer--placeholder"
			aria-hidden="true"
			style={ getLayerStyle( attributes, true, effectConfig.effect ) }
		>
			<div className="artistic-creative__placeholder">
				{ editorMode === 'preview'
					? __(
							'Live preview is unavailable until the Artistic Creation Environment runtime loads in the editor.',
							'artistic-creation-environment'
					  )
					: __(
							'Settings mode pauses the live background so you can focus on block content and controls.',
							'artistic-creation-environment'
					  ) }
			</div>
		</div>
	);
};

const CreativeBlockEdit = ( props = {} ) => {
	const {
		attributes = {},
		isSelected,
		setAttributes = () => {},
		toggleSelection = () => {},
	} = props;
	const [ editorMode, setEditorMode ] = useState( 'preview' );
	const [ colorPalette = [] ] = useSettings( 'color.palette' );
	const previewRef = useRef( null );
	const effectPreviewRef = useRef( null );
	const childInteractivityRef = useRef( null );
	const blockRef = useRef( null );
	const [ resizeListener, { height, width } ] = useResizeObserver();
	const effectConfig = getEffectConfig( attributes, {
		includeBackgroundColor: true,
	} );
	const effectConfigSignature = JSON.stringify( effectConfig );
	const childInteractivitySignature = JSON.stringify(
		getChildInteractivityValues( attributes )
	);
	const hasPreviewRuntime =
		typeof getRuntimeFactory( effectConfig.effect ) === 'function';
	const isAsciiEffect = effectConfig.effect === ASCII_EFFECT;
	const isFluidEffect = effectConfig.effect === FLUID_EFFECT;
	const isAuroraEffect = effectConfig.effect === AURORA_EFFECT;
	const isConstellationEffect = effectConfig.effect === CONSTELLATION_EFFECT;
	const isTopoEffect = effectConfig.effect === TOPO_EFFECT;
	const isCausticsEffect = effectConfig.effect === CAUSTICS_EFFECT;
	const isDustEffect = effectConfig.effect === DUST_EFFECT;
	const currentMinHeight = getMinHeightValue( attributes );
	const rawBlockProps = useBlockProps( {
		ref: blockRef,
		className: getOuterClassName( attributes ),
		'data-artistic-creative-effect': effectConfig.effect || '',
		...getBlockDataAttributes( attributes ),
		style: getEditorBlockStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps(
		getInnerLayoutProps( rawBlockProps, attributes ),
		{
			renderAppender: InnerBlocks.ButtonBlockAppender,
		}
	);
	const setValue = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	const themeColors =
		Array.isArray( colorPalette ) && colorPalette.length
			? colorPalette
			: undefined;
	const applyFluidPreset = ( presetKey ) => {
		if ( presetKey === 'custom' ) {
			setAttributes( { aceCreativeBackgroundPreset: 'custom' } );
			return;
		}

		setAttributes( {
			aceCreativeBackgroundPreset: presetKey,
			...( FLUID_PRESETS[ presetKey ] || {} ),
		} );
	};
	const applyContentPreset = ( presetKey ) => {
		const presetValues = CONTENT_EFFECT_PRESETS[ presetKey ] || {};

		setAttributes( {
			aceCreativeContentEffectPreset: presetKey,
			...presetValues,
		} );
	};
	const setAsciiImage = ( media ) => {
		const mediaUrl =
			media?.url ||
			media?.sizes?.full?.url ||
			media?.media_details?.sizes?.full?.source_url ||
			'';

		setAttributes( {
			aceCreativeAsciiImageUrl: mediaUrl,
			aceCreativeAsciiImageId: media?.id,
			aceCreativeAsciiImageWidth:
				media?.width || media?.media_details?.width || undefined,
			aceCreativeAsciiImageHeight:
				media?.height || media?.media_details?.height || undefined,
		} );
	};
	const clearAsciiImage = () =>
		setAttributes( {
			aceCreativeAsciiImageUrl: '',
			aceCreativeAsciiImageId: undefined,
			aceCreativeAsciiImageWidth: undefined,
			aceCreativeAsciiImageHeight: undefined,
		} );

	const setBlockMinHeight = ( nextHeight ) => {
		const currentStyle = attributes.style || {};
		const currentDimensions = currentStyle.dimensions || {};
		setAttributes( {
			style: {
				...currentStyle,
				dimensions: {
					...currentDimensions,
					minHeight: `${ Math.max(
						MIN_BLOCK_HEIGHT,
						Math.round( nextHeight )
					) }px`,
				},
			},
		} );
	};

	const resizableBoxHeight =
		currentMinHeight || height || DEFAULT_BLOCK_MIN_HEIGHT;

	useEffect( () => {
		if (
			editorMode !== 'preview' ||
			! effectConfig.effect ||
			! hasPreviewRuntime ||
			! previewRef.current
		) {
			if ( effectPreviewRef.current?.destroy ) {
				effectPreviewRef.current.destroy();
			}

			effectPreviewRef.current = null;
			return;
		}

		if (
			effectPreviewRef.current?.destroy &&
			effectPreviewRef.current.__aceEffect !== effectConfig.effect
		) {
			effectPreviewRef.current.destroy();
			effectPreviewRef.current = null;
		}

		const runtimeFactory = getRuntimeFactory( effectConfig.effect );

		if ( ! effectPreviewRef.current && runtimeFactory ) {
			effectPreviewRef.current = runtimeFactory(
				previewRef.current,
				effectConfig,
				{
					interactionSurface: previewRef.current.parentElement,
					auraSource: previewRef.current.parentElement,
				}
			);

			if ( effectPreviewRef.current ) {
				effectPreviewRef.current.__aceEffect = effectConfig.effect;
			}
		}

		effectPreviewRef.current?.setPaused?.( false );
		effectPreviewRef.current?.applyConfig?.( effectConfig );
	}, [ editorMode, effectConfig.effect, effectConfigSignature, hasPreviewRuntime ] );

	useEffect( () => {
		if ( childInteractivityRef.current?.destroy ) {
			childInteractivityRef.current.destroy();
		}

		childInteractivityRef.current = null;

		if ( ! blockRef.current ) {
			return undefined;
		}

		childInteractivityRef.current = createCreativeChildInteractivity(
			blockRef.current
		);

		return () => {
			if ( childInteractivityRef.current?.destroy ) {
				childInteractivityRef.current.destroy();
			}

			childInteractivityRef.current = null;
		};
	}, [ childInteractivitySignature ] );

	useEffect( () => {
		return () => {
			if ( effectPreviewRef.current?.destroy ) {
				effectPreviewRef.current.destroy();
			}

			effectPreviewRef.current = null;
			if ( childInteractivityRef.current?.destroy ) {
				childInteractivityRef.current.destroy();
			}
			childInteractivityRef.current = null;
		};
	}, [] );

	return (
		<Fragment>
			<BlockControls>
				<ToolbarGroup>
					<BlockVerticalAlignmentToolbar
						value={ attributes.aceCreativeVerticalAlign || 'top' }
						onChange={ ( value ) =>
							setAttributes( {
								aceCreativeVerticalAlign: value || 'top',
							} )
						}
					/>
				</ToolbarGroup>
				<ToolbarGroup>
					<ToolbarButton
						icon="visibility"
						label={ __( 'Preview mode', 'artistic-creation-environment' ) }
						isPressed={ editorMode === 'preview' }
						onClick={ () => setEditorMode( 'preview' ) }
					/>
					<ToolbarButton
						icon="admin-generic"
						label={ __( 'Settings mode', 'artistic-creation-environment' ) }
						isPressed={ editorMode === 'settings' }
						onClick={ () => setEditorMode( 'settings' ) }
					/>
				</ToolbarGroup>
			</BlockControls>
			<InspectorControls>
				<PanelBody
					title={ __( 'Creative Background', 'artistic-creation-environment' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Effect', 'artistic-creation-environment' ) }
						value={ attributes.aceCreativeBackgroundEffect || 'site-default' }
						options={ EFFECT_OPTIONS }
						onChange={ setValue( 'aceCreativeBackgroundEffect' ) }
						help={ __(
							'The Creative block owns its own background layer, overlay, and inner blocks without using Cover background media or colour settings.',
							'artistic-creation-environment'
						) }
					/>

					{ attributes.aceCreativeBackgroundEffect === 'site-default' &&
						! defaultEffect && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'The site default effect is currently “None”, so this Creative block will stay static until the default is changed.',
									'artistic-creation-environment'
								) }
							</Notice>
						) }

					{ isFluidEffect && (
						<>
							<SelectControl
								label={ __( 'Fluid preset', 'artistic-creation-environment' ) }
								value={ attributes.aceCreativeBackgroundPreset || 'custom' }
								options={ FLUID_PRESET_OPTIONS }
								onChange={ applyFluidPreset }
								help={ __(
									'Applies a curated combination of motion, bloom, colour, and particle-shape settings as a starting point.',
									'artistic-creation-environment'
								) }
							/>
						</>
					) }

					{ isAsciiEffect && (
						<>
							<SelectControl
								label={ __( 'ASCII source', 'artistic-creation-environment' ) }
								value={ effectConfig.asciiSource || 'world-map' }
								options={ ASCII_SOURCE_OPTIONS }
								onChange={ setValue( 'aceCreativeAsciiSource' ) }
								help={ __(
									'Use the built-in world map, paste your own ASCII art, or turn a media-library image into ASCII.',
									'artistic-creation-environment'
								) }
							/>
							{ effectConfig.asciiSource === 'ascii-art' && (
								<TextareaControl
									label={ __(
										'ASCII art',
										'artistic-creation-environment'
									) }
									value={ attributes.aceCreativeAsciiCustomText || '' }
									onChange={ setValue( 'aceCreativeAsciiCustomText' ) }
									help={ __(
										'Paste line-based ASCII art here to render it directly without image conversion.',
										'artistic-creation-environment'
									) }
									rows={ 10 }
								/>
							) }
							{ effectConfig.asciiSource === 'image' && (
								<div className="artistic-creative__media-picker">
									{ attributes.aceCreativeAsciiImageUrl && (
										<img
											className="artistic-creative__media-preview"
											src={ attributes.aceCreativeAsciiImageUrl }
											alt=""
										/>
									) }
									<MediaUploadCheck>
										<MediaUpload
											onSelect={ setAsciiImage }
											allowedTypes={ [ 'image' ] }
											value={ attributes.aceCreativeAsciiImageId }
											render={ ( { open } ) => (
												<div className="artistic-creative__media-actions">
													<Button
														variant="secondary"
														onClick={ open }
													>
														{ attributes.aceCreativeAsciiImageUrl
															? __(
																	'Replace image',
																	'artistic-creation-environment'
															  )
															: __(
																	'Choose image',
																	'artistic-creation-environment'
															  ) }
													</Button>
													{ attributes.aceCreativeAsciiImageUrl && (
														<Button
															variant="tertiary"
															onClick={ clearAsciiImage }
														>
															{ __(
																'Remove image',
																'artistic-creation-environment'
															) }
														</Button>
													) }
												</div>
											) }
										/>
									</MediaUploadCheck>
									<p className="components-base-control__help">
										{ __(
											'Choose an image from the media library to use as the ASCII reference source. The runtime now keeps the generated ASCII locked to the source aspect ratio.',
											'artistic-creation-environment'
										) }
									</p>
								</div>
							) }
							{ effectConfig.asciiSource !== 'ascii-art' && (
								<>
									<SelectControl
										label={ __(
											'Character set',
											'artistic-creation-environment'
										) }
										value={ effectConfig.asciiCharacterSet || 'atlas' }
										options={ ASCII_CHARACTER_SET_OPTIONS }
										onChange={ setValue(
											'aceCreativeAsciiCharacterSet'
										) }
									/>
									<RangeControl
										label={ __( 'Density', 'artistic-creation-environment' ) }
										min={ 48 }
										max={ 240 }
										step={ 1 }
										value={ effectConfig.asciiDensity }
										onChange={ setValue( 'aceCreativeAsciiDensity' ) }
									/>
								</>
							) }
							<RangeControl
								label={ __( 'Font size', 'artistic-creation-environment' ) }
								min={ 7 }
								max={ 18 }
								step={ 1 }
								value={ effectConfig.asciiFontSize }
								onChange={ setValue( 'aceCreativeAsciiFontSize' ) }
							/>
							<p>{ __( 'Tint colour', 'artistic-creation-environment' ) }</p>
							<ColorPalette
								colors={ themeColors }
								value={
									effectConfig.asciiTintColor ||
									DEFAULT_ASCII_TINT_COLOR
								}
								onChange={ ( value ) =>
									setAttributes( {
										aceCreativeAsciiTintColor:
											value || DEFAULT_ASCII_TINT_COLOR,
									} )
								}
								clearable={ false }
							/>
							<p>{ __( 'Background colour', 'artistic-creation-environment' ) }</p>
							<ColorPalette
								colors={ themeColors }
								value={ attributes.aceCreativeBackgroundColor }
								onChange={ ( value ) =>
									setAttributes( {
										aceCreativeBackgroundColor: value,
									} )
								}
								clearable={ true }
							/>
							<RangeControl
								label={ __( 'Glow', 'artistic-creation-environment' ) }
								min={ 0 }
								max={ 1 }
								step={ 0.01 }
								value={ effectConfig.asciiGlow }
								onChange={ setValue( 'aceCreativeAsciiGlow' ) }
							/>
							{ effectConfig.asciiSource !== 'ascii-art' && (
								<RangeControl
									label={ __( 'Contrast', 'artistic-creation-environment' ) }
									min={ 0.4 }
									max={ 2.6 }
									step={ 0.01 }
									value={ effectConfig.asciiContrast }
									onChange={ setValue( 'aceCreativeAsciiContrast' ) }
								/>
							) }
							<RangeControl
								label={ __( 'Motion', 'artistic-creation-environment' ) }
								min={ 0 }
								max={ 2 }
								step={ 0.01 }
								value={ effectConfig.asciiMotion }
								onChange={ setValue( 'aceCreativeAsciiMotion' ) }
							/>
							<RangeControl
								label={ __(
									'Hover / pointer interaction',
									'artistic-creation-environment'
								) }
								min={ 0 }
								max={ 2 }
								step={ 0.01 }
								value={ effectConfig.asciiInteraction }
								onChange={ setValue( 'aceCreativeAsciiInteraction' ) }
							/>
							<RangeControl
								label={ __( 'Noise shimmer', 'artistic-creation-environment' ) }
								min={ 0 }
								max={ 0.4 }
								step={ 0.01 }
								value={ effectConfig.asciiNoise }
								onChange={ setValue( 'aceCreativeAsciiNoise' ) }
							/>
							{ effectConfig.asciiSource !== 'ascii-art' && (
								<ToggleControl
									label={ __( 'Invert glyphs', 'artistic-creation-environment' ) }
									checked={ !! effectConfig.asciiInvert }
									onChange={ setValue( 'aceCreativeAsciiInvert' ) }
								/>
							) }
						</>
					) }

					{ isAuroraEffect && (
						<>
							<RangeControl
								label={ __( 'Speed', 'artistic-creation-environment' ) }
								min={ 0.1 }
								max={ 3 }
								step={ 0.05 }
								value={ effectConfig.auroraSpeed }
								onChange={ setValue( 'aceCreativeAuroraSpeed' ) }
							/>
							<SelectControl
								label={ __( 'Colour palette', 'artistic-creation-environment' ) }
								value={ effectConfig.auroraPalette || 'aurora' }
								options={ [
									{ label: __( 'Aurora', 'artistic-creation-environment' ), value: 'aurora' },
									{ label: __( 'Sunset', 'artistic-creation-environment' ), value: 'sunset' },
									{ label: __( 'Deep space', 'artistic-creation-environment' ), value: 'deepspace' },
								] }
								onChange={ setValue( 'aceCreativeAuroraPalette' ) }
							/>
							<RangeControl
								label={ __( 'Intensity', 'artistic-creation-environment' ) }
								min={ 0.1 }
								max={ 2 }
								step={ 0.05 }
								value={ effectConfig.auroraIntensity }
								onChange={ setValue( 'aceCreativeAuroraIntensity' ) }
							/>
							<RangeControl
								label={ __( 'Bands', 'artistic-creation-environment' ) }
								min={ 2 }
								max={ 8 }
								step={ 1 }
								value={ effectConfig.auroraBands }
								onChange={ setValue( 'aceCreativeAuroraBands' ) }
							/>
							<RangeControl
								label={ __( 'Pointer influence', 'artistic-creation-environment' ) }
								min={ 0 }
								max={ 1 }
								step={ 0.05 }
								value={ effectConfig.auroraPointerInfluence }
								onChange={ setValue( 'aceCreativeAuroraPointerInfluence' ) }
							/>
						</>
					) }

					{ isConstellationEffect && (
						<>
							<RangeControl
								label={ __( 'Particle count', 'artistic-creation-environment' ) }
								min={ 20 }
								max={ 400 }
								step={ 10 }
								value={ effectConfig.constellationCount }
								onChange={ setValue( 'aceCreativeConstellationCount' ) }
							/>
							<RangeControl
								label={ __( 'Connect distance', 'artistic-creation-environment' ) }
								min={ 60 }
								max={ 320 }
								step={ 10 }
								value={ effectConfig.constellationConnectDistance }
								onChange={ setValue( 'aceCreativeConstellationConnectDistance' ) }
							/>
							<SelectControl
								label={ __( 'Pointer mode', 'artistic-creation-environment' ) }
								value={ effectConfig.constellationPointerMode || 'attract' }
								options={ [
									{ label: __( 'Attract', 'artistic-creation-environment' ), value: 'attract' },
									{ label: __( 'Repel', 'artistic-creation-environment' ), value: 'repel' },
									{ label: __( 'None', 'artistic-creation-environment' ), value: 'none' },
								] }
								onChange={ setValue( 'aceCreativeConstellationPointerMode' ) }
							/>
							<RangeControl
								label={ __( 'Speed', 'artistic-creation-environment' ) }
								min={ 0.1 }
								max={ 3 }
								step={ 0.1 }
								value={ effectConfig.constellationSpeed }
								onChange={ setValue( 'aceCreativeConstellationSpeed' ) }
							/>
							<p>{ __( 'Particle colour', 'artistic-creation-environment' ) }</p>
							<ColorPalette
								colors={ themeColors }
								value={ effectConfig.constellationParticleColor }
								onChange={ ( v ) => setAttributes( { aceCreativeConstellationParticleColor: v || '#a5b4fc' } ) }
								clearable={ false }
							/>
							<p>{ __( 'Line colour', 'artistic-creation-environment' ) }</p>
							<ColorPalette
								colors={ themeColors }
								value={ effectConfig.constellationLineColor }
								onChange={ ( v ) => setAttributes( { aceCreativeConstellationLineColor: v || '#818cf8' } ) }
								clearable={ false }
							/>
						</>
					) }

					{ isTopoEffect && (
						<>
							<RangeControl
								label={ __( 'Speed', 'artistic-creation-environment' ) }
								min={ 0.1 }
								max={ 3 }
								step={ 0.05 }
								value={ effectConfig.topoSpeed }
								onChange={ setValue( 'aceCreativeTopoSpeed' ) }
							/>
							<RangeControl
								label={ __( 'Line density', 'artistic-creation-environment' ) }
								min={ 3 }
								max={ 20 }
								step={ 1 }
								value={ effectConfig.topoLineDensity }
								onChange={ setValue( 'aceCreativeTopoLineDensity' ) }
							/>
							<SelectControl
								label={ __( 'Colour scheme', 'artistic-creation-environment' ) }
								value={ effectConfig.topoColorScheme || 'cyan' }
								options={ [
									{ label: __( 'Cyan', 'artistic-creation-environment' ), value: 'cyan' },
									{ label: __( 'Magenta', 'artistic-creation-environment' ), value: 'magenta' },
									{ label: __( 'Gold', 'artistic-creation-environment' ), value: 'gold' },
								] }
								onChange={ setValue( 'aceCreativeTopoColorScheme' ) }
							/>
							<RangeControl
								label={ __( 'Glow', 'artistic-creation-environment' ) }
								min={ 0 }
								max={ 2 }
								step={ 0.1 }
								value={ effectConfig.topoGlow }
								onChange={ setValue( 'aceCreativeTopoGlow' ) }
							/>
							<RangeControl
								label={ __( 'Pointer influence', 'artistic-creation-environment' ) }
								min={ 0 }
								max={ 1 }
								step={ 0.05 }
								value={ effectConfig.topoPointerInfluence }
								onChange={ setValue( 'aceCreativeTopoPointerInfluence' ) }
							/>
						</>
					) }

					{ isCausticsEffect && (
						<>
							<RangeControl
								label={ __( 'Speed', 'artistic-creation-environment' ) }
								min={ 0.1 }
								max={ 3 }
								step={ 0.05 }
								value={ effectConfig.causticsSpeed }
								onChange={ setValue( 'aceCreativeCausticsSpeed' ) }
							/>
							<RangeControl
								label={ __( 'Refraction scale', 'artistic-creation-environment' ) }
								min={ 0.3 }
								max={ 2.5 }
								step={ 0.1 }
								value={ effectConfig.causticsRefraction }
								onChange={ setValue( 'aceCreativeCausticsRefraction' ) }
							/>
							<SelectControl
								label={ __( 'Colour temperature', 'artistic-creation-environment' ) }
								value={ effectConfig.causticsColorTemp || 'cool' }
								options={ [
									{ label: __( 'Cool aqua', 'artistic-creation-environment' ), value: 'cool' },
									{ label: __( 'Warm gold', 'artistic-creation-environment' ), value: 'warm' },
									{ label: __( 'Neutral silver', 'artistic-creation-environment' ), value: 'neutral' },
								] }
								onChange={ setValue( 'aceCreativeCausticsColorTemp' ) }
							/>
							<RangeControl
								label={ __( 'Brightness', 'artistic-creation-environment' ) }
								min={ 0.3 }
								max={ 3 }
								step={ 0.1 }
								value={ effectConfig.causticsBrightness }
								onChange={ setValue( 'aceCreativeCausticsBrightness' ) }
							/>
							<RangeControl
								label={ __( 'Pointer influence', 'artistic-creation-environment' ) }
								min={ 0 }
								max={ 1 }
								step={ 0.05 }
								value={ effectConfig.causticsPointerInfluence }
								onChange={ setValue( 'aceCreativeCausticsPointerInfluence' ) }
							/>
						</>
					) }

					{ isDustEffect && (
						<>
							<RangeControl
								label={ __( 'Particle count', 'artistic-creation-environment' ) }
								min={ 100 }
								max={ 1500 }
								step={ 50 }
								value={ effectConfig.dustParticleCount }
								onChange={ setValue( 'aceCreativeDustParticleCount' ) }
							/>
							<SelectControl
								label={ __( 'Pointer mode', 'artistic-creation-environment' ) }
								value={ effectConfig.dustPointerMode || 'attract' }
								options={ [
									{ label: __( 'Attract', 'artistic-creation-environment' ), value: 'attract' },
									{ label: __( 'Repel', 'artistic-creation-environment' ), value: 'repel' },
									{ label: __( 'None', 'artistic-creation-environment' ), value: 'none' },
								] }
								onChange={ setValue( 'aceCreativeDustPointerMode' ) }
							/>
							<RangeControl
								label={ __( 'Trail fade', 'artistic-creation-environment' ) }
								min={ 0.01 }
								max={ 0.3 }
								step={ 0.01 }
								value={ effectConfig.dustTrailFade }
								onChange={ setValue( 'aceCreativeDustTrailFade' ) }
							/>
							<p>{ __( 'Dust colour', 'artistic-creation-environment' ) }</p>
							<ColorPalette
								colors={ themeColors }
								value={ effectConfig.dustColor }
								onChange={ ( v ) => setAttributes( { aceCreativeDustColor: v || '#b8a8f8' } ) }
								clearable={ false }
							/>
						</>
					) }

					{ isFluidEffect && (
						<>

					<SelectControl
						label={ __( 'Quality', 'artistic-creation-environment' ) }
						value={ String( effectConfig.dyeResolution ) }
						options={ QUALITY_OPTIONS.map( ( option ) => ( {
							...option,
							value: String( option.value ),
						} ) ) }
						onChange={ ( value ) =>
							setAttributes( {
								aceCreativeBackgroundDyeResolution: Number( value ),
							} )
						}
					/>
					<SelectControl
						label={ __( 'Simulation resolution', 'artistic-creation-environment' ) }
						value={ String( effectConfig.simResolution ) }
						options={ SIM_RESOLUTION_OPTIONS.map( ( option ) => ( {
							...option,
							value: String( option.value ),
						} ) ) }
						onChange={ ( value ) =>
							setAttributes( {
								aceCreativeBackgroundSimResolution: Number( value ),
							} )
						}
					/>
					<RangeControl
						label={ __( 'Density diffusion', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 4 }
						step={ 0.01 }
						value={ effectConfig.densityDissipation }
						onChange={ setValue(
							'aceCreativeBackgroundDensityDissipation'
						) }
					/>
					<RangeControl
						label={ __( 'Velocity diffusion', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 4 }
						step={ 0.01 }
						value={ effectConfig.velocityDissipation }
						onChange={ setValue(
							'aceCreativeBackgroundVelocityDissipation'
						) }
					/>
					<RangeControl
						label={ __( 'Pressure', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 1 }
						step={ 0.01 }
						value={ effectConfig.pressure }
						onChange={ setValue( 'aceCreativeBackgroundPressure' ) }
					/>
					<RangeControl
						label={ __( 'Vorticity', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 50 }
						step={ 1 }
						value={ effectConfig.curl }
						onChange={ setValue( 'aceCreativeBackgroundCurl' ) }
					/>
					<RangeControl
						label={ __( 'Splat radius', 'artistic-creation-environment' ) }
						min={ 0.01 }
						max={ 4 }
						step={ 0.01 }
						value={ effectConfig.splatRadius }
						onChange={ setValue( 'aceCreativeBackgroundSplatRadius' ) }
					/>
					<SelectControl
						label={ __( 'Particle shape', 'artistic-creation-environment' ) }
						value={ effectConfig.particleShape || 'soft' }
						options={ PARTICLE_SHAPE_OPTIONS }
						onChange={ setValue( 'aceCreativeBackgroundParticleShape' ) }
						help={ __(
							'Changes how each interaction clusters splats before they melt into the fluid.',
							'artistic-creation-environment'
						) }
					/>
					<RangeControl
						label={ __( 'Particle spread', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 1.5 }
						step={ 0.01 }
						value={ effectConfig.particleSpread }
						onChange={ setValue( 'aceCreativeBackgroundParticleSpread' ) }
					/>
					<RangeControl
						label={ __( 'Flow chaos', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 1.25 }
						step={ 0.01 }
						value={ effectConfig.flowJitter }
						onChange={ setValue( 'aceCreativeBackgroundFlowJitter' ) }
						help={ __(
							'Adds extra twist and directional variation to the particle clusters so the fluid feels more unruly.',
							'artistic-creation-environment'
						) }
					/>
					<ToggleControl
						label={ __( 'Autoplay', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.autoplay }
						onChange={ setValue( 'aceCreativeBackgroundAutoplay' ) }
					/>
					<RangeControl
						label={ __( 'Autoplay intensity', 'artistic-creation-environment' ) }
						min={ 0.2 }
						max={ 2 }
						step={ 0.1 }
						value={ effectConfig.autoplayIntensity }
						onChange={ setValue( 'aceCreativeBackgroundAutoplayIntensity' ) }
					/>
					<RangeControl
						label={ __( 'Autoplay easing', 'artistic-creation-environment' ) }
						min={ 0.5 }
						max={ 5 }
						step={ 0.1 }
						value={ effectConfig.autoplayEasing }
						onChange={ setValue( 'aceCreativeBackgroundAutoplayEasing' ) }
						help={ __(
							'Higher values make autoplay splashes take longer to grow and ramp in more gradually before they fully bloom.',
							'artistic-creation-environment'
						) }
					/>
					<ToggleControl
						label={ __( 'Hover interaction', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.hover }
						onChange={ setValue( 'aceCreativeBackgroundHover' ) }
					/>
					<ToggleControl
						label={ __( 'Touch interaction', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.touch }
						onChange={ setValue( 'aceCreativeBackgroundTouch' ) }
					/>
					<ToggleControl
						label={ __( 'Tilt interaction', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.tilt }
						onChange={ setValue( 'aceCreativeBackgroundTilt' ) }
						help={ __(
							'Uses real device orientation when the current hardware/browser exposes it. MacBooks usually do not provide tilt sensors to the browser.',
							'artistic-creation-environment'
						) }
					/>
					<ToggleControl
						label={ __( 'WebCam motion input', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.webcamMotion }
						onChange={ setValue( 'aceCreativeBackgroundWebcamMotion' ) }
						help={ __(
							'Ask for camera permission and use motion in the video feed to push the fluid when you move or wave in front of the WebCam.',
							'artistic-creation-environment'
						) }
					/>
					<ToggleControl
						label={ __(
							'Mix average WebCam colour',
							'artistic-creation-environment'
						) }
						checked={ !! attributes.aceCreativeBackgroundWebcamColorMix }
						onChange={ setValue(
							'aceCreativeBackgroundWebcamColorMix'
						) }
						help={ __(
							'Blend some of the average camera colour into the fluid while WebCam motion is active, instead of only using the normal generated palette.',
							'artistic-creation-environment'
						) }
					/>
					<RangeControl
						label={ __( 'WebCam motion intensity', 'artistic-creation-environment' ) }
						min={ 0.2 }
						max={ 2 }
						step={ 0.05 }
						value={ effectConfig.webcamIntensity }
						onChange={ setValue(
							'aceCreativeBackgroundWebcamIntensity'
						) }
					/>
					<SelectControl
						label={ __( 'Audio input', 'artistic-creation-environment' ) }
						value={ effectConfig.audioInput || 'off' }
						options={ AUDIO_INPUT_OPTIONS }
						onChange={ setValue( 'aceCreativeBackgroundAudioInput' ) }
						help={ __(
							'Use microphone input or browser-supported system audio capture to drive the fluid from bass, peaks, and overall energy.',
							'artistic-creation-environment'
						) }
					/>
					<RangeControl
						label={ __( 'Audio intensity', 'artistic-creation-environment' ) }
						min={ 0.2 }
						max={ 2 }
						step={ 0.05 }
						value={ effectConfig.audioIntensity }
						onChange={ setValue(
							'aceCreativeBackgroundAudioIntensity'
						) }
					/>
					<p>{ __( 'Background colour', 'artistic-creation-environment' ) }</p>
					<ColorPalette
						colors={ themeColors }
						value={ effectConfig.backgroundColor || DEFAULT_BACKGROUND_COLOR }
						onChange={ ( value ) =>
							setAttributes( {
								aceCreativeBackgroundColor:
									value || DEFAULT_BACKGROUND_COLOR,
							} )
						}
						clearable={ false }
					/>
					<RangeControl
						label={ __( 'Colour boost', 'artistic-creation-environment' ) }
						min={ 1 }
						max={ 3 }
						step={ 0.1 }
						value={ effectConfig.colorBoost }
						onChange={ setValue( 'aceCreativeBackgroundColorBoost' ) }
					/>
					<ToggleControl
						label={ __( 'Aura mode', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.auraMode }
						onChange={ setValue( 'aceCreativeBackgroundAuraMode' ) }
						help={ __(
							'Blend fluid colours with the text and image colours inside the block so the background feels like an aura around the content.',
							'artistic-creation-environment'
						) }
					/>
					<ToggleControl
						label={ __( 'Shading', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.shading }
						onChange={ setValue( 'aceCreativeBackgroundShading' ) }
					/>
					<ToggleControl
						label={ __( 'Colorful', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.colorful }
						onChange={ setValue( 'aceCreativeBackgroundColorful' ) }
					/>
					<ToggleControl
						label={ __( 'Bloom', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.bloom }
						onChange={ setValue( 'aceCreativeBackgroundBloom' ) }
					/>
					<RangeControl
						label={ __( 'Bloom intensity', 'artistic-creation-environment' ) }
						min={ 0.1 }
						max={ 2 }
						step={ 0.01 }
						value={ effectConfig.bloomIntensity }
						onChange={ setValue( 'aceCreativeBackgroundBloomIntensity' ) }
					/>
					<RangeControl
						label={ __( 'Bloom threshold', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 1 }
						step={ 0.01 }
						value={ effectConfig.bloomThreshold }
						onChange={ setValue( 'aceCreativeBackgroundBloomThreshold' ) }
					/>
					<ToggleControl
						label={ __( 'Sunrays', 'artistic-creation-environment' ) }
						checked={ !! effectConfig.sunrays }
						onChange={ setValue( 'aceCreativeBackgroundSunrays' ) }
					/>
					<RangeControl
						label={ __( 'Sunrays weight', 'artistic-creation-environment' ) }
						min={ 0.3 }
						max={ 1 }
						step={ 0.01 }
						value={ effectConfig.sunraysWeight }
						onChange={ setValue( 'aceCreativeBackgroundSunraysWeight' ) }
					/>
						</>
					) }
				</PanelBody>
				<PanelBody
					title={ __( 'Layout', 'artistic-creation-environment' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Vertical alignment', 'artistic-creation-environment' ) }
						value={ attributes.aceCreativeVerticalAlign || 'top' }
						options={ VERTICAL_ALIGN_OPTIONS }
						onChange={ ( value ) =>
							setAttributes( {
								aceCreativeVerticalAlign: value || 'top',
							} )
						}
						help={ __(
							'Align child blocks to the top, middle, or bottom of the Creative block height.',
							'artistic-creation-environment'
						) }
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Overlay', 'artistic-creation-environment' ) }
					initialOpen={ false }
				>
					<p>{ __( 'Overlay colour', 'artistic-creation-environment' ) }</p>
					<ColorPalette
						colors={ themeColors }
						value={
							attributes.aceCreativeOverlayColor ||
							DEFAULT_OVERLAY_COLOR
						}
						onChange={ ( value ) =>
							setAttributes( {
								aceCreativeOverlayColor:
									value || DEFAULT_OVERLAY_COLOR,
							} )
						}
						clearable={ false }
					/>
					<RangeControl
						label={ __( 'Overlay opacity', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 1 }
						step={ 0.01 }
						value={
							attributes.aceCreativeOverlayOpacity ??
							ATTRIBUTE_DEFINITIONS.aceCreativeOverlayOpacity.default
						}
						onChange={ setValue( 'aceCreativeOverlayOpacity' ) }
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Content effects', 'artistic-creation-environment' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Text treatment preset', 'artistic-creation-environment' ) }
						value={ attributes.aceCreativeContentEffectPreset || 'none' }
						options={ CONTENT_EFFECT_PRESET_OPTIONS }
						onChange={ applyContentPreset }
						help={ __(
							'Applies glass, frost, inverted, or glow styling to headings, paragraphs, quotes, lists, and buttons inside this Creative block.',
							'artistic-creation-environment'
						) }
					/>
					<SelectControl
						label={ __( 'Blend mode', 'artistic-creation-environment' ) }
						value={
							getContentPresetValues( attributes ).blendMode || 'normal'
						}
						options={ BLEND_MODE_OPTIONS }
						onChange={ setValue( 'aceCreativeContentBlendMode' ) }
					/>
					<RangeControl
						label={ __( 'Blend softness', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 30 }
						step={ 1 }
						value={ getContentPresetValues( attributes ).backdropBlur }
						onChange={ setValue( 'aceCreativeContentBackdropBlur' ) }
					/>
					<RangeControl
						label={ __( 'Text tint strength', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 0.4 }
						step={ 0.01 }
						value={ getContentPresetValues( attributes ).surfaceOpacity }
						onChange={ setValue( 'aceCreativeContentSurfaceOpacity' ) }
					/>
					<RangeControl
						label={ __( 'Glow intensity', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 0.5 }
						step={ 0.01 }
						value={ getContentPresetValues( attributes ).borderOpacity }
						onChange={ setValue( 'aceCreativeContentBorderOpacity' ) }
					/>
					<ToggleControl
						label={ __( 'Invert treatment', 'artistic-creation-environment' ) }
						checked={ !! getContentPresetValues( attributes ).invert }
						onChange={ setValue( 'aceCreativeContentInvert' ) }
					/>
					<p>{ __( 'Text tint', 'artistic-creation-environment' ) }</p>
					<ColorPalette
						colors={ themeColors }
						value={
							getContentPresetValues( attributes ).surfaceColor ||
							DEFAULT_CONTENT_SURFACE_COLOR
						}
						onChange={ ( value ) =>
							setAttributes( {
								aceCreativeContentSurfaceColor:
									value || DEFAULT_CONTENT_SURFACE_COLOR,
							} )
						}
						clearable={ false }
					/>
				</PanelBody>
				<PanelBody
					title={ __(
						'Child interactivity',
						'artistic-creation-environment'
					) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __(
							'Interaction mode',
							'artistic-creation-environment'
						) }
						value={ getChildInteractivityValues( attributes ).mode }
						options={ CHILD_INTERACTION_MODE_OPTIONS }
						onChange={ setValue( 'aceCreativeChildInteractionMode' ) }
						help={ __(
							'Animate direct child blocks as the cursor moves through the Creative block.',
							'artistic-creation-environment'
						) }
					/>
					{ getChildInteractivityValues( attributes ).mode !== 'none' && (
						<>
							<RangeControl
								label={ __(
									'Strength',
									'artistic-creation-environment'
								) }
								min={ 0.1 }
								max={ 2 }
								step={ 0.01 }
								value={ getChildInteractivityValues( attributes ).intensity }
								onChange={ setValue(
									'aceCreativeChildInteractionIntensity'
								) }
							/>
							<RangeControl
								label={ __( 'Radius', 'artistic-creation-environment' ) }
								min={ 80 }
								max={ 520 }
								step={ 1 }
								value={ getChildInteractivityValues( attributes ).radius }
								onChange={ setValue(
									'aceCreativeChildInteractionRadius'
								) }
							/>
							<RangeControl
								label={ __(
									'Travel distance',
									'artistic-creation-environment'
								) }
								min={ 8 }
								max={ 120 }
								step={ 1 }
								value={ getChildInteractivityValues( attributes ).depth }
								onChange={ setValue(
									'aceCreativeChildInteractionDepth'
								) }
							/>
							<RangeControl
								label={ __(
									'Idle motion',
									'artistic-creation-environment'
								) }
								min={ 0 }
								max={ 1 }
								step={ 0.01 }
								value={ getChildInteractivityValues( attributes ).idle }
								onChange={ setValue(
									'aceCreativeChildInteractionIdle'
								) }
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...rawBlockProps }>
				<ResizableBox
					className="block-library-cover__resize-container artistic-creative__resize-container"
					enable={ RESIZABLE_BOX_ENABLE_OPTION }
					minHeight={ MIN_BLOCK_HEIGHT }
					onResizeStart={ ( _event, _direction, element ) => {
						toggleSelection?.( false );
						setBlockMinHeight( element.clientHeight );
					} }
					onResize={ ( _event, _direction, element ) => {
						setBlockMinHeight( element.clientHeight );
					} }
					onResizeStop={ ( _event, _direction, element ) => {
						setBlockMinHeight( element.clientHeight );
						toggleSelection?.( true );
					} }
					showHandle={
						isSelected && ! attributes?.style?.dimensions?.aspectRatio
					}
					size={ {
						height: resizableBoxHeight,
						width: width || 'auto',
					} }
					__experimentalShowTooltip
					__experimentalTooltipProps={ {
						axis: 'y',
						position: 'bottom',
					} }
				>
					{ resizeListener }
					<EditorBackgroundLayer
						attributes={ attributes }
						effectConfig={ effectConfig }
						editorMode={ editorMode }
						hasPreviewRuntime={ hasPreviewRuntime }
						previewRef={ previewRef }
					/>
					<span
						className="artistic-creative__overlay"
						aria-hidden="true"
						style={ getOverlayStyle( attributes ) }
					/>
					<div { ...innerBlocksProps } />
				</ResizableBox>
			</div>
		</Fragment>
	);
};

const CreativeBlockSave = ( props = {} ) => {
	const { attributes = {} } = props;
	const effectConfig = getSerializedEffectConfig( attributes );
	const rawBlockProps = useBlockProps.save( {
		className: getOuterClassName( attributes ),
		'data-artistic-creative-effect': effectConfig.effect || '',
		...getBlockDataAttributes( attributes ),
		style: getSavedBlockStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps.save(
		getInnerLayoutProps( rawBlockProps, attributes )
	);

	return (
		<div { ...rawBlockProps }>
			{ effectConfig.effect && (
				<div
					className="artistic-creative__layer"
					aria-hidden="true"
					data-artistic-config={ JSON.stringify( effectConfig ) }
					style={ getLayerStyle( attributes, false, effectConfig.effect ) }
				>
					{ renderEffectMarkup( effectConfig.effect ) }
				</div>
			) }
				<span
					className="artistic-creative__overlay"
					aria-hidden="true"
					style={ getOverlayStyle( attributes ) }
				/>
			<div { ...innerBlocksProps } />
		</div>
	);
};

const CreativeBlockDeprecatedCurrentSave = ( props = {} ) => {
	const { attributes = {} } = props;
	const effectConfig = getSerializedEffectConfig( attributes );
	const rawBlockProps = useBlockProps.save( {
		className: 'artistic-creative',
		'data-artistic-creative-effect': effectConfig.effect || '',
		style: getSavedBlockStyle( attributes ),
	} );
	const layoutClasses = ( rawBlockProps.className || '' )
		.split( /\s+/ )
		.filter(
			( currentClassName ) =>
				currentClassName &&
				( currentClassName.startsWith( 'is-layout-' ) ||
					currentClassName.startsWith( 'is-content-justification-' ) ||
					currentClassName.startsWith( 'wp-container-' ) )
		);
	const layoutStyleEntries = Object.entries( rawBlockProps.style || {} ).filter(
		( [ key ] ) =>
			key.startsWith( '--' ) ||
			key === 'justifyContent' ||
			key === 'flexWrap' ||
			key === 'columnGap' ||
			key === 'rowGap'
	);
	const innerBlocksProps = useInnerBlocksProps.save( {
		className: [
			'artistic-creative__inner-container',
			...layoutClasses,
		]
			.filter( Boolean )
			.join( ' ' ),
		...( layoutStyleEntries.length
			? { style: Object.fromEntries( layoutStyleEntries ) }
			: {} ),
		...( rawBlockProps[ 'data-layout' ]
			? { 'data-layout': rawBlockProps[ 'data-layout' ] }
			: {} ),
	} );

	return (
		<div { ...rawBlockProps }>
			{ effectConfig.effect && (
				<div
					className="artistic-creative__layer"
					aria-hidden="true"
					data-artistic-config={ JSON.stringify( effectConfig ) }
					style={ getLayerStyle( attributes, false, effectConfig.effect ) }
				>
					{ renderEffectMarkup( effectConfig.effect ) }
				</div>
			) }
			<span
				className="artistic-creative__overlay"
				aria-hidden="true"
				style={ getOverlayStyle( attributes ) }
			/>
			<div { ...innerBlocksProps } />
		</div>
	);
};

const CreativeBlockDeprecatedSplitWrapperSave = ( props = {} ) => {
	const { attributes = {} } = props;
	const effectConfig = getSerializedEffectConfig( attributes );
	const rawBlockProps = useBlockProps.save( {
		className: 'artistic-creative',
		'data-artistic-creative-effect': effectConfig.effect || '',
	} );
	const {
		className: blockClassName = '',
		...outerBlockProps
	} = rawBlockProps;
	const { outerClassName, innerClassName } =
		splitWrapperClasses( blockClassName );
	const innerBlocksProps = useInnerBlocksProps.save( {
		className: innerClassName,
	} );

	return (
		<div { ...outerBlockProps } className={ outerClassName }>
			{ effectConfig.effect && (
				<div
					className="artistic-creative__layer"
					aria-hidden="true"
					data-artistic-config={ JSON.stringify( effectConfig ) }
				>
					{ renderEffectMarkup( effectConfig.effect ) }
				</div>
			) }
			<span
				className="artistic-creative__overlay"
				aria-hidden="true"
				style={ getOverlayStyle( attributes ) }
			/>
			<div { ...innerBlocksProps } />
		</div>
	);
};

const CreativeBlockDeprecatedDirectSave = ( props = {} ) => {
	const { attributes = {} } = props;
	const effectConfig = getSerializedEffectConfig( attributes );
	const blockProps = useBlockProps.save( {
		className: 'artistic-creative',
		'data-artistic-creative-effect': effectConfig.effect || '',
	} );

	return (
		<div { ...blockProps }>
			{ effectConfig.effect && (
				<div
					className="artistic-creative__layer"
					aria-hidden="true"
					data-artistic-config={ JSON.stringify( effectConfig ) }
				>
					{ renderEffectMarkup( effectConfig.effect ) }
				</div>
			) }
			<span
				className="artistic-creative__overlay"
				aria-hidden="true"
				style={ getOverlayStyle( attributes ) }
			/>
			<InnerBlocks.Content />
		</div>
	);
};

const CreativeChildContentEffectsControls = ( props = {} ) => {
	const { clientId, isSelected, name } = props;
	const [ colorPalette = [] ] = useSettings( 'color.palette' );
	const { updateBlockAttributes } = useDispatch( 'core/block-editor' );
	const creativeParent = useSelect(
		( select ) => {
			const blockEditorSelect = select( 'core/block-editor' );
			const parentIds = blockEditorSelect.getBlockParents( clientId ) || [];
			const creativeParentId = [ ...parentIds ]
				.reverse()
				.find( ( parentId ) => {
					const parentBlock = blockEditorSelect.getBlock( parentId );
					return (
						parentBlock?.name === 'artistic-creation-environment/creative'
					);
				} );

			if ( ! creativeParentId ) {
				return null;
			}

			const creativeParentBlock =
				blockEditorSelect.getBlock( creativeParentId );

			return {
				clientId: creativeParentId,
				attributes: creativeParentBlock?.attributes || {},
			};
		},
		[ clientId ]
	);

	if ( ! isSelected || ! creativeParent?.clientId ) {
		return null;
	}

	const creativeAttributes = creativeParent.attributes || {};
	const contentValues = getContentPresetValues( creativeAttributes );
	const themeColors =
		Array.isArray( colorPalette ) && colorPalette.length
			? colorPalette
			: undefined;
	const setCreativeAttributes = ( nextAttributes ) =>
		updateBlockAttributes( creativeParent.clientId, nextAttributes );
	const setCreativeValue = ( key ) => ( value ) =>
		setCreativeAttributes( { [ key ]: value } );
	const childInteractivityValues =
		getChildInteractivityValues( creativeAttributes );
	const applyCreativeContentPreset = ( presetKey ) => {
		const presetValues = CONTENT_EFFECT_PRESETS[ presetKey ] || {};

		setCreativeAttributes( {
			aceCreativeContentEffectPreset: presetKey,
			...presetValues,
		} );
	};

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Creative interactions', 'artistic-creation-environment' ) }
				initialOpen={ false }
			>
				<p className="components-base-control__help">
					{ __(
						'These controls update the parent Creative block and animate its direct child blocks together.',
						'artistic-creation-environment'
					) }
				</p>
				<SelectControl
					label={ __( 'Interaction mode', 'artistic-creation-environment' ) }
					value={ childInteractivityValues.mode }
					options={ CHILD_INTERACTION_MODE_OPTIONS }
					onChange={ setCreativeValue( 'aceCreativeChildInteractionMode' ) }
				/>
				{ childInteractivityValues.mode !== 'none' && (
					<>
						<RangeControl
							label={ __( 'Strength', 'artistic-creation-environment' ) }
							min={ 0.1 }
							max={ 2 }
							step={ 0.01 }
							value={ childInteractivityValues.intensity }
							onChange={ setCreativeValue(
								'aceCreativeChildInteractionIntensity'
							) }
						/>
						<RangeControl
							label={ __( 'Radius', 'artistic-creation-environment' ) }
							min={ 80 }
							max={ 520 }
							step={ 1 }
							value={ childInteractivityValues.radius }
							onChange={ setCreativeValue(
								'aceCreativeChildInteractionRadius'
							) }
						/>
						<RangeControl
							label={ __(
								'Travel distance',
								'artistic-creation-environment'
							) }
							min={ 8 }
							max={ 120 }
							step={ 1 }
							value={ childInteractivityValues.depth }
							onChange={ setCreativeValue(
								'aceCreativeChildInteractionDepth'
							) }
						/>
						<RangeControl
							label={ __( 'Idle motion', 'artistic-creation-environment' ) }
							min={ 0 }
							max={ 1 }
							step={ 0.01 }
							value={ childInteractivityValues.idle }
							onChange={ setCreativeValue(
								'aceCreativeChildInteractionIdle'
							) }
						/>
					</>
				) }
			</PanelBody>
			{ CHILD_CONTENT_EFFECT_BLOCKS.includes( name ) && (
			<PanelBody
				title={ __( 'Creative text effects', 'artistic-creation-environment' ) }
				initialOpen={ false }
			>
				<p className="components-base-control__help">
					{ __(
						'These controls update the parent Creative block and affect supported child text blocks inside it.',
						'artistic-creation-environment'
					) }
				</p>
				<SelectControl
					label={ __( 'Text treatment preset', 'artistic-creation-environment' ) }
					value={ creativeAttributes.aceCreativeContentEffectPreset || 'none' }
					options={ CONTENT_EFFECT_PRESET_OPTIONS }
					onChange={ applyCreativeContentPreset }
				/>
				<SelectControl
					label={ __( 'Blend mode', 'artistic-creation-environment' ) }
					value={ contentValues.blendMode || 'normal' }
					options={ BLEND_MODE_OPTIONS }
					onChange={ setCreativeValue( 'aceCreativeContentBlendMode' ) }
				/>
				<RangeControl
					label={ __( 'Blend softness', 'artistic-creation-environment' ) }
					min={ 0 }
					max={ 30 }
					step={ 1 }
					value={ contentValues.backdropBlur }
					onChange={ setCreativeValue( 'aceCreativeContentBackdropBlur' ) }
				/>
				<RangeControl
					label={ __( 'Text tint strength', 'artistic-creation-environment' ) }
					min={ 0 }
					max={ 0.4 }
					step={ 0.01 }
					value={ contentValues.surfaceOpacity }
					onChange={ setCreativeValue( 'aceCreativeContentSurfaceOpacity' ) }
				/>
				<RangeControl
					label={ __( 'Glow intensity', 'artistic-creation-environment' ) }
					min={ 0 }
					max={ 0.5 }
					step={ 0.01 }
					value={ contentValues.borderOpacity }
					onChange={ setCreativeValue( 'aceCreativeContentBorderOpacity' ) }
				/>
				<ToggleControl
					label={ __( 'Invert treatment', 'artistic-creation-environment' ) }
					checked={ !! contentValues.invert }
					onChange={ setCreativeValue( 'aceCreativeContentInvert' ) }
				/>
				<p>{ __( 'Text tint', 'artistic-creation-environment' ) }</p>
				<ColorPalette
					colors={ themeColors }
					value={
						contentValues.surfaceColor || DEFAULT_CONTENT_SURFACE_COLOR
					}
					onChange={ ( value ) =>
						setCreativeAttributes( {
							aceCreativeContentSurfaceColor:
								value || DEFAULT_CONTENT_SURFACE_COLOR,
						} )
					}
					clearable={ false }
				/>
			</PanelBody>
			) }
		</InspectorControls>
	);
};

const withCreativeChildContentEffectsControls = createHigherOrderComponent(
	( BlockEdit ) => {
		return ( props ) => {
			if ( props.name === 'artistic-creation-environment/creative' ) {
				return <BlockEdit { ...props } />;
			}

			return (
				<>
					<BlockEdit { ...props } />
					<CreativeChildContentEffectsControls { ...props } />
				</>
			);
		};
	},
	'withCreativeChildContentEffectsControls'
);

addFilter(
	'editor.BlockEdit',
	'artistic-creation-environment/child-content-effects-controls',
	withCreativeChildContentEffectsControls
);

registerBlockType( 'artistic-creation-environment/creative', {
	apiVersion: 3,
	title: __( 'Creative', 'artistic-creation-environment' ),
	description: __(
		'Creative is a full-width container block with a built-in fluid art background, overlay, and nested content support.',
		'artistic-creation-environment'
	),
	category: 'design',
	icon: 'art',
	keywords: [
		__( 'creative', 'artistic-creation-environment' ),
		__( 'fluid', 'artistic-creation-environment' ),
		__( 'background', 'artistic-creation-environment' ),
	],
	attributes: ATTRIBUTE_DEFINITIONS,
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		layout: {
			allowSwitching: true,
			allowEditing: true,
			default: {
				type: 'constrained',
			},
		},
		spacing: {
			padding: true,
			margin: true,
			blockGap: true,
		},
		dimensions: {
			minHeight: true,
		},
		border: {
			radius: true,
			color: true,
			style: true,
			width: true,
		},
		color: {
			background: false,
			gradients: false,
			text: true,
			link: true,
		},
		typography: {
			fontSize: true,
			lineHeight: true,
		},
		shadow: true,
	},
	edit: CreativeBlockEdit,
	save: CreativeBlockSave,
	deprecated: [
		{
			attributes: ATTRIBUTE_DEFINITIONS,
			save: CreativeBlockDeprecatedCurrentSave,
		},
		{
			attributes: ATTRIBUTE_DEFINITIONS,
			save: CreativeBlockDeprecatedSplitWrapperSave,
		},
		{
			attributes: ATTRIBUTE_DEFINITIONS,
			save: CreativeBlockDeprecatedDirectSave,
		},
	],
} );


// ─── Scramble Text inline format ─────────────────────────────────────────────

const SCRAMBLE_FORMAT_TYPE = 'ace/scramble-text';

const scrambleIcon = (
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<rect x="3" y="5.5" width="4" height="2" rx="0.5" />
<rect x="9" y="5.5" width="7" height="2" rx="0.5" />
<rect x="3" y="11" width="9" height="2" rx="0.5" />
<rect x="14" y="11" width="4" height="2" rx="0.5" />
<rect x="3" y="16.5" width="6" height="2" rx="0.5" />
<rect x="11" y="16.5" width="7" height="2" rx="0.5" />
</svg>
);

registerFormatType( SCRAMBLE_FORMAT_TYPE, {
title: __( 'Scramble text', 'artistic-creation-environment' ),
tagName: 'span',
className: 'ace-scramble-text',
edit( { isActive, onChange, value } ) {
return (
<RichTextToolbarButton
icon={ scrambleIcon }
title={ __( 'Scramble text', 'artistic-creation-environment' ) }
onClick={ () =>
onChange( toggleFormat( value, { type: SCRAMBLE_FORMAT_TYPE } ) )
}
isActive={ isActive }
/>
);
},
} );

// ─── Artistic Text inline formats ────────────────────────────────────────────

const MAGIC_FORMAT_TYPE   = 'ace/magic-text';
const AURORA_FORMAT_TYPE  = 'ace/aurora-text';
const NEON_FORMAT_TYPE    = 'ace/neon-text';
const PRISM_FORMAT_TYPE   = 'ace/prism-text';
const PLASMA_FORMAT_TYPE  = 'ace/plasma-text';
const INFERNO_FORMAT_TYPE = 'ace/inferno-text';

// Shared defaults — single source of truth for both button attributes and text toolbar.
const ACE_AURORA_DEFAULTS  = { palette: 'aurora', intensity: 1.2, speed: 1.0, bands: 5 };
const ACE_NEON_DEFAULTS    = { scheme: 'cyan', density: 8.0, glow: 1.2, sparks: 'medium' };
const ACE_PRISM_DEFAULTS   = { speed: 1.0, spread: 1.0 };
const ACE_PLASMA_DEFAULTS  = { speed: 1.0, turbulence: 1.0 };
const ACE_INFERNO_DEFAULTS = { intensity: 1.0, colorTemp: 'hot', whips: 'normal' };

const MAGIC_RAINBOW = 'linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#a78bfa,#ff6b6b)';

const NEON_COLOR_OPTIONS = [
	{ name: __( 'Cyan', 'artistic-creation-environment' ), color: '#00f5ff' },
	{ name: __( 'Pink', 'artistic-creation-environment' ), color: '#ff00aa' },
	{ name: __( 'Green', 'artistic-creation-environment' ), color: '#39ff14' },
	{ name: __( 'Gold', 'artistic-creation-environment' ), color: '#ffd700' },
	{ name: __( 'Violet', 'artistic-creation-environment' ), color: '#bf5fff' },
];

const AURORA_TEXT_PALETTE_OPTIONS = [
	{ name: __( 'Aurora', 'artistic-creation-environment' ),     value: 'aurora',    colors: [ '#4ade80', '#22d3ee', '#34d399', '#818cf8', '#c084fc', '#4ade80' ] },
	{ name: __( 'Sunset', 'artistic-creation-environment' ),     value: 'sunset',    colors: [ '#f97316', '#ec4899', '#f59e0b', '#ef4444', '#fb923c', '#f97316' ] },
	{ name: __( 'Deep Space', 'artistic-creation-environment' ), value: 'deepspace', colors: [ '#8b5cf6', '#a855f7', '#6366f1', '#c084fc', '#4338ca', '#8b5cf6' ] },
];

const INFERNO_TEXT_COLOR_OPTIONS = [
	{ name: __( 'Hot',    'artistic-creation-environment' ), value: 'hot',  colors: [ '#dc2626', '#f97316', '#fbbf24' ] },
	{ name: __( 'Warm',   'artistic-creation-environment' ), value: 'warm', colors: [ '#f97316', '#fb923c', '#fed7aa' ] },
	{ name: __( 'Cool',   'artistic-creation-environment' ), value: 'cool', colors: [ '#1d4ed8', '#2563eb', '#93c5fd' ] },
	{ name: __( 'Embers', 'artistic-creation-environment' ), value: 'dark', colors: [ '#7f1d1d', '#b45309', '#d97706' ] },
];

const ARTISTIC_TEXT_TYPES = [
	{ value: 'magic',   label: '✨ Magic',   formatType: MAGIC_FORMAT_TYPE,   hasGradient: true        },
	{ value: 'aurora',  label: '🌌 Aurora',  formatType: AURORA_FORMAT_TYPE,  hasAuroraPalette: true   },
	{ value: 'neon',    label: '⚡ Neon',    formatType: NEON_FORMAT_TYPE,    hasNeonColor: true       },
	{ value: 'prism',   label: '🌈 Prism',   formatType: PRISM_FORMAT_TYPE                             },
	{ value: 'plasma',  label: '⚗️ Plasma',  formatType: PLASMA_FORMAT_TYPE                            },
	{ value: 'inferno', label: '🔥 Inferno', formatType: INFERNO_FORMAT_TYPE, hasInfernoColor: true    },
];

const ALL_ARTISTIC_FORMAT_TYPES = ARTISTIC_TEXT_TYPES.map( ( t ) => t.formatType );

const artisticTextIcon = (
	<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
		<path d="M12 2 L13 7 L18 6 L14 9.5 L16 14.5 L12 11.5 L8 14.5 L10 9.5 L6 6 L11 7 Z" />
		<path d="M5 18 L5.6 20 L7.5 19.5 L6 21 L7.5 22.5 L5.6 22 L5 24 L4.4 22 L2.5 22.5 L4 21 L2.5 19.5 L4.4 20 Z" />
		<path d="M19 15 L19.5 17 L21.5 16.5 L20 18 L21.5 19.5 L19.5 19 L19 21 L18.5 19 L16.5 19.5 L18 18 L16.5 16.5 L18.5 17 Z" />
	</svg>
);

function ArtisticTextButton( { value, onChange } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ selectedType, setSelectedType ] = useState( null );
	const [ themeGradients ] = useSettings( 'color.gradients' );

	// Detect which (if any) artistic format is active at the current selection.
	const activeFormat = value?.activeFormats?.find( ( f ) =>
		ALL_ARTISTIC_FORMAT_TYPES.includes( f.type )
	);
	const isActive = !! activeFormat;
	const activeTypeConfig = ARTISTIC_TEXT_TYPES.find(
		( t ) => t.formatType === activeFormat?.type
	);

	const currentType = selectedType ?? activeTypeConfig?.value ?? 'magic';
	const currentConfig = ARTISTIC_TEXT_TYPES.find( ( t ) => t.value === currentType );

	const gradients = [
		{ name: __( 'Rainbow (default)', 'artistic-creation-environment' ), gradient: MAGIC_RAINBOW },
		...( themeGradients || [] ),
	];

	const activeMagicGradient =
		activeFormat?.type === MAGIC_FORMAT_TYPE
			? ( activeFormat?.attributes?.style || '' )
				.replace( '--ace-magic-gradient:', '' )
				.replace( ';', '' )
				.trim()
			: '';

	const activeNeonColor =
		activeFormat?.type === NEON_FORMAT_TYPE
			? ( activeFormat?.attributes?.style || '' )
				.replace( '--ace-neon-color:', '' )
				.replace( ';', '' )
				.trim()
			: '';

	const activeAuroraPalette =
		activeFormat?.type === AURORA_FORMAT_TYPE
			? ( ( activeFormat?.attributes?.style || '' )
				.match( /--ace-aurora-palette:\s*([^;]+)/ ) || [] )[ 1 ] || ACE_AURORA_DEFAULTS.palette
			: ACE_AURORA_DEFAULTS.palette;

	const activeInfernoColor =
		activeFormat?.type === INFERNO_FORMAT_TYPE
			? ( ( activeFormat?.attributes?.style || '' )
				.match( /--ace-inferno-color:\s*([^;]+)/ ) || [] )[ 1 ] || ACE_INFERNO_DEFAULTS.colorTemp
			: ACE_INFERNO_DEFAULTS.colorTemp;

	function removeAllArtistic( v ) {
		return ALL_ARTISTIC_FORMAT_TYPES.reduce(
			( acc, ft ) => removeFormat( acc, ft ),
			v
		);
	}

	function applyArtistic( formatType, attributes = {} ) {
		const cleaned = removeAllArtistic( value );
		onChange( applyFormat( cleaned, { type: formatType, attributes } ) );
		setIsOpen( false );
		setSelectedType( null );
	}

	function handleRemove() {
		onChange( removeAllArtistic( value ) );
		setIsOpen( false );
		setSelectedType( null );
	}

	return (
		<>
			<RichTextToolbarButton
				icon={ artisticTextIcon }
				title={ __( 'Artistic text', 'artistic-creation-environment' ) }
				onClick={ () => setIsOpen( ( v ) => ! v ) }
				isActive={ isActive }
			/>
			{ isOpen && (
				<Popover
					className="ace-magic-gradient-popover"
					onClose={ () => { setIsOpen( false ); setSelectedType( null ); } }
					focusOnMount="firstElement"
					placement="bottom-start"
				>
					<div className="ace-magic-gradient-picker">
						<div className="ace-artistic-text-type-row">
							{ ARTISTIC_TEXT_TYPES.map( ( t ) => (
								<button
									key={ t.value }
									className={ [
										'ace-artistic-text-type-btn',
										currentType === t.value ? 'is-active' : '',
									].filter( Boolean ).join( ' ' ) }
									title={ t.label }
									onClick={ () => setSelectedType( t.value ) }
								>
									{ t.label }
								</button>
							) ) }
						</div>

						{ currentConfig?.hasGradient && (
							<>
								<p className="ace-magic-gradient-picker__label">
									{ __( 'Gradient', 'artistic-creation-environment' ) }
								</p>
								<div className="ace-magic-gradient-picker__swatches">
									{ gradients.map( ( { name, gradient } ) => (
										<button
											key={ gradient }
											className={ [
												'ace-magic-gradient-picker__swatch',
												activeMagicGradient === gradient ? 'is-active' : '',
											].filter( Boolean ).join( ' ' ) }
											title={ name }
											style={ { background: gradient } }
											onClick={ () =>
												applyArtistic( MAGIC_FORMAT_TYPE, {
													style: `--ace-magic-gradient:${ gradient };`,
												} )
											}
										/>
									) ) }
								</div>
							</>
						) }

						{ currentConfig?.hasNeonColor && (
							<>
								<p className="ace-magic-gradient-picker__label">
									{ __( 'Glow colour', 'artistic-creation-environment' ) }
								</p>
								<div className="ace-magic-gradient-picker__swatches">
									{ NEON_COLOR_OPTIONS.map( ( { name, color } ) => (
										<button
											key={ color }
											className={ [
												'ace-magic-gradient-picker__swatch',
												activeNeonColor === color ? 'is-active' : '',
											].filter( Boolean ).join( ' ' ) }
											title={ name }
											style={ { background: color, boxShadow: `0 0 8px ${ color }` } }
											onClick={ () =>
												applyArtistic( NEON_FORMAT_TYPE, {
													style: `--ace-neon-color:${ color };`,
												} )
											}
										/>
									) ) }
								</div>
							</>
						) }

						{ currentConfig?.hasAuroraPalette && (
							<>
								<p className="ace-magic-gradient-picker__label">
									{ __( 'Palette', 'artistic-creation-environment' ) }
								</p>
								<div className="ace-magic-gradient-picker__swatches">
									{ AURORA_TEXT_PALETTE_OPTIONS.map( ( { name, value, colors } ) => (
										<button
											key={ value }
											className={ [
												'ace-magic-gradient-picker__swatch',
												activeAuroraPalette === value ? 'is-active' : '',
											].filter( Boolean ).join( ' ' ) }
											title={ name }
											style={ { background: `linear-gradient(135deg,${ colors.join( ',' ) })` } }
											onClick={ () =>
												applyArtistic( AURORA_FORMAT_TYPE, {
													style: `--ace-aurora-palette:${ value };--ace-aurora-gradient:linear-gradient(90deg,${ colors.join( ',' ) });`,
												} )
											}
										/>
									) ) }
								</div>
							</>
						) }

						{ currentConfig?.hasInfernoColor && (
							<>
								<p className="ace-magic-gradient-picker__label">
									{ __( 'Flame colour', 'artistic-creation-environment' ) }
								</p>
								<div className="ace-magic-gradient-picker__swatches">
									{ INFERNO_TEXT_COLOR_OPTIONS.map( ( { name, value, colors } ) => (
										<button
											key={ value }
											className={ [
												'ace-magic-gradient-picker__swatch',
												activeInfernoColor === value ? 'is-active' : '',
											].filter( Boolean ).join( ' ' ) }
											title={ name }
											style={ { background: `linear-gradient(135deg,${ colors.join( ',' ) })` } }
											onClick={ () =>
												applyArtistic( INFERNO_FORMAT_TYPE, {
													style: `--ace-inferno-color:${ value };--ace-inferno-gradient:linear-gradient(90deg,${ colors.join( ',' ) });`,
												} )
											}
										/>
									) ) }
								</div>
							</>
						) }

						{ ! currentConfig?.hasGradient && ! currentConfig?.hasNeonColor && ! currentConfig?.hasAuroraPalette && ! currentConfig?.hasInfernoColor && (
							<Button
								variant="primary"
								onClick={ () => applyArtistic( currentConfig.formatType ) }
								style={ { margin: '8px 0' } }
							>
								{ __( 'Apply', 'artistic-creation-environment' ) }
							</Button>
						) }

						{ isActive && (
							<Button isDestructive variant="link" onClick={ handleRemove }>
								{ __( 'Remove', 'artistic-creation-environment' ) }
							</Button>
						) }
					</div>
				</Popover>
			) }
		</>
	);
}

// ace/magic-text hosts the toolbar button for all artistic text formats.
// The other format types are registered for className/tagName only (no edit UI).
registerFormatType( MAGIC_FORMAT_TYPE, {
	title: __( 'Artistic text', 'artistic-creation-environment' ),
	tagName: 'span',
	className: 'ace-magic-text',
	attributes: { style: 'style' },
	edit: ArtisticTextButton,
} );

registerFormatType( AURORA_FORMAT_TYPE, {
	title: __( 'Aurora text', 'artistic-creation-environment' ),
	tagName: 'span',
	className: 'ace-aurora-text',
	attributes: { style: 'style' },
} );

registerFormatType( NEON_FORMAT_TYPE, {
	title: __( 'Neon text', 'artistic-creation-environment' ),
	tagName: 'span',
	className: 'ace-neon-text',
	attributes: { style: 'style' },
} );

registerFormatType( PRISM_FORMAT_TYPE, {
	title: __( 'Prism text', 'artistic-creation-environment' ),
	tagName: 'span',
	className: 'ace-prism-text',
} );

registerFormatType( PLASMA_FORMAT_TYPE, {
	title: __( 'Plasma text', 'artistic-creation-environment' ),
	tagName: 'span',
	className: 'ace-plasma-text',
} );

registerFormatType( INFERNO_FORMAT_TYPE, {
	title: __( 'Inferno text', 'artistic-creation-environment' ),
	tagName: 'span',
	className: 'ace-inferno-text',
	attributes: { style: 'style' },
} );

// ─── Artistic Button Background ───────────────────────────────────────────────

const ARTISTIC_BTN_TYPES = [
	{ label: __( 'None', 'artistic-creation-environment' ), value: '' },
	{ label: __( '✨ Magic', 'artistic-creation-environment' ), value: 'magic' },
	{ label: __( '🌌 Aurora', 'artistic-creation-environment' ), value: 'aurora' },
	{ label: __( '⚡ Neon', 'artistic-creation-environment' ), value: 'neon' },
	{ label: __( '🌈 Prism', 'artistic-creation-environment' ), value: 'prism' },
	{ label: __( '⚗️ Plasma', 'artistic-creation-environment' ), value: 'plasma' },
	{ label: __( '🔥 Inferno', 'artistic-creation-environment' ), value: 'inferno' },
];

const AURORA_PALETTE_OPTIONS = [
	{ label: __( 'Aurora', 'artistic-creation-environment' ), value: 'aurora' },
	{ label: __( 'Sunset', 'artistic-creation-environment' ), value: 'sunset' },
	{ label: __( 'Deep Space', 'artistic-creation-environment' ), value: 'deepspace' },
];

const NEON_SCHEME_OPTIONS = [
	{ label: __( 'Cyan', 'artistic-creation-environment' ), value: 'cyan' },
	{ label: __( 'Magenta', 'artistic-creation-environment' ), value: 'magenta' },
	{ label: __( 'Gold', 'artistic-creation-environment' ), value: 'gold' },
];

addFilter(
	'blocks.registerBlockType',
	'artistic-creation-environment/artistic-button-attributes',
	( settings, name ) => {
		if ( name !== 'core/button' ) return settings;
		return {
			...settings,
			attributes: {
				...( settings.attributes || {} ),
				// aceMagicBg / aceMagicBgSparkles kept for backward compat
				aceMagicBg: { type: 'string', default: '' },
				aceMagicBgSparkles: { type: 'boolean', default: false },
				aceArtisticBtnType: { type: 'string', default: '' },
				aceNeonColor: { type: 'string', default: '#00f5ff' }, // kept for text format compat
				aceAuroraPalette:     { type: 'string',  default: ACE_AURORA_DEFAULTS.palette },
				aceNeonScheme:        { type: 'string',  default: ACE_NEON_DEFAULTS.scheme },
				aceAuroraIntensity:   { type: 'number',  default: ACE_AURORA_DEFAULTS.intensity },
				aceAuroraSpeed:       { type: 'number',  default: ACE_AURORA_DEFAULTS.speed },
				aceAuroraBands:       { type: 'number',  default: ACE_AURORA_DEFAULTS.bands },
				aceNeonDensity:       { type: 'number',  default: ACE_NEON_DEFAULTS.density },
				aceNeonGlow:          { type: 'number',  default: ACE_NEON_DEFAULTS.glow },
				aceNeonSparks:        { type: 'string',  default: ACE_NEON_DEFAULTS.sparks },
				acePrismSpeed:        { type: 'number',  default: ACE_PRISM_DEFAULTS.speed },
				acePrismSpread:       { type: 'number',  default: ACE_PRISM_DEFAULTS.spread },
				acePlasmaSpeed:       { type: 'number',  default: ACE_PLASMA_DEFAULTS.speed },
				acePlasmaTurbulence:  { type: 'number',  default: ACE_PLASMA_DEFAULTS.turbulence },
				aceInfernoIntensity:  { type: 'number',  default: ACE_INFERNO_DEFAULTS.intensity },
				aceInfernoColorTemp:  { type: 'string',  default: ACE_INFERNO_DEFAULTS.colorTemp },
				aceInfernoWhips:      { type: 'string',  default: ACE_INFERNO_DEFAULTS.whips },
				// All-effect controls
				aceEffectBlendBg: { type: 'number', default: 1.0 },
				aceEffectBlendMode: { type: 'string', default: '' },
			},
		};
	}
);

// Derive the CSS classes to apply for a given set of button attributes.
function getArtisticBtnClasses( attributes ) {
	const { aceMagicBg, aceMagicBgSparkles, aceArtisticBtnType } = attributes;
	const type = aceArtisticBtnType || ( aceMagicBg ? 'magic' : '' );
	if ( ! type ) return '';
	return [
		'ace-artistic-btn',
		`ace-artistic-btn--${ type }`,
		// Sparkles only apply to magic type
		type === 'magic' && aceMagicBgSparkles ? 'ace-artistic-btn--sparkles' : '',
	]
		.filter( Boolean )
		.join( ' ' );
}

// CSS-variable style — only magic uses a CSS var; WebGL types use data attrs instead.
function getArtisticBtnStyle( attributes ) {
	const { aceMagicBg, aceArtisticBtnType } = attributes;
	const type = aceArtisticBtnType || ( aceMagicBg ? 'magic' : '' );
	if ( type === 'magic' && aceMagicBg ) {
		return { '--ace-magic-gradient': aceMagicBg };
	}
	return {};
}

// Data attributes consumed by ace-btn-effects.js on the frontend.
function getArtisticBtnDataAttrs( attributes ) {
	const {
		aceArtisticBtnType,
		aceMagicBg,
		aceAuroraPalette,
		aceAuroraIntensity,
		aceAuroraSpeed,
		aceAuroraBands,
		aceNeonScheme,
		aceNeonDensity,
		aceNeonGlow,
		aceNeonSparks,
		acePrismSpeed,
		acePrismSpread,
		acePlasmaSpeed,
		acePlasmaTurbulence,
		aceInfernoIntensity,
		aceInfernoColorTemp,
		aceInfernoWhips,
		aceEffectBlendBg,
		aceEffectBlendMode,
	} = attributes;
	const type = aceArtisticBtnType || ( aceMagicBg ? 'magic' : '' );
	const attrs = {};
	if ( ! type || type === 'magic' ) return attrs;

	if ( type === 'aurora' ) {
		if ( aceAuroraPalette ) attrs[ 'data-ace-aurora-palette' ] = aceAuroraPalette;
		if ( aceAuroraIntensity != null ) {
			attrs[ 'data-ace-aurora-intensity' ] = aceAuroraIntensity;
		}
		if ( aceAuroraSpeed != null ) attrs[ 'data-ace-aurora-speed' ] = aceAuroraSpeed;
		if ( aceAuroraBands != null ) attrs[ 'data-ace-aurora-bands' ] = aceAuroraBands;
	}
	if ( type === 'neon' ) {
		if ( aceNeonScheme ) attrs[ 'data-ace-neon-scheme' ] = aceNeonScheme;
		if ( aceNeonDensity != null ) attrs[ 'data-ace-neon-density' ] = aceNeonDensity;
		if ( aceNeonGlow != null ) attrs[ 'data-ace-neon-glow' ] = aceNeonGlow;
		if ( aceNeonSparks ) attrs[ 'data-ace-neon-sparks' ] = aceNeonSparks;
	}
	if ( type === 'prism' ) {
		if ( acePrismSpeed != null ) attrs[ 'data-ace-prism-speed' ] = acePrismSpeed;
		if ( acePrismSpread != null ) attrs[ 'data-ace-prism-spread' ] = acePrismSpread;
	}
	if ( type === 'plasma' ) {
		if ( acePlasmaSpeed != null ) attrs[ 'data-ace-plasma-speed' ] = acePlasmaSpeed;
		if ( acePlasmaTurbulence != null ) {
			attrs[ 'data-ace-plasma-turbulence' ] = acePlasmaTurbulence;
		}
	}
	if ( type === 'inferno' ) {
		if ( aceInfernoIntensity != null ) {
			attrs[ 'data-ace-inferno-intensity' ] = aceInfernoIntensity;
		}
		if ( aceInfernoColorTemp ) attrs[ 'data-ace-inferno-color' ] = aceInfernoColorTemp;
		if ( aceInfernoWhips ) attrs[ 'data-ace-inferno-whips' ] = aceInfernoWhips;
	}
	if ( aceEffectBlendBg != null && aceEffectBlendBg !== 1.0 ) {
		attrs[ 'data-ace-blend-bg' ] = aceEffectBlendBg;
	}
	if ( aceEffectBlendMode ) attrs[ 'data-ace-blend-mode' ] = aceEffectBlendMode;

	return attrs;
}

const NEON_SPARKS_OPTIONS = [
	{ label: __( 'Off', 'artistic-creation-environment' ), value: 'off' },
	{ label: __( 'Light', 'artistic-creation-environment' ), value: 'light' },
	{ label: __( 'Medium', 'artistic-creation-environment' ), value: 'medium' },
	{ label: __( 'Heavy', 'artistic-creation-environment' ), value: 'heavy' },
];

const INFERNO_COLOR_OPTIONS = [
	{ label: __( 'Hot (white core)', 'artistic-creation-environment' ), value: 'hot' },
	{ label: __( 'Warm (orange)', 'artistic-creation-environment' ), value: 'warm' },
	{ label: __( 'Cool (blue flame)', 'artistic-creation-environment' ), value: 'cool' },
	{ label: __( 'Dark (embers)', 'artistic-creation-environment' ), value: 'dark' },
];

const INFERNO_WHIPS_OPTIONS = [
	{ label: __( 'None', 'artistic-creation-environment' ), value: 'off' },
	{ label: __( 'Light', 'artistic-creation-environment' ), value: 'light' },
	{ label: __( 'Normal', 'artistic-creation-environment' ), value: 'normal' },
	{ label: __( 'Heavy', 'artistic-creation-environment' ), value: 'heavy' },
];

const EFFECT_BLEND_MODE_OPTIONS = [
	{ label: __( 'None', 'artistic-creation-environment' ), value: '' },
	{ label: __( 'Screen', 'artistic-creation-environment' ), value: 'screen' },
	{ label: __( 'Multiply', 'artistic-creation-environment' ), value: 'multiply' },
	{ label: __( 'Overlay', 'artistic-creation-environment' ), value: 'overlay' },
	{ label: __( 'Soft light', 'artistic-creation-environment' ), value: 'soft-light' },
];

function ArtisticButtonControls( { attributes, setAttributes } ) {
	const [ themeGradients ] = useSettings( 'color.gradients' );
	const {
		aceMagicBg,
		aceMagicBgSparkles,
		aceArtisticBtnType,
		aceAuroraPalette,
		aceAuroraIntensity,
		aceAuroraSpeed,
		aceAuroraBands,
		aceNeonScheme,
		aceNeonDensity,
		aceNeonGlow,
		aceNeonSparks,
		acePrismSpeed,
		acePrismSpread,
		acePlasmaSpeed,
		acePlasmaTurbulence,
		aceInfernoIntensity,
		aceInfernoColorTemp,
		aceInfernoWhips,
		aceEffectBlendBg,
		aceEffectBlendMode,
	} = attributes;

	const effectiveType = aceArtisticBtnType || ( aceMagicBg ? 'magic' : '' );

	const gradients = [
		{
			name: __( 'Rainbow (default)', 'artistic-creation-environment' ),
			gradient: MAGIC_RAINBOW,
		},
		...( themeGradients || [] ),
	];

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Artistic background', 'artistic-creation-environment' ) }
				initialOpen={ !! effectiveType }
			>
				<SelectControl
					label={ __( 'Style', 'artistic-creation-environment' ) }
					value={ effectiveType }
					options={ ARTISTIC_BTN_TYPES }
					onChange={ ( v ) =>
						setAttributes( {
							aceArtisticBtnType: v,
							aceMagicBg: v === 'magic' ? aceMagicBg : '',
							aceMagicBgSparkles: v === 'magic' ? aceMagicBgSparkles : false,
							// Reset type-specific options when type changes
							aceAuroraPalette: v === 'aurora' ? ( aceAuroraPalette || 'aurora' ) : 'aurora',
							aceNeonScheme: v === 'neon' ? ( aceNeonScheme || 'cyan' ) : 'cyan',
						} )
					}
				/>

				{ effectiveType === 'magic' && (
					<>
						<p className="ace-magic-gradient-picker__label">
							{ __( 'Gradient', 'artistic-creation-environment' ) }
						</p>
						<div className="ace-magic-gradient-picker__swatches">
							{ gradients.map( ( { name, gradient } ) => (
								<button
									key={ gradient }
									className={ [
										'ace-magic-gradient-picker__swatch',
										aceMagicBg === gradient ? 'is-active' : '',
									]
										.filter( Boolean )
										.join( ' ' ) }
									title={ name }
									style={ { background: gradient } }
									onClick={ () =>
										setAttributes( { aceMagicBg: gradient } )
									}
								/>
							) ) }
						</div>
						<ToggleControl
							label={ __( 'Sparkles', 'artistic-creation-environment' ) }
							checked={ !! aceMagicBgSparkles }
							onChange={ ( value ) =>
								setAttributes( { aceMagicBgSparkles: value } )
							}
						/>
					</>
				) }

				{ effectiveType === 'aurora' && (
					<>
						<SelectControl
							label={ __( 'Palette', 'artistic-creation-environment' ) }
							value={ aceAuroraPalette || 'aurora' }
							options={ AURORA_PALETTE_OPTIONS }
							onChange={ ( v ) => setAttributes( { aceAuroraPalette: v } ) }
						/>
						<RangeControl
							label={ __( 'Intensity', 'artistic-creation-environment' ) }
							value={ aceAuroraIntensity != null ? aceAuroraIntensity : 1.2 }
							min={ 0.3 }
							max={ 2.5 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { aceAuroraIntensity: v } ) }
						/>
						<RangeControl
							label={ __( 'Speed', 'artistic-creation-environment' ) }
							value={ aceAuroraSpeed != null ? aceAuroraSpeed : 1.0 }
							min={ 0.2 }
							max={ 3.0 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { aceAuroraSpeed: v } ) }
						/>
						<RangeControl
							label={ __( 'Bands', 'artistic-creation-environment' ) }
							value={ aceAuroraBands != null ? aceAuroraBands : 5 }
							min={ 1 }
							max={ 8 }
							step={ 1 }
							onChange={ ( v ) => setAttributes( { aceAuroraBands: v } ) }
						/>
					</>
				) }

				{ effectiveType === 'neon' && (
					<>
						<SelectControl
							label={ __( 'Colour scheme', 'artistic-creation-environment' ) }
							value={ aceNeonScheme || 'cyan' }
							options={ NEON_SCHEME_OPTIONS }
							onChange={ ( v ) => setAttributes( { aceNeonScheme: v } ) }
						/>
						<RangeControl
							label={ __( 'Line density', 'artistic-creation-environment' ) }
							value={ aceNeonDensity != null ? aceNeonDensity : 8.0 }
							min={ 3 }
							max={ 18 }
							step={ 0.5 }
							onChange={ ( v ) => setAttributes( { aceNeonDensity: v } ) }
						/>
						<RangeControl
							label={ __( 'Glow', 'artistic-creation-environment' ) }
							value={ aceNeonGlow != null ? aceNeonGlow : 1.2 }
							min={ 0.2 }
							max={ 3.0 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { aceNeonGlow: v } ) }
						/>
						<SelectControl
							label={ __( 'Electric sparks', 'artistic-creation-environment' ) }
							value={ aceNeonSparks || 'medium' }
							options={ NEON_SPARKS_OPTIONS }
							onChange={ ( v ) => setAttributes( { aceNeonSparks: v } ) }
						/>
					</>
				) }

				{ effectiveType === 'prism' && (
					<>
						<RangeControl
							label={ __( 'Rotation speed', 'artistic-creation-environment' ) }
							value={ acePrismSpeed != null ? acePrismSpeed : 1.0 }
							min={ 0.1 }
							max={ 3.0 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { acePrismSpeed: v } ) }
						/>
						<RangeControl
							label={ __( 'Beam spread', 'artistic-creation-environment' ) }
							value={ acePrismSpread != null ? acePrismSpread : 1.0 }
							min={ 0.3 }
							max={ 2.5 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { acePrismSpread: v } ) }
						/>
					</>
				) }

				{ effectiveType === 'plasma' && (
					<>
						<RangeControl
							label={ __( 'Speed', 'artistic-creation-environment' ) }
							value={ acePlasmaSpeed != null ? acePlasmaSpeed : 1.0 }
							min={ 0.2 }
							max={ 3.0 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { acePlasmaSpeed: v } ) }
						/>
						<RangeControl
							label={ __( 'Turbulence', 'artistic-creation-environment' ) }
							value={ acePlasmaTurbulence != null ? acePlasmaTurbulence : 1.0 }
							min={ 0.3 }
							max={ 3.0 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { acePlasmaTurbulence: v } ) }
						/>
					</>
				) }

				{ effectiveType === 'inferno' && (
					<>
						<RangeControl
							label={ __( 'Fire intensity', 'artistic-creation-environment' ) }
							value={ aceInfernoIntensity != null ? aceInfernoIntensity : 1.0 }
							min={ 0.2 }
							max={ 3.0 }
							step={ 0.1 }
							onChange={ ( v ) => setAttributes( { aceInfernoIntensity: v } ) }
						/>
						<SelectControl
							label={ __( 'Flame colour', 'artistic-creation-environment' ) }
							value={ aceInfernoColorTemp || 'hot' }
							options={ INFERNO_COLOR_OPTIONS }
							onChange={ ( v ) => setAttributes( { aceInfernoColorTemp: v } ) }
						/>
						<SelectControl
							label={ __( 'Fire whips', 'artistic-creation-environment' ) }
							value={ aceInfernoWhips || 'normal' }
							options={ INFERNO_WHIPS_OPTIONS }
							onChange={ ( v ) => setAttributes( { aceInfernoWhips: v } ) }
						/>
					</>
				) }

				{ !! effectiveType && effectiveType !== 'magic' && (
					<>
						<RangeControl
							label={ __( 'Effect opacity', 'artistic-creation-environment' ) }
							help={ __(
								"Lower values blend the effect with the button's native background colour.",
								'artistic-creation-environment'
							) }
							value={ aceEffectBlendBg != null ? aceEffectBlendBg : 1.0 }
							min={ 0 }
							max={ 1 }
							step={ 0.05 }
							onChange={ ( v ) => setAttributes( { aceEffectBlendBg: v } ) }
						/>
						{ ( aceEffectBlendBg != null ? aceEffectBlendBg : 1.0 ) < 1.0 && (
							<SelectControl
								label={ __( 'Blend mode', 'artistic-creation-environment' ) }
								value={ aceEffectBlendMode || '' }
								options={ EFFECT_BLEND_MODE_OPTIONS }
								onChange={ ( v ) => setAttributes( { aceEffectBlendMode: v } ) }
							/>
						) }
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
}

const withArtisticButtonControls = createHigherOrderComponent(
	( BlockEdit ) => {
		return ( props ) => {
			if ( props.name !== 'core/button' ) {
				return <BlockEdit { ...props } />;
			}
			return (
				<>
					<BlockEdit { ...props } />
					<ArtisticButtonControls
						attributes={ props.attributes }
						setAttributes={ props.setAttributes }
					/>
				</>
			);
		};
	},
	'withArtisticButtonControls'
);

addFilter(
	'editor.BlockEdit',
	'artistic-creation-environment/artistic-button-controls',
	withArtisticButtonControls
);

const withArtisticButtonClass = createHigherOrderComponent(
	( BlockListBlock ) => {
		return ( props ) => {
			const { name, attributes } = props;
			if ( name !== 'core/button' ) {
				return <BlockListBlock { ...props } />;
			}
			const extraClasses = getArtisticBtnClasses( attributes );
			if ( ! extraClasses ) {
				return <BlockListBlock { ...props } />;
			}
			const artStyle = getArtisticBtnStyle( attributes );
			const dataAttrs = getArtisticBtnDataAttrs( attributes );
			const wrapperProps = {
				...( props.wrapperProps || {} ),
				...dataAttrs,
				style: {
					...( props.wrapperProps?.style || {} ),
					...artStyle,
				},
			};
			// Strip any previously-saved ace-artistic-btn* / ace-magic-btn* classes
			// so changing type (e.g. magic→plasma) never leaves stale sparkles behind.
			const strippedClassName = ( props.className || '' )
				.split( ' ' )
				.filter( ( c ) => ! c.startsWith( 'ace-artistic-btn' ) && ! c.startsWith( 'ace-magic-btn' ) )
				.join( ' ' );
			return (
				<BlockListBlock
					{ ...props }
					className={ [ strippedClassName, extraClasses ]
						.filter( Boolean )
						.join( ' ' ) }
					wrapperProps={ wrapperProps }
				/>
			);
		};
	},
	'withArtisticButtonClass'
);

addFilter(
	'editor.BlockListBlock',
	'artistic-creation-environment/artistic-button-class',
	withArtisticButtonClass
);

addFilter(
	'blocks.getSaveElement',
	'artistic-creation-environment/artistic-button-save',
	( element, blockType, attributes ) => {
		if ( blockType.name !== 'core/button' ) {
			return element;
		}
		const extraClasses = getArtisticBtnClasses( attributes );
		if ( ! extraClasses ) {
			return element;
		}
		const artStyle = getArtisticBtnStyle( attributes );
		const dataAttrs = getArtisticBtnDataAttrs( attributes );
		// Strip stale ace-artistic-btn* / ace-magic-btn* before adding fresh ones —
		// prevents old sparkles/type classes lingering when type changes.
		const existingClassName = ( element.props?.className || '' )
			.split( ' ' )
			.filter( ( c ) => ! c.startsWith( 'ace-artistic-btn' ) && ! c.startsWith( 'ace-magic-btn' ) )
			.join( ' ' );
		const newClassName = `${ existingClassName } ${ extraClasses }`.trim();
		const existingStyle = element.props?.style || {};
		return cloneElement( element, {
			className: newClassName,
			style: { ...existingStyle, ...artStyle },
			...dataAttrs,
		} );
	}
);
