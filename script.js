let leadsProcesados = [];
const SERVER_URL = "http://localhost:3000/api/buscar-leads-premium";

window.addEventListener("DOMContentLoaded", () => {
    const savedKey = localStorage.getItem("gemini_api_key");
    const inputKey = document.getElementById("apiKey");
    
    if (savedKey) {
        if (inputKey) inputKey.value = savedKey;
        actualizarEstado("✅ API Key de Gemini configurada.");
    } else {
        actualizarEstado("⚠️ Ingresa tu API Key de Gemini para activar la IA.");
    }
});

function guardarApiKey() {
    const inputKey = document.getElementById("apiKey");
    const key = inputKey ? inputKey.value.trim() : "";
    
    if (!key) {
        alert("Ingresa una API Key válida.");
        return;
    }
    
    localStorage.setItem("gemini_api_key", key);
    alert("API Key guardada correctamente.");
    actualizarEstado("✅ API Key de Gemini configurada.");
}

function obtenerApiKey() {
    const inputKey = document.getElementById("apiKey");
    return (inputKey && inputKey.value.trim()) || localStorage.getItem("gemini_api_key") || "";
}

function actualizarEstado(mensaje) {
    const statusBox = document.getElementById("status");
    const statusBadge = document.getElementById("statusBadge");
    if (statusBox) statusBox.innerText = mensaje;
    if (statusBadge) {
        statusBadge.innerText = mensaje.includes("✅") ? "🟢 IA & Rastreador Listo" : "🔴 Esperando Configuración";
    }
}

async function generarLeads() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const soloSinWeb = document.getElementById("filtroSinWeb").checked;
    const apiKey = obtenerApiKey();
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Ingresa la ciudad y el giro comercial.");
        return;
    }

    if (!apiKey) {
        alert("Ingresa tu API Key de Gemini antes de rastrear.");
        return;
    }

    actualizarEstado(`🕷️ Escaneando la web y redes sociales en ${ciudad}...`);
    contenedor.innerHTML = "<p class='empty-state'>⏳ Extrayendo números de WhatsApp, perfiles sociales y sitios web...</p>";

    try {
        const response = await fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ciudad: ciudad,
                categoria: categoria,
                geminiApiKey: apiKey
            })
        });

        const data = await response.json();

        if (!data.leads || data.leads.length === 0) {
            actualizarEstado("❌ No se encontraron prospectos.");
            contenedor.innerHTML = "<p class='empty-state'>Sin resultados. Intenta con otra ubicación o sector.</p>";
            document.getElementById("contadorLeads").innerText = "0";
            return;
        }

        leadsProcesados = soloSinWeb ? data.leads.filter(l => !l.tieneWeb) : data.leads;

        actualizarEstado(`✅ Búsqueda finalizada: ${leadsProcesados.length} prospectos Premium procesados.`);
        document.getElementById("contadorLeads").innerText = leadsProcesados.length;
        renderizarTarjetas();

    } catch (error) {
        console.error("Error al rastrear datos:", error);
        actualizarEstado("⚠️ Error al conectar con el servidor local. Asegúrate de ejecutar server.js.");
        contenedor.innerHTML = "<p class='empty-state'>Error de conexión con el backend de rastreo.</p>";
    }
}

function renderizarTarjetas() {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    leadsProcesados.forEach((lead, index) => {
        const card = document.createElement("div");
        card.className = `tarjeta-lead ${!lead.tieneWeb ? 'premium' : ''}`;
        
        card.innerHTML = `
            <div>
                <span class="tag-premium">${!lead.tieneWeb ? '🔥 PROSPECTO PREMIUM (SIN WEB)' : 'CON SITIO WEB'}</span>
                <h3>${lead.nombre}</h3>
                <p><strong>📍 Ubicación:</strong> ${lead.direccion}</p>
                <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
                <p><strong>🌐 Sitio Web:</strong> ${lead.websiteUrl}</p>
                <p><strong>💬 WhatsApp Directo:</strong> ${lead.whatsappUrl ? `<a href="${lead.whatsappUrl}" target="_blank" style="color:#10b981; font-weight:bold;">Abrir Chat WA</a>` : 'No detectado'}</p>
                <p><strong>📱 Redes Sociales:</strong> 
                    ${lead.facebook ? `<a href="${lead.facebook}" target="_blank" style="color:#818cf8; margin-right:8px;">Facebook</a>` : ''}
                    ${lead.instagram ? `<a href="${lead.instagram}" target="_blank" style="color:#818cf8;">Instagram</a>` : ''}
                    ${!lead.facebook && !lead.instagram ? 'No vinculadas' : ''}
                </p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLeadByIndex(${index})">✨ Crear Pitch Comercial con Gemini 3.6</button>
        `;
        contenedor.appendChild(card);
    });
}

function consultarEstrategiaLeadByIndex(index) {
    const lead = leadsProcesados[index];
    if (!lead) return;

    const agenteContainer = document.getElementById("agenteContainer");
    if (agenteContainer) agenteContainer.classList.remove("collapsed");

    const prompt = `Genera una propuesta comercial persuasiva de WhatsApp para el negocio "${lead.nombre}". Redes sociales: FB (${lead.facebook || 'No'}), IG (${lead.instagram || 'No'}). Sitio Web: ${lead.websiteUrl}. Enfócate en venderle su sitio web y automatización de prospectos.`;
    
    agregarMensajeUsuario(`Pitch para: ${lead.nombre}`);
    ejecutarLlamadaGemini(prompt);
}

async function ejecutarLlamadaGemini(prompt) {
    const apiKey = obtenerApiKey();
    if (!apiKey) return;

    agregarMensajeIA("⏳ <em>Gemini 3.6 Flash analizando la propuesta...</em>", "msg-temp");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Eres un estratega B2B experto. Responde en español: ${prompt}` }] }]
            })
        });

        document.querySelector(".msg-temp")?.remove();
        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            agregarMensajeIA(data.candidates[0].content.parts[0].text);
        } else {
            agregarMensajeIA("⚠️ Error procesando la respuesta con Gemini 3.6.");
        }
    } catch (e) {
        document.querySelector(".msg-temp")?.remove();
        agregarMensajeIA("⚠️ Error de conexión con Gemini API.");
    }
}

function agregarMensajeUsuario(texto) {
    const chat = document.getElementById("chatGuru");
    if (!chat) return;
    const msg = document.createElement("div");
    msg.className = "msg-user";
    msg.innerText = texto;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function agregarMensajeIA(texto, claseAdicional = "") {
    const chat = document.getElementById("chatGuru");
    if (!chat) return;
    const msg = document.createElement("div");
    msg.className = `msg-ia ${claseAdicional}`;
    msg.innerHTML = `<strong>✨ Gemini IA:</strong><br>${texto.replace(/\n/g, '<br>')}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function toggleChat() {
    const agente = document.getElementById("agenteContainer");
    if (agente) agente.classList.toggle("collapsed");
}
