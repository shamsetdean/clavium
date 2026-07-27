# Boîte à clés virtuelle

**© 2026 Shams Guettaf — Anthropotech Lab. Tous droits réservés.**
Voir [`LICENSE.md`](./LICENSE.md). Ce dépôt est publié pour démonstration et
usage personnel ; toute réutilisation, modification ou redistribution
nécessite une autorisation écrite préalable.

> **Protéger l'idée avant de publier sur GitHub — ce qui marche vraiment**
> En droit français, le droit d'auteur naît automatiquement à la création
> de l'œuvre (Code de la propriété intellectuelle, art. L111-1) : aucun
> dépôt n'est obligatoire pour être protégé. Ce qui compte en pratique,
> c'est de pouvoir *prouver la date de création* si un litige survient :
> - L'historique Git (commits horodatés) sert déjà de preuve d'antériorité
>   simple, à condition de ne pas réécrire l'historique (`git rebase`,
>   force-push) après coup.
> - Pour une preuve plus solide, un dépôt auprès de l'APP (Agence pour la
>   Protection des Programmes) ou un constat d'huissier/notaire est
>   recommandé — l'ancienne enveloppe Soleau numérique de l'INPI a été
>   fermée en 2021.
> - Si le code lui-même (et pas seulement le site déployé) doit rester
>   invisible, il faut un **dépôt privé** : GitHub Pages peut être publié
>   depuis un dépôt privé selon le type de compte (le site reste public,
>   le code source non). Avec un dépôt public classique, le code est
>   consultable par n'importe qui — la licence ci-dessus n'empêche pas la
>   lecture, mais interdit juridiquement la copie et fournit une base pour
>   agir en cas d'usage non autorisé.

## Ce que fait l'application

Application statique reproduisant une armoire à clés murale : les trousseaux
sont suspendus à des crochets numérotés, chacun avec sa propre étiquette QR
code à imprimer. Accès protégé par mot de passe. Aucun serveur, aucune base
de données distante, aucun tracker.

## Deux types de trousseaux

- **Trousseau bâtiment** — plusieurs clés physiques sur un même anneau
  (porte principale, local, sas…), dont celle qui ouvre le bâtiment où se
  trouve la baie. Dégradé **or/ambre**.
- **Clé de baie** — une seule clé, qui n'ouvre que la baie. Dégradé **vert**.

Ces deux couleurs sont strictement réservées à cet usage : elles n'apparaissent
nulle part ailleurs dans l'interface (boutons, focus, etc. utilisent une
troisième couleur de marque neutre, indigo/bleu, définie séparément dans
`css/styles.css` sous `--marque-*`).

Chaque trousseau a un numéro de crochet, un statut (suspendu / décroché),
et génère un QR code identifiant à imprimer sur le porte-clés physique.

## Disposition physique de l'armoire

L'armoire a une capacité fixe de **49 crochets numérotés**, répartis sur deux
portes de 7 crochets par ligne :

- Porte gauche : 4 rangées → crochets n°1 à 28
- Porte droite : 3 rangées → crochets n°29 à 49

