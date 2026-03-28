let allAssets = [];
let galleryItems = []; 
let visitedSet = new Set();
let currentLightboxIndex = -1;
let authData = null;
let billingData = null;
let currentExportData = null;
let rootHandle = null;
let videoObserver = null;
let autoPlayVideo = localStorage.getItem('grokAutoPlay') !== 'false';
let selectedSet = new Set(); // NOUVEAU : Pour mémoriser les cases cochées
let isCompact = false; // Mémorise l'état du mode compact
let currentIndex = 0;
const CHUNK_SIZE = 50; // Nombre d'images chargées par palier
let cloudItems = [];
let linkedItems = [];
let orphanItems = [];
let cloudIndex = 0;
let linkedIndex = 0;
let orphanIndex = 0;




window.toggleCompactMode = function() {
    isCompact = !isCompact;
    
    // Applique ou retire la classe CSS sur nos 3 grilles
    ['jsonLinks', 'linkedLocalFiles', 'localFiles'].forEach(id => {
        const grid = document.getElementById(id);
        if (grid) grid.classList.toggle('compact', isCompact);
    });

    // Met à jour l'aspect du bouton
    const btn = document.getElementById('compactBtn');
    if (btn) {
        btn.innerHTML = isCompact ? '🔲 Normal' : '⏹️ Compact';
        btn.style.background = isCompact ? 'var(--accent)' : 'transparent';
        btn.style.color = isCompact ? 'var(--bg)' : 'var(--text)';
    }

    // Coupe IMMÉDIATEMENT toutes les vidéos en cours de lecture
    if (isCompact) {
        document.querySelectorAll('.lazy-video').forEach(video => video.pause());
    }
};

const jsonLinksEl = document.getElementById('jsonLinks');
const localFilesEl = document.getElementById('localFiles');
const linkedLocalFilesEl = document.getElementById('linkedLocalFiles'); // NOUVELLE GRILLE

// ==========================================
// GESTION INDEXEDDB (PERSISTANCE)
// ==========================================
const dbName = "GrokArchiveDB";
const storeName = "sessionStore";

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(storeName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveSession() {
    const db = await openDB();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    if (rootHandle) {
        await store.put(rootHandle, "rootHandle");
        await store.delete("importedAssets");
    } else if (allAssets.length > 0) {
        await store.put(allAssets, "importedAssets");
        await store.delete("rootHandle");
    }
    await store.put(Array.from(visitedSet), "visitedSet");
    await store.put(Array.from(selectedSet), "selectedSet"); // NOUVEAU
}

async function loadSession() {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const savedHandle = await new Promise(r => {
            const req = store.get("rootHandle");
            req.onsuccess = () => r(req.result);
        });
        const savedAssets = await new Promise(r => {
            const req = store.get("importedAssets");
            req.onsuccess = () => r(req.result);
        });
        const savedVisited = await new Promise(r => {
            const req = store.get("visitedSet");
            req.onsuccess = () => r(req.result);
        });
        // NOUVEAU
        const savedSelected = await new Promise(r => {
            const req = store.get("selectedSet");
            req.onsuccess = () => r(req.result);
        });

        if (savedVisited) visitedSet = new Set(savedVisited);
        if (savedSelected) selectedSet = new Set(savedSelected); // NOUVEAU
        
        // Si un dossier OU un fichier JSON a été sauvegardé, on propose de reprendre la session
        if (savedHandle || (savedAssets && savedAssets.length > 0)) {
            rootHandle = savedHandle;
            
            // Injection du bouton de reprise de session dans la toolbar principale
            const restoreBtn = document.createElement('button');
            restoreBtn.className = "btn action-btn";
            restoreBtn.id = "restoreSessionBtn";
            restoreBtn.innerHTML = "🔄 Reprendre la session";
            
            const dataActions = document.querySelector('.data-actions');
            if (dataActions) dataActions.prepend(restoreBtn);
            
            restoreBtn.onclick = async () => {
                if (savedHandle) {
                    // Restauration d'un dossier local
                    if (await savedHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                        restoreBtn.remove();
                        await runFullScan();
                    }
                } else if (savedAssets) {
                    // Restauration instantanée d'une session JSON
                    restoreBtn.remove();
                    allAssets = savedAssets;
                    // S'assure que les dates redeviennent des objets Date après stockage
                    allAssets.forEach(a => {
                        if (!(a.date instanceof Date)) a.date = new Date(a.date);
                    });
                    renderGallery();
                    forceOpenSection('jsonSection');
                }
            };
        }
    } catch (e) { console.error("Session non chargée:", e); }
}

async function clearSession() {
    if (!confirm("⚠️ Voulez-vous vraiment effacer toutes les données enregistrées dans le navigateur ?")) return;
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        await store.clear();
        rootHandle = null;
        visitedSet = new Set();
        selectedSet = new Set(); // NOUVEAU
        allAssets = [];
        galleryItems = [];
        authData = null;
        billingData = null;
        renderGallery();
        const restoreBtn = document.getElementById('restoreSessionBtn');
        if (restoreBtn) restoreBtn.remove();
        alert("✅ Session effacée.");
    } catch (e) { console.error(e); }
}

// ==========================================
// UI & NAVIGATION
// ==========================================
function setLoading(isLoading, message = "⏳ Analyse en cours...") { 
    const status = document.getElementById('loadingStatus');
    if (status) {
        status.style.display = isLoading ? 'block' : 'none';
        if (isLoading) status.textContent = message;
    }
}

function toggleAccordion(targetId, el) { 
    const allSections = ['jsonSection', 'linkedLocalSection', 'localSection'];
    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;
    
    // Vérifie si on essaie d'ouvrir ou de fermer
    const isOpening = targetSection.classList.contains('hidden');

    allSections.forEach(id => {
        const sec = document.getElementById(id);
        const header = sec ? sec.previousElementSibling : null;
        
        if (id === targetId && isOpening) {
            // Ouvre la section cliquée
            if (sec) sec.classList.remove('hidden');
            if (header) header.classList.remove('collapsed');
            
            // Bonus : Met à jour le bouton actif dans la barre du haut !
            const topBtn = document.querySelector(`.nav-anchor-btn[onclick*="${id}"]`);
            if (topBtn) {
                document.querySelectorAll('.nav-anchor-btn').forEach(b => b.classList.remove('active'));
                topBtn.classList.add('active');
            }
        } else {
            // Ferme TOUTES les autres sections
            if (sec) sec.classList.add('hidden');
            if (header) header.classList.add('collapsed');
        }
    });
}

