let allAssets = [];
let galleryItems = []; // Liste unifiée pour la lightbox
let visitedSet = new Set();
let currentLightboxIndex = -1;
let authData = null;
let billingData = null;
let currentExportData = null;
let rootHandle = null;
let videoObserver = null;

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
    if (!rootHandle) return;
    const db = await openDB();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    await store.put(rootHandle, "rootHandle");
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
        const savedVisited = await new Promise(r => {
            const req = store.get("visitedSet");
            req.onsuccess = () => r(req.result);
        });

        if (savedVisited) visitedSet = new Set(savedVisited);
        if (savedHandle) {
            rootHandle = savedHandle;
            // On propose à l'utilisateur de restaurer
            const restoreBtn = document.createElement('button');
            restoreBtn.className = "btn";
            restoreBtn.style.background = "var(--visited)";
            restoreBtn.style.color = "#000";
            restoreBtn.id = "restoreSessionBtn";
            restoreBtn.innerHTML = "🔄 Reprendre la session précédente";
            document.querySelector('.controls').prepend(restoreBtn);
            
            restoreBtn.onclick = async () => {
                if (await rootHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                    restoreBtn.remove();
                    await runFullScan();
                }
            };
        }
    } catch (e) { console.error("Session non chargée:", e); }
}

/**
 * Efface toutes les données stockées dans IndexedDB et réinitialise l'application
 */
async function clearSession() {
    if (!confirm("⚠️ Voulez-vous vraiment effacer toutes les données enregistrées dans le navigateur ?\n\nCela supprimera l'historique des vues et l'accès rapide au dossier.")) return;

    try {
        const db = await openDB();
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        await store.clear();

        // Réinitialisation des variables
        rootHandle = null;
        visitedSet = new Set();
        allAssets = [];
        galleryItems = [];
        authData = null;
        billingData = null;

        // Mise à jour de l'interface
        renderGallery();
        if (document.getElementById('restoreSessionBtn')) document.getElementById('restoreSessionBtn').remove();
        
        alert("✅ Données de session effacées avec succès.");
    } catch (e) {
        alert("Erreur lors de la suppression de la session.");
        console.error(e);
    }
}

// ==========================================
// ÉLÉMENTS DE STATUT
// ==========================================
function setLoading(isLoading, message = "⏳ Analyse de l'arborescence en cours...") { 
    const status = document.getElementById('loadingStatus');
    status.style.display = isLoading ? 'block' : 'none';
    if (isLoading) status.textContent = message;
}

function toggleAccordion(id, el) { 
    const section = document.getElementById(id);
    section.classList.toggle('hidden'); 
    el.classList.toggle('collapsed'); 
}

function forceOpenSection(id) {
    const section = document.getElementById(id);
    const header = section.previousElementSibling;
    if (section.classList.contains('hidden')) {
        section.classList.remove('hidden');
        header.classList.remove('collapsed');
    }
}

// ==========================================
// GESTION DES STATUTS VISUELS
// ==========================================
window.markAsVisited = function(url, el) { 
    visitedSet.add(url); 
    saveSession(); // Sauvegarde auto
    if(el) { 
        el.classList.add('visited'); 
        el.classList.remove('viewed'); 
    } 
};

window.markAsViewed = function(el) { 
    if (el && !el.classList.contains('visited')) { 
        el.classList.add('viewed'); 
    }
};

// ==========================================
// TÉLÉCHARGEMENT & SCAN
// ==========================================
async function runFullScan() {
    setLoading(true, "🔍 Récupération des données...");
    allAssets = [];
    authData = null;
    billingData = null;
    await scanDirectory(rootHandle);
    const localCount = allAssets.filter(a => a.source === 'Local').length;
    const cloudCount = allAssets.filter(a => a.source === 'Cloud').length;
    setLoading(false);
    renderGallery();
    if (cloudCount > 0) forceOpenSection('jsonSection');
}

window.downloadCloudFile = async function(url, id, type) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `grok-${id}.${type === 'video' ? 'mp4' : 'jpg'}`;
        a.click();
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        window.open(url, '_blank');
    }
};

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

document.getElementById('loadArchiveBtn').onclick = async () => {
    try {
        rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await saveSession(); // On enregistre ce nouveau dossier
        await runFullScan();
    } catch (e) { console.error(e); }
};

