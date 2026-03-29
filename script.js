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
let selectedSet = new Set(); 
let isCompact = false; 
let currentIndex = 0;
const CHUNK_SIZE = 50; 
let cloudItems = [];
let linkedItems = [];
let orphanItems = [];
let cloudIndex = 0;
let linkedIndex = 0;
let orphanIndex = 0;

window.toggleCompactMode = function() {
    isCompact = !isCompact;
    ['jsonLinks', 'linkedLocalFiles', 'localFiles'].forEach(id => {
        const grid = document.getElementById(id);
        if (grid) grid.classList.toggle('compact', isCompact);
    });
    const btn = document.getElementById('compactBtn');
    if (btn) {
        btn.innerHTML = isCompact ? '🔲 Vue normale' : '⏹️ Vue réduite';
        btn.style.background = isCompact ? 'var(--accent)' : 'transparent';
        btn.style.color = isCompact ? 'var(--bg)' : 'var(--text)';
    }
    if (isCompact) {
        document.querySelectorAll('.lazy-video').forEach(video => video.pause());
    }
};

const jsonLinksEl = document.getElementById('jsonLinks');
const localFilesEl = document.getElementById('localFiles');
const linkedLocalFilesEl = document.getElementById('linkedLocalFiles'); 

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
    await store.put(Array.from(selectedSet), "selectedSet"); 
}

async function loadSession() {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const savedHandle = await new Promise(r => { const req = store.get("rootHandle"); req.onsuccess = () => r(req.result); });
        const savedAssets = await new Promise(r => { const req = store.get("importedAssets"); req.onsuccess = () => r(req.result); });
        const savedVisited = await new Promise(r => { const req = store.get("visitedSet"); req.onsuccess = () => r(req.result); });
        const savedSelected = await new Promise(r => { const req = store.get("selectedSet"); req.onsuccess = () => r(req.result); });

        if (savedVisited) visitedSet = new Set(savedVisited);
        if (savedSelected) selectedSet = new Set(savedSelected); 
        
        if (savedHandle || (savedAssets && savedAssets.length > 0)) {
            rootHandle = savedHandle;
            if (savedHandle) {
                if (await savedHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                    await runFullScan();
                }
            } else if (savedAssets) {
                allAssets = savedAssets;
                allAssets.forEach(a => { if (!(a.date instanceof Date)) a.date = new Date(a.date); });
                renderGallery();
            }
        }
    } catch (e) { console.error("Session non chargée:", e); }
}

async function clearSession() {
    if (!confirm("⚠️ Voulez-vous vraiment fermer la session et effacer l'affichage ?")) return;
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        await store.clear();
        rootHandle = null;
        visitedSet = new Set();
        selectedSet = new Set(); 
        allAssets = [];
        galleryItems = [];
        authData = null;
        billingData = null;
        renderGallery();
        updateAppVisibility();
        updateFloatingActionBar();
    } catch (e) { console.error(e); }
}

// ==========================================
// VISIBILITÉ ACCUEIL / APPLICATION
// ==========================================
function updateAppVisibility() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const appView = document.getElementById('appView');
    const toolbarsContainer = document.getElementById('toolbarsContainer');
    
    if (allAssets.length === 0) {
        if (welcomeScreen) welcomeScreen.style.display = 'flex';
        if (appView) appView.style.display = 'none';
        if (toolbarsContainer) toolbarsContainer.style.display = 'none';
    } else {
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (appView) appView.style.display = 'block';
        if (toolbarsContainer) toolbarsContainer.style.display = 'flex';
    }
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
    
    const isOpening = targetSection.classList.contains('hidden');

    allSections.forEach(id => {
        const sec = document.getElementById(id);
        const header = sec ? sec.previousElementSibling : null;
        
        if (id === targetId && isOpening) {
            if (sec) sec.classList.remove('hidden');
            if (header) header.classList.remove('collapsed');
            
            const topBtn = document.querySelector(`.nav-anchor-btn[onclick*="${id}"]`);
            if (topBtn) {
                document.querySelectorAll('.nav-anchor-btn').forEach(b => b.classList.remove('active'));
                topBtn.classList.add('active');
            }
        } else {
            if (sec) sec.classList.add('hidden');
            if (header) header.classList.add('collapsed');
        }
    });
}

