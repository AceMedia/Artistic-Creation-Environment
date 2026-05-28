<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Artistic_Creation_Environment {
	const OPTION_NAME         = 'artistic_creation_environment_settings';
	const LEGACY_OPTION_NAME  = 'ace_cover_creative_backgrounds_settings';
	const SETTINGS_KEY        = 'artistic_creation_environment';
	const MENU_SLUG    = 'artistic-creation-environment';

	/**
	 * Single plugin instance.
	 *
	 * @var Artistic_Creation_Environment|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @return Artistic_Creation_Environment
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Persist default settings on activation.
	 *
	 * @return void
	 */
	public static function activate() {
		$legacy = get_option( self::LEGACY_OPTION_NAME );
		if ( ! get_option( self::OPTION_NAME ) ) {
			update_option( self::OPTION_NAME, is_array( $legacy ) ? wp_parse_args( $legacy, self::default_settings() ) : self::default_settings() );
		}
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'register_assets' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_assets' ) );
		add_action( 'admin_menu', array( $this, 'register_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_settings_assets' ) );
	}

	/**
	 * Default site-wide settings.
	 *
	 * @return array<string, mixed>
	 */
	public static function default_settings() {
		return array(
			'default_effect'         => 'liquid-splash',
			'background_color'       => '#1c1226',
			'dye_resolution'         => 1024,
			'sim_resolution'         => 128,
			'density_dissipation'    => 0.45,
			'velocity_dissipation'   => 0.2,
			'pressure'               => 0.8,
			'curl'                   => 30,
			'splat_radius'           => 0.25,
			'autoplay'               => true,
			'autoplay_intensity'     => 0.8,
			'autoplay_easing'        => 1.6,
			'hover'                  => true,
			'touch'                  => true,
			'tilt'                   => false,
			'webcam_motion'          => false,
			'webcam_intensity'       => 0.85,
			'audio_input'            => 'off',
			'audio_intensity'        => 0.85,
			'color_boost'            => 1.8,
			'aura_mode'              => false,
			'backdrop_style'         => 'aurora',
			'shading'                => true,
			'colorful'               => true,
			'bloom'                  => true,
			'bloom_intensity'        => 0.36,
			'bloom_threshold'        => 0.78,
			'sunrays'                => false,
			'sunrays_weight'         => 1.0,
		);
	}

	/**
	 * Register script/style assets.
	 *
	 * @return void
	 */
	public function register_assets() {
		$script_path                   = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/index.js';
		$asset_path                    = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/index.asset.php';
		$style_path                    = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/index.css';
		$runtime_script_path           = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/fluid-simulation.js';
		$ascii_script_path             = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/ascii-world.js';
		$aurora_script_path            = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/aurora-flow.js';
		$constellation_script_path     = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/particle-constellation.js';
		$topo_script_path              = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/neon-topography.js';
		$caustics_script_path          = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/glass-caustics.js';
		$dust_script_path              = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/magnetic-dust.js';
		$frontend_script_path          = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/frontend.js';
		$button_effects_script_path    = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/ace-btn-effects.js';
		$scramble_script_path          = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/scramble-text.js';
		$magic_script_path             = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/magic-text.js';

		if ( file_exists( $script_path ) && file_exists( $asset_path ) ) {
			$asset = require $asset_path;
			$editor_dependencies = isset( $asset['dependencies'] ) ? $asset['dependencies'] : array();

			if ( file_exists( $runtime_script_path ) ) {
				$editor_dependencies[] = 'artistic-creation-environment-runtime';
			}

			if ( file_exists( $ascii_script_path ) ) {
				$editor_dependencies[] = 'artistic-creation-environment-ascii';
			}

			if ( file_exists( $aurora_script_path ) ) {
				$editor_dependencies[] = 'artistic-creation-environment-aurora';
			}

			if ( file_exists( $constellation_script_path ) ) {
				$editor_dependencies[] = 'artistic-creation-environment-constellation';
			}

			if ( file_exists( $topo_script_path ) ) {
				$editor_dependencies[] = 'artistic-creation-environment-topo';
			}

			if ( file_exists( $caustics_script_path ) ) {
				$editor_dependencies[] = 'artistic-creation-environment-caustics';
			}

			if ( file_exists( $dust_script_path ) ) {
				$editor_dependencies[] = 'artistic-creation-environment-dust';
			}

			wp_register_script(
				'artistic-creation-environment-editor',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/index.js',
				$editor_dependencies,
				isset( $asset['version'] ) ? $asset['version'] : ARTISTIC_CREATION_ENVIRONMENT_VERSION,
				true
			);

			wp_localize_script(
				'artistic-creation-environment-editor',
				'artisticCreationEnvironment',
				array(
					'defaultEffect' => $this->get_setting( 'default_effect' ),
					'defaults'      => $this->get_editor_defaults(),
					'previewUrls'   => $this->get_editor_preview_urls(),
					'effects'       => $this->get_effect_catalog(),
					'messageType'   => 'artistic-creation-environment-preview',
				)
			);
		}

		if ( file_exists( $style_path ) ) {
			wp_register_style(
				'artistic-creation-environment',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/index.css',
				array(),
				(string) filemtime( $style_path )
			);
		}

		if ( file_exists( $runtime_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-runtime',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/fluid-simulation.js',
				array(),
				(string) filemtime( $runtime_script_path ),
				true
			);
		}

		if ( file_exists( $ascii_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-ascii',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/ascii-world.js',
				array(),
				(string) filemtime( $ascii_script_path ),
				true
			);
		}

		if ( file_exists( $aurora_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-aurora',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/aurora-flow.js',
				array(),
				(string) filemtime( $aurora_script_path ),
				true
			);
		}

		if ( file_exists( $constellation_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-constellation',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/particle-constellation.js',
				array(),
				(string) filemtime( $constellation_script_path ),
				true
			);
		}

		if ( file_exists( $topo_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-topo',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/neon-topography.js',
				array(),
				(string) filemtime( $topo_script_path ),
				true
			);
		}

		if ( file_exists( $caustics_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-caustics',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/glass-caustics.js',
				array(),
				(string) filemtime( $caustics_script_path ),
				true
			);
		}

		if ( file_exists( $dust_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-dust',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/magnetic-dust.js',
				array(),
				(string) filemtime( $dust_script_path ),
				true
			);
		}

		if ( file_exists( $frontend_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-frontend',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/frontend.js',
				array_filter(
					array(
						file_exists( $runtime_script_path )       ? 'artistic-creation-environment-runtime'       : null,
						file_exists( $ascii_script_path )         ? 'artistic-creation-environment-ascii'         : null,
						file_exists( $aurora_script_path )        ? 'artistic-creation-environment-aurora'        : null,
						file_exists( $constellation_script_path ) ? 'artistic-creation-environment-constellation' : null,
						file_exists( $topo_script_path )          ? 'artistic-creation-environment-topo'          : null,
						file_exists( $caustics_script_path )      ? 'artistic-creation-environment-caustics'      : null,
						file_exists( $dust_script_path )          ? 'artistic-creation-environment-dust'          : null,
					)
				),
				(string) filemtime( $frontend_script_path ),
				true
			);
		}

		if ( file_exists( $button_effects_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-btn-effects',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/ace-btn-effects.js',
				array(),
				(string) filemtime( $button_effects_script_path ),
				true
			);
		}

		if ( file_exists( $scramble_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-scramble',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/scramble-text.js',
				array(),
				(string) filemtime( $scramble_script_path ),
				true
			);
		}

		if ( file_exists( $magic_script_path ) ) {
			wp_register_script(
				'artistic-creation-environment-magic',
				ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/magic-text.js',
				array(),
				(string) filemtime( $magic_script_path ),
				true
			);
		}

	}

	/**
	 * Enqueue the editor controls.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets() {
		if ( wp_script_is( 'artistic-creation-environment-editor', 'registered' ) ) {
			wp_enqueue_script( 'artistic-creation-environment-editor' );
		}

		if ( wp_script_is( 'artistic-creation-environment-scramble', 'registered' ) ) {
			wp_enqueue_script( 'artistic-creation-environment-scramble' );
		}

		if ( wp_script_is( 'artistic-creation-environment-magic', 'registered' ) ) {
			wp_enqueue_script( 'artistic-creation-environment-magic' );
		}

		$this->enqueue_shared_style();
	}

	/**
	 * Enqueue frontend runtime assets for the Creative block.
	 *
	 * @return void
	 */
	public function enqueue_block_assets() {
		if ( is_admin() ) {
			return;
		}

		$this->enqueue_frontend_assets();
	}

	/**
	 * Enqueue styles on the plugin settings page.
	 *
	 * @param string $hook_suffix Admin page hook.
	 * @return void
	 */
	public function enqueue_settings_assets( $hook_suffix ) {
		if ( 'settings_page_' . self::MENU_SLUG !== $hook_suffix ) {
			return;
		}

		$this->enqueue_shared_style();
	}

	/**
	 * Register the settings page.
	 *
	 * @return void
	 */
	public function register_settings_page() {
		add_options_page(
			__( 'Artistic Creation Environment', 'artistic-creation-environment' ),
			__( 'Artistic Creation Environment', 'artistic-creation-environment' ),
			'manage_options',
			self::MENU_SLUG,
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Register the plugin settings.
	 *
	 * @return void
	 */
	public function register_settings() {
		register_setting(
			self::SETTINGS_KEY,
			self::OPTION_NAME,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default'           => self::default_settings(),
			)
		);
	}

	/**
	 * Sanitize the settings payload.
	 *
	 * @param mixed $input Raw settings.
	 * @return array<string, mixed>
	 */
	public function sanitize_settings( $input ) {
		$defaults = self::default_settings();
		$input    = is_array( $input ) ? $input : array();

		$default_effect = isset( $input['default_effect'] ) ? sanitize_key( $input['default_effect'] ) : $defaults['default_effect'];
		if ( ! in_array( $default_effect, array( 'liquid-splash', 'ascii-world', 'aurora-flow', 'particle-constellation', 'neon-topography', 'glass-caustics', 'magnetic-dust', '' ), true ) ) {
			$default_effect = $defaults['default_effect'];
		}

		return array(
			'default_effect'       => $default_effect,
			'background_color'     => $this->sanitize_color( $input, 'background_color', $defaults['background_color'] ),
			'dye_resolution'       => $this->sanitize_choice_number( $input, 'dye_resolution', array( 128, 256, 512, 1024 ), $defaults['dye_resolution'] ),
			'sim_resolution'       => $this->sanitize_choice_number( $input, 'sim_resolution', array( 32, 64, 128, 256 ), $defaults['sim_resolution'] ),
			'density_dissipation'  => $this->sanitize_float( $input, 'density_dissipation', 0, 4, $defaults['density_dissipation'] ),
			'velocity_dissipation' => $this->sanitize_float( $input, 'velocity_dissipation', 0, 4, $defaults['velocity_dissipation'] ),
			'pressure'             => $this->sanitize_float( $input, 'pressure', 0, 1, $defaults['pressure'] ),
			'curl'                 => $this->sanitize_float( $input, 'curl', 0, 50, $defaults['curl'] ),
			'splat_radius'         => $this->sanitize_float( $input, 'splat_radius', 0.01, 4, $defaults['splat_radius'] ),
			'autoplay'             => $this->sanitize_bool( $input, 'autoplay', $defaults['autoplay'] ),
			'autoplay_intensity'   => $this->sanitize_float( $input, 'autoplay_intensity', 0.2, 2, $defaults['autoplay_intensity'] ),
			'autoplay_easing'      => $this->sanitize_float( $input, 'autoplay_easing', 0.5, 5, $defaults['autoplay_easing'] ),
			'hover'                => $this->sanitize_bool( $input, 'hover', $defaults['hover'] ),
			'touch'                => $this->sanitize_bool( $input, 'touch', $defaults['touch'] ),
			'tilt'                 => $this->sanitize_bool( $input, 'tilt', $defaults['tilt'] ),
			'webcam_motion'        => $this->sanitize_bool( $input, 'webcam_motion', $defaults['webcam_motion'] ),
			'webcam_intensity'     => $this->sanitize_float( $input, 'webcam_intensity', 0.2, 2, $defaults['webcam_intensity'] ),
			'audio_input'          => $this->sanitize_choice( $input, 'audio_input', array( 'off', 'microphone', 'system' ), $defaults['audio_input'] ),
			'audio_intensity'      => $this->sanitize_float( $input, 'audio_intensity', 0.2, 2, $defaults['audio_intensity'] ),
			'color_boost'          => $this->sanitize_float( $input, 'color_boost', 1, 3, $defaults['color_boost'] ),
			'aura_mode'            => $this->sanitize_bool( $input, 'aura_mode', $defaults['aura_mode'] ),
			'backdrop_style'       => $this->sanitize_choice( $input, 'backdrop_style', array_keys( $this->get_backdrop_style_options() ), $defaults['backdrop_style'] ),
			'shading'              => $this->sanitize_bool( $input, 'shading', $defaults['shading'] ),
			'colorful'             => $this->sanitize_bool( $input, 'colorful', $defaults['colorful'] ),
			'bloom'                => $this->sanitize_bool( $input, 'bloom', $defaults['bloom'] ),
			'bloom_intensity'      => $this->sanitize_float( $input, 'bloom_intensity', 0.1, 2, $defaults['bloom_intensity'] ),
			'bloom_threshold'      => $this->sanitize_float( $input, 'bloom_threshold', 0, 1, $defaults['bloom_threshold'] ),
			'sunrays'              => $this->sanitize_bool( $input, 'sunrays', $defaults['sunrays'] ),
			'sunrays_weight'       => $this->sanitize_float( $input, 'sunrays_weight', 0.3, 1, $defaults['sunrays_weight'] ),
		);
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings     = $this->get_settings();
		$catalog      = $this->get_effect_catalog();
		$preview_urls = $this->get_editor_preview_urls();
		$preview_effect = ! empty( $settings['default_effect'] ) && ! empty( $preview_urls[ $settings['default_effect'] ] )
			? $settings['default_effect']
			: 'liquid-splash';
		$preview_src  = ! empty( $preview_urls[ $preview_effect ] ) ? add_query_arg( 'embedded', '1', $preview_urls[ $preview_effect ] ) : '';
		?>
		<div class="wrap artistic-creation-environment-admin">
			<h1><?php esc_html_e( 'Artistic Creation Environment', 'artistic-creation-environment' ); ?></h1>
			<p>
				<?php esc_html_e( 'Artistic Creation Environment brings a WebGL fluid simulation style to the Creative block with site defaults, live previews, and a roadmap of future real-time effects.', 'artistic-creation-environment' ); ?>
			</p>

			<form
				method="post"
				action="options.php"
				id="artistic-creation-environment-form"
				data-preview-urls="<?php echo esc_attr( wp_json_encode( $preview_urls ) ); ?>"
				data-message-type="artistic-creation-environment-preview"
			>
				<?php settings_fields( self::SETTINGS_KEY ); ?>

				<div class="artistic-creation-environment-grid">
					<div class="artistic-creation-environment-card">
						<h2><?php esc_html_e( 'Site Defaults', 'artistic-creation-environment' ); ?></h2>
						<table class="form-table" role="presentation">
							<tbody>
								<tr>
									<th scope="row">
										<label for="artistic-creation-environment-default-effect"><?php esc_html_e( 'Default creative effect', 'artistic-creation-environment' ); ?></label>
									</th>
									<td>
										<select
											id="artistic-creation-environment-default-effect"
											name="<?php echo esc_attr( self::OPTION_NAME ); ?>[default_effect]"
											data-preview-key="effect"
										>
											<option value="" <?php selected( $settings['default_effect'], '' ); ?>><?php esc_html_e( 'None', 'artistic-creation-environment' ); ?></option>
											<option value="liquid-splash" <?php selected( $settings['default_effect'], 'liquid-splash' ); ?>><?php esc_html_e( 'Liquid Splash', 'artistic-creation-environment' ); ?></option>
											<option value="ascii-world" <?php selected( $settings['default_effect'], 'ascii-world' ); ?>><?php esc_html_e( 'ASCII World', 'artistic-creation-environment' ); ?></option>
											<option value="aurora-flow" <?php selected( $settings['default_effect'], 'aurora-flow' ); ?>><?php esc_html_e( 'Aurora Flow', 'artistic-creation-environment' ); ?></option>
											<option value="particle-constellation" <?php selected( $settings['default_effect'], 'particle-constellation' ); ?>><?php esc_html_e( 'Particle Constellation', 'artistic-creation-environment' ); ?></option>
											<option value="neon-topography" <?php selected( $settings['default_effect'], 'neon-topography' ); ?>><?php esc_html_e( 'Neon Topography', 'artistic-creation-environment' ); ?></option>
											<option value="glass-caustics" <?php selected( $settings['default_effect'], 'glass-caustics' ); ?>><?php esc_html_e( 'Glass Caustics', 'artistic-creation-environment' ); ?></option>
											<option value="magnetic-dust" <?php selected( $settings['default_effect'], 'magnetic-dust' ); ?>><?php esc_html_e( 'Magnetic Dust', 'artistic-creation-environment' ); ?></option>
										</select>
										<p class="description"><?php esc_html_e( 'Used when a Creative block chooses “Site default”.', 'artistic-creation-environment' ); ?></p>
									</td>
								</tr>
								<?php $this->render_select_row( 'Quality', 'dye_resolution', (string) $settings['dye_resolution'], $this->get_quality_options(), 'dyeResolution', __( 'Matches the dye resolution control from the fluid simulation demo.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_select_row( 'Simulation resolution', 'sim_resolution', (string) $settings['sim_resolution'], $this->get_sim_resolution_options(), 'simResolution', __( 'Controls the core sim grid resolution and the overall feel of the fluid motion.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Density diffusion', 'density_dissipation', $settings['density_dissipation'], 0, 4, 0.01, 'densityDissipation', __( 'How quickly the visible dye diffuses and fades.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Velocity diffusion', 'velocity_dissipation', $settings['velocity_dissipation'], 0, 4, 0.01, 'velocityDissipation', __( 'How quickly velocity energy dissipates from the sim.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Pressure', 'pressure', $settings['pressure'], 0, 1, 0.01, 'pressure', __( 'How strongly the fluid resists compression.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Vorticity', 'curl', $settings['curl'], 0, 50, 1, 'curl', __( 'Adds swirling turbulence like the vorticity control on the demo.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Splat radius', 'splat_radius', $settings['splat_radius'], 0.01, 4, 0.01, 'splatRadius', __( 'Sets the radius of interaction splats for pointer movement.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Autoplay', 'autoplay', $settings['autoplay'], 'autoplay', __( 'Keep the fluid alive with automatic colour splashes before anyone touches the Creative block.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Autoplay intensity', 'autoplay_intensity', $settings['autoplay_intensity'], 0.2, 2, 0.1, 'autoplayIntensity', __( 'Controls how energetic the automatic splashes feel.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Autoplay easing', 'autoplay_easing', $settings['autoplay_easing'], 0.5, 5, 0.1, 'autoplayEasing', __( 'Higher values make automatic splashes take longer to grow and ease in more slowly before they bloom into motion.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Hover interaction', 'hover', $settings['hover'], 'hover', __( 'Let mouse movement disturb the fluid without requiring a click.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Touch interaction', 'touch', $settings['touch'], 'touch', __( 'Let touch and drag gestures push through the fluid on phones and tablets.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Tilt interaction', 'tilt', $settings['tilt'], 'tilt', __( 'Use device orientation when the current browser and hardware expose it. This typically works on mobile devices, while MacBooks usually do not expose tilt sensors to the page.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'WebCam motion input', 'webcam_motion', $settings['webcam_motion'], 'webcamMotion', __( 'Allow browser camera motion to disturb the fluid so moving or waving in front of the WebCam pushes the paint around after permission is granted.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'WebCam motion intensity', 'webcam_intensity', $settings['webcam_intensity'], 0.2, 2, 0.05, 'webcamIntensity', __( 'Controls how strongly detected camera movement injects motion into the fluid.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_select_row( 'Audio input', 'audio_input', $settings['audio_input'], array( 'off' => __( 'Off', 'artistic-creation-environment' ), 'microphone' => __( 'Microphone', 'artistic-creation-environment' ), 'system' => __( 'System audio', 'artistic-creation-environment' ) ), 'audioInput', __( 'React to live audio. System audio usually requires a browser display-capture prompt and only works where the browser exposes shared-tab or shared-system sound.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Audio intensity', 'audio_intensity', $settings['audio_intensity'], 0.2, 2, 0.05, 'audioIntensity', __( 'Controls how strongly peaks and low-end energy from the selected audio input push the fluid.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_color_row( 'Background colour', 'background_color', $settings['background_color'], 'backgroundColor', __( 'Sets the base background colour behind the fluid using a direct colour value instead of a named preset.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Colour boost', 'color_boost', $settings['color_boost'], 1, 3, 0.1, 'colorBoost', __( 'Push the paint colours harder for a brighter, more saturated look.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Aura mode', 'aura_mode', $settings['aura_mode'], 'auraMode', __( 'Let the fluid borrow colour cues from the text and images inside the Creative block so it glows like an aura around the content.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Shading', 'shading', $settings['shading'], 'shading', __( 'Enable the shaded fluid surface pass from the original simulation.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Colorful', 'colorful', $settings['colorful'], 'colorful', __( 'Continuously cycle fluid colours like the demo.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Bloom', 'bloom', $settings['bloom'], 'bloom', __( 'Enable the bloom pass for bright fluid highlights.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Bloom intensity', 'bloom_intensity', $settings['bloom_intensity'], 0.1, 2, 0.01, 'bloomIntensity', __( 'Controls the strength of the bloom pass.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Bloom threshold', 'bloom_threshold', $settings['bloom_threshold'], 0, 1, 0.01, 'bloomThreshold', __( 'Sets the threshold for bloom extraction.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_toggle_row( 'Sunrays', 'sunrays', $settings['sunrays'], 'sunrays', __( 'Enable the demo-style sunrays pass.', 'artistic-creation-environment' ) ); ?>
								<?php $this->render_range_row( 'Sunrays weight', 'sunrays_weight', $settings['sunrays_weight'], 0.3, 1, 0.01, 'sunraysWeight', __( 'Controls the strength of the sunrays effect.', 'artistic-creation-environment' ) ); ?>
							</tbody>
						</table>

						<?php submit_button( __( 'Save Defaults', 'artistic-creation-environment' ) ); ?>
					</div>

					<div class="artistic-creation-environment-card artistic-creation-environment-preview-card">
						<h2><?php esc_html_e( 'Live Preview', 'artistic-creation-environment' ); ?></h2>
						<div class="artistic-creation-environment-preview-frame">
							<iframe
								id="artistic-creation-environment-preview"
								title="<?php esc_attr_e( 'Artistic Creation Environment Preview', 'artistic-creation-environment' ); ?>"
								src="<?php echo esc_url( $preview_src ); ?>"
								allow="accelerometer; camera; gyroscope; microphone; display-capture"
							></iframe>
						</div>
						<p class="description">
							<?php esc_html_e( 'The preview reacts to the form instantly and follows the PavelDoGreat fluid simulation style locally inside the plugin.', 'artistic-creation-environment' ); ?>
						</p>
					</div>
				</div>

				<div class="artistic-creation-environment-card">
					<h2><?php esc_html_e( 'Artistic Creation Environment Background Catalog', 'artistic-creation-environment' ); ?></h2>
					<div class="artistic-creation-environment-catalog">
						<?php foreach ( $catalog as $effect_key => $effect ) : ?>
							<article class="artistic-creation-environment-catalog__item">
								<div class="artistic-creation-environment-catalog__status is-<?php echo esc_attr( $effect['status'] ); ?>">
									<?php echo esc_html( $effect['status_label'] ); ?>
								</div>
								<h3><?php echo esc_html( $effect['label'] ); ?></h3>
								<p><?php echo esc_html( $effect['summary'] ); ?></p>
								<p class="artistic-creation-environment-catalog__meta">
									<strong><?php esc_html_e( 'Inputs:', 'artistic-creation-environment' ); ?></strong>
									<?php echo esc_html( implode( ', ', $effect['inputs'] ) ); ?>
								</p>
								<p class="artistic-creation-environment-catalog__meta">
									<strong><?php esc_html_e( 'Performance:', 'artistic-creation-environment' ); ?></strong>
									<?php echo esc_html( $effect['performance'] ); ?>
								</p>
								<?php if ( in_array( $effect_key, array( 'liquid-splash', 'ascii-world' ), true ) ) : ?>
									<p class="description"><?php esc_html_e( 'This effect is already available inside Creative block controls.', 'artistic-creation-environment' ); ?></p>
								<?php endif; ?>
							</article>
						<?php endforeach; ?>
					</div>
				</div>
			</form>
		</div>

		<script>
			(function () {
				const form = document.getElementById('artistic-creation-environment-form');
				const frame = document.getElementById('artistic-creation-environment-preview');

				if (!form || !frame) {
					return;
				}

				const messageType = form.dataset.messageType || 'artistic-creation-environment-preview';
				const previewUrls = JSON.parse(form.dataset.previewUrls || '{}');
				const numericKeys = new Set(['dyeResolution', 'simResolution', 'densityDissipation', 'velocityDissipation', 'pressure', 'curl', 'splatRadius', 'autoplayIntensity', 'autoplayEasing', 'webcamIntensity', 'audioIntensity', 'colorBoost', 'bloomIntensity', 'bloomThreshold', 'sunraysWeight']);
				let pendingMessage = null;

				const getFields = () => Array.from(form.querySelectorAll('[data-preview-key]'));

				const collectConfig = () => {
					const config = {};

					getFields().forEach((field) => {
						const key = field.dataset.previewKey;

						if (!key) {
							return;
						}

						const rawValue = field.type === 'checkbox' ? field.checked : field.value;
						config[key] = numericKeys.has(key) ? Number(rawValue) : rawValue;
					});

					return config;
				};

				const updateRangeOutputs = () => {
					Array.from(form.querySelectorAll('[data-range-output]')).forEach((output) => {
						const input = document.getElementById(output.dataset.rangeOutput);
						if (input) {
							output.textContent = input.value;
						}
					});
				};

				const syncPreview = () => {
					const config = collectConfig();
					const effect = config.effect || 'liquid-splash';
					const baseUrl = previewUrls[effect] || previewUrls['liquid-splash'];

					if (!baseUrl) {
						return;
					}

					const nextSrc = new URL(baseUrl, window.location.href);
					nextSrc.searchParams.set('embedded', '1');

					if (frame.dataset.src !== nextSrc.toString()) {
						frame.dataset.src = nextSrc.toString();
						frame.src = nextSrc.toString();
					}

					pendingMessage = {
						type: messageType,
						config,
					};

					if (frame.contentWindow) {
						frame.contentWindow.postMessage(pendingMessage, '*');
					}
				};

				form.addEventListener('input', function () {
					updateRangeOutputs();
					syncPreview();
				});

				form.addEventListener('change', syncPreview);
				frame.addEventListener('load', function () {
					if (pendingMessage && frame.contentWindow) {
						frame.contentWindow.postMessage(pendingMessage, '*');
					}
				});

				updateRangeOutputs();
				syncPreview();
			}());
		</script>
		<?php
	}

	/**
	 * Convert current defaults into editor-facing defaults.
	 *
	 * @return array<string, mixed>
	 */
	private function get_editor_defaults() {
		$settings = $this->get_settings();

		return array(
			'aceCreativeBackgroundColor'               => $settings['background_color'],
			'aceCreativeBackgroundDyeResolution'       => $settings['dye_resolution'],
			'aceCreativeBackgroundSimResolution'       => $settings['sim_resolution'],
			'aceCreativeBackgroundDensityDissipation'  => $settings['density_dissipation'],
			'aceCreativeBackgroundVelocityDissipation' => $settings['velocity_dissipation'],
			'aceCreativeBackgroundPressure'            => $settings['pressure'],
			'aceCreativeBackgroundCurl'                => $settings['curl'],
			'aceCreativeBackgroundSplatRadius'         => $settings['splat_radius'],
			'aceCreativeBackgroundAutoplay'            => $settings['autoplay'],
			'aceCreativeBackgroundAutoplayIntensity'   => $settings['autoplay_intensity'],
			'aceCreativeBackgroundAutoplayEasing'     => $settings['autoplay_easing'],
			'aceCreativeBackgroundHover'               => $settings['hover'],
			'aceCreativeBackgroundTouch'               => $settings['touch'],
			'aceCreativeBackgroundTilt'                => $settings['tilt'],
			'aceCreativeBackgroundWebcamMotion'        => $settings['webcam_motion'],
			'aceCreativeBackgroundWebcamIntensity'     => $settings['webcam_intensity'],
			'aceCreativeBackgroundAudioInput'          => $settings['audio_input'],
			'aceCreativeBackgroundAudioIntensity'      => $settings['audio_intensity'],
			'aceCreativeBackgroundColorBoost'          => $settings['color_boost'],
			'aceCreativeBackgroundAuraMode'            => $settings['aura_mode'],
			'aceCreativeBackgroundBackdropStyle'       => $settings['backdrop_style'],
			'aceCreativeBackgroundShading'             => $settings['shading'],
			'aceCreativeBackgroundColorful'            => $settings['colorful'],
			'aceCreativeBackgroundBloom'               => $settings['bloom'],
			'aceCreativeBackgroundBloomIntensity'      => $settings['bloom_intensity'],
			'aceCreativeBackgroundBloomThreshold'      => $settings['bloom_threshold'],
			'aceCreativeBackgroundSunrays'             => $settings['sunrays'],
			'aceCreativeBackgroundSunraysWeight'       => $settings['sunrays_weight'],
		);
	}

	/**
	 * Preview URLs keyed by effect.
	 *
	 * @return array<string, string>
	 */
	private function get_editor_preview_urls() {
		return array(
			'liquid-splash'          => $this->get_effect_file_url( 'liquid-splash' ),
			'ascii-world'            => $this->get_effect_file_url( 'ascii-world' ),
			'aurora-flow'            => $this->get_effect_file_url( 'aurora-flow' ),
			'particle-constellation' => $this->get_effect_file_url( 'particle-constellation' ),
			'neon-topography'        => $this->get_effect_file_url( 'neon-topography' ),
			'glass-caustics'         => $this->get_effect_file_url( 'glass-caustics' ),
			'magnetic-dust'          => $this->get_effect_file_url( 'magnetic-dust' ),
		);
	}

	/**
	 * Effect metadata shown in the editor and admin.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_effect_catalog() {
		return array(
			'liquid-splash' => array(
				'label'        => __( 'Liquid Splash', 'artistic-creation-environment' ),
				'status'       => 'available',
				'status_label' => __( 'Live now', 'artistic-creation-environment' ),
				'summary'      => __( 'A local adaptation of the PavelDoGreat-style WebGL fluid simulation with autoplay, hover, tilt, WebCam motion input, microphone or system-audio reaction, saturated colour controls, and live-tunable post effects.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Hover', 'Touch', 'Pointer drag', 'Tilt', 'WebCam motion', 'Audio reactive' ),
				'performance'  => __( 'Runs fully on the GPU with adjustable dye and simulation resolutions, so you can keep it vivid without losing smooth playback on modern browsers.', 'artistic-creation-environment' ),
			),
			'ascii-world' => array(
				'label'        => __( 'ASCII World', 'artistic-creation-environment' ),
				'status'       => 'available',
				'status_label' => __( 'Live now', 'artistic-creation-environment' ),
				'summary'      => __( 'An interactive ASCII renderer with a built-in world-map source, image override support, animated drift, glow, contrast controls, and pointer-driven distortion.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Hover', 'Touch', 'Pointer movement', 'Image source override' ),
				'performance'  => __( 'Uses lightweight text rendering instead of WebGL, so it stays smooth on modern browsers while still feeling reactive and stylised.', 'artistic-creation-environment' ),
			),
			'aurora-flow' => array(
				'label'        => __( 'Aurora Flow', 'artistic-creation-environment' ),
				'status'       => 'available',
				'status_label' => __( 'Live now', 'artistic-creation-environment' ),
				'summary'      => __( 'Layered polar ribbons with colour-driven turbulence and soft atmospheric bloom.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Touch', 'Tilt', 'Scroll' ),
				'performance'  => __( 'Ideal for fragment-shader rendering with low CPU overhead.', 'artistic-creation-environment' ),
			),
			'glass-caustics' => array(
				'label'        => __( 'Glass Caustics', 'artistic-creation-environment' ),
				'status'       => 'available',
				'status_label' => __( 'Live now', 'artistic-creation-environment' ),
				'summary'      => __( 'Refracted light patterns that behave like sun through water or cut crystal.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Pointer', 'Tilt' ),
				'performance'  => __( 'Best as a medium-resolution buffer with upscale bloom.', 'artistic-creation-environment' ),
			),
			'neon-topography' => array(
				'label'        => __( 'Neon Topography', 'artistic-creation-environment' ),
				'status'       => 'available',
				'status_label' => __( 'Live now', 'artistic-creation-environment' ),
				'summary'      => __( 'Animated contour lines that ripple like a responsive digital landscape.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Pointer', 'Audio', 'Tilt' ),
				'performance'  => __( 'Line rendering is lightweight and works well on large hero sections.', 'artistic-creation-environment' ),
			),
			'particle-constellation' => array(
				'label'        => __( 'Particle Constellation', 'artistic-creation-environment' ),
				'status'       => 'available',
				'status_label' => __( 'Live now', 'artistic-creation-environment' ),
				'summary'      => __( 'Magnetic starfields with filament trails and proximity-driven flares.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Pointer', 'Touch', 'Webcam gestures' ),
				'performance'  => __( 'Can scale line counts dynamically for high-refresh displays.', 'artistic-creation-environment' ),
			),
			'ink-bloom' => array(
				'label'        => __( 'Ink Bloom', 'artistic-creation-environment' ),
				'status'       => 'concept',
				'status_label' => __( 'Concept', 'artistic-creation-environment' ),
				'summary'      => __( 'Soft volumetric ink plumes that spread, collide, and dissolve in slow motion.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Touch', 'Pointer', 'Scroll' ),
				'performance'  => __( 'Works well as a lower-frequency simulation with temporal smoothing.', 'artistic-creation-environment' ),
			),
			'holographic-mesh' => array(
				'label'        => __( 'Holographic Mesh', 'artistic-creation-environment' ),
				'status'       => 'concept',
				'status_label' => __( 'Concept', 'artistic-creation-environment' ),
				'summary'      => __( 'A refractive lattice of glassy polygons that pulse with depth and chromatic shimmer.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Pointer', 'Tilt' ),
				'performance'  => __( 'Geometry can be simplified progressively for mobile breakpoints.', 'artistic-creation-environment' ),
			),
			'magnetic-dust' => array(
				'label'        => __( 'Magnetic Dust', 'artistic-creation-environment' ),
				'status'       => 'available',
				'status_label' => __( 'Live now', 'artistic-creation-environment' ),
				'summary'      => __( 'Fine metallic particles gather into streams and reveal invisible force fields.', 'artistic-creation-environment' ),
				'inputs'       => array( 'Touch', 'Pointer', 'Webcam gestures' ),
				'performance'  => __( 'Requires adaptive batching but stays smooth on modern GPUs.', 'artistic-creation-environment' ),
			),
		);
	}

	/**
	 * Render a reusable range row for the settings UI.
	 *
	 * @param string $label       Field label.
	 * @param string $name        Option subkey.
	 * @param mixed  $value       Current value.
	 * @param float  $min         Minimum.
	 * @param float  $max         Maximum.
	 * @param float  $step        Step size.
	 * @param string $preview_key Preview config key.
	 * @param string $description Helper text.
	 * @return void
	 */
	private function render_range_row( $label, $name, $value, $min, $max, $step, $preview_key, $description ) {
		$field_id = 'artistic-creation-environment-' . $name;
		?>
		<tr>
			<th scope="row">
				<label for="<?php echo esc_attr( $field_id ); ?>"><?php echo esc_html( $label ); ?></label>
			</th>
			<td>
				<div class="artistic-creation-environment-range">
					<input
						id="<?php echo esc_attr( $field_id ); ?>"
						type="range"
						min="<?php echo esc_attr( $min ); ?>"
						max="<?php echo esc_attr( $max ); ?>"
						step="<?php echo esc_attr( $step ); ?>"
						name="<?php echo esc_attr( self::OPTION_NAME ); ?>[<?php echo esc_attr( $name ); ?>]"
						value="<?php echo esc_attr( $value ); ?>"
						data-preview-key="<?php echo esc_attr( $preview_key ); ?>"
					/>
					<output data-range-output="<?php echo esc_attr( $field_id ); ?>"><?php echo esc_html( $value ); ?></output>
				</div>
				<p class="description"><?php echo esc_html( $description ); ?></p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Render a select row.
	 *
	 * @param string              $label       Field label.
	 * @param string              $name        Option subkey.
	 * @param string              $value       Current value.
	 * @param array<string,string> $options    Select options.
	 * @param string              $preview_key Preview config key.
	 * @param string              $description Helper text.
	 * @return void
	 */
	private function render_select_row( $label, $name, $value, $options, $preview_key, $description ) {
		$field_id = 'artistic-creation-environment-' . $name;
		?>
		<tr>
			<th scope="row">
				<label for="<?php echo esc_attr( $field_id ); ?>"><?php echo esc_html( $label ); ?></label>
			</th>
			<td>
				<select
					id="<?php echo esc_attr( $field_id ); ?>"
					name="<?php echo esc_attr( self::OPTION_NAME ); ?>[<?php echo esc_attr( $name ); ?>]"
					data-preview-key="<?php echo esc_attr( $preview_key ); ?>"
				>
					<?php foreach ( $options as $option_value => $option_label ) : ?>
						<option value="<?php echo esc_attr( $option_value ); ?>" <?php selected( $value, $option_value ); ?>>
							<?php echo esc_html( $option_label ); ?>
						</option>
					<?php endforeach; ?>
				</select>
				<p class="description"><?php echo esc_html( $description ); ?></p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Render a checkbox row.
	 *
	 * @param string $label       Field label.
	 * @param string $name        Option subkey.
	 * @param bool   $value       Current value.
	 * @param string $preview_key Preview config key.
	 * @param string $description Helper text.
	 * @return void
	 */
	private function render_toggle_row( $label, $name, $value, $preview_key, $description ) {
		$field_id = 'artistic-creation-environment-' . $name;
		?>
		<tr>
			<th scope="row"><?php echo esc_html( $label ); ?></th>
			<td>
				<label for="<?php echo esc_attr( $field_id ); ?>">
					<input
						id="<?php echo esc_attr( $field_id ); ?>"
						type="checkbox"
						name="<?php echo esc_attr( self::OPTION_NAME ); ?>[<?php echo esc_attr( $name ); ?>]"
						value="1"
						<?php checked( $value ); ?>
						data-preview-key="<?php echo esc_attr( $preview_key ); ?>"
					/>
					<?php esc_html_e( 'Enabled', 'artistic-creation-environment' ); ?>
				</label>
				<p class="description"><?php echo esc_html( $description ); ?></p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Render a colour row.
	 *
	 * @param string $label       Field label.
	 * @param string $name        Option subkey.
	 * @param string $value       Current value.
	 * @param string $preview_key Preview config key.
	 * @param string $description Helper text.
	 * @return void
	 */
	private function render_color_row( $label, $name, $value, $preview_key, $description ) {
		$field_id = 'artistic-creation-environment-' . $name;
		?>
		<tr>
			<th scope="row">
				<label for="<?php echo esc_attr( $field_id ); ?>"><?php echo esc_html( $label ); ?></label>
			</th>
			<td>
				<input
					id="<?php echo esc_attr( $field_id ); ?>"
					type="color"
					name="<?php echo esc_attr( self::OPTION_NAME ); ?>[<?php echo esc_attr( $name ); ?>]"
					value="<?php echo esc_attr( $value ); ?>"
					data-preview-key="<?php echo esc_attr( $preview_key ); ?>"
				/>
				<p class="description"><?php echo esc_html( $description ); ?></p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Get a single sanitized setting value.
	 *
	 * @param string $key Setting key.
	 * @return mixed
	 */
	private function get_setting( $key ) {
		$settings = $this->get_settings();
		return isset( $settings[ $key ] ) ? $settings[ $key ] : null;
	}

	/**
	 * Get fully merged settings.
	 *
	 * @return array<string, mixed>
	 */
	private function get_settings() {
		$stored = get_option( self::OPTION_NAME, array() );
		$stored = is_array( $stored ) ? $stored : array();

		if ( empty( $stored ) ) {
			$legacy = get_option( self::LEGACY_OPTION_NAME, array() );
			$stored = is_array( $legacy ) ? $legacy : array();
		}

		$settings = wp_parse_args( $stored, self::default_settings() );

		if ( empty( $settings['background_color'] ) ) {
			$settings['background_color'] = $this->get_backdrop_style_color(
				isset( $stored['backdrop_style'] ) ? $stored['backdrop_style'] : $settings['backdrop_style']
			);
		}

		return $settings;
	}

	/**
	 * Get the public URL for an effect HTML file.
	 *
	 * @param string $effect Effect key.
	 * @return string
	 */
	private function get_effect_file_url( $effect ) {
		if ( 'ascii-world' === $effect ) {
			$build_path = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/ascii-world.html';
			if ( file_exists( $build_path ) ) {
				return ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/ascii-world.html';
			}

			$source_path = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'src/ascii-world.html';
			if ( file_exists( $source_path ) ) {
				return ARTISTIC_CREATION_ENVIRONMENT_URL . 'src/ascii-world.html';
			}

			return '';
		}

		$simple_effects = array(
			'liquid-splash'          => 'liquid-splash.html',
			'aurora-flow'            => 'aurora-flow.html',
			'particle-constellation' => 'particle-constellation.html',
			'neon-topography'        => 'neon-topography.html',
			'glass-caustics'         => 'glass-caustics.html',
			'magnetic-dust'          => 'magnetic-dust.html',
		);

		if ( ! isset( $simple_effects[ $effect ] ) ) {
			return '';
		}

		$filename    = $simple_effects[ $effect ];
		$build_path  = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'build/' . $filename;
		if ( file_exists( $build_path ) ) {
			return ARTISTIC_CREATION_ENVIRONMENT_URL . 'build/' . $filename;
		}

		$source_path = ARTISTIC_CREATION_ENVIRONMENT_PATH . 'src/' . $filename;
		if ( file_exists( $source_path ) ) {
			return ARTISTIC_CREATION_ENVIRONMENT_URL . 'src/' . $filename;
		}

		return '';
	}

	/**
	 * Enqueue the shared stylesheet when available.
	 *
	 * @return void
	 */
	private function enqueue_shared_style() {
		if ( wp_style_is( 'artistic-creation-environment', 'registered' ) ) {
			wp_enqueue_style( 'artistic-creation-environment' );
		}
	}

	/**
	 * Enqueue the frontend runtime and shared styles for inline backgrounds.
	 *
	 * @return void
	 */
	private function enqueue_frontend_assets() {
		$this->enqueue_shared_style();

		foreach ( array(
			'artistic-creation-environment-runtime',
			'artistic-creation-environment-ascii',
			'artistic-creation-environment-aurora',
			'artistic-creation-environment-constellation',
			'artistic-creation-environment-topo',
			'artistic-creation-environment-caustics',
			'artistic-creation-environment-dust',
			'artistic-creation-environment-btn-effects',
			'artistic-creation-environment-frontend',
			'artistic-creation-environment-scramble',
			'artistic-creation-environment-magic',
		) as $handle ) {
			if ( wp_script_is( $handle, 'registered' ) ) {
				wp_enqueue_script( $handle );
			}
		}
	}

	/**
	 * Sanitize a float field inside the settings array.
	 *
	 * @param array<string, mixed> $values  Source array.
	 * @param string               $key     Field key.
	 * @param float                $min     Minimum value.
	 * @param float                $max     Maximum value.
	 * @param float                $default Default value.
	 * @return float
	 */
	private function sanitize_float( $values, $key, $min, $max, $default ) {
		if ( ! isset( $values[ $key ] ) || '' === $values[ $key ] ) {
			return (float) $default;
		}

		$number = (float) $values[ $key ];
		$number = max( $min, min( $max, $number ) );

		return round( $number, 3 );
	}

	/**
	 * Sanitize a colour field inside the settings array.
	 *
	 * @param array<string, mixed> $values  Source array.
	 * @param string               $key     Field key.
	 * @param string               $default Default value.
	 * @return string
	 */
	private function sanitize_color( $values, $key, $default ) {
		if ( ! isset( $values[ $key ] ) ) {
			return $default;
		}

		$color = sanitize_hex_color( $values[ $key ] );

		return $color ? $color : $default;
	}

	/**
	 * Sanitize a select-style choice from the settings array.
	 *
	 * @param array<string, mixed> $values   Source array.
	 * @param string               $key      Field key.
	 * @param array<int|string>    $allowed  Allowed values.
	 * @param string               $default  Default value.
	 * @return string
	 */
	private function sanitize_choice( $values, $key, $allowed, $default ) {
		if ( ! isset( $values[ $key ] ) ) {
			return $default;
		}

		$value = sanitize_key( $values[ $key ] );

		return in_array( $value, $allowed, true ) ? $value : $default;
	}

	/**
	 * Sanitize a numeric select-style choice from the settings array.
	 *
	 * @param array<string, mixed> $values   Source array.
	 * @param string               $key      Field key.
	 * @param array<int|float>     $allowed  Allowed values.
	 * @param int|float            $default  Default value.
	 * @return int|float
	 */
	private function sanitize_choice_number( $values, $key, $allowed, $default ) {
		if ( ! isset( $values[ $key ] ) || '' === $values[ $key ] ) {
			return $default;
		}

		$value = 0 + $values[ $key ];

		return in_array( $value, $allowed, true ) ? $value : $default;
	}

	/**
	 * Sanitize a checkbox field.
	 *
	 * @param array<string, mixed> $values  Source array.
	 * @param string               $key     Field key.
	 * @param bool                 $default Default value.
	 * @return bool
	 */
	private function sanitize_bool( $values, $key, $default ) {
		if ( ! isset( $values[ $key ] ) ) {
			return false;
		}

		return filter_var( $values[ $key ], FILTER_VALIDATE_BOOLEAN );
	}

	/**
	 * Resolve a float from block attrs or fall back to a default.
	 *
	 * @param array<string, mixed> $attrs   Block attributes.
	 * @param string               $key     Attribute key.
	 * @param float                $default Default value.
	 * @return float
	 */
	private function coalesce_float( $attrs, $key, $default ) {
		if ( ! isset( $attrs[ $key ] ) || '' === $attrs[ $key ] ) {
			return (float) $default;
		}

		return (float) $attrs[ $key ];
	}

	/**
	 * Resolve a colour from block attrs or fall back to a default.
	 *
	 * @param array<string, mixed> $attrs   Block attributes.
	 * @param string               $key     Attribute key.
	 * @param string               $default Default value.
	 * @return string
	 */
	private function coalesce_color( $attrs, $key, $default ) {
		if ( ! isset( $attrs[ $key ] ) ) {
			return $default;
		}

		$color = sanitize_hex_color( $attrs[ $key ] );

		return $color ? $color : $default;
	}

	/**
	 * Resolve a string choice from block attrs or fall back to a default.
	 *
	 * @param array<string, mixed> $attrs    Block attributes.
	 * @param string               $key      Attribute key.
	 * @param array<int|string>    $allowed  Allowed values.
	 * @param string               $default  Default value.
	 * @return string
	 */
	private function coalesce_choice( $attrs, $key, $allowed, $default ) {
		if ( ! isset( $attrs[ $key ] ) ) {
			return $default;
		}

		$value = sanitize_key( $attrs[ $key ] );

		return in_array( $value, $allowed, true ) ? $value : $default;
	}

	/**
	 * Resolve a numeric choice from block attrs or fall back to a default.
	 *
	 * @param array<string, mixed> $attrs    Block attributes.
	 * @param string               $key      Attribute key.
	 * @param array<int|float>     $allowed  Allowed numeric values.
	 * @param int|float            $default  Default value.
	 * @return int|float
	 */
	private function coalesce_number_choice( $attrs, $key, $allowed, $default ) {
		if ( ! isset( $attrs[ $key ] ) || '' === $attrs[ $key ] ) {
			return $default;
		}

		$value = 0 + $attrs[ $key ];

		return in_array( $value, $allowed, true ) ? $value : $default;
	}

	/**
	 * Resolve a bool from block attrs or fall back to a default.
	 *
	 * @param array<string, mixed> $attrs   Block attributes.
	 * @param string               $key     Attribute key.
	 * @param bool                 $default Default value.
	 * @return bool
	 */
	private function coalesce_bool( $attrs, $key, $default ) {
		if ( ! isset( $attrs[ $key ] ) ) {
			return (bool) $default;
		}

		return filter_var( $attrs[ $key ], FILTER_VALIDATE_BOOLEAN );
	}

	/**
	 * Fluid simulation quality options mapped to dye resolution.
	 *
	 * @return array<string, string>
	 */
	private function get_quality_options() {
		return array(
			'1024' => __( 'High', 'artistic-creation-environment' ),
			'512'  => __( 'Medium', 'artistic-creation-environment' ),
			'256'  => __( 'Low', 'artistic-creation-environment' ),
			'128'  => __( 'Very low', 'artistic-creation-environment' ),
		);
	}

	/**
	 * Fluid simulation resolution options.
	 *
	 * @return array<string, string>
	 */
	private function get_sim_resolution_options() {
		return array(
			'32'  => '32',
			'64'  => '64',
			'128' => '128',
			'256' => '256',
		);
	}

	/**
	 * Legacy backdrop presets kept for backwards compatibility.
	 *
	 * @return array<string, string>
	 */
	private function get_backdrop_style_options() {
		return array(
			'aurora' => __( 'Aurora', 'artistic-creation-environment' ),
			'lagoon' => __( 'Lagoon', 'artistic-creation-environment' ),
			'candy'  => __( 'Candy', 'artistic-creation-environment' ),
			'sunset' => __( 'Sunset', 'artistic-creation-environment' ),
			'frost'  => __( 'Frost', 'artistic-creation-environment' ),
		);
	}

	/**
	 * Map legacy backdrop styles to concrete colours.
	 *
	 * @param string $style Backdrop style key.
	 * @return string
	 */
	private function get_backdrop_style_color( $style ) {
		$colors = array(
			'aurora' => '#1c1226',
			'lagoon' => '#0c2a28',
			'candy'  => '#38182c',
			'sunset' => '#46221c',
			'frost'  => '#222638',
		);

		return isset( $colors[ $style ] ) ? $colors[ $style ] : self::default_settings()['background_color'];
	}
}
