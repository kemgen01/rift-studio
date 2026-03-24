const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

app.set('trust proxy', 'loopback');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

[DATA_DIR, UPLOADS_DIR, path.join(UPLOADS_DIR, 'files'), path.join(UPLOADS_DIR, 'images'), PUBLIC_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = file.fieldname === 'image' ? path.join(UPLOADS_DIR, 'images') : path.join(UPLOADS_DIR, 'files');
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = crypto.randomBytes(12).toString('hex') + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'image') {
            if (!file.mimetype.startsWith('image/')) return cb(new Error('Sadece görsel dosyaları'));
        } else if (file.fieldname === 'pluginFile') {
            const ext = path.extname(file.originalname).toLowerCase();
            if (ext !== '.jar' && ext !== '.zip') return cb(new Error('Sadece .jar/.zip'));
        }
        cb(null, true);
    }
});

function loadJSON(filename, fallback) {
    const fp = path.join(DATA_DIR, filename);
    try {
        if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {}
    return fallback;
}

function saveJSON(filename, data) {
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

let products = loadJSON('products.json', []);
let team = loadJSON('team.json', []);
let codes = loadJSON('codes.json', {});
let logs = loadJSON('logs.json', []);
let messages = loadJSON('messages.json', []);
let campaigns = loadJSON('campaigns.json', []);
let settings = loadJSON('settings.json', {
    siteName: 'Rift Studio',
    discordLink: 'https://discord.gg/52cZJv4c',
    announcement: ''
});

function addLog(action, detail, ip) {
    logs.unshift({
        action,
        detail,
        ip: ip || 'system',
        time: new Date().toLocaleString('tr-TR'),
        timestamp: Date.now()
    });
    if (logs.length > 500) logs = logs.slice(0, 500);
    saveJSON('logs.json', logs);
}

function uid() {
    return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

const ALLOWED_IPS = loadJSON('whitelist.json', ['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function saveWhitelist() {
    saveJSON('whitelist.json', ALLOWED_IPS);
}

function getRealIP(req) {
    const raw = req.socket.remoteAddress || '';
    const cleaned = raw.replace(/^::ffff:/, '');
    return cleaned;
}

function ipGuard(req, res, next) {
    const ip = getRealIP(req);
    const normalizedAllowed = ALLOWED_IPS.map(a => a.replace(/^::ffff:/, ''));

    if (normalizedAllowed.includes(ip) || normalizedAllowed.includes('::ffff:' + ip)) {
        return next();
    }

    addLog('BLOCKED', `IP ${ip} admin erişim denemesi: ${req.method} ${req.path}`, ip);

    if (Math.random() < 0.5) {
        return res.status(404).json({ error: 'Not Found' });
    }
    return res.status(403).json({ error: 'Forbidden' });
}

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/debug/myip', (req, res) => {
    const raw = req.socket.remoteAddress || '';
    res.json({ 
        raw: raw,
        cleaned: raw.replace(/^::ffff:/, ''),
        whitelisted: ALLOWED_IPS,
        match: ALLOWED_IPS.map(a => a.replace(/^::ffff:/, '')).includes(raw.replace(/^::ffff:/, ''))
    });
});

app.post('/api/contact', (req, res) => {
    const { name, discord, server, email, service, budget, message } = req.body;
    if (!name || !discord || !service || !message) {
        return res.status(400).json({ error: 'Zorunlu alanları doldurun' });
    }

    const serviceLabels = {
        plugin_hazir: 'Hazır Plugin Satın Alma',
        plugin_ozel: 'Özel Plugin Geliştirme',
        plugin_paket: 'Özel Plugin Paketi',
        plugin_fix: 'Plugin Düzenleme / Bug Fix',
        web_tasarim: 'Web Sitesi Tasarımı',
        logo_tasarim: 'Logo / Grafik Tasarım',
        sunucu_kurulum: 'Sunucu Kurulumu',
        sunucu_konfig: 'Sunucu Konfigürasyonu',
        danismanlik: 'Danışmanlık',
        isbirligi: 'İş Birliği Teklifi',
        diger: 'Diğer'
    };

    const msg = {
        id: uid(),
        name,
        discord,
        server: server || '',
        email: email || '',
        service: serviceLabels[service] || service,
        serviceKey: service,
        budget: budget || 'Belirtilmedi',
        message,
        ip: getRealIP(req),
        status: 'new',
        notes: '',
        date: new Date().toLocaleString('tr-TR'),
        timestamp: Date.now()
    };

    messages.unshift(msg);
    if (messages.length > 500) messages = messages.slice(0, 500);
    saveJSON('messages.json', messages);

    addLog('CONTACT', `Yeni mesaj: ${name} (${serviceLabels[service] || service})`, getRealIP(req));
    res.json({ success: true });
});

app.get('/api/plugins', (req, res) => {
    const pub = products
        .filter(p => p.status !== 'draft')
        .map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            desc: p.desc,
            price: p.price,
            discount: p.discount || 0,
            discountEnd: p.discountEnd || null,
            cat: p.cat,
            features: p.features || [],
            downloads: p.downloads || 0,
            salesCount: p.salesCount || 0,
            creator: p.creator || '',
            image: p.imagePath ? '/uploads/images/' + path.basename(p.imagePath) : null,
            hasFile: !!p.filePath,
            reviews: p.reviews || [],
            createdAt: p.createdAt
        }));
    res.json(pub);
});

