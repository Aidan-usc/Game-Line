<?php /* Template Name: Login */ get_header(); ?>
<div class="container card" style="max-width:520px">
  <h2>Log In</h2>
  <?php wp_login_form(['redirect' => home_url('/')]); ?>
  <p>Need an account? <a href="<?php echo esc_url(home_url('/signup/')); ?>">Sign up</a></p>
</div>
<?php get_footer(); ?>
