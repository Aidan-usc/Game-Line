<?php get_header(); ?>
<div class="container">
  <div class="card" style="display:flex;gap:20px;align-items:center">
    <img src="<?php echo esc_url(GL_HERO); ?>" alt="" style="max-width:320px;border-radius:12px">
    <div>
      <h1>Welcome to GameLine</h1>
      <p>Risk-free, rivalry-ready sportsbook for MLB, NFL, and SEC Football.</p>
      <a class="btn btn-accent" href="<?php echo esc_url(home_url('/signup/')); ?>">Sign Up</a>
    </div>
  </div>
</div>
<?php get_footer(); ?>