app.get('/api/team', (req, res) => {
    const pub = team.map(t => ({
        id: t.id,
        name: t.name,
        role: t.role,
        bio: t.bio,
        avatar: t.avatarPath ? '/uploads/images/' + path.basename(t.avatarPath) : null,
        discord: t.discord || '',
        website: t.website || '',
        github: t.github || '',
        productCount: products.filter(p => p.creator === t.name).length,
        salesCount: t.salesCount || 0
    }));
    res.json(pub);
});

app.get('/api/campaigns', (req, res) => {
    const now = Date.now();
    const active = campaigns.filter(c => c.active && (!c.endsAt || c.endsAt > now)).map(c => ({
        id: c.id, title: c.title, description: c.description, type: c.type,
        mainProductId: c.mainProductId, bundleProductIds: c.bundleProductIds,
        giftProductId: c.giftProductId, bundlePrice: c.bundlePrice,
        discountPercent: c.discountPercent, endsAt: c.endsAt, active: c.active
    }));
    res.json(active);
});

app.get('/api/settings', (req, res) => {
    res.json({
        siteName: settings.siteName,
        discordLink: settings.discordLink,
        announcement: settings.announcement || ''
    });
});

app.post('/api/redeem', (req, res) => {
    const { productId, code } = req.body;
    if (!productId || !code) return res.status(400).json({ error: 'Eksik bilgi' });

    const upperCode = code.trim().toUpperCase();
    const product = products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const productCodes = codes[productId] || [];
    const codeIndex = productCodes.indexOf(upperCode);

    if (codeIndex === -1) {
        addLog('CODE_FAIL', `Geçersiz kod denemesi: ${upperCode} (${product.name})`, getRealIP(req));
        return res.status(400).json({ error: 'Geçersiz veya kullanılmış kod' });
    }

    productCodes.splice(codeIndex, 1);
    codes[productId] = productCodes;
    saveJSON('codes.json', codes);

    product.downloads = (product.downloads || 0) + 1;
    product.salesCount = (product.salesCount || 0) + 1;
    saveJSON('products.json', products);

    addLog('CODE_REDEEM', `Kod kullanıldı: ${upperCode} (${product.name})`, getRealIP(req));

    if (product.filePath && fs.existsSync(product.filePath)) {
        return res.json({
            success: true,
            downloadUrl: '/api/download/' + product.id + '?token=' + crypto.randomBytes(16).toString('hex')
        });
    }

    res.json({ success: true, message: 'Kod onaylandı. Dosya Discord üzerinden teslim edilecek.' });
});

const downloadTokens = new Map();

app.get('/api/download/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Bulunamadı' });

    if (product.price > 0) {
        const token = req.query.token;
        if (!token) return res.status(403).json({ error: 'Token gerekli' });
    }

    if (!product.filePath || !fs.existsSync(product.filePath)) {
        return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    product.downloads = (product.downloads || 0) + 1;
    saveJSON('products.json', products);

    const filename = product.name.replace(/[^a-zA-Z0-9_-]/g, '') + '-' + product.version + path.extname(product.filePath);
    res.download(product.filePath, filename);
});