function forceOpenSection(id) {
    const section = document.getElementById(id);
    // On simule un clic sur l'accordéon pour utiliser la logique d'exclusion ci-dessus
    if (section) {
        section.classList.add('hidden'); // Force l'état fermé pour être sûr de l'ouvrir
        toggleAccordion(id, section.previousElementSibling);
    }
}


window.markAsVisited = function(url, el) { 
    visitedSet.add(url); 
    saveSession();
    if(el) { el.classList.add('visited'); el.classList.remove('viewed'); } 
};

window.markAsViewed = function(el) { 
    if (el && !el.classList.contains('visited')) el.classList.add('viewed'); 
};

// ==========================================
// IMPORT JSON & DRAG AND DROP
// ==========================================
async function handleJsonImport(file) {
    setLoading(true, "📂 Importation du fichier JSON...");
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        const posts = data.media_posts || (Array.isArray(data) ? data : null);

        if (!posts) throw new Error("Format JSON non reconnu.");

        allAssets = posts.map(p => ({
            id: p.id,
            prompt: p.prompt || 'Importé',
            url: p.url,
            link: p.link || `https://grok.com/imagine/post/${p.id}`,
            media_type: p.media_type || p.type || 'image',
            date: new Date(p.date || p.create_time || Date.now()),
            source: 'Cloud'
        }));

        rootHandle = null; // Définit le contexte comme une session exclusivement JSON
        await saveSession(); // Sauvegarde la session immédiatement dans IndexedDB

        renderGallery();
        forceOpenSection('jsonSection');
        alert(`✅ ${allAssets.length} éléments importés.`);
    } catch (e) {
        alert("❌ Erreur d'importation : " + e.message);
    } finally {
        setLoading(false);
    }
}

// ==========================================
// CHARGEMENT ARCHIVE (DOSSIER)
// ==========================================
async function runFullScan() {
    setLoading(true, "🔍 Récupération des données...");
    allAssets = [];
    authData = null;
    billingData = null;
    
    // 1. On scanne tout le dossier (Fichiers locaux + Fichiers JSON)
    await scanDirectory(rootHandle);

    // 2. ÉTAPE DE RÉCONCILIATION
    allAssets.forEach(asset => {
        if (asset.source === 'Local') {
            const cloudMatch = allAssets.find(a => a.source === 'Cloud' && a.id === asset.id);
            if (cloudMatch) {
                asset.prompt = cloudMatch.prompt;
                asset.link = cloudMatch.link;
                asset.hasCloudMatch = true;  // NOUVEAU : On marque qu'il a une correspondance
            } else {
                asset.prompt = "Prompt indisponible (Média orphelin)";
                asset.hasCloudMatch = false; // NOUVEAU : Média orphelin
            }
        }
    });

    setLoading(false);
    renderGallery();
    
    if (allAssets.some(a => a.source === 'Cloud')) forceOpenSection('jsonSection');
    else if (allAssets.some(a => a.source === 'Local')) forceOpenSection('localSection');
}

async function scanDirectory(handle) {
    for await (const entry of handle.values()) {
        try {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                if (entry.name === 'prod-mc-auth-mgmt-api.json') authData = JSON.parse(await file.text());
                if (entry.name === 'prod-mc-billing.json') billingData = JSON.parse(await file.text());
                
                // Analyse du fichier contenant les données textuelles
                if (entry.name === 'prod-grok-backend.json') {
                    const data = JSON.parse(await file.text());
                    (data.media_posts || []).forEach(p => {
                        if (!allAssets.find(a => a.id === p.id && a.source === 'Cloud')) {
                            const isVideo = p.media_type === 'video';
                            
                            // NOUVEAU : On cherche le texte sous plusieurs noms possibles
                            const realPrompt = p.original_prompt || p.prompt || p.text || 'Texte introuvable';
                            
                            allAssets.push({
                                id: p.id, 
                                prompt: realPrompt, 
                                url: isVideo ? `https://imagine-public.x.ai/imagine-public/share-videos/${p.id}.mp4` : `https://imagine-public.x.ai/imagine-public/images/${p.id}.jpg`,
                                poster: isVideo ? `https://imagine-public.x.ai/imagine-public/images/${p.id}.jpg` : null,
                                link: p.link, 
                                media_type: p.media_type, 
                                date: new Date(p.create_time), 
                                source: 'Cloud'
                            });
                        }
                    });
                }
            } else if (entry.kind === 'directory') {
                if (entry.name === 'prod-mc-asset-server') {
                    for await (const sub of entry.values()) {
                        if (sub.kind === 'directory') {
                            for await (const aFile of sub.values()) {
                                if (aFile.name.startsWith('content')) {
                                    const file = await aFile.getFile();
                                    allAssets.push({
                                        id: sub.name, prompt: sub.name, url: URL.createObjectURL(file),
                                        media_type: file.type.startsWith('video') ? 'video' : 'image',
                                        date: new Date(file.lastModified), source: 'Local',
                                        parentHandle: sub, grandParentHandle: entry
                                    });
                                }
                            }
                        }
                    }
                } else { await scanDirectory(entry); }
            }
        } catch (e) {}
    }
}

