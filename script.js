let leadsProcesados = [];

async function generarLeads() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const soloSinWeb = document.getElementById("filtroSinWeb").checked;
    const statusBox = document.getElementById("status");
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Ingresa Ciudad y Categoría.");
        return;
    }

    statusBox.innerText = `🔍 Buscando negocios en ${ciudad}...`;
    contenedor.innerHTML = "";

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(categoria + " " + ciudad)}&extratags=1&addressdetails=1`;

    try {
        const response = await fetch(url);
        const resultados = await response.json();

        if (resultados.length === 0) {
            statusBox.innerText = "❌ No se encontraron prospectos en esta zona.";
            contenedor.innerHTML = "<p class='empty-state'>Intenta con otra categoría o zona comercial.</p>";
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
                websiteUrl: tieneWebsite || "N/A"
            };

            if (soloSinWeb) {
                if (!tieneWebsite) leadsProcesados.push(leadObj);
            } else {
                leadsProcesados.push(leadObj);
            }
        });

        statusBox.innerText = `✅ Completado: ${leadsProcesados.length} leads cualificados.`;
        document.getElementById("contadorLeads").innerText = leadsProcesados.length;
        renderizarTarjetas();

    } catch (error) {
        statusBox.innerText = "⚠️ Error al consultar el servicio de datos.";
    }
}

function renderizarTarjetas() {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    if (leadsProcesados.length === 0) {
        contenedor.innerHTML = "<p class='empty-state'>No hay leads que cumplan con los filtros.</p>";
        return;
    }

    leadsProcesados.forEach(lead => {
        const card = document.createElement("div");
        card.className = `tarjeta-lead ${!lead.tieneWeb ? 'premium' : ''}`;
        card.innerHTML = `
            <div>
                <span class="tag-premium">${!lead.tieneWeb ? 'LEAD HIGH-PRIORITY (Sin Web)' : 'LEAD ESTÁNDAR'}</span>
                <h3>${lead.nombre}</h3>
                <p><strong>📍 Ubicación:</strong> ${lead.direccion}</p>
                <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
                <p><strong>🌐 Web:</strong> ${lead.websiteUrl}</p>
            </div>
            <button class="btn-guru" onclick="consultarEstrategiaLead('${lead.nombre}')">🧠 Generar Script Comercial</button>
        `;
        contenedor.appendChild(card);
    });
}

function exportarCSV() {
    if (leadsProcesados.length === 0) {
        alert("Primero genera una lista de leads.");
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
    link.setAttribute("download", `Leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function consultarEstrategiaLead(nombreNegocio) {
    document.getElementById("agenteContainer").classList.remove("collapsed");

    const propuesta = `
        <strong>🧠 Pitch de Venta para: ${nombreNegocio}</strong><br><br>
        <strong>• Mensaje sugerido:</strong><br>
        <em>"Hola equipo de ${nombreNegocio}, noté que en mapas no disponen de un sitio web ni atención automatizada. Diseñé una propuesta con Agente de IA para calificar prospectos 24/7. ¿Les muestro una demo rápida?"</em>
    `;

    agregarMensajeIA(propuesta);
}

function preguntarAlAgente() {
    const input = document.getElementById("preguntaAgente");
    const pregunta = input.value.trim();
    if (!pregunta) return;

    agregarMensajeUsuario(pregunta);
    input.value = "";

    setTimeout(() => {
        const respuestaIA = responderAgente(pregunta);
        agregarMensajeIA(respuestaIA);
    }, 600);
}

function responderAgente(pregunta) {
    const txt = pregunta.toLowerCase();
    if (txt.includes("excel") || txt.includes("csv") || txt.includes("descargar")) {
        return "Haz clic en el botón verde <strong>'📥 Exportar a CSV / Excel'</strong> arriba a la derecha para descargar el archivo.";
    } else if (txt.includes("script") || txt.includes("pitch") || txt.includes("llamada")) {
        return "<strong>Script de Llamada:</strong><br><em>'Buenas tardes, llamo para presentarles un sistema de captura automática de clientes en su área...'</em>";
    } else {
        return `Registré tu consulta sobre <em>"${pregunta}"</em>. Puedo ayudarte a estructurar landing pages o bots para estos prospectos.`;
    }
}

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
    if (e.key === "Enter") preguntarAlAgente();
}

function toggleChat() {
    document.getElementById("agenteContainer").classList.toggle("collapsed");
}
