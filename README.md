# Grok Imagine Archive 🗄️

**Grok Imagine Archive** est une application web statique et sécurisée conçue pour visualiser, filtrer et gérer les archives de générations d'images et de vidéos issues de **Grok (xAI)**.

## 🌟 La "Puissance" de l'Outil : Accéder aux Archives Fantômes

L'atout majeur de cette application réside dans sa capacité à recréer un pont entre vos fichiers locaux et le cloud de xAI. À ses débuts, l'interface de **Grok Imagine** ne permettait pas de supprimer définitivement les posts ; ils restaient stockés dans la base de données même après avoir été retirés des favoris.

Cet outil vous permet de :
1.  **Exhumer l'invisible** : Retrouver les liens directs de tous les posts "engloutis" ou devenus des "fantômes" (ceux qui n'apparaissent plus dans votre historique officiel sur le site).
2.  **Navigation Chirurgicale** : En cliquant sur un lien dans l'interface, vous arrivez directement sur la page du post original sur Grok pour le gérer ou le supprimer définitivement.

> **💡 Conseil d'utilisation :** Pour une efficacité maximale, utilisez l'application sur le **même navigateur** où votre session Grok est active. Cela permet d'accéder instantanément à vos archives fantômes sur le site officiel sans reconnexion.

## 🚀 Fonctionnalités

* **Chargement Automatisé** : Analyse récursive du dossier `prod-mc-asset-server` et des fichiers JSON (`auth`, `billing`, `grok-backend`).
* **Suppression Groupée** : Sélectionnez plusieurs fichiers locaux et supprimez-les physiquement de votre disque dur en une seule action via l'API *File System Access*.
* **Interface Mobile-Friendly** : Cases à cocher agrandies et zones tactiles optimisées pour une utilisation confortable sur smartphone et tablette.
* **Système de Suivi** : Distinction visuelle entre les médias **"Vus"** (dans la lightbox) et **"Visités"** (lien Grok cliqué).
* **Anonymisation** : Affichage sécurisé des données de profil avec masquage partiel de l'email et des sessions.

## 🔒 Confidentialité & Sécurité

**Vos données ne quittent jamais votre ordinateur.**
* Le site fonctionne à 100% localement dans votre navigateur.
* L'API *File System Access* lit vos fichiers vers la mémoire vive, mais aucune donnée n'est envoyée vers un serveur externe.
* Le code est transparent et hébergé de manière statique sur GitHub Pages.

## 🛠️ Utilisation

1.  Téléchargez votre archive de données depuis les paramètres de votre compte Grok.
2.  Décompressez le fichier `.zip`.
3.  **Connectez-vous à votre compte Grok** sur votre navigateur.
4.  Ouvrez l'application **Grok Imagine Archive**.
5.  Cliquez sur **"🗄️ Charger Archive Grok"** et sélectionnez le dossier racine de votre archive décompressée.

## ⚖️ Licence

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissement (Disclaimer)

Cet outil est un **lecteur d'archives local**. Il n'est pas affilié à xAI.
* **Suppression Cloud** : L'outil supprime les fichiers de votre ordinateur, mais la suppression sur les serveurs de xAI doit être faite manuellement sur leur site via les liens fournis.
* **Responsabilité** : L'auteur n'est pas responsable des suppressions accidentelles de fichiers sur votre disque dur.

---
*Développé pour la communauté Grok Imagine. Si cet outil vous a aidé, n'hésitez pas à offrir un 🇫🇷☕️ via le bouton dédié !*
