/**
 * © 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */

/**
 * auth.js
 * ---------------------------------------------------------------------
 * Connexion à l'armoire via Supabase Auth : le mot de passe est vérifié
 * côté serveur (jamais dans ce fichier, jamais dans le navigateur), et les
 * droits de chacun sont appliqués par les règles RLS de la base de données
 * (supabase/schema.sql) — pas seulement par ce que cette page choisit
 * d'afficher ou de cacher.
 *
 * Le tout premier compte créé devient automatiquement administrateur (voir
 * la fonction "gerer_nouvel_utilisateur" dans le schéma SQL). Les comptes
 * suivants se créent depuis le tableau de bord Supabase, pas depuis cette
 * page (voir README, section "Ajouter un utilisateur").
 * ---------------------------------------------------------------------
 */

const Auth = (() => {
  let els = {};

  function capterElements() {
    els.ecran = document.getElementById("ecran-connexion");
    els.application = document.getElementById("application");
    els.blocInitialisation = document.getElementById("bloc-initialisation");
    els.blocConnexion = document.getElementById("bloc-connexion");

    els.formInit = document.getElementById("form-initialisation");
    els.erreurInit = document.getElementById("erreur-initialisation");
    els.infoInit = document.getElementById("info-initialisation");

    els.formConnexion = document.getElementById("form-connexion");
    els.erreurConnexion = document.getElementById("erreur-connexion");

    els.boutonDeconnexion = document.getElementById("bouton-deconnexion");
  }

  async function chargerProfil(idUtilisateur) {
    const { data, error } = await sb.from("profils").select("*").eq("id", idUtilisateur).maybeSingle();
    if (error) throw error;
    return data; // null si le compte existe côté auth mais n'a pas (encore) de profil
  }

  function debloquer(profil) {
    els.ecran.hidden = true;
    els.application.hidden = false;
    els.boutonDeconnexion.hidden = false;
    els.boutonDeconnexion.textContent = `Se déconnecter (${profil.nom})`;
    App.initialiser({ id: profil.id, nom: profil.nom, role: profil.role });
  }

  async function seDeconnecter() {
    await sb.auth.signOut();
    window.location.reload();
  }

  function definirBoutonChargement(bouton, enCours, texteNormal) {
    bouton.disabled = enCours;
    bouton.textContent = enCours ? "…" : texteNormal;
  }

  async function demarrer() {
    capterElements();
    els.boutonDeconnexion.addEventListener("click", seDeconnecter);

    // Une session Supabase existe déjà (retour sur le site, onglet toujours ouvert) ?
    const {
      data: { session },
    } = await sb.auth.getSession();

    if (session) {
      const profil = await chargerProfil(session.user.id);
      if (profil) {
        debloquer(profil);
        return;
      }
      // Compte authentifié mais sans profil associé (voir schema.sql) : aucun
      // droit dans l'application, on déconnecte proprement plutôt que de
      // laisser un écran bloqué.
      await sb.auth.signOut();
    }

    els.ecran.hidden = false;
    els.application.hidden = true;

    const { data: compteExiste, error: erreurRpc } = await sb.rpc("existe_un_compte");
    if (erreurRpc) {
      els.erreurConnexion.textContent =
        "Impossible de contacter Supabase. Vérifiez js/supabase-config.js et votre connexion.";
      els.erreurConnexion.hidden = false;
      els.blocConnexion.hidden = false;
      els.blocInitialisation.hidden = true;
      return;
    }

    if (!compteExiste) {
      els.blocInitialisation.hidden = false;
      els.blocConnexion.hidden = true;
      els.formInit.elements["nom"].focus();
    } else {
      els.blocInitialisation.hidden = true;
      els.blocConnexion.hidden = false;
      els.formConnexion.elements["email"].focus();
    }

    els.formInit.addEventListener("submit", async (evt) => {
      evt.preventDefault();
      els.erreurInit.hidden = true;
      els.infoInit.hidden = true;

      const nom = els.formInit.elements["nom"].value.trim();
      const email = els.formInit.elements["email"].value.trim();
      const motDePasse = els.formInit.elements["motdepasse"].value;
      const confirmation = els.formInit.elements["confirmation"].value;

      if (motDePasse.length < 6) {
        els.erreurInit.textContent = "Le mot de passe doit faire au moins 6 caractères.";
        els.erreurInit.hidden = false;
        return;
      }
      if (motDePasse !== confirmation) {
        els.erreurInit.textContent = "Les deux mots de passe ne correspondent pas.";
        els.erreurInit.hidden = false;
        return;
      }

      const boutonValider = els.formInit.querySelector('button[type="submit"]');
      definirBoutonChargement(boutonValider, true, "Créer le compte administrateur");

      try {
        const { data, error } = await sb.auth.signUp({
          email,
          password: motDePasse,
          options: { data: { nom } },
        });

        if (error) {
          els.erreurInit.textContent = error.message;
          els.erreurInit.hidden = false;
          return;
        }

        if (data.session) {
          const profil = await chargerProfil(data.user.id);
          if (profil) {
            debloquer(profil);
            return;
          }
        }

        // La confirmation par email est activée côté Supabase : pas de session
        // immédiate, il faut d'abord cliquer le lien reçu par email.
        els.infoInit.textContent =
          "Compte créé. Vérifiez votre boîte mail pour confirmer l'adresse, puis reconnectez-vous ci-dessous.";
        els.infoInit.hidden = false;
        els.formInit.reset();
      } catch (erreur) {
        els.erreurInit.textContent =
          "Impossible de contacter Supabase (" + (erreur?.message || "erreur réseau") + "). Vérifiez js/supabase-config.js et votre connexion.";
        els.erreurInit.hidden = false;
      } finally {
        definirBoutonChargement(boutonValider, false, "Créer le compte administrateur");
      }
    });

    els.formConnexion.addEventListener("submit", async (evt) => {
      evt.preventDefault();
      els.erreurConnexion.hidden = true;

      const email = els.formConnexion.elements["email"].value.trim();
      const motDePasse = els.formConnexion.elements["motdepasse"].value;

      const boutonValider = els.formConnexion.querySelector('button[type="submit"]');
      definirBoutonChargement(boutonValider, true, "Déverrouiller");

      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: motDePasse });

        if (error) {
          els.erreurConnexion.textContent = error.message;
          els.erreurConnexion.hidden = false;
          return;
        }

        const profil = await chargerProfil(data.user.id);

        if (!profil) {
          els.erreurConnexion.textContent =
            "Ce compte n'a pas encore d'accès configuré dans l'armoire. Contactez l'administrateur.";
          els.erreurConnexion.hidden = false;
          await sb.auth.signOut();
          return;
        }

        debloquer(profil);
      } catch (erreur) {
        els.erreurConnexion.textContent =
          "Impossible de contacter Supabase (" + (erreur?.message || "erreur réseau") + "). Vérifiez js/supabase-config.js et votre connexion.";
        els.erreurConnexion.hidden = false;
      } finally {
        definirBoutonChargement(boutonValider, false, "Déverrouiller");
      }
    });
  }

  return { initialiser: demarrer };
})();

document.addEventListener("DOMContentLoaded", Auth.initialiser);
