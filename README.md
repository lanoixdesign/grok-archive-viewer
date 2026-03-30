# Grok Imagine Archive 🗄️

**Votre galerie privée pour reprendre le contrôle de vos créations Grok (xAI).**

🌐 **Accéder à l'application :** [https://lanoixdesign.github.io/grok-archive-viewer/](https://lanoixdesign.github.io/grok-archive-viewer/)

---

## 💡 Le saviez-vous ? (Pourquoi cet outil existe)

**Vos données vous appartiennent, mais elles sont parfois difficiles à lire.** Lorsque vous demandez une copie de vos données personnelles à Grok, vous recevez un gros dossier contenant des milliers de lignes de code informatique et de sous-dossiers. Pour une personne qui n'a pas l'habitude, c'est tout simplement illisible ! 

**Grok Imagine Archive est votre traducteur.**
Cet outil a été créé pour vous apporter une solution simple et visuelle. Il agit comme une lentille magique : il décode ces fichiers informatiques compliqués et les transforme instantanément en une magnifique galerie de photos, facile à parcourir depuis votre navigateur.

**Où en sont vraiment vos images supprimées ?**
Il est tout à fait normal que les systèmes informatiques ne suppriment pas les fichiers instantanément. Comme l'explique la [documentation officielle de Grok (FAQ)](https://x.ai/legal/faq), lorsque vous effacez une création, l'entreprise place le fichier dans une file d'attente et peut le conserver jusqu'à **30 jours** après votre demande de suppression. De plus, pour des raisons de sécurité (notamment pour prévenir et tracer la création de *deepfakes*), certaines images peuvent être conservées de manière sécurisée jusqu'à la fin de l'année **2026**.

Notre outil vous permet d'y voir clair : il sépare ce qui est définitivement enregistré chez vous de ce qui est encore en attente sur Internet, vous donnant ainsi le pouvoir de faire le tri sereinement.

---

## 🚀 Les bénéfices pour vous

* 🔒 **100% Privé et Sécurisé :** Vos images ne quittent jamais votre ordinateur. Tout se passe directement dans votre navigateur. Personne d'autre que vous ne peut voir votre galerie.
* ⚡ **Navigation Ultra-Fluide :** Même si vous avez généré des milliers d'images, l'application restera aussi rapide qu'à l'ouverture. Votre ordinateur ne ralentira jamais.
* 🧹 **Reprise de Contrôle :** Séparez facilement ce qui est sauvegardé sur votre ordinateur de ce qui traîne encore sur Internet.
* 📖 **Retrouvez vos idées :** Un clic sur une image vous permet de relire et de copier la phrase exacte (le "prompt") que vous aviez utilisée pour la créer.
* 📦 **Gestion Simplifiée :** Sélectionnez plusieurs images à la fois pour les télécharger sous forme de fichier `.zip` ou ouvrir leurs liens Grok respectifs en un clic.

---

## 📋 Mode d'Emploi Pas-à-Pas (Zéro stress)

> ⚠️ **Prérequis Navigateur :** Pour pouvoir ouvrir votre dossier d'archives complet, l'outil utilise une technologie récente. Veuillez utiliser **Google Chrome, Microsoft Edge, Brave ou Opera**. *(L'ouverture de dossiers n'est pas encore compatible avec Safari ou Mozilla Firefox).*

Pas besoin d'être un expert en informatique. Suivez simplement ces 3 étapes :

