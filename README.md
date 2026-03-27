# Grok Imagine Archive 🗄️

**Grok Imagine Archive** est une application web statique, locale et sécurisée, conçue pour visualiser, filtrer et gérer les archives de générations d'images et de vidéos issues de **Grok (xAI)**.

🌐 **Lancer l'application :** [https://lanoixdesign.github.io/grok-archive-viewer/](https://lanoixdesign.github.io/grok-archive-viewer/)

---

## 🌟 Pourquoi cet outil ?

### 🧩 Sortir de la "Boîte Noire" technique
Lorsqu'on télécharge une archive Grok, on se retrouve face à un labyrinthe de fichiers JSON et de dossiers codés. [cite_start]**Grok Imagine Archive** agit comme un **pont d'exhumation**: il décode ce "plan cadastral" numérique pour reconstruire une galerie fluide et structurée, reliant enfin chaque image à son prompt d'origine.

### 👻 Exhumer les "Archives Fantômes"
[cite_start]Grok conserve souvent vos créations dans ses bases de données, même après que vous les ayez "supprimées" de l'interface officielle (ce qu'on appelle un *Soft Delete* ou suppression logique). 
* [cite_start]**L'illusion du contrôle** : Cliquer sur la corbeille dans Grok ne fait souvent que poser une "cape d'invisibilité" sur l'image.
* [cite_start]**Navigation Chirurgicale** : Notre outil génère des liens directs vers ces fichiers "fantômes" encore hébergés sur les serveurs de xAI, vous permettant de les retrouver alors qu'ils n'apparaissent plus dans votre historique habituel.

---

## 🚀 Fonctionnalités Clés

* **Interface Épurée & Rétractable** : Un tableau de bord optimisé pour mobile avec un menu rétractable (`⬆️ / ⬇️`) pour maximiser l'espace de la galerie.
* **Suppression Réelle & Chirurgicale (Nouveau !)** : 
    * **Local** : Supprimez définitivement les dossiers d'assets sur votre disque dur directement depuis l'interface.
    * [cite_start]**Cloud (Grok)** : Pour supprimer réellement un "fantôme" sur les serveurs de Grok, l'outil vous guide via une **navigation chirurgicale**. Cliquez sur le bouton de lien pour ouvrir la page de publication originale et utilisez les options de suppression native de Grok pour forcer l'effacement côté serveur.
* **Lecture & Téléchargement des Prompts** : Une modale dédiée vous permet de relire le prompt intégral avant de décider de le copier ou de le télécharger en fichier `.txt`.
* [cite_start]**Optimisation RAM & Mode Éco** : Rendu en basse résolution et *Lazy Loading* agressif pour supporter des milliers d'images sans faire planter le navigateur.
* [cite_start]**Persistance de Session** : Utilise *IndexedDB* pour mémoriser votre progression et vos statuts "Vu" ou "Visité" sans jamais envoyer de données sur internet.

---

## 🛠️ Guide d'Utilisation

1. **Demandez votre archive** : Allez sur [Grok Data](https://accounts.x.ai/data).
2. **Préparez l'archive** : Décompressez impérativement le `.zip` sur votre ordinateur.
3. **Scan Local** : Cliquez sur **🗄️ Charger Dossier** et sélectionnez la racine de l'archive. 
   * [cite_start]*Note : L'outil a besoin de lire les fichiers `auth`, `billing` et `backend` pour reconstituer les liens vers vos archives fantômes.*
4. **Nettoyage** : 
   * Parcourez vos images.
   * Pour les fichiers locaux : utilisez **🗑️ Suppr. Sélection**.
   * Pour les archives Cloud : cliquez sur **🔗 VOIR SUR GROK** pour accéder à la page source et supprimer le média manuellement sur leur plateforme.

---

## 🔒 Confidentialité & Sécurité
[cite_start]L'application fonctionne en **vase clos**. Bien qu'elle lise des données sensibles (sessions, facturation) pour cartographier vos archives, **aucune donnée n'est transmise**. [cite_start]Tout le traitement s'effectue dans la mémoire vive de votre navigateur (Architecture statique GitHub Pages).

## ⚖️ Avertissement
Cet outil est un lecteur indépendant. Il n'est pas affilié à xAI. [cite_start]La suppression sur le Cloud de Grok reste soumise aux limitations de leur interface et doit être effectuée manuellement, lien par lien, car aucune API de suppression massive n'est fournie par xAI.

---
**Développé pour la communauté Grok Imagine. Si cet outil vous a aidé, offrez un 🇫🇷☕️ via le bouton dédié !**
