/**
 * Heroes whose Aghanim's Scepter CHANGES the ultimate's cooldown.
 *
 * key = hero key (Steam/DB key). value = ult cooldown array WITH Aghanim's
 * Scepter, per ult level [lvl1, lvl2, lvl3] (use the same length as the hero's
 * ult levels). The Aghs pill in the enemy dropdown only appears for heroes
 * listed here; toggling it recomputes the ult timer with these values.
 *
 * ⚠ The cooldown numbers below are a STARTER LIST and must be verified against
 *    the current patch. Editing one hero is just changing its array here.
 *    Heroes whose Aghs does NOT change ult cooldown must NOT be added.
 */
export const AGHS_ULT_CD = {
  // hero_key:      [lvl1, lvl2, lvl3]   // base ult CD → Aghs ult CD  (VERIFY)
  lion:            [50, 40, 30],          // Finger of Death — Aghs lowers CD
  enigma:          [200, 180, 160],       // Black Hole
  warlock:         [140, 130, 120],       // Chaotic Offering
};

export function aghsChangesUlt(heroKey) {
  return !!(heroKey && AGHS_ULT_CD[heroKey]);
}

/** Ult cooldown with Aghs for the given level (1-based); null if not applicable. */
export function aghsUltCooldown(heroKey, level) {
  const arr = AGHS_ULT_CD[heroKey];
  if (!arr || !arr.length) return null;
  const i = Math.min(Math.max(1, level || 1), arr.length) - 1;
  return arr[i];
}
