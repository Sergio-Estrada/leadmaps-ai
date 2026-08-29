let leadsProcesados = [];
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor;

// Inicialización y carga de clave guardada
window.addEventListener("DOMContentLoaded", () => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
        document.getElementById("apiKey").value = savedKey;
        actualizarEstado("✅ API Key cargada. Lista para usar.");
    }
});

function guardarApiKey() {
    const key = document.getElementById("apiKey").value.trim();
    if (!key) {
        alert("Por favor pega una API Key válida.");
        return;
    }
    localStorage.setItem("gemini_api_key", key);
    actualizarEstado("✅ API Key guardada en el navegador.");
}

function actualizarEstado(mensaje) {
    const statusBox = document.getElementById("status");
    if (statusBox) statusBox.innerText = mensaje;
}

// Búsqueda de prospectos (OpenStreetMap)
async function generarLeads() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const soloSinWeb = document.getElementById("filtroSinWeb").checked;
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Por favor ingresa la ciudad y la categoría.");
        return;
    }

    actualizarEstado(`🔍 Buscando negocios en ${ciudad}...`);
    contenedor.innerHTML = "<p class='empty-state'>⏳ Escaneando mapa en tiempo real...</p>";

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(categoria + " " + ciudad)}&extratags=1&addressdetails=1`;

    try {
        const response = await fetch(url);
        const resultados = await response.json();

        if (!resultados || resultados.length === 0) {
            actualizarEstado("❌ No se encontraron prospectos en esta zona.");
            contenedor.innerHTML = "<p class='empty-state'>Sin resultados. Intenta con otra ubicación o rubro.</p>";
            document.getElementById("contadorLeads").innerText = "0";
            return;
        }

        leadsProcesados = [];

        resultados.forEach(lugar => {
            const extra = lugar.extratags || {};
            const tieneWebsite = Boolean(extra.website || extra["contact:website"]);
            const nombre = lugar.display_name.split(',')[0];
            const telefono = extra.phone || extra["contact:phone"] || "No registrado";
            const direccion = lugar.display_name;

            const leadObj = {
                nombre: nombre,
                telefono: telefono,
                direccion: direccion,
                tieneWeb: tieneWebsite,
                websiteUrl: tieneWebsite ? (extra.website || extra["contact:website"]) : "Sin sitio web"
            };

            if (soloSinWeb) {
                if (!tieneWebsite) leadsProcesados.push(leadObj);
            } else {
                leadsProcesados.push(leadObj);
            }
        });

        actualizarEstado(`✅ Se encontraron ${leadsProcesados.length} leads.`);
        document.getElementById("contadorLeads").innerText = leadsProcesados.length;
        renderizarTarjetas();

    } catch (error) {
        console.error("Error al buscar leads:", error);
        actualizarEstado("⚠️ Error de conexión al buscar negocios.");
        contenedor.innerHTML = "<p class='empty-state'>Ocurrió un error en la búsqueda.</p>";
    }
}

function renderizarTarjetas() {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    if (leadsProcesados.length === 0) {
        contenedor.innerHTML = "<p class='empty-state'>No hay prospectos que cumplan el filtro seleccionado.</p>";
        return;
    }

    leadsProcesados.forEach(lead => {
        const card = document.createElement("div");
        card.className = `tarjeta-lead ${!lead.tieneWeb ? 'premium' : ''}`;
        
        // Escape de comillas para evitar rupturas de sintaxis
        const nombreEscapado = lead.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        card.innerHTML = `
            <div>
                <span class="tag-premium">${!lead.tieneWeb ? 'OPORTUNIDAD ALTA (SIN WEB)' : 'LEAD CON WEB'}</span>
                <h3>${lead.nombre}</h3>
                <p><strong>📍 Ubicación:</strong> ${lead.direccion}</p>
                <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
                <p><strong>🌐 Web:</strong> ${lead.websiteUrl}</p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLead('${nombreEscapado}', '${lead.websiteUrl}')">✨ Crear Pitch con Gemini</button>
        `;
        contenedor.appendChild(card);
    });
}

// Ejecución del Agente Gemini
function enviarAGeminiManual() {
    const input = document.getElementById("preguntaAgente");
    const texto = input.value.trim();
    if (!texto) return;

    agregarMensajeUsuario(texto);
    input.value = "";
    ejecutarLlamadaGemini(texto);
}

function consultarEstrategiaLead(nombreNegocio, tieneWeb) {
    const agenteContainer = document.getElementById("agenteContainer");
    if (agenteContainer) agenteContainer.classList.remove("collapsed");

    const prompt = `Genera un mensaje comercial breve para prospectar al negocio "${nombreNegocio}". Estado de sitio web: "${tieneWeb}".`;
    agregarMensajeUsuario(`Estrategia para: ${nombreNegocio}`);
    ejecutarLlamadaGemini(prompt);
}

async function ejecutarLlamadaGemini(prompt) {
    const apiKey = document.getElementById("apiKey").value.trim() || localStorage.getItem("gemini_api_key");

    if (!apiKey) {
        agregarMensajeIA("⚠️ Ingresa tu API Key de Gemini y presiona 'Guardar Key'.");
        return;
    }

    // Indicador visual de procesamiento
    agregarMensajeIA("⏳ <em>Gemini está pensando la respuesta...</em>", "msg-temp");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Eres un experto en ventas B2B. Responde brevemente: ${prompt}` }]
                }]
            })
        });

        // Remover mensaje temporal
        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();

        const data = await response.json();

        if (data.error) {
            agregarMensajeIA(`⚠️ Error de API: ${data.error.message}`);
            return;
        }

        const respuestaTexto = data.candidates[0].content.parts[0].text;
        agregarMensajeIA(respuestaTexto);
        reproducirVoz(respuestaTexto);

    } catch (error) {
        console.error("Error Fetch:", error);
        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();
        agregarMensajeIA("⚠️ Error de conexión con los servidores de Gemini.");
    }
}

// Control de audio
function reproducirVoz(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textoLimpio = texto.replace(/[*_#]/g, '');
        const locucion = new SpeechSynthesisUtterance(textoLimpio);
        locucion.lang = 'es-MX';
        window.speechSynthesis.speak(locucion);
    }
}

// Interfaz del Chat
function agregarMensajeUsuario(texto) {
    const chat = document.getElementById("chatGuru");
    const msg = document.createElement("div");
    msg.className = "msg-user";
    msg.innerText = texto;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function agregarMensajeIA(texto, claseAdicional = "") {
    const chat = document.getElementById("chatGuru");
    const msg = document.createElement("div");
    msg.className = `msg-ia ${claseAdicional}`;
    msg.innerHTML = `<strong>✨ Gemini IA:</strong><br>${texto.replace(/\n/g, '<br>')}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function handleKeyPress(e) {
    if (e.key === "Enter") enviarAGeminiManual();
}

function toggleChat() {
    document.getElementById("agenteContainer").classList.toggle("collapsed");
}
