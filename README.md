# MTG Community

Prototype de webapp mobile-first pour organiser une communauté locale de
joueurs de Magic: The Gathering autour d'une boutique ou d'un bar à jeux.

## Problème

La communauté pilote échange aujourd'hui principalement dans un groupe
WhatsApp d'environ 150 membres. Ce canal reste utile pour les discussions
spontanées, mais les informations importantes sont rapidement noyées :

- les événements et leurs modalités deviennent difficiles à retrouver ;
- les actualités de la boutique se perdent entre les conversations ;
- les offres et recherches de cartes sont temporaires ;
- les joueurs ne peuvent pas rapprocher automatiquement leurs listes.

L'application a vocation à compléter WhatsApp avec un espace structuré et
persistant.

## Objectif du prototype

Le prototype doit permettre de tester la valeur de trois piliers :

1. les événements et la vie de la communauté ;
2. les actualités et communications de la boutique ;
3. la vente, la recherche et l'échange de cartes entre joueurs.

Il doit être suffisamment réaliste pour être présenté au gérant et testé par
quelques joueurs, sans nécessiter de backend.

## Utilisateurs

### Joueur

- consulte les événements et s'y inscrit ;
- suit les actualités correspondant à ses tags ;
- publie des cartes proposées ou recherchées ;
- consulte ses correspondances avec les autres membres.

### Gérant

- publie les événements et communications ;
- limite les places et supervise la liste d'attente ;
- gère les présences, résultats et classements ;
- administre les tags de la communauté.

### Modérateur

- valide les nouveaux membres ;
- aide à modérer les contenus ;
- peut assister le gérant selon les permissions accordées.

## Parcours prioritaires

Le prototype doit démontrer quatre parcours complets :

1. un joueur consulte un événement et s'inscrit ;
2. un joueur ajoute une carte recherchée et trouve une correspondance ;
3. le gérant publie une actualité ciblée par tags ;
4. le gérant importe fictivement une photo de résultats, vérifie les données
   simulées et publie le classement.

## Navigation principale

L'interface du prototype sera d'abord proposée en espagnol :

- `Inicio`
- `Eventos`
- `Cartas`
- `Noticias`
- `Perfil`

L'accueil mettra en avant :

- le prochain événement ;
- la dernière actualité importante ;
- les nouvelles correspondances de cartes.

## Périmètre technique du prototype

- webapp responsive pensée d'abord pour le téléphone ;
- données de démonstration en espagnol ;
- stockage dans le navigateur ;
- sélection locale d'un rôle de démonstration ;
- aucune donnée partagée entre plusieurs appareils ;
- possibilité de restaurer les données initiales.

## Hors périmètre initial

Les éléments suivants ne seront pas développés dans la première version :

- backend et base de données distante ;
- authentification réelle ;
- paiement ou commission ;
- messagerie entre joueurs ;
- notifications push ;
- reconnaissance réelle des résultats depuis une photo ;
- estimation automatique du prix des cartes ;
- synchronisation du catalogue complet des cartes ;
- gestion opérationnelle de plusieurs boutiques.

## Boutique d'abord, ville ensuite

Le pilote est centré sur une boutique afin de bénéficier d'une communauté
existante, d'un responsable identifié et d'un lieu de rencontre.

La structure du produit doit néanmoins permettre à terme :

- à un joueur de posséder un compte indépendant d'une boutique ;
- de rejoindre plusieurs communautés ;
- de rattacher chaque événement à un établissement ;
- d'étendre la visibilité d'une annonce à une ville ;
- d'agréger les événements publics de plusieurs boutiques.

La boutique constitue donc le cœur de la communauté. La ville pourra devenir
ensuite un niveau de découverte et de mise en relation.

## Démarrage local

Prérequis : une version récente de Node.js et npm.

```bash
npm install
npm run dev
```

Vite affiche ensuite l'adresse locale à ouvrir dans le navigateur.

## Contrôles disponibles

```bash
# Typage, lint, tests et formatage
npm run check

# Compilation de production
npm run build

# Prévisualisation de la compilation
npm run preview
```

## Questions ouvertes

Les décisions qui restent à prendre sont regroupées dans
[`questions-ouvertes.txt`](./questions-ouvertes.txt).