// ==========================================
// RENDU & UI
// ==========================================
function renderGallery() {
    const typeF = document.getElementById('sortType').value;
    const dateO = document.getElementById('sortDate').value;
    const filtered = allAssets.filter(a => typeF === 'all' || a.media_type === typeF);
    filtered.sort((a,b) => dateO === 'date-desc' ? b.date - a.date : a.date - b.date);
    galleryItems = filtered;
    jsonLinksEl.innerHTML = ''; localFilesEl.innerHTML = '';

    if (videoObserver) videoObserver.disconnect();
    videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                if (video.dataset.src) { video.src = video.dataset.src; video.removeAttribute('data-src'); video.load(); }
                video.play().catch(() => {});
            } else { video.pause(); }
        });
    }, { threshold: 0.1 });

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
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:5px"><input type="checkbox" data-url="${asset.url}" onclick="event.stopPropagation()"> Sélectionner</label>
                <div style="display:flex;flex-direction:column;gap:5px;margin-top:auto;">
                    ${actionUrl ? `<a href="${actionUrl}" target="_blank" class="grok-link-btn" onclick="event.stopPropagation(); markAsVisited('${asset.url}', this.closest('.media-card'));">🔗 VOIR SUR GROK</a>` : ''}
                    ${asset.source === 'Cloud' ? `<button class="grok-link-btn" style="background:#eee;color:#333!important" onclick="event.stopPropagation(); downloadCloudFile('${asset.url}','${asset.id}','${asset.media_type}')">💾 TÉLÉCHARGER</button>` : ''}
                </div>
            </div>`;

        card.onmouseenter = () => {
            const m = card.querySelector('img, video');
            if (m && m.tagName === 'IMG' && m.src.includes('placehold.co')) m.src = m.dataset.original;
        };
        card.onclick = () => { markAsViewed(card); openLightbox(idx); };
        if (asset.source === 'Cloud') jsonLinksEl.appendChild(card);
        else localFilesEl.appendChild(card);
        if (isVideo) videoObserver.observe(card.querySelector('video'));
    });

    document.getElementById('numberImg').textContent = filtered.filter(a => a.source === 'Local').length;
    document.getElementById('numberImg2').textContent = document.getElementById('numberImg').textContent;
    document.getElementById('numberLink').textContent = filtered.filter(a => a.source === 'Cloud').length;
    document.getElementById('numberLink2').textContent = document.getElementById('numberLink').textContent;
}

// Initialisation au chargement
window.onload = loadSession;

async function deleteSelected() {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const toDelete = allAssets.filter(a => a.source === 'Local' && checked.includes(a.url));
    if (!toDelete.length) return alert("Sélectionnez des fichiers LOCAUX.");
    if (!confirm(`Supprimer ${toDelete.length} dossiers ?`)) return;
    setLoading(true, `🗑️ Suppression...`);
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

window.openLightbox = function(i) {
    if (i < 0 || i >= galleryItems.length) return;
    currentLightboxIndex = i;
    const a = galleryItems[i];
    const content = document.getElementById('lightboxContent');
    content.innerHTML = a.media_type === 'video' ? `<video src="${a.url}" controls autoplay playsinline></video>` : `<img src="${a.url}">`;
    const linkedCloud = allAssets.find(item => item.source === 'Cloud' && item.id === a.id);
    const actionUrl = a.source === 'Cloud' ? a.link : (linkedCloud ? linkedCloud.link : null);
    const dateTimeStr = a.date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('lightboxCounter').textContent = `${i + 1} / ${galleryItems.length}`;
    document.getElementById('lightboxUrlItem').innerHTML = `<div style="color:#fff;font-size:0.8rem;margin-bottom:10px">📅 ${dateTimeStr}</div><div style="display:flex;gap:10px;justify-content:center;">${actionUrl ? `<a href="${actionUrl}" target="_blank" class="grok-link-btn" style="width:180px">🔗 VOIR SUR GROK</a>` : ''}${a.source === 'Cloud' ? `<button class="grok-link-btn" style="background:#eee;color:#333!important;width:180px" onclick="downloadCloudFile('${a.url}','${a.id}','${a.media_type}')">💾 TÉLÉCHARGER</button>` : ''}</div>`;
    document.getElementById('lightbox').style.display = 'flex';
    markAsViewed(document.querySelector(`input[data-url="${a.url}"]`)?.closest('.media-card'));
};

window.closeLightbox = function() { document.getElementById('lightbox').style.display = 'none'; document.getElementById('lightboxContent').innerHTML = ''; };
window.nextMedia = function() { openLightbox((currentLightboxIndex + 1) % galleryItems.length); };
window.prevMedia = function() { openLightbox((currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length); };

window.openProfileModal = function() {
    if(!authData) return alert("Chargez une archive.");
    const u = authData.user;
    document.getElementById('userName').textContent = `${u.givenName} ${u.familyName[0]}.`;
    document.getElementById('userEmail').textContent = u.email.replace(/(.{3})(.*)(?=@)/, "$1***");
    const bal = billingData ? (billingData.balance_map["21583193-d632-4a53-9eae-b3c55a2b2b06"] || 0) : 0;
    document.getElementById('userBalance').textContent = `${bal} $`;
    document.getElementById('sessionCount').textContent = authData.sessions.length;
    const list = document.getElementById('sessionList');
    list.innerHTML = '';
    authData.sessions.slice(0, 8).forEach(s => {
        const r = document.createElement('tr');
        r.innerHTML = `<td>${s.cfMetadata.city || "N/A"}</td><td>${s.userAgent.includes("Android") ? "📱 Mobile" : "💻 Web"}</td><td>${new Date(s.lastAuthTime).toLocaleDateString()}</td>`;
        list.appendChild(r);
    });
    document.getElementById('profileModal').style.display = 'flex';
};

window.closeProfileModal = function() { document.getElementById('profileModal').style.display = 'none'; };

document.getElementById('exportBtn').onclick = () => {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const selected = allAssets.filter(a => checked.includes(a.url));
    if (!selected.length) return alert("Veuillez cocher des éléments d'abord !");
    const popupContent = document.querySelector('#sharePopup .popup-content');
    popupContent.innerHTML = `<h2>✅ ${selected.length} sélectionnés</h2><div style="display:flex;flex-direction:column;gap:10px;margin-top:20px;"><button class="btn" id="jsonDownloadBtn" style="width:100%">Télécharger JSON</button><button class="btn" id="mediaDownloadBtn" style="width:100%;background:#00ffaa;color:#000;">Télécharger Médias</button><button class="btn secondary" style="width:100%" onclick="closePopup()">Annuler</button></div>`;
    const exportData = selected.map(a => ({ id: a.id, prompt: a.prompt, media_type: a.media_type, url: a.url, date: a.date.toISOString() }));
    const blob = new Blob([JSON.stringify({ media_posts: exportData }, null, 2)], { type: 'application/json' });
    currentExportData = { url: URL.createObjectURL(blob), name: `export-${Date.now()}.json` };
    document.getElementById('jsonDownloadBtn').onclick = () => { const a = document.createElement('a'); a.href = currentExportData.url; a.download = currentExportData.name; a.click(); };
    document.getElementById('mediaDownloadBtn').onclick = () => { closePopup(); downloadSelectedMedia(); };
    document.getElementById('sharePopup').style.display = 'flex';
};

window.closePopup = function() { document.getElementById('sharePopup').style.display = 'none'; };

window.scrollToSection = function(id) {
    const sec = document.getElementById(id);
    sec.classList.remove('hidden');
    sec.previousElementSibling.classList.remove('collapsed');
    sec.previousElementSibling.scrollIntoView({ behavior: 'smooth' });
};

let isDark = true;
document.getElementById('toggleTheme').onclick = () => {
    isDark = !isDark;
    document.body.classList.toggle('light', !isDark);
    document.getElementById('toggleTheme').textContent = isDark ? '☀️' : '🌙';
};

document.getElementById('sortType').onchange = renderGallery;
document.getElementById('sortDate').onchange = renderGallery;
document.getElementById('nextBtn').onclick = (e) => { e.stopPropagation(); nextMedia(); };
document.getElementById('prevBtn').onclick = (e) => { e.stopPropagation(); prevMedia(); };
document.getElementById('clearBtn').onclick = () => { if(confirm("Effacer ?")) { allAssets = []; renderGallery(); } };
document.getElementById('donBtn').onclick = () => { window.open('https://www.paypal.com/donate/?hosted_button_id=4SSHF5SWPGAQW', '_blank'); };
document.getElementById('deleteSelectedBtn').onclick = deleteSelected;
document.getElementById('clearSessionBtn').onclick = clearSession;

window.onclick = (e) => { 
    if(e.target.id === 'profileModal' || e.target.classList.contains('modal-overlay')) closeProfileModal();
    if(e.target.id === 'lightbox') closeLightbox();
    if(e.target.id === 'sharePopup') closePopup();
};

document.addEventListener('keydown', (e) => {
    if (document.getElementById('lightbox').style.display === 'flex') {
        if (e.key === "ArrowRight") nextMedia();
        if (e.key === "ArrowLeft") prevMedia();
        if (e.key === "Escape") closeLightbox();
    }
});