function createCardElement(asset, idx) {
    const isV = visitedSet.has(asset.url);
    const card = document.createElement('div');
    card.className = `media-card ${isV ? 'visited' : ''}`;
    
    card.style.contentVisibility = 'auto';
    card.style.containIntrinsicSize = '300px 400px';

    const linkedCloud = allAssets.find(item => item.source === 'Cloud' && item.id === asset.id);
    const actionUrl = asset.source === 'Cloud' ? asset.link : (linkedCloud ? linkedCloud.link : null);
    
    // Priorité à la date du Cloud si liée
    const displayDate = (linkedCloud && linkedCloud.date) ? linkedCloud.date : asset.date;
    const dateTimeStr = displayDate.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    card.dataset.date = dateTimeStr;
    const isVideo = asset.media_type === 'video';
    const isExpired = !isVideo && asset.url.includes('/share-images/');

    card.innerHTML = `
        <div class="media-container ${!isVideo ? 'is-image' : ''}" style="position: relative; background: #000;">
            <div style="position: absolute; top: 5px; left: 5px; display: flex; gap: 4px; z-index: 2;">
                <span class="badge type-badge ${asset.source.toLowerCase()}" style="position: static; ${isVideo ? 'background-color:#ff4444;color:#fff' : ''}">
                    ${isVideo ? 'Vidéo' : 'Photo'}
                </span>
                ${isExpired ? `<span class="badge warning-badge" style="position: static; background:var(--warning); color:#000;">⚠️<span class="warning-text"> Expiré</span></span>` : ''}
            </div>
            ${isVideo 
                ? `<video class="lazy-video" data-src="${asset.url}" poster="${asset.poster || ''}" muted loop playsinline preload="none" style="width:100%;height:100%;object-fit:cover;"></video><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;font-size:2rem;opacity:0.6;">▶️</div>` 
                : `<img src="${asset.url}" data-id="${asset.id}" loading="lazy" width="300" height="250" style="width:100%;height:100%;object-fit:cover;" onload="this.classList.add('loaded'); if(this.parentElement) this.parentElement.style.animation='none';" onerror="window.handleImgError(this)">`}
        </div>
        <div class="info">
            <strong style="display: block; margin-bottom: 5px;">${isVideo ? '🎥 ' : ''}${asset.prompt.slice(0, 45)}${asset.prompt.length > 45 ? '...' : ''}</strong>
            <div style="font-size:0.75rem; color:#888; margin-bottom: 8px;">📅 ${dateTimeStr}</div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-bottom: 12px;" onclick="event.stopPropagation()"><input type="checkbox" data-url="${asset.url}" ${selectedSet.has(asset.url) ? 'checked' : ''}> Sélectionner</label>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                ${actionUrl ? `<a href="${actionUrl}" target="_blank" class="btn grok-link-btn" onclick="event.stopPropagation(); markAsVisited('${asset.url}', this.closest('.media-card'));">🔗 VOIR SUR GROK</a>` : ''}
                <div style="display:flex; gap:5px;">
                    ${asset.source === 'Local' ? `<button class="btn secondary" style="flex:1; padding: 8px 5px;" onclick="event.stopPropagation(); downloadLocalMedia('${asset.url}', '${asset.id}', '${asset.media_type}')">📥 MÉDIA</button>` : ''}
                    <button class="btn secondary" style="flex:1; padding: 8px 5px;" onclick="event.stopPropagation(); openPromptModal(\`${asset.prompt.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`, '${asset.id}')">📝 PROMPT</button>
                </div>
            </div>
        </div>`;

    // Réattache les événements (Checkbox et Vidéo)
    setupCardEvents(card, asset, idx, isVideo);
    return card;
}

function setupCardEvents(card, asset, idx, isVideo) {
    // --- LOGIQUE DES CHECKBOX ---
    const checkbox = card.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                selectedSet.add(this.dataset.url);
            } else {
                selectedSet.delete(this.dataset.url);
            }
            saveSession();

            // Mise à jour visuelle du "Tout sélectionner" de l'onglet correspondant
            const gridId = asset.source === 'Cloud' ? 'jsonLinks' : 'localFiles';
            const selectAllCb = document.querySelector(`.select-all-cb[data-target-grid="${gridId}"]`);
            if (selectAllCb) {
                if (!this.checked) {
                    selectAllCb.checked = false;
                } else {
                    const grid = document.getElementById(gridId);
                    const allCbs = grid.querySelectorAll('input[type="checkbox"]:not(.select-all-cb)');
                    selectAllCb.checked = Array.from(allCbs).every(c => c.checked);
                }
            }
        });
    }

    // --- LOGIQUE VIDÉO (LECTURE/PAUSE) ---
    let isLongPress = false;
    let touchTimer = null;

    const forcePlayVideo = () => {
        if (typeof isCompact !== 'undefined' && isCompact) return; 
        if (isVideo && !autoPlayVideo) {
            const v = card.querySelector('video');
            if (v) {
                if (v.dataset.src) {
                    v.src = v.dataset.src;
                    v.removeAttribute('data-src');
                    v.load();
                }
                v.play().catch(() => {});
            }
        }
    };

    const forcePauseVideo = () => {
        const v = card.querySelector('video');
        if (v) v.pause();
    };

    // Interactions Souris
    card.onmouseenter = forcePlayVideo;
    card.onmouseleave = forcePauseVideo;

    // Interactions Tactiles (Mobile)
    if (isVideo) {
        card.addEventListener('touchstart', () => {
            isLongPress = false;
            touchTimer = setTimeout(() => { 
                isLongPress = true; 
                forcePlayVideo(); 
            }, 400);
        }, { passive: true });

        const cancelTouch = () => { 
            clearTimeout(touchTimer); 
            forcePauseVideo(); 
        };
        card.addEventListener('touchend', cancelTouch, { passive: true });
        card.addEventListener('touchcancel', cancelTouch, { passive: true });
        card.addEventListener('touchmove', cancelTouch, { passive: true });
    }

    // --- CLIC PRINCIPAL (LIGHTBOX) ---
    card.onclick = (e) => {
        // Si c'est un appui long sur mobile, on n'ouvre pas la lightbox
        if (isLongPress) {
            e.preventDefault();
            isLongPress = false;
            return;
        }
        markAsViewed(card);
        openLightbox(idx); // Utilise l'index global passé en argument
    };

    // --- OBSERVATION POUR L'AUTOPLAY ---
    if (isVideo && videoObserver) {
        videoObserver.observe(card.querySelector('video'));
    }
}

function updateCounters(filtered) {
    const cloudLen = filtered.filter(a => a.source === 'Cloud').length;
    const matchedLen = filtered.filter(a => a.source === 'Local' && a.hasCloudMatch).length;
    const unmatchedLen = filtered.filter(a => a.source === 'Local' && !a.hasCloudMatch).length;
    
    // Mise à jour des éléments du DOM
    const elements = {
        'numberImg': unmatchedLen,
        'numberLinkedLocalTop': matchedLen,
        'numberLink': cloudLen,
        'numberLinkedLocal': matchedLen,
        'numberImg2': unmatchedLen,
        'numberLink2': cloudLen
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.disabled = allAssets.length === 0;
}


function renderGallery() {
    // 1. Remise à zéro des compteurs
    cloudIndex = 0;
    linkedIndex = 0;
    orphanIndex = 0;
    document.querySelectorAll('.select-all-cb').forEach(cb => cb.checked = false);

    const typeF = document.getElementById('sortType')?.value || 'all';
    const dateO = document.getElementById('sortDate')?.value || 'date-desc';
    
    // 2. Filtrage global
    const filtered = allAssets.filter(a => typeF === 'all' || a.media_type === typeF);
    
    // 3. Séparation en 3 listes indépendantes
    cloudItems = filtered.filter(a => a.source === 'Cloud');
    linkedItems = filtered.filter(a => a.source === 'Local' && a.hasCloudMatch);
    orphanItems = filtered.filter(a => a.source === 'Local' && !a.hasCloudMatch);

    // 4. Tri par date pour chaque liste
    const sortFn = (a, b) => dateO === 'date-desc' ? b.date - a.date : a.date - b.date;
    cloudItems.sort(sortFn);
    linkedItems.sort(sortFn);
    orphanItems.sort(sortFn);

    // 5. Reconstitution pour la Lightbox (L'ordre sera : Cloud -> Liés -> Orphelins)
    galleryItems = [...cloudItems, ...linkedItems, ...orphanItems];
    
    if (jsonLinksEl) jsonLinksEl.innerHTML = ''; 
    if (localFilesEl) localFilesEl.innerHTML = '';
    if (linkedLocalFilesEl) linkedLocalFilesEl.innerHTML = ''; 

    if (videoObserver) videoObserver.disconnect();

    // 6. La fonction de chargement par paquets
    window.loadNextChunk = function() {
        // S'il n'y a plus rien à charger nulle part, on arrête
        if (cloudIndex >= cloudItems.length && linkedIndex >= linkedItems.length && orphanIndex >= orphanItems.length) return;

        const cloudFrag = document.createDocumentFragment();
        const linkedFrag = document.createDocumentFragment();
        const orphanFrag = document.createDocumentFragment();

        // --- PAQUET CLOUD ---
        const cloudLimit = Math.min(cloudIndex + CHUNK_SIZE, cloudItems.length);
        cloudItems.slice(cloudIndex, cloudLimit).forEach((asset, i) => {
            const absoluteIdx = cloudIndex + i; // Index direct
            cloudFrag.appendChild(createCardElement(asset, absoluteIdx));
        });
        cloudIndex = cloudLimit;

        // --- PAQUET LIÉS ---
        const linkedLimit = Math.min(linkedIndex + CHUNK_SIZE, linkedItems.length);
        linkedItems.slice(linkedIndex, linkedLimit).forEach((asset, i) => {
            const absoluteIdx = cloudItems.length + linkedIndex + i; // Décalage pour la Lightbox
            linkedFrag.appendChild(createCardElement(asset, absoluteIdx));
        });
        linkedIndex = linkedLimit;

        // --- PAQUET ORPHELINS ---
        const orphanLimit = Math.min(orphanIndex + CHUNK_SIZE, orphanItems.length);
        orphanItems.slice(orphanIndex, orphanLimit).forEach((asset, i) => {
            const absoluteIdx = cloudItems.length + linkedItems.length + orphanIndex + i; // Décalage pour la Lightbox
            orphanFrag.appendChild(createCardElement(asset, absoluteIdx));
        });
        orphanIndex = orphanLimit;

        // 7. Injection SILENCIEUSE (sans forcer l'ouverture des accordéons)
        if (cloudFrag.children.length > 0 && jsonLinksEl) jsonLinksEl.appendChild(cloudFrag);
        if (linkedFrag.children.length > 0 && linkedLocalFilesEl) linkedLocalFilesEl.appendChild(linkedFrag);
        if (orphanFrag.children.length > 0 && localFilesEl) localFilesEl.appendChild(orphanFrag);
    };

    // Premier chargement
    loadNextChunk();
    updateCounters(filtered);

    // NOUVEAU : On ouvre l'accordéon Cloud en priorité, ou le suivant s'il est vide
    if (cloudItems.length > 0) {
        forceOpenSection('jsonSection');
    } else if (linkedItems.length > 0) {
        forceOpenSection('linkedLocalSection');
    } else if (orphanItems.length > 0) {
        forceOpenSection('localSection');
    }


    // Restauration du scroll avec vérification des 3 index
    const savedScroll = parseInt(localStorage.getItem('grokGalleryScroll') || "0");
    if (savedScroll > 500) {
        const scrollLoader = setInterval(() => {
            const totalLoaded = cloudIndex + linkedIndex + orphanIndex;
            if (document.body.scrollHeight > savedScroll + 1000 || totalLoaded >= galleryItems.length) {
                window.scrollTo({ top: savedScroll, behavior: 'instant' });
                clearInterval(scrollLoader);
            } else {
                loadNextChunk();
            }
        }, 50);
    }
}

// N'oubliez pas d'ajouter cette fonction globale en dehors de renderGallery
window.handleImgError = function(img) {
    let retries = parseInt(img.dataset.retries || '0');
    const maxRetries = 2; // On baisse à 2 pour ne pas faire trop attendre l'utilisateur

    // 1. TENTATIVES NORMALES (On insiste sur le lien actuel)
    if (retries < maxRetries) {
        retries++;
        img.dataset.retries = retries;
        
        setTimeout(() => {
            const baseUrl = img.src.split('?')[0];
            img.src = `${baseUrl}?retry=${Date.now()}`;
        }, 1500);
        return; 
    }

    // 2. LE PLAN DE SECOURS (Si ça échoue, on tente de deviner le dossier d'archive)
    const currentUrl = img.src.split('?')[0];
    
    if (currentUrl.includes('/images/')) {
        img.dataset.retries = '0'; 
        const newUrl = currentUrl.replace('/images/', '/share-images/');
        img.src = newUrl + `?fallback=${Date.now()}`;
        
        // 🌟 LA MAGIE EST ICI : On synchronise le reste de l'application
        const assetId = img.dataset.id;
        if (assetId) {
            // 1. Mise à jour de la mémoire globale (La Lightbox lira ce nouveau lien !)
            const asset = allAssets.find(a => a.id === assetId);
            if (asset) {
                asset.url = newUrl;
            }
            
            // 2. Mise à jour de la case à cocher (Pour que le téléchargement ZIP marche)
            const card = img.closest('.media-card');
            if (card) {
                const checkbox = card.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.dataset.url = newUrl;
            }
        }
        return; 
    }

    // 3. SI ON ARRIVE ICI, C'EST QUE MÊME LE PLAN DE SECOURS A ÉCHOUÉ : LE LIEN EST MORT
    
    img.src = 'https://placehold.co/400x300/1a1a1a/ff4444?text=Média+Expiré';
    img.classList.add('loaded');
    
    if (img.parentElement) {
        img.parentElement.style.animation = 'none';
        img.parentElement.style.background = '#1a1a1a';
    }

    const card = img.closest('.media-card');
    if (card) {
        card.style.borderColor = 'var(--danger)';
        card.style.opacity = '0.7';
        
        const linkBtn = card.querySelector('.grok-link-btn');
        if (linkBtn) {
            linkBtn.innerHTML = '⚠️ LIEN SUREMENT MORT';
            linkBtn.style.background = 'var(--danger)';
            linkBtn.style.color = '#fff';
            linkBtn.title = "L'image source a disparu, même dans les archives latentes.";
        }
        
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.disabled = true;
    }
};

// ==========================================
// TÉLÉCHARGEMENT & SUPPRESSION
// ==========================================
const isExtension = (typeof browser !== 'undefined' && browser.downloads) || (typeof chrome !== 'undefined' && chrome.downloads);
const downloadsAPI = isExtension ? (typeof browser !== 'undefined' ? browser.downloads : chrome.downloads) : null;

window.downloadLocalMedia = function(url, id, type) {
    // Fonctionne parfaitement en 1 clic pour les fichiers locaux
    const a = document.createElement('a');
    a.href = url;
    a.download = `grok-local-${id}.${type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

window.downloadSelectedMedia = async function() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const localSelected = allAssets.filter(a => checked.includes(a.url) && a.source === 'Local');

    if (localSelected.length === 0) return;

    // Avertissement si beaucoup de fichiers (le ZIP se crée dans la RAM du navigateur)
    if (localSelected.length > 50) {
        if (!confirm(`Vous allez compresser ${localSelected.length} fichiers.\n\nCela peut prendre un peu de temps et utiliser beaucoup de mémoire vive. Continuer ?`)) {
            return;
        }
    }

    setLoading(true, "📦 Création de l'archive ZIP en cours...");

    try {
        const zip = new JSZip();
        const folder = zip.folder("Grok_Export_Local");

        for (let i = 0; i < localSelected.length; i++) {
            const asset = localSelected[i];
            const filename = `grok-local-${asset.id}.${asset.media_type === 'video' ? 'mp4' : 'jpg'}`;

            // Récupération du fichier local depuis la mémoire du navigateur
            const response = await fetch(asset.url);
            const blob = await response.blob();

            // Ajout du fichier dans le dossier ZIP
            folder.file(filename, blob);
        }

        // Génération du fichier ZIP final
        const zipContent = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipContent);

        // Lancement du téléchargement unique
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `Grok-Media-Export-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Nettoyage de la mémoire après le téléchargement
        setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);

    } catch (error) {
        console.error("Erreur lors de la création du ZIP :", error);
        alert("❌ Une erreur est survenue lors de la compression des fichiers.");
    } finally {
        setLoading(false);
    }
};


async function deleteSelected() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const toDelete = allAssets.filter(a => a.source === 'Local' && checked.includes(a.url));
    if (!toDelete.length) return alert("Sélectionnez des fichiers LOCAUX.");
    if (!confirm(`Supprimer ${toDelete.length} dossiers ?`)) return;
    setLoading(true, "🗑️ Suppression...");
    try {
        if (await rootHandle.queryPermission({mode: 'readwrite'}) !== 'granted') await rootHandle.requestPermission({mode: 'readwrite'});
        for (const asset of toDelete) {
            await asset.grandParentHandle.removeEntry(asset.parentHandle.name, { recursive: true });
            URL.revokeObjectURL(asset.url);
        }
        allAssets = allAssets.filter(a => !toDelete.includes(a));
        renderGallery();
    } catch (err) { alert("Erreur de permission."); }
    finally { setLoading(false); }
}

window.downloadFile = function() { 
    if (currentExportData) { const a = document.createElement('a'); a.href = currentExportData.url; a.download = currentExportData.name; a.click(); }
};

window.downloadPrompt = function(promptText, id) {
    const blob = new Blob([promptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-grok-${id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// ==========================================
// LIGHTBOX AMÉLIORÉE AVEC ACTIONS
// ==========================================
function openLightbox(index) {
    currentLightboxIndex = index;
    const asset = galleryItems[index]; // galleryItems contient la liste filtrée/triée
    if (!asset) return;

    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent'); // ID corrigé (C majuscule)
    
    // 1. Nettoyage du contenu précédent
    if (content) content.innerHTML = '';

    // 2. Rendu du média (Image ou Vidéo)
    if (asset.media_type === 'video') {
        const video = document.createElement('video');
        video.src = asset.url;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '85vh'; // On laisse un peu plus de place pour la toolbar
        if (content) content.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = asset.url;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '85vh'; // On laisse un peu plus de place pour la toolbar
        img.style.objectFit = 'contain';
        
        // Fallback automatique si l'image expire
        img.onerror = () => {
            if (img.src.includes('/images/')) {
                img.src = img.src.replace('/images/', '/share-images/');
            }
        };
        
        if (content) content.appendChild(img);
    }

    // 3. Construction de la barre d'outils (Footer)
    const footer = document.getElementById('lightboxUrlItem');
    if (footer) {
        footer.innerHTML = ''; // On vide le texte simple précédent
        
        // Configuration du style du footer pour accueillir les boutons
        footer.style.display = 'flex';
        footer.style.flexDirection = 'column';
        footer.style.alignItems = 'center';
        footer.style.gap = '10px';
        footer.style.padding = '15px';
        footer.style.background = 'rgba(0,0,0,0.7)';
        footer.style.borderRadius = '12px';
        footer.style.maxWidth = '80%';
        footer.style.margin = '0 auto';
        footer.style.bottom = '60px'; // Ajustement de la position

        // A. Le texte du Prompt
        const promptText = document.createElement('p');
        promptText.style.margin = '0';
        promptText.style.color = '#fff';
        promptText.style.fontSize = '0.9rem';
        promptText.style.lineHeight = '1.4';
        promptText.style.whiteSpace = 'pre-wrap'; // Garde les retours à la ligne
        promptText.style.textAlign = 'center';
        promptText.textContent = asset.prompt;
        footer.appendChild(promptText);

        // B. Conteneur des Boutons d'action
        const actionBtns = document.createElement('div');
        actionBtns.style.display = 'flex';
        actionBtns.style.gap = '10px';
        actionBtns.style.marginTop = '5px';
        footer.appendChild(actionBtns);

        // Bouton 1 : Lien Grok (si disponible)
        if (asset.link) {
            const linkBtn = document.createElement('a');
            linkBtn.href = asset.link;
            linkBtn.target = '_blank';
            // On réutilise tes classes CSS existantes
            linkBtn.className = 'btn grok-link-btn'; 
            linkBtn.style.padding = '8px 15px';
            linkBtn.style.fontSize = '0.8rem';
            linkBtn.innerHTML = '🔗 VOIR SUR GROK';
            // Important : empêche la lightbox de se fermer au clic
            linkBtn.onclick = (e) => e.stopPropagation(); 
            actionBtns.appendChild(linkBtn);
        }

        // Bouton 2 : Copier le Prompt
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn secondary outline-btn';
        copyBtn.style.padding = '8px 15px';
        copyBtn.style.fontSize = '0.8rem';
        copyBtn.style.borderColor = '#fff';
        copyBtn.style.color = '#fff';
        copyBtn.innerHTML = '📋 COPIER PROMPT';
        
        copyBtn.onclick = (e) => {
            e.stopPropagation(); // Empêche la fermeture de la lightbox
            
            // Utilisation de l'API Clipboard moderne
            navigator.clipboard.writeText(asset.prompt).then(() => {
                // Feedback visuel temporaire
                copyBtn.innerHTML = '✅ COPIÉ !';
                copyBtn.style.background = 'var(--visited)';
                copyBtn.style.color = '#000';
                copyBtn.style.borderColor = 'var(--visited)';
                
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 COPIER PROMPT';
                    copyBtn.style.background = 'transparent';
                    copyBtn.style.color = '#fff';
                    copyBtn.style.borderColor = '#fff';
                }, 2000);
            }).catch(err => {
                console.error('Erreur de copie:', err);
                copyBtn.innerHTML = '❌ ÉCHEC';
            });
        };
        actionBtns.appendChild(copyBtn);
    }

    // 4. Affichage de la lightbox
    if (lightbox) lightbox.style.display = 'flex';
}

window.closeLightbox = function() { 
    const lb = document.getElementById('lightbox');
    if(lb) lb.style.display = 'none'; 
    const lbContent = document.getElementById('lightboxContent');
    if(lbContent) lbContent.innerHTML = ''; 
};

window.nextMedia = function() { openLightbox((currentLightboxIndex + 1) % galleryItems.length); };
window.prevMedia = function() { openLightbox((currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length); };

window.openProfileModal = function() {
    if(!authData) return alert("Chargez une archive complète.");
    const u = authData.user;
    if(document.getElementById('userName')) document.getElementById('userName').textContent = `${u.givenName} ${u.familyName[0]}.`;
    if(document.getElementById('userEmail')) document.getElementById('userEmail').textContent = u.email.replace(/(.{3})(.*)(?=@)/, "$1***");
    const bal = billingData ? (billingData.balance_map["21583193-d632-4a53-9eae-b3c55a2b2b06"] || 0) : 0;
    if(document.getElementById('userBalance')) document.getElementById('userBalance').textContent = `${bal} $`;
    if(document.getElementById('sessionCount')) document.getElementById('sessionCount').textContent = authData.sessions.length;
    const list = document.getElementById('sessionList');
    if(list) {
        list.innerHTML = '';
        authData.sessions.slice(0, 8).forEach(s => {
            const r = document.createElement('tr');
            r.innerHTML = `<td>${s.cfMetadata.city || "N/A"}</td><td>${s.userAgent.includes("Android") ? "📱 Mobile" : "💻 Web"}</td><td>${new Date(s.lastAuthTime).toLocaleDateString()}</td>`;
            list.appendChild(r);
        });
    }
    const pm = document.getElementById('profileModal');
    if(pm) pm.style.display = 'flex';
};

window.closeProfileModal = function() { const pm = document.getElementById('profileModal'); if(pm) pm.style.display = 'none'; };
window.closePopup = function() { const sp = document.getElementById('sharePopup'); if(sp) sp.style.display = 'none'; };

window.scrollToSection = function(targetId, btnElement = null) {
    const allSections = ['jsonSection', 'linkedLocalSection', 'localSection'];
    
    // 1. Gestion du changement de couleur des boutons
    if (btnElement) {
        // On enlève la classe 'active' de tous les boutons
        document.querySelectorAll('.nav-anchor-btn').forEach(btn => btn.classList.remove('active'));
        // On l'ajoute uniquement au bouton cliqué
        btnElement.classList.add('active');
    }

    // 2. Gestion de l'ouverture/fermeture des accordéons
    allSections.forEach(id => {
        const sec = document.getElementById(id);
        if (sec) {
            const header = sec.previousElementSibling; 
            
            if (id === targetId) {
                sec.classList.remove('hidden');
                if (header) {
                    header.classList.remove('collapsed');
                    setTimeout(() => header.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }
            } else {
                sec.classList.add('hidden');
                if (header) {
                    header.classList.add('collapsed');
                }
            }
        }
    });
};



// ==========================================
// EXPORT & LISTENERS ROBUSTES
// ==========================================
function setupSelectAllCheckboxes() {
    const setups = [
        { section: 'jsonSection', grid: 'jsonLinks' }, 
        { section: 'linkedLocalSection', grid: 'linkedLocalFiles' },
        { section: 'localSection', grid: 'localFiles' }
    ];
    setups.forEach(({section, grid}) => {
        const secEl = document.getElementById(section);
        if (!secEl) return;
        const header = secEl.previousElementSibling;
        if (!header) return;
        const h2 = header.querySelector('h2');
        if (!h2 || h2.querySelector('.select-all-cb')) return;
        
        const label = document.createElement('label');
        label.style.marginLeft = '15px'; label.style.fontSize = '0.85rem'; label.style.display = 'inline-flex'; label.style.alignItems = 'center'; label.style.cursor = 'pointer'; label.style.fontWeight = 'normal'; label.style.background = 'rgba(255, 255, 255, 0.1)'; label.style.padding = '4px 10px'; label.style.borderRadius = '15px'; label.onclick = (e) => e.stopPropagation();

        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'select-all-cb'; cb.dataset.targetGrid = grid; cb.style.marginRight = '8px'; cb.style.width = '16px'; cb.style.height = '16px';
        
        cb.onchange = (e) => {
            const targetGrid = document.getElementById(grid);
            if (targetGrid) {
                const checkboxes = targetGrid.querySelectorAll('input[type="checkbox"]:not(.select-all-cb)');
                checkboxes.forEach(c => {
                    c.checked = e.target.checked;
                    
                    // NOUVEAU : Met à jour la mémoire (selectedSet) pour chaque case
                    if (c.checked) {
                        selectedSet.add(c.dataset.url);
                    } else {
                        selectedSet.delete(c.dataset.url);
                    }
                });
                // NOUVEAU : Sauvegarde la session après avoir tout coché/décoché
                if (typeof saveSession === 'function') {
                    saveSession();
                }
            }
        };
        label.appendChild(cb); label.appendChild(document.createTextNode('Tout sélectionner')); h2.appendChild(label);
    });
}

window.onload = () => { loadSession(); setupSelectAllCheckboxes(); };

function safeBind(id, eventType, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventType, handler);
}

safeBind('loadArchiveBtn', 'click', async () => {
    if (!window.showDirectoryPicker) return alert("Utilisez Chrome ou Edge.");
    try { rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' }); await saveSession(); await runFullScan(); } 
    catch (e) { if (e.name !== 'AbortError') console.error(e); }
});

safeBind('exportBtn', 'click', () => {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const selected = allAssets.filter(a => checked.includes(a.url));
    if (!selected.length) return alert("Veuillez cocher des éléments d'abord !");
    
    const localCount = selected.filter(a => a.source === 'Local').length;
    const linkCount = selected.filter(a => a.link).length; // Compte les liens disponibles
    
    const popupContent = document.querySelector('#sharePopup .popup-content');
    if (popupContent) {
        let mediaBtnHtml = '';
        if (localCount > 0) {
            mediaBtnHtml = `<button class="btn" id="mediaDownloadBtn" style="width:100%;background:#00ffaa;color:#000;">📦 Télécharger les Médias Locaux (${localCount})</button>`;
        } else {
            mediaBtnHtml = `<p style="font-size: 0.8rem; color: #ffa500; margin-bottom: 5px;">⚠️ Médias Cloud : utilisez le clic droit sur l'image.</p>`;
        }

        // Ajout du bouton d'ouverture groupée si des liens existent
        let openLinksBtnHtml = '';
        if (linkCount > 0) {
            openLinksBtnHtml = `<button class="btn action-btn" id="openLinksBtn" style="width:100%; margin-bottom:10px; background:var(--visited); color:#000;">🌐 Ouvrir dans Grok (${linkCount} onglets)</button>`;
        }

        popupContent.innerHTML = `
            <h2 style="margin-bottom:15px;">✅ ${selected.length} éléments</h2>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="btn primary-btn" id="jsonDownloadBtn" style="width:100%">📄 Télécharger l'export JSON</button>
                ${mediaBtnHtml}
                ${openLinksBtnHtml}
                <button class="btn secondary" style="width:100%" onclick="closePopup()">Annuler</button>
            </div>`;
            
        // Logique Export JSON
        const exportData = selected.map(a => ({ id: a.id, prompt: a.prompt, media_type: a.media_type, url: a.url, date: a.date.toISOString(), link: a.link }));
        const blob = new Blob([JSON.stringify({ media_posts: exportData }, null, 2)], { type: 'application/json' });
        currentExportData = { url: URL.createObjectURL(blob), name: `export-${Date.now()}.json` };
        document.getElementById('jsonDownloadBtn').onclick = () => { const a = document.createElement('a'); a.href = currentExportData.url; a.download = currentExportData.name; a.click(); };
        
        // Logique Téléchargement Médias
        if (localCount > 0) {
            document.getElementById('mediaDownloadBtn').onclick = () => { closePopup(); downloadSelectedMedia(); };
        }

        // Logique Ouverture Onglets
        if (linkCount > 0) {
            document.getElementById('openLinksBtn').onclick = () => { closePopup(); openSelectedInBrowser(); };
        }
    }
    
    const sp = document.getElementById('sharePopup');
    if(sp) sp.style.display = 'flex';
});

