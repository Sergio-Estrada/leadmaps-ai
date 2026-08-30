let leadsProcesados = [];
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor;

// Cargar API Key desde localStorage al iniciar
window.addEventListener("DOMContentLoaded", () => {
    const savedKey = localStorage.getItem("groq_api_key");
    if (savedKey) {
        const inputKey = document.getElementById("apiKey");
        if (inputKey) inputKey.value = savedKey;
        actualizarEstado("✅ API Key de Groq cargada localmente.");
    } else {
        actualizarEstado("⚠️ Ingresa tu API Key de Groq para activar Llama 3 IA.");
    }
});

function guardarApiKey() {
    const key = document.getElementById("apiKey") ? document.getElementById("apiKey").value.trim() : "";
    if (!key) {
        alert("Ingresa una API Key válida de Groq Cloud.");
        return;
    }
    localStorage.setItem("groq_api_key", key);
    alert("API Key guardada de forma privada en tu navegador.");
    actualizarEstado("✅ API Key configurada.");
}

function obtenerApiKey() {
    const inputKey = document.getElementById("apiKey");
    if (inputKey && inputKey.value.trim()) {
        return inputKey.value.trim();
    }
    return localStorage.getItem("groq_api_key") || "";
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
        const input = document.getElementById("preguntaAgente");
        if (input) input.value = textoVoz;
        enviarAIA();
    };

    reconocedor.onerror = () => actualizarEstadoMic(false);
    reconocedor.onend = () => actualizarEstadoMic(false);
}

function escucharVoz() {
    if (!reconocedor) return alert("Tu navegador no soporta entrada de voz.");
    actualizarEstadoMic(true);
    reconocedor.start();
}

function actualizarEstadoMic(activo) {
    const btnMic = document.getElementById("btnMic");
    if (btnMic) {
        btnMic.innerText = activo ? "🔴" : "🎙️";
        btnMic.classList.toggle("escuchando", activo);
    }
}

// Búsqueda de Leads mediante OpenStreetMap (Nominatim API)
async function generarLeads() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const soloSinWeb = document.getElementById("filtroSinWeb").checked;
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Ingresa la ciudad y el giro comercial.");
        return;
    }

    actualizarEstado(`🔍 Escaneando negocios en ${ciudad}...`);
    contenedor.innerHTML = "<p class='empty-state'>⏳ Escaneando datos en tiempo real...</p>";

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(categoria + " " + ciudad)}&extratags=1&addressdetails=1`;

    try {
        const response = await fetch(url);
        const resultados = await response.json();

        if (!resultados || resultados.length === 0) {
            actualizarEstado("❌ No se encontraron prospectos.");
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
            const latitud = lugar.lat;
            const longitud = lugar.lon;
            const urlGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`;

            const leadObj = {
                nombre: nombre,
                telefono: telefono,
                direccion: direccion,
                lat: latitud,
                lon: longitud,
                googleMapsUrl: urlGoogleMaps,
                tieneWeb: tieneWebsite,
                websiteUrl: tieneWebsite ? (extra.website || extra["contact:website"]) : "Sin sitio web"
            };

            if (soloSinWeb) {
                if (!tieneWebsite) leadsProcesados.push(leadObj);
            } else {
                leadsProcesados.push(leadObj);
            }
        });

        actualizarEstado(`✅ Búsqueda completada: ${leadsProcesados.length} prospectos.`);
        document.getElementById("contadorLeads").innerText = leadsProcesados.length;
        renderizarTarjetas();

    } catch (error) {
        console.error("Error al obtener leads:", error);
        actualizarEstado("⚠️ Error de conexión con el servicio de mapas.");
        contenedor.innerHTML = "<p class='empty-state'>Ocurrió un error al buscar prospectos.</p>";
    }
}

