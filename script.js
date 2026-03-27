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

const jsonLinksEl = document.getElementById('jsonLinks');
const localFilesEl = document.getElementById('localFiles');

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
        await store.delete("importedAssets"); // Nettoie les anciens imports JSON
    } else if (allAssets.length > 0) {
        await store.put(allAssets, "importedAssets"); // Sauvegarde la session JSON
        await store.delete("rootHandle"); // Nettoie les anciens dossiers
    }
    await store.put(Array.from(visitedSet), "visitedSet");
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

        if (savedVisited) visitedSet = new Set(savedVisited);
        
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

function toggleAccordion(id, el) { 
    const section = document.getElementById(id);
    if (section) {
        section.classList.toggle('hidden'); 
        if (el) el.classList.toggle('collapsed'); 
    }
}

function forceOpenSection(id) {
    const section = document.getElementById(id);
    if (section && section.classList.contains('hidden')) {
        section.classList.remove('hidden');
        if (section.previousElementSibling) section.previousElementSibling.classList.remove('collapsed');
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
    await scanDirectory(rootHandle);
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
                if (entry.name === 'prod-grok-backend.json') {
                    const data = JSON.parse(await file.text());
                    (data.media_posts || []).forEach(p => {
                        if (!allAssets.find(a => a.id === p.id && a.source === 'Cloud')) {
                            const isVideo = p.media_type === 'video';
                            allAssets.push({
                                id: p.id, prompt: p.original_prompt || 'Généré', 
                                url: isVideo ? `https://imagine-public.x.ai/imagine-public/share-videos/${p.id}.mp4` : `https://imagine-public.x.ai/imagine-public/share-images/${p.id}.jpg`,
                                poster: isVideo ? `https://imagine-public.x.ai/imagine-public/share-images/${p.id}.jpg` : null,
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
// RENDU DE LA GALERIE (AVEC FRAGMENT DOM)
// ==========================================
function renderGallery() {
    document.querySelectorAll('.select-all-cb').forEach(cb => cb.checked = false);

    const typeF = document.getElementById('sortType') ? document.getElementById('sortType').value : 'all';
    const dateO = document.getElementById('sortDate') ? document.getElementById('sortDate').value : 'date-desc';
    
    const filtered = allAssets.filter(a => typeF === 'all' || a.media_type === typeF);
    filtered.sort((a,b) => dateO === 'date-desc' ? b.date - a.date : a.date - b.date);
    galleryItems = filtered;
    
    if (jsonLinksEl) jsonLinksEl.innerHTML = ''; 
    if (localFilesEl) localFilesEl.innerHTML = '';

    if (videoObserver) videoObserver.disconnect();
    videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                if (autoPlayVideo) {
                    if (video.dataset.src) { video.src = video.dataset.src; video.removeAttribute('data-src'); video.load(); }
                    video.play().catch(() => {});
                }
            } else { 
                video.pause(); 
            }
        });
    }, { threshold: 0.1 });

    const cloudFragment = document.createDocumentFragment();
    const localFragment = document.createDocumentFragment();

    filtered.forEach((asset, idx) => {
        const isV = visitedSet.has(asset.url);
        const card = document.createElement('div');
        card.className = `media-card ${isV ? 'visited' : ''}`;
        const linkedCloud = allAssets.find(item => item.source === 'Cloud' && item.id === asset.id);
        const actionUrl = asset.source === 'Cloud' ? asset.link : (linkedCloud ? linkedCloud.link : null);
        const dateTimeStr = asset.date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isVideo = asset.media_type === 'video';

        card.innerHTML = `
            <div class="media-container" style="position: relative;">
                <span class="badge ${asset.source.toLowerCase()}" style="${isVideo ? 'background-color:#ff4444;color:#fff' : ''}">${isVideo ? 'Vidéo' : 'Photo'}</span>
                ${isVideo 
                    ? `<video class="lazy-video" data-src="${asset.url}" poster="${asset.poster || ''}" muted loop playsinline preload="none" style="width:100%;height:100%;object-fit:cover;"></video><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;font-size:2rem;opacity:0.6;">▶️</div>` 
                    : `<img src="${asset.url}" data-original="${asset.url}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://placehold.co/400x300?text=Indisponible'">`}
            </div>
            <div class="info">
                <strong>${isVideo ? '🎥 ' : ''}${asset.prompt.slice(0, 50)}...</strong>
                <div style="font-size:0.75rem;color:#888;margin-top:4px;">📅 ${dateTimeStr}</div>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:5px" onclick="event.stopPropagation()"><input type="checkbox" data-url="${asset.url}"> Sélectionner</label>
                <div style="display:flex;flex-direction:column;gap:5px;margin-top:auto;">
                    ${actionUrl ? `<a href="${actionUrl}" target="_blank" class="btn grok-link-btn" onclick="event.stopPropagation(); markAsVisited('${asset.url}', this.closest('.media-card'));">🔗 VOIR SUR GROK</a>` : ''}
                    ${asset.source === 'Cloud' ? `<button class="btn secondary" style="width:100%; justify-content:center; background:#eee; color:#000;" onclick="event.stopPropagation(); downloadCloudFile('${asset.url}','${asset.id}','${asset.media_type}')">💾 TÉLÉCHARGER</button>` : ''}
                </div>
            </div>`;

        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                const gridId = asset.source === 'Cloud' ? 'jsonLinks' : 'localFiles';
                const selectAllCb = document.querySelector(`.select-all-cb[data-target-grid="${gridId}"]`);
                if (selectAllCb) {
                    if (!this.checked) { selectAllCb.checked = false; } 
                    else {
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
            if (isVideo && !autoPlayVideo) {
                const v = card.querySelector('video');
                if (v) { if (v.dataset.src) { v.src = v.dataset.src; v.removeAttribute('data-src'); v.load(); } v.play().catch(() => {}); }
            }
        };

        const forcePauseVideo = () => {
            if (isVideo && !autoPlayVideo) {
                const v = card.querySelector('video');
                if (v) v.pause();
            }
        };

        card.onmouseenter = () => {
            const m = card.querySelector('img, video');
            if (m && m.tagName === 'IMG' && m.src.includes('placehold.co')) m.src = m.dataset.original;
            forcePlayVideo();
        };

        card.onmouseleave = forcePauseVideo;

        if (isVideo) {
            card.addEventListener('touchstart', (e) => {
                isLongPress = false;
                touchTimer = setTimeout(() => { isLongPress = true; forcePlayVideo(); }, 400); 
            }, {passive: true});

            const cancelTouch = () => { clearTimeout(touchTimer); forcePauseVideo(); };
            card.addEventListener('touchend', cancelTouch, {passive: true});
            card.addEventListener('touchcancel', cancelTouch, {passive: true});
            card.addEventListener('touchmove', cancelTouch, {passive: true});
        }

        card.onclick = (e) => { 
            if (isLongPress) { e.preventDefault(); isLongPress = false; return; }
            markAsViewed(card); openLightbox(idx); 
        };
        
        if (asset.source === 'Cloud') cloudFragment.appendChild(card);
        else localFragment.appendChild(card);
        
        if (isVideo) videoObserver.observe(card.querySelector('video'));
    });

    if (jsonLinksEl) jsonLinksEl.appendChild(cloudFragment);
    if (localFilesEl) localFilesEl.appendChild(localFragment);

    const localLen = filtered.filter(a => a.source === 'Local').length;
    const cloudLen = filtered.filter(a => a.source === 'Cloud').length;
    
    if(document.getElementById('numberImg')) document.getElementById('numberImg').textContent = localLen;
    if(document.getElementById('numberImg2')) document.getElementById('numberImg2').textContent = localLen;
    if(document.getElementById('numberLink')) document.getElementById('numberLink').textContent = cloudLen;
    if(document.getElementById('numberLink2')) document.getElementById('numberLink2').textContent = cloudLen;
    if(document.getElementById('clearBtn')) document.getElementById('clearBtn').disabled = allAssets.length === 0;
}

// ==========================================
// TÉLÉCHARGEMENT & SUPPRESSION
// ==========================================
const isExtension = (typeof browser !== 'undefined' && browser.downloads) || (typeof chrome !== 'undefined' && chrome.downloads);
const downloadsAPI = isExtension ? (typeof browser !== 'undefined' ? browser.downloads : chrome.downloads) : null;

window.downloadCloudFile = async function(url, id, type) {
    const filename = `grok-${id}.${type === 'video' ? 'mp4' : 'jpg'}`;
    if (downloadsAPI) {
        try { await downloadsAPI.download({ url: url, filename: filename, saveAs: false }); } 
        catch (err) { window.open(url, '_blank'); }
    } else {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error();
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000); 
        } catch (err) { window.open(url, '_blank'); }
    }
};

window.downloadSelectedMedia = async function() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const selected = allAssets.filter(a => checked.includes(a.url));
    if (selected.length === 0) return;
    if (!downloadsAPI && selected.length > 10 && !confirm(`Télécharger ${selected.length} fichiers ?`)) return;

    setLoading(true, "📥 Téléchargement...");
    for (let i = 0; i < selected.length; i++) {
        const asset = selected[i];
        const filename = `grok-${asset.source === 'Local' ? 'local-' : ''}${asset.id}.${asset.media_type === 'video' ? 'mp4' : 'jpg'}`;
        if (downloadsAPI) {
            try { await downloadsAPI.download({ url: asset.url, filename: filename, saveAs: false }); } catch (err) {}
        } else {
            if (asset.source === 'Cloud') { await downloadCloudFile(asset.url, asset.id, asset.media_type); } 
            else {
                const a = document.createElement('a'); a.href = asset.url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 600));
        }
    }
    setLoading(false);
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

// ==========================================
// LIGHTBOX & MODALES
// ==========================================
window.openLightbox = function(i) {
    if (i < 0 || i >= galleryItems.length) return;
    currentLightboxIndex = i;
    const a = galleryItems[i];
    const content = document.getElementById('lightboxContent');
    if(content) content.innerHTML = a.media_type === 'video' ? `<video src="${a.url}" controls autoplay playsinline></video>` : `<img src="${a.url}">`;
    const linkedCloud = allAssets.find(item => item.source === 'Cloud' && item.id === a.id);
    const actionUrl = a.source === 'Cloud' ? a.link : (linkedCloud ? linkedCloud.link : null);
    const dateTimeStr = a.date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if(document.getElementById('lightboxCounter')) document.getElementById('lightboxCounter').textContent = `${i + 1} / ${galleryItems.length}`;
    if(document.getElementById('lightboxUrlItem')) {
        document.getElementById('lightboxUrlItem').innerHTML = `<div style="color:#fff;font-size:0.8rem;margin-bottom:10px">📅 ${dateTimeStr}</div><div style="display:flex;gap:10px;justify-content:center;">${actionUrl ? `<a href="${actionUrl}" target="_blank" class="btn outline-btn" style="width:180px">🔗 VOIR SUR GROK</a>` : ''}${a.source === 'Cloud' ? `<button class="btn secondary" style="background:#eee;color:#333!important;width:180px" onclick="downloadCloudFile('${a.url}','${a.id}','${a.media_type}')">💾 TÉLÉCHARGER</button>` : ''}</div>`;
    }
    const lightboxEl = document.getElementById('lightbox');
    if(lightboxEl) lightboxEl.style.display = 'flex';
    markAsViewed(document.querySelector(`input[data-url="${a.url}"]`)?.closest('.media-card'));
};

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

window.scrollToSection = function(id) {
    const sec = document.getElementById(id);
    if(sec) {
        sec.classList.remove('hidden');
        if(sec.previousElementSibling) {
            sec.previousElementSibling.classList.remove('collapsed');
            sec.previousElementSibling.scrollIntoView({ behavior: 'smooth' });
        }
    }
};

// ==========================================
// EXPORT & LISTENERS ROBUSTES
// ==========================================
function setupSelectAllCheckboxes() {
    const setups = [{ section: 'jsonSection', grid: 'jsonLinks' }, { section: 'localSection', grid: 'localFiles' }];
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
                checkboxes.forEach(c => c.checked = e.target.checked);
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
    
    const popupContent = document.querySelector('#sharePopup .popup-content');
    if (popupContent) {
        popupContent.innerHTML = `<h2>✅ ${selected.length} sélectionnés</h2><div style="display:flex;flex-direction:column;gap:10px;margin-top:20px;"><button class="btn" id="jsonDownloadBtn" style="width:100%">Télécharger JSON</button><button class="btn" id="mediaDownloadBtn" style="width:100%;background:#00ffaa;color:#000;">Télécharger les Médias</button><button class="btn secondary" style="width:100%" onclick="closePopup()">Annuler</button></div>`;
        const exportData = selected.map(a => ({ id: a.id, prompt: a.prompt, media_type: a.media_type, url: a.url, date: a.date.toISOString(), link: a.link }));
        const blob = new Blob([JSON.stringify({ media_posts: exportData }, null, 2)], { type: 'application/json' });
        currentExportData = { url: URL.createObjectURL(blob), name: `export-${Date.now()}.json` };
        
        document.getElementById('jsonDownloadBtn').onclick = () => { const a = document.createElement('a'); a.href = currentExportData.url; a.download = currentExportData.name; a.click(); };
        document.getElementById('mediaDownloadBtn').onclick = () => { closePopup(); downloadSelectedMedia(); };
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

window.downloadFile = function() { 
    if (currentExportData) { const a = document.createElement('a'); a.href = currentExportData.url; a.download = currentExportData.name; a.click(); }
};
