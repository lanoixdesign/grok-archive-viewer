# Grok Imagine Archive 🗄️

**Votre interface d'audit visuel et de gestion locale pour les générations Grok (xAI).**

Grok Imagine Archive est une application web statique, fonctionnant en vase clos, conçue pour vous redonner le contrôle et la lisibilité sur vos archives de données personnelles exportées depuis Grok.

🌐 **Accéder à l'application :** [https://lanoixdesign.github.io/grok-archive-viewer/](https://lanoixdesign.github.io/grok-archive-viewer/)

---

## 📋 Mode d'Emploi Sécurisé

1. **Requête de données :** Réclamez votre archive officielle via [Grok Data](https://accounts.x.ai/data).
2. **Extraction :** Décompressez l'intégralité de l'archive `.zip` sur un espace de stockage local de votre ordinateur.
3. **Analyse Locale :** Lancez Grok Imagine Archive, cliquez sur **🗄️ Charger Dossier** et pointez vers la racine de votre archive.
4. **Action et Purge :** Inspectez vos médias. Pour purger définitivement une archive latente du Cloud, utilisez le bouton **🔗 VOIR SUR GROK** pour appliquer la suppression depuis votre espace utilisateur officiel.

---

## 🛡️ Transparence et Pédagogie : Reprendre le contrôle de ses données

### 1. Démystifier la « Boîte Noire »
L'exportation légale de vos données Grok se présente sous la forme d'une archive brute (fichiers JSON complexes et dossiers imbriqués), souvent inexploitable pour un utilisateur non averti. **Grok Imagine Archive a été conçu dans une démarche stricte de transparence.** Il agit exclusivement comme un **pont de lecture local** : une interface qui traduit votre propre « plan cadastral » numérique en une galerie visuelle claire et structurée. L'outil vous restitue simplement la lisibilité sur les données qui vous appartiennent déjà.

### 2. Le standard industriel du « Soft Delete » (Archives Latentes)
Il est tout à fait normal de retrouver dans votre archive des images que vous pensiez avoir supprimées. Dans l'industrie technologique, supprimer définitivement une donnée de manière isolée (requête par requête) est extrêmement coûteux en ressources serveurs. 
* **La mise en file d'attente :** Les plateformes privilégient le *Soft Delete* (suppression logique). L'image disparaît de votre interface utilisateur habituelle, mais reste conservée dans une file d'attente (base de données) en vue d'une purge globale et massive ultérieure.
* **L'évolution de la plateforme :** Dans les premières versions de Grok, les médias ne pouvaient pas être supprimés ; ils étaient simplement "retirés des favoris" et restaient stockés. Aujourd'hui, en 2026, Grok propose de véritables fonctions de suppression natives.

**Notre valeur ajoutée :** Grok Imagine Archive met en lumière cette portion de l'internet toujours active. L'outil identifie ces médias latents, vous permettant d'utiliser les nouvelles fonctionnalités de xAI pour enfin finaliser leur suppression définitive et exercer votre droit à l'oubli.

---

## 🚀 Fonctionnalités Professionnelles

* **Audit Visuel et Restitution :** Interface ergonomique, pensée pour le mobile, avec un menu rétractable (`⬆️ / ⬇️`) pour explorer facilement des milliers d'images et de vidéos.
* **Gestion Chirurgicale des Méta-données :** Modale de lecture avancée permettant de consulter l'intégralité de vos "prompts" (commandes textuelles) originaux, avec possibilité d'exportation sécurisée au format `.txt`.
* **Nettoyage Cloud Ciblé :** Grâce à la génération de liens directs, l'outil vous redirige vers la source exacte sur les serveurs de Grok. Vous pouvez ainsi déclencher la suppression manuelle via l'interface officielle en toute conformité.
* **Performance et Éco-conception :** Optimisation stricte de la mémoire vive (RAM) via *Lazy Loading* (chargement différé) et limitation du rendu graphique pour les machines modestes.
* **Souveraineté et Sécurité :** Traitement 100 % local (*Client-side*). Aucune donnée, aucune image, ni aucun identifiant ne transite par un serveur tiers.

---

## 🔒 Sécurité et Fin de session
Si vous utilisez un ordinateur partagé, pensez à cliquer sur l'icône **🧹 (Effacer Session)** dans l'en-tête lorsque vous avez terminé. Cela supprimera l'accès au dossier, votre historique de vues et vos informations mises en cache dans la base de données locale du navigateur (IndexedDB).

## ⚖️ Mentions Légales et Limitation de Responsabilité

**Indépendance stricte :** Ce projet est un outil tiers, indépendant et open-source. Il n'est en aucun cas affilié, sponsorisé, endossé ou validé par xAI ou Grok. L'utilisation de la plateforme Grok pour la suppression de vos données reste soumise à leurs propres conditions générales d'utilisation.

**Licence et Garanties :** Ce logiciel est fourni "en l'état" (« AS IS »), sans aucune garantie expresse ou implicite de quelque nature que ce soit. En aucun cas les auteurs ne pourront être tenus responsables de tout dommage ou réclamation découlant de l'utilisation de ce logiciel, y compris la perte de données locales ou les modifications appliquées à votre compte tiers.

---
*Outil développé avec passion pour la communauté. Si cette interface vous a permis de sécuriser vos données, vous pouvez soutenir le projet en offrant un 🇫🇷☕️ via le bouton dédié de l'application.*
Grok conserve souvent dans ses bases de données des créations même après qu'elles aient été retirées de vos favoris, une pratique appelée suppression logique ou *soft delete*. 
* **Exhumer l'invisible** : Retrouvez les liens directs de tous les posts "engloutis" qui n'apparaissent plus dans votre historique web officiel.
* **Navigation Chirurgicale** : L'outil génère une URL spécifique permettant d'accéder aux coordonnées exactes du serveur où le "fantôme" est encore stocké.

---

## 🚀 Fonctionnalités Clés

* **Interface Épurée & Rétractable** : Un tableau de bord divisé en 3 zones claires et fixé en haut de l'écran. Un bouton "Menu" (`⬆️ / ⬇️`) permet de masquer la barre d'outils pour maximiser l'espace d'affichage.
* **Lecture & Téléchargement des Prompts** : Une modale dédiée permet de lire le prompt intégral avant de décider de le copier ou de le télécharger en fichier `.txt`.
* **Suppression Réelle & Chirurgicale** : 
    * **Local** : Grâce à l'API *File System Access*, supprimez définitivement les dossiers d'assets sur votre disque dur directement depuis l'interface.
    * **Cloud (Grok)** : Pour supprimer réellement un média sur les serveurs de xAI, utilisez le lien direct généré pour accéder à la page source et effectuez la suppression manuelle sur leur plateforme.
* **Optimisation Vidéo & RAM** : Les vidéos utilisent le *Lazy Loading*. Un bouton **Autoplay** permet de bloquer la lecture automatique pour économiser la mémoire et les ressources de votre appareil.
* **Confidentialité Totale** : Le script tourne à 100% dans votre navigateur, fonctionnant en "vase clos". Aucune donnée n'est envoyée vers un serveur tiers.

---

## 🛠️ Guide d'Utilisation

1. **Demandez votre archive** : Rendez-vous sur [Grok Data](https://accounts.x.ai/data) pour solliciter vos données.
2. **Préparez l'archive** : Décompressez impérativement le fichier `.zip` sur votre ordinateur.
3. **Lancez l'outil** : Ouvrez l'application et cliquez sur **🗄️ Charger Dossier** pour sélectionner le dossier racine de votre archive décompressée.
4. **Explorez & Nettoyez** : Parcourez vos images et utilisez la navigation chirurgicale (bouton **🔗 VOIR SUR GROK**) pour gérer vos archives fantômes côté serveur.

---

## 🔒 Sécurité et Fin de session
Si vous utilisez un ordinateur partagé, pensez à cliquer sur l'icône **🧹 (Effacer Session)** dans l'en-tête. Cela supprimera définitivement l'accès au dossier, votre historique de vues et vos informations de profil mises en cache dans la base de données locale du navigateur (IndexedDB).

## ⚖️ Avertissement
Cet outil est un lecteur d'archives strictement local et indépendant. Il n'est pas affilié, sponsorisé ou validé par xAI ou Grok. La suppression sur le Cloud de Grok doit obligatoirement être effectuée manuellement par l'utilisateur sur le site officiel de xAI.

---
**Développé pour la communauté Grok Imagine. Si cet outil vous a aidé, n'hésitez pas à offrir un 🇫🇷☕️ via le bouton dédié !**
