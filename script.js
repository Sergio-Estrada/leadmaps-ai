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

  // Simulación del puente de comunicación entre la interfaz web y tu script de Python
function enviarTareaAlAgente(instruccion) {
    const chat = document.getElementById("chatGuru");
    
    // Mostrar estado de procesamiento
    const msgProcesando = document.createElement("div");
    msgProcesando.className = "msg-ia";
    msgProcesando.innerHTML = `<strong>🤖 Agente pensando:</strong> Ejecutando orden y consultando la web para: <em>"${instruccion}"</em>...`;
    chat.prepend(msgProcesando);

    // Conexión simulated / endpoint futuro con agente_guru.py
    setTimeout(() => {
        msgProcesando.innerHTML = `
            <strong>🤖 Agente Gurú (Completado):</strong><br>
            He procesado tu solicitud. Se analizó el objetivo, se revisaron los datos en la web y el entregable está listo en el proyecto.
        `;
    }, 2000);
}
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
