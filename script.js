/**
 * VERBUM — Script Principal
 * Assistente Teológico Reformado com Integração Webhook & Supabase
 */

// ==========================================================
// 1. CONFIGURAÇÕES E ESTADO
// ==========================================================

let AGENT_NAME = "Verbum";
const SUPABASE_URL = "https://vignahcbdtyucyqtcfdc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m18oM7zrxw6YVfhRbdQ3Nw_s3_-rtbm";
const WEBHOOK_URL = 'http://localhost:5678/webhook/teste';

let currentUser = null;
let currentConversation = null;
let conversationMessages = [];
let isProcessing = false;
let sb = null;

// Three.js State
let sphereScene, sphereCamera, sphereRenderer, sphereParticles, sphereMaterial;
let sphereAnimId = null;
let targetSphereState = { speed: 0.3, turbulence: 0.06, scale: 1.0, color: new THREE.Color('#7B9FD4') };
let currentSphereState = { speed: 0.3, turbulence: 0.06, scale: 1.0, color: new THREE.Color('#7B9FD4') };

const SPHERE_STATES = {
    idle: { speed: 0.3, turbulence: 0.06, scale: 1.0, color: '#7B9FD4' },
    thinking: { speed: 1.8, turbulence: 0.28, scale: 1.08, color: '#9B7FD4' },
    responding: { speed: 0.7, turbulence: 0.10, scale: 1.03, color: '#7BD4A8' },
    error: { speed: 2.2, turbulence: 0.18, scale: 0.96, color: '#D47B7B' }
};

// ==========================================================
// 2. UTILITÁRIOS
// ==========================================================

const $ = (id) => document.getElementById(id);

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================================
// 3. INICIALIZAÇÃO
// ==========================================================

function initSupabase() {
    try {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    } catch (e) {
        console.error('Erro Supabase:', e);
        return false;
    }
}

// ==========================================================
// 4. THREE.JS — ESFERA (Mantida Conforme Original)
// ==========================================================

const VERTEX_SHADER = `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uTurbulence;
    uniform float uScale;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x2_ = x_ * ns.x + ns.yyyy;
        vec4 y2_ = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x2_) - abs(y2_);
        vec4 b0 = vec4(x2_.xy, y2_.xy);
        vec4 b1 = vec4(x2_.zw, y2_.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    void main() {
        vNormal = normal;
        vec3 pos = position;
        float noise = snoise(pos * 1.5 + uTime * uSpeed * 0.4);
        pos += normal * noise * uTurbulence * 1.5;
        pos *= uScale;
        vPosition = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const FRAGMENT_SHADER = `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uSpeed;
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
        vec3 c1 = vec3(0.26, 0.52, 0.96);
        vec3 c2 = vec3(0.92, 0.26, 0.21);
        vec3 c3 = vec3(0.98, 0.74, 0.02);
        vec3 c4 = vec3(0.20, 0.66, 0.33);
        vec3 p = vPosition * 1.5;
        float t = uTime * uSpeed * 0.5;
        float m1 = sin(p.x + t) * cos(p.y - t) * 0.5 + 0.5;
        float m2 = sin(p.y + t * 1.2) * cos(p.z + t * 0.8) * 0.5 + 0.5;
        float m3 = sin(p.z - t * 0.9) * cos(p.x + t * 1.1) * 0.5 + 0.5;
        vec3 col = mix(c1, c2, m1);
        col = mix(col, c3, m2);
        col = mix(col, c4, m3);
        col = mix(col, uColor, 0.3);
        float fresnel = dot(normalize(cameraPosition - vPosition), normalize(vNormal));
        float alpha = smoothstep(0.0, 0.6, fresnel) * 0.85;
        gl_FragColor = vec4(col, alpha);
    }
