# Grok Imagine Archive 🗄️

**Grok Imagine Archive** est une application web statique, locale et sécurisée, conçue pour visualiser, filtrer et gérer facilement les archives de générations d'images et de vidéos issues de **Grok (xAI)**.

🌐 **Lancer l'application web :** [https://lanoixdesign.github.io/grok-archive-viewer/](https://lanoixdesign.github.io/grok-archive-viewer/)

> 🧪 **Envie de tester sans attendre ?**
> Nous avons mis à votre disposition un fichier `export-test.json` dans ce projet. Téléchargez-le, ouvrez l'application web, puis **glissez-déposez** simplement ce fichier sur la page (ou utilisez le bouton **📂 Importer JSON**). Vous pourrez ainsi découvrir l'interface et ses fonctionnalités instantanément, sans avoir besoin de demander votre propre archive Grok !

---

## 🌟 Pourquoi cet outil ?

### 🧩 Sortir de la "Boîte Noire" technique
Lorsqu'un utilisateur télécharge son archive Grok, il se retrouve face à un fichier `.zip` contenant des dizaines de dossiers imbriqués et des fichiers **JSON** illisibles. Sans outil, il est impossible de lier visuellement une image à son prompt d'origine.

**Grok Imagine Archive** agit comme un traducteur : il "s'infiltre" dans ces données brutes pour reconstruire instantanément une galerie claire, moderne et structurée.

### 👻 Retrouver les "Archives Fantômes"
Grok conserve souvent dans ses bases de données des créations même après qu'elles aient été retirées de vos favoris. Cet outil vous permet de :
1. **Exhumer l'invisible** : Retrouver les liens directs de tous les posts "engloutis" qui n'apparaissent plus dans votre historique web officiel.
2. **Nettoyage Chirurgical** : Identifier précisément ces contenus pour pouvoir les consulter ou les télécharger.

> **💡 Astuce Pro :** Utilisez l'application sur le **même navigateur** où votre session Grok est active. Cela vous permet de cliquer sur le lien d'une archive fantôme et d'arriver directement sur sa page officielle sur le site de Grok.

## 🚀 Fonctionnalités Clés

* **Interface Épurée & Rétractable (Nouveau !)** : Un tableau de bord divisé en 3 zones claires et fixé en haut de l'écran. Un bouton "Menu" (`⬆️ / ⬇️`) permet de masquer la barre d'outils pour maximiser l'espace d'affichage de la galerie, idéal pour les mobiles !
* **Optimisation Vidéo & RAM** : Les vidéos utilisent le *Lazy Loading*. Un bouton **Autoplay** vous permet de bloquer la lecture automatique pour économiser la mémoire de votre appareil. Si bloquées, les vidéos se lisent uniquement au **survol de la souris** (PC) ou par un **appui long** (Mobile).
* **Persistance de Session** : Quittez la page et revenez plus tard ! L'outil mémorise votre dossier d'archive et votre historique de navigation (statuts "Visité" et "Vue") grâce à la base de données locale du navigateur (IndexedDB).
* **Import/Export & Drag & Drop** : Exportez une sélection précise. Plus tard, glissez-déposez simplement ce fichier `.json` sur la page pour restaurer instantanément votre galerie triée.
* **Opérations par Lots** : Des cases "Tout sélectionner" intelligentes permettent de télécharger des dizaines de photos/vidéos simultanément, ou de nettoyer votre disque dur en supprimant les fichiers locaux inutiles en un clic.
* **Confidentialité Totale** : Le script tourne à 100% dans votre navigateur. Aucune donnée n'est envoyée vers un serveur tiers.

## 🛠️ Guide d'Utilisation (Avec votre propre archive)

1. **Connectez-vous à votre compte Grok** sur votre navigateur.
2. **Demandez votre archive** : Rendez-vous sur [Grok Data](https://accounts.x.ai/data) pour solliciter vos données.
3. **Récupérez le fichier** : Cliquez sur le lien (**Download Data**) reçu sur votre boîte mail.
4. **Préparez l'archive** : Décompressez impérativement le fichier `.zip` sur votre ordinateur.
5. **Lancez l'outil** : Ouvrez [Grok Imagine Archive](https://lanoixdesign.github.io/grok-archive-viewer/).
6. **Explorez** : Cliquez sur **🗄️ Charger Dossier** et sélectionnez le dossier racine de votre archive décompressée.

## 🧹 Fin de session & Sécurité
Si vous utilisez un ordinateur partagé, pensez à cliquer sur l'icône **🧹 (Effacer Session)** dans l'en-tête lorsque vous avez terminé. Cela supprimera définitivement l'accès au dossier, votre historique de vues et vos informations de profil mises en cache.

## ⚖️ Avertissement (Disclaimer)
Cet outil est un **lecteur d'archives strictement local et indépendant**. Il n'est pas affilié, sponsorisé ou validé par xAI ou Grok. L'auteur décline toute responsabilité concernant les suppressions de fichiers locaux ou les modifications de compte effectuées par l'utilisateur via l'utilisation de cet outil.

## 📄 Licence
Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

---
**Développé pour la communauté Grok Imagine. Si cet outil vous a aidé, n'hésitez pas à offrir un 🇫🇷☕️ via le bouton dédié !*
