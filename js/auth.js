/**
 * © 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */

/**
 * auth.js
 * ---------------------------------------------------------------------
 * Verrou d'accès à la boîte à clés.
 *
 * IMPORTANT — ce que ce verrou EST et n'EST PAS :
 * L'application est 100 % statique et son code source est visible par
 * quiconque ouvre la page (comme tout site GitHub Pages). Ce mécanisme
 * empêche un accès accidentel ou une consultation rapide "à l'écran",
 * mais ce n'est PAS une sécurité forte : le hash et la logique sont
 * lisibles dans ce fichier. Pour une vraie confidentialité (empêcher un
 * accès volontaire), il faudrait une authentification côté serveur.
 *
 * Fonctionnement : le mot de passe saisi est haché en SHA-256 (Web
 * Crypto API, exécuté dans le navigateur, aucune donnée envoyée nulle
 * part) puis comparé à l'empreinte stockée ci-dessous. La session reste
 * ouverte tant que l'onglet n'est pas fermé (sessionStorage).
 * ---------------------------------------------------------------------
 */

const Auth = (() => {
  // SHA-256("boiteacles") — mot de passe par défaut, à changer (voir README).
  const EMPREINTE_ATTENDUE =
    "e7c0dbc37e9f138b2a87ff2d9e193042cb12fbe899c87234981f7fd11a9b50da";

  const CLE_SESSION = "boiteacles.session";

  async function hacherSHA256(texte) {
    const octets = new TextEncoder().encode(texte);
    const empreinte = await crypto.subtle.digest("SHA-256", octets);
    return Array.from(new Uint8Array(empreinte))
      .map((o) => o.toString(16).padStart(2, "0"))
      .join("");
  }

  function estConnecte() {
    return sessionStorage.getItem(CLE_SESSION) === "1";
  }

  function seDeconnecter() {
    sessionStorage.removeItem(CLE_SESSION);
    window.location.reload();
  }

  async function motDePasseValide(motDePasse) {
    if (!motDePasse) return false;
    const empreinte = await hacherSHA256(motDePasse);
    return empreinte === EMPREINTE_ATTENDUE;
  }

  function initialiser() {
    const ecran = document.getElementById("ecran-connexion");
    const application = document.getElementById("application");
    const form = document.getElementById("form-connexion");
    const champMotDePasse = document.getElementById("champ-mot-de-passe");
    const messageErreur = document.getElementById("erreur-connexion");
    const boutonDeconnexion = document.getElementById("bouton-deconnexion");

    function debloquer() {
      ecran.hidden = true;
      application.hidden = false;
      boutonDeconnexion.hidden = false;
      App.initialiser();
    }

    boutonDeconnexion.addEventListener("click", seDeconnecter);

    if (estConnecte()) {
      debloquer();
      return;
    }

    ecran.hidden = false;
    application.hidden = true;
    champMotDePasse.focus();

    form.addEventListener("submit", async (evt) => {
      evt.preventDefault();
      messageErreur.hidden = true;
      const saisie = champMotDePasse.value;

      const boutonValider = form.querySelector('button[type="submit"]');
      boutonValider.disabled = true;

      const valide = await motDePasseValide(saisie);
      boutonValider.disabled = false;

      if (valide) {
        sessionStorage.setItem(CLE_SESSION, "1");
        debloquer();
      } else {
        messageErreur.hidden = false;
        champMotDePasse.value = "";
        champMotDePasse.focus();
      }
    });
  }

  return { initialiser };
})();

document.addEventListener("DOMContentLoaded", Auth.initialiser);
