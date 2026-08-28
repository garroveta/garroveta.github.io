# Contrat fonctionnel — Invitations individuelles par QR code

Statut : validé pour le pilote
Date : 28 août 2026

## 1. Objectif

Permettre à un gérant de créer une invitation individuelle sous forme de QR
code. Le joueur scanne le QR, confirme son adresse e-mail par OTP et rejoint
immédiatement la communauté comme joueur approuvé.

L'invitation constitue l'autorisation du gérant. Aucune validation manuelle
supplémentaire n'est demandée après la vérification OTP.

## 2. Périmètre du pilote

- Une invitation autorise une seule personne à rejoindre une seule communauté.
- L'invitation n'est liée à aucun e-mail avant son utilisation.
- Elle crée toujours une adhésion avec le rôle `player` et le statut `approved`.
- Seul un membre approuvé ayant le rôle `manager` peut créer, consulter ou
  révoquer des invitations.
- Le modèle doit permettre à terme qu'un compte appartienne à plusieurs
  communautés, même si le pilote ne présente qu'une communauté.
- Les modérateurs ne peuvent pas gérer les invitations dans le pilote.

## 3. URL publique

Le QR code encode exactement une URL de cette forme :

```text
https://garroveta.es/#registro?invite=TOKEN
```

L'environnement local utilise :

```text
http://localhost:5173/#registro?invite=TOKEN
```

La route `#registro` doit fonctionner lors d'une navigation directe et après
actualisation, conformément au routage par hash du prototype.

Après lecture du paramètre `invite`, le navigateur :

1. vérifie que son format est plausible ;
2. le conserve temporairement dans `sessionStorage` pour le parcours courant ;
3. remplace l'URL affichée par `#registro` avec `history.replaceState` ;
4. le supprime de `sessionStorage` après consommation ou erreur terminale.

La page applique une politique `Referrer-Policy: no-referrer`. Le token ne doit
être envoyé à aucun outil d'analytics, journal client ou service tiers.

## 4. Propriétés de l'invitation

Chaque invitation possède :

- un identifiant interne non secret ;
- la communauté concernée ;
- un token secret ;
- le membre gérant qui l'a créée ;
- une date de création ;
- une date d'expiration ;
- une date de révocation et son auteur, le cas échéant ;
- une date de consommation et l'utilisateur bénéficiaire, le cas échéant ;
- un libellé facultatif destiné au gérant.

Le libellé ne contient pas de donnée sensible. Il peut servir à distinguer les
invitations, par exemple « FNM du 28 août » ou « Invitation Marina ».

## 5. Token et confidentialité

- Le token est produit avec un générateur cryptographiquement sûr.
- Il contient 32 octets aléatoires et est encodé en Base64 URL sans padding.
- Le token en clair apparaît uniquement dans la réponse de création, le lien et
  le QR initial.
- D1 conserve uniquement son hash SHA-256.
- Les listes, logs, erreurs et événements de suivi n'exposent jamais le token,
  même partiellement.
- Une invitation existante ne peut pas être réaffichée ou récupérée depuis D1.
  Si le lien est perdu, le gérant révoque éventuellement l'invitation et en crée
  une nouvelle.

## 6. Durée

- La durée par défaut est de 30 jours.
- Le gérant peut choisir une durée entière comprise entre 1 et 90 jours.
- Une invitation sans expiration n'est pas autorisée dans le pilote.
- Les dates sont enregistrées et comparées en UTC.
- Une invitation expire dès que l'heure courante atteint `expiresAt`.

## 7. États et transitions

Les états fonctionnels sont :

- `active` : utilisable ;
- `used` : consommée par un utilisateur ;
- `revoked` : annulée par un gérant ;
- `expired` : date d'expiration atteinte.

Transitions autorisées :

```text
création -> active
active   -> used
active   -> revoked
active   -> expired
```

`used`, `revoked` et `expired` sont terminaux. Une invitation terminale ne peut
pas être réactivée.

L'état `expired` est déduit de `expiresAt`. La révocation et la consommation
reposent sur leurs horodatages respectifs. Une invitation déjà utilisée ou
expirée ne peut pas être révoquée.

## 8. Parcours gérant

Le gérant peut :

1. choisir un libellé facultatif et une durée entre 1 et 90 jours ;
2. générer une invitation ;
3. afficher immédiatement son QR et copier ou télécharger son lien ;
4. consulter la liste des invitations sans voir leurs tokens ;
5. filtrer la liste par état ;
6. révoquer une invitation active après confirmation.

La création ne peut pas être rejouée automatiquement par le client en cas
d'incertitude réseau, car elle produirait plusieurs invitations. Le gérant doit
alors actualiser la liste, révoquer l'éventuelle invitation dont le lien n'a pas
été reçu, puis en créer une nouvelle.

## 9. Parcours joueur

Le parcours nominal est :