app.get('/api/download-free/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product || product.price > 0) return res.status(404).json({ error: 'Bulunamadı' });

    if (!product.filePath || !fs.existsSync(product.filePath)) {
        return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    product.downloads = (product.downloads || 0) + 1;
    saveJSON('products.json', products);

    const filename = product.name.replace(/[^a-zA-Z0-9_-]/g, '') + '-' + product.version + path.extname(product.filePath);
    res.download(product.filePath, filename);
});

app.post('/api/review', (req, res) => {
    const { productId, name, rating, comment } = req.body;
    if (!productId || !name || !rating) return res.status(400).json({ error: 'Eksik bilgi' });

    const product = products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

    if (!product.reviews) product.reviews = [];
    product.reviews.push({
        name,
        rating: Math.min(5, Math.max(1, parseInt(rating))),
        comment: (comment || '').slice(0, 500),
        date: new Date().toLocaleDateString('tr-TR')
    });

    saveJSON('products.json', products);
    res.json({ success: true });
});

app.use('/api/admin', ipGuard);

app.get('/api/admin/ping', (req, res) => {
    res.json({ ok: true, ip: getRealIP(req), time: new Date().toISOString() });
});

app.get('/api/admin/products', (req, res) => {
    res.json(products);
});

app.post('/api/admin/products', upload.fields([
    { name: 'pluginFile', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), (req, res) => {
    const body = req.body;
    const id = body.id || ('rift-' + uid());
    const existing = products.find(p => p.id === body.id);

    const product = existing || {
        id,
        downloads: 0,
        salesCount: 0,
        reviews: [],
        createdAt: Date.now()
    };

    product.name = body.name || product.name || 'Unnamed';
    product.version = body.version || product.version || '1.0.0';
    product.desc = body.desc || product.desc || '';
    product.price = parseFloat(body.price) || 0;
    product.discount = parseInt(body.discount) || 0;
    product.discountEnd = body.discountEnd ? parseInt(body.discountEnd) : null;
    product.cat = body.cat || product.cat || 'other';
    product.creator = body.creator || product.creator || '';
    product.features = body.features ? (typeof body.features === 'string' ? body.features.split(',').map(f => f.trim()).filter(f => f) : body.features) : (product.features || []);
    product.status = body.status || 'active';

    if (req.files && req.files.pluginFile) {
        if (product.filePath && fs.existsSync(product.filePath)) {
            try { fs.unlinkSync(product.filePath); } catch (e) {}
        }
        product.filePath = req.files.pluginFile[0].path;
        product.fileName = req.files.pluginFile[0].originalname;
    }

    if (req.files && req.files.image) {
        if (product.imagePath && fs.existsSync(product.imagePath)) {
            try { fs.unlinkSync(product.imagePath); } catch (e) {}
        }
        product.imagePath = req.files.image[0].path;
    }

    if (!existing) products.push(product);
    saveJSON('products.json', products);

    addLog('PRODUCT_SAVE', `${existing ? 'Düzenlendi' : 'Eklendi'}: ${product.name}`, getRealIP(req));
    res.json({ success: true, product });
});

app.delete('/api/admin/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Bulunamadı' });

    if (product.filePath && fs.existsSync(product.filePath)) {
        try { fs.unlinkSync(product.filePath); } catch (e) {}
    }
    if (product.imagePath && fs.existsSync(product.imagePath)) {
        try { fs.unlinkSync(product.imagePath); } catch (e) {}
    }

    products = products.filter(p => p.id !== req.params.id);
    delete codes[req.params.id];
    saveJSON('products.json', products);
    saveJSON('codes.json', codes);

    addLog('PRODUCT_DELETE', `Silindi: ${product.name}`, getRealIP(req));
    res.json({ success: true });
});

app.get('/api/admin/team', (req, res) => {
    res.json(team);
});

