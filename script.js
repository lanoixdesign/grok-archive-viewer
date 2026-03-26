let allAssets = [];
let localAssetsOnly = [];
let visitedSet = new Set();
let currentGalleryItems = [];
let currentLightboxIndex = -1;
let authData = null;
let billingData = null;
let currentExportData = null;
let rootHandle = null;

const jsonLinksEl = document.getElementById('jsonLinks');
const localFilesEl = document.getElementById('localFiles');

// Éléments de statut
function setLoading(isLoading) { 
    const status = document.getElementById('loadingStatus');
    status.style.display = isLoading ? 'block' : 'none';
    if (isLoading) status.textContent = "⏳ Analyse de l'arborescence en cours...";
}

function toggleAccordion(id, el) { 
    document.getElementById(id).classList.toggle('hidden'); 
    el.classList.toggle('collapsed'); 
}

// Gestion des statuts visuels
window.markAsVisited = function(url, el) { 
    visitedSet.add(url); 
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
// FONCTION DE RECHERCHE RÉCURSIVE & VALIDATION
// ==========================================
async function scanDirectory(handle) {
    for await (const entry of handle.values()) {
        try {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                
                // Recherche des fichiers JSON spécifiques
                if (entry.name === 'prod-mc-auth-mgmt-api.json') {
                    const text = await file.text();
                    authData = JSON.parse(text);
                }
                if (entry.name === 'prod-mc-billing.json') {
                    const text = await file.text();
                    billingData = JSON.parse(text);
                }
                if (entry.name === 'prod-grok-backend.json') {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (data.media_posts) {
                        data.media_posts.forEach(p => {
                            // On évite les doublons si le scan repasse plusieurs fois
                            if (!allAssets.find(a => a.id === p.id && a.source === 'JSON')) {
                                allAssets.push({
                                    id: p.id, prompt: p.original_prompt || 'Généré', url: p.link, 
                                    media_type: p.media_type, date: new Date(p.create_time), source: 'JSON'
                                });
                            }
                        });
                    }
                }
            } else if (entry.kind === 'directory') {
                // Dossier d'assets spécifique
                if (entry.name === 'prod-mc-asset-server') {
                    const assetServerHandle = entry;
                    for await (const subFolder of entry.values()) {
                        if (subFolder.kind === 'directory') {
                            for await (const assetFile of subFolder.values()) {
                                if (assetFile.name.startsWith('content')) {
                                    const file = await assetFile.getFile();
                                    // Validation du type MIME
                                    const type = file.type.startsWith('video') ? 'video' : 'image';
                                    allAssets.push({
                                        id: subFolder.name, prompt: subFolder.name, url: URL.createObjectURL(file),
                                        media_type: type, date: new Date(file.lastModified), source: 'Local',
                                        parentHandle: subFolder,
                                        grandParentHandle: assetServerHandle
                                    });
                                }
                            }
                        }
                    }
                } else {
                    // Récursion pour les autres dossiers (limitation de profondeur implicite par l'OS)
                    await scanDirectory(entry);
                }
            }
        } catch (err) {
            console.warn(`Impossible d'accéder à l'élément ${entry.name}:`, err);
        }
    }
}

// ==========================================
// CHARGEMENT ARCHIVE
// ==========================================
document.getElementById('loadArchiveBtn').onclick = async () => {
    // Vérification de compatibilité navigateur
    if (!window.showDirectoryPicker) {
        return alert("Votre navigateur ne supporte pas l'accès aux dossiers. Utilisez Chrome ou Edge.");
    }

    try {
        rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        setLoading(true);
        
        // Reset des données
        allAssets = [];
        authData = null;
        billingData = null;

        await scanDirectory(rootHandle);

        setLoading(false);

        // Bilan de sécurité et de scan
        const localCount = allAssets.filter(a => a.source === 'Local').length;
        const cloudCount = allAssets.filter(a => a.source === 'JSON').length;

        if (localCount === 0 && cloudCount === 0) {
            alert("❌ Erreur : Aucun fichier Grok n'a été trouvé dans ce dossier.\n\nAssurez-vous d'avoir bien décompressé votre archive ZIP.");
        } else {
            let message = `✅ Archive chargée avec succès !\n\n`;
            message += `- Fichiers locaux : ${localCount}\n`;
            message += `- Liens Cloud trouvés : ${cloudCount}\n`;
            message += authData ? `- Données de profil : Trouvées\n` : `- Données de profil : Non trouvées\n`;
            alert(message);
            renderGallery();
        }
    } catch (e) { 
        console.error(e);
        setLoading(false);
        if (e.name !== 'AbortError') alert("Erreur lors de l'accès au dossier."); 
    }
};

