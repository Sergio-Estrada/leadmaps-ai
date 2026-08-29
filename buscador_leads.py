import json

# Simulación de respuesta de datos de Google Maps
negocios_encontrados = [
    {"nombre": "Taller Mecánico El Rayo", "telefono": "555-0192", "website": None, "direccion": "Calle 10 #45"},
    {"nombre": "Restaurante La Casserole", "telefono": "555-0143", "website": "https://lacasserole.com", "direccion": "Av. Central 12"},
    {"nombre": "Clínica Dental Sonrisas", "telefono": "555-0188", "website": "", "direccion": "Plaza Mayor Local 4"},
    {"nombre": "Estética Canina Pelusa", "telefono": "555-0111", "website": None, "direccion": "Calle Hidalgo 88"}
]

def filtrar_leads_premium(lista_negocios):
    leads_premium = []
    for negocio in lista_negocios:
        # Si el campo website está vacío o no existe
        if not negocio.get("website"):
            leads_premium.append(negocio)
    return leads_premium

# Ejecutar el filtro
resultados = filtrar_leads_premium(negocios_encontrados)

# Mostrar los leads cualificados
print(f"--- LEADS PREMIUM ENCONTRADOS ({len(resultados)}) ---")
print(json.dumps(resultados, indent=4, ensure_ascii=False))