function renderizarTarjetas() {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    if (leadsProcesados.length === 0) {
        contenedor.innerHTML = "<p class='empty-state'>No hay resultados con los filtros seleccionados.</p>";
        return;
    }

    leadsProcesados.forEach(lead => {
        const card = document.createElement("div");
        card.className = `tarjeta-lead ${!lead.tieneWeb ? 'premium' : ''}`;
        
        const nombreLimpio = lead.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        card.innerHTML = `
            <div>
                <span class="tag-premium">${!lead.tieneWeb ? 'SIN WEB' : 'CON WEB'}</span>
                <h3>${lead.nombre}</h3>
                <p><strong>📍 Ubicación:</strong> ${lead.direccion}</p>
                <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
                <p><strong>🌐 Sitio Web:</strong> ${lead.websiteUrl}</p>
                <p><strong>🗺️ Google Maps:</strong> <a href="${lead.googleMapsUrl}" target="_blank" style="color: #818cf8; text-decoration: underline;">Ver mapa</a></p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLead('${nombreLimpio}', '${lead.websiteUrl}')">✨ Crear Pitch con Llama 3</button>
        `;
        contenedor.appendChild(card);
    });
}

// Integración con Groq API (Llama 3)
function enviarAIA() {
    const input = document.getElementById("preguntaAgente");
    const texto = input.value.trim();
    if (!texto) return;

    agregarMensajeUsuario(texto);
    input.value = "";
    ejecutarLlamadaIA(texto);
}

function consultarEstrategiaLead(nombreNegocio, tieneWeb) {
    const agenteContainer = document.getElementById("agenteContainer");
    if (agenteContainer) agenteContainer.classList.remove("collapsed");

    const prompt = `Genera un pitch comercial de WhatsApp breve para prospectar a "${nombreNegocio}". Estado de sitio web: "${tieneWeb}".`;
    agregarMensajeUsuario(`Pitch para: ${nombreNegocio}`);
    ejecutarLlamadaIA(prompt);
}

async function ejecutarLlamadaIA(prompt) {
    const apiKey = obtenerApiKey();

    if (!apiKey) {
        agregarMensajeIA("⚠️ Ingresa una API Key válida de Groq Cloud para usar la IA.");
        return;
    }

    agregarMensajeIA("⏳ <em>Llama 3 está procesando la solicitud...</em>", "msg-temp");

    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Eres un experto consultor comercial B2B. Responde de forma directa y concisa en español." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();

        const data = await response.json();

        if (data.error) {
            agregarMensajeIA(`⚠️ Error de API: ${data.error.message}`);
            return;
        }

        if (data.choices && data.choices[0].message.content) {
            const respuestaTexto = data.choices[0].message.content;
            agregarMensajeIA(respuestaTexto);
            reproducirVoz(respuestaTexto);
        } else {
            agregarMensajeIA("⚠️ No se recibió una respuesta válida.");
        }

    } catch (error) {
        console.error("Error Fetch:", error);
        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();
        agregarMensajeIA("⚠️ Error de red al comunicarse con el servidor de IA.");
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
        alert("Genera una lista de prospectos antes de exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Nombre,Telefono,Direccion,Tiene_Web,Sitio_Web,Google_Maps\n";

    leadsProcesados.forEach(lead => {
        const nombreClean = `"${lead.nombre.replace(/"/g, '""')}"`;
        const telClean = `"${lead.telefono}"`;
        const dirClean = `"${lead.direccion.replace(/"/g, '""')}"`;
        const webClean = `"${lead.websiteUrl}"`;
        const mapsClean = `"${lead.googleMapsUrl}"`;
        
        csvContent += `${nombreClean},${telClean},${dirClean},${lead.tieneWeb ? 'SI' : 'NO'},${webClean},${mapsClean}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Prospectos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    msg.innerHTML = `<strong>🤖 Llama 3 IA:</strong><br>${texto.replace(/\n/g, '<br>')}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function handleKeyPress(e) {
    if (e.key === "Enter") enviarAIA();
}

function toggleChat() {
    const agente = document.getElementById("agenteContainer");
    if (agente) agente.classList.toggle("collapsed");
}