### Étape 1 : Récupérer votre archive officielle
1. Allez sur les paramètres de votre compte via ce lien direct : [https://accounts.x.ai/data](https://accounts.x.ai/data)
2. Connectez-vous et cliquez sur **Télécharger mes données**.
3. **Surveillez votre boîte mail :** la réception se fait par un lien cliquable pour télécharger les données. Généralement, cela prend 5 minutes maximum !

### Étape 2 : Préparer le dossier
Une fois le fichier téléchargé (il est au format `.zip`), **décompressez-le** (clic droit > "Extraire tout...") et placez le dossier obtenu où vous le souhaitez sur votre ordinateur (sur votre Bureau, par exemple).

### Étape 3 : Explorer vos souvenirs
1. Ouvrez [Grok Imagine Archive](https://lanoixdesign.github.io/grok-archive-viewer/).
2. Cliquez sur le gros bouton **🗄️ Charger Dossier** pour parcourir le dossier téléchargé, ou cliquez sur **📄 Ouvrir mon fichier d'historique** pour charger uniquement le fichier de sauvegarde `.json`. Vous pouvez également glisser-déposer votre fichier `.json` directement sur la page.
3. Sélectionnez le dossier ou le fichier que vous venez d'extraire.
4. **C'est prêt !** Naviguez, triez, téléchargez ou utilisez les boutons "🔗 VOIR SUR GROK" pour nettoyer ce qui doit l'être.

---

## 🤝 Notre Pacte de Confiance, de Transparence et RGPD

Nous avons conçu cet outil pour vous aider, dans un esprit de communauté et de bienveillance. La protection de votre vie privée est notre priorité absolue.

* **Conformité RGPD totale (Zéro collecte) :** Puisque tout fonctionne en vase clos sur votre machine, **nous ne collectons, ne stockons et ne revendons absolument aucune de vos données personnelles.** Il n'y a pas de création de compte, pas de mot de passe, et nous n'utilisons aucun traceur (cookie) publicitaire ou analytique pour vous espionner.
* **Le bouton "Déconnexion" 🚪 :** Si vous utilisez l'ordinateur de la famille ou du bureau, ouvrez le "Menu principal" (⚙️ Menu) et cliquez sur **🚪 Fermer la session (Déconnexion)** quand vous avez terminé. Cela effacera instantanément toutes les données de session de la mémoire de ce navigateur.
* **Notre engagement :** Cet outil est indépendant, gratuit et transparent (Open Source). Il n'est pas affilié à l'entreprise xAI ou à Grok. 
* **Responsabilité partagée :** L'outil vous montre le chemin, mais vous restez le seul pilote de vos données. Les suppressions définitives que vous choisissez de faire sur le site officiel de Grok vous appartiennent. L'outil vous est fourni avec passion pour vous aider, tel quel, pour faciliter votre gestion personnelle.

---
*Si cette interface vous a permis de sécuriser vos données et d'y voir plus clair, vous pouvez soutenir le développeur en offrant un ☕️ via le bouton dédié dans l'application.*

---
---

## ⚙️ Pour les experts et la communauté technique (Sous le capot)

*Cette section est destinée aux développeurs et aux curieux qui souhaitent comprendre la mécanique de l'outil.*

Pour garantir l'expérience utilisateur et la conformité Privacy-by-Design décrites plus haut, l'application repose sur une architecture stricte et moderne :

* **Architecture 100% Client-Side (No-Backend) :** En conformité stricte avec les principes du RGPD, l'application n'agit pas en tant que responsable de traitement. Aucune API tierce, aucune base de données distante n'est utilisée. Le parsing du `prod-grok-backend.json` et des dossiers `prod-mc-asset-server` se fait intégralement dans le DOM via l'API *File System Access* (nécessitant Chromium), garantissant un sandboxing total.
* **Performances & Lazy Loading :** L'affichage de la grille utilise l'API *Intersection Observer* et un défilement infini (*Infinite Scroll*) par paquets (chunks). Le DOM n'est jamais surchargé, garantissant une empreinte RAM minimale (prévention des fuites mémoire). Les vidéos et les images hors écran sont déchargées (`video.removeAttribute('src')`, `content-visibility: auto`).
* **Persistance d'état (IndexedDB) :** Les sessions (`rootHandle`, `importedAssets`), les états de lecture (`visitedSet`, `viewedSet`) et les sélections (`selectedSet`) sont mis en cache localement via *IndexedDB* pour permettre à l'utilisateur de reprendre son tri sans recharger les données de l'archive.
* **Résilience des ressources (Fallback URLs) :** Implémentation d'un système de repli silencieux. Si un blob local ou une URL distante CDN (`/images/`) renvoie une erreur, le script tente automatiquement un routage vers l'URL de partage (`/share-images/`), puis tente d'afficher un média parent (même prompt) ou se rabat sur la version vidéo avant de déclarer l'asset expiré ou mort.
* **Gestion en masse (Batch processing) :** Création d'archives ZIP locales à la volée via la mémoire vive du navigateur (`JSZip`) pour l'exportation des sélections multiples de la grille.

**N'hésitez pas à proposer vos *Pull Requests* ou à ouvrir des *Issues* pour faire évoluer l'outil !**
