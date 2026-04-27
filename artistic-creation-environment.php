<?php
/**
 * Plugin Name: Artistic Creation Environment
 * Plugin URI: https://acemedia.ninja/
 * Description: Artistic Creation Environment adds a Creative container block with immersive interactive backgrounds, starting with a liquid splash effect tuned for smooth modern-browser performance.
 * Version: 0.1.0
 * Author: Ace Media
 * Text Domain: artistic-creation-environment
 * Requires at least: 6.9
 * Tested up to: 6.9
 * Requires PHP: 7.4
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ARTISTIC_CREATION_ENVIRONMENT_VERSION', '0.1.0' );
define( 'ARTISTIC_CREATION_ENVIRONMENT_FILE', __FILE__ );
define( 'ARTISTIC_CREATION_ENVIRONMENT_PATH', plugin_dir_path( __FILE__ ) );
define( 'ARTISTIC_CREATION_ENVIRONMENT_URL', plugin_dir_url( __FILE__ ) );
define( 'ARTISTIC_CREATION_ENVIRONMENT_BASENAME', plugin_basename( __FILE__ ) );

require_once ARTISTIC_CREATION_ENVIRONMENT_PATH . 'includes/class-artistic-creation-environment.php';

Artistic_Creation_Environment::get_instance();

register_activation_hook( __FILE__, array( 'Artistic_Creation_Environment', 'activate' ) );