// ==========================================
// SUPPRESSION SÉCURISÉE
// ==========================================
async function deleteSelected() {
    const checkedCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
    const checkedUrls = checkedCheckboxes.map(c => c.dataset.url);
    const toDelete = allAssets.filter(a => a.source === 'Local' && checkedUrls.includes(a.url));
    
    if (toDelete.length === 0) {
        return alert("Veuillez d'abord sélectionner des fichiers LOCAUX (ceux avec une image) pour les supprimer.");
    }
    
    const confirmMsg = `🚨 ACTION IR RÉVERSIBLE\n\nVous allez supprimer ${toDelete.length} fichiers directement de votre disque dur.\n\nConfirmez-vous la suppression ?`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    let successCount = 0;

    try {
        // Demande de permission d'écriture explicite
        if (await rootHandle.queryPermission({mode: 'readwrite'}) !== 'granted') {
            const permission = await rootHandle.requestPermission({mode: 'readwrite'});
            if (permission !== 'granted') throw new Error("Permission de suppression refusée.");
        }

        for (const asset of toDelete) {
            try {
                // Double vérification : on ne supprime que si le handle est valide et lié au serveur d'assets
                if (asset.grandParentHandle && asset.parentHandle) {
                    await asset.grandParentHandle.removeEntry(asset.parentHandle.name, { recursive: true });
                    URL.revokeObjectURL(asset.url);
                    successCount++;
                }
            } catch (err) {
                console.error(`Erreur lors de la suppression du dossier ${asset.id}:`, err);
            }
        }

        allAssets = allAssets.filter(a => !toDelete.some(td => td.url === a.url));
        renderGallery();
        alert(`🗑️ Suppression terminée : ${successCount} éléments supprimés de votre ordinateur.`);
    } catch (err) {
        alert("Erreur critique lors de la suppression : " + err.message);
    } finally {
        setLoading(false);
    }
}

// ==========================================
// RENDU DE LA GALERIE
// ==========================================
function renderGallery() {
    const typeF = document.getElementById('sortType').value;
    const dateO = document.getElementById('sortDate').value;
    
    currentGalleryItems = allAssets.filter(a => typeF === 'all' || a.media_type === typeF);
    currentGalleryItems.sort((a,b) => dateO === 'date-desc' ? b.date - a.date : a.date - b.date);

    localAssetsOnly = currentGalleryItems.filter(a => a.source === 'Local');

    jsonLinksEl.innerHTML = ''; 
    localFilesEl.innerHTML = '';

    let numberImg = 0;
    let numberLink = 0;

    currentGalleryItems.forEach((asset) => {
        const isV = visitedSet.has(asset.url);
        const dateStr = asset.date.toLocaleDateString('fr-FR');

        if (asset.source === 'JSON') {
            numberLink++;
            const item = document.createElement('div');
            item.className = `link-item ${isV ? 'visited' : ''}`;
            item.innerHTML = `
                <div style="min-width:40px">${asset.media_type === 'video' ? '🎥' : '🖼️'}</div>
                <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${asset.prompt}</div>
                <div style="font-size:0.75rem; color:#888; margin-left:10px">${dateStr}</div>
                <input type="checkbox" data-url="${asset.url}" onclick="event.stopPropagation()">
            `;
            item.onclick = () => { 
                window.open(asset.url, '_blank'); 
                markAsVisited(asset.url, item); 
            };
            jsonLinksEl.appendChild(item);
        } else {
            const currentLocalIndex = numberImg;
            numberImg++;
            const linked = allAssets.find(item => item.source === 'JSON' && item.id === asset.id);
            const card = document.createElement('div');
            card.className = `local-card ${isV ? 'visited' : ''}`;
            card.innerHTML = `
                <div class="media-container">
                    ${asset.media_type === 'video' ? `<video src="${asset.url}" muted loop></video>` : `<img src="${asset.url}">`}
                </div>
                <div class="info">
                    <strong>📁 ${asset.prompt.slice(0, 25)}...</strong>
                    <label>
                        <input type="checkbox" data-url="${asset.url}" onclick="event.stopPropagation()"> Sélectionner
                    </label>
                    ${linked ? `
                        <button class="grok-link-btn" onclick="event.stopPropagation(); window.open('${linked.url}', '_blank'); markAsVisited('${asset.url}', this.closest('.local-card'));">🔗 VOIR SUR GROK</button>
                    ` : ''}
                </div>`;
            card.onclick = () => { 
                markAsViewed(card); 
                openLightbox(currentLocalIndex); 
            };
            localFilesEl.appendChild(card);
        }
    });

    document.getElementById('numberImg').textContent = numberImg;
    document.getElementById('numberImg2').textContent = numberImg;
    document.getElementById('numberLink').textContent = numberLink;
    document.getElementById('numberLink2').textContent = numberLink;
    document.getElementById('clearBtn').disabled = allAssets.length === 0;
}