safeBind('importJsonBtn', 'click', () => { const fileInput = document.getElementById('jsonFileInput'); if(fileInput) fileInput.click(); });
safeBind('jsonFileInput', 'change', (e) => { if (e.target.files[0]) handleJsonImport(e.target.files[0]); e.target.value = ''; });

const dropZoneOverlay = document.getElementById('dropZoneOverlay');
if (dropZoneOverlay) {
    document.body.addEventListener('dragover', (e) => { e.preventDefault(); dropZoneOverlay.style.display = "flex"; });
    document.body.addEventListener('dragleave', (e) => { if (e.relatedTarget === null) dropZoneOverlay.style.display = "none"; });
    document.body.addEventListener('drop', (e) => { e.preventDefault(); dropZoneOverlay.style.display = "none"; const file = e.dataTransfer.files[0]; if (file && file.name.endsWith('.json')) handleJsonImport(file); else alert("Veuillez déposer un fichier .json"); });
}

window.updateGalleryWithLoading = function() {
    setLoading(true, "⏳ Application du tri et des filtres...");
    setTimeout(() => { try { renderGallery(); } finally { setLoading(false); } }, 50); 
};

safeBind('sortType', 'change', updateGalleryWithLoading);
safeBind('sortDate', 'change', updateGalleryWithLoading);
safeBind('nextBtn', 'click', (e) => { e.stopPropagation(); window.nextMedia(); });
safeBind('prevBtn', 'click', (e) => { e.stopPropagation(); window.prevMedia(); });
safeBind('clearBtn', 'click', () => { if(confirm("Effacer ?")) { allAssets = []; renderGallery(); } });
safeBind('donBtn', 'click', () => { window.open('https://www.paypal.com/donate/?hosted_button_id=4SSHF5SWPGAQW', '_blank'); });
safeBind('deleteSelectedBtn', 'click', deleteSelected);
safeBind('clearSessionBtn', 'click', clearSession);

