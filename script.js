let leadsProcesados = [];
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor;

// Cargar la API Key guardada al iniciar
window.addEventListener("DOMContentLoaded", () => {
    const savedKey = localStorage.getItem("gemini_api_key");
    const inputKey = document.getElementById("apiKey");
    
    if (savedKey) {
        if (inputKey) inputKey.value = savedKey;
        actualizarEstado("✅ API Key de Gemini cargada localmente.");
    } else {
        actualizarEstado("⚠️ Ingresa tu API Key de Gemini para activar la IA.");
    }
});

// Guardar API Key en localStorage
function guardarApiKey() {
    const inputKey = document.getElementById("apiKey");
    const key = inputKey ? inputKey.value.trim() : "";
    
    if (!key) {
        alert("Por favor, ingresa una API Key válida de Google AI Studio.");
        return;
    }
    
    localStorage.setItem("gemini_api_key", key);
    alert("API Key guardada correctamente en tu navegador.");
    actualizarEstado("✅ API Key de Gemini configurada.");
}

function obtenerApiKey() {
    const inputKey = document.getElementById("apiKey");
    if (inputKey && inputKey.value.trim()) {
        return inputKey.value.trim();
    }
    return localStorage.getItem("gemini_api_key") || "";
}

function actualizarEstado(mensaje) {
    const statusBox = document.getElementById("status");
    const statusBadge = document.getElementById("statusBadge");
    if (statusBox) statusBox.innerText = mensaje;
    if (statusBadge) {
        statusBadge.innerText = mensaje.includes("✅") ? "🟢 IA Conectada" : "🔴 Esperando API Key";
    }
}

// Reconocimiento de Voz
if (Recognition) {
    reconocedor = new Recognition();
    reconocedor.lang = 'es-MX';
    reconocedor.continuous = false;

    reconocedor.onresult = (event) => {
        const textoVoz = event.results[0][0].transcript;
        const input = document.getElementById("preguntaAgente");
        if (input) input.value = textoVoz;
        enviarAGeminiManual();
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

    leadsProcesados.forEach((lead, index) => {
        const card = document.createElement("div");
        card.className = `tarjeta-lead ${!lead.tieneWeb ? 'premium' : ''}`;
        
        card.innerHTML = `
            <div>
                <span class="tag-premium">${!lead.tieneWeb ? 'SIN WEB' : 'CON WEB'}</span>
                <h3>${lead.nombre}</h3>
                <p><strong>📍 Ubicación:</strong> ${lead.direccion}</p>
                <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
                <p><strong>🌐 Sitio Web:</strong> ${lead.websiteUrl}</p>
                <p><strong>🗺️ Google Maps:</strong> <a href="${lead.googleMapsUrl}" target="_blank" style="color: #818cf8; text-decoration: underline;">Ver mapa</a></p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLeadByIndex(${index})">✨ Crear Pitch con Gemini</button>
        `;
        contenedor.appendChild(card);
    });
}

function consultarEstrategiaLeadByIndex(index) {
    const lead = leadsProcesados[index];
    if (!lead) return;

    const agenteContainer = document.getElementById("agenteContainer");
    if (agenteContainer) agenteContainer.classList.remove("collapsed");

    const prompt = `Genera un pitch comercial breve para WhatsApp enfocado en prospectar al negocio "${lead.nombre}". Su estado de sitio web es "${lead.websiteUrl}". Presenta una propuesta directa y profesional en español.`;
    agregarMensajeUsuario(`Pitch para: ${lead.nombre}`);
    ejecutarLlamadaGemini(prompt);
}

// Llamada Directa a Gemini API
async function ejecutarLlamadaGemini(prompt) {
    const apiKey = obtenerApiKey();

    if (!apiKey) {
        agregarMensajeIA("⚠️ Ingresa tu API Key de Gemini en el campo superior para activar las respuestas.");
        return;
    }

    agregarMensajeIA("⏳ <em>Gemini está redactando la propuesta...</em>", "msg-temp");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Eres un consultor experto en ventas B2B y estrategias digitales. Responde de forma concisa y profesional en español: ${prompt}` }]
                }]
            })
        });

        document.querySelector(".msg-temp")?.remove();
        const data = await response.json();

        if (data.error) {
            agregarMensajeIA(`⚠️ Error de API: ${data.error.message}`);
            return;
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const respuestaTexto = data.candidates[0].content.parts[0].text;
            agregarMensajeIA(respuestaTexto);
            reproducirVoz(respuestaTexto);
        } else {
            agregarMensajeIA("⚠️ No se recibió una respuesta válida del modelo.");
        }

    } catch (error) {
        console.error("Error Fetch:", error);
        document.querySelector(".msg-temp")?.remove();
        agregarMensajeIA("⚠️ Error de conexión con los servidores de Gemini.");
    }
}

function enviarAGeminiManual() {
    const input = document.getElementById("preguntaAgente");
    const texto = input.value.trim();
    if (!texto) return;

    agregarMensajeUsuario(texto);
    input.value = "";
    ejecutarLlamadaGemini(texto);
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
    msg.innerHTML = `<strong>✨ Gemini IA:</strong><br>${texto.replace(/\n/g, '<br>')}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function handleKeyPress(e) {
    if (e.key === "Enter") enviarAGeminiManual();
}

function toggleChat() {
    const agente = document.getElementById("agenteContainer");
    if (agente) agente.classList.toggle("collapsed");
}