app.post('/api/admin/team', upload.fields([{ name: 'avatar', maxCount: 1 }]), (req, res) => {
    const body = req.body;
    const id = body.id || ('user-' + uid());
    const existing = team.find(t => t.id === body.id);

    const member = existing || {
        id,
        salesCount: 0,
        createdAt: Date.now()
    };

    member.name = body.name || member.name || '';
    member.role = body.role || member.role || 'gelistirici';
    member.bio = body.bio || member.bio || '';
    member.discord = body.discord || member.discord || '';
    member.website = body.website || member.website || '';
    member.github = body.github || member.github || '';

    if (req.files && req.files.avatar) {
        if (member.avatarPath && fs.existsSync(member.avatarPath)) {
            try { fs.unlinkSync(member.avatarPath); } catch (e) {}
        }
        member.avatarPath = req.files.avatar[0].path;
    }

    if (!existing) team.push(member);
    saveJSON('team.json', team);

    addLog('TEAM_SAVE', `${existing ? 'Düzenlendi' : 'Eklendi'}: ${member.name}`, getRealIP(req));
    res.json({ success: true, member });
});

app.delete('/api/admin/team/:id', (req, res) => {
    const member = team.find(t => t.id === req.params.id);
    if (!member) return res.status(404).json({ error: 'Bulunamadı' });

    team = team.filter(t => t.id !== req.params.id);
    saveJSON('team.json', team);

    addLog('TEAM_DELETE', `Silindi: ${member.name}`, getRealIP(req));
    res.json({ success: true });
});

app.get('/api/admin/codes', (req, res) => {
    res.json(codes);
});