1. le joueur scanne le QR ;
2. l'application valide l'invitation et affiche le nom de la communauté ;
3. le joueur saisit son nom visible, son e-mail et ses préférences ;
4. l'application envoie un OTP à cette adresse ;
5. le joueur saisit l'OTP ;
6. Better Auth ouvre une session et confirme l'adresse e-mail ;
7. l'application consomme immédiatement l'invitation avec le profil saisi ;
8. l'adhésion `player` et `approved` est créée ;
9. l'application confirme l'accès et retire toute copie locale du token.

Un compte Better Auth existant suit le même parcours OTP. Aucun mot de passe
n'est demandé.

Si le navigateur est fermé avant la consommation, l'invitation reste active.
Le joueur peut rescanner le QR et reprendre le parcours tant qu'elle est valide.

## 10. Adhésions existantes

Les règles suivantes s'appliquent lors de la consommation :

- aucune adhésion : créer une adhésion `player` et `approved`, puis consommer
  l'invitation ;
- adhésion `pending` : la passer à `approved`, puis consommer l'invitation ;
- adhésion `approved` : répondre `already_member` sans consommer l'invitation ;
- adhésion `suspended` : répondre `membership_suspended` sans réactiver le
  membre et sans consommer l'invitation.

Une invitation ne peut jamais donner le rôle `manager` ou `moderator`, modifier
un rôle existant ou contourner une suspension.

## 11. Concurrence et idempotence

La consommation est atomique :

- la première consommation valide gagne ;
- deux utilisateurs ne peuvent jamais bénéficier de la même invitation ;
- une tentative ultérieure par un autre utilisateur reçoit `used` ;
- si la réponse réseau de la première consommation est perdue, le même
  utilisateur peut relancer la demande et reçoit le même résultat de succès ;
- aucune relance ne crée une deuxième adhésion.

Le bénéficiaire d'une invitation utilisée n'est jamais révélé publiquement.

## 12. Résultats présentés au joueur

La validation publique peut produire :

- `active` : poursuivre l'inscription ;
- `invalid` : lien non reconnu ou mal formé ;
- `expired` : invitation expirée ;
- `revoked` : invitation annulée ;
- `used` : invitation déjà utilisée.

Après authentification, la consommation peut également produire :

- `success` : accès activé ;
- `already_member` : compte déjà membre de la communauté ;
- `membership_suspended` : accès suspendu, contacter le gérant ;
- `authentication_required` : session absente ou expirée ;
- `profile_invalid` : nom ou préférences invalides.

Les réponses publiques ne contiennent ni e-mail, ni identité du créateur ou du
bénéficiaire, ni identifiant interne exploitable.

## 13. Autorisation et protections

- La validation publique est accessible sans session, mais limitée en débit.
- La consommation exige une session Better Auth issue d'un OTP valide.
- La création, la liste et la révocation exigent une session et une adhésion
  `manager` approuvée dans la communauté ciblée.
- Le serveur ne fait jamais confiance au rôle, à la communauté ou à l'identité
  transmis par le client.
- Les erreurs d'authentification ne permettent pas de déterminer si un e-mail
  possède déjà un compte.
- Les opérations importantes sont journalisées par identifiants internes :
  création, révocation, consommation et refus pour état terminal.

## 14. Critères d'acceptation

Le contrat est respecté lorsque :

1. un gérant approuvé peut créer une invitation de 30 jours par défaut ;
2. il peut choisir une durée comprise entre 1 et 90 jours ;
3. le QR ouvre directement `#registro?invite=TOKEN`, y compris après
   actualisation de la page ;
4. le token disparaît de la barre d'adresse après sa lecture ;
5. D1 ne contient jamais le token en clair ;
6. un non-gérant ne peut ni créer, ni lister, ni révoquer une invitation ;
7. un joueur possédant un QR actif peut terminer le parcours uniquement avec un
   OTP valide ;
8. la consommation crée ou approuve exactement une adhésion `player` ;
9. l'accès est actif immédiatement sans validation manuelle ;
10. un QR ne peut activer qu'un seul utilisateur ;
11. une relance du même utilisateur après une erreur réseau ne crée aucun
    doublon et retourne un succès ;
12. une invitation expirée, révoquée ou utilisée est refusée ;
13. un membre suspendu ne peut pas contourner sa suspension avec un QR ;
14. un membre déjà approuvé ne consomme pas inutilement l'invitation ;
15. le token n'apparaît ni dans les listes gérant, ni dans les logs, ni dans les
    outils d'analytics ;
16. une invitation perdue ne peut pas être récupérée et doit être remplacée ;
17. tous les messages joueur sont compréhensibles sur mobile et accessibles au
    clavier et aux lecteurs d'écran ;
18. les cas nominaux, les états terminaux et les consommations concurrentes sont
    couverts par des tests automatisés.
