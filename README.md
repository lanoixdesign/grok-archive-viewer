# Grok Imagine Archive 🗄️

**Grok Imagine Archive** est une application web statique et sécurisée conçue pour visualiser, filtrer et gérer les archives de générations d'images et de vidéos issues de **Grok (xAI)**.

## 🌟 Pourquoi cet outil ?

Cette application a été créée pour résoudre un problème spécifique aux premières versions de **Grok Imagine**. À son lancement, l'interface ne permettait pas de supprimer les posts générés ; les utilisateurs pouvaient seulement les retirer de leurs favoris, mais les fichiers restaient stockés dans la base de données de Grok.

Cet outil permet donc de :
1. **Retrouver les "Archives Fantômes"** : Accéder aux anciens posts qui n'apparaissent plus dans l'interface actuelle mais qui sont toujours présents dans vos archives de données.
2. **Nettoyage Ciblé** : Identifier précisément ces anciens contenus pour pouvoir les supprimer définitivement de votre ordinateur et de votre historique via les nouvelles options de Grok.

## 🚀 Fonctionnalités

* **Chargement Automatisé** : Analyse récursive du dossier `prod-mc-asset-server` et des fichiers JSON de configuration (`auth`, `billing`, `grok-backend`).
* **Suppression Groupée Localisée** : Sélectionnez plusieurs fichiers et supprimez-les physiquement de votre disque dur en une seule action (via l'API *File System Access*).
* **Navigation Optimisée** : Une Lightbox fluide pour visionner vos médias plein écran, avec des contrôles adaptés au clavier et au tactile.
* **Interface Mobile-Friendly** : Cases à cocher agrandies et zones tactiles optimisées pour une utilisation confortable sur smartphone et tablette.
* **Système de Suivi** : Distinction visuelle entre les médias **"Vus"** (ouverts dans la lightbox) et **"Visités"** (lien source Grok consulté).
* **Anonymisation** : Affichage sécurisé des données de profil (masquage partiel de l'email et des sessions).

## 🔒 Confidentialité & Sécurité

**Vos données ne quittent jamais votre ordinateur.**
* Le site fonctionne à 100% localement dans votre navigateur.
* L'API *File System Access* lit vos fichiers vers la mémoire vive, mais aucune donnée n'est envoyée vers un serveur externe.
* Le code est transparent et hébergé de manière statique sur GitHub Pages.

## 🛠️ Utilisation

1. Téléchargez votre archive de données depuis les paramètres de votre compte Grok.
2. Décompressez le fichier `.zip`.
3. Ouvrez l'application **Grok Imagine Archive**.
4. Cliquez sur **"🗄️ Charger Archive Grok"** et sélectionnez le dossier racine de votre archive décompressée.
5. Cochez les éléments souhaités pour les exporter en JSON ou les supprimer de votre ordinateur.

## ⚖️ Licence

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissement (Disclaimer)

Cet outil est un **lecteur d'archives local**. Il n'est pas affilié à xAI.
* **Suppression** : L'outil supprime les fichiers de votre ordinateur, mais pas directement des serveurs de xAI. Utilisez les outils officiels de Grok pour la suppression cloud une fois les IDs identifiés ici.
* **Responsabilité** : L'auteur n'est pas responsable des suppressions accidentelles de fichiers sur votre disque dur.

---
*Développé pour la communauté Grok Imagine. Si cet outil vous a aidé, n'hésitez pas à offrir un 🇫🇷☕️ via le bouton dédié !*