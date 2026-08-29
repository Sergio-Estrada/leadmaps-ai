import os
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType

# 1. Herramienta de conexión a la web en tiempo real (Nativa y gratuita)
herramienta_busqueda_web = DuckDuckGoSearchRun()

# 2. Definición del cerebro de tu Agente personalizado
# Configuras el modelo para que actúe como tu Gurú y asistente multitarea
llm = ChatOpenAI(
    temperature=0.3, 
    model_name="gpt-4o", 
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

# Lista de habilidades/herramientas que el agente sabe usar
herramientas = [herramienta_busqueda_web]

# 3. Inicialización del Agente con Capacidad de Razonamiento
agente_personal = initialize_agent(
    tools=herramientas,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True, # Muestra en consola cómo piensa y qué busca en tiempo real
    handle_parsing_errors=True
)

def ejecutar_orden(instruccion):
    print(f"\n🤖 Recibiendo orden: '{instruccion}'")
    
    contexto_agente = f"""
    Eres el Agente Gurú Experto del usuario. Tu trabajo es:
    - Buscar en la web si necesitas información actualizada.
    - Analizar, redactar, programar o resolver cualquier problema que se te pida.
    - Entregar respuestas estructuradas, directas y listas para usar.
    
    Orden del usuario: {instruccion}
    """
    
    respuesta = agente_personal.run(contexto_agente)
    return respuesta

# --- Prueba de ejecución en tiempo real ---
if __name__ == "__main__":
    # Ejemplo de tarea: buscar información real en la web y resolver un problema
    orden = "Busca las últimas tendencias en herramientas de IA para prospección en 2026 y créame un resumen ejecutable."
    resultado = ejecutar_orden(orden)
    print("\n✅ RESULTADO DEL AGENTE:\n", resultado)
