# Grok Imagine Archive 🗄️

**Grok Imagine Archive** est une application web statique et sécurisée conçue pour visualiser, filtrer et gérer les archives de générations d'images et de vidéos issues de **Grok (xAI)**.

## 🌟 Pourquoi cet outil ?

### 🧩 Sortir de la "Boîte Noire" technique
Lorsqu'un utilisateur télécharge son archive Grok, il se retrouve face à un ensemble de fichiers **JSON** et de dossiers complexes que la plupart des gens ne savent pas utiliser ou interpréter. Sans outils techniques, il est impossible de savoir quelle image correspond à quel prompt ou à quel lien Cloud.

**Grok Imagine Archive** agit comme un traducteur : il "s'infiltre" dans ces données brutes pour vous offrir une galerie claire et structurée.

### 👻 Retrouver les "Archives Fantômes"
À son lancement, l'interface de Grok ne permettait pas de supprimer définitivement les posts ; ils restaient stockés dans la base de données même après avoir été retirés des favoris. 

Cet outil vous permet de :
1. **Exhumer l'invisible** : Retrouver les liens directs de tous les posts "engloutis" qui n'apparaissent plus dans votre historique officiel.
2. **Nettoyage Chirurgical** : Identifier précisément ces contenus pour pouvoir les supprimer via les nouvelles options de Grok.

> **💡 La "Puissance" de l'outil :** Pour une efficacité maximale, utilisez l'application sur le **même navigateur** où votre session Grok est active. Cela vous permet de cliquer sur un lien et d'arriver directement sur la page de suppression du post sur le site officiel de Grok sans reconnexion.

## 🚀 Fonctionnalités

* **Visualisation Instantanée** : Transforme les fichiers JSON illisibles en une galerie élégante (Images/Vidéos).
* **Suppression Groupée** : Sélectionnez et supprimez définitivement les dossiers d'images de votre ordinateur en un clic (via l'API *File System Access*).
* **Interface Mobile-Friendly** : Contrôles et cases à cocher agrandis pour une utilisation tactile fluide sur smartphone.
* **Système de Suivi** : Distinction visuelle entre les médias **"Vus"** (dans la lightbox) et **"Visités"** (lien Grok cliqué).
* **Confidentialité Totale** : Fonctionnement 100% local, aucune donnée n'est envoyée vers un serveur tiers.

## 🛠️ Utilisation Rapide

1. **Connectez-vous à votre compte Grok** sur votre navigateur habituel.
2. **Demandez votre archive** : Allez sur [Grok Data](https://accounts.x.ai/data) pour solliciter le téléchargement de vos données.
3. **Récupérez le fichier** : Cliquez sur le lien de téléchargement (**Download Data**) reçu dans la boîte mail associée à votre compte Grok.
4. **Préparez l'archive** : Décompressez le fichier `.zip` sur votre ordinateur.
5. **Lancez l'outil** : Ouvrez [Grok Imagine Archive](https://lanoixdesign.github.io/grok-archive-viewer/).
6. **Explorez** : Chargez le dossier racine de votre archive décompressée et gérez vos créations !

## ⚖️ Licence

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissement (Disclaimer)

Cet outil est un **lecteur d'archives local**. Il n'est pas affilié à xAI.
* **Suppression Cloud** : L'outil facilite l'accès aux liens, mais la suppression sur le Cloud doit être faite manuellement sur le site de Grok.
* **Responsabilité** : L'auteur n'est pas responsable des suppressions de fichiers locaux effectuées via l'interface.

---
*Développé pour la communauté Grok Imagine. Si cet outil vous a aidé, n'hésitez pas à offrir un 🇫🇷☕️ via le bouton dédié !*
