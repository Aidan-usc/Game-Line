<?php
/* Template Name: NFL */
get_header(); ?>
<?php /* Template Name: MLB */ get_header(); ?>

<main class="gl-main">
  <h2 class="section-title">NFL</h2>
  <div id="gl-games" data-league="NFL"></div>
</main>

<aside class="gl-rail">
  <div class="rail-titlebar">Build a Parlay</div>

  <div class="rail-frame">
    <div class="rail-scroll" id="gl-legs">
      <!-- JS injects legs here. Optional empty state: -->
      <!-- <div class="card">No selections yet.</div> -->
    </div>

    <div class="rail-footer">
      <div class="rail-row">
        <span>Total Odds</span>
        <strong class="total-odds">0</strong>
      </div>

      <label>Wager <small>(USD)</small></label>
      <input class="input" type="number" step="1" min="1" max="<?php echo esc_attr(GL_MAX_STAKE); ?>" name="stake" value="10">

      <div class="rail-row">
        <span>Projected Payout</span>
        <strong class="proj">$10.00</strong>
      </div>

      <button class="rail-submit submit">Submit Parlay</button>
    </div>
  </div>
</aside>

<?php get_footer(); ?>

<?php get_footer();
