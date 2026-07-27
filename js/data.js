/**
 * © 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */

/**
 * data.js
 * ---------------------------------------------------------------------
 * Seule couche autorisée à parler à Supabase pour les données de
 * l'armoire (les comptes/authentification vivent dans auth.js). Toute la
 * sécurité réelle (qui peut lire/écrire quoi) est appliquée côté serveur
 * par les règles RLS et fonctions définies dans supabase/schema.sql — ce
 * fichier ne fait qu'appeler l'API, il ne décide de rien lui-même.
 * ---------------------------------------------------------------------
 */

const Donnees = (() => {
  /** Convertit une ligne de la table "trousseaux" vers la forme utilisée par l'interface. */
  function depuisLigne(ligne) {
    return {
      id: ligne.id,
      nom: ligne.nom,
      type: ligne.type,
      crochet: ligne.crochet,
      clefs: ligne.clefs || [],
      statut: ligne.statut,
      detenteur: ligne.detenteur,
      dateEmprunt: ligne.date_emprunt,
      dateRetourPrevue: ligne.date_retour_prevue,
      notes: ligne.notes || "",
      historique: ligne.historique || [],
    };
  }

  async function chargerTrousseaux() {
    const { data, error } = await sb.from("trousseaux").select("*").order("crochet", { ascending: true });
    if (error) throw error;
    return data.map(depuisLigne);
  }

  async function creerTrousseau({ nom, type, crochet, clefs, notes, historique }) {
    const { data, error } = await sb
      .from("trousseaux")
      .insert({ nom, type, crochet, clefs, notes, historique })
      .select()
      .single();
    if (error) throw error;
    return depuisLigne(data);
  }

  async function modifierTrousseau(id, { nom, type, crochet, clefs, notes, historique }) {
    const { data, error } = await sb
      .from("trousseaux")
      .update({ nom, type, crochet, clefs, notes, historique })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return depuisLigne(data);
  }

  async function supprimerTrousseau(id) {
    const { error } = await sb.from("trousseaux").delete().eq("id", id);
    if (error) throw error;
  }

  /** Emprunt/restitution passent par des fonctions serveur (RPC) : accessibles
   * à tout compte avec profil, quel que soit son rôle, mais limitées aux
   * seuls champs liés à l'emprunt (voir supabase/schema.sql). */
  async function emprunterTrousseau(id, detenteur) {
    const { error } = await sb.rpc("emprunter_trousseau", { p_id: id, p_detenteur: detenteur });
    if (error) throw error;
  }

  async function restituerTrousseau(id) {
    const { error } = await sb.rpc("restituer_trousseau", { p_id: id });
    if (error) throw error;
  }

  async function chargerUtilisateurs() {
    const { data, error } = await sb.from("profils").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  }

  async function supprimerUtilisateur(id) {
    const { error } = await sb.from("profils").delete().eq("id", id);
    if (error) throw error;
  }

  /** Sauvegarde manuelle : télécharge un instantané JSON de l'armoire, à la demande. */
  function exporterVersFichier(trousseaux, nomFichier = "boite-a-cles-sauvegarde.json") {
    const blob = new Blob([JSON.stringify({ version: 3, trousseaux }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = nomFichier;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
  }

  return {
    chargerTrousseaux,
    creerTrousseau,
    modifierTrousseau,
    supprimerTrousseau,
    emprunterTrousseau,
    restituerTrousseau,
    chargerUtilisateurs,
    supprimerUtilisateur,
    exporterVersFichier,
  };
})();
