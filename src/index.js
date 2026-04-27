import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { Fragment, useEffect, useRef, useState } from '@wordpress/element';
import { useResizeObserver } from '@wordpress/compose';
import {
	BlockControls,
	ColorPalette,
	InspectorControls,
	InnerBlocks,
	useBlockProps,
	useInnerBlocksProps,
	useSettings,
} from '@wordpress/block-editor';
import {
	Notice,
	PanelBody,
	RangeControl,
	ResizableBox,
	SelectControl,
	ToolbarButton,
	ToolbarGroup,
	ToggleControl,
} from '@wordpress/components';

import './editor.scss';

const pluginData = window.artisticCreationEnvironment || {};
const defaultEffect = pluginData.defaultEffect || 'liquid-splash';
const defaults = pluginData.defaults || {};
const effectCatalog = pluginData.effects || {};

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

const BLEND_MODE_OPTIONS = [
	{ label: __( 'Normal', 'artistic-creation-environment' ), value: 'normal' },
	{ label: __( 'Screen', 'artistic-creation-environment' ), value: 'screen' },
	{ label: __( 'Overlay', 'artistic-creation-environment' ), value: 'overlay' },
	{
		label: __( 'Difference', 'artistic-creation-environment' ),
		value: 'difference',
	},
	{
		label: __( 'Exclusion', 'artistic-creation-environment' ),
		value: 'exclusion',
	},
	{
		label: __( 'Colour dodge', 'artistic-creation-environment' ),
		value: 'color-dodge',
	},
	{
		label: __( 'Luminosity', 'artistic-creation-environment' ),
		value: 'luminosity',
	},
];

const DEFAULT_CONTENT_SURFACE_COLOR = '#ffffff';
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
			effectCatalog['liquid-splash']?.label ||
			__( 'Fluid Simulation', 'artistic-creation-environment' ),
		value: 'liquid-splash',
	},
];

const DEFAULT_BACKGROUND_COLOR = '#1c1226';
const DEFAULT_OVERLAY_COLOR = '#000000';
const DEFAULT_BLOCK_MIN_HEIGHT = 320;
const MIN_BLOCK_HEIGHT = 120;
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
};

const resolveValue = ( attributes, key ) =>
	attributes?.[ key ] !== undefined
		? attributes[ key ]
		: defaults[ key ] !== undefined
			? defaults[ key ]
			: ATTRIBUTE_DEFINITIONS[ key ]?.default;

const resolveLegacyBackdropColor = ( backdropStyle ) =>
	LEGACY_BACKDROP_COLORS[ backdropStyle ] || DEFAULT_BACKGROUND_COLOR;

const resolveBackgroundColor = ( attributes = {} ) =>
	attributes.aceCreativeBackgroundColor ||
	defaults.aceCreativeBackgroundColor ||
	resolveLegacyBackdropColor(
		resolveValue( attributes, 'aceCreativeBackgroundBackdropStyle' )
	);

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

const getOuterClassName = ( attributes = {} ) =>
	[
		'artistic-creative',
		hasContentEffects( attributes )
			? 'artistic-creative--content-effects'
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
	const presetPadding =
		preset === 'none' &&
		! contentValues.surfaceOpacity &&
		! contentValues.borderOpacity
			? '0'
			: '0.18em 0.32em';
	const presetRadius =
		preset === 'none' &&
		! contentValues.surfaceOpacity &&
		! contentValues.borderOpacity
			? '0px'
			: '18px';

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
		'--ace-content-padding': presetPadding,
		'--ace-content-radius': presetRadius,
	};
};

const getEditorBlockStyle = ( attributes = {} ) => {
	const contentStyle = getContentEffectStyle( attributes ) || {};

	if ( attributes?.style?.dimensions?.minHeight ) {
		return Object.keys( contentStyle ).length ? contentStyle : undefined;
	}

	return {
		...contentStyle,
		minHeight: `${ DEFAULT_BLOCK_MIN_HEIGHT }px`,
	};
};

const getSavedBlockStyle = ( attributes = {} ) =>
	getContentEffectStyle( attributes ) || undefined;

const resolveEffect = ( effectValue ) => {
	if ( effectValue === 'site-default' ) {
		return defaultEffect;
	}

	return effectValue || '';
};

const getEffectConfig = ( attributes = {}, options = {} ) => ( {
	effect: resolveEffect( attributes.aceCreativeBackgroundEffect || 'site-default' ),
	...( options.includeBackgroundColor ||
	attributes.aceCreativeBackgroundColor !== undefined
		? { backgroundColor: resolveBackgroundColor( attributes ) }
		: {} ),
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
} );

const getSerializedEffectConfig = ( attributes = {}, options = {} ) => {
	const effectConfig = getEffectConfig( attributes, options );

	if ( attributes.aceCreativeBackgroundParticleShape === undefined ) {
		delete effectConfig.particleShape;
	}

	if ( attributes.aceCreativeBackgroundParticleSpread === undefined ) {
		delete effectConfig.particleSpread;
	}

	if ( attributes.aceCreativeBackgroundFlowJitter === undefined ) {
		delete effectConfig.flowJitter;
	}

	return effectConfig;
};

const getOverlayStyle = ( attributes = {} ) => ( {
	backgroundColor:
		attributes.aceCreativeOverlayColor ||
		DEFAULT_OVERLAY_COLOR,
	opacity:
		attributes.aceCreativeOverlayOpacity ??
		ATTRIBUTE_DEFINITIONS.aceCreativeOverlayOpacity.default,
} );

