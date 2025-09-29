<?php /* Template Name: Sign Up */ get_header();
if (is_user_logged_in()) wp_redirect(home_url('/')); ?>
<div class="container card" style="max-width:520px">
  <h2>Sign Up</h2>
  <?php echo do_shortcode('[gameline_signup]'); // plugin will provide ?>
</div>
<?php get_footer(); ?>
