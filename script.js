let leadsProcesados = [];
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor;

// Inicialización de la API Key guardada
window.addEventListener("DOMContentLoaded", () => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
        document.getElementById("apiKey").value = savedKey;
        actualizarEstado("✅ API Key cargada desde el navegador.");
    }
});

function guardarApiKey() {
    const key = document.getElementById("apiKey").value.trim();
    if (!key) {
        alert("Por favor ingresa una API Key válida.");
        return;
    }
    localStorage.setItem("gemini_api_key", key);
    alert("API Key guardada correctamente.");
    actualizarEstado("✅ API Key guardada. Sistema listo.");
}

function actualizarEstado(mensaje) {
    const statusBox = document.getElementById("status");
    if (statusBox) statusBox.innerText = mensaje;
}

// Configuración de Reconocimiento de Voz
if (Recognition) {
    reconocedor = new Recognition();
    reconocedor.lang = 'es-MX';
    reconocedor.continuous = false;

    reconocedor.onresult = (event) => {
        const textoVoz = event.results[0][0].transcript;
        document.getElementById("preguntaAgente").value = textoVoz;
        enviarAGeminiManual();
    };

    reconocedor.onerror = (event) => {
        console.error("Error de voz:", event.error);
        actualizarEstadoMic(false);
    };

    reconocedor.onend = () => {
        actualizarEstadoMic(false);
    };
}

function escucharVoz() {
    if (!reconocedor) {
        alert("Tu navegador no soporta entrada de voz nativa.");
        return;
    }
    actualizarEstadoMic(true);
    reconocedor.start();
}

function actualizarEstadoMic(activo) {
    const btnMic = document.getElementById("btnMic");
    if (btnMic) {
        if (activo) {
            btnMic.classList.add("escuchando");
            btnMic.innerText = "🔴";
        } else {
            btnMic.classList.remove("escuchando");
            btnMic.innerText = "🎙️";
        }
    }
}

// Búsqueda de Leads con OpenStreetMap (Nominatim API)
async function generarLeads() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const soloSinWeb = document.getElementById("filtroSinWeb").checked;
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Ingresa la ciudad y la categoría comercial.");
        return;
    }

    actualizarEstado(`🔍 Escaneando negocios en ${ciudad}...`);
    contenedor.innerHTML = "<p class='empty-state'>⏳ Escaneando datos comerciales en tiempo real...</p>";

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(categoria + " " + ciudad)}&extratags=1&addressdetails=1`;

    try {
        const response = await fetch(url);
        const resultados = await response.json();

        if (!resultados || resultados.length === 0) {
            actualizarEstado("❌ No se encontraron prospectos en esta zona.");
            contenedor.innerHTML = "<p class='empty-state'>Sin resultados. Prueba con otra zona o giro.</p>";
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

        actualizarEstado(`✅ Búsqueda completada: ${leadsProcesados.length} leads cualificados.`);
        document.getElementById("contadorLeads").innerText = leadsProcesados.length;
        renderizarTarjetas();

    } catch (error) {
        console.error("Error al obtener leads:", error);
        actualizarEstado("⚠️ Error de conexión con el motor de mapas.");
        contenedor.innerHTML = "<p class='empty-state'>Ocurrió un error en la búsqueda de datos.</p>";
    }
}

function renderizarTarjetas() {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    if (leadsProcesados.length === 0) {
        contenedor.innerHTML = "<p class='empty-state'>No hay resultados con los filtros aplicados.</p>";
        return;
    }

    leadsProcesados.forEach(lead => {
        const card = document.createElement("div");
        card.className = `tarjeta-lead ${!lead.tieneWeb ? 'premium' : ''}`;
        
        const nombreLimpio = lead.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        card.innerHTML = `
            <div>
                <span class="tag-premium">${!lead.tieneWeb ? 'OPORTUNIDAD ALTA (SIN WEB)' : 'LEAD CON WEB'}</span>
                <h3>${lead.nombre}</h3>
                <p><strong>📍 Ubicación:</strong> ${lead.direccion}</p>
                <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
                <p><strong>🌐 Sitio Web:</strong> ${lead.websiteUrl}</p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLead('${nombreLimpio}', '${lead.websiteUrl}')">✨ Crear Pitch con Gemini</button>
        `;
        contenedor.appendChild(card);
    });
}

// Comunicación con Gemini API (Modelo 3.6 Flash)
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

    const prompt = `Genera un pitch comercial breve de WhatsApp para prospectar a "${nombreNegocio}". Estado web: "${tieneWeb}".`;
    agregarMensajeUsuario(`Pitch para: ${nombreNegocio}`);
    ejecutarLlamadaGemini(prompt);
}

async function ejecutarLlamadaGemini(prompt) {
    const apiKey = document.getElementById("apiKey").value.trim() || localStorage.getItem("gemini_api_key");

    if (!apiKey) {
        agregarMensajeIA("⚠️ Ingresa tu API Key de Gemini y haz clic en 'Guardar Key'.");
        return;
    }

    agregarMensajeIA("⏳ <em>Gemini está redactando la propuesta...</em>", "msg-temp");

    // Endpoint actualizado a gemini-3.6-flash
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Eres un consultor experto en ventas B2B. Responde de forma ejecutiva: ${prompt}` }]
                }]
            })
        });

        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();

        const data = await response.json();

        if (data.error) {
            agregarMensajeIA(`⚠️ Error de Google AI Studio: ${data.error.message}`);
            return;
        }

        const respuestaTexto = data.candidates[0].content.parts[0].text;
        agregarMensajeIA(respuestaTexto);
        reproducirVoz(respuestaTexto);

    } catch (error) {
        console.error("Error Fetch:", error);
        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();
        agregarMensajeIA("⚠️ Error de conexión con la API de Gemini.");
    }
}

function reproducirVoz(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textoLimpio = texto.replace(/[*_#]/g, '');
        const locucion = new SpeechSynthesisUtterance(textoLimpio);
        locucion.lang = 'es-MX';
        window.speechSynthesis.speak(locucion);
    }
}

function exportarCSV() {
    if (leadsProcesados.length === 0) {
        alert("Genera una lista de leads antes de exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Nombre,Telefono,Direccion,Tiene_Web,Sitio_Web\n";

    leadsProcesados.forEach(lead => {
        const nombreClean = `"${lead.nombre.replace(/"/g, '""')}"`;
        const telClean = `"${lead.telefono}"`;
        const dirClean = `"${lead.direccion.replace(/"/g, '""')}"`;
        const webClean = `"${lead.websiteUrl}"`;
        
        csvContent += `${nombreClean},${telClean},${dirClean},${lead.tieneWeb ? 'SI' : 'NO'},${webClean}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leads_Premium_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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
