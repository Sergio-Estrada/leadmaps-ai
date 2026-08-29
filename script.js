async function buscarLeadsReales() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const ciudad = document.getElementById("ciudad").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const statusBox = document.getElementById("status");
    const contenedor = document.getElementById("lista-leads");

    if (!ciudad || !categoria) {
        alert("Por favor ingresa la ciudad y categoría de búsqueda.");
        return;
    }

    statusBox.innerText = "⏳ Conectando con Google Maps API...";
    contenedor.innerHTML = "";

    // Si el usuario no coloca API Key, usamos una llamada demostrativa basada en datos de respuesta reales de Google Maps
    if (!apiKey) {
        statusBox.innerText = "⚠️ Sin API Key: Mostrando simulación con estructura exacta de Google Maps.";
        renderizarLeads(obtenerDatosEjemploReal());
        return;
    }

    // Consulta real a la API de Google Places (TextSearch)
    const query = encodeURIComponent(`${categoria} en ${ciudad}`);
    const endpoint = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

    try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data.status !== "OK") {
            statusBox.innerText = `Error de Google API: ${data.status}`;
            return;
        }

        statusBox.innerText = `✅ Se encontraron ${data.results.length} lugares en Google Maps. Filtrando...`;
        renderizarLeads(data.results);

    } catch (err) {
        statusBox.innerText = "Error de red o CORS al consultar Google Maps Directamente.";
    }
}

function renderizarLeads(lugares) {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = "";

    lugares.forEach(place => {
        // Un lead es 'Premium' si Google no reporta sitio web registrado
        const tieneWebsite = Boolean(place.website);
        
        if (!tieneWebsite) {
            const card = document.createElement("div");
            card.className = "tarjeta-lead premium";
            card.innerHTML = `
                <span class="tag-premium">LEAD PREMIUM (Sin Web)</span>
                <h3>${place.name}</h3>
                <p><strong>📍 Dirección:</strong> ${place.formatted_address || place.vicinity}</p>
                <p><strong>⭐ Calificación:</strong> ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reseñas)</p>
                <button class="btn-guru" onclick="consultarGuruIA('${place.name}', '${place.types ? place.types[0] : 'Negocio'}')">🧠 Consultar Estrategia al Gurú</button>
            `;
            contenedor.appendChild(card);
        }
    });

    if (contenedor.children.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron negocios sin página web en esta primera página de resultados.</p>";
    }
}

// Lógica de Inteligencia Asistencial del Gurú Comercial
function consultarGuruIA(nombreNegocio, tipoNegocio) {
    const chat = document.getElementById("chatGuru");
    
    // Asesoría personalizada según el perfil técnico del cliente
    let estrategia = `
        <div class="msg-ia">
            <strong>🧠 Gurú IA Asesorando sobre: ${nombreNegocio}</strong><br><br>
            <strong>1. Diagnóstico:</strong> Es un negocio local sin presencia digital propia. Todo su tráfico depende solo de la ficha de Google.<br>
            <strong>2. Oferta Irresistible:</strong> Véndeles un combo: <em>Landing Page Ultra-rápida + Agente IA de WhatsApp</em> para agendar citas automatizadas.<br>
            <strong>3. Script de Pitch Directo:</strong><br>
            <em>"Hola equipo de ${nombreNegocio}, vi sus excelentes reseñas en Google Maps, pero noté que no tienen un botón directo para recibir clientes las 24 horas. Les diseñé un prototipo de sitio web con un asistente de IA que atiende clientes por ustedes..."</em>
        </div>
    `;

    chat.innerHTML = estrategia + chat.innerHTML;
}

// Estructura de respuesta idéntica a la que entrega Google Places API
function obtenerDatosEjemploReal() {
    return [
        { name: "Taller Automotriz San José", formatted_address: "Av. Central 45, CDMX", rating: 4.8, user_ratings_total: 89, website: null, types: ["car_repair"] },
        { name: "Clínica Dental Sonrisas Sanas", formatted_address: "Calle Hidalgo 12, Guadalajara", rating: 4.5, user_ratings_total: 34, website: null, types: ["dentist"] },
        { name: "Restaurante Italia Viva", formatted_address: "Plaza Mayor 8, Monterrey", rating: 4.2, user_ratings_total: 120, website: "https://italiaviva.com", types: ["restaurant"] }
    ];
}
