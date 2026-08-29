// Clave de API incrustada para ejecución automática
const GEMINI_API_KEY = "AQ.Ab8RN6JB3Vm1U6Mvq8D0k7YBhzhmKOHvYGAnxrMQlnrck7Ytpw";

let leadsProcesados = [];
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor;

// Estado inicial al cargar la página
window.addEventListener("DOMContentLoaded", () => {
    actualizarEstado("✅ Sistema listo y conectado a Gemini 3.6 Flash.");
});

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

// Búsqueda de Leads y generación de enlaces a Google Maps
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
            const latitud = lugar.lat;
            const longitud = lugar.lon;

            // Enlace directo a Google Maps mediante coordenadas
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
                <p><strong>🗺️ Google Maps:</strong> <a href="${lead.googleMapsUrl}" target="_blank" style="color: #818cf8; text-decoration: underline;">Ver ubicación exacta</a></p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLead('${nombreLimpio}', '${lead.websiteUrl}')">✨ Crear Pitch con Gemini</button>
        `;
        contenedor.appendChild(card);
    });
}

// Envío Directo a Gemini 3.6 Flash
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
    agregarMensajeIA("⏳ <em>Gemini está redactando la propuesta...</em>", "msg-temp");

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();

        const data = await response.json();

        if (data.error) {
            agregarMensajeIA(`⚠️ Error de autenticación/API: ${data.error}`);
            return;
        }

        agregarMensajeIA(data.respuesta);
        reproducirVoz(data.respuesta);

    } catch (error) {
        console.error("Error Fetch:", error);
        const tempMsg = document.querySelector(".msg-temp");
        if (tempMsg) tempMsg.remove();
        agregarMensajeIA("⚠️ Error de conexión con el servidor intermedio.");
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
