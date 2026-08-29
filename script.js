// 1. Búsqueda Nativa y Gratuita de Leads con OpenStreetMap (Sin API Key)
async function buscarLeadsReales() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const statusBox = document.getElementById("status");
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Por favor completa los campos de Ciudad y Categoría.");
        return;
    }

    statusBox.innerText = `🔍 Escaneando OpenStreetMap en ${ciudad}...`;
    contenedor.innerHTML = "";

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(categoria + " " + ciudad)}&extratags=1&addressdetails=1`;

    try {
        const response = await fetch(url);
        const resultados = await response.json();

        if (resultados.length === 0) {
            statusBox.innerText = "❌ No se encontraron resultados en esta zona.";
            contenedor.innerHTML = "<p class='empty-state'>Intenta con otra categoría o ciudad cerca de tu zona.</p>";
            return;
        }

        statusBox.innerText = `✅ Se encontraron ${resultados.length} ubicaciones reales. Filtrando Leads Premium...`;
        renderizarLeadsOSM(resultados);

    } catch (error) {
        statusBox.innerText = "⚠️ Error de conexión al consultar el mapa público.";
    }
}

// 2. Renderizado de Negocios Cualificados
function renderizarLeadsOSM(lugares) {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    lugares.forEach(lugar => {
        const extra = lugar.extratags || {};
        const tieneWebsite = extra.website || extra["contact:website"];

        if (!tieneWebsite) {
            const nombreNegocio = lugar.display_name.split(',')[0];
            const card = document.createElement("div");
            card.className = "tarjeta-lead premium";
            card.innerHTML = `
                <div>
                    <span class="tag-premium">LEAD PREMIUM (Sin Web)</span>
                    <h3>${nombreNegocio}</h3>
                    <p><strong>📍 Ubicación:</strong> ${lugar.display_name}</p>
                    <p><strong>📞 Teléfono:</strong> ${extra.phone || extra["contact:phone"] || "No registrado"}</p>
                </div>
                <button class="btn-guru" onclick="consultarEstrategiaLead('${nombreNegocio}')">🧠 Consultar Estrategia al Gurú</button>
            `;
            contenedor.appendChild(card);
        }
    });

    if (contenedor.children.length === 0) {
        contenedor.innerHTML = "<p class='empty-state'>Todos los lugares encontrados en esta muestra ya cuentan con sitio web registrado.</p>";
    }
}

// 3. Estrategia Automática para Negocios de la Lista
function consultarEstrategiaLead(nombreNegocio) {
    const chat = document.getElementById("chatGuru");
    
    // Asegurar que el chat esté expandido
    document.getElementById("agenteContainer").classList.remove("collapsed");

    const respuestaEstrategica = `
        <strong>🧠 Gurú IA - Estrategia para: ${nombreNegocio}</strong><br><br>
        <strong>1. Diagnóstico:</strong> Prospecto activo en mapas sin sitio web ni recepción digital.<br>
        <strong>2. Solución a Vender:</strong> Landing Page ultra rápida + Agente IA en WhatsApp para reservaciones o dudas 24/7.<br>
        <strong>3. Script de Acercamiento:</strong><br>
        <em>"Hola equipo de ${nombreNegocio}, encontré su negocio en el mapa y noté que no tienen sitio web para recibir clientes en automático. Les armé una propuesta con un Agente de IA..."</em>
    `;

    agregarMensajeIA(respuestaEstrategica);
}

// 4. Interacción Directa: Preguntar cualquier cosa al Agente
function preguntarAlAgente() {
    const input = document.getElementById("preguntaAgente");
    const pregunta = input.value.trim();

    if (!pregunta) return;

    // Dibujar pregunta del usuario en el chat
    agregarMensajeUsuario(pregunta);
    input.value = "";

    // Respuesta dinámica del Agente
    setTimeout(() => {
        const respuestaIA = generarRespuestaAgente(pregunta);
        agregarMensajeIA(respuestaIA);
    }, 800);
}

// Generador de Respuestas y Resolución de Tareas del Agente
function generarRespuestaAgente(pregunta) {
    const texto = pregunta.toLowerCase();

    if (texto.includes("hola") || texto.includes("buenos")) {
        return "¡Hola! Estoy listo para apoyarte. ¿Qué proyecto, consulta o código quieres que desarrollemos hoy?";
    } else if (texto.includes("script") || texto.includes("pitch") || texto.includes("mensaje")) {
        return "<strong>🤖 Propuesta de Pitch Directo:</strong><br><em>'Hola, me di cuenta de que su negocio recibe clientes por mapa pero pierde oportunidades al no tener un agente de IA que atienda en web. ¿Les gustaría ver una demostración en 5 minutos?'</em>";
    } else if (texto.includes("github") || texto.includes("codigo") || texto.includes("subir")) {
        return "<strong>🛠️ Comandos para actualizar GitHub:</strong><br><code>git add .</code><br><code>git commit -m 'Actualizacion del agente e interfaz'</code><br><code>git push</code>";
    } else if (texto.includes("agente") || texto.includes("ia") || texto.includes("python")) {
        return "<strong>🤖 Agentes de IA:</strong> Puedo ayudarte a conectar este panel con frameworks como CrewAI o LangChain en Python para ejecutar búsquedas autónomas en la web.";
    } else {
        return `<strong>🤖 Agente Gurú:</strong> He procesado tu solicitud: <em>"${pregunta}"</em>.<br><br>Estoy analizando el requerimiento y puedo generarte el plan de acción, el diseño web o el código necesario. ¿Quieres que lo preparemos en Python o JS?`;
    }
}

// Funciones Auxiliares de Interfaz
function agregarMensajeUsuario(texto) {
    const chat = document.getElementById("chatGuru");
    const msg = document.createElement("div");
    msg.className = "msg-user";
    msg.innerText = texto;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function agregarMensajeIA(htmlContent) {
    const chat = document.getElementById("chatGuru");
    const msg = document.createElement("div");
    msg.className = "msg-ia";
    msg.innerHTML = `<strong>🤖 Gurú IA:</strong><br>${htmlContent}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function handleKeyPress(e) {
    if (e.key === "Enter") {
        preguntarAlAgente();
    }
}

function toggleChat() {
    const container = document.getElementById("agenteContainer");
    container.classList.toggle("collapsed");
}