// Gestion de l'interrupteur du menu rétractable
safeBind('toggleToolbarsBtn', 'click', () => {
    const container = document.getElementById('toolbarsContainer');
    const btn = document.getElementById('toggleToolbarsBtn');
    if (container) {
        container.classList.toggle('collapsed');
        btn.innerHTML = container.classList.contains('collapsed') ? '⬇️' : '⬆️';
        btn.title = container.classList.contains('collapsed') ? "Afficher les outils" : "Masquer les outils";
    }
});

const toggleTheme = document.getElementById('toggleTheme');
let isDark = true;
if (toggleTheme) {
    toggleTheme.addEventListener('click', () => {
        isDark = !isDark;
        document.body.classList.toggle('light', !isDark);
        toggleTheme.textContent = isDark ? '☀️' : '🌙';
    });
}

// Bouton Autoplay déplacé dans l'en-tête (Header)
const autoPlayBtn = document.createElement('button');
autoPlayBtn.className = "icon-btn autoplay-btn";
autoPlayBtn.id = "autoPlayBtn";
autoPlayBtn.title = "Activer/Désactiver la lecture automatique des vidéos";
autoPlayBtn.style.color = autoPlayVideo ? "var(--text)" : "var(--warning)";
autoPlayBtn.style.borderColor = autoPlayVideo ? "var(--border)" : "var(--warning)";
autoPlayBtn.innerHTML = autoPlayVideo ? '▶️ Auto' : '⏸️ Auto';