`;

function createSphere(canvas) {
    if (!canvas) return;
    const container = canvas.parentElement;
    const w = container.clientWidth || 280, h = container.clientHeight || 280;
    sphereScene = new THREE.Scene();
    sphereCamera = new THREE.PerspectiveCamera(55, w/h, 0.1, 100);
    sphereCamera.position.z = 3.2;
    sphereRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    sphereRenderer.setSize(w, h);
    sphereRenderer.setClearColor(0x000000, 0);
    sphereMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#7B9FD4') }, uSpeed: { value: 0.3 }, uTurbulence: { value: 0.06 }, uScale: { value: 1.0 } },
        transparent: true, depthWrite: false
    });
    sphereParticles = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 64), sphereMaterial);
    sphereScene.add(sphereParticles);
    if (sphereAnimId) cancelAnimationFrame(sphereAnimId);
    animateSphere();
}

function animateSphere() {
    sphereAnimId = requestAnimationFrame(animateSphere);
    if (sphereMaterial) {
        sphereMaterial.uniforms.uTime.value = performance.now() * 0.001;
        const l = 0.04;
        currentSphereState.speed += (targetSphereState.speed - currentSphereState.speed) * l;
        currentSphereState.turbulence += (targetSphereState.turbulence - currentSphereState.turbulence) * l;
        currentSphereState.scale += (targetSphereState.scale - currentSphereState.scale) * l;
        currentSphereState.color.lerp(targetSphereState.color, l);
        sphereMaterial.uniforms.uSpeed.value = currentSphereState.speed;
        sphereMaterial.uniforms.uTurbulence.value = currentSphereState.turbulence;
        sphereMaterial.uniforms.uScale.value = currentSphereState.scale;
        sphereMaterial.uniforms.uColor.value = currentSphereState.color;
        sphereParticles.rotation.y += 0.0015 * currentSphereState.speed;
    }
    sphereRenderer.render(sphereScene, sphereCamera);
}

function setSphereState(s) {
    const st = SPHERE_STATES[s]; if (!st) return;
    targetSphereState = { speed: st.speed, turbulence: st.turbulence, scale: st.scale, color: new THREE.Color(st.color) };
}

function resizeSphere() {
    const w = $('sphere-wrap'); if (!w || !sphereRenderer) return;
    sphereCamera.aspect = w.clientWidth / w.clientHeight;
    sphereCamera.updateProjectionMatrix();
    sphereRenderer.setSize(w.clientWidth, w.clientHeight);
}

// ==========================================================
// 5. AUTENTICAÇÃO
// ==========================================================

async function handleAuth(type) {
    const name = $('auth-name').value.trim(), pass = $('auth-password').value;
    const btn = type === 'login' ? $('btn-login') : $('btn-register');
    if (!name || !pass) { showAuthError('Preencha os campos.'); return; }
    btn.disabled = true; btn.textContent = 'Aguarde...';
    try {
        let user;
        if (type === 'register') {
            const { data: ex } = await sb.from('users').select('id').eq('nome', name).maybeSingle();
            if (ex) throw new Error('Nome já existe.');
            const hash = await dcodeIO.bcrypt.hash(pass, 10);
            const { data, error } = await sb.from('users').insert({ nome: name, senha_hash: hash }).select().single();
            if (error) throw error; user = data;
        } else {
            const { data, error } = await sb.from('users').select('*').eq('nome', name).maybeSingle();
            if (error || !data) throw new Error('Usuário não encontrado.');
            const ok = await dcodeIO.bcrypt.compare(pass, data.senha_hash);
            if (!ok) throw new Error('Senha incorreta.'); user = data;
        }
        currentUser = { id: user.id, nome: user.nome };
        localStorage.setItem('verbum_user', JSON.stringify(currentUser));
        await initApp();
    } catch (e) { showAuthError(e.message); btn.disabled = false; btn.textContent = type === 'login' ? 'Entrar' : 'Criar Conta'; }
}

function showAuthError(m) { const e = $('auth-error'); e.textContent = m; setTimeout(() => e.textContent = '', 5000); }

// ==========================================================
// 6. UI & CHAT
// ==========================================================

function showScreen(s) {
    if (s === 'login') {
        $('login-screen').classList.remove('hidden'); $('app-screen').style.display = 'none';
        $('login-sphere-anchor').appendChild($('sphere-wrap'));
    } else {
        $('login-screen').classList.add('hidden'); $('app-screen').style.display = 'flex';
        $('app-sphere-anchor').appendChild($('sphere-wrap'));
        setTimeout(() => { $('app-screen').classList.add('visible'); resizeSphere(); }, 50);
    }
}

async function initApp() {
    showScreen('app');
    const { data } = await sb.from('conversations').select('*').eq('user_id', currentUser.id).order('criado_em', { ascending: false });
    renderConversations(data || []);
    startNewChat();
}

function startNewChat() {
    currentConversation = { id: 'temp', titulo: 'Nova Conversa' };
    conversationMessages = [];
    renderMessages();
    toggleSidebar(false);
}

function renderConversations(list) {
    const container = $('conversations-list'); container.innerHTML = '';
    if (list.length === 0) { container.innerHTML = '<div class="empty-list">Nenhuma conversa</div>'; return; }
    list.forEach(c => {
        const item = document.createElement('div');
        item.className = 'conv-item' + (currentConversation && currentConversation.id === c.id ? ' active' : '');
        item.innerHTML = `
            <div class="conv-item-icon">💬</div>
            <div class="conv-item-text">
                <div class="conv-item-title">${escapeHtml(c.titulo)}</div>
                <div class="conv-item-date">${formatDate(c.criado_em)}</div>
            </div>
            <button class="btn-delete-conv" title="Apagar conversa">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        
        // Clique no item seleciona a conversa
        item.onclick = (e) => {
            if (e.target.closest('.btn-delete-conv')) return;
            selectConversation(c);
        };

        // Clique no botão de apagar
        const delBtn = item.querySelector('.btn-delete-conv');
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteConversation(c.id);
        };

        container.appendChild(item);
    });
}