const getLayerStyle = ( attributes = {}, includeFallback = false ) => {
	if ( ! includeFallback && attributes.aceCreativeBackgroundColor === undefined ) {
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
				currentClassName.startsWith( 'is-content-justification-' )
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
				style={ getLayerStyle( attributes, true ) }
			>
				<canvas className="artistic-creative__canvas" />
				<div
					className="artistic-creative__status"
					data-artistic-fluid-status
					aria-live="polite"
				/>
			</div>
		);
	}

	return (
		<div
			className="artistic-creative__layer artistic-creative__layer--placeholder"
			aria-hidden="true"
			style={ getLayerStyle( attributes, true ) }
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
	const fluidPreviewRef = useRef( null );
	const [ resizeListener, { height, width } ] = useResizeObserver();
	const effectConfig = getEffectConfig( attributes, {
		includeBackgroundColor: true,
	} );
	const effectConfigSignature = JSON.stringify( effectConfig );
	const hasPreviewRuntime =
		typeof window.ArtisticCreationEnvironmentFluid === 'function';
	const currentMinHeight = getMinHeightValue( attributes );
	const rawBlockProps = useBlockProps( {
		className: `${ getOuterClassName(
			attributes
		) } block-library-cover__resize-container`,
		'data-artistic-creative-effect': effectConfig.effect || '',
		style: getEditorBlockStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'artistic-creative__inner-container',
		},
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
			if ( fluidPreviewRef.current?.destroy ) {
				fluidPreviewRef.current.destroy();
			}

			fluidPreviewRef.current = null;
			return;
		}

		if ( ! fluidPreviewRef.current ) {
			fluidPreviewRef.current = window.ArtisticCreationEnvironmentFluid(
				previewRef.current,
				effectConfig,
				{
					interactionSurface: previewRef.current.parentElement,
					auraSource: previewRef.current.parentElement,
				}
			);
		}

		fluidPreviewRef.current?.setPaused?.( false );
		fluidPreviewRef.current?.applyConfig?.( effectConfig );
	}, [ editorMode, effectConfig.effect, effectConfigSignature, hasPreviewRuntime ] );

	useEffect( () => {
		return () => {
			if ( fluidPreviewRef.current?.destroy ) {
				fluidPreviewRef.current.destroy();
			}

			fluidPreviewRef.current = null;
		};
	}, [] );

	return (
		<Fragment>
			<BlockControls>
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

					{ attributes.aceCreativeBackgroundEffect === 'site-default' &&
						! defaultEffect && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'The site default effect is currently “None”, so this Creative block will stay static until the default is changed.',
									'artistic-creation-environment'
								) }
							</Notice>
						) }

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
						max={ 2.5 }
						step={ 0.1 }
						value={ effectConfig.autoplayEasing }
						onChange={ setValue( 'aceCreativeBackgroundAutoplayEasing' ) }
						help={ __(
							'Higher values make the autoplay splashes ramp in more gradually before they fully bloom.',
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
						label={ __( 'Backdrop blur', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 30 }
						step={ 1 }
						value={ getContentPresetValues( attributes ).backdropBlur }
						onChange={ setValue( 'aceCreativeContentBackdropBlur' ) }
					/>
					<RangeControl
						label={ __( 'Glass surface opacity', 'artistic-creation-environment' ) }
						min={ 0 }
						max={ 0.4 }
						step={ 0.01 }
						value={ getContentPresetValues( attributes ).surfaceOpacity }
						onChange={ setValue( 'aceCreativeContentSurfaceOpacity' ) }
					/>
					<RangeControl
						label={ __( 'Border glow opacity', 'artistic-creation-environment' ) }
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
					<p>{ __( 'Surface tint', 'artistic-creation-environment' ) }</p>
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
			</InspectorControls>

			<ResizableBox
				{ ...rawBlockProps }
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
		</Fragment>
	);
};

const CreativeBlockSave = ( props = {} ) => {
	const { attributes = {} } = props;
	const effectConfig = getSerializedEffectConfig( attributes );
	const rawBlockProps = useBlockProps.save( {
		className: getOuterClassName( attributes ),
		'data-artistic-creative-effect': effectConfig.effect || '',
		style: getSavedBlockStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps.save( {
		className: 'artistic-creative__inner-container',
	} );

	return (
		<div { ...rawBlockProps }>
			{ effectConfig.effect && (
				<div
					className="artistic-creative__layer"
					aria-hidden="true"
					data-artistic-config={ JSON.stringify( effectConfig ) }
					style={ getLayerStyle( attributes ) }
				>
					<canvas className="artistic-creative__canvas" />
					<div className="artistic-creative__status" data-artistic-fluid-status aria-live="polite" />
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
					style={ getLayerStyle( attributes ) }
				>
					<canvas className="artistic-creative__canvas" />
					<div className="artistic-creative__status" data-artistic-fluid-status aria-live="polite" />
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
					<canvas className="artistic-creative__canvas" />
					<div
						className="artistic-creative__status"
						data-artistic-fluid-status
						aria-live="polite"
					/>
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
					<canvas className="artistic-creative__canvas" />
					<div
						className="artistic-creative__status"
						data-artistic-fluid-status
						aria-live="polite"
					/>
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
