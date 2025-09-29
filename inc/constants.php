<?php
define('GL_VERSION', '0.1.0');

define('GL_START_BALANCE', 100.00);
define('GL_MAX_STAKE', 50.00);
define('GL_MAX_PARLAY_LEGS', 10);
define('GL_ALLOW_MIXED_LEAGUES', true);
define('GL_PUSHES_POSSIBLE', false); // lines are N.5

const GL_LEAGUES = ['CFB','NFL','MLB'];

define('GL_IMG', get_template_directory_uri() . '/assets/img');
define('GL_LOGO', GL_IMG . '/brand-logo.png');
define('GL_HERO', GL_IMG . '/brand-hero.png');
define('GL_TEAM_LOGO_BASE', GL_IMG . '/team-logos'); // filenames already in place