function forceOpenSection(id) {
    const section = document.getElementById(id);
    if (section) {
        section.classList.add('hidden'); 
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
// IMPORT JSON & CHARGEMENT
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

        rootHandle = null; 
        await saveSession(); 
        renderGallery();
        updateAppVisibility();
        forceOpenSection('jsonSection');
    } catch (e) {
        alert("❌ Erreur d'importation : " + e.message);
    } finally {
        setLoading(false);
    }
}

async function runFullScan() {
    setLoading(true, "🔍 Récupération des données...");
    allAssets = [];
    authData = null;
    billingData = null;
    
    await scanDirectory(rootHandle);

    allAssets.forEach(asset => {
        if (asset.source === 'Local') {
            const cloudMatch = allAssets.find(a => a.source === 'Cloud' && a.id === asset.id);
            if (cloudMatch) {
                asset.prompt = cloudMatch.prompt;
                asset.link = cloudMatch.link;
                asset.hasCloudMatch = true;  
            } else {
                asset.prompt = "Aucun texte disponible";
                asset.hasCloudMatch = false; 
            }
        }
    });

    setLoading(false);
    renderGallery();
    updateAppVisibility();
    
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
                
                if (entry.name === 'prod-grok-backend.json') {
                    const data = JSON.parse(await file.text());
                    (data.media_posts || []).forEach(p => {
                        if (!allAssets.find(a => a.id === p.id && a.source === 'Cloud')) {
                            const isVideo = p.media_type === 'video';
                            const realPrompt = p.original_prompt || p.prompt || p.text || 'Texte introuvable';
                            
                            allAssets.push({
                                id: p.id, prompt: realPrompt, 
                                url: isVideo ? `https://imagine-public.x.ai/imagine-public/share-videos/${p.id}.mp4` : `https://imagine-public.x.ai/imagine-public/images/${p.id}.jpg`,
                                poster: isVideo ? `https://imagine-public.x.ai/imagine-public/images/${p.id}.jpg` : null,
                                link: p.link, media_type: p.media_type, date: new Date(p.create_time), source: 'Cloud'
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

// ==========================================
// CRÉATION DES CARTES D'IMAGES (Épurées)
// ==========================================
function createCardElement(asset, idx) {
    const isV = visitedSet.has(asset.url);
    const card = document.createElement('div');
    card.className = `media-card ${isV ? 'visited' : ''}`;
    
    card.style.contentVisibility = 'auto';
    card.style.containIntrinsicSize = '300px 400px';

    const linkedCloud = allAssets.find(item => item.source === 'Cloud' && item.id === asset.id);
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
        
        <div class="info" style="padding: 12px; display: flex; flex-direction: column; justify-content: space-between; flex-grow: 1;">
            <strong style="display: block; margin-bottom: 8px; font-size: 0.95rem; line-height: 1.3;">
                ${isVideo ? '🎥 ' : ''}${asset.prompt.slice(0, 60)}${asset.prompt.length > 60 ? '...' : ''}
            </strong>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                <div style="font-size:0.75rem; color:#888;">📅 ${dateTimeStr}</div>
                
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; background: rgba(0,204,136,0.1); padding: 5px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; color: var(--visited); transition: 0.2s;" onclick="event.stopPropagation()" onmouseover="this.style.background='rgba(0,204,136,0.2)'" onmouseout="this.style.background='rgba(0,204,136,0.1)'">
                    <input type="checkbox" data-url="${asset.url}" ${selectedSet.has(asset.url) ? 'checked' : ''} style="margin: 0; width: 16px; height: 16px;">
                    Sélectionner
                </label>
            </div>
        </div>`;

    setupCardEvents(card, asset, idx, isVideo);
    return card;
}

function setupCardEvents(card, asset, idx, isVideo) {
    const checkbox = card.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                selectedSet.add(this.dataset.url);
            } else {
                selectedSet.delete(this.dataset.url);
            }
            saveSession();
            updateFloatingActionBar();

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

    let isLongPress = false;
    let touchTimer = null;

    const forcePlayVideo = () => {
        if (typeof isCompact !== 'undefined' && isCompact) return; 
        if (isVideo && !autoPlayVideo) {
            const v = card.querySelector('video');
            if (v) {
                if (v.dataset.src) { v.src = v.dataset.src; v.removeAttribute('data-src'); v.load(); }
                v.play().catch(() => {});
            }
        }
    };
    const forcePauseVideo = () => { const v = card.querySelector('video'); if (v) v.pause(); };

    card.onmouseenter = forcePlayVideo;
    card.onmouseleave = forcePauseVideo;

    if (isVideo) {
        card.addEventListener('touchstart', () => {
            isLongPress = false;
            touchTimer = setTimeout(() => { isLongPress = true; forcePlayVideo(); }, 400);
        }, { passive: true });
        const cancelTouch = () => { clearTimeout(touchTimer); forcePauseVideo(); };
        card.addEventListener('touchend', cancelTouch, { passive: true });
        card.addEventListener('touchcancel', cancelTouch, { passive: true });
        card.addEventListener('touchmove', cancelTouch, { passive: true });
    }

    card.onclick = (e) => {
        if (isLongPress) { e.preventDefault(); isLongPress = false; return; }
        markAsViewed(card);
        openLightbox(idx); 
    };

    if (isVideo && videoObserver) { videoObserver.observe(card.querySelector('video')); }
}

function updateCounters(filtered) {
    const cloudLen = filtered.filter(a => a.source === 'Cloud').length;
    const matchedLen = filtered.filter(a => a.source === 'Local' && a.hasCloudMatch).length;
    const unmatchedLen = filtered.filter(a => a.source === 'Local' && !a.hasCloudMatch).length;
    
    const elements = { 'numberImg': unmatchedLen, 'numberLinkedLocalTop': matchedLen, 'numberLink': cloudLen, 'numberLinkedLocal': matchedLen, 'numberImg2': unmatchedLen, 'numberLink2': cloudLen };
    for (const [id, value] of Object.entries(elements)) { const el = document.getElementById(id); if (el) el.textContent = value; }
}

function renderGallery() {
    cloudIndex = 0; linkedIndex = 0; orphanIndex = 0;
    document.querySelectorAll('.select-all-cb').forEach(cb => cb.checked = false);

    const typeF = document.getElementById('sortType')?.value || 'all';
    const dateO = document.getElementById('sortDate')?.value || 'date-desc';
    
    const filtered = allAssets.filter(a => typeF === 'all' || a.media_type === typeF);
    
    cloudItems = filtered.filter(a => a.source === 'Cloud');
    linkedItems = filtered.filter(a => a.source === 'Local' && a.hasCloudMatch);
    orphanItems = filtered.filter(a => a.source === 'Local' && !a.hasCloudMatch);

    const sortFn = (a, b) => dateO === 'date-desc' ? b.date - a.date : a.date - b.date;
    cloudItems.sort(sortFn); linkedItems.sort(sortFn); orphanItems.sort(sortFn);

    galleryItems = [...cloudItems, ...linkedItems, ...orphanItems];
    
    if (jsonLinksEl) jsonLinksEl.innerHTML = ''; 
    if (localFilesEl) localFilesEl.innerHTML = '';
    if (linkedLocalFilesEl) linkedLocalFilesEl.innerHTML = ''; 

    if (videoObserver) videoObserver.disconnect();

    window.loadNextChunk = function() {
        if (cloudIndex >= cloudItems.length && linkedIndex >= linkedItems.length && orphanIndex >= orphanItems.length) return;

        const cloudFrag = document.createDocumentFragment();
        const linkedFrag = document.createDocumentFragment();
        const orphanFrag = document.createDocumentFragment();

        const cloudLimit = Math.min(cloudIndex + CHUNK_SIZE, cloudItems.length);
        cloudItems.slice(cloudIndex, cloudLimit).forEach((asset, i) => { cloudFrag.appendChild(createCardElement(asset, cloudIndex + i)); });
        cloudIndex = cloudLimit;

        const linkedLimit = Math.min(linkedIndex + CHUNK_SIZE, linkedItems.length);
        linkedItems.slice(linkedIndex, linkedLimit).forEach((asset, i) => { linkedFrag.appendChild(createCardElement(asset, cloudItems.length + linkedIndex + i)); });
        linkedIndex = linkedLimit;

        const orphanLimit = Math.min(orphanIndex + CHUNK_SIZE, orphanItems.length);
        orphanItems.slice(orphanIndex, orphanLimit).forEach((asset, i) => { orphanFrag.appendChild(createCardElement(asset, cloudItems.length + linkedItems.length + orphanIndex + i)); });
        orphanIndex = orphanLimit;

        if (cloudFrag.children.length > 0 && jsonLinksEl) jsonLinksEl.appendChild(cloudFrag);
        if (linkedFrag.children.length > 0 && linkedLocalFilesEl) linkedLocalFilesEl.appendChild(linkedFrag);
        if (orphanFrag.children.length > 0 && localFilesEl) localFilesEl.appendChild(orphanFrag);
    };

    loadNextChunk();
    updateCounters(filtered);

    if (cloudItems.length > 0) { forceOpenSection('jsonSection'); } 
    else if (linkedItems.length > 0) { forceOpenSection('linkedLocalSection'); } 
    else if (orphanItems.length > 0) { forceOpenSection('localSection'); }

    const savedScroll = parseInt(localStorage.getItem('grokGalleryScroll') || "0");
    if (savedScroll > 500) {
        const scrollLoader = setInterval(() => {
            const totalLoaded = cloudIndex + linkedIndex + orphanIndex;
            if (document.body.scrollHeight > savedScroll + 1000 || totalLoaded >= galleryItems.length) {
                window.scrollTo({ top: savedScroll, behavior: 'instant' }); clearInterval(scrollLoader);
            } else { loadNextChunk(); }
        }, 50);
    }
}

// ==========================================
// TÉLÉCHARGEMENT & SUPPRESSION
// ==========================================
window.downloadLocalMedia = function(url, id, type) {
    const a = document.createElement('a'); a.href = url; a.download = `grok-local-${id}.${type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

window.downloadSelectedMedia = async function() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const localSelected = allAssets.filter(a => checked.includes(a.url) && a.source === 'Local');

    if (localSelected.length === 0) return;
    if (localSelected.length > 50 && !confirm(`Compresser ${localSelected.length} fichiers peut prendre du temps. Continuer ?`)) return;

    setLoading(true, "📦 Création de l'archive ZIP en cours...");

    try {
        const zip = new JSZip();
        const folder = zip.folder("Grok_Export_Local");

        for (let i = 0; i < localSelected.length; i++) {
            const asset = localSelected[i];
            const filename = `grok-local-${asset.id}.${asset.media_type === 'video' ? 'mp4' : 'jpg'}`;
            const response = await fetch(asset.url);
            const blob = await response.blob();
            folder.file(filename, blob);
        }

        const zipContent = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipContent);

        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `Grok-Media-Export-${Date.now()}.zip`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);

    } catch (error) { alert("❌ Erreur lors de la compression des fichiers."); } 
    finally { setLoading(false); }
};

async function deleteSelected() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const toDelete = allAssets.filter(a => a.source === 'Local' && checked.includes(a.url));
    if (!toDelete.length) return alert("Sélectionnez des fichiers sur votre ordinateur.");
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
        
        // Vider la sélection après suppression
        selectedSet.clear();
        updateFloatingActionBar();
    } catch (err) { alert("Erreur de permission."); }
    finally { setLoading(false); }
}

window.downloadFile = function() { 
    if (currentExportData) { const a = document.createElement('a'); a.href = currentExportData.url; a.download = currentExportData.name; a.click(); }
};

window.downloadPrompt = function(promptText, id) {
    const blob = new Blob([promptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `prompt-grok-${id}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ==========================================
// LIGHTBOX (Visionneuse d'image)
// ==========================================
function openLightbox(index) {
    currentLightboxIndex = index;
    const asset = galleryItems[index]; 
    if (!asset) return;

    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent'); 
    if (content) content.innerHTML = '';

    if (asset.media_type === 'video') {
        const video = document.createElement('video');
        video.src = asset.url; video.controls = true; video.autoplay = true;
        video.style.maxWidth = '100%'; video.style.maxHeight = '85vh';
        if (content) content.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = asset.url; img.style.maxWidth = '100%'; img.style.maxHeight = '85vh'; img.style.objectFit = 'contain';
        img.onerror = () => { if (img.src.includes('/images/')) { img.src = img.src.replace('/images/', '/share-images/'); } };
        if (content) content.appendChild(img);
    }

    const footer = document.getElementById('lightboxUrlItem');
    if (footer) {
        footer.innerHTML = ''; 
        footer.style.display = 'flex'; footer.style.flexDirection = 'column'; footer.style.alignItems = 'center'; footer.style.gap = '10px'; footer.style.padding = '15px'; footer.style.background = 'rgba(0,0,0,0.7)'; footer.style.borderRadius = '12px'; footer.style.maxWidth = '80%'; footer.style.margin = '0 auto'; footer.style.bottom = '60px'; 

        const promptText = document.createElement('p');
        promptText.style.margin = '0'; promptText.style.color = '#fff'; promptText.style.fontSize = '0.9rem'; promptText.style.lineHeight = '1.4'; promptText.style.whiteSpace = 'pre-wrap'; promptText.style.textAlign = 'center';
        promptText.textContent = asset.prompt;
        footer.appendChild(promptText);

        const actionBtns = document.createElement('div');
        actionBtns.style.display = 'flex'; actionBtns.style.gap = '10px'; actionBtns.style.marginTop = '5px';
        footer.appendChild(actionBtns);

        if (asset.link) {
            const linkBtn = document.createElement('a');
            linkBtn.href = asset.link; linkBtn.target = '_blank'; linkBtn.className = 'btn grok-link-btn'; linkBtn.style.padding = '8px 15px'; linkBtn.style.fontSize = '0.8rem'; linkBtn.innerHTML = '🔗 VOIR SUR GROK';
            linkBtn.onclick = (e) => e.stopPropagation(); 
            actionBtns.appendChild(linkBtn);
        }

        // Bouton de téléchargement dans la lightbox
        if (asset.source === 'Local') {
            const dlBtn = document.createElement('button');
            dlBtn.className = 'btn primary-btn'; dlBtn.style.padding = '8px 15px'; dlBtn.style.fontSize = '0.8rem';
            dlBtn.innerHTML = '📥 TÉLÉCHARGER';
            dlBtn.onclick = (e) => { e.stopPropagation(); downloadLocalMedia(asset.url, asset.id, asset.media_type); };
            actionBtns.appendChild(dlBtn);
        }

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn secondary outline-btn'; copyBtn.style.padding = '8px 15px'; copyBtn.style.fontSize = '0.8rem'; copyBtn.style.borderColor = '#fff'; copyBtn.style.color = '#fff'; copyBtn.innerHTML = '📋 COPIER TEXTE';
        copyBtn.onclick = (e) => {
            e.stopPropagation(); 
            navigator.clipboard.writeText(asset.prompt).then(() => {
                copyBtn.innerHTML = '✅ COPIÉ !'; copyBtn.style.background = 'var(--visited)'; copyBtn.style.color = '#000'; copyBtn.style.borderColor = 'var(--visited)';
                setTimeout(() => { copyBtn.innerHTML = '📋 COPIER TEXTE'; copyBtn.style.background = 'transparent'; copyBtn.style.color = '#fff'; copyBtn.style.borderColor = '#fff'; }, 2000);
            }).catch(err => { copyBtn.innerHTML = '❌ ÉCHEC'; });
        };
        actionBtns.appendChild(copyBtn);
    }

    if (lightbox) lightbox.style.display = 'flex';
}

window.closeLightbox = function() { 
    const lb = document.getElementById('lightbox'); if(lb) lb.style.display = 'none'; 
    const lbContent = document.getElementById('lightboxContent'); if(lbContent) lbContent.innerHTML = ''; 
};

window.nextMedia = function() { openLightbox((currentLightboxIndex + 1) % galleryItems.length); };
window.prevMedia = function() { openLightbox((currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length); };

// ==========================================
// MODALES (Menu, Profil, Export)
// ==========================================
window.openSettingsModal = function() { const modal = document.getElementById('settingsModal'); if (modal) modal.style.display = 'flex'; };
window.closeSettingsModal = function() { const modal = document.getElementById('settingsModal'); if (modal) modal.style.display = 'none'; };

window.openProfileModal = function() {
    if(!authData) return alert("Chargez une archive complète pour voir votre profil.");
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
    if (btnElement) {
        document.querySelectorAll('.nav-anchor-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }
    allSections.forEach(id => {
        const sec = document.getElementById(id);
        if (sec) {
            const header = sec.previousElementSibling; 
            if (id === targetId) {
                sec.classList.remove('hidden');
                if (header) { header.classList.remove('collapsed'); setTimeout(() => header.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }
            } else {
                sec.classList.add('hidden');
                if (header) { header.classList.add('collapsed'); }
            }
        }
    });
};

function setupSelectAllCheckboxes() {
    const setups = [ { section: 'jsonSection', grid: 'jsonLinks' }, { section: 'linkedLocalSection', grid: 'linkedLocalFiles' }, { section: 'localSection', grid: 'localFiles' } ];
    setups.forEach(({section, grid}) => {
        const secEl = document.getElementById(section); if (!secEl) return;
        const header = secEl.previousElementSibling; if (!header) return;
        const h2 = header.querySelector('h2'); if (!h2 || h2.querySelector('.select-all-cb')) return;
        
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
                    if (c.checked) { selectedSet.add(c.dataset.url); } else { selectedSet.delete(c.dataset.url); }
                });
                if (typeof saveSession === 'function') saveSession();
                updateFloatingActionBar();
            }
        };
        label.appendChild(cb); label.appendChild(document.createTextNode('Tout sélectionner')); h2.appendChild(label);
    });
}

// ==========================================
// BARRE FLOTTANTE & ÉVÉNEMENTS
// ==========================================
function updateFloatingActionBar() {
    const fab = document.getElementById('floatingActionBar');
    const countText = document.getElementById('selectedCountText');
    const count = selectedSet.size;

    if (count > 0) {
        countText.textContent = count;
        if(fab) fab.classList.add('visible');
    } else {
        if(fab) fab.classList.remove('visible');
    }
}

function safeBind(id, eventType, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventType, handler);
}

window.onload = async () => { 
    await loadSession(); 
    setupSelectAllCheckboxes(); 
    updateAppVisibility(); 
};

// Accueil : Charger le dossier
safeBind('loadArchiveBtnStart', 'click', async () => {
    if (!window.showDirectoryPicker) return alert("Veuillez utiliser un navigateur récent (Chrome, Edge).");
    try { rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' }); await saveSession(); await runFullScan(); } 
    catch (e) { if (e.name !== 'AbortError') console.error(e); }
});

// Accueil : Charger le JSON
safeBind('importJsonBtnStart', 'click', () => { 
    const fileInput = document.getElementById('jsonFileInputStart') || document.getElementById('jsonFileInput'); 
    if(fileInput) fileInput.click(); 
});
safeBind('jsonFileInputStart', 'change', (e) => { if (e.target.files[0]) handleJsonImport(e.target.files[0]); e.target.value = ''; });
safeBind('jsonFileInput', 'change', (e) => { if (e.target.files[0]) handleJsonImport(e.target.files[0]); e.target.value = ''; });

// Barre Flottante : Actions
safeBind('fabExportBtn', 'click', () => {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const selected = allAssets.filter(a => checked.includes(a.url));
    if (!selected.length) return;
    
    const localCount = selected.filter(a => a.source === 'Local').length;
    const linkCount = selected.filter(a => a.link).length; 
    
    const popupContent = document.querySelector('#sharePopup .popup-content');
    if (popupContent) {
        let mediaBtnHtml = localCount > 0 ? `<button class="btn" id="mediaDownloadBtn" style="width:100%;background:#00ffaa;color:#000;">📦 Télécharger les images/vidéos (${localCount})</button>` : `<p style="font-size: 0.8rem; color: #ffa500; margin-bottom: 5px;">⚠️ Médias en ligne : utilisez le clic droit sur l'image pour l'enregistrer.</p>`;
        let openLinksBtnHtml = linkCount > 0 ? `<button class="btn action-btn" id="openLinksBtn" style="width:100%; margin-bottom:10px; background:var(--visited); color:#000;">🌐 Ouvrir dans Grok (${linkCount} onglets)</button>` : '';

        popupContent.innerHTML = `
            <h2 style="margin-bottom:15px;">✅ ${selected.length} éléments</h2>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="btn primary-btn" id="jsonDownloadBtn" style="width:100%">📄 Télécharger l'historique (.json)</button>
                ${mediaBtnHtml}
                ${openLinksBtnHtml}
                <button class="btn secondary" style="width:100%" onclick="closePopup()">Annuler</button>
            </div>`;
            
        const exportData = selected.map(a => ({ id: a.id, prompt: a.prompt, media_type: a.media_type, url: a.url, date: a.date.toISOString(), link: a.link }));
        const blob = new Blob([JSON.stringify({ media_posts: exportData }, null, 2)], { type: 'application/json' });
        currentExportData = { url: URL.createObjectURL(blob), name: `export-${Date.now()}.json` };
        document.getElementById('jsonDownloadBtn').onclick = () => { const a = document.createElement('a'); a.href = currentExportData.url; a.download = currentExportData.name; a.click(); };
        
        if (localCount > 0) document.getElementById('mediaDownloadBtn').onclick = () => { closePopup(); downloadSelectedMedia(); };
        if (linkCount > 0) document.getElementById('openLinksBtn').onclick = () => { closePopup(); window.openSelectedInBrowser(); };
    }
    
    const sp = document.getElementById('sharePopup');
    if(sp) sp.style.display = 'flex';
});

safeBind('fabDeleteBtn', 'click', deleteSelected);

safeBind('fabCancelBtn', 'click', () => {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    selectedSet.clear();
    saveSession();
    updateFloatingActionBar();
});

// Menu principal
const toggleThemeMenu = document.getElementById('toggleThemeMenu');
let isDark = true;
if (toggleThemeMenu) {
    toggleThemeMenu.addEventListener('click', () => {
        isDark = !isDark;
        document.body.classList.toggle('light', !isDark);
        toggleThemeMenu.textContent = isDark ? '☀️ Passer au thème Clair' : '🌙 Passer au thème Sombre';
    });
}
safeBind('clearSessionBtnMenu', 'click', () => { closeSettingsModal(); clearSession(); });

// Autoplay déplacé dans l'en-tête (discret)
const autoPlayBtn = document.createElement('button');
autoPlayBtn.className = "btn secondary";
autoPlayBtn.id = "autoPlayBtn";
autoPlayBtn.style.borderRadius = "20px";
autoPlayBtn.style.marginRight = "10px";
autoPlayBtn.innerHTML = autoPlayVideo ? '▶️ Vidéos auto' : '⏸️ Vidéos pauses';

const headerActions = document.querySelector('.header-actions');
if (headerActions) { headerActions.prepend(autoPlayBtn); }

autoPlayBtn.addEventListener('click', () => {
    autoPlayVideo = !autoPlayVideo;
    localStorage.setItem('grokAutoPlay', autoPlayVideo);
    autoPlayBtn.innerHTML = autoPlayVideo ? '▶️ Vidéos auto' : '⏸️ Vidéos pauses';
    
    document.querySelectorAll('.lazy-video').forEach(video => {
        if (autoPlayVideo) {
            const rect = video.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >= 0) { if (!video.dataset.src) video.play().catch(() => {}); }
        } else { video.pause(); }
    });
});

window.updateGalleryWithLoading = function() {
    setLoading(true, "⏳ Application du filtre...");
    setTimeout(() => { try { renderGallery(); } finally { setLoading(false); } }, 50); 
};
safeBind('sortType', 'change', updateGalleryWithLoading);
safeBind('sortDate', 'change', updateGalleryWithLoading);

window.onclick = (e) => { 
    if(e.target.id === 'profileModal' || e.target.classList.contains('modal-overlay')) { closeProfileModal(); closeSettingsModal(); }
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

const dropZoneOverlay = document.getElementById('dropZoneOverlay');
if (dropZoneOverlay) {
    document.body.addEventListener('dragover', (e) => { e.preventDefault(); dropZoneOverlay.style.display = "flex"; });
    document.body.addEventListener('dragleave', (e) => { if (e.relatedTarget === null) dropZoneOverlay.style.display = "none"; });
    document.body.addEventListener('drop', (e) => { e.preventDefault(); dropZoneOverlay.style.display = "none"; const file = e.dataTransfer.files[0]; if (file && file.name.endsWith('.json')) handleJsonImport(file); });
}

window.handleImgError = function(img) {
    if (img.dataset.failed) return;
    if (!img.dataset.triedShare) {
        let newUrl = img.src.replace('/imagine-public/images/', '/imagine-public/share-images/');
        if (newUrl !== img.src) {
            img.dataset.triedShare = "true";
            let tester = new Image();
            tester.onload = () => { img.src = newUrl; img.classList.add('loaded'); if (img.parentElement) img.parentElement.style.animation = 'none'; };
            tester.onerror = () => { img.dataset.failed = "true"; img.src = 'https://placehold.co/400x300?text=Lien+Expire'; img.classList.add('loaded'); if (img.parentElement) img.parentElement.style.animation = 'none'; };
            tester.src = newUrl;
        } else {
            img.dataset.failed = "true"; img.src = 'https://placehold.co/400x300?text=Indisponible'; img.classList.add('loaded');
        }
    }
};

window.openSelectedInBrowser = function() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const selectedWithLinks = allAssets.filter(a => checked.includes(a.url) && a.link);
    if (selectedWithLinks.length === 0) return alert("Aucun lien disponible pour cette sélection.");
    if (selectedWithLinks.length > 15 && !confirm(`Ouvrir ${selectedWithLinks.length} onglets ? Cela peut ralentir votre navigateur.`)) return;
    selectedWithLinks.forEach(asset => { window.open(asset.link, '_blank'); });
};

// ==========================================
// SCROLL INFINI & MARQUEUR
// ==========================================
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (!scrollTimeout) {
        scrollTimeout = requestAnimationFrame(() => {
            const scrollTop = window.scrollY;
            const docHeight = document.body.scrollHeight;
            const winHeight = window.innerHeight;
            
            localStorage.setItem('grokGalleryScroll', Math.round(scrollTop));
            
            const marker = document.getElementById('scrollMarker');
            const progressSpan = document.getElementById('scrollProgress');
            const dateSpan = document.getElementById('scrollDate');

            const triggerPoint = docHeight - winHeight - 1500;
            const totalLoaded = cloudIndex + linkedIndex + orphanIndex;
            
            if (scrollTop > triggerPoint && totalLoaded < galleryItems.length) { loadNextChunk(); }
            
            if (marker && progressSpan && dateSpan) {
                let percent = docHeight > winHeight ? Math.round((scrollTop / (docHeight - winHeight)) * 100) : 0;
                if (scrollTop > 300) {
                    marker.classList.add('visible');
                    progressSpan.textContent = percent + '%';
                    const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
                    const card = centerEl ? centerEl.closest('.media-card') : null;
                    if (card && card.dataset.date) { dateSpan.textContent = '📅 ' + card.dataset.date.substring(0, 10); }
                } else { marker.classList.remove('visible'); }
            }
            scrollTimeout = null;
        });
    }
});
