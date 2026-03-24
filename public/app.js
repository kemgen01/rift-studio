/**
 * RIFT STUDIO - Frontend Client v2.0
 * Backend: Node.js + Express (API)
 * Security: IP Whitelisting (server-side)
 */

// ==================== API CLIENT ====================

const API = {
    async get(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
    },
    async post(url, data) {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        return r.json();
    },
    async del(url) {
        const r = await fetch(url, { method: "DELETE" });
        return r.json();
    },
    async put(url, data) {
        const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        return r.json();
    },
    async upload(url, formData) {
        const r = await fetch(url, { method: "POST", body: formData });
        return r.json();
    }
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }

// ==================== ROLES ====================

const ROLES = [
    { id: 'kurucu', name: 'Kurucu', level: 100, color: '#ef4444' },
    { id: 'yonetici', name: 'Yönetici', level: 90, color: '#f97316' },
    { id: 'basgelistirici', name: 'Baş Geliştirici', level: 80, color: '#dc2626' },
    { id: 'gelistirici', name: 'Geliştirici', level: 70, color: '#ef4444' },
    { id: 'dcbot', name: 'DC Bot Yazarı', level: 65, color: '#5865F2' },
    { id: 'sitetasarim', name: 'Site Tasarımcısı', level: 60, color: '#f1f1f1' },
    { id: 'grafik', name: 'Grafik Tasarımcısı', level: 55, color: '#ec4899' },
    { id: 'tester', name: 'Beta Tester', level: 50, color: '#10b981' },
    { id: 'icerik', name: 'İçerik Yöneticisi', level: 45, color: '#f59e0b' },
    { id: 'satis', name: 'Satış Temsilcisi', level: 40, color: '#14b8a6' },
    { id: 'destek', name: 'Destek Ekibi', level: 30, color: '#64748b' },
    { id: 'moderator', name: 'Moderatör', level: 25, color: '#6366f1' },
    { id: 'cevirmen', name: 'Çevirmen', level: 20, color: '#84cc16' },
    { id: 'mapper', name: 'Harita Tasarımcısı', level: 15, color: '#22d3ee' },
    { id: 'builder', name: 'Builder', level: 10, color: '#a855f7' }
];

function getRoleInfo(roleId) {
    return ROLES.find(r => r.id === roleId) || ROLES[ROLES.length - 1];
}

// ==================== CATEGORIES ====================

const CATEGORIES = [
    { id: 'pvp', name: 'PvP', icon: 'fa-khanda', color: '#ef4444' },
    { id: 'shop', name: 'Shop/Market', icon: 'fa-store', color: '#f59e0b' },
    { id: 'kit', name: 'Kit', icon: 'fa-box-open', color: '#dc2626' },
    { id: 'economy', name: 'Economy', icon: 'fa-coins', color: '#10b981' },
    { id: 'faction', name: 'Faction', icon: 'fa-flag', color: '#f1f1f1' },
    { id: 'skyblock', name: 'SkyBlock', icon: 'fa-cloud', color: '#3b82f6' },
    { id: 'prison', name: 'Prison', icon: 'fa-lock', color: '#6366f1' },
    { id: 'minigame', name: 'MiniGame', icon: 'fa-gamepad', color: '#ec4899' },
    { id: 'utility', name: 'Utility', icon: 'fa-tools', color: '#64748b' },
    { id: 'chat', name: 'Chat', icon: 'fa-comments', color: '#14b8a6' },
    { id: 'protection', name: 'Protection', icon: 'fa-shield-alt', color: '#22c55e' },
    { id: 'lobby', name: 'Lobby', icon: 'fa-door-open', color: '#f97316' },
    { id: 'cosmetic', name: 'Cosmetic', icon: 'fa-hat-wizard', color: '#d946ef' },
    { id: 'other', name: 'Diğer', icon: 'fa-cube', color: '#94a3b8' }
];