app.post('/api/admin/codes/generate', (req, res) => {
    const { productId, count } = req.body;
    const product = products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const generated = [];
    const num = Math.min(parseInt(count) || 1, 50);

    for (let n = 0; n < num; n++) {
        let code = 'RIFT';
        for (let i = 0; i < 4; i++) {
            code += '-';
            for (let j = 0; j < 4; j++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        if (!codes[productId]) codes[productId] = [];
        codes[productId].push(code);
        generated.push(code);
    }

    saveJSON('codes.json', codes);
    addLog('CODE_GEN', `${num} kod oluşturuldu: ${product.name}`, getRealIP(req));
    res.json({ success: true, codes: generated });
});

app.delete('/api/admin/codes/:productId/:code', (req, res) => {
    const { productId, code } = req.params;
    if (!codes[productId]) return res.status(404).json({ error: 'Bulunamadı' });

    codes[productId] = codes[productId].filter(c => c !== code);
    saveJSON('codes.json', codes);

    addLog('CODE_DELETE', `Kod silindi: ${code}`, getRealIP(req));
    res.json({ success: true });
});

app.get('/api/admin/logs', (req, res) => {
    res.json(logs);
});

app.get('/api/admin/messages', (req, res) => {
    res.json(messages);
});

app.put('/api/admin/messages/:id', (req, res) => {
    const msg = messages.find(m => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Bulunamadı' });
    if (req.body.status) msg.status = req.body.status;
    if (req.body.notes !== undefined) msg.notes = req.body.notes;
    if (req.body.reply) {
        if (!msg.replies) msg.replies = [];
        msg.replies.push({
            text: req.body.reply.text,
            from: req.body.reply.from || 'admin',
            author: req.body.reply.author || 'Admin',
            date: new Date().toLocaleString('tr-TR'),
            timestamp: Date.now()
        });
        msg.status = 'replied';
    }
    saveJSON('messages.json', messages);
    addLog('MESSAGE_UPDATE', `Mesaj güncellendi: ${msg.name}`, getRealIP(req));
    res.json({ success: true });
});

app.delete('/api/admin/messages/:id', (req, res) => {
    const msg = messages.find(m => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Bulunamadı' });
    messages = messages.filter(m => m.id !== req.params.id);
    saveJSON('messages.json', messages);
    addLog('MESSAGE_DELETE', `Mesaj silindi: ${msg.name}`, getRealIP(req));
    res.json({ success: true });
});

app.get('/api/admin/settings', (req, res) => {
    res.json(settings);
});

app.put('/api/admin/settings', (req, res) => {
    Object.assign(settings, req.body);
    saveJSON('settings.json', settings);

    addLog('SETTINGS', 'Ayarlar güncellendi', getRealIP(req));
    res.json({ success: true });
});

app.get('/api/admin/whitelist', (req, res) => {
    res.json({ ips: ALLOWED_IPS, currentIP: getRealIP(req) });
});

app.post('/api/admin/whitelist', (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP gerekli' });

    if (!ALLOWED_IPS.includes(ip)) {
        ALLOWED_IPS.push(ip);
        saveWhitelist();
        addLog('WHITELIST_ADD', `IP eklendi: ${ip}`, getRealIP(req));
    }
    res.json({ success: true, ips: ALLOWED_IPS });
});

app.delete('/api/admin/whitelist/:ip', (req, res) => {
    const ip = decodeURIComponent(req.params.ip);
    const idx = ALLOWED_IPS.indexOf(ip);
    if (idx === -1) return res.status(404).json({ error: 'IP bulunamadı' });

    if (ALLOWED_IPS.length <= 1) return res.status(400).json({ error: 'Son IP silinemez' });

    ALLOWED_IPS.splice(idx, 1);
    saveWhitelist();
    addLog('WHITELIST_REMOVE', `IP silindi: ${ip}`, getRealIP(req));
    res.json({ success: true, ips: ALLOWED_IPS });
});

app.get('/api/admin/campaigns', (req, res) => {
    res.json(campaigns);
});

app.post('/api/admin/campaigns', (req, res) => {
    const body = req.body;
    if (!body.title) return res.status(400).json({ error: 'Başlık zorunlu' });
    
    const campaign = {
        id: uid(),
        title: body.title,
        description: body.description || '',
        type: body.type || 'bundle',
        mainProductId: body.mainProductId || null,
        bundleProductIds: body.bundleProductIds || [],
        giftProductId: body.giftProductId || null,
        bundlePrice: parseFloat(body.bundlePrice) || 0,
        discountPercent: parseInt(body.discountPercent) || 0,
        endsAt: body.endsAt ? parseInt(body.endsAt) : null,
        active: body.active !== false,
        createdAt: Date.now()
    };
    
    campaigns.push(campaign);
    saveJSON('campaigns.json', campaigns);
    addLog('CAMPAIGN_CREATE', `Kampanya oluşturuldu: ${campaign.title}`, getRealIP(req));
    res.json({ success: true, campaign });
});

app.put('/api/admin/campaigns/:id', (req, res) => {
    const camp = campaigns.find(c => c.id === req.params.id);
    if (!camp) return res.status(404).json({ error: 'Bulunamadı' });
    if (req.body.active !== undefined) camp.active = req.body.active;
    if (req.body.title) camp.title = req.body.title;
    if (req.body.endsAt !== undefined) camp.endsAt = req.body.endsAt;
    saveJSON('campaigns.json', campaigns);
    addLog('CAMPAIGN_UPDATE', `Kampanya güncellendi: ${camp.title}`, getRealIP(req));
    res.json({ success: true });
});

app.delete('/api/admin/campaigns/:id', (req, res) => {
    const camp = campaigns.find(c => c.id === req.params.id);
    if (!camp) return res.status(404).json({ error: 'Bulunamadı' });
    campaigns = campaigns.filter(c => c.id !== req.params.id);
    saveJSON('campaigns.json', campaigns);
    addLog('CAMPAIGN_DELETE', `Kampanya silindi: ${camp.title}`, getRealIP(req));
    res.json({ success: true });
});

app.post('/api/admin/campaigns/:id/codes', (req, res) => {
    const camp = campaigns.find(c => c.id === req.params.id);
    if (!camp) return res.status(404).json({ error: 'Bulunamadı' });
    
    if (!camp.codes) camp.codes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const generated = [];
    const num = Math.min(parseInt(req.body.count) || 1, 50);
    
    for (let n = 0; n < num; n++) {
        let code = 'CAMP';
        for (let i = 0; i < 3; i++) {
            code += '-';
            for (let j = 0; j < 4; j++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        camp.codes.push(code);
        generated.push(code);
    }
    
    saveJSON('campaigns.json', campaigns);
    addLog('CAMPAIGN_CODE_GEN', `${num} kampanya kodu: ${camp.title}`, getRealIP(req));
    res.json({ success: true, codes: generated });
});

app.delete('/api/admin/campaigns/:id/codes/:code', (req, res) => {
    const camp = campaigns.find(c => c.id === req.params.id);
    if (!camp || !camp.codes) return res.status(404).json({ error: 'Bulunamadı' });
    
    const code = decodeURIComponent(req.params.code);
    camp.codes = camp.codes.filter(c => c !== code);
    saveJSON('campaigns.json', campaigns);
    addLog('CAMPAIGN_CODE_DELETE', `Kampanya kodu silindi: ${code}`, getRealIP(req));
    res.json({ success: true });
});

app.post('/api/campaign-redeem', (req, res) => {
    const { campaignId, code } = req.body;
    if (!campaignId || !code) return res.status(400).json({ error: 'Eksik bilgi' });
    
    const upperCode = code.trim().toUpperCase();
    const camp = campaigns.find(c => c.id === campaignId);
    if (!camp) return res.status(404).json({ error: 'Kampanya bulunamadı' });
    
    if (!camp.active) return res.status(400).json({ error: 'Kampanya aktif değil' });
    if (camp.endsAt && camp.endsAt < Date.now()) return res.status(400).json({ error: 'Kampanya süresi dolmuş' });
    
    if (!camp.codes) camp.codes = [];
    const codeIdx = camp.codes.indexOf(upperCode);
    if (codeIdx === -1) {
        addLog('CAMPAIGN_CODE_FAIL', `Geçersiz kampanya kodu: ${upperCode} (${camp.title})`, getRealIP(req));
        return res.status(400).json({ error: 'Geçersiz veya kullanılmış kod' });
    }
    
    camp.codes.splice(codeIdx, 1);
    if (!camp.redeemedCodes) camp.redeemedCodes = [];
    camp.redeemedCodes.push({ code: upperCode, ip: getRealIP(req), date: new Date().toLocaleString('tr-TR'), timestamp: Date.now() });
    saveJSON('campaigns.json', campaigns);
    
    const downloadUrls = [];
    const allProductIds = [camp.mainProductId, ...(camp.bundleProductIds || []), camp.giftProductId].filter(Boolean);
    const uniqueIds = [...new Set(allProductIds)];
    
    uniqueIds.forEach(pid => {
        const p = products.find(x => x.id === pid);
        if (p) {
            p.downloads = (p.downloads || 0) + 1;
            if (p.filePath && fs.existsSync(p.filePath)) {
                downloadUrls.push('/api/download/' + p.id + '?token=' + crypto.randomBytes(16).toString('hex'));
            }
        }
    });
    saveJSON('products.json', products);
    
    addLog('CAMPAIGN_REDEEM', `Kampanya kodu kullanıldı: ${upperCode} (${camp.title}) — ${uniqueIds.length} plugin`, getRealIP(req));
    
    res.json({
        success: true,
        message: downloadUrls.length > 0 ? uniqueIds.length + ' plugin indiriliyor!' : 'Kod onaylandı. Dosyalar Discord üzerinden teslim edilecek.',
        downloadUrls
    });
});

app.get('/api/admin/stats', (req, res) => {
    const totalDownloads = products.reduce((s, p) => s + (p.downloads || 0), 0);
    const totalSales = products.reduce((s, p) => s + (p.salesCount || 0), 0);
    const totalCodes = Object.values(codes).reduce((s, arr) => s + arr.length, 0);
    const premiumCount = products.filter(p => p.price > 0).length;
    const freeCount = products.filter(p => p.price === 0).length;

    res.json({
        totalProducts: products.length,
        premiumCount,
        freeCount,
        totalDownloads,
        totalSales,
        totalCodes,
        teamCount: team.length,
        logCount: logs.length
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Dosya yükleme hatası: ' + err.message });
    }
    res.status(500).json({ error: 'Sunucu hatası' });
});

app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║   RIFT STUDIO — Backend v1.0.0       ║`);
    console.log(`  ║   Port: ${PORT}                          ║`);
    console.log(`  ║   Admin: IP Whitelist korumalı        ║`);
    console.log(`  ║   Whitelist: ${ALLOWED_IPS.join(', ').slice(0, 20)}...  ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
});
