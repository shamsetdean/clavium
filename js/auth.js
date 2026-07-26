/**
 * © 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */

/**
 * auth.js
 * ---------------------------------------------------------------------
 * Comptes et connexion à l'armoire.
 *
 * Les comptes vivent DANS les données de l'armoire (champ "utilisateurs"
 * du JSON), pas dans le code : c'est l'administrateur qui crée son mot
 * de passe à la première utilisation, jamais Claude ni personne d'autre.
 * Seule l'empreinte SHA-256 est stockée — jamais le mot de passe en clair,
 * ni ici, ni dans un fichier livré, ni dans le README.
 *
 * IMPORTANT — ce que cette connexion EST et n'EST PAS : l'application est
 * statique, son code est visible par quiconque ouvre la page. Ce mécanisme
 * évite un accès accidentel et distingue les rôles dans l'interface, mais
 * ce n'est pas une sécurité forte face à quelqu'un de déterminé qui lirait
 * le code. Pour une vraie confidentialité, il faudrait un serveur.
 *
 * Rôles :
 *   - "admin"       : accès complet (ajouter/modifier/retirer un trousseau,
 *                      importer/ouvrir un fichier, gérer les utilisateurs)
 *   - "utilisateur" : consulter, emprunter, restituer — rien d'autre
 * ---------------------------------------------------------------------
 */

const Auth = (() => {
  const CLE_SESSION = "boiteacles.session";

  async function hacherSHA256(texte) {
    const octets = new TextEncoder().encode(texte);
    const empreinte = await crypto.subtle.digest("SHA-256", octets);
    return Array.from(new Uint8Array(empreinte))
      .map((o) => o.toString(16).padStart(2, "0"))
      .join("");
  }

  function normaliserNom(nom) {
    return (nom || "").trim().toLowerCase();
  }

  function sessionCourante() {
    try {
      return JSON.parse(sessionStorage.getItem(CLE_SESSION));
    } catch {
      return null;
    }
  }

  function seDeconnecter() {
    sessionStorage.removeItem(CLE_SESSION);
    window.location.reload();
  }

  function initialiser() {
    const ecran = document.getElementById("ecran-connexion");
    const application = document.getElementById("application");
    const blocInitialisation = document.getElementById("bloc-initialisation");
    const blocConnexion = document.getElementById("bloc-connexion");

    const formInit = document.getElementById("form-initialisation");
    const erreurInit = document.getElementById("erreur-initialisation");

    const formConnexion = document.getElementById("form-connexion");
    const erreurConnexion = document.getElementById("erreur-connexion");

    const boutonDeconnexion = document.getElementById("bouton-deconnexion");
    boutonDeconnexion.addEventListener("click", seDeconnecter);

    async function demarrer() {
      const donnees = await Depot.chargerAuDemarrage();

      const session = sessionCourante();
      if (session) {
        const utilisateur = donnees.utilisateurs.find((u) => normaliserNom(u.nom) === session.nom);
        if (utilisateur) {
          debloquer(donnees, { nom: utilisateur.nom, role: utilisateur.role });
          return;
        }
        // La session pointe vers un compte qui n'existe plus (supprimé) : on déconnecte.
        sessionStorage.removeItem(CLE_SESSION);
      }

      ecran.hidden = false;
      application.hidden = true;

      if (donnees.utilisateurs.length === 0) {
        blocInitialisation.hidden = false;
        blocConnexion.hidden = true;
        formInit.elements["nom"].focus();
      } else {
        blocInitialisation.hidden = true;
        blocConnexion.hidden = false;
        formConnexion.elements["nom"].focus();
      }

      formInit.addEventListener("submit", async (evt) => {
        evt.preventDefault();
        erreurInit.hidden = true;
        const nom = formInit.elements["nom"].value.trim();
        const motDePasse = formInit.elements["motdepasse"].value;
        const confirmation = formInit.elements["confirmation"].value;

        if (motDePasse.length < 6) {
          erreurInit.textContent = "Le mot de passe doit faire au moins 6 caractères.";
          erreurInit.hidden = false;
          return;
        }
        if (motDePasse !== confirmation) {
          erreurInit.textContent = "Les deux mots de passe ne correspondent pas.";
          erreurInit.hidden = false;
          return;
        }

        const empreinte = await hacherSHA256(motDePasse);
        donnees.utilisateurs.push({
          id: "u-" + Math.random().toString(36).slice(2, 9),
          nom,
          role: "admin",
          empreinte,
        });
        Depot.sauvegarderLocal(donnees);

        sessionStorage.setItem(CLE_SESSION, JSON.stringify({ nom: normaliserNom(nom) }));
        debloquer(donnees, { nom, role: "admin" });
      });

      formConnexion.addEventListener("submit", async (evt) => {
        evt.preventDefault();
        erreurConnexion.hidden = true;
        const nom = formConnexion.elements["nom"].value.trim();
        const motDePasse = formConnexion.elements["motdepasse"].value;

        const empreinte = await hacherSHA256(motDePasse);
        const utilisateur = donnees.utilisateurs.find(
          (u) => normaliserNom(u.nom) === normaliserNom(nom) && u.empreinte === empreinte
        );

        if (utilisateur) {
          sessionStorage.setItem(CLE_SESSION, JSON.stringify({ nom: normaliserNom(utilisateur.nom) }));
          debloquer(donnees, { nom: utilisateur.nom, role: utilisateur.role });
        } else {
          erreurConnexion.hidden = false;
          formConnexion.elements["motdepasse"].value = "";
          formConnexion.elements["motdepasse"].focus();
        }
      });
    }

    function debloquer(donnees, utilisateur) {
      ecran.hidden = true;
      application.hidden = false;
      boutonDeconnexion.hidden = false;
      boutonDeconnexion.textContent = `Se déconnecter (${utilisateur.nom})`;
      App.initialiser(donnees, utilisateur);
    }

    demarrer();
  }

  return { initialiser };
})();

document.addEventListener("DOMContentLoaded", Auth.initialiser);
