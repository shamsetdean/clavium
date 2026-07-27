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
>   recommandé.
> - Le code du front-end (HTML/CSS/JS) reste consultable sur un dépôt
>   GitHub Pages public — la licence l'interdit juridiquement mais n'en
>   empêche pas la lecture. Les **données** (armoire, comptes), elles, ne
>   sont plus dans ce dépôt du tout : elles vivent sur Supabase, protégées
>   par de vraies règles d'accès côté serveur (voir plus bas).

## Ce que fait l'application

Interface web reproduisant une armoire à clés murale : les trousseaux sont
suspendus à des crochets numérotés, chacun avec sa propre étiquette QR code
à imprimer. L'interface (HTML/CSS/JS) reste statique et se déploie sur
GitHub Pages ; les données (trousseaux, comptes) et l'authentification
vivent sur **Supabase**, pour une sécurité réelle côté serveur.

## Deux types de trousseaux

- **Trousseau bâtiment** — plusieurs clés physiques sur un même anneau
  (porte principale, local, sas…), dont celle qui ouvre le bâtiment où se
  trouve la baie. Dégradé **or/ambre**.
- **Clé de baie** — une seule clé, qui n'ouvre que la baie. Dégradé **vert**.

Ces deux couleurs sont réservées à cet usage ; le reste de l'interface
(boutons, focus…) utilise une couleur de marque neutre indigo/bleu
(`--marque-*` dans `css/styles.css`).

## Disposition physique de l'armoire

Capacité fixe de **70 crochets numérotés**, répartis sur deux portes de
10 crochets par ligne :

- Porte A : 4 rangées → crochets n°1 à 40
- Porte B : 3 rangées → crochets n°41 à 70

**Une seule porte est affichée à la fois** (onglets *Porte A* / *Porte B*) —
plus lisible sur PC comme sur téléphone. Un crochet libre est cliquable
(admin) pour y accrocher directement un nouveau trousseau. Deux trousseaux
ne peuvent pas partager le même crochet — contrainte appliquée à la fois
côté interface et côté base de données (`crochet` est `unique` dans le
schéma SQL : même en cas de double-clic ou de requête directe, la base
refuse le doublon).

## QR code : lien direct vers l'action

Le QR code de chaque trousseau encode un **lien complet** vers le site
(`?trousseau=<id>`). En le scannant sur le porte-clés physique, on arrive
directement sur ce trousseau, prêt à emprunter ou restituer en un geste —
la connexion reste nécessaire, le lien ne contient aucun mot de passe.

## Comptes : Shams (admin) et Lucile (accès limité)

Deux rôles :

- **Administrateur** — accès complet : ajouter/modifier/retirer un
  trousseau, gérer les comptes.
- **Accès limité** — consulter l'armoire, emprunter, restituer. Rien
  d'autre : les actions d'administration sont invisibles pour ce rôle
  dans l'interface, **et refusées côté base de données** si jamais elles
  étaient tentées quand même (voir la section Sécurité ci-dessous).

Le tout premier compte créé (à la première ouverture du site) devient
automatiquement administrateur — ce sera Shams. Pour ajouter Lucile en
accès limité, voir *Mise en route avec Supabase → Ajouter un utilisateur*
plus bas : ça se fait depuis le tableau de bord Supabase, pas depuis un
bouton dans l'app, pour que son mot de passe ne soit jamais vu par
personne d'autre qu'elle.

## Architecture

```
boite-a-cles/
├── index.html                    → écran de connexion + structure de l'armoire
├── css/
│   └── styles.css                → design (tokens couleur/typo, composants)
├── js/
│   ├── supabase-config.js          → URL + clé publique de VOTRE projet Supabase
│   ├── supabase-client.js          → initialise le client à partir de la config
│   ├── auth.js                     → connexion/inscription via Supabase Auth
│   ├── data.js                     → toutes les requêtes vers les données
│   ├── app.js                      → état, rendu de l'armoire, formulaire, QR
│   └── vendor/
│       ├── supabase.js               → client Supabase (MIT, vendé localement)
│       ├── qrcode.js                 → générateur de QR code (MIT)
│       └── qrcode-utf8.js            → extension UTF-8 de la même librairie
├── supabase/
│   └── schema.sql                  → tables, sécurité (RLS), fonctions — à exécuter une fois
├── assets/                        → favicon, icône, image de partage
└── README.md
```

