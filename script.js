let leadsProcesados = [];
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor;

// Configuración de Reconocimiento de Voz
if (Recognition) {
    reconocedor = new Recognition();
    reconocedor.lang = 'es-MX';
    reconocedor.continuous = false;

    reconocedor.onresult = (event) => {
        const textoVoz = event.results[0][0].transcript;
        document.getElementById("preguntaAgente").value = textoVoz;
        enviarAGemini();
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
        alert("Tu navegador no soporta entrada de voz.");
        return;
    }
    actualizarEstadoMic(true);
    reconocedor.start();
}

function actualizarEstadoMic(activo) {
    const btnMic = document.getElementById("btnMic");
    if (activo) {
        btnMic.classList.add("escuchando");
        btnMic.innerText = "🔴";
    } else {
        btnMic.classList.remove("escuchando");
        btnMic.innerText = "🎙️";
    }
}

// Búsqueda de Leads mediante Nominatim OpenStreetMap
async function generarLeads() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const soloSinWeb = document.getElementById("filtroSinWeb").checked;
    const statusBox = document.getElementById("status");
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Completa la ciudad y categoría.");
        return;
    }

    statusBox.innerText = `🔍 Escaneando empresas en ${ciudad}...`;
    contenedor.innerHTML = "";

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(categoria + " " + ciudad)}&extratags=1&addressdetails=1`;

    try {
        const response = await fetch(url);
        const resultados = await response.json();

        if (resultados.length === 0) {
            statusBox.innerText = "❌ No se encontraron negocios en esta zona.";
            contenedor.innerHTML = "<p class='empty-state'>Intenta con otra categoría o ubicación.</p>";
            document.getElementById("contadorLeads").innerText = "0";
            return;
        }

        leadsProcesados = [];

        resultados.forEach(lugar => {
            const extra = lugar.extratags || {};
            const tieneWebsite = extra.website || extra["contact:website"];
            const nombre = lugar.display_name.split(',')[0];
            const telefono = extra.phone || extra["contact:phone"] || "No registrado";
            const direccion = lugar.display_name;

            const leadObj = {
                nombre: nombre,
                telefono: telefono,
                direccion: direccion,
                tieneWeb: Boolean(tieneWebsite),
                websiteUrl: tieneWebsite || "Sin sitio web"
            };

            if (soloSinWeb) {
                if (!tieneWebsite) leadsProcesados.push(leadObj);
            } else {
                leadsProcesados.push(leadObj);
            }
        });

        statusBox.innerText = `✅ Búsqueda finalizada: ${leadsProcesados.length} prospectos listos.`;
        document.getElementById("contadorLeads").innerText = leadsProcesados.length;
        renderizarTarjetas();

    } catch (error) {
        statusBox.innerText = "⚠️ Error de conexión al consultar el motor de datos.";
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
        card.innerHTML = `
            <div>
                <span class="tag-premium">${!lead.tieneWeb ? 'LEAD ALTA OPORTUNIDAD' : 'LEAD CON ESTÁNDAR'}</span>
                <h3>${lead.nombre}</h3>
                <p><strong>📍 Ubicación:</strong> ${lead.direccion}</p>
                <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
                <p><strong>🌐 Sitio Web:</strong> ${lead.websiteUrl}</p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLead('${lead.nombre}', '${lead.websiteUrl}')">✨ Crear Pitch con Gemini</button>
        `;
        contenedor.appendChild(card);
    });
}

// Integración Nativa con la API de Gemini (gemini-2.5-flash)
async function enviarAGemini(promptDirecto = null) {
    const apiKey = document.getElementById("apiKey").value.trim();
    const input = document.getElementById("preguntaAgente");
    const textoConsulta = promptDirecto || input.value.trim();

    if (!apiKey) {
        alert("Ingresa tu API Key de Gemini en el panel izquierdo para utilizar al Asesor IA.");
        return;
    }

    if (!textoConsulta) return;

    if (!promptDirecto) {
        agregarMensajeUsuario(textoConsulta);
        input.value = "";
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Eres un consultor experto en prospección B2B y cierre de ventas. Responde de forma concisa, comercial y profesional a la siguiente consulta: ${textoConsulta}` }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            agregarMensajeIA(`⚠️ Error de API: ${data.error.message}`);
            return;
        }

        const respuestaTexto = data.candidates[0].content.parts[0].text;
        agregarMensajeIA(respuestaTexto);
        reproducirVoz(respuestaTexto);

    } catch (error) {
        agregarMensajeIA("⚠️ No se pudo establecer conexión con la API de Gemini.");
    }
}

function consultarEstrategiaLead(nombreNegocio, tieneWeb) {
    document.getElementById("agenteContainer").classList.remove("collapsed");
    const promptEstrategico = `Genera un mensaje directo de WhatsApp de 3 oraciones para prospectar al negocio "${nombreNegocio}". Considera que actualmente su sitio web está reportado como "${tieneWeb}". Enfócate en ofrecerle automatizaciones de atención a clientes e infraestructura digital.`;
    
    agregarMensajeUsuario(`Estrategia para: ${nombreNegocio}`);
    enviarAGemini(promptEstrategico);
}

// Lectura de Respuesta mediante Voz (Text-to-Speech)
function reproducirVoz(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancelar lecturas previas
        const textoLimpio = texto.replace(/[*_#]/g, ''); // Limpiar caracteres markdown
        const locucion = new SpeechSynthesisUtterance(textoLimpio);
        locucion.lang = 'es-MX';
        locucion.rate = 1.0;
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

function agregarMensajeIA(texto) {
    const chat = document.getElementById("chatGuru");
    const msg = document.createElement("div");
    msg.className = "msg-ia";
    msg.innerHTML = `<strong>✨ Gemini IA:</strong><br>${texto.replace(/\n/g, '<br>')}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function handleKeyPress(e) {
    if (e.key === "Enter") enviarAGemini();
}

function toggleChat() {
    document.getElementById("agenteContainer").classList.toggle("collapsed");
}
