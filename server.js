const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// CONFIGURACIÓN DE APIS (Coloca tus claves)
const APIFY_TOKEN = 'TU_APIFY_API_TOKEN'; // Obtener gratis en apify.com

app.post('/api/buscar-leads-premium', async (req, res) => {
    const { ciudad, categoria, geminiApiKey } = req.body;

    if (!ciudad || !categoria || !geminiApiKey) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (ciudad, categoria o geminiApiKey).' });
    }

    try {
        console.log(`[1/3] Iniciando rastreo web profundo para ${categoria} en ${ciudad}...`);

        // 1. Iniciar Actor de Apify para Scraping de Google Maps & Redes Sociales
        const apifyUrl = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
        
        const apifyPayload = {
            searchStringsArray: [`${categoria} en ${ciudad}`],
            maxCrawledPlacesPerSearch: 10,
            scrapeSocialMediaProfiles: true // Extrae Facebook, Instagram y WhatsApp
        };

        const apifyResponse = await fetch(apifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apifyPayload)
        });

        const rawLeads = await apifyResponse.json();

        if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
            return res.json({ leads: [] });
        }

        console.log(`[2/3] Procesando ${rawLeads.length} prospectos encontrados...`);

        // 2. Formatear y Enriquecer los datos
        const leadsEnriquecidos = rawLeads.map(item => {
            const tieneWeb = Boolean(item.website && !item.website.includes('facebook.com') && !item.website.includes('instagram.com'));
            const whatsapp = item.phone || item.additionalPhones?.[0] || 'No detectado';
            
            return {
                nombre: item.title || 'Sin Nombre',
                telefono: whatsapp,
                whatsappUrl: whatsapp !== 'No detectado' ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : null,
                direccion: item.address || `${ciudad}, México`,
                websiteUrl: item.website || 'Sin sitio web',
                tieneWeb: tieneWeb,
                facebook: item.socialMediaProfiles?.facebook || null,
                instagram: item.socialMediaProfiles?.instagram || null,
                googleMapsUrl: item.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + ' ' + ciudad)}`
            };
        });

        // 3. Evaluar Clasificación Premium con Gemini 3.6 Flash
        console.log(`[3/3] Analizando prospectos con Gemini 3.6 Flash...`);
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`;

        const promptClasificacion = `Analiza estos prospectos comerciales y califica cuáles son "PREMIUM" (Negocios con buena presencia telefónica/social pero SIN sitio web propio o con web obsoleta): ${JSON.stringify(leadsEnriquecidos)}. Devuelve solo el arreglo formateado.`;

        const geminiRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptClasificacion }] }]
            })
        });

        const geminiData = await geminiRes.json();

        res.json({
            leads: leadsEnriquecidos,
            analisisIA: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Análisis completado."
        });

    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error interno ejecutando el rastreo web.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Rastreador B2B corriendo en http://localhost:${PORT}`);
});
