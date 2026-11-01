# Propositions PA – Pamiers Automobiles

Application web (PWA) pour créer en quelques minutes des propositions tarifaires de pièces détachées (batteries, freinage, AdBlue, pneus…) pour les garages et réparateurs, depuis le téléphone ou le PC.

**Lien de l'application :** https://valentinj31.github.io/propositions-pa/

## 🔒 Confidentialité
- Aucun serveur, aucun compte. **Vos prix, clients et offres restent uniquement dans le navigateur de votre appareil** (stockage local).
- Le dépôt GitHub ne contient que le code de l'application et un petit jeu d'exemple **fictif**. Ne déposez jamais de fichier de sauvegarde ou de catalogue dans le dépôt.
- Le fichier `.gitignore` bloque les fichiers `.csv`, `.json` de sauvegarde et les `.pdf`.

## Mode d'emploi rapide
1. **Installer** : ouvrez le lien sur votre téléphone.
   - Android (Chrome) : menu ⋮ → « Installer l'application ».
   - iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».
   Ensuite, l'application fonctionne aussi hors connexion.
2. **Réglages** (⚙️) : ajoutez votre logo, les coordonnées de l'entreprise, vos coordonnées de vendeur, les mentions légales du PDF, le taux de TVA (20 % par défaut) et les conditions par défaut. Appuyez sur « Enregistrer ».
3. **Effacer les exemples** : Réglages → « Effacer les données d'exemple » (tout ce qui porte le badge *exemple*).
4. **Catalogue** (📦) : ajoutez vos produits un par un, ou préparez-les dans Excel :
   - « Modèle CSV vide » télécharge un fichier avec les bonnes colonnes :
     `reference;designation;marque;categorie;prix_public_ht;prix_vente_ht;unite;prix_agent_ht`
     (`prix_vente_ht` = prix MRA ; `prix_agent_ht` facultatif = prix agent / PNA ; colonne facultative `info_interne` = note interne, par ex. le stock, visible seulement dans l'application et jamais sur le PDF ni dans les textes envoyés)
   - Dans Excel, enregistrez au format **CSV (séparateur point-virgule)**, puis « Importer un CSV ».
   - Choisissez **Fusionner** (met à jour les mêmes références, ajoute les nouvelles) ou **Remplacer tout**.
   - Catégories : `batterie`, `freinage`, `adblue`, `pneus`, `huiles` (huiles & liquides), `autre`.
5. **Clients** (👥) : nom du garage, contact, téléphone, email, ville, remise habituelle en %.
   Chaque client a un **tarif** : « MRA / réparateur » (prix de vente standard) ou « Agent » (prix agent, PNA). Dans une offre, les produits sont proposés au tarif du client choisi ; si vous changez de client, les lignes restées au prix catalogue basculent automatiquement.
   Import / export CSV possible aussi (colonnes `nom;contact;telephone;email;ville;remise;tarif;notes`, tarif = `agent` ou `mra`) : un client déjà présent (même nom et même ville) est mis à jour.
6. **Nouvelle offre** (📄) :
   - choisissez le client (sa remise habituelle s'applique en remise globale) ;
   - « Ajouter des produits » : tapez une référence ou un mot-clé (ex. « plaq av », « adblue »), touchez un produit pour l'ajouter (un 2e appui ajoute +1) ;
   - réglez les quantités, le prix et la remise par ligne, ou la remise globale ;
   - le total HT, la TVA, le TTC et **l'économie par rapport au prix public** se calculent tout seuls ;
   - complétez la date, la validité, le port (franco…), le délai de livraison et un message.
   L'offre est enregistrée automatiquement à chaque modification.
7. **Envoyer** :
   - **PDF** : télécharge le PDF professionnel ;
   - **Partager le PDF** (téléphone) : joint le PDF directement dans Gmail, WhatsApp, Outlook… ;
   - **Envoyer par email** : ouvre votre messagerie avec l'objet et le texte détaillé déjà remplis (la pièce jointe PDF est à ajouter à la main : utilisez plutôt « Partager le PDF » sur téléphone) ;
   - **Texte SMS / WhatsApp** : résumé court ou détaillé, à copier ou à envoyer en un appui.
   L'offre passe en « Envoyée » quand vous utilisez un de ces boutons d'envoi.
8. **Historique** : la liste des offres se filtre par client, par statut ou par recherche. La fiche d'un client montre toutes ses offres ; le bouton ⧉ **duplique** une ancienne offre (avec les prix du catalogue actuel ou les anciens prix).
9. **Modèles** (⭐) : « Pack freinage », « AdBlue x20 »… Créez-les depuis l'onglet Modèles ou depuis une offre (« Enregistrer comme modèle »), puis démarrez une offre en un appui.

## 💾 Sauvegarde (important)
Les données sont liées au navigateur de l'appareil : si vous effacez les données du navigateur ou changez de téléphone, elles disparaissent.
- Réglages → **Sauvegarder tout** télécharge un fichier `sauvegarde-propositions-AAAA-MM-JJ.json` (catalogue, clients, offres, modèles, réglages, logo).
- Réglages → **Restaurer une sauvegarde** recharge ce fichier, par exemple pour passer du téléphone au PC.
- Un rappel s'affiche si la dernière sauvegarde date de plus de 30 jours.
- Gardez ces fichiers dans un espace privé (Drive personnel, PC), **jamais dans le dépôt GitHub**.

## Publication avec GitHub Pages
1. Créez un dépôt (ex. `propositions-pa`) et envoyez-y le contenu de ce dossier.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : « Deploy from a branch »**, branche `main`, dossier `/ (root)` → Save.
3. Après une à deux minutes, l'application est en ligne sur `https://VOTRE-COMPTE.github.io/propositions-pa/`.

Le dépôt peut être public : il ne contient aucune donnée réelle. Le code n'utilise aucun service externe ; la librairie PDF (jsPDF) est incluse dans `vendor/`.

## Technique
HTML/CSS/JavaScript sans framework ni étape de compilation. `app.js` contient l'interface, les calculs et le stockage, `pdf.js` le PDF (jsPDF + jspdf-autotable, licence MIT), `demo.js` les exemples fictifs et `sw.js` le mode hors ligne. Pour tester en local : `python3 -m http.server` dans le dossier, puis http://localhost:8000.
