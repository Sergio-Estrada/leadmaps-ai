// Configuración de la API de Gemini
const GEMINI_API_KEY = "AQ.Ab8RN6LOGPa_guvWSfT8n1VVP-uvX-ARhb-Z_5l1vtV6grrrkg"; // Obtén tu API Key gratuita en Google AI Studio

// Reconocimiento de Voz (Web Speech API)
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor;

if (Recognition) {
    reconocedor = new Recognition();
    reconocedor.lang = 'es-MX'; // Configurado para español
    reconocedor.continuous = false;

    reconocedor.onresult = (event) => {
        const textoVoz = event.results[0][0].transcript;
        document.getElementById("preguntaAgente").value = textoVoz;
        enviarAGemini(); // Envía automáticamente al terminar de hablar
    };

    reconocedor.onerror = (event) => {
        console.error("Error en reconocimiento de voz:", event.error);
    };
} else {
    alert("Tu navegador no soporta entrada de voz nativa.");
}

function escucharVoz() {
    if (reconocedor) {
        reconocedor.start();
        document.getElementById("status").innerText = "🎙️ Escuchando...";
    }
}

// Llamada directa a la API de Gemini
async function enviarAGemini() {
    const input = document.getElementById("preguntaAgente");
    const pregunta = input.value.trim();
    if (!pregunta) return;

    agregarMensajeUsuario(pregunta);
    input.value = "";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Eres un experto en ventas de leads. Responde brevemente: ${pregunta}` }]
                }]
            })
        });

        const data = await response.json();
        const respuestaTexto = data.candidates[0].content.parts[0].text;

        agregarMensajeIA(respuestaTexto);
        reproducirVoz(respuestaTexto); // Respuesta en audio

    } catch (error) {
        agregarMensajeIA("⚠️ Ocurrió un error al conectar con Gemini. Revisa tu API Key.");
    }
}

// Sintetizador de voz para que Gemini hable de vuelta
function reproducirVoz(texto) {
    if ('speechSynthesis' in window) {
        const locucion = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>?/gm, ''));
        locucion.lang = 'es-MX';
        window.speechSynthesis.speak(locucion);
    }
}
