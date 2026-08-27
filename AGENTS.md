# Instructions du projet

## Langue

- Rédiger les textes visibles dans l’application en espagnol.
- Corriger naturellement les formulations espagnoles lorsque nécessaire.

## Méthode de travail

- Avancer étape par étape.
- Créer un commit local cohérent pour chaque modification demandée.
- Ne jamais pousser sur GitHub ni publier l’application sans demande explicite.
- Ne pas inclure dans les commits les fichiers sans rapport avec la tâche.
- Préserver les modifications existantes de l’utilisateur.

## Validation

Avant chaque commit :

- exécuter les tests ;
- exécuter le typecheck et le lint ;
- vérifier le formatage ;
- vérifier le build GitHub Pages ;
- ajouter ou mettre à jour les tests correspondant au comportement modifié.

## Périmètre technique

- Le projet actuel est un prototype frontend React/Vite.
- Ne pas ajouter ou modifier le backend sans demande explicite.
- Lorsqu’une fonction backend est simulée, l’indiquer clairement dans l’interface.
- Conserver la compatibilité avec GitHub Pages et le routage par hash tant que l’hébergement ne change pas.

## Interface

- Concevoir en priorité pour mobile, puis vérifier le rendu desktop.
- Privilégier des vues compactes pour les listes volumineuses.
- Limiter le scroll inutile sans sacrifier la lisibilité.
- Éviter les boutons textuels trop encombrants lorsqu’une icône accessible suffit.
- Toujours fournir un libellé accessible aux boutons composés uniquement d’une icône.
- Maintenir une hiérarchie visuelle et des espacements cohérents.
- Tester les noms longs, les quantités importantes et les différents états métier.

## Architecture frontend

- Mutualiser les composants qui présentent ou manipulent les mêmes données.
- Garder les interactions identiques entre les vues tableau, images et page membre.
- Éviter de dupliquer les logiques de réservation, filtrage, édition et affichage.
- Séparer les pages publiques ou d’authentification du shell de l’application connectée.

## Règles produit actuelles

- L’interface est destinée à la communauté de CRC Delorean à Inca.
- La section Cartas concerne uniquement Magic: The Gathering pour le moment.
- Les échanges et paiements restent organisés librement entre les membres.
- L’accès à la communauté est privé.
- L’inscription utilise une invitation et un code OTP, sans mot de passe.
- Le parcours d’inscription reste séparé du profil connecté.
- Les inscriptions aux événements sont optionnelles et principalement réservées aux événements MTG.
- Les communications créées par le gérant alimentent la section Noticias.
- Les données du prototype sont locales et couvrent plusieurs cas réalistes.

## Git

- Utiliser des messages de commit courts et explicites avec un préfixe comme `feat:`, `fix:`, `refactor:` ou `test:`.
- Ne pas réécrire ou supprimer l’historique Git sans autorisation explicite.

## Maintenance de ces instructions

- Mettre à jour `AGENTS.md` lorsqu’une nouvelle convention durable et utile aux autres assistants est établie.
- Ne pas y ajouter les décisions temporaires, les données fictives ou les détails propres à une seule tâche.
- Garder `AGENTS.md` comme source commune et les fichiers propres à chaque assistant aussi courts que possible.