Les fichiers `vendor/` sont des copies locales figées de librairies MIT
(Supabase JS, générateur de QR code) : elles s'exécutent entièrement dans
le navigateur, sans CDN ni dépendance au moment du chargement de la page.

## Mise en route avec Supabase

**Je ne peux pas faire ces étapes à votre place** (pas d'accès réseau vers
Supabase depuis mon environnement) — mais elles ne prennent que quelques
minutes.

### 1. Créer le projet

Sur [supabase.com](https://supabase.com), créez un compte puis un nouveau
projet (le plan gratuit suffit largement pour deux comptes et quelques
dizaines de trousseaux).

### 2. Exécuter le schéma

Dashboard → **SQL Editor** → *New query* → collez tout le contenu de
[`supabase/schema.sql`](./supabase/schema.sql) → *Run*. Ça crée les tables,
active la sécurité (RLS), et met en place les fonctions d'emprunt/retour.
Vérifiez ensuite dans **Table Editor** que `trousseaux` et `profils`
apparaissent bien dans la liste avant de passer à la suite.

L'armoire démarre vide : les trousseaux se recréent directement depuis
l'application (bouton *+ Ajouter un trousseau*), pas par migration.

### 3. Récupérer l'URL et la clé, les mettre dans le projet

Dashboard → **Settings → API** → copiez *Project URL* et la clé *anon
public*. Collez-les dans `js/supabase-config.js` :

```js
const SUPABASE_URL = "https://votre-projet.supabase.co";
const SUPABASE_ANON_KEY = "votre-clé-anon-publique";
```

Cette clé est publique par conception (voir les commentaires du fichier) —
ce n'est pas un secret à cacher, la sécurité vient des règles RLS définies
à l'étape 2, pas de la confidentialité de cette clé.

### 4. Désactiver les inscriptions publiques (recommandé)

Dashboard → **Authentication → Providers → Email** → désactivez *Allow new
users to sign up*, une fois le compte de Shams créé (étape suivante). Ça
évite que n'importe qui connaissant l'URL du site puisse créer un compte —
même si, par défaut, un compte sans profil associé ne peut rien faire dans
l'application (filet de sécurité intégré au schéma SQL).

Dashboard → **Authentication → Providers → Email** → vous pouvez aussi
désactiver *Confirm email* pour simplifier, ou le laisser actif pour une
vérification supplémentaire (dans ce cas, Shams et Lucile devront cliquer
le lien reçu par email avant de pouvoir se connecter).

### 5. Ouvrir le site, créer le compte de Shams

Premier chargement de la page (une fois `supabase-config.js` renseigné) :
l'écran propose de créer le compte administrateur. Shams entre son nom,
son email, un mot de passe — c'est tout, il devient automatiquement admin.

### 6. Ajouter Lucile

Dashboard → **Authentication → Users → Add user** (ou *Invite*, pour qu'elle
choisisse elle-même son mot de passe par email — recommandé). Une fois son
compte créé, notez son UUID affiché dans la liste, puis dans **SQL
Editor** :

```sql
insert into profils (id, nom, role)
values ('UUID-DE-LUCILE-ICI', 'Lucile', 'utilisateur');
```

Elle peut alors se connecter et emprunter/restituer, sans jamais avoir
accès aux boutons d'administration.

## Sécurité : ce qui a vraiment changé par rapport à la version statique

- **Mots de passe** : vérifiés côté serveur par Supabase Auth (hachage
  bcrypt), jamais dans le code envoyé au navigateur. Avant, une empreinte
  SHA-256 comparée côté client — techniquement contournable par quelqu'un
  lisant le JavaScript.
- **Droits d'accès** : appliqués par des règles RLS (Row Level Security)
  côté base de données (`supabase/schema.sql`). Un compte "accès limité"
  ne peut PAS modifier un trousseau même en contournant l'interface (en
  appelant l'API directement) — la base de données refuse la requête.
  Avant, seule l'interface cachait les boutons ; rien n'empêchait
  techniquement une modification directe du `localStorage`.
- **Synchronisation** : les données vivent sur un serveur central, pas
  dans le stockage local de chaque navigateur — ça résout le problème
  vécu avec Safari et Firefox qui ne partageaient pas leurs données.
- **Sauvegarde** : Supabase effectue ses propres sauvegardes automatiques
  selon votre plan (vérifiez la politique de rétention associée à votre
  offre). Le bouton *Exporter en JSON* reste disponible pour une sauvegarde
  manuelle ponctuelle.

## Ce qui a été retiré avec cette architecture

L'ancienne version stockait tout dans `localStorage` du navigateur avec
import/export JSON et édition de fichier local (File System Access API).
Ces mécanismes n'ont plus de sens avec une base de données centrale et ont
été retirés : plus de bouton *Importer un JSON*, *Ouvrir un fichier local*
ni *Enregistrer*. Seul *Exporter en JSON* reste, comme sauvegarde manuelle
ponctuelle. La notification par email à chaque modification a également
été retirée : elle compensait la fragilité du stockage local, qui n'existe
plus — Supabase est maintenant la source de vérité durable.

## Favicon, icône et image de partage

Le dossier `assets/` contient le favicon (plusieurs tailles), l'icône
d'application (`apple-touch-icon`) et l'image Open Graph, toutes référencées
dans le `<head>` de `index.html`.

Une fois le site déployé, remplacez la valeur relative de `og:image` par
l'URL absolue de la page (ex. `https://votre-compte.github.io/boite-a-cles/assets/og-image.png`).

## Déploiement sur GitHub Pages

1. Poussez ce dossier à la racine d'un dépôt GitHub (ou dans `/docs`).
2. Complétez d'abord `js/supabase-config.js` (voir *Mise en route* ci-dessus)
   — sans ça, le site s'affiche mais ne pourra pas se connecter.
3. Dans les paramètres du dépôt → *Pages*, choisissez la branche et le
   dossier contenant `index.html`.
4. Aucune étape de build, aucune dépendance à installer côté GitHub Pages
   — seul le projet Supabase doit être configuré au préalable.

## Étendre le modèle de données

Le schéma complet (tables, contraintes, sécurité) est dans
[`supabase/schema.sql`](./supabase/schema.sql), qui fait foi. Pour
mémoire, un trousseau (table `trousseaux`) :

| Colonne | Type | Remarque |
|---|---|---|
| `id` | uuid | généré automatiquement |
| `nom` | text | |
| `type` | text | `batiment` ou `baie` |
| `crochet` | integer | 1 à 70, unique |
| `clefs` | jsonb | `[{ "id", "repere", "code" }, …]` |
| `statut` | text | `disponible` ou `emprunte` |
| `detenteur`, `date_emprunt`, `date_retour_prevue` | | remplis par les fonctions d'emprunt/retour |
| `notes` | text | |
| `historique` | jsonb | journal des actions |

Et un compte (table `profils`, rattachée à `auth.users`) :

| Colonne | Type | Remarque |
|---|---|---|
| `id` | uuid | = l'id du compte Supabase Auth |
| `nom` | text | |
| `role` | text | `admin` ou `utilisateur` |

## Compatibilité

Testé sur les navigateurs modernes (Chrome, Edge, Firefox, Safari récents).
Les boîtes de dialogue utilisent l'élément natif `<dialog>`. Nécessite une
connexion réseau vers votre projet Supabase (contrairement à la version
purement statique, qui fonctionnait hors ligne une fois chargée).