const headerActions = document.querySelector('.header-actions');
if (headerActions) {
    headerActions.prepend(autoPlayBtn);
}

autoPlayBtn.addEventListener('click', () => {
    autoPlayVideo = !autoPlayVideo;
    localStorage.setItem('grokAutoPlay', autoPlayVideo);
    
    autoPlayBtn.innerHTML = autoPlayVideo ? '▶️ Auto' : '⏸️ Auto';
    autoPlayBtn.style.color = autoPlayVideo ? "var(--text)" : "var(--warning)";
    autoPlayBtn.style.borderColor = autoPlayVideo ? "var(--border)" : "var(--warning)";
    
    document.querySelectorAll('.lazy-video').forEach(video => {
        if (autoPlayVideo) {
            const rect = video.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >= 0) {
                if (!video.dataset.src) video.play().catch(() => {});
            }
        } else { video.pause(); }
    });
});



window.onclick = (e) => { 
    if(e.target.id === 'profileModal' || e.target.classList.contains('modal-overlay')) closeProfileModal();
    if(e.target.id === 'lightbox') closeLightbox();
    if(e.target.id === 'sharePopup') closePopup();
};

document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox');
    if (lb && lb.style.display === 'flex') {
        if (e.key === "ArrowRight") window.nextMedia();
        if (e.key === "ArrowLeft") window.prevMedia();
        if (e.key === "Escape") closeLightbox();
    }
});