function getCategoryInfo(catId) {
    return CATEGORIES.find(c => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
}


// ==================== APPLICATION STATE ====================

let state = {
    view: 'store',
    tab: 'all',
    selectedCategory: 'all',
    currentUser: null,
    isAdmin: false,
    products: [],
    team: [],
    settings: { siteName: 'Rift Studio', discordLink: '', announcement: '' },
    logs: [],
    announcements: [],
    sales: [],
    messages: [],
    activeMessage: null,
    campaigns: []
};

async function loadData() {
    try {
        const [plugins, teamData, settingsData, campaignsData] = await Promise.all([
            API.get('/api/plugins'),
            API.get('/api/team'),
            API.get('/api/settings'),
            API.get('/api/campaigns').catch(() => [])
        ]);
        state.products = plugins;
        state.team = teamData;
        state.settings = settingsData;
        state.campaigns = campaignsData;
    } catch(e) {}
}

async function checkAdmin() {
    try {
        const r = await fetch('/api/admin/ping');
        if (r.ok) {
            state.isAdmin = true;
            try {
                const fullProducts = await API.get('/api/admin/products');
                if (Array.isArray(fullProducts)) {
                    state.products = fullProducts.map(p => ({
                        ...p,
                        image: p.imagePath ? '/uploads/images/' + p.imagePath.split('/').pop().split('\\').pop() : p.image
                    }));
                }
                const teamData = await API.get('/api/admin/team');
                if (Array.isArray(teamData)) state.team = teamData;
            } catch(e2) { /* data load fail but still admin */ }
        } else {
            state.isAdmin = false;
        }
    } catch(e) { state.isAdmin = false; }
}

function saveState() { /* server-side */ }
function logEvent() {}

// ==================== UI UTILITIES ====================

function showToast(msg, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i> ${msg}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getRating(item) {
    if(!item.reviews || item.reviews.length === 0) return 5.0;
    const sum = item.reviews.reduce((a, r) => a + r.rating, 0);
    return (sum / item.reviews.length).toFixed(1);
}

function canManage(productAuthor) {
    if(!state.isAdmin) return false;
    const role = getRoleInfo('kurucu');
    if(role.level >= 90) return true;
    return productAuthor === 'Admin';
}

// ==================== DISCOUNT SYSTEM ====================

function getEffectiveDiscount(product) {
    // Check product-specific discount
    if(product.discount > 0) {
        if(!product.discountEnd || Date.now() < product.discountEnd) {
            return product.discount;
        }
    }
    // Check global discount
    if(state.settings.globalDiscount > 0) {
        return state.settings.globalDiscount;
    }
    return 0;
}

function getDiscountTimeLeft(product) {
    if(!product.discountEnd) return null;
    const diff = product.discountEnd - Date.now();
    if(diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if(hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days} gün ${hours % 24} saat`;
    }
    return `${hours} saat ${minutes} dk`;
}

function setProductDiscount(productId, discount, durationHours = null) {
    const p = state.products.find(x => x.id === productId);
    if(!p) return false;
    
    p.discount = Math.min(100, Math.max(0, discount));
    
    if(durationHours && durationHours > 0) {
        p.discountEnd = Date.now() + (durationHours * 60 * 60 * 1000);
    } else {
        p.discountEnd = null; // Permanent
    }
    
    saveState();
    logEvent('DiscountSet', `${p.name} için %${discount} indirim (${durationHours || 'sınırsız'} saat)`);
    return true;
}

// ==================== SALES TRACKING ====================

function recordSale(productId, amount, code = null) {
    const p = state.products.find(x => x.id === productId);
    if(!p) return;
    
    const sale = {
        id: uid(),
        productId,
        productName: p.name,
        amount,
        creator: p.creator,
        code,
        timestamp: Date.now(),
        date: new Date().toLocaleString('tr-TR')
    };
    
    state.sales.unshift(sale);
    if(state.sales.length > 1000) state.sales.pop();
    
    // Update product sales count
    p.salesCount = (p.salesCount || 0) + 1;
    
    // Update creator stats
    const creator = state.team.find(t => t.name === p.creator);
    if(creator) {
        creator.salesCount = (creator.salesCount || 0) + 1;
        creator.totalEarnings = (creator.totalEarnings || 0) + amount;
    }
    
    saveState();
    logEvent('Sale', `${p.name} satıldı - $${amount}`);
}

function getMemberStats(memberName) {
    const memberProducts = state.products.filter(p => p.creator === memberName);
    const memberSales = state.sales.filter(s => s.creator === memberName);
    
    return {
        productCount: memberProducts.length,
        totalDownloads: memberProducts.reduce((a, p) => a + (p.downloads || 0), 0),
        totalSales: memberSales.length,
        totalEarnings: memberSales.reduce((a, s) => a + s.amount, 0),
        activeCodes: memberProducts.reduce((a, p) => a + (p.codes?.length || 0), 0),
        redeemedCodes: memberProducts.reduce((a, p) => a + (p.redeemedCodes?.length || 0), 0)
    };
}


// ==================== CODE SYSTEM ====================

function generateSecureCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'RIFT';
    for(let i = 0; i < 4; i++) {
        code += '-';
        for(let j = 0; j < 4; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return code;
}

async function redeemCode(productId, code) {
    try {
        const result = await API.post('/api/redeem', { productId, code: code.trim().toUpperCase() });
        if (result.success && result.downloadUrl) {
            window.open(result.downloadUrl, '_blank');
            return { success: true };
        }
        if (result.success) return { success: true };
        return { success: false, error: result.error || 'Geçersiz kod' };
    } catch(e) {
        return { success: false, error: 'Sunucu hatası' };
    }
}

// ==================== RENDER FUNCTIONS ====================

function render() {
    try {
    const app = document.getElementById('app');
    if(!app) return;
    let html = `
        <nav class="navbar" id="navbar">
            <div class="container nav-inner">
                <div class="brand" onclick="setView('store')">
                    <div class="brand-icon">
                        <i class="fa-solid fa-cube"></i>
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <span class="brand-text">RIFT</span>
                        <span class="brand-sub">STUDIO</span>
                    </div>
                </div>
                <div class="nav-links">
                    <button class="nav-link ${state.view === 'store' ? 'active' : ''}" onclick="setView('store')">
                        <i class="fa-solid fa-store"></i> Mağaza
                    </button>
                    <button class="nav-link ${state.view === 'about' ? 'active' : ''}" onclick="setView('about')">
                        <i class="fa-solid fa-users"></i> Ekibimiz
                    </button>
                    <button class="nav-link ${state.view === 'contact' ? 'active' : ''}" onclick="setView('contact')">
                        <i class="fa-solid fa-envelope"></i> İletişim
                    </button>
                    ${state.isAdmin ? `
                        <button class="nav-link ${state.view === 'admin' ? 'active' : ''}" onclick="setView('admin')">
                            <i class="fa-solid fa-user-shield"></i> Panel
                        </button>
                    ` : ''}
                </div>
            </div>
        </nav>
        <div style="padding-top: 72px;">
    `;

    if(state.view === 'store') html += renderStore();
    else if(state.view === 'about') html += renderAbout();
    else if(state.view === 'contact') html += renderContact();
    else if(state.view === 'admin' && state.isAdmin) html += renderAdmin();

    html += `</div>` + renderModals();
    app.innerHTML = html;
    
    initParticles();
    } catch(err) {
        document.getElementById('app').innerHTML = '<div style="padding:40px;color:#ef4444;font-family:monospace;"><h2>Render Error</h2><pre>' + err.message + '\n' + err.stack + '</pre><p style="color:#aaa;margin-top:20px;">isAdmin: ' + state.isAdmin + ' | view: ' + state.view + ' | products: ' + state.products.length + ' | team: ' + state.team.length + '</p></div>';
    }
}

function renderStore() {
    let filteredProducts = state.products;
    
    if(state.selectedCategory !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.cat === state.selectedCategory);
    }
    
    if(state.tab === 'premium') {
        filteredProducts = filteredProducts.filter(p => p.price > 0);
    } else if(state.tab === 'free') {
        filteredProducts = filteredProducts.filter(p => p.price === 0);
    }
    
    // Apply discounts
    filteredProducts = filteredProducts.map(p => ({
        ...p,
        effectiveDiscount: getEffectiveDiscount(p),
        discountTimeLeft: getDiscountTimeLeft(p)
    }));
    
    const totalDownloads = state.products.reduce((a, b) => a + (b.downloads || 0), 0);
    const totalSales = state.sales.length;
    
    return `
        <div class="hero container">
            <div class="hero-badge">
                <i class="fa-solid fa-shield-halved"></i>
                Enterprise Security v3.0
            </div>
            <h1 class="heading-xl">RIFT <span class="text-gradient">STUDIO</span></h1>
            <p class="hero-desc">
                Premium Minecraft eklentileriyle sunucunu bir üst seviyeye taşı.
                Her plugin özenle tasarlanmış, güvenlik testlerinden geçirilmiştir.
            </p>
            <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="window.open('${state.settings.discordLink}', '_blank')">
                    <i class="fa-brands fa-discord"></i> Discord
                </button>
                <button class="btn btn-secondary" onclick="setView('about')">
                    <i class="fa-solid fa-users"></i> Ekibimiz
                </button>
            </div>
            
            <div class="hero-stats">
                <div class="hero-stat">
                    <div class="hero-stat-value">${state.products.length}</div>
                    <div class="hero-stat-label">Plugin</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value">${totalDownloads}</div>
                    <div class="hero-stat-label">İndirme</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value">${totalSales}</div>
                    <div class="hero-stat-label">Satış</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value">${state.team.length}</div>
                    <div class="hero-stat-label">Üye</div>
                </div>
            </div>
        </div>
        
        ${(state.campaigns || []).filter(c => c.active && (!c.endsAt || c.endsAt > Date.now())).length > 0 ? `
        <div class="container" style="padding-top:24px;">
            <div style="display:flex; flex-direction:column; gap:14px;">
                ${(state.campaigns || []).filter(c => c.active && (!c.endsAt || c.endsAt > Date.now())).map(c => {
                    const mainP = state.products.find(p => p.id === c.mainProductId);
                    const bundlePs = (c.bundleProductIds || []).map(id => state.products.find(p => p.id === id)).filter(Boolean);
                    const giftP = c.giftProductId ? state.products.find(p => p.id === c.giftProductId) : null;
                    const totalOrig = (mainP ? mainP.price : 0) + bundlePs.reduce((s, p) => s + p.price, 0);
                    const discountPct = c.type === 'bundle' && totalOrig > 0 ? Math.round((1 - c.bundlePrice / totalOrig) * 100) : (c.type === 'discount' ? c.discountPercent : 0);
                    const timeLeft = c.endsAt ? Math.max(0, Math.ceil((c.endsAt - Date.now()) / 3600000)) : null;
                    const contactMsg = encodeURIComponent(c.title + (c.type === 'bundle' ? ' (Paket: ' + (mainP ? mainP.name : '') + bundlePs.map(p => ' + ' + p.name).join('') + ')' : c.type === 'gift' ? ' (' + (mainP ? mainP.name : '') + ' + Hediye: ' + (giftP ? giftP.name : '') + ')' : ' (' + (mainP ? mainP.name : '') + ' %' + c.discountPercent + ' indirim)'));
                    
                    return `
                    <div style="background:linear-gradient(135deg, var(--bg-card), rgba(220,38,38,0.06)); border:1px solid var(--primary)20; border-radius:18px; overflow:hidden; transition:border-color 0.3s;" onmouseover="this.style.borderColor='rgba(220,38,38,0.35)'" onmouseout="this.style.borderColor='rgba(220,38,38,0.12)'">
                        <div style="height:3px; background:linear-gradient(90deg, var(--primary), var(--gold), var(--primary));"></div>
                        <div style="padding:22px 26px; display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
                            <div style="width:52px; height:52px; border-radius:14px; background:var(--primary)12; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative;">
                                <i class="fa-solid fa-${c.type === 'gift' ? 'gift' : c.type === 'bundle' ? 'boxes-stacked' : 'percent'}" style="font-size:24px; color:var(--primary-light);"></i>
                                ${discountPct > 0 ? '<div style="position:absolute; top:-6px; right:-6px; background:var(--danger); color:#fff; font-size:9px; font-weight:800; padding:2px 5px; border-radius:6px;">-%'+discountPct+'</div>' : ''}
                            </div>
                            <div style="flex:1; min-width:200px;">
                                <div style="font-family:Orbitron,sans-serif; font-size:17px; font-weight:800; color:#fff; margin-bottom:5px;">
                                    ${c.title}
                                    ${timeLeft !== null ? '<span style="font-family:Inter,sans-serif; font-size:11px; color:var(--warning); font-weight:600; margin-left:10px;"><i class="fa-solid fa-hourglass-half"></i> '+timeLeft+' saat kaldı</span>' : ''}
                                </div>
                                ${c.type === 'bundle' && mainP ? `
                                    <div style="color:var(--text-dim); font-size:13px; line-height:1.7;">
                                        <span style="color:#fff; font-weight:600;">${mainP.name}</span>
                                        ${bundlePs.map(p => '<span style="color:var(--success); margin:0 4px;">+</span><span style="color:#fff; font-weight:600;">'+p.name+'</span>').join('')}
                                        <span style="color:var(--text-muted);"> birlikte al</span>
                                    </div>
                                ` : ''}
                                ${c.type === 'gift' && mainP && giftP ? `
                                    <div style="color:var(--text-dim); font-size:13px;">
                                        <span style="color:#fff; font-weight:600;">${mainP.name}</span> satın alana 
                                        <span style="color:var(--success); font-weight:700;"><i class="fa-solid fa-gift"></i> ${giftP.name}</span> HEDİYE!
                                    </div>
                                ` : ''}
                                ${c.type === 'discount' && mainP ? `
                                    <div style="color:var(--text-dim); font-size:13px;">
                                        <span style="color:#fff; font-weight:600;">${mainP.name}</span> — 
                                        <span style="color:var(--success); font-weight:700;">%${c.discountPercent} indirimle $${(mainP.price * (1 - c.discountPercent/100)).toFixed(2)}</span>
                                        <span style="text-decoration:line-through; color:var(--text-muted); margin-left:6px;">$${mainP.price.toFixed(2)}</span>
                                    </div>
                                ` : ''}
                                ${c.description ? '<div style="color:var(--text-muted); font-size:12px; margin-top:3px;">'+c.description+'</div>' : ''}
                            </div>
                            <div style="display:flex; align-items:center; gap:16px; flex-shrink:0; flex-wrap:wrap;">
                                ${c.type === 'bundle' ? `
                                    <div style="text-align:center;">
                                        <div style="text-decoration:line-through; color:var(--text-muted); font-size:13px;">$${totalOrig.toFixed(2)}</div>
                                        <div style="font-family:Orbitron,sans-serif; font-size:24px; font-weight:800; color:var(--success);">$${c.bundlePrice.toFixed(2)}</div>
                                        <div style="background:var(--success)15; color:var(--success); padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">%${discountPct} TASARRUF</div>
                                    </div>
                                ` : ''}
                                ${c.type === 'gift' ? `
                                    <div style="text-align:center;">
                                        <div style="font-size:32px;">🎁</div>
                                        <div style="font-size:11px; color:var(--success); font-weight:700;">ÜCRETSİZ HEDİYE</div>
                                    </div>
                                ` : ''}
                                ${c.type === 'discount' ? `
                                    <div style="text-align:center;">
                                        <div style="font-family:Orbitron,sans-serif; font-size:28px; font-weight:800; color:var(--success);">%${c.discountPercent}</div>
                                        <div style="font-size:11px; color:var(--text-muted); font-weight:600;">İNDİRİM</div>
                                    </div>
                                ` : ''}
                                <div style="display:flex; flex-direction:column; gap:8px; flex-shrink:0;">
                                    <button class="btn btn-primary" onclick="orderCampaign('${c.id}')" style="white-space:nowrap;">
                                        <i class="fa-solid fa-paper-plane"></i> Sipariş Ver
                                    </button>
                                    <div style="display:flex; gap:4px;">
                                        <input type="text" id="campCode_${c.id}" class="form-input" style="width:160px; padding:6px 10px; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-family:monospace;" placeholder="CAMP-XXXX-XXXX">
                                        <button class="btn btn-secondary btn-sm" onclick="redeemCampaignCode('${c.id}')" style="white-space:nowrap;">
                                            <i class="fa-solid fa-key"></i>
                                        </button>
                                    </div>
                                </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="container section" style="padding-top:40px;">
            <div class="category-filter">
                <button class="category-btn ${state.selectedCategory === 'all' ? 'active' : ''}" onclick="state.selectedCategory='all'; render();">
                    <i class="fa-solid fa-th-large"></i> Tümü
                </button>
                ${CATEGORIES.map(cat => `
                    <button class="category-btn ${state.selectedCategory === cat.id ? 'active' : ''}" onclick="state.selectedCategory='${cat.id}'; render();">
                        <i class="fa-solid ${cat.icon}"></i> ${cat.name}
                    </button>
                `).join('')}
            </div>
            
            <div class="store-controls">
                <div class="tabs">
                    <button class="tab ${state.tab === 'all' ? 'active-all' : ''}" onclick="state.tab='all'; render();">
                        <i class="fa-solid fa-th"></i> Tümü
                    </button>
                    <button class="tab ${state.tab === 'premium' ? 'active-premium' : ''}" onclick="state.tab='premium'; render();">
                        <i class="fa-solid fa-gem"></i> Premium
                    </button>
                    <button class="tab ${state.tab === 'free' ? 'active-free' : ''}" onclick="state.tab='free'; render();">
                        <i class="fa-solid fa-gift"></i> Ücretsiz
                    </button>
                </div>
            </div>
            
            ${filteredProducts.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>
                    <p>Bu kategoride henüz plugin yok.</p>
                </div>
            ` : `
            <div class="grid">
                ${filteredProducts.map(p => {
                    const catInfo = getCategoryInfo(p.cat);
                    const creator = state.team.find(t => t.name === p.creator);
                    const roleInfo = creator ? getRoleInfo(creator.role) : null;
                    const finalPrice = p.price * (1 - p.effectiveDiscount / 100);
                    
                    return `
                    <div class="card cursor-pointer" onclick="openProductModal('${p.id}')">
                        ${p.effectiveDiscount > 0 ? 
                            `<div class="card-badge badge-discount">
                                <i class="fa-solid fa-tag"></i> %${p.effectiveDiscount} 
                                ${p.discountTimeLeft ? `<small>(${p.discountTimeLeft})</small>` : ''}
                            </div>` :
                            p.price === 0 ? 
                                `<div class="card-badge badge-free"><i class="fa-solid fa-gift"></i> Ücretsiz</div>` :
                                `<div class="card-badge badge-premium"><i class="fa-solid fa-crown"></i> Premium</div>`
                        }
                        <div class="card-img-wrap">
                            ${p.image ? 
                                `<img src="${p.image}" class="card-img" alt="${p.name}" onerror="this.style.display='none'">` :
                                `<i class="fa-solid ${catInfo.icon} card-icon" style="color: ${catInfo.color}"></i>`
                            }
                            <div class="card-cat" style="background: ${catInfo.color}20; color: ${catInfo.color}; border-color: ${catInfo.color}40;">
                                <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.name}
                            </div>
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${p.name} <span style="font-size:12px; font-weight:400; color:var(--text-muted)">v${p.version}</span></h3>
                            
                            <div class="creator-info">
                                <i class="fa-solid fa-paint-brush"></i>
                                <span>Kit by <strong>${p.creator}</strong></span>
                                ${roleInfo ? `<span class="role-badge" style="background:${roleInfo.color}20; color:${roleInfo.color};">${roleInfo.name}</span>` : ''}
                            </div>
                            
                            <div class="card-meta">
                                <span><i class="fa-solid fa-star" style="color:var(--gold)"></i> ${getRating(p)}</span>
                                <span><i class="fa-solid fa-download"></i> ${p.downloads || 0}</span>
                                <span><i class="fa-solid fa-shopping-cart"></i> ${p.salesCount || 0}</span>
                            </div>
                            <p class="card-desc">${p.desc}</p>
                            <div class="card-footer">
                                <div>
                                    ${p.price === 0 ? 
                                        `<div class="card-price free">ÜCRETSİZ</div>` : 
                                        `<div class="card-price premium">
                                            ${p.effectiveDiscount > 0 ? 
                                                `<span style="text-decoration:line-through; font-size:14px; color:var(--text-muted); margin-right:8px;">$${p.price}</span>` : 
                                                ''
                                            }
                                            $${finalPrice.toFixed(2)}
                                        </div>`
                                    }
                                </div>
                                <div class="card-features-preview">
                                    ${p.features.slice(0, 2).map(f => `<span class="feature-tag">${f}</span>`).join('')}
                                    ${p.features.length > 2 ? `<span class="feature-tag">+${p.features.length - 2}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>`}
        </div>
    `;
}

function renderAbout() {
    const roleOrder = ['kurucu', 'basgelistirici', 'gelistirici', 'sitetasarim', 'moderator', 'destek'];
    const roleSections = {};
    
    state.team.forEach(t => {
        const r = t.role || 'gelistirici';
        if(!roleSections[r]) roleSections[r] = [];
        roleSections[r].push(t);
    });
    
    const sortedRoles = roleOrder.filter(r => roleSections[r] && roleSections[r].length > 0);
    Object.keys(roleSections).forEach(r => { if(!sortedRoles.includes(r)) sortedRoles.push(r); });
    
    let sections = '';
    sortedRoles.forEach(role => {
        const members = roleSections[role];
        const roleInfo = getRoleInfo(role);
        const isLeader = roleInfo.level >= 90;
        
        sections += `
            <div style="margin-bottom:48px;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px; padding-bottom:12px; border-bottom:2px solid ${roleInfo.color}30;">
                    <div style="width:40px; height:40px; border-radius:10px; background:${roleInfo.color}15; display:flex; align-items:center; justify-content:center; color:${roleInfo.color}; font-size:18px;">
                        <i class="fa-solid fa-${isLeader ? 'crown' : roleInfo.level >= 70 ? 'code' : roleInfo.level >= 60 ? 'palette' : 'shield-halved'}"></i>
                    </div>
                    <div>
                        <h2 style="font-family:'Orbitron',sans-serif; font-size:${isLeader ? '22px' : '18px'}; font-weight:700; color:#fff;">${roleInfo.name}</h2>
                        <p style="font-size:12px; color:var(--text-muted);">${members.length} üye</p>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(${isLeader ? '360px' : '280px'}, 1fr)); gap:16px;">
                    ${members.map(t => {
                        const stats = getMemberStats(t.name);
                        const products = state.products.filter(p => p.creator === t.name);
                        return `
                        <div style="background:var(--bg-card); border:1px solid ${roleInfo.color}15; border-radius:16px; padding:${isLeader ? '28px' : '22px'}; cursor:pointer; transition:all 0.3s; position:relative; overflow:hidden;" 
                            onclick="openMemberProfile('${t.id}')"
                            onmouseover="this.style.borderColor='${roleInfo.color}40'; this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 40px rgba(0,0,0,0.3)'"
                            onmouseout="this.style.borderColor='${roleInfo.color}15'; this.style.transform=''; this.style.boxShadow=''">
                            ${isLeader ? '<div style="position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, '+roleInfo.color+', transparent);"></div>' : ''}
                            <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
                                <div style="width:${isLeader ? '56px' : '46px'}; height:${isLeader ? '56px' : '46px'}; border-radius:50%; border:2px solid ${roleInfo.color}40; overflow:hidden; flex-shrink:0;">
                                    <img src="${t.avatar || 'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background='+roleInfo.color.replace('#','')+'&color=fff&size=128'}" style="width:100%; height:100%; object-fit:cover;" alt="${t.name}">
                                </div>
                                <div>
                                    <h3 style="font-family:'Orbitron',sans-serif; font-size:${isLeader ? '17px' : '15px'}; font-weight:700; color:#fff;">${t.name}</h3>
                                    <span style="background:${roleInfo.color}20; color:${roleInfo.color}; padding:2px 10px; border-radius:6px; font-size:10px; font-weight:700;">${roleInfo.name}</span>
                                </div>
                            </div>
                            <p style="font-size:13px; color:var(--text-dim); line-height:1.6; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${t.bio || 'Rift Studio ekip üyesi.'}</p>
                            <div style="display:flex; gap:16px; font-size:12px; color:var(--text-muted);">
                                <span><i class="fa-solid fa-box" style="color:${roleInfo.color}"></i> ${stats.productCount}</span>
                                <span><i class="fa-solid fa-download" style="color:var(--primary-light)"></i> ${stats.totalDownloads}</span>
                                <span><i class="fa-solid fa-shopping-cart" style="color:var(--gold)"></i> ${stats.totalSales}</span>
                            </div>
                            ${products.length > 0 ? '<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border); display:flex; gap:6px; flex-wrap:wrap;">'+products.slice(0,3).map(p => '<span style="background:var(--bg-surface); border:1px solid var(--border); padding:2px 8px; border-radius:5px; font-size:10px; color:var(--text-dim);">'+p.name+'</span>').join('')+(products.length > 3 ? '<span style="color:var(--text-muted); font-size:10px; padding:2px 4px;">+' + (products.length-3) + '</span>' : '')+'</div>' : ''}
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    });
    
    return `
        <div class="container section">
            <div style="text-align:center; max-width:800px; margin:0 auto 60px;">
                <h1 class="heading-lg mb-4">Ekibimiz</h1>
                <p style="color:var(--text-dim); font-size:16px;">Profesyonel geliştirici ve tasarımcı ekibimizle tanışın.</p>
            </div>
            ${sections}
        </div>
        
        <div class="modal-backdrop" id="memberProfileModal">
            <div class="modal-content" style="max-width:560px;">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-user-circle" style="color:var(--primary-light);"></i> Profil</div>
                    <button class="modal-close" onclick="closeModal('memberProfileModal')">✕</button>
                </div>
                <div class="modal-body" id="memberProfileContent"></div>
            </div>
        </div>
    `;
}

function openMemberProfile(id) {
    const t = state.team.find(x => x.id === id);
    if(!t) return;
    const roleInfo = getRoleInfo(t.role);
    const stats = getMemberStats(t.name);
    const products = state.products.filter(p => p.creator === t.name);
    
    const content = document.getElementById('memberProfileContent');
    if(!content) return;
    
    content.innerHTML = `
        <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid var(--border); margin-bottom:20px;">
            <div style="width:80px; height:80px; border-radius:50%; border:3px solid ${roleInfo.color}40; overflow:hidden; margin:0 auto 14px;">
                <img src="${t.avatar || 'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background='+roleInfo.color.replace('#','')+'&color=fff&size=128'}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <h2 style="font-family:'Orbitron',sans-serif; font-size:22px; font-weight:800; color:#fff; margin-bottom:6px;">${t.name}</h2>
            <span style="background:${roleInfo.color}20; color:${roleInfo.color}; padding:4px 14px; border-radius:8px; font-size:12px; font-weight:700; display:inline-block;">${roleInfo.name}</span>
            <p style="color:var(--text-dim); font-size:14px; line-height:1.7; margin-top:12px;">${t.bio || 'Rift Studio ekip üyesi.'}</p>
        </div>
        
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:20px;">
            <div style="text-align:center; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px;">
                <div style="font-family:'Orbitron',sans-serif; font-size:20px; font-weight:800; color:var(--primary-light);">${stats.productCount}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Plugin</div>
            </div>
            <div style="text-align:center; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px;">
                <div style="font-family:'Orbitron',sans-serif; font-size:20px; font-weight:800; color:var(--success);">${stats.totalDownloads}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">İndirme</div>
            </div>
            <div style="text-align:center; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px;">
                <div style="font-family:'Orbitron',sans-serif; font-size:20px; font-weight:800; color:var(--gold);">${stats.totalSales}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Satış</div>
            </div>
            <div style="text-align:center; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px;">
                <div style="font-family:'Orbitron',sans-serif; font-size:20px; font-weight:800; color:#fff;">$${stats.totalEarnings.toFixed(0)}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Kazanç</div>
            </div>
        </div>
        
        ${t.discord || t.website || t.github ? `
        <div style="margin-bottom:20px;">
            <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:10px;">Bağlantılar</div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${t.discord ? '<a href="https://discord.com/users/'+t.discord+'" target="_blank" style="background:#5865F220; color:#5865F2; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:600; text-decoration:none; display:flex; align-items:center; gap:6px; border:1px solid #5865F230; transition:all 0.2s;" onmouseover="this.style.background=\'#5865F240\'" onmouseout="this.style.background=\'#5865F220\'"><i class="fa-brands fa-discord"></i> '+t.discord+'</a>' : ''}
                ${t.website ? '<a href="'+t.website+'" target="_blank" style="background:var(--primary)20; color:var(--primary-light); padding:8px 16px; border-radius:10px; font-size:13px; font-weight:600; text-decoration:none; display:flex; align-items:center; gap:6px; border:1px solid var(--primary)30; transition:all 0.2s;" onmouseover="this.style.opacity=\'0.8\'" onmouseout="this.style.opacity=\'1\'"><i class="fa-solid fa-globe"></i> Web Sitesi</a>' : ''}
                ${t.github ? '<a href="https://github.com/'+t.github+'" target="_blank" style="background:#ffffff10; color:#fff; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:600; text-decoration:none; display:flex; align-items:center; gap:6px; border:1px solid #ffffff20; transition:all 0.2s;" onmouseover="this.style.background=\'#ffffff20\'" onmouseout="this.style.background=\'#ffffff10\'"><i class="fa-brands fa-github"></i> '+t.github+'</a>' : ''}
            </div>
        </div>
        ` : ''}
        
        ${products.length > 0 ? `
        <div>
            <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:10px;">Geliştirdiği Pluginler</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${products.map(p => {
                    const catInfo = getCategoryInfo(p.cat);
                    return '<div style="display:flex; align-items:center; gap:12px; background:var(--bg-surface); border:1px solid var(--border); border-radius:10px; padding:12px 16px; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor=\'var(--border-hover)\'" onmouseout="this.style.borderColor=\'var(--border)\'" onclick="closeModal(\'memberProfileModal\'); setView(\'store\');">' +
                        '<span style="background:'+catInfo.color+'20; color:'+catInfo.color+'; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;"><i class="fa-solid '+catInfo.icon+'"></i></span>' +
                        '<div style="flex:1; min-width:0;"><div style="font-weight:600; color:#fff; font-size:13px;">'+p.name+' <span style="color:var(--text-muted); font-weight:400; font-size:11px;">v'+p.version+'</span></div><div style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-download"></i> '+(p.downloads||0)+' · $'+(p.price||0)+'</div></div>' +
                    '</div>';
                }).join('')}
            </div>
        </div>
        ` : '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;"><i class="fa-solid fa-box-open" style="font-size:24px; opacity:0.3; margin-bottom:8px; display:block;"></i>Henüz plugin yok.</div>'}
    `;
    
    openModal('memberProfileModal');
}

function renderContact() {
    return `
        <div class="container" style="max-width:700px; padding:60px 20px;">
            <div style="text-align:center; margin-bottom:40px;">
                <h1 class="heading-xl" style="margin-bottom:8px;">
                    <i class="fa-solid fa-envelope" style="color:var(--primary-light);"></i> İletişime Geç
                </h1>
                <p style="color:var(--text-dim); font-size:15px;">Projeniz hakkında bize yazın, en kısa sürede dönüş yapalım.</p>
            </div>
            
            <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:20px; padding:32px; backdrop-filter:blur(10px);">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-user"></i> Ad Soyad</label>
                        <input type="text" id="ct_name" class="form-input" placeholder="İsminiz...">
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fa-brands fa-discord"></i> Discord</label>
                        <input type="text" id="ct_discord" class="form-input" placeholder="kullanici veya kullanici#0000">
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-server"></i> Sunucu Adı</label>
                        <input type="text" id="ct_server" class="form-input" placeholder="Sunucunuzun adı...">
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-envelope"></i> E-posta (Opsiyonel)</label>
                        <input type="email" id="ct_email" class="form-input" placeholder="email@ornek.com">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fa-solid fa-tag"></i> Hizmet Türü</label>
                    <select id="ct_service" class="form-input" style="cursor:pointer;">
                        <option value="">Seçiniz...</option>
                        <option value="plugin_hazir">💎 Hazır Plugin Satın Alma</option>
                        <option value="plugin_ozel">🔧 Özel Plugin Geliştirme</option>
                        <option value="plugin_paket">📦 Özel Plugin Paketi</option>
                        <option value="plugin_fix">🛠️ Plugin Düzenleme / Bug Fix</option>
                        <option value="web_tasarim">🌐 Web Sitesi Tasarımı</option>
                        <option value="logo_tasarim">🎨 Logo / Grafik Tasarım</option>
                        <option value="sunucu_kurulum">🖥️ Sunucu Kurulumu</option>
                        <option value="sunucu_konfig">⚙️ Sunucu Konfigürasyonu</option>
                        <option value="danismanlik">📋 Danışmanlık</option>
                        <option value="isbirligi">🤝 İş Birliği Teklifi</option>
                        <option value="diger">📝 Diğer</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fa-solid fa-wallet"></i> Bütçe Aralığı</label>
                    <select id="ct_budget" class="form-input" style="cursor:pointer;">
                        <option value="">Belirtmek istemiyorum</option>
                        <option value="0-10">$0 - $10</option>
                        <option value="10-25">$10 - $25</option>
                        <option value="25-50">$25 - $50</option>
                        <option value="50-100">$50 - $100</option>
                        <option value="100-250">$100 - $250</option>
                        <option value="250+">$250+</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fa-solid fa-message"></i> Detaylı Açıklama</label>
                    <textarea id="ct_message" class="form-input" rows="5" style="resize:vertical; min-height:120px;" placeholder="Ne yapmak istiyorsunuz? Mümkün olduğunca detaylı anlatın..."></textarea>
                </div>
                
                <button class="btn btn-primary btn-full" style="padding:16px; font-size:16px; margin-top:8px;" onclick="submitContact()">
                    <i class="fa-solid fa-paper-plane"></i> Gönder
                </button>
                
                <p style="text-align:center; font-size:12px; color:var(--text-muted); margin-top:16px;">
                    <i class="fa-solid fa-shield-halved"></i> Bilgileriniz güvenli şekilde iletilir. En geç 24 saat içinde Discord üzerinden dönüş yapılır.
                </p>
            </div>
        </div>
    `;
}

async function submitContact() {
    const name = document.getElementById('ct_name').value.trim();
    const discord = document.getElementById('ct_discord').value.trim();
    const server = document.getElementById('ct_server').value.trim();
    const email = document.getElementById('ct_email').value.trim();
    const service = document.getElementById('ct_service').value;
    const budget = document.getElementById('ct_budget').value;
    const message = document.getElementById('ct_message').value.trim();
    
    if(!name) { showToast('Ad soyad zorunlu', 'error'); return; }
    if(!discord) { showToast('Discord bilgisi zorunlu', 'error'); return; }
    if(!service) { showToast('Hizmet türü seçin', 'error'); return; }
    if(!message) { showToast('Açıklama yazın', 'error'); return; }
    
    try {
        const result = await API.post('/api/contact', { name, discord, server, email, service, budget, message });
        if(result.success) {
            showToast('Mesajınız alındı! Discord üzerinden dönüş yapacağız.', 'success');
            document.getElementById('ct_name').value = '';
            document.getElementById('ct_discord').value = '';
            document.getElementById('ct_server').value = '';
            document.getElementById('ct_email').value = '';
            document.getElementById('ct_service').selectedIndex = 0;
            document.getElementById('ct_budget').selectedIndex = 0;
            document.getElementById('ct_message').value = '';
        } else {
            showToast(result.error || 'Bir hata oluştu', 'error');
        }
    } catch(e) {
        showToast('Sunucu hatası', 'error');
    }
}

async function loadMessages() {
    try {
        state.messages = await API.get('/api/admin/messages');
    } catch(e) { state.messages = []; }
    adminTab = 'messages';
    render();
}

async function updateMsgStatus(id, status) {
    await API.put('/api/admin/messages/' + id, { status });
    state.messages = await API.get('/api/admin/messages');
    render();
}

async function deleteMsg(id) {
    if(!confirm('Mesajı silmek istediğinize emin misiniz?')) return;
    await API.del('/api/admin/messages/' + id);
    state.messages = await API.get('/api/admin/messages');
    state.activeMessage = null;
    showToast('Mesaj silindi', 'success');
    render();
}

async function openMessage(id) {
    state.activeMessage = id;
    const msg = state.messages.find(m => m.id === id);
    if(msg && msg.status === 'new') {
        await updateMsgStatus(id, 'read');
        return;
    }
    render();
    setTimeout(() => {
        const area = document.getElementById('chatArea');
        if(area) area.scrollTop = area.scrollHeight;
    }, 50);
}

async function sendReply(msgId) {
    const input = document.getElementById('replyInput');
    if(!input) return;
    const text = input.value.trim();
    if(!text) return;
    
    try {
        await API.put('/api/admin/messages/' + msgId, {
            reply: { text, from: 'admin', author: 'Admin' }
        });
        state.messages = await API.get('/api/admin/messages');
        render();
        setTimeout(() => {
            const area = document.getElementById('chatArea');
            if(area) area.scrollTop = area.scrollHeight;
        }, 50);
    } catch(e) {
        showToast('Gönderme hatası', 'error');
    }
}

function updateCampaignForm() {
    const type = document.getElementById('camp_type').value;
    document.getElementById('camp_bundle_fields').style.display = type === 'bundle' ? '' : 'none';
    document.getElementById('camp_gift_fields').style.display = type === 'gift' ? '' : 'none';
    document.getElementById('camp_discount_fields').style.display = type === 'discount' ? '' : 'none';
}

async function redeemCampaignCode(campId) {
    const input = document.getElementById('campCode_' + campId);
    if(!input) return;
    const code = input.value.trim().toUpperCase();
    if(!code) { showToast('Kod girin', 'error'); return; }
    
    try {
        const result = await API.post('/api/campaign-redeem', { campaignId: campId, code });
        if(result.success) {
            showToast('Kampanya kodu onaylandı! ' + (result.message || ''), 'success', 5000);
            input.value = '';
            if(result.downloadUrls && result.downloadUrls.length > 0) {
                result.downloadUrls.forEach((url, i) => {
                    setTimeout(() => window.open(url, '_blank'), i * 500);
                });
            }
            state.campaigns = await API.get('/api/campaigns').catch(() => []);
            render();
        } else {
            showToast(result.error || 'Geçersiz veya kullanılmış kod', 'error');
        }
    } catch(e) {
        showToast('Sunucu hatası', 'error');
    }
}

function orderCampaign(campId) {
    const c = (state.campaigns || []).find(x => x.id === campId);
    if(!c) return;
    
    const mainP = state.products.find(p => p.id === c.mainProductId);
    const bundlePs = (c.bundleProductIds || []).map(id => state.products.find(p => p.id === id)).filter(Boolean);
    const giftP = c.giftProductId ? state.products.find(p => p.id === c.giftProductId) : null;
    
    let detail = c.title + '\n\n';
    if(c.type === 'bundle' && mainP) {
        detail += 'Paket: ' + mainP.name + bundlePs.map(p => ' + ' + p.name).join('') + '\n';
        detail += 'Paket Fiyat: $' + c.bundlePrice.toFixed(2) + '\n';
    } else if(c.type === 'gift' && mainP && giftP) {
        detail += mainP.name + ' + Hediye: ' + giftP.name + '\n';
    } else if(c.type === 'discount' && mainP) {
        detail += mainP.name + ' — %' + c.discountPercent + ' indirimle $' + (mainP.price * (1 - c.discountPercent/100)).toFixed(2) + '\n';
    }
    detail += '\nBu kampanyadan yararlanmak istiyorum.';
    
    setView('contact');
    
    setTimeout(() => {
        const svcEl = document.getElementById('ct_service');
        if(svcEl) { svcEl.value = 'plugin_hazir'; }
        const msgEl = document.getElementById('ct_message');
        if(msgEl) { msgEl.value = detail; }
    }, 100);
}

function openCampaignModal() {
    openModal('campaignModal');
    setTimeout(updateCampaignForm, 50);
}

async function saveCampaign() {
    const title = document.getElementById('camp_title').value.trim();
    if(!title) { showToast('Başlık zorunlu', 'error'); return; }
    
    const type = document.getElementById('camp_type').value;
    const mainProductId = document.getElementById('camp_main').value;
    const endsVal = document.getElementById('camp_ends').value;
    const description = document.getElementById('camp_desc').value.trim();
    
    const campaign = {
        title,
        description,
        type,
        mainProductId,
        endsAt: endsVal ? new Date(endsVal).getTime() : null,
        active: true
    };
    
    if(type === 'bundle') {
        const checks = document.querySelectorAll('.camp_bundle_cb:checked');
        campaign.bundleProductIds = Array.from(checks).map(c => c.value).filter(id => id !== mainProductId);
        campaign.bundlePrice = parseFloat(document.getElementById('camp_bundle_price').value) || 0;
        if(campaign.bundleProductIds.length === 0) { showToast('En az bir ek plugin seçin', 'error'); return; }
        if(!campaign.bundlePrice) { showToast('Paket fiyatı girin', 'error'); return; }
    } else if(type === 'gift') {
        campaign.giftProductId = document.getElementById('camp_gift').value;
    } else if(type === 'discount') {
        campaign.discountPercent = parseInt(document.getElementById('camp_discount_pct').value) || 0;
        if(!campaign.discountPercent) { showToast('İndirim yüzdesi girin', 'error'); return; }
    }
    
    try {
        const result = await API.post('/api/admin/campaigns', campaign);
        if(result.success) {
            state.campaigns = await API.get('/api/admin/campaigns');
            showToast('Kampanya oluşturuldu!', 'success');
            closeModal('campaignModal');
            render();
        }
    } catch(e) { showToast('Hata', 'error'); }
}

async function toggleCampaign(id) {
    const c = state.campaigns.find(x => x.id === id);
    if(!c) return;
    await API.put('/api/admin/campaigns/' + id, { active: !c.active });
    state.campaigns = await API.get('/api/admin/campaigns');
    render();
}

async function deleteCampaign(id) {
    if(!confirm('Kampanyayı silmek istediğinize emin misiniz?')) return;
    await API.del('/api/admin/campaigns/' + id);
    state.campaigns = await API.get('/api/admin/campaigns');
    showToast('Kampanya silindi', 'success');
    render();
}

async function genCampaignCode(campId, count) {
    try {
        const result = await API.post('/api/admin/campaigns/' + campId + '/codes', { count: count || 1 });
        if(result.success) {
            state.campaigns = await API.get('/api/admin/campaigns');
            showToast(result.codes.length + ' kod oluşturuldu: ' + result.codes.join(', '), 'success', 5000);
            render();
        }
    } catch(e) { showToast('Hata', 'error'); }
}

async function delCampaignCode(campId, code) {
    await API.del('/api/admin/campaigns/' + campId + '/codes/' + encodeURIComponent(code));
    state.campaigns = await API.get('/api/admin/campaigns');
    showToast('Kod silindi', 'success');
    render();
}

let adminTab = 'overview';

function renderAdmin() {
    const role = getRoleInfo('kurucu');
    const isOwner = role.level >= 90;
    const isAdmin = role.level >= 70;
    const myProducts = state.products.filter(p => true);
    const shownProducts = isOwner ? state.products : myProducts;
    const myStats = getMemberStats('kemgen01');

    let content = '';
    
    if(adminTab === 'overview') {
        const dls = shownProducts.reduce((a,b) => a + (b.downloads || 0), 0);
        const totalCodes = shownProducts.reduce((a,b) => a + (b.codes?.length || 0), 0);
        const totalRedeemed = shownProducts.reduce((a,b) => a + (b.redeemedCodes?.length || 0), 0);
        
        content = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:16px;">
                <div>
                    <h2 class="heading-lg" style="margin-bottom:4px;">Hoşgeldin, Admin</h2>
                    <span class="role-badge-large" style="background:${role.color}20; color:${role.color}; border-color:${role.color}40;">
                        <i class="fa-solid fa-shield"></i> ${role.name}
                    </span>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon purple"><i class="fa-solid fa-box"></i></div>
                    <div class="stat-title">${isOwner ? 'Toplam Plugin' : 'Pluginlerim'}</div>
                    <div class="stat-val">${shownProducts.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon cyan"><i class="fa-solid fa-download"></i></div>
                    <div class="stat-title">İndirmeler</div>
                    <div class="stat-val">${dls}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon gold"><i class="fa-solid fa-shopping-cart"></i></div>
                    <div class="stat-title">Satışlarım</div>
                    <div class="stat-val">${myStats.totalSales}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fa-solid fa-dollar-sign"></i></div>
                    <div class="stat-title">Kazancım</div>
                    <div class="stat-val">$${myStats.totalEarnings.toFixed(0)}</div>
                </div>
            </div>
            
            <h3 class="heading-md mb-4"><i class="fa-solid fa-bullhorn" style="color:var(--primary-light);"></i> Duyurular</h3>
            <div class="admin-table" style="padding:24px; max-height:500px; overflow-y:auto;">
                ${isAdmin ? `
                    <div style="display:flex; gap:12px; margin-bottom:24px;">
                        <input type="text" id="annInput" class="form-input" placeholder="Tüm ekibe duyuru gönder...">
                        <button class="btn btn-primary" onclick="postAnnouncement()">
                            <i class="fa-solid fa-paper-plane"></i> Gönder
                        </button>
                    </div>
                    <hr style="border-color:var(--border); margin-bottom:24px;"/>
                ` : ''}
                ${state.announcements.length === 0 ? 
                    '<p style="color:var(--text-dim); text-align:center; padding:40px;">Henüz duyuru yok.</p>' : 
                    state.announcements.map(a => `
                        <div class="announcement-item">
                            <div class="announcement-header">
                                <div class="announcement-author">
                                    <i class="fa-solid fa-user"></i>
                                    ${a.from}
                                </div>
                                <div class="announcement-date">${a.date}</div>
                            </div>
                            <div class="announcement-text">${a.text}</div>
                        </div>
                    `).join('')
                }
            </div>
        `;
    } 
    else if(adminTab === 'products') {
        content = `
            <div class="flex justify-between items-center mb-4" style="flex-wrap:wrap; gap:16px;">
                <h2 class="heading-lg">Plugin Yönetimi</h2>
                <button class="btn btn-primary" onclick="openEditModal(null)">
                    <i class="fa-solid fa-plus"></i> Yeni Plugin
                </button>
            </div>
            <div class="admin-table">
                ${shownProducts.map(p => {
                    const catInfo = getCategoryInfo(p.cat);
                    const effectiveDiscount = getEffectiveDiscount(p);
                    return `
                    <div class="admin-row">
                        <div style="flex:1">
                            <div style="font-weight:600; color:#fff; font-size:15px;">
                                ${p.name} <span style="font-weight:400; color:var(--text-muted); font-size:12px;">v${p.version}</span>
                                ${effectiveDiscount > 0 ? `<span style="background:var(--danger); color:#fff; padding:2px 8px; border-radius:10px; font-size:10px; margin-left:8px;">%${effectiveDiscount}</span>` : ''}
                            </div>
                            <div style="color:var(--text-dim); font-size:12px; margin-top:4px;">
                                <span style="background:${catInfo.color}20; color:${catInfo.color}; padding:2px 8px; border-radius:6px; margin-right:8px;">
                                    <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.name}
                                </span>
                                <i class="fa-solid fa-paint-brush"></i> ${p.creator}
                                <span style="margin-left:12px;"><i class="fa-solid fa-shopping-cart"></i> ${p.salesCount || 0} satış</span>
                            </div>
                        </div>
                        <div style="text-align:right; margin-right:16px;">
                            <div style="font-weight:700; color:${p.price === 0 ? 'var(--success)' : 'var(--primary-light)'}; font-size:18px;">
                                ${p.price === 0 ? 'Ücretsiz' : '$'+p.price}
                            </div>
                            <div style="color:var(--text-muted); font-size:12px;">
                                <i class="fa-solid fa-download"></i> ${p.downloads || 0}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-secondary btn-sm" onclick="openEditModal('${p.id}')">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            ${isOwner ? `
                                <button class="btn btn-accent btn-sm" onclick="openDiscountModal('${p.id}')">
                                    <i class="fa-solid fa-percent"></i>
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }
    else if(adminTab === 'codes') {
        const premium = shownProducts.filter(p => p.price > 0);
        content = `
            <h2 class="heading-lg mb-4"><i class="fa-solid fa-key" style="color:var(--primary-light);"></i> Lisans Kodları</h2>
            ${premium.map(p => `
                <div class="admin-table mb-4">
                    <div style="padding:18px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); background:rgba(0,0,0,0.2);">
                        <div>
                            <strong style="color:#fff; font-size:16px;">${p.name}</strong>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                                <i class="fa-solid fa-key"></i> ${p.codes?.length || 0} aktif &bull; 
                                <i class="fa-solid fa-check"></i> ${p.redeemedCodes?.length || 0} kullanılmış &bull;
                                <i class="fa-solid fa-shopping-cart"></i> ${p.salesCount || 0} satış
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="generateCode('${p.id}')">
                            <i class="fa-solid fa-plus"></i> Yeni Kod
                        </button>
                    </div>
                    ${(p.codes || []).map(c => `
                        <div class="admin-row">
                            <div class="code-display" style="flex:1; margin-right:16px;">${c}</div>
                            <button class="btn btn-secondary btn-sm" onclick="copyCode('${c}')">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCode('${p.id}', '${c}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        `;
    }
    else if(adminTab === 'sales') {
        const mySales = state.sales.filter(s => true);
        const allSales = isOwner ? state.sales : mySales;
        
        content = `
            <h2 class="heading-lg mb-4"><i class="fa-solid fa-chart-line" style="color:var(--primary-light);"></i> Satış Raporu</h2>
            
            <div class="stats-grid" style="margin-bottom:24px;">
                <div class="stat-card">
                    <div class="stat-icon gold"><i class="fa-solid fa-shopping-cart"></i></div>
                    <div class="stat-title">Toplam Satış</div>
                    <div class="stat-val">${allSales.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fa-solid fa-dollar-sign"></i></div>
                    <div class="stat-title">Toplam Kazanç</div>
                    <div class="stat-val">$${allSales.reduce((a,s) => a + s.amount, 0).toFixed(0)}</div>
                </div>
            </div>
            
            <div class="admin-table">
                ${allSales.slice(0, 50).map(s => `
                    <div class="admin-row">
                        <div style="flex:1">
                            <div style="font-weight:600; color:#fff;">${s.productName}</div>
                            <div style="color:var(--text-muted); font-size:12px;">
                                <i class="fa-solid fa-user"></i> ${s.creator} &bull; ${s.date}
                            </div>
                        </div>
                        <div style="font-weight:700; color:var(--success);">$${s.amount.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    else if(adminTab === 'team' && isOwner) {
        content = `
            <div class="flex justify-between items-center mb-4" style="flex-wrap:wrap; gap:16px;">
                <h2 class="heading-lg">Ekip Yönetimi</h2>
                <button class="btn btn-primary" onclick="openAccountModal()">
                    <i class="fa-solid fa-user-plus"></i> Yeni Hesap
                </button>
            </div>
            <div class="admin-table">
                ${state.team.map(t => {
                    const stats = getMemberStats(t.name);
                    const roleInfo = getRoleInfo(t.role);
                    return `
                    <div class="admin-row">
                        <div style="flex:1">
                            <div style="font-weight:600; color:#fff; font-size:15px;">
                                ${t.name} 
                                <span class="role-badge" style="background:${roleInfo.color}20; color:${roleInfo.color}; border-color:${roleInfo.color}40;">
                                    ${roleInfo.name}
                                </span>
                            </div>
                            <div style="color:var(--text-dim); font-size:12px; margin-top:4px;">
                                <i class="fa-solid fa-box"></i> ${stats.productCount} plugin &bull;
                                <i class="fa-solid fa-shopping-cart"></i> ${stats.totalSales} satış &bull;
                                <i class="fa-solid fa-dollar-sign"></i> $${stats.totalEarnings.toFixed(0)}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            ${true && roleInfo.level < 100 ? `
                                <button class="btn btn-danger btn-sm" onclick="deleteAccount('${t.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : '<span style="color:var(--text-muted); font-size:12px;"><i class="fa-solid fa-lock"></i></span>'}
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }

    else if(adminTab === 'messages' && isOwner) {
        const statusColors = { 'new': '#ef4444', 'read': '#f59e0b', 'replied': '#10b981', 'closed': '#71717a' };
        const statusLabels = { 'new': 'Yeni', 'read': 'Okundu', 'replied': 'Yanıtlandı', 'closed': 'Kapalı' };
        const msgs = state.messages || [];
        const newCount = msgs.filter(m => m.status === 'new').length;
        const activeMsg = state.activeMessage ? msgs.find(m => m.id === state.activeMessage) : null;
        
        if(activeMsg) {
            const replies = activeMsg.replies || [];
            content = `
                <div style="margin-bottom:20px;">
                    <button class="btn btn-secondary btn-sm" onclick="state.activeMessage=null; render();">
                        <i class="fa-solid fa-arrow-left"></i> Geri
                    </button>
                </div>
                <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; overflow:hidden;">
                    <div style="padding:20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                        <div>
                            <div style="font-weight:700; color:#fff; font-size:18px; margin-bottom:6px;">
                                <i class="fa-solid fa-user"></i> ${activeMsg.name}
                                <span style="background:${statusColors[activeMsg.status] || '#71717a'}20; color:${statusColors[activeMsg.status] || '#71717a'}; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600; margin-left:8px;">${statusLabels[activeMsg.status] || activeMsg.status}</span>
                            </div>
                            <div style="color:var(--text-dim); font-size:12px; display:flex; gap:14px; flex-wrap:wrap;">
                                <span><i class="fa-brands fa-discord"></i> ${activeMsg.discord}</span>
                                ${activeMsg.server ? '<span><i class="fa-solid fa-server"></i> '+activeMsg.server+'</span>' : ''}
                                ${activeMsg.email ? '<span><i class="fa-solid fa-envelope"></i> '+activeMsg.email+'</span>' : ''}
                                <span><i class="fa-solid fa-clock"></i> ${activeMsg.date}</span>
                            </div>
                            <div style="display:flex; gap:8px; margin-top:8px;">
                                <span style="background:var(--primary)20; color:var(--primary-light); padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600;">${activeMsg.service}</span>
                                <span style="background:var(--gold)15; color:var(--gold); padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600;">${activeMsg.budget}</span>
                            </div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <select class="form-input" style="width:auto; padding:6px 10px; font-size:11px; cursor:pointer;" onchange="updateMsgStatus('${activeMsg.id}', this.value)">
                                <option value="new" ${activeMsg.status==='new'?'selected':''}>Yeni</option>
                                <option value="read" ${activeMsg.status==='read'?'selected':''}>Okundu</option>
                                <option value="replied" ${activeMsg.status==='replied'?'selected':''}>Yanıtlandı</option>
                                <option value="closed" ${activeMsg.status==='closed'?'selected':''}>Kapalı</option>
                            </select>
                            <button class="btn btn-danger btn-sm" onclick="deleteMsg('${activeMsg.id}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div style="padding:20px; max-height:500px; overflow-y:auto;" id="chatArea">
                        <div style="display:flex; gap:10px; margin-bottom:16px;">
                            <div style="width:36px; height:36px; border-radius:50%; background:var(--primary)20; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--primary-light); font-size:14px;">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div style="flex:1; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; border-top-left-radius:4px; padding:14px;">
                                <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:flex; justify-content:space-between;">
                                    <span style="font-weight:600; color:var(--primary-light);">${activeMsg.name}</span>
                                    <span>${activeMsg.date}</span>
                                </div>
                                <div style="color:var(--text); font-size:14px; line-height:1.7; white-space:pre-wrap;">${activeMsg.message}</div>
                            </div>
                        </div>
                        
                        ${replies.map(r => `
                            <div style="display:flex; gap:10px; margin-bottom:16px; ${r.from === 'admin' ? 'flex-direction:row-reverse;' : ''}">
                                <div style="width:36px; height:36px; border-radius:50%; background:${r.from === 'admin' ? 'var(--success)' : 'var(--primary)'}20; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:${r.from === 'admin' ? 'var(--success)' : 'var(--primary-light)'}; font-size:14px;">
                                    <i class="fa-solid ${r.from === 'admin' ? 'fa-shield-halved' : 'fa-user'}"></i>
                                </div>
                                <div style="flex:1; max-width:80%; background:${r.from === 'admin' ? 'var(--success)' : 'var(--bg-surface)'}10; border:1px solid ${r.from === 'admin' ? 'var(--success)' : 'var(--border)'}30; border-radius:12px; ${r.from === 'admin' ? 'border-top-right-radius:4px;' : 'border-top-left-radius:4px;'} padding:14px;">
                                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:flex; justify-content:space-between;">
                                        <span style="font-weight:600; color:${r.from === 'admin' ? 'var(--success)' : 'var(--primary-light)'};">${r.from === 'admin' ? (r.author || 'Admin') : activeMsg.name}</span>
                                        <span>${r.date}</span>
                                    </div>
                                    <div style="color:var(--text); font-size:14px; line-height:1.7; white-space:pre-wrap;">${r.text}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="padding:16px 20px; border-top:1px solid var(--border); display:flex; gap:10px; align-items:flex-end;">
                        <textarea id="replyInput" class="form-input" rows="2" style="flex:1; resize:vertical; min-height:44px; max-height:150px;" placeholder="Yanıt yaz..." onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendReply('${activeMsg.id}');}"></textarea>
                        <button class="btn btn-primary" style="height:44px; padding:0 20px;" onclick="sendReply('${activeMsg.id}')">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            content = `
                <div class="flex justify-between items-center mb-4" style="flex-wrap:wrap; gap:16px;">
                    <h2 class="heading-lg">
                        <i class="fa-solid fa-envelope" style="color:var(--primary-light);"></i> Mesajlar
                        ${newCount > 0 ? '<span style="background:var(--danger);color:#fff;font-size:13px;padding:4px 10px;border-radius:12px;margin-left:8px;">'+newCount+' yeni</span>' : ''}
                    </h2>
                </div>
                ${msgs.length === 0 ? '<div style="text-align:center; padding:60px; color:var(--text-muted);"><i class="fa-solid fa-inbox" style="font-size:48px; opacity:0.3; margin-bottom:16px; display:block;"></i>Henüz mesaj yok.</div>' : ''}
                <div class="admin-table">
                    ${msgs.map(m => {
                        const replyCount = (m.replies || []).length;
                        const lastReply = replyCount > 0 ? m.replies[replyCount - 1] : null;
                        return `
                        <div class="admin-row" style="cursor:pointer; transition:background 0.15s;" onclick="openMessage('${m.id}')" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">
                            <div style="width:42px; height:42px; border-radius:50%; background:${statusColors[m.status]}15; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:${statusColors[m.status]}; font-size:16px; border:2px solid ${statusColors[m.status]}30;">
                                <i class="fa-solid ${m.status === 'new' ? 'fa-circle-exclamation' : m.status === 'replied' ? 'fa-check-double' : m.status === 'closed' ? 'fa-circle-check' : 'fa-envelope-open'}"></i>
                            </div>
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                                    <span style="font-weight:700; color:#fff; font-size:14px;">${m.name}</span>
                                    <span style="color:var(--text-muted); font-size:11px;">${m.date}</span>
                                </div>
                                <div style="font-size:12px; color:var(--text-dim); margin-bottom:3px;">
                                    <span style="background:var(--primary)15; color:var(--primary-light); padding:1px 8px; border-radius:4px; font-size:10px; font-weight:600;">${m.service}</span>
                                    <span style="margin-left:8px;"><i class="fa-brands fa-discord"></i> ${m.discord}</span>
                                </div>
                                <div style="color:var(--text-muted); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                    ${lastReply ? '<span style="color:var(--success);"><i class="fa-solid fa-reply"></i> '+((lastReply.text || '').substring(0, 60))+'...</span>' : (m.message || '').substring(0, 80) + '...'}
                                </div>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
                                <span style="background:${statusColors[m.status]}20; color:${statusColors[m.status]}; padding:2px 8px; border-radius:8px; font-size:10px; font-weight:700;">${statusLabels[m.status]}</span>
                                ${replyCount > 0 ? '<span style="color:var(--text-muted); font-size:11px;"><i class="fa-solid fa-comments"></i> '+replyCount+'</span>' : ''}
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
        }
    }

    else if(adminTab === 'campaigns') {
        const camps = state.campaigns || [];
        const now = Date.now();
        
        content = `
            <div class="flex justify-between items-center mb-4" style="flex-wrap:wrap; gap:16px;">
                <h2 class="heading-lg"><i class="fa-solid fa-fire" style="color:var(--primary-light);"></i> Kampanyalar</h2>
                <button class="btn btn-primary" onclick="openCampaignModal()">
                    <i class="fa-solid fa-plus"></i> Yeni Kampanya
                </button>
            </div>
            ${camps.length === 0 ? '<div style="text-align:center; padding:60px; color:var(--text-muted);"><i class="fa-solid fa-tags" style="font-size:48px; opacity:0.3; margin-bottom:16px; display:block;"></i>Henüz kampanya yok.</div>' : ''}
            <div style="display:flex; flex-direction:column; gap:16px;">
                ${camps.map(c => {
                    const isExpired = c.endsAt && c.endsAt < now;
                    const isActive = c.active && !isExpired;
                    const mainProduct = state.products.find(p => p.id === c.mainProductId);
                    const bundleProducts = (c.bundleProductIds || []).map(id => state.products.find(p => p.id === id)).filter(Boolean);
                    const giftProduct = c.giftProductId ? state.products.find(p => p.id === c.giftProductId) : null;
                    const totalOriginal = (mainProduct ? mainProduct.price : 0) + bundleProducts.reduce((s, p) => s + p.price, 0);
                    
                    return `
                    <div style="background:var(--bg-card); border:1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}30; border-radius:16px; overflow:hidden; ${isActive ? 'box-shadow:0 0 20px rgba(220,38,38,0.08);' : 'opacity:0.6;'}">
                        ${isActive ? '<div style="height:3px; background:linear-gradient(90deg, var(--primary), var(--gold));"></div>' : '<div style="height:3px; background:var(--border);"></div>'}
                        <div style="padding:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <div style="font-family:'Orbitron',sans-serif; font-size:18px; font-weight:800; color:#fff; margin-bottom:4px;">
                                        <i class="fa-solid fa-fire" style="color:var(--primary-light);"></i> ${c.title}
                                        <span style="background:${isActive ? 'var(--success)' : 'var(--danger)'}20; color:${isActive ? 'var(--success)' : 'var(--danger)'}; padding:2px 10px; border-radius:8px; font-size:11px; font-weight:600; margin-left:8px;">${isActive ? 'AKTİF' : isExpired ? 'SÜRESİ DOLDU' : 'KAPALI'}</span>
                                    </div>
                                    ${c.description ? '<p style="color:var(--text-dim); font-size:13px; margin-bottom:8px;">'+c.description+'</p>' : ''}
                                    ${c.endsAt ? '<div style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-clock"></i> Bitiş: '+new Date(c.endsAt).toLocaleString('tr-TR')+'</div>' : ''}
                                </div>
                                <div style="display:flex; gap:6px;">
                                    <button class="btn btn-secondary btn-sm" onclick="toggleCampaign('${c.id}')">
                                        <i class="fa-solid fa-${isActive ? 'pause' : 'play'}"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteCampaign('${c.id}')">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
                                ${c.type === 'bundle' ? `
                                    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px; flex:1; min-width:200px;">
                                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Paket İçeriği</div>
                                        ${mainProduct ? '<div style="font-size:13px; color:#fff; margin-bottom:4px;"><i class="fa-solid fa-box" style="color:var(--primary-light);"></i> '+mainProduct.name+' <span style="color:var(--text-muted);">($'+mainProduct.price+')</span></div>' : ''}
                                        ${bundleProducts.map(p => '<div style="font-size:13px; color:#fff; margin-bottom:4px;"><i class="fa-solid fa-plus" style="color:var(--success);"></i> '+p.name+' <span style="color:var(--text-muted);">($'+p.price+')</span></div>').join('')}
                                    </div>
                                    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center; min-width:140px;">
                                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Fiyat</div>
                                        <div style="text-decoration:line-through; color:var(--text-muted); font-size:14px;">$${totalOriginal.toFixed(2)}</div>
                                        <div style="font-family:'Orbitron',sans-serif; font-size:24px; font-weight:800; color:var(--success);">$${c.bundlePrice.toFixed(2)}</div>
                                        <div style="color:var(--primary-light); font-size:12px; font-weight:700;">%${Math.round((1 - c.bundlePrice / totalOriginal) * 100)} İNDİRİM</div>
                                    </div>
                                ` : ''}
                                ${c.type === 'gift' ? `
                                    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px; flex:1;">
                                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Kampanya Detayı</div>
                                        ${mainProduct ? '<div style="font-size:14px; color:#fff; margin-bottom:8px;"><i class="fa-solid fa-shopping-cart" style="color:var(--primary-light);"></i> <strong>'+mainProduct.name+'</strong> satın alana</div>' : ''}
                                        ${giftProduct ? '<div style="font-size:14px; color:var(--success);"><i class="fa-solid fa-gift"></i> <strong>'+giftProduct.name+'</strong> HEDİYE!</div>' : ''}
                                    </div>
                                ` : ''}
                                ${c.type === 'discount' ? `
                                    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px; flex:1;">
                                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Kampanya Detayı</div>
                                        ${mainProduct ? '<div style="font-size:14px; color:#fff; margin-bottom:4px;"><i class="fa-solid fa-box" style="color:var(--primary-light);"></i> '+mainProduct.name+'</div>' : ''}
                                        <div style="font-size:22px; font-family:'Orbitron',sans-serif; font-weight:800; color:var(--success); margin-top:8px;">%${c.discountPercent} İNDİRİM</div>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div style="border-top:1px solid var(--border); padding-top:14px; margin-top:4px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                    <div style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:1px;">
                                        <i class="fa-solid fa-key"></i> Kampanya Kodları
                                        <span style="background:var(--gold)15; color:var(--gold); padding:2px 8px; border-radius:6px; font-size:10px; margin-left:6px;">${(c.codes || []).length} aktif</span>
                                    </div>
                                    <div style="display:flex; gap:6px;">
                                        <button class="btn btn-secondary btn-sm" onclick="genCampaignCode('${c.id}', 1)">
                                            <i class="fa-solid fa-plus"></i> 1 Kod
                                        </button>
                                        <button class="btn btn-primary btn-sm" onclick="genCampaignCode('${c.id}', 5)">
                                            <i class="fa-solid fa-layer-group"></i> 5 Kod
                                        </button>
                                    </div>
                                </div>
                                ${(c.codes || []).length > 0 ? `
                                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                                        ${(c.codes || []).map(code => `
                                            <div style="display:flex; align-items:center; gap:6px; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:6px 10px;">
                                                <code style="font-size:12px; color:var(--gold); letter-spacing:1.5px; font-family:monospace;">${code}</code>
                                                <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:12px; padding:2px;" onclick="event.stopPropagation(); navigator.clipboard.writeText('${code}'); showToast('Kopyalandı!','success');" title="Kopyala">
                                                    <i class="fa-solid fa-copy"></i>
                                                </button>
                                                <button style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:12px; padding:2px;" onclick="event.stopPropagation(); delCampaignCode('${c.id}','${code}')" title="Sil">
                                                    <i class="fa-solid fa-times"></i>
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:10px;">Henüz kod oluşturulmadı</div>'}
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }

    return `
        <div class="admin-layout container">
            <div class="admin-sidebar">
                <div style="color:var(--text-muted); font-size:10px; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px; padding-left:16px; font-weight:600;">
                    <i class="fa-solid fa-shield-halved"></i> ${role.name} Paneli
                </div>
                <button class="sidebar-link ${adminTab === 'overview' ? 'active' : ''}" onclick="adminTab='overview'; render();">
                    <i class="fa-solid fa-chart-line"></i> Genel Bakış
                </button>
                <button class="sidebar-link ${adminTab === 'products' ? 'active' : ''}" onclick="adminTab='products'; render();">
                    <i class="fa-solid fa-box"></i> Pluginler
                </button>
                <button class="sidebar-link ${adminTab === 'codes' ? 'active' : ''}" onclick="adminTab='codes'; render();">
                    <i class="fa-solid fa-key"></i> Lisans Kodları
                </button>
                <button class="sidebar-link ${adminTab === 'sales' ? 'active' : ''}" onclick="adminTab='sales'; render();">
                    <i class="fa-solid fa-chart-bar"></i> Satış Raporu
                </button>
                <button class="sidebar-link ${adminTab === 'campaigns' ? 'active' : ''}" onclick="adminTab='campaigns'; render();">
                    <i class="fa-solid fa-fire"></i> Kampanyalar
                </button>
                ${isOwner ? `
                    <div class="sidebar-section">Yönetim</div>
                    <button class="sidebar-link ${adminTab === 'team' ? 'active' : ''}" onclick="adminTab='team'; render();">
                        <i class="fa-solid fa-users"></i> Ekip
                    </button>
                    <button class="sidebar-link ${adminTab === 'messages' ? 'active' : ''}" onclick="adminTab='messages'; loadMessages();">
                        <i class="fa-solid fa-envelope"></i> Mesajlar ${state.messages && state.messages.filter(m=>m.status==='new').length > 0 ? '<span style="background:var(--danger);color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:4px;">'+state.messages.filter(m=>m.status==='new').length+'</span>' : ''}
                    </button>
                ` : ''}
            </div>
            <div class="admin-main">${content}</div>
        </div>
    `;
}

function renderModals() {
    
    return `

        <!-- Add Account Modal -->
        <div class="modal-backdrop" id="accountModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-user-plus" style="color:var(--primary-light);"></i> Yeni Hesap</div>
                    <button class="modal-close" onclick="closeModal('accountModal')">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Kullanıcı Adı</label>
                        <input type="text" id="aUser" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Şifre (min 8 karakter)</label>
                        <input type="password" id="aPwd" class="form-input" minlength="8">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rol</label>
                        <select id="aRole" class="form-select">
                            ${ROLES.filter(r => r.level < 100).map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Biyografi</label>
                        <textarea id="aBio" class="form-textarea" rows="2"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fa-brands fa-discord"></i> Discord Kullanıcı ID</label>
                        <input type="text" id="aDiscord" class="form-input" placeholder="123456789012345678">
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-globe"></i> Web Sitesi (Opsiyonel)</label>
                        <input type="text" id="aWebsite" class="form-input" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fa-brands fa-github"></i> GitHub (Opsiyonel)</label>
                        <input type="text" id="aGithub" class="form-input" placeholder="kullaniciadi">
                    </div>
                    <button class="btn btn-primary btn-full" onclick="saveAccount()">
                        <i class="fa-solid fa-check"></i> Hesap Oluştur
                    </button>
                </div>
            </div>
        </div>

        <!-- Campaign Modal -->
        <div class="modal-backdrop" id="campaignModal">
            <div class="modal-content" style="max-width:560px;">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-fire" style="color:var(--primary-light);"></i> Yeni Kampanya</div>
                    <button class="modal-close" onclick="closeModal('campaignModal')">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Kampanya Başlığı</label>
                        <input type="text" id="camp_title" class="form-input" placeholder="Örn: Yaz Kampanyası">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Açıklama (Opsiyonel)</label>
                        <textarea id="camp_desc" class="form-input" rows="2" placeholder="Kampanya detayı..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kampanya Türü</label>
                        <select id="camp_type" class="form-input" style="cursor:pointer;" onchange="updateCampaignForm()">
                            <option value="bundle">📦 Paket — Birden fazla plugini indirimli sat</option>
                            <option value="gift">🎁 Hediye — Bir plugin alana başka plugin hediye</option>
                            <option value="discount">💰 İndirim — Tek pluginde yüzde indirim</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ana Plugin</label>
                        <select id="camp_main" class="form-input" style="cursor:pointer;">
                            ${state.products.filter(p => p.price > 0).map(p => '<option value="'+p.id+'">'+p.name+' ($'+p.price+')</option>').join('')}
                        </select>
                    </div>
                    <div id="camp_bundle_fields">
                        <div class="form-group">
                            <label class="form-label">Pakete Dahil Diğer Pluginler</label>
                            <div id="camp_bundle_list" style="display:flex; flex-direction:column; gap:6px;">
                                ${state.products.filter(p => p.price > 0).map(p => '<label style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; cursor:pointer; font-size:13px; color:var(--text);"><input type="checkbox" class="camp_bundle_cb" value="'+p.id+'"> '+p.name+' ($'+p.price+')</label>').join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Paket Fiyatı ($)</label>
                            <input type="number" id="camp_bundle_price" class="form-input" step="0.01" placeholder="Toplam indirimli fiyat">
                        </div>
                    </div>
                    <div id="camp_gift_fields" style="display:none;">
                        <div class="form-group">
                            <label class="form-label">Hediye Edilecek Plugin</label>
                            <select id="camp_gift" class="form-input" style="cursor:pointer;">
                                ${state.products.map(p => '<option value="'+p.id+'">'+p.name+(p.price > 0 ? ' ($'+p.price+')' : ' (Ücretsiz)')+'</option>').join('')}
                            </select>
                        </div>
                    </div>
                    <div id="camp_discount_fields" style="display:none;">
                        <div class="form-group">
                            <label class="form-label">İndirim Yüzdesi (%)</label>
                            <input type="number" id="camp_discount_pct" class="form-input" min="1" max="99" placeholder="25">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bitiş Tarihi (Opsiyonel)</label>
                        <input type="datetime-local" id="camp_ends" class="form-input">
                    </div>
                    <button class="btn btn-primary btn-full" onclick="saveCampaign()">
                        <i class="fa-solid fa-fire"></i> Kampanyayı Oluştur
                    </button>
                </div>
            </div>
        </div>

        <!-- Discount Modal -->
        <div class="modal-backdrop" id="discountModal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-percent" style="color:var(--accent);"></i> İndirim Ayarla</div>
                    <button class="modal-close" onclick="closeModal('discountModal')">✕</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="discountProductId">
                    <div class="form-group">
                        <label class="form-label">İndirim Oranı (%)</label>
                        <input type="number" id="d_percent" class="form-input" min="0" max="100" value="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Süre (saat) [Boş = Sınırsız]</label>
                        <input type="number" id="d_hours" class="form-input" min="1" placeholder="Sınırsız">
                    </div>
                    <button class="btn btn-accent btn-full" onclick="saveDiscount()">
                        <i class="fa-solid fa-check"></i> İndirimi Uygula
                    </button>
                    <button class="btn btn-secondary btn-full" style="margin-top:12px;" onclick="removeDiscount()">
                        <i class="fa-solid fa-times"></i> İndirimi Kaldır
                    </button>
                </div>
            </div>
        </div>

        <!-- Dynamic Modal -->
        <div class="modal-backdrop" id="dynamicModal">
            <div class="modal-content" style="max-width: 650px;" id="dynContent"></div>
        </div>

        <!-- Code Redeem Modal -->
        <div class="modal-backdrop" id="codeModal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-key" style="color:var(--primary-light);"></i> Lisans Doğrulama</div>
                    <button class="modal-close" onclick="closeModal('codeModal')">✕</button>
                </div>
                <div class="modal-body text-center">
                    <input type="hidden" id="codeProductId">
                    <p style="color:var(--text-dim); margin-bottom:20px;">Satın aldığınız lisans kodunu girin</p>
                    <div class="form-group">
                        <input type="text" id="redeemCode" class="form-input code-display" 
                            placeholder="RIFT-XXXX-XXXX-XXXX-XXXX" 
                            style="text-transform:uppercase; font-size:16px;"
                            oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')">
                    </div>
                    <button class="btn btn-primary btn-full" onclick="redeemCodeAction()">
                        <i class="fa-solid fa-check-circle"></i> Doğrula & İndir
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Edit Product Modal -->
        <div class="modal-backdrop" id="editModal">
            <div class="modal-content" style="max-width: 850px;">
                <div class="modal-header">
                    <div class="modal-title" id="editModalTitle"><i class="fa-solid fa-box" style="color:var(--primary-light);"></i> Plugin Yönet</div>
                    <button class="modal-close" onclick="closeModal('editModal')">✕</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="p_id">
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-image"></i> Kapak Görseli</label>
                        <div class="image-upload-area" id="imageUploadArea" onclick="document.getElementById('p_image').click()">
                            <i class="fa-solid fa-cloud-upload-alt"></i>
                            <p>Görsel yüklemek için tıklayın</p>
                            <span>PNG, JPG (max 5MB)</span>
                        </div>
                        <input type="file" id="p_image" class="hidden" accept="image/png,image/jpeg,image/jpg" onchange="handleImageSelect(event)">
                        <div id="imagePreview" class="image-preview hidden"></div>
                    </div>
                    
                    <div class="grid" style="grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label class="form-label">Plugin Adı</label>
                            <input type="text" id="p_name" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Versiyon</label>
                            <input type="text" id="p_ver" class="form-input" placeholder="1.0.0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Açıklama</label>
                        <textarea id="p_desc" class="form-textarea" rows="3"></textarea>
                    </div>
                    
                    <div class="grid" style="grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label class="form-label">Fiyat ($) [0 = Ücretsiz]</label>
                            <input type="number" step="0.01" id="p_price" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kategori</label>
                            <select id="p_cat" class="form-select">
                                ${CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-paint-brush"></i> Kit Yapımcısı</label>
                        <select id="p_creator" class="form-select">
                            ${state.team.map(t => `<option value="${t.name}">${t.name} (${getRoleInfo(t.role).name})</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Özellikler (virgülle ayırın)</label>
                        <input type="text" id="p_features" class="form-input" placeholder="MySQL, PlaceholderAPI, GUI">
                    </div>
                    
                    <div class="form-group mt-4">
                        <label class="form-label"><i class="fa-solid fa-file-archive"></i> Plugin Dosyası (.jar)</label>
                        <input type="file" id="p_file" class="form-input" accept=".jar,.zip" onchange="handleFileSelect(event)">
                        <div id="fileInfo" style="margin-top:12px; font-size:13px; color:var(--text-dim);"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('editModal')">İptal</button>
                    <button class="btn btn-primary" onclick="saveProduct()">
                        <i class="fa-solid fa-save"></i> Kaydet
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== PARTICLES ====================

function initParticles() {
    const container = document.getElementById('particles');
    if(!container) return;
    
    container.innerHTML = '';
    for(let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if(navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
});

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function setView(v) { state.view = v; render(); window.scrollTo(0, 0); }

// ==================== PRODUCT MODAL ====================

async function openProductModal(id) {
    const p = state.products.find(x => x.id === id);
    if(!p) return;
    
    const catInfo = getCategoryInfo(p.cat);
    const creator = state.team.find(t => t.name === p.creator);
    const roleInfo = creator ? getRoleInfo(creator.role) : null;
    const effectiveDiscount = getEffectiveDiscount(p);
    const discountTimeLeft = getDiscountTimeLeft(p);
    const finalPrice = p.price * (1 - effectiveDiscount / 100);
    
    const reviewsHtml = p.reviews.length === 0 ? 
        '<div style="text-align:center; padding:30px; color:var(--text-dim);"><i class="fa-solid fa-comment-slash" style="font-size:32px; opacity:0.3; margin-bottom:12px;"></i><p>İlk yorumu sen bırak!</p></div>' :
        p.reviews.map(r => `
            <div style="background:var(--bg-card); padding:16px; border-radius:12px; border:1px solid var(--border); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <div style="color:var(--gold); font-size:13px;"><i class="fa-solid fa-star"></i> ${r.rating}</div>
                    <div style="color:var(--text-muted); font-size:11px;">${r.date}</div>
                </div>
                <p style="font-size:14px; color:var(--text); line-height:1.6;">"${r.text}"</p>
            </div>
        `).join('');

    const html = `
        <div class="modal-header">
            <div class="modal-title">${p.name} <span style="font-size:12px; color:var(--text-muted)">v${p.version}</span></div>
            <button class="modal-close" onclick="closeModal('dynamicModal')">✕</button>
        </div>
        <div class="modal-body" style="max-height:700px; overflow-y:auto;">
            <div class="creator-badge-large" style="margin-bottom:20px;">
                <i class="fa-solid fa-paint-brush"></i>
                <div>
                    <span class="creator-label">Kit Yapımcısı</span>
                    <span class="creator-name">${p.creator}</span>
                    ${roleInfo ? `<span class="role-badge" style="background:${roleInfo.color}20; color:${roleInfo.color}; margin-top:4px;">${roleInfo.name}</span>` : ''}
                </div>
            </div>
            
            <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
                <span style="background:${catInfo.color}20; color:${catInfo.color}; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600;">
                    <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.name}
                </span>
                <span style="background:rgba(251,191,36,0.15); color:var(--gold); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600;">
                    <i class="fa-solid fa-star"></i> ${getRating(p)}
                </span>
                <span style="background:rgba(6,182,212,0.15); color:var(--accent); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600;">
                    <i class="fa-solid fa-download"></i> ${p.downloads || 0}
                </span>
                <span style="background:rgba(16,185,129,0.15); color:var(--success); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600;">
                    <i class="fa-solid fa-shopping-cart"></i> ${p.salesCount || 0} satış
                </span>
            </div>
            
            ${effectiveDiscount > 0 ? `
                <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:12px 16px; border-radius:12px; margin-bottom:20px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i class="fa-solid fa-tag" style="color:var(--danger); font-size:24px;"></i>
                        <div>
                            <div style="color:var(--danger); font-weight:700;">%${effectiveDiscount} İNDİRİM</div>
                            ${discountTimeLeft ? `<div style="color:var(--text-muted); font-size:12px;">Kalan süre: ${discountTimeLeft}</div>` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <p style="color:var(--text-dim); margin-bottom:24px; line-height:1.7;">${p.desc}</p>
            
            <div style="margin-bottom:24px;">
                <h4 style="font-size:14px; color:var(--primary-light); margin-bottom:12px; text-transform:uppercase; letter-spacing:1px;">
                    <i class="fa-solid fa-list-check"></i> Özellikler
                </h4>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    ${p.features.map(f => `
                        <span style="background:var(--bg-card); border:1px solid var(--border); padding:8px 16px; border-radius:8px; font-size:13px; color:var(--text);">
                            <i class="fa-solid fa-check" style="color:var(--success); margin-right:6px;"></i>${f}
                        </span>
                    `).join('')}
                </div>
            </div>
            
            <div style="display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap;">
                ${p.price === 0 ? 
                    `<button class="btn btn-success flex-1" onclick="downloadFree('${p.id}')">
                        <i class="fa-solid fa-download"></i> Ücretsiz İndir
                    </button>` : `
                    <div style="flex:1;">
                        <div style="text-align:center; margin-bottom:12px;">
                            ${effectiveDiscount > 0 ? 
                                `<span style="text-decoration:line-through; color:var(--text-muted); margin-right:12px;">$${p.price}</span>` : ''
                            }
                            <span style="font-size:28px; font-weight:800; font-family:Orbitron; color:var(--primary-light);">$${finalPrice.toFixed(2)}</span>
                        </div>
                        <button class="btn btn-discord btn-full" onclick="window.open('${state.settings.discordLink}', '_blank')">
                            <i class="fa-brands fa-discord"></i> Discord'dan Satın Al
                        </button>
                    </div>
                    <button class="btn btn-primary" onclick="closeModal('dynamicModal'); document.getElementById('codeProductId').value='${p.id}'; document.getElementById('redeemCode').value=''; openModal('codeModal')">
                        <i class="fa-solid fa-key"></i> Kod ile İndir
                    </button>
                `}
            </div>
            
            <h3 style="font-size:14px; margin-bottom:16px; color:var(--primary-light); text-transform:uppercase; letter-spacing:1px;">
                <i class="fa-solid fa-comments"></i> Kullanıcı Yorumları
            </h3>
            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:16px; border:1px solid var(--border); margin-bottom:20px;">
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <select id="revStars" class="form-select" style="max-width:120px;">
                        <option value="5">⭐⭐⭐⭐⭐</option>
                        <option value="4">⭐⭐⭐⭐</option>
                        <option value="3">⭐⭐⭐</option>
                        <option value="2">⭐⭐</option>
                        <option value="1">⭐</option>
                    </select>
                    <input type="text" id="revText" class="form-input" style="flex:1" placeholder="Yorumunuzu yazın...">
                </div>
                <button class="btn btn-secondary btn-full btn-sm" onclick="submitReview('${p.id}', 'product')">
                    <i class="fa-solid fa-paper-plane"></i> Gönder
                </button>
            </div>
            ${reviewsHtml}
        </div>
    `;
    document.getElementById('dynContent').innerHTML = html;
    openModal('dynamicModal');
}

function openTeamModal(id) {
    const t = state.team.find(x => x.id === id);
    if(!t) return;
    
    const stats = getMemberStats(t.name);
    const roleInfo = getRoleInfo(t.role);

    const reviewsHtml = t.reviews.length === 0 ? 
        '<div style="text-align:center; padding:30px; color:var(--text-dim);"><i class="fa-solid fa-comment-slash" style="font-size:32px; opacity:0.3; margin-bottom:12px;"></i><p>İlk değerlendirmeyi sen yap!</p></div>' :
        t.reviews.map(r => `
            <div style="background:var(--bg-card); padding:16px; border-radius:12px; border:1px solid var(--border); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <div style="color:var(--gold); font-size:13px;"><i class="fa-solid fa-star"></i> ${r.rating}</div>
                    <div style="color:var(--text-muted); font-size:11px;">${r.date}</div>
                </div>
                <p style="font-size:14px; color:var(--text); line-height:1.6;">"${r.text}"</p>
            </div>
        `).join('');

    const html = `
        <div class="modal-header">
            <div class="modal-title">${t.name} <span style="font-size:12px; color:var(--primary-light)">(${roleInfo.name})</span></div>
            <button class="modal-close" onclick="closeModal('dynamicModal')">✕</button>
        </div>
        <div class="modal-body" style="max-height:600px; overflow-y:auto;">
            <div style="display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap;">
                <div style="background:var(--bg-card); border:1px solid var(--border); padding:16px 24px; border-radius:12px; text-align:center; flex:1;">
                    <div style="font-size:24px; font-weight:800; color:var(--primary-light); font-family:Orbitron;">${stats.productCount}</div>
                    <div style="font-size:12px; color:var(--text-muted);">Plugin</div>
                </div>
                <div style="background:var(--bg-card); border:1px solid var(--border); padding:16px 24px; border-radius:12px; text-align:center; flex:1;">
                    <div style="font-size:24px; font-weight:800; color:var(--success); font-family:Orbitron;">${stats.totalSales}</div>
                    <div style="font-size:12px; color:var(--text-muted);">Satış</div>
                </div>
                <div style="background:var(--bg-card); border:1px solid var(--border); padding:16px 24px; border-radius:12px; text-align:center; flex:1;">
                    <div style="font-size:24px; font-weight:800; color:var(--gold); font-family:Orbitron;">$${stats.totalEarnings.toFixed(0)}</div>
                    <div style="font-size:12px; color:var(--text-muted);">Kazanç</div>
                </div>
            </div>
            
            <p style="color:var(--text-dim); margin-bottom:24px;">Destek ve satış deneyiminiz hakkında geri bildirim bırakın.</p>
            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:16px; border:1px solid var(--border); margin-bottom:20px;">
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <select id="revStars" class="form-select" style="max-width:120px;">
                        <option value="5">⭐⭐⭐⭐⭐</option>
                        <option value="4">⭐⭐⭐⭐</option>
                        <option value="3">⭐⭐⭐</option>
                        <option value="2">⭐⭐</option>
                        <option value="1">⭐</option>
                    </select>
                    <input type="text" id="revText" class="form-input" style="flex:1" placeholder="Geri bildiriminiz...">
                </div>
                <button class="btn btn-secondary btn-full btn-sm" onclick="submitReview('${t.id}', 'team')">
                    <i class="fa-solid fa-paper-plane"></i> Gönder
                </button>
            </div>
            <h3 style="font-size:14px; margin-bottom:16px; color:var(--primary-light); text-transform:uppercase; letter-spacing:1px;">
                <i class="fa-solid fa-star"></i> Destek Puanları
            </h3>
            ${reviewsHtml}
        </div>
    `;
    document.getElementById('dynContent').innerHTML = html;
    openModal('dynamicModal');
}

function submitReview(id, type) {
    const stars = parseInt(document.getElementById('revStars').value);
    const text = document.getElementById('revText').value.trim();
    if(text.length < 3) { 
        showToast('Lütfen anlamlı bir yorum yazın.', 'error'); 
        return; 
    }

    const rev = { 
        id: uid(), 
        rating: stars, 
        text, 
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('tr-TR') 
    };
    
    if(type === 'product') {
        const p = state.products.find(x => x.id === id);
        p.reviews.unshift(rev);
        saveState();
        showToast('Yorumunuz eklendi!', 'success');
        openProductModal(id);
    } else {
        const t = state.team.find(x => x.id === id);
        t.reviews.unshift(rev);
        saveState();
        showToast('Değerlendirmeniz eklendi!', 'success');
        openTeamModal(id);
    }
}

function deleteReview(targetId, reviewId, type) {
    if(!confirm('Yorumu silmek istediğinize emin misiniz?')) return;
    if(type === 'product') {
        const p = state.products.find(x => x.id === targetId);
        p.reviews = p.reviews.filter(r => r.id !== reviewId);
    } else {
        const t = state.team.find(x => x.id === targetId);
        t.reviews = t.reviews.filter(r => r.id !== reviewId);
    }
    saveState();
    showToast('Yorum silindi.', 'success');
    render();
}


// ==================== DOWNLOAD ====================

function downloadFree(id) {
    window.open('/api/download-free/' + id, '_blank');
    const p = state.products.find(x => x.id === id);
    if(p) { p.downloads = (p.downloads||0)+1; if(state.view==='store') render(); }
    showToast('İndirme başladı!', 'success');
}

async function redeemCodeAction() {
    const id = document.getElementById('codeProductId').value;
    const code = document.getElementById('redeemCode').value.trim();
    if(!code) { showToast('Lütfen bir kod girin', 'error'); return; }
    const result = await redeemCode(id, code);
    if(result.success) {
        showToast('Kod doğrulandı! İndirme başlıyor...', 'success');
        closeModal('codeModal');
    } else {
        showToast(result.error || 'Geçersiz kod', 'error');
    }
}

function performDownload(p) {
    window.open('/api/download/' + p.id, '_blank');
    showToast(p.name + ' indiriliyor...', 'success');
}


async function generateCode(pid) {
    const result = await API.post('/api/admin/codes/generate', { productId: pid, count: 1 });
    if(result.success) {
        showToast('Yeni kod: ' + result.codes[0], 'success', 5000);
        state.products = await API.get('/api/admin/products');
        // reload codes display
        const allCodes = await API.get('/api/admin/codes');
        // store in product objects for UI
        state.products.forEach(p => { p.codes = allCodes[p.id] || []; });
        render();
    }
}

async function deleteCode(pid, code) {
    if(!confirm('Kodu silmek istediğinize emin misiniz?')) return;
    await API.del('/api/admin/codes/' + pid + '/' + encodeURIComponent(code));
    showToast('Kod silindi.', 'success');
    const allCodes = await API.get('/api/admin/codes');
    state.products.forEach(p => { p.codes = allCodes[p.id] || []; });
    render();
}

function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => showToast('Kod kopyalandı!', 'success'));
}

// ==================== DISCOUNT MODAL ====================

function openDiscountModal(productId) {
    const p = state.products.find(x => x.id === productId);
    if(!p) return;
    
    document.getElementById('discountProductId').value = productId;
    document.getElementById('d_percent').value = p.discount || 0;
    
    if(p.discountEnd) {
        const hoursLeft = Math.ceil((p.discountEnd - Date.now()) / (1000 * 60 * 60));
        document.getElementById('d_hours').value = hoursLeft > 0 ? hoursLeft : '';
    } else {
        document.getElementById('d_hours').value = '';
    }
    
    openModal('discountModal');
}

function saveDiscount() {
    const productId = document.getElementById('discountProductId').value;
    const percent = parseInt(document.getElementById('d_percent').value) || 0;
    const hours = document.getElementById('d_hours').value;
    const durationHours = hours ? parseInt(hours) : null;
    
    if(true) { const p = state.products.find(x=>x.id===productId); if(p){p.discount=percent;p.discountEnd=durationHours?Date.now()+durationHours*3600000:null;}
        showToast(`%${percent} indirim uygulandı!`, 'success');
        closeModal('discountModal');
        render();
    }
}

function removeDiscount() {
    const productId = document.getElementById('discountProductId').value;
    if(setProductDiscount(productId, 0, null)) {
        showToast('İndirim kaldırıldı!', 'success');
        closeModal('discountModal');
        render();
    }
}


// ==================== ADMIN ====================

async function openAccountModal() { 
    document.getElementById('aUser').value = ''; 
    document.getElementById('aPwd').value = ''; 
    document.getElementById('aBio').value = '';
    document.getElementById('aDiscord').value = '';
    document.getElementById('aWebsite').value = '';
    document.getElementById('aGithub').value = '';
    openModal('accountModal'); 
}

async function saveAccount() {
    const name = document.getElementById('aUser').value.trim();
    const bio = document.getElementById('aBio').value.trim();
    const role = document.getElementById('aRole').value;
    const discord = document.getElementById('aDiscord').value.trim();
    const website = document.getElementById('aWebsite').value.trim();
    const github = document.getElementById('aGithub').value.trim();
    if(!name) { showToast('İsim zorunlu', 'error'); return; }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('bio', bio);
    formData.append('discord', discord);
    formData.append('website', website);
    formData.append('github', github);
    
    const result = await API.upload('/api/admin/team', formData);
    if(result.success) {
        state.team = await API.get('/api/admin/team');
        showToast('Hesap oluşturuldu!', 'success');
        closeModal('accountModal');
        render();
    }
}

async function deleteAccount(id) {
    if(!confirm('Hesabı silmek istediğinize emin misiniz?')) return;
    await API.del('/api/admin/team/' + id);
    state.team = await API.get('/api/admin/team');
    showToast('Hesap silindi.', 'success');
    render();
}

function postAnnouncement() {
    const text = document.getElementById('annInput').value.trim();
    if(!text) return;
    state.announcements.unshift({ text, from: 'Admin', date: new Date().toLocaleDateString('tr-TR'), timestamp: Date.now() });
    render();
    showToast('Duyuru gönderildi!', 'success');
}

function resetDownloads() {
    if(!confirm('Tüm indirme sayıları sıfırlansın mı?')) return;
    state.products.forEach(p => p.downloads = 0);
    showToast('İstatistikler sıfırlandı.', 'success');
    render();
}


// ==================== PRODUCT MANAGEMENT ====================

let pendingFileData = null;
let pendingImageData = null;

function openEditModal(id) {
    pendingFileData = null;
    pendingImageData = null;
    document.getElementById('fileInfo').innerText = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imageUploadArea').style.display = 'block';
    
    const creatorSelect = document.getElementById('p_creator');
    creatorSelect.innerHTML = state.team.map(t => `<option value="${t.name}">${t.name} (${getRoleInfo(t.role).name})</option>`).join('');
    
    if(id) {
        const p = state.products.find(x => x.id === id);
        document.getElementById('p_id').value = p.id;
        document.getElementById('p_name').value = p.name;
        document.getElementById('p_ver').value = p.version;
        document.getElementById('p_desc').value = p.desc;
        document.getElementById('p_price').value = p.price;
        document.getElementById('p_cat').value = p.cat;
        document.getElementById('p_creator').value = p.creator;
        document.getElementById('p_features').value = p.features ? p.features.join(', ') : '';
        document.getElementById('editModalTitle').innerHTML = `<i class="fa-solid fa-edit" style="color:var(--primary-light);"></i> Düzenle: ${p.name}`;
    } else {
        document.getElementById('p_id').value = '';
        document.getElementById('p_name').value = '';
        document.getElementById('p_ver').value = '1.0.0';
        document.getElementById('p_desc').value = '';
        document.getElementById('p_price').value = 0;
        document.getElementById('p_cat').value = 'other';
        document.getElementById('p_creator').value = state.team.length > 0 ? state.team[0].name : '';
        document.getElementById('p_features').value = '';
        document.getElementById('editModalTitle').innerHTML = `<i class="fa-solid fa-plus" style="color:var(--primary-light);"></i> Yeni Plugin`;
    }
    openModal('editModal');
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if(!file || !file.type.startsWith('image/') || file.size > 5*1024*1024) { showToast('Geçersiz görsel', 'error'); return; }
    pendingImageData = file;
    const r = new FileReader();
    r.onload = ev => {
        document.getElementById('imageUploadArea').style.display = 'none';
        document.getElementById('imagePreview').innerHTML = `<img src="${ev.target.result}" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;"><button class="btn btn-danger btn-sm" style="position:absolute;top:10px;right:10px;" onclick="removeImage()"><i class="fa-solid fa-trash"></i></button>`;
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('imagePreview').style.position = 'relative';
    };
    r.readAsDataURL(file);
}

function removeImage() {
    pendingImageData = null;
    document.getElementById('p_image').value = '';
    document.getElementById('imageUploadArea').style.display = 'block';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imagePreview').classList.add('hidden');
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if(!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if(ext !== 'jar' && ext !== 'zip') { showToast('Sadece .jar/.zip', 'error'); return; }
    if(file.size > 50*1024*1024) { showToast('Max 50MB', 'error'); return; }
    pendingFileData = file;
    document.getElementById('fileInfo').innerHTML = `<i class="fa-solid fa-check-circle" style="color:var(--success);"></i> ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
}

async function saveProduct() {
    const id = document.getElementById('p_id').value;
    const name = document.getElementById('p_name').value.trim();
    if(!name) { showToast('Plugin adı zorunlu', 'error'); return; }
    
    const formData = new FormData();
    if(id) formData.append('id', id);
    formData.append('name', name);
    formData.append('version', document.getElementById('p_ver').value || '1.0.0');
    formData.append('desc', document.getElementById('p_desc').value);
    formData.append('price', document.getElementById('p_price').value || '0');
    formData.append('cat', document.getElementById('p_cat').value);
    formData.append('creator', document.getElementById('p_creator').value);
    formData.append('features', document.getElementById('p_features').value);
    
    if(pendingFileData) formData.append('pluginFile', pendingFileData);
    if(pendingImageData) formData.append('image', pendingImageData);
    
    const result = await API.upload('/api/admin/products', formData);
    if(result.success) {
        await checkAdmin();
        showToast('Plugin kaydedildi!', 'success');
        closeModal('editModal');
        render();
    } else {
        showToast('Hata: ' + (result.error || 'Bilinmeyen'), 'error');
    }
}

async function deleteProduct(id) {
    if(!confirm("Plugin'i sil?")) return;
    await API.del('/api/admin/products/' + id);
    await checkAdmin();
    showToast('Plugin silindi.', 'success');
    render();
}


// ==================== INIT ====================

async function start() {
    try {
        await loadData();
        await checkAdmin();
        
        if(state.isAdmin) {
            try {
                const allCodes = await API.get('/api/admin/codes');
                state.products.forEach(p => { p.codes = allCodes[p.id] || []; });
                state.logs = await API.get('/api/admin/logs');
                state.messages = await API.get('/api/admin/messages');
                state.campaigns = await API.get('/api/admin/campaigns');
            } catch(e) {}
        }
        
        render();
        initParticles();
    } catch(err) {
        document.getElementById('app').innerHTML = '<div style="padding:40px;color:#ef4444;font-family:monospace;"><h2>Start Error</h2><pre>' + err.message + '\n' + err.stack + '</pre></div>';
    }
}

window.onload = start;
