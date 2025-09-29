<?php
function gl_e($s){ echo esc_html($s); }
function gl_money($n){ return '$' . number_format((float)$n, 2); }

function gl_american_to_decimal(int $odds){
  return $odds > 0 ? 1 + ($odds/100) : 1 + (100/abs($odds));
}
function gl_decimal_to_american(float $dec){
  if ($dec <= 1) return 0;
  return ($dec >= 2) ? (int)round(($dec-1)*100) : (int)round(-100/($dec-1));
}
function gl_team_logo_url($league, $team_slug){
  $league = strtolower($league);
  $slug   = strtolower($team_slug);
  return GL_TEAM_LOGO_BASE . "/{$league}/{$slug}.png";
}
