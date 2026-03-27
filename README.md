# Grok Imagine Archive 🗄️

**Grok Imagine Archive** est une application web statique, locale et sécurisée, conçue pour visualiser, filtrer et gérer les archives de générations d'images et de vidéos issues de **Grok (xAI)**.

🌐 **Lancer l'application :** [https://lanoixdesign.github.io/grok-archive-viewer/](https://lanoixdesign.github.io/grok-archive-viewer/)

---

## 🌟 Pourquoi cet outil ?

### 🧩 Sortir de la "Boîte Noire" technique
Lorsqu'un utilisateur télécharge son archive Grok, il se retrouve face à un fichier `.zip` contenant des dizaines de dossiers imbriqués et des fichiers **JSON** illisibles. Sans outil, il est impossible de lier visuellement une image à son prompt d'origine. **Grok Imagine Archive** agit comme un **pont d'exhumation** : il décode ce "plan cadastral" numérique pour reconstruire instantanément une galerie claire, moderne et structurée.

### 👻 Retrouver les "Archives Fantômes"
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
