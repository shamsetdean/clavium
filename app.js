/**
 * © 2026 Shams Guettaf (Dean) — Anthropotech Lab. Tous droits réservés.
 * Voir LICENSE.md — reproduction et réutilisation interdites sans
 * autorisation écrite préalable.
 */

/**
 * app.js
 * ---------------------------------------------------------------------
 * Logique de la Boîte à clés virtuelle.
 * Ne touche jamais localStorage / fetch / fichiers directement :
 * toute la persistance passe par storage.js. La génération de QR code
 * passe par la librairie vendée js/vendor/qrcode.js (aucun appel réseau).
 *
 * Modèle : l'armoire contient des TROUSSEAUX suspendus à des crochets
 * numérotés. Un trousseau est soit :
 *   - "batiment" : plusieurs clés physiques (ouvre le bâtiment où est
 *     stockée la baie, plus les accès annexes)
 *   - "baie"     : une seule clé, celle de la baie uniquement
 * ---------------------------------------------------------------------
 */

const App = (() => {
  /** État en mémoire de l'application */
  const etat = {
    donnees: { version: 2, trousseaux: [] },
    recherche: "",
    filtreStatut: "toutes",  // toutes | disponible | emprunte
    filtreType: "toutes",    // toutes | batiment | baie
    trousseauEnEdition: null,
  };

  const LIBELLES_TYPE = {
    batiment: "Trousseau bâtiment",
    baie: "Clé de baie",
  };

  const ICONE_CLE_BATIMENT =
    '<svg viewBox="0 0 24 24" class="icone-cle" aria-hidden="true">' +
    '<circle cx="7" cy="7" r="4" fill="none" stroke="url(#degrade-batiment)" stroke-width="1.7"/>' +
    '<path d="M10 10 L20 20 M15.3 14.7 L18.3 11.7 M12.7 17.3 L14.7 15.3" fill="none" stroke="url(#degrade-batiment)" stroke-width="1.7" stroke-linecap="round"/>' +
    "</svg>";

  const ICONE_CLE_BAIE =
    '<svg viewBox="0 0 24 24" class="icone-cle" aria-hidden="true">' +
    '<circle cx="7" cy="7" r="4" fill="none" stroke="url(#degrade-baie)" stroke-width="1.7"/>' +
    '<path d="M10 10 L20 20 M15.3 14.7 L18.3 11.7 M12.7 17.3 L14.7 15.3" fill="none" stroke="url(#degrade-baie)" stroke-width="1.7" stroke-linecap="round"/>' +
    "</svg>";

  // -- Références DOM ----------------------------------------------------
  const els = {};

  function capterElements() {
    els.grille = document.getElementById("grille-creneaux");
    els.etatVide = document.getElementById("etat-vide");
    els.recherche = document.getElementById("champ-recherche");
    els.filtreStatut = document.getElementById("filtre-statut");
    els.filtreType = document.getElementById("filtre-type");
    els.compteur = document.getElementById("compteur-resultats");
    els.boutonAjouter = document.getElementById("bouton-ajouter");

    els.boutonImporter = document.getElementById("bouton-importer");
    els.inputImporter = document.getElementById("input-importer");
    els.boutonExporter = document.getElementById("bouton-exporter");
    els.boutonOuvrirFichier = document.getElementById("bouton-ouvrir-fichier");
    els.boutonEnregistrerFichier = document.getElementById("bouton-enregistrer-fichier");
    els.etiquetteFichier = document.getElementById("etiquette-fichier");

    els.dialogueForm = document.getElementById("dialogue-form");
    els.formTrousseau = document.getElementById("form-trousseau");
    els.titreDialogueForm = document.getElementById("titre-dialogue-form");
    els.boutonAnnulerForm = document.getElementById("bouton-annuler-form");
    els.champType = document.getElementById("champ-type-form");
    els.listeClefsForm = document.getElementById("liste-clefs-form");
    els.boutonAjouterClef = document.getElementById("bouton-ajouter-clef");
    els.libelleClefs = document.getElementById("libelle-section-clefs");

    els.dialogueDetail = document.getElementById("dialogue-detail");
    els.detailContenu = document.getElementById("detail-contenu");
    els.boutonFermerDetail = document.getElementById("bouton-fermer-detail");

    els.gabaritCreneau = document.getElementById("gabarit-creneau");

    els.zoneImpression = document.getElementById("zone-impression");
  }

  // -- Utilitaires ---------------------------------------------------------

  function genererId(prefixe) {
    return `${prefixe}-` + Math.random().toString(36).slice(2, 9);
  }

  function formaterDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function ajouterHistorique(trousseau, action, personne, commentaire) {
    trousseau.historique.push({
      action,
      personne: personne || "—",
      date: new Date().toISOString(),
      commentaire: commentaire || "",
    });
  }

  function echapper(texte) {
    const div = document.createElement("div");
    div.textContent = texte;
    return div.innerHTML;
  }

  async function persister() {
    Storage.sauvegarderLocal(etat.donnees);
    if (els.boutonEnregistrerFichier.hidden === false) {
      els.boutonEnregistrerFichier.classList.add("a-enregistrer");
    }
  }

  function trouverTrousseau(id) {
    return etat.donnees.trousseaux.find((t) => t.id === id) || null;
  }

  // -- QR code -------------------------------------------------------------

  /** Contenu encodé sur l'étiquette : identifie le trousseau sans ambiguïté. */
  function contenuQr(trousseau) {
    const codes = trousseau.clefs.map((c) => c.code).filter(Boolean).join("+");
    return [
      "BOITEACLES",
      trousseau.id,
      trousseau.type,
      trousseau.nom,
      codes,
    ].join("|");
  }

  function genererQrSvg(texte) {
    const qr = qrcode(0, "M");
    qr.addData(texte);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 6, scalable: true });
  }

  // -- Rendu de l'armoire ---------------------------------------------------

  function trousseauxFiltres() {
    const q = etat.recherche.trim().toLowerCase();
    return [...etat.donnees.trousseaux]
      .sort((a, b) => (a.crochet ?? 999) - (b.crochet ?? 999))
      .filter((t) => {
        if (etat.filtreStatut !== "toutes" && t.statut !== etat.filtreStatut) return false;
        if (etat.filtreType !== "toutes" && t.type !== etat.filtreType) return false;
        if (!q) return true;
        const cible = [
          t.nom,
          t.detenteur,
          String(t.crochet ?? ""),
          ...t.clefs.map((c) => `${c.repere} ${c.code}`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return cible.includes(q);
      });
  }

  function rendre() {
    const liste = trousseauxFiltres();
    els.grille.innerHTML = "";
    els.compteur.textContent =
      liste.length === 0 ? "Aucun trousseau" : liste.length === 1 ? "1 trousseau" : `${liste.length} trousseaux`;

    els.etatVide.hidden = liste.length !== 0;

    for (const trousseau of liste) {
      els.grille.appendChild(construireCreneau(trousseau));
    }
  }

  function construireCreneau(trousseau) {
    const frag = els.gabaritCreneau.content.cloneNode(true);
    const creneau = frag.querySelector(".creneau");
    creneau.dataset.id = trousseau.id;
    creneau.classList.add(
      trousseau.statut === "emprunte" ? "statut-emprunte" : "statut-disponible",
      trousseau.type === "baie" ? "type-baie" : "type-batiment"
    );

    frag.querySelector(".creneau__numero").textContent = trousseau.crochet ? `N°${trousseau.crochet}` : "—";

    const iconeType = frag.querySelector(".etiquette__type-icone");
    iconeType.innerHTML = trousseau.type === "baie" ? ICONE_CLE_BAIE : ICONE_CLE_BATIMENT.repeat(3);

    frag.querySelector(".etiquette__nom").textContent = trousseau.nom;
    frag.querySelector(".etiquette__type-libelle").textContent = LIBELLES_TYPE[trousseau.type] || "Trousseau";
    frag.querySelector(".etiquette__cles").textContent =
      trousseau.type === "baie"
        ? trousseau.clefs[0]?.code || "—"
        : `${trousseau.clefs.length} clé${trousseau.clefs.length > 1 ? "s" : ""}`;

    frag.querySelector(".ticket__detenteur").textContent = trousseau.detenteur || "—";
    frag.querySelector(".ticket__date").textContent =
      trousseau.statut === "emprunte" ? `depuis le ${formaterDate(trousseau.dateEmprunt)}` : "";

    const boutonAction = frag.querySelector(".creneau__action");
    boutonAction.textContent = trousseau.statut === "emprunte" ? "Restituer" : "Emprunter";
    boutonAction.addEventListener("click", (evt) => {
      evt.stopPropagation();
      trousseau.statut === "emprunte" ? restituerTrousseau(trousseau.id) : demarrerEmprunt(trousseau.id);
    });

    creneau.addEventListener("click", () => ouvrirDetail(trousseau.id));
    creneau.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        ouvrirDetail(trousseau.id);
      }
    });

    return frag;
  }

  // -- Actions : emprunt / retour / suppression ----------------------------

  function demarrerEmprunt(id) {
    const trousseau = trouverTrousseau(id);
    if (!trousseau) return;
    const personne = window.prompt(`Nom de la personne qui décroche « ${trousseau.nom} » :`);
    if (personne === null || personne.trim() === "") return;
    trousseau.statut = "emprunte";
    trousseau.detenteur = personne.trim();
    trousseau.dateEmprunt = new Date().toISOString();
    trousseau.dateRetourPrevue = null;
    ajouterHistorique(trousseau, "emprunt", personne.trim(), "");
    persister();
    rendre();
    if (etat.trousseauEnEdition === id) ouvrirDetail(id);
  }

  function restituerTrousseau(id) {
    const trousseau = trouverTrousseau(id);
    if (!trousseau) return;
    const detenteurPrecedent = trousseau.detenteur;
    trousseau.statut = "disponible";
    trousseau.detenteur = null;
    trousseau.dateEmprunt = null;
    trousseau.dateRetourPrevue = null;
    ajouterHistorique(trousseau, "retour", detenteurPrecedent, "");
    persister();
    rendre();
    if (etat.trousseauEnEdition === id) ouvrirDetail(id);
  }

  function supprimerTrousseau(id) {
    const trousseau = trouverTrousseau(id);
    if (!trousseau) return;
    const confirme = window.confirm(`Retirer définitivement « ${trousseau.nom} » de l'armoire ?`);
    if (!confirme) return;
    etat.donnees.trousseaux = etat.donnees.trousseaux.filter((t) => t.id !== id);
    persister();
    rendre();
    fermerDetail();
  }

  // -- Formulaire : lignes de clés dynamiques ------------------------------

  function creerLigneClef(repere = "", code = "") {
    const ligne = document.createElement("div");
    ligne.className = "ligne-clef";
    ligne.innerHTML = `
      <input type="text" class="ligne-clef__repere" placeholder="Repère (ex. Porte principale)" value="${echapper(repere)}" maxlength="60" />
      <input type="text" class="ligne-clef__code" placeholder="Code" value="${echapper(code)}" maxlength="20" />
      <button type="button" class="ligne-clef__supprimer" aria-label="Supprimer cette clé">✕</button>
    `;
    ligne.querySelector(".ligne-clef__supprimer").addEventListener("click", () => {
      ligne.remove();
      actualiserModeClefsForm();
    });
    return ligne;
  }

  /** Adapte le formulaire selon le type choisi : une seule clé pour "baie". */
  function actualiserModeClefsForm() {
    const estBaie = els.champType.value === "baie";
    const lignes = els.listeClefsForm.querySelectorAll(".ligne-clef");

    if (estBaie && lignes.length > 1) {
      lignes.forEach((l, i) => { if (i > 0) l.remove(); });
    }
    if (els.listeClefsForm.children.length === 0) {
      els.listeClefsForm.appendChild(creerLigneClef());
    }

    els.boutonAjouterClef.hidden = estBaie;
    els.libelleClefs.textContent = estBaie ? "Clé du trousseau" : "Clés du trousseau";
    els.listeClefsForm.querySelectorAll(".ligne-clef__supprimer").forEach((b) => {
      b.hidden = estBaie || els.listeClefsForm.children.length <= 1;
    });
  }

  function ouvrirFormulaire(id = null) {
    const trousseau = id ? trouverTrousseau(id) : null;
    els.formTrousseau.reset();
    els.formTrousseau.elements["id"].value = trousseau ? trousseau.id : "";
    els.titreDialogueForm.textContent = trousseau ? "Modifier le trousseau" : "Ajouter un trousseau";
    els.listeClefsForm.innerHTML = "";

    if (trousseau) {
      els.formTrousseau.elements["nom"].value = trousseau.nom;
      els.champType.value = trousseau.type;
      els.formTrousseau.elements["crochet"].value = trousseau.crochet || "";
      els.formTrousseau.elements["notes"].value = trousseau.notes || "";
      trousseau.clefs.forEach((c) => els.listeClefsForm.appendChild(creerLigneClef(c.repere, c.code)));
    } else {
      els.champType.value = "batiment";
      const prochainCrochet =
        etat.donnees.trousseaux.reduce((max, t) => Math.max(max, t.crochet || 0), 0) + 1;
      els.formTrousseau.elements["crochet"].value = prochainCrochet;
      els.listeClefsForm.appendChild(creerLigneClef());
    }

    actualiserModeClefsForm();
    els.dialogueForm.showModal();
    els.formTrousseau.elements["nom"].focus();
  }

  function soumettreFormulaire(evt) {
    evt.preventDefault();
    const donneesForm = new FormData(els.formTrousseau);
    const id = donneesForm.get("id");
    const nom = donneesForm.get("nom").trim();
    if (!nom) return;

    const clefs = [...els.listeClefsForm.querySelectorAll(".ligne-clef")]
      .map((ligne, i) => ({
        id: `c-${String(i + 1).padStart(2, "0")}`,
        repere: ligne.querySelector(".ligne-clef__repere").value.trim(),
        code: ligne.querySelector(".ligne-clef__code").value.trim(),
      }))
      .filter((c) => c.repere || c.code);

    if (clefs.length === 0) {
      window.alert("Renseignez au moins une clé pour ce trousseau.");
      return;
    }

    const crochet = parseInt(donneesForm.get("crochet"), 10) || null;
    const type = donneesForm.get("type");
    const notes = donneesForm.get("notes").trim();

    if (id) {
      const trousseau = trouverTrousseau(id);
      if (!trousseau) return;
      trousseau.nom = nom;
      trousseau.type = type;
      trousseau.crochet = crochet;
      trousseau.clefs = clefs;
      trousseau.notes = notes;
      ajouterHistorique(trousseau, "modification", "—", "Fiche mise à jour.");
    } else {
      const nouveauTrousseau = {
        id: genererId("t"),
        nom,
        type,
        crochet,
        clefs,
        statut: "disponible",
        detenteur: null,
        dateEmprunt: null,
        dateRetourPrevue: null,
        notes,
        historique: [],
      };
      ajouterHistorique(nouveauTrousseau, "creation", "—", "Trousseau enregistré dans la boîte.");
      etat.donnees.trousseaux.unshift(nouveauTrousseau);
    }

    persister();
    rendre();
    els.dialogueForm.close();
  }

  // -- Panneau détail / historique / QR ------------------------------------

  function ouvrirDetail(id) {
    const trousseau = trouverTrousseau(id);
    if (!trousseau) return;
    etat.trousseauEnEdition = id;

    const listeClefsHtml = trousseau.clefs
      .map((c) => `<li><span class="detail-clefs__repere">${echapper(c.repere || "—")}</span><span class="detail-clefs__code">${echapper(c.code || "—")}</span></li>`)
      .join("");

    const historiqueHtml = [...trousseau.historique]
      .reverse()
      .map(
        (entree) => `
        <li class="historique__item">
          <span class="historique__action">${libelleAction(entree.action)}</span>
          <span class="historique__meta">${echapper(entree.personne)} · ${formaterDate(entree.date)}</span>
          ${entree.commentaire ? `<span class="historique__commentaire">${echapper(entree.commentaire)}</span>` : ""}
        </li>`
      )
      .join("");

    els.detailContenu.innerHTML = `
      <header class="detail__entete">
        <div>
          <p class="detail__type">${LIBELLES_TYPE[trousseau.type] || "Trousseau"} · Crochet n°${trousseau.crochet ?? "—"}</p>
          <h3>${echapper(trousseau.nom)}</h3>
        </div>
        <span class="pastille pastille--${trousseau.statut}">${trousseau.statut === "emprunte" ? "Décroché" : "Suspendu"}</span>
      </header>

      ${trousseau.statut === "emprunte" ? `<p class="detail__emprunt">Détenu par <strong>${echapper(trousseau.detenteur || "—")}</strong> depuis le ${formaterDate(trousseau.dateEmprunt)}</p>` : ""}

      <ul class="detail-clefs">${listeClefsHtml}</ul>
      ${trousseau.notes ? `<p class="detail__notes">${echapper(trousseau.notes)}</p>` : ""}

      <div class="detail__actions">
        <button type="button" class="bouton bouton--discret" data-action="modifier">Modifier</button>
        <button type="button" class="bouton bouton--discret" data-action="${trousseau.statut === "emprunte" ? "restituer" : "emprunter"}">
          ${trousseau.statut === "emprunte" ? "Restituer" : "Emprunter"}
        </button>
        <button type="button" class="bouton bouton--danger" data-action="supprimer">Retirer</button>
      </div>

      <div class="detail__qr">
        <div class="detail__qr-image" aria-hidden="true"></div>
        <div class="detail__qr-texte">
          <p>Étiquette à imprimer et fixer sur le porte-clés, pour identifier le trousseau d'un coup de scan.</p>
          <button type="button" class="bouton bouton--brass" data-action="imprimer">Imprimer l'étiquette</button>
        </div>
      </div>

      <h4 class="detail__sous-titre">Historique</h4>
      <ul class="historique">${historiqueHtml || '<li class="historique__vide">Aucun mouvement enregistré.</li>'}</ul>
    `;

    els.detailContenu.querySelector(".detail__qr-image").innerHTML = genererQrSvg(contenuQr(trousseau));

    els.detailContenu.querySelector('[data-action="modifier"]').addEventListener("click", () => {
      fermerDetail();
      ouvrirFormulaire(trousseau.id);
    });
    els.detailContenu.querySelector('[data-action="emprunter"]')?.addEventListener("click", () => demarrerEmprunt(trousseau.id));
    els.detailContenu.querySelector('[data-action="restituer"]')?.addEventListener("click", () => restituerTrousseau(trousseau.id));
    els.detailContenu.querySelector('[data-action="supprimer"]').addEventListener("click", () => supprimerTrousseau(trousseau.id));
    els.detailContenu.querySelector('[data-action="imprimer"]').addEventListener("click", () => imprimerEtiquette(trousseau));

    els.dialogueDetail.showModal();
  }

  function fermerDetail() {
    etat.trousseauEnEdition = null;
    if (els.dialogueDetail.open) els.dialogueDetail.close();
  }

  function libelleAction(action) {
    return (
      {
        creation: "Ajout dans la boîte",
        emprunt: "Décroché",
        retour: "Raccroché",
        modification: "Fiche modifiée",
      }[action] || action
    );
  }

  function imprimerEtiquette(trousseau) {
    const zone = els.zoneImpression;
    zone.querySelector(".etiquette-impression__nom").textContent = trousseau.nom;
    zone.querySelector(".etiquette-impression__type").textContent = LIBELLES_TYPE[trousseau.type] || "";
    zone.querySelector(".etiquette-impression__crochet").textContent = `Crochet n°${trousseau.crochet ?? "—"}`;
    zone.querySelector(".etiquette-impression__qr").innerHTML = genererQrSvg(contenuQr(trousseau));
    zone.querySelector(".etiquette-impression__codes").textContent = trousseau.clefs
      .map((c) => c.code)
      .filter(Boolean)
      .join(" · ");
    window.print();
  }

  // -- Import / export / fichier local -------------------------------------

  async function gererImport(fichier) {
    try {
      const donnees = await Storage.importerDepuisInput(fichier);
      etat.donnees = donnees;
      persister();
      rendre();
    } catch (erreur) {
      window.alert(erreur.message);
    }
  }

  function gererExport() {
    Storage.exporterVersFichier(etat.donnees);
  }

  async function gererOuvertureFichier() {
    try {
      const { donnees, nomFichier } = await Storage.ouvrirFichierLocal();
      etat.donnees = donnees;
      persister();
      rendre();
      els.etiquetteFichier.textContent = `Fichier ouvert : ${nomFichier}`;
      els.etiquetteFichier.hidden = false;
      els.boutonEnregistrerFichier.hidden = false;
      els.boutonEnregistrerFichier.classList.remove("a-enregistrer");
    } catch (erreur) {
      if (erreur.name !== "AbortError") window.alert(erreur.message);
    }
  }

  async function gererEnregistrementFichier() {
    try {
      await Storage.enregistrerDansFichierOuvert(etat.donnees);
      els.boutonEnregistrerFichier.classList.remove("a-enregistrer");
    } catch (erreur) {
      window.alert(erreur.message);
    }
  }

  // -- Initialisation --------------------------------------------------

  function attacherEvenements() {
    els.recherche.addEventListener("input", (e) => {
      etat.recherche = e.target.value;
      rendre();
    });
    els.filtreStatut.addEventListener("change", (e) => {
      etat.filtreStatut = e.target.value;
      rendre();
    });
    els.filtreType.addEventListener("change", (e) => {
      etat.filtreType = e.target.value;
      rendre();
    });

    els.boutonAjouter.addEventListener("click", () => ouvrirFormulaire());
    els.boutonAnnulerForm.addEventListener("click", () => els.dialogueForm.close());
    els.formTrousseau.addEventListener("submit", soumettreFormulaire);
    els.champType.addEventListener("change", actualiserModeClefsForm);
    els.boutonAjouterClef.addEventListener("click", () => {
      els.listeClefsForm.appendChild(creerLigneClef());
      actualiserModeClefsForm();
    });

    els.boutonFermerDetail.addEventListener("click", fermerDetail);

    els.boutonImporter.addEventListener("click", () => els.inputImporter.click());
    els.inputImporter.addEventListener("change", (e) => {
      const fichier = e.target.files[0];
      if (fichier) gererImport(fichier);
      e.target.value = "";
    });
    els.boutonExporter.addEventListener("click", gererExport);

    if (Storage.supportFileSystemAccess()) {
      els.boutonOuvrirFichier.hidden = false;
      els.boutonOuvrirFichier.addEventListener("click", gererOuvertureFichier);
      els.boutonEnregistrerFichier.addEventListener("click", gererEnregistrementFichier);
    }

    for (const dialogue of [els.dialogueForm, els.dialogueDetail]) {
      dialogue.addEventListener("click", (e) => {
        if (e.target === dialogue) dialogue.close();
      });
    }
  }

  let initialise = false;

  async function initialiser() {
    if (initialise) return; // évite une double init si Auth rappelle après un rechargement
    initialise = true;
    capterElements();
    attacherEvenements();
    etat.donnees = await Storage.chargerAuDemarrage();
    rendre();
  }

  return { initialiser };
})();