window.handleImgError = function(img) {
    // Si on a déjà tout tenté (images -> share-images -> échec final)
    if (img.dataset.failed) return;

    // Tentative 1 : Basculer de /images/ vers /share-images/
    if (!img.dataset.triedShare) {
        let newUrl = img.src.replace('/imagine-public/images/', '/imagine-public/share-images/');
        
        if (newUrl !== img.src) {
            img.dataset.triedShare = "true";
            
            // On teste la nouvelle URL en arrière-plan avant de l'assigner
            let tester = new Image();
            tester.onload = () => {
                img.src = newUrl;
                img.classList.add('loaded');
                if (img.parentElement) img.parentElement.style.animation = 'none';
            };
            tester.onerror = () => {
                // Si même le share-images échoue, on marque comme échec temporaire
                img.dataset.failed = "true";
                img.src = 'https://placehold.co/400x300?text=Lien+Expire';
                img.classList.add('loaded');
                if (img.parentElement) img.parentElement.style.animation = 'none';
            };
            tester.src = newUrl;
        } else {
            // Si l'URL n'était pas transformable, on affiche l'erreur
            img.dataset.failed = "true";
            img.src = 'https://placehold.co/400x300?text=Indisponible';
            img.classList.add('loaded');
        }
    }
};

// ==========================================
// GESTION DE LA MODALE PROMPT
// ==========================================

