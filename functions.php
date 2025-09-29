<?php
// Load helpers & constants
require_once __DIR__ . '/inc/constants.php';
require_once __DIR__ . '/inc/helpers.php';

add_action('after_setup_theme', function () {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  register_nav_menus(['primary' => 'Primary Navigation']);
});

add_action('wp_enqueue_scripts', function () {
  $theme_dir  = get_template_directory();
  $theme_uri  = get_template_directory_uri();

  // 1) Load constants + Google Fonts (style.css) on every page
  wp_enqueue_style(
    'gameline-style',
    get_stylesheet_uri(),
    [],
    filemtime( $theme_dir . '/style.css' ) // cache-bust in Local
  );

  // 2) Load component/layout CSS AFTER style.css so it can use the vars
  wp_enqueue_style(
    'gameline-main',
    $theme_uri . '/assets/css/main.css',
    ['gameline-style'],
    filemtime( $theme_dir . '/assets/css/main.css' )
  );

  // 3) App JS
  wp_enqueue_script(
    'gameline-app',
    $theme_uri . '/assets/js/app.js',
    ['wp-api-fetch'],
    filemtime( $theme_dir . '/assets/js/app.js' ),
    true
  );

  // 4) Data for JS
  wp_localize_script('gameline-app', 'GL', [
    'rest'     => esc_url_raw( rest_url('gl/v1/') ),
    'nonce'    => wp_create_nonce('wp_rest'),
    'maxStake' => GL_MAX_STAKE,
    'maxLegs'  => GL_MAX_PARLAY_LEGS,
    'imgBase'  => $theme_uri . '/assets/img/team-logos',
  ]);
});


add_filter('pre_option_timezone_string', function($v){
  // Display in EST by default unless you change WP Settings → General
  return $v ?: 'America/New_York';
});