async function deleteConversation(id) {
    if (!confirm('Tem certeza que deseja apagar esta conversa?')) return;
    
    try {
        // As mensagens serão apagadas automaticamente se houver ON DELETE CASCADE no Supabase,
        // mas para garantir, vamos apagar manualmente caso não haja.
        await sb.from('messages').delete().eq('conversation_id', id);
        const { error } = await sb.from('conversations').delete().eq('id', id);
        
        if (error) throw error;

        if (currentConversation && currentConversation.id === id) {
            startNewChat();
        } else {
            const { data } = await sb.from('conversations').select('*').eq('user_id', currentUser.id).order('criado_em', { ascending: false });
            renderConversations(data || []);
        }
    } catch (e) {
        alert('Erro ao apagar conversa: ' + e.message);
    }
}

async function selectConversation(c) {
    if (isProcessing) return;
    currentConversation = c;
    const { data } = await sb.from('messages').select('*').eq('conversation_id', c.id).order('criado_em', { ascending: true });
    conversationMessages = data || [];
    renderMessages();
    toggleSidebar(false);
    // Refresh list
    const { data: list } = await sb.from('conversations').select('*').eq('user_id', currentUser.id).order('criado_em', { ascending: false });
    renderConversations(list || []);
}

function renderMessages() {
    const container = $('chat-messages'); container.innerHTML = '';
    if (conversationMessages.length === 0) {
        $('main-content').classList.add('empty-chat');
        container.innerHTML = '<div class="welcome-hint" id="welcome-hint"><strong>Sola Scriptura</strong><br>A Palavra é a luz para o nosso caminho. Faça uma pergunta teológica fundamentada nas Escrituras.</div>';
        $('app-sphere-anchor').appendChild($('sphere-wrap'));
    } else {
        $('main-content').classList.remove('empty-chat');
        conversationMessages.forEach(m => appendBubble(m.role, m.conteudo, false));
    }
    scrollToBottom();
}

function appendBubble(role, text, anim = true) {
    const h = $('welcome-hint'); if (h) h.remove();
    $('main-content').classList.remove('empty-chat');
    const wrap = document.createElement('div'); wrap.className = `message message-${role}`;
    const bubble = document.createElement('div'); bubble.className = 'message-bubble';
    bubble.innerHTML = role === 'assistant' ? `<div class="msg-content">${marked.parse(text)}</div>` : escapeHtml(text);
    
    const wrapper = document.createElement('div'); wrapper.className = 'message-content-wrapper';
    wrapper.innerHTML = `<div class="message-label ${role === 'assistant' ? 'agent-logo' : ''}">${role === 'user' ? 'Você' : AGENT_NAME}</div>`;
    wrapper.appendChild(bubble);

    if (role === 'assistant') {
        const av = document.createElement('div'); av.className = 'message-avatar';
        av.innerHTML = `<div class="message-avatar-fallback">${AGENT_NAME[0]}</div>`;
        wrap.appendChild(av);
        setTimeout(() => { const s = $('sphere-wrap'); if (s) { av.innerHTML = ''; av.appendChild(s); resizeSphere(); } }, 10);
    }
    wrap.appendChild(wrapper);
    $('chat-messages').appendChild(wrap);
    return bubble;
}