// ==========================================
// LIGHTBOX & NAVIGATION
// ==========================================
window.openLightbox = function(i) {
    if (i < 0 || i >= localAssetsOnly.length) return;
    currentLightboxIndex = i;
    const a = localAssetsOnly[i];
    const linked = allAssets.find(item => item.source === 'JSON' && item.id === a.id);
    const content = document.getElementById('lightboxContent');
    
    content.innerHTML = a.media_type === 'video' 
        ? `<video src="${a.url}" controls autoplay></video>` 
        : `<img src="${a.url}">`;

    document.getElementById('lightboxCounter').textContent = `${i + 1} / ${localAssetsOnly.length}`;
    document.getElementById('lightboxUrlItem').innerHTML = linked ? `
        <button class="grok-link-btn" onclick="event.stopPropagation(); window.open('${linked.url}', '_blank'); const target = document.querySelector('[data-url=\\'${a.url}\\']')?.closest('.local-card'); markAsVisited('${a.url}', target);">🔗 VOIR SUR GROK</button>
    ` : '';
    
    document.getElementById('lightbox').style.display = 'flex';
};

window.closeLightbox = function() { 
    document.getElementById('lightbox').style.display = 'none'; 
    document.getElementById('lightboxContent').innerHTML = ''; 
};

window.nextMedia = function() { openLightbox((currentLightboxIndex + 1) % localAssetsOnly.length); };
window.prevMedia = function() { openLightbox((currentLightboxIndex - 1 + localAssetsOnly.length) % localAssetsOnly.length); };

// ==========================================
// MODALE PROFIL
// ==========================================
window.openProfileModal = function() {
    if(!authData) return alert("Archive non chargée ou données de profil manquantes.");
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

// ==========================================
// EXPORTS & UTILITAIRES
// ==========================================
document.getElementById('exportBtn').onclick = () => {
    const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.dataset.url);
    const selected = allAssets.filter(a => checked.includes(a.url)).map(a => ({
        id: a.id, prompt: a.prompt, media_type: a.media_type, 
        link: a.source === 'Local' ? `https://grok.com/imagine/post/${a.id}` : a.url,
        create_time: a.date.toISOString()
    }));
    if (!selected.length) return alert("Veuillez cocher des éléments d'abord !");
    const blob = new Blob([JSON.stringify({ media_posts: selected }, null, 2)], { type: 'application/json' });
    currentExportData = { url: URL.createObjectURL(blob), name: `export-${Date.now()}.json` };
    document.getElementById('sharePopup').style.display = 'flex';
};

window.downloadFile = function() { 
    const a = document.createElement('a'); 
    a.href = currentExportData.url; 
    a.download = currentExportData.name; 
    a.click(); 
};

window.closePopup = function() { document.getElementById('sharePopup').style.display = 'none'; };

window.scrollToSection = function(id) {
    const sec = document.getElementById(id);
    sec.classList.remove('hidden');
    sec.previousElementSibling.classList.remove('collapsed');
    sec.previousElementSibling.scrollIntoView({ behavior: 'smooth' });
};

// Gestion Thème
let isDark = true;
document.getElementById('toggleTheme').onclick = () => {
    isDark = !isDark;
    document.body.classList.toggle('light', !isDark);
    document.getElementById('toggleTheme').textContent = isDark ? '☀️' : '🌙';
};

// Listeners UI
document.getElementById('sortType').onchange = renderGallery;
document.getElementById('sortDate').onchange = renderGallery;
document.getElementById('nextBtn').onclick = (e) => { e.stopPropagation(); nextMedia(); };
document.getElementById('prevBtn').onclick = (e) => { e.stopPropagation(); prevMedia(); };
document.getElementById('clearBtn').onclick = () => { if(confirm("Effacer tout l'affichage actuel ?")) { allAssets = []; renderGallery(); } };
document.getElementById('donBtn').onclick = () => { window.open('https://www.paypal.com/donate/?hosted_button_id=4SSHF5SWPGAQW', '_blank'); };
document.getElementById('deleteSelectedBtn').onclick = deleteSelected;

// Fermeture des modales au clic extérieur
window.onclick = (e) => { 
    if(e.target.id === 'profileModal' || e.target.classList.contains('modal-overlay')) closeProfileModal();
    if(e.target.id === 'lightbox') closeLightbox();
    if(e.target.id === 'sharePopup') closePopup();
};

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    if (document.getElementById('lightbox').style.display === 'flex') {
        if (e.key === "ArrowRight") nextMedia();
        if (e.key === "ArrowLeft") prevMedia();
        if (e.key === "Escape") closeLightbox();
    }
});