Les 49 crochets s'affichent toujours, qu'ils soient occupés ou non — un
crochet libre apparaît nu (juste le crochet et son numéro) et peut être
cliqué directement pour y accrocher un nouveau trousseau (le formulaire
s'ouvre avec ce numéro de crochet déjà rempli). Deux trousseaux ne peuvent
pas partager le même crochet : le formulaire refuse l'enregistrement si le
numéro choisi est déjà occupé par un autre trousseau. Le numéro de crochet
est donc obligatoire, entre 1 et 49 (`js/app.js`, constantes
`COLONNES_PAR_LIGNE`, `LIGNES_PORTE_A`, `LIGNES_PORTE_B`).

## Architecture

```
boite-a-cles/
├── index.html              → écran de connexion + structure de l'armoire
├── css/
│   └── styles.css          → design (tokens couleur/typo, composants)
├── js/
│   ├── auth.js               → verrou d'accès par mot de passe (SHA-256)
│   ├── storage.js            → seule couche autorisée à lire/écrire des données
│   ├── app.js                 → état, rendu de l'armoire, formulaire, QR
│   └── vendor/
│       ├── qrcode.js           → générateur de QR code (MIT, Kazuhiko Arase)
│       └── qrcode-utf8.js      → extension UTF-8 de la même librairie
├── data/
│   └── keys.default.json     → jeu de données chargé au tout premier lancement
├── assets/
│   ├── favicon-16.png, favicon-32.png, favicon-48.png, favicon.png
│   ├── icone-180.png, icone-512.png
│   └── og-image.png
└── README.md
```

Ces deux fichiers `vendor/` sont une copie locale figée de la librairie
`qrcode-generator` (licence MIT) : le QR code est généré entièrement dans le
navigateur, sans appel réseau ni service tiers.

La séparation est stricte : `index.html` ne connaît que la structure,
`styles.css` ne connaît que l'apparence, `app.js` ne connaît que la logique
métier, et `storage.js` est le seul fichier à toucher `localStorage`, `fetch`
ou l'API fichiers. Pour ajouter une fonctionnalité qui touche aux données
(ex. un champ supplémentaire sur une clé), il suffit de modifier la forme des
objets dans `data/keys.default.json` et le formulaire correspondant — le reste
de l'application n'a pas à changer.

## Écran de connexion — comptes, rôles et ce qu'ils protègent vraiment

Il n'y a plus de mot de passe unique codé dans l'application. À la toute
première ouverture (aucun compte enregistré), l'écran propose de **créer le
compte administrateur** : nom + mot de passe, choisis sur place. Le mot de
passe est haché en SHA-256 (Web Crypto API du navigateur) et le résultat est
stocké dans les données elles-mêmes (`donnees.utilisateurs`) — jamais en
clair, ni dans un fichier livré, ni dans ce README. Ensuite, l'écran devient
un formulaire de connexion classique (nom + mot de passe).

Deux rôles :

- **Administrateur** — accès complet : ajouter/modifier/retirer un
  trousseau, importer un JSON, ouvrir/enregistrer un fichier local, créer et
  supprimer des comptes (bouton *Utilisateurs* dans l'en-tête).
- **Accès limité** — peut consulter l'armoire (recherche, filtres, détail,
  QR code, historique), emprunter et restituer un trousseau. Rien d'autre :
  les boutons Ajouter, Importer, Ouvrir/Enregistrer un fichier, Utilisateurs
  et Modifier/Retirer sont invisibles pour ce rôle.

Comme pour toute application 100 % statique : ce système distingue les rôles
dans l'interface et évite un accès accidentel, mais **ce n'est pas une
sécurité forte** face à quelqu'un de déterminé qui lirait le code source
(public sur GitHub Pages). Les restrictions de rôle sont appliquées côté
interface, pas comme une barrière serveur infranchissable.

### Notification par email à chaque modification

À chaque ajout, modification, emprunt, restitution ou changement dans la
liste des utilisateurs, l'application :
1. télécharge automatiquement une copie horodatée du JSON à jour ;
2. ouvre un brouillon email pré-rempli vers `shamsetdean@gmail.com`.

**Limite technique assumée, pas un manque de soin** : un navigateur ne peut
ni joindre un fichier à un email automatiquement, ni l'envoyer sans action
humaine — ce sont des restrictions de sécurité du web, pas un choix de ce
projet. Il reste donc un geste manuel : joindre le fichier qui vient d'être
téléchargé, puis cliquer sur Envoyer dans le client email. Aucun service
tiers n'est utilisé pour cet envoi (cohérent avec l'absence de serveur et la
protection des données) ; la contrepartie est cette étape manuelle.

Si un envoi vraiment automatique et silencieux est souhaité malgré tout, il
faudrait passer par un service tiers (ex. EmailJS, Resend) avec une clé
d'API exposée côté client et le contenu de l'armoire transitant par ses
serveurs — un compromis à valider explicitement avant de l'implémenter.

## Où vivent les données

Le navigateur ne peut pas écrire silencieusement sur le disque : trois modes
de stockage sont donc combinés.

1. **Cache automatique** — chaque modification est sauvegardée dans
   `localStorage`. Les données survivent à une fermeture d'onglet, mais
   restent propres à ce navigateur/cet appareil.
2. **Export / Import JSON** — les boutons *Exporter en JSON* et *Importer un
   JSON* permettent de télécharger l'état courant ou de recharger un fichier
   `.json` (sauvegarde, partage, transfert d'un appareil à l'autre).
