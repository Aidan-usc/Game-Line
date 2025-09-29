<?php
/* Template Name: Leaderboard */
get_header();
?>
<main class="gl-main">
  <h2 class="section-title">Leaderboard</h2>

  <div class="lb-layout">
    <!-- MAIN TABLE -->
    <section class="lb-table card">
      <!-- header row -->
      <div class="lb-row lb-head">
        <div class="lb-col-name">User Name</div>
        <div class="lb-split"></div>
        <div class="lb-col-amt">+$___</div>
      </div>

      <!-- placeholder rows (replace with real data later) -->
      <?php for ($i=0;$i<6;$i++): ?>
        <div class="lb-row">
          <div class="lb-col-name">User Name</div>
          <div class="lb-split"></div>
          <div class="lb-col-amt">+$___</div>
        </div>
      <?php endfor; ?>
    </section>

    <!-- SIDE LISTS -->
    <aside class="lb-aside">
      <h3 class="lb-subtitle">Top Earners</h3>
      <div class="lb-list card">
        <div class="lb-item">User Name</div>
        <div class="lb-item">User Name</div>
        <div class="lb-item">User Name</div>
      </div>

      <h3 class="lb-subtitle" style="margin-top:24px;">Biggest Losers</h3>
      <div class="lb-list card">
        <div class="lb-item">User Name</div>
        <div class="lb-item">User Name</div>
        <div class="lb-item">User Name</div>
      </div>
    </aside>
  </div>
</main>

<?php get_footer(); ?>
