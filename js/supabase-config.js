/**
 * © 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */
/**
 * supabase-config.js
 * ---------------------------------------------------------------------
 * À renseigner avec les valeurs de VOTRE projet Supabase
 * (Dashboard → Settings → API → Project URL / anon public key).
 *
 * La "anon key" est publique par conception — ce n'est pas un secret à
 * cacher. La sécurité réelle ne vient pas de sa confidentialité, mais des
 * règles RLS (Row Level Security) définies dans supabase/schema.sql : sans
 * un compte valide et un profil enregistré, cette clé seule ne permet ni de
 * lire ni de modifier quoi que ce soit.
 *
 * Ne JAMAIS mettre ici la "service_role key" (celle-là est un vrai secret,
 * elle contourne toutes les règles de sécurité — elle ne doit exister que
 * côté serveur, jamais dans un fichier livré au navigateur).
 * ---------------------------------------------------------------------
 */
const SUPABASE_URL = "https://wjcnodrcyocdxdzpgkbt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqY25vZHJjeW9jZHhkenBna2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMjA2NDYsImV4cCI6MjEwMTY5NjY0Nn0.H5NmbYpxWdaUz--Ra-b5o42_M3HgFkn0pV424ect1iw";
