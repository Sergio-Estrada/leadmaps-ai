// Simulación de datos que vendrían de Google Maps
const listaNegocios = [
    { nombre: "Taller Mecánico El Rayo", telefono: "555-0192", website: null, direccion: "Calle 10 #45" },
    { nombre: "Restaurante La Casserole", telefono: "555-0143", website: "https://lacasserole.com", direccion: "Av. Central 12" },
    { nombre: "Clínica Dental Sonrisas", telefono: "555-0188", website: "", direccion: "Plaza Mayor Local 4" },
    { nombre: "Estética Canina Pelusa", telefono: "555-0111", website: null, direccion: "Calle Hidalgo 88" }
];

function buscarLeads() {
    const contenedor = document.getElementById("lista-leads");
    contenedor.innerHTML = ""; // Limpiar pantalla

    // Filtrar solo los que NO tienen página web (Lead Premium)
    const leadsPremium = listaNegocios.filter(negocio => !negocio.website);

    // Dibujar cada negocio en la página
    leadsPremium.forEach(lead => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta-lead";
        tarjeta.innerHTML = `
            <h3>🔥 ${lead.nombre} (Lead Premium)</h3>
            <p><strong>📍 Dirección:</strong> ${lead.direccion}</p>
            <p><strong>📞 Teléfono:</strong> ${lead.telefono}</p>
            <p><strong>🌐 Sitio Web:</strong> ❌ No tiene página web</p>
            <button onclick="generarPropuestaIA('${lead.nombre}')">🤖 Generar Propuesta con IA</button>
        `;
        contenedor.appendChild(tarjeta);
    });
}

function generarPropuestaIA(nombreNegocio) {
    alert(`🤖 Tu Agente de IA está redactando la oferta para: ${nombreNegocio}`);
}
