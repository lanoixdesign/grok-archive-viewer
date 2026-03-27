# Grok Imagine Archive 🗄️

**Grok Imagine Archive** est une application web statique et sécurisée conçue pour décoder, visualiser et gérer les archives de générations d'images et de vidéos issues de **Grok (xAI)**.

## 🌟 Pourquoi cet outil ?

### 🧩 Sortir de la "Boîte Noire" technique
Lorsqu'un utilisateur télécharge son archive Grok, il reçoit un dossier contenant des fichiers **JSON** illisibles et des dossiers d'images nommés par des identifiants complexes. Sans expertise technique, il est impossible de savoir quel média correspond à quel prompt. 

**Grok Imagine Archive** agit comme un décodeur : il s'infiltre dans ces données brutes pour reconstruire une galerie visuelle fluide et organisée.

### 👻 Accéder aux "Archives Fantômes"
À son lancement, l'interface de Grok ne permettait pas de supprimer définitivement les posts. Ils restaient stockés dans le Cloud même après avoir été retirés des favoris.
Cet outil vous permet de :
1.  **Exhumer l'invisible** : Retrouver les liens directs de tous les posts "engloutis" qui n'apparaissent plus dans votre historique habituel.
2.  **Visualisation Directe** : L'outil génère des prévisualisations pour les photos et vidéos directement depuis les serveurs de xAI.
3.  **Nettoyage Chirurgical** : Identifier les contenus à supprimer via les liens officiels fournis par l'interface.

> **💡 La "Puissance" de l'outil :** Utilisez l'application sur le **même navigateur** où votre session Grok est active. Cela vous permet de cliquer sur un lien Cloud et d'arriver instantanément sur la page de gestion du post original sur le site de Grok.

## 🚀 Fonctionnalités Clés

* **Scan Récursif Intelligent** : Sélectionnez simplement votre dossier décompressé, l'outil fouille automatiquement les sous-dossiers pour trouver les fichiers `JSON` et `prod-mc-asset-server`.
* **Galerie Hybride (Local & Cloud)** : Affichez vos fichiers stockés sur disque et vos "archives fantômes" distantes dans une interface unique.
* **Performance Vidéo** : Les vidéos se chargent et se lisent automatiquement uniquement lorsqu'elles sont visibles à l'écran (Lazy Loading & Intersection Observer).
* **Persistance de Session** : Grâce à *IndexedDB*, l'application mémorise votre dossier et votre historique de tri. Si vous rafraîchissez la page, vous pouvez reprendre votre travail en un clic.
* **Téléchargement Groupé** : Exportez vos métadonnées en JSON ou téléchargez physiquement une sélection de photos et vidéos Cloud sur votre ordinateur.
* **Confidentialité Totale** : Fonctionnement 100% local. Aucune donnée n'est envoyée vers un serveur tiers.

## 🛠️ Utilisation Rapide

1.  **Connectez-vous à Grok** sur votre navigateur habituel.
2.  **Demandez votre archive** : Allez sur [Grok Data](https://accounts.x.ai/data).
3.  **Récupérez le fichier** : Cliquez sur le lien **Download Data** reçu par e-mail.
4.  **Préparez l'archive** : Décompressez impérativement le fichier `.zip`.
5.  **Explorez** : Ouvrez [Grok Imagine Archive](https://lanoixdesign.github.io/grok-archive-viewer/), chargez votre dossier et gérez vos créations !

## 🧹 Fin de session
Pour votre sécurité, utilisez le bouton **"Effacer Session"** avant de quitter. Cela supprimera l'historique de navigation et les accès aux dossiers enregistrés dans le cache de votre navigateur.

## ⚖️ Licence
Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

---
*Développé pour la communauté Grok Imagine. Si cet outil vous a aidé, n'hésitez pas à offrir un 🇫🇷☕️ via le bouton dédié !*
