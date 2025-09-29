<?php
// header.php
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>

<header class="gl-header">
  <!-- Left: Logo + Title -->
  <a class="brand" href="<?php echo esc_url(home_url('/')); ?>" aria-label="GameLine home">
    <img src="<?php echo esc_url(GL_LOGO); ?>" alt="GameLine logo" class="brand-logo">
    <span class="site-title">GameLine</span>
  </a>

  <!-- Center: Primary nav -->
  <nav class="top-nav" aria-label="Primary">
    <ul>
      <li><a href="<?php echo esc_url(home_url('/cfb/')); ?>">SEC</a></li>
      <li><a href="<?php echo esc_url(home_url('/mlb/')); ?>">MLB</a></li>
      <li><a href="<?php echo esc_url(home_url('/nfl/')); ?>">NFL</a></li>
      <li><a href="<?php echo esc_url(home_url('/leaderboard/')); ?>">Leaderboard</a></li>
    </ul>
  </nav>

  <!-- Right: Wallet + Account -->
  <div class="header-ctas">
    <span class="gl-chip">USD: <span id="gl-wallet">$0.00</span></span>
    <?php if ( is_user_logged_in() ) : ?>
      <a class="account-btn" href="<?php echo esc_url(wp_logout_url(home_url('/'))); ?>">Log out</a>
    <?php else : ?>
      <a class="account-btn" href="<?php echo esc_url(home_url('/login/')); ?>">Account</a>
    <?php endif; ?>
  </div>
</header>