// Variable pour stocker temporairement les données du prompt en cours de lecture
let currentPromptData = { text: '', id: '' };

window.openPromptModal = function(promptText, id) {
    currentPromptData = { text: promptText, id: id };
    const modalText = document.getElementById('fullPromptText');
    const modal = document.getElementById('promptModal');
    
    if (modalText && modal) {
        // On utilise textContent pour éviter toute interprétation de code HTML dans le prompt
        modalText.textContent = promptText; 
        modal.style.display = 'flex';
    }
};

window.closePromptModal = function() {
    const modal = document.getElementById('promptModal');
    if (modal) modal.style.display = 'none';
};

// Liaison du bouton de téléchargement situé à l'intérieur de la modale
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadPromptConfirmBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            if (currentPromptData.text) {
                window.downloadPrompt(currentPromptData.text, currentPromptData.id);
            }
        };
    }
});

// Ajout de la fermeture de la modale prompt lors d'un clic à l'extérieur
const originalOnClick = window.onclick;
window.onclick = (e) => {
    if (originalOnClick) originalOnClick(e);
    if (e.target.id === 'promptModal') closePromptModal();
};


window.openSelectedInBrowser = function() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const selectedWithLinks = allAssets.filter(a => checked.includes(a.url) && a.link);

    if (selectedWithLinks.length === 0) {
        alert("Aucun lien Grok disponible pour cette sélection.");
        return;
    }

    if (selectedWithLinks.length > 15 && !confirm(`Ouvrir ${selectedWithLinks.length} onglets ? Cela peut ralentir votre navigateur.`)) {
        return;
    }

    alert("💡 Si un seul onglet s'ouvre, vérifiez que votre navigateur n'a pas bloqué les 'fenêtres surgissantes' (Pop-ups) en haut à droite de la barre d'adresse.");

    selectedWithLinks.forEach(asset => {
        window.open(asset.link, '_blank');
    });
};



// ==========================================
// MARQUEUR DE SCROLL INTELLIGENT
// ==========================================
let scrollTimeout;

window.addEventListener('scroll', () => {
    if (!scrollTimeout) {
        scrollTimeout = requestAnimationFrame(() => {
            // 1. On déclare les variables ICI, tout en haut, pour qu'elles soient toujours accessibles
            const scrollTop = window.scrollY;
            const docHeight = document.body.scrollHeight;
            const winHeight = window.innerHeight;
            
            // 2. On sauvegarde la position instantanément à chaque mouvement
            localStorage.setItem('grokGalleryScroll', Math.round(scrollTop));
            
            // 3. On gère l'affichage visuel du marqueur
            const marker = document.getElementById('scrollMarker');
            const progressSpan = document.getElementById('scrollProgress');
            const dateSpan = document.getElementById('scrollDate');

            // Détection du bas de page pour charger la suite
            const triggerPoint = docHeight - winHeight - 1500;
            
            // NOUVEAU : On calcule combien on a chargé en tout
            const totalLoaded = cloudIndex + linkedIndex + orphanIndex;
            
            // On charge si on approche du bas ET qu'on n'a pas tout chargé
            if (scrollTop > triggerPoint && totalLoaded < galleryItems.length) {
                loadNextChunk();
            }
            
if (marker && progressSpan && dateSpan) {
                // Calcul du pourcentage
                let percent = 0;
                if (docHeight > winHeight) {
                    percent = Math.round((scrollTop / (docHeight - winHeight)) * 100);
                }
                
                // Si on a scrollé d'au moins 300 pixels
                if (scrollTop > 300) {
                    marker.classList.add('visible');
                    progressSpan.textContent = percent + '%';
                    
                    // Récupération de la date au centre (méthode infaillible via dataset)
                    const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
                    const card = centerEl ? centerEl.closest('.media-card') : null;
                    
                    if (card && card.dataset.date) {
                        dateSpan.textContent = '📅 ' + card.dataset.date.substring(0, 10);
                    }
                } else {
                    marker.classList.remove('visible');
                }
            }
            
            scrollTimeout = null;
        });
    }
});