3. **Édition directe d'un fichier local** (Chrome, Edge, et autres navigateurs
   compatibles avec la *File System Access API*) — le bouton *Ouvrir un
   fichier local* permet de choisir un `.json` sur le disque ; le bouton
   *Enregistrer* réécrit alors ce même fichier. Sur les navigateurs qui ne
   supportent pas cette API (Firefox, Safari), ces deux boutons restent
   cachés et seuls l'export/import restent disponibles — l'application reste
   entièrement fonctionnelle.

Au premier lancement, si `localStorage` est vide, l'application charge
`data/keys.default.json` à titre d'exemple. Une fois modifiées, les données
ne repartent plus de ce fichier : il sert uniquement d'amorce.

## Étiquettes QR code

Dans le détail d'un trousseau, le bouton *Imprimer l'étiquette* ouvre la
boîte de dialogue d'impression du navigateur sur une mise en page dédiée
(6 cm de large environ) : nom du trousseau, numéro de crochet, codes des
clés et QR code, prête à découper et à fixer sur le porte-clés physique.
Le QR code encode un identifiant du trousseau (nom, type, codes) — pas
d'information sensible.

## Favicon, icône et image de partage

Le dossier `assets/` contient le favicon (plusieurs tailles), l'icône
d'application (`apple-touch-icon`, écran d'accueil) et l'image utilisée pour
l'aperçu Open Graph (partage du lien). Toutes sont référencées dans le
`<head>` de `index.html`.

Une fois le site déployé, remplacez la valeur relative de `og:image` par
l'URL absolue de la page (ex. `https://votre-compte.github.io/boite-a-cles/assets/og-image.png`)
— certains réseaux sociaux n'affichent pas correctement une image en chemin
relatif.

## Déploiement sur GitHub Pages

1. Poussez ce dossier à la racine d'un dépôt GitHub (ou dans un dossier
   `/docs`).
2. Dans les paramètres du dépôt → *Pages*, choisissez la branche et le
   dossier contenant `index.html`.
3. C'est tout : aucune étape de build, aucune dépendance à installer.

## Utilisation en local

Le chargement de `data/keys.default.json` se fait via `fetch()`, qui est
bloqué par certains navigateurs quand la page est ouverte directement en
`file://`. Pour tester en local, servez le dossier avec un petit serveur
statique, par exemple :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Sans serveur local, l'application démarre simplement avec une boîte à clés
vide (ou avec le contenu déjà en cache) — aucune erreur bloquante.

## Étendre le modèle de données

Chaque trousseau suit cette forme (voir `data/keys.default.json`) :

```json
{
  "id": "t-0001",
  "nom": "Bâtiment technique",
  "type": "batiment",
  "crochet": 1,
  "clefs": [
    { "id": "c-01", "repere": "Porte principale", "code": "BT-01" },
    { "id": "c-02", "repere": "Local baie", "code": "BT-02" }
  ],
  "statut": "disponible",
  "detenteur": null,
  "dateEmprunt": null,
  "dateRetourPrevue": null,
  "notes": "",
  "historique": [
    { "action": "creation", "personne": "Système", "date": "2026-06-01T09:00:00.000Z", "commentaire": "" }
  ]
}
```

`statut` vaut `"disponible"` (suspendu sur son crochet) ou `"emprunte"`
(décroché). `type` vaut `"batiment"` (plusieurs `clefs`) ou `"baie"` (une
seule entrée dans `clefs`) — ce sont les deux seuls types prévus par le
formulaire (`index.html` / `js/app.js`, constante `LIBELLES_TYPE`).

Les comptes suivent cette forme (champ `utilisateurs`, géré par l'écran de
connexion et la boîte de dialogue *Utilisateurs*, jamais à éditer à la main) :

```json
{
  "id": "u-0001",
  "nom": "Shams",
  "role": "admin",
  "empreinte": "<hash SHA-256, 64 caractères hexadécimaux>"
}
```

`role` vaut `"admin"` ou `"utilisateur"` (accès limité). `empreinte` n'est
jamais le mot de passe en clair — voir la section *Écran de connexion*
ci-dessus.

## Compatibilité

Testé sur les navigateurs modernes (Chrome, Edge, Firefox, Safari récents).
Les boîtes de dialogue utilisent l'élément natif `<dialog>`. L'édition
directe de fichier local nécessite un navigateur basé sur Chromium.
