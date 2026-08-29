async function buscarLeadsReales() {
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const statusBox = document.getElementById("status");
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Por favor ingresa la ciudad y la categoría comercial.");
        return;
    }

    statusBox.innerText = `🔍 Escaneando OpenStreetMap en ${ciudad}...`;
    contenedor.innerHTML = "";

    // Consulta nativa a la API pública de OpenStreetMap (Sin API Key)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(categoria + " " + ciudad)}&extratags=1&addressdetails=1`;

    try {
        const response = await fetch(url);
        const resultados = await response.json();

        if (resultados.length === 0) {
            statusBox.innerText = "❌ No se encontraron resultados en esa zona.";
            contenedor.innerHTML = "<p class='empty-state'>Intenta con otra categoría o ciudad.</p>";
            return;
        }

        statusBox.innerText = `✅ Se encontraron ${resultados.length} ubicaciones reales. Filtrando Leads Premium...`;
        renderizarLeadsOSM(resultados);

    } catch (error) {
        statusBox.innerText = "⚠️ Error al conectar con la red de mapas libre.";
    }
}

function renderizarLeadsOSM(lugares) {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    lugares.forEach(lugar => {
        const extra = lugar.extratags || {};
        // Si no se reporta sitio web en los datos públicos del mapa, se marca como Lead Premium
        const tieneWebsite = extra.website || extra["contact:website"];

        if (!tieneWebsite) {
            const card = document.createElement("div");
            card.className = "tarjeta-lead premium";
            card.innerHTML = `
                <span class="tag-premium">LEAD PREMIUM (Sin Web)</span>
                <h3>${lugar.display_name.split(',')[0]}</h3>
                <p><strong>📍 Ubicación:</strong> ${lugar.display_name}</p>
                <p><strong>📞 Teléfono:</strong> ${extra.phone || extra["contact:phone"] || "No registrado"}</p>
                <button class="btn-guru" onclick="consultarGuruIA('${lugar.display_name.split(',')[0]}')">🧠 Asesoría con Gurú IA</button>
            `;
            contenedor.appendChild(card);
        }
    });

    if (contenedor.children.length === 0) {
        contenedor.innerHTML = "<p class='empty-state'>Todos los lugares encontrados en esta muestra ya tienen sitio web.</p>";
    }
}

function consultarGuruIA(nombreNegocio) {
    const chat = document.getElementById("chatGuru");
    
    const estrategia = `
        <div class="msg-ia">
            <strong>🧠 Gurú IA - Plan de Acción para: ${nombreNegocio}</strong><br><br>
            <strong>Diagnóstico:</strong> Presente en mapas libres pero sin enlace web oficial.<br>
            <strong>Propuesta Técnica:</strong> Landing Page responsiva + Agente de IA entrenado para responder preguntas frecuentes y agendar citas.<br>
            <strong>Pitch Sugerido:</strong><br>
            <em>"Hola, detecté su perfil de negocio en el mapa y noté que no cuentan con un sitio web con recepción automatizada. Desarrollé una demo con un agente de IA que atiende clientes automáticamente..."</em>
        </div>
    `;

    chat.innerHTML = estrategia + chat.innerHTML;
}
