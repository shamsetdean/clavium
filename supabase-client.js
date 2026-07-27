/**
 * © 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */

/**
 * supabase-client.js
 * Instance unique du client Supabase, utilisée par auth.js et data.js.
 * "sb" pour éviter toute confusion avec l'objet global "supabase" (la
 * librairie elle-même, chargée par js/vendor/supabase.js).
 */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