async function sendMessage() {
    const input = $('user-input'), query = input.value.trim();
    if (!query || isProcessing) return;

    isProcessing = true; input.value = ''; input.style.height = 'auto';
    appendBubble('user', query);
    conversationMessages.push({ role: 'user', conteudo: query });
    scrollToBottom();

    let bubble = null;
    try {
        // 1. Garantir que a conversa existe no Supabase
        if (currentConversation.id === 'temp') {
            const { data, error } = await sb.from('conversations').insert({ 
                user_id: currentUser.id, 
                titulo: query.substring(0, 50) 
            }).select().single();
            if (error) throw error; 
            currentConversation = data;
        }
        
        // 2. Salvar mensagem do usuário
        await sb.from('messages').insert({ 
            conversation_id: currentConversation.id, 
            role: 'user', 
            conteudo: query 
        });
        
        // 3. Estado da Esfera
        setSphereState('thinking');
        
        // 4. Balão de carregamento
        bubble = appendBubble('assistant', '...');
        bubble.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

        // 5. Chamar Webhook
        const webhookResp = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: query })
        });

        if (!webhookResp.ok) throw new Error(`Erro ${webhookResp.status}`);
        
        const responseText = await webhookResp.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { reply: responseText };
        }
        
        const reply = data.reply || data.output || data.message || responseText || "Sem resposta do agente.";

        // 6. Atualizar UI com a resposta
        setSphereState('responding');
        bubble.innerHTML = `<div class="msg-content">${marked.parse(reply)}</div>`;
        scrollToBottom();

        // 7. Salvar resposta no Supabase
        await sb.from('messages').insert({ 
            conversation_id: currentConversation.id, 
            role: 'assistant', 
            conteudo: reply 
        });
        
        conversationMessages.push({ role: 'assistant', conteudo: reply });

    } catch (e) {
        console.error(e);
        if (bubble) bubble.innerHTML = `<div style="color:var(--error)"><strong>Erro:</strong> ${e.message}</div>`;
        setSphereState('error');
    } finally {
        isProcessing = false; 
        setSphereState('idle');
        // Atualizar lista de conversas
        const { data } = await sb.from('conversations').select('*').eq('user_id', currentUser.id).order('criado_em', { ascending: false });
        renderConversations(data || []);
    }
}

function scrollToBottom() { const s = $('chat-section'); if (s) s.scrollTop = s.scrollHeight; }
function toggleSidebar(o) { $('sidebar').classList.toggle('open', o); $('sidebar-overlay').classList.toggle('visible', o); }

// ==========================================================
// 7. MAIN
// ==========================================================

async function init() {
    $('btn-login').disabled = false; $('btn-register').disabled = false;
    
    $('btn-login').onclick = () => handleAuth('login');
    $('btn-register').onclick = () => handleAuth('register');
    $('auth-password').onkeydown = (e) => { if (e.key === 'Enter') handleAuth('login'); };
    $('menu-btn').onclick = () => toggleSidebar(true);
    $('close-sidebar-btn').onclick = () => toggleSidebar(false);
    $('sidebar-overlay').onclick = () => toggleSidebar(false);
    $('new-conv-btn').onclick = () => startNewChat();
    $('logout-btn').onclick = () => { localStorage.removeItem('verbum_user'); location.reload(); };
    $('send-btn').onclick = sendMessage;
    $('user-input').oninput = function() { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 150) + 'px'; };
    $('user-input').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    window.onresize = resizeSphere;

    createSphere($('sphere-canvas'));
    
    if (initSupabase()) {
        const saved = localStorage.getItem('verbum_user');
        if (saved) {
            currentUser = JSON.parse(saved);
            const { data } = await sb.from('users').select('id, nome').eq('id', currentUser.id).maybeSingle();
            if (data) { currentUser = data; await initApp(); return; }
        }
    }
    showScreen('login');
}

init();
