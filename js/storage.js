/**
 * © 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */

/**
 * storage.js
 * ---------------------------------------------------------------------
 * Couche de persistance de la Boîte à clés virtuelle.
 *
 * Aucune API distante n'est utilisée. Les données vivent :
 *   1. En mémoire, dans l'état de l'application (app.js)
 *   2. En cache local, dans localStorage (persistance entre sessions)
 *   3. Dans un fichier JSON, que l'utilisateur peut importer / exporter,
 *      ou éditer directement si son navigateur supporte la File System
 *      Access API (Chrome, Edge). C'est le seul module autorisé à lire
 *      ou écrire des données brutes : le reste de l'application ne
 *      manipule que des objets JavaScript.
 * ---------------------------------------------------------------------
 */

const Depot = (() => {
  const CLE_LOCALSTORAGE = "boiteacles.donnees.v2";
  const CHEMIN_JEU_DEFAUT = "./data/keys.default.json";

  // Le handle du fichier ouvert via la File System Access API, s'il existe.
  // Il n'est volontairement pas persisté (les handles ne survivent pas
  // à un rechargement de page sans IndexedDB) : on affiche simplement le
  // bouton "Enregistrer dans le fichier" quand un fichier a été ouvert
  // pendant la session en cours.
  let handleFichierCourant = null;
  let nomFichierCourant = null;

  /** Le navigateur permet-il de lire/écrire un fichier local directement ? */
  function supportFileSystemAccess() {
    return typeof window.showOpenFilePicker === "function";
  }

  /**
   * Valide grossièrement la forme attendue d'un jeu de données.
   * On reste tolérant : seule la présence d'un tableau "trousseaux" est requise.
   * Le tableau "utilisateurs" est normalisé (ajouté vide) s'il est absent,
   * pour rester compatible avec les fichiers exportés avant cette fonctionnalité.
   */
  function estValide(donnees) {
    return (
      donnees &&
      typeof donnees === "object" &&
      Array.isArray(donnees.trousseaux)
    );
  }

  function normaliser(donnees) {
    if (!Array.isArray(donnees.utilisateurs)) donnees.utilisateurs = [];
    return donnees;
  }

  /**
   * Charge les données au démarrage de l'application, dans cet ordre :
   *   1. Une copie précédemment enregistrée dans localStorage
   *   2. À défaut, le jeu de données par défaut livré avec le projet
   *   3. À défaut, un jeu de données vide
   */
  async function chargerAuDemarrage() {
    const local = localStorage.getItem(CLE_LOCALSTORAGE);
    if (local) {
      try {
        const donnees = JSON.parse(local);
        if (estValide(donnees)) return normaliser(donnees);
      } catch (erreur) {
        console.warn("Cache local illisible, on retente avec le jeu par défaut.", erreur);
      }
    }

    try {
      const reponse = await fetch(CHEMIN_JEU_DEFAUT);
      if (reponse.ok) {
        const donnees = await reponse.json();
        if (estValide(donnees)) return normaliser(donnees);
      }
    } catch (erreur) {
      // Attendu si l'application est ouverte en file:// sans serveur local :
      // fetch() est bloqué par le navigateur dans ce cas précis.
      console.warn("Impossible de charger data/keys.default.json (normal en file://).", erreur);
    }

    return { version: 2, trousseaux: [], utilisateurs: [] };
  }

  /** Sauvegarde silencieuse dans localStorage, appelée après chaque changement. */
  function sauvegarderLocal(donnees) {
    localStorage.setItem(CLE_LOCALSTORAGE, JSON.stringify(donnees));
  }

  /** Déclenche le téléchargement du jeu de données courant en .json */
  function exporterVersFichier(donnees, nomFichier = "boite-a-cles.json") {
    const blob = new Blob([JSON.stringify(donnees, null, 2)], {
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

  /** Lit un fichier .json choisi via un <input type="file"> */
  function importerDepuisInput(fichier) {
    return new Promise((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onload = () => {
        try {
          const donnees = JSON.parse(lecteur.result);
          if (!estValide(donnees)) {
            reject(new Error("Le fichier ne contient pas de champ « trousseaux » (tableau)."));
            return;
          }
          resolve(normaliser(donnees));
        } catch (erreur) {
          reject(new Error("Le fichier n'est pas un JSON valide."));
        }
      };
      lecteur.onerror = () => reject(new Error("Impossible de lire le fichier."));
      lecteur.readAsText(fichier);
    });
  }

  /**
   * Ouvre un fichier JSON local via la File System Access API et conserve
   * le handle pour permettre un ré-enregistrement direct dans ce même
   * fichier (bouton "Enregistrer"). Retourne les données lues.
   */
  async function ouvrirFichierLocal() {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "Fichier JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const fichier = await handle.getFile();
    const texte = await fichier.text();
    const donnees = JSON.parse(texte);
    if (!estValide(donnees)) {
      throw new Error("Le fichier ne contient pas de champ « trousseaux » (tableau).");
    }
    handleFichierCourant = handle;
    nomFichierCourant = fichier.name;
    return { donnees: normaliser(donnees), nomFichier: fichier.name };
  }

  /** Écrit directement dans le fichier ouvert via ouvrirFichierLocal(). */
  async function enregistrerDansFichierOuvert(donnees) {
    if (!handleFichierCourant) {
      throw new Error("Aucun fichier local n'est ouvert.");
    }
    const inscriptible = await handleFichierCourant.createWritable();
    await inscriptible.write(JSON.stringify(donnees, null, 2));
    await inscriptible.close();
  }

  function nomFichierOuvert() {
    return nomFichierCourant;
  }

  return {
    supportFileSystemAccess,
    chargerAuDemarrage,
    sauvegarderLocal,
    exporterVersFichier,
    importerDepuisInput,
    ouvrirFichierLocal,
    enregistrerDansFichierOuvert,
    nomFichierOuvert,
  };
})();
