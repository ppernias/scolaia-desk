import asyncio
import httpx
import json

async def check_endpoints():
    # Datos de login - usando formato de formulario para OAuth2
    login_data = {
        "username": "p.pernias@gmail.com",
        "password": "password"
    }
    
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Autenticación - usando formato de formulario para OAuth2
        login_response = await client.post("/api/v1/auth/login", data=login_data)
        
        if login_response.status_code != 200:
            print(f"Error de autenticación: {login_response.status_code}")
            print(login_response.text)
            return
        
        # Obtener token
        token_data = login_response.json()
        token = token_data.get("access_token")
        
        if not token:
            print("No se pudo obtener el token de acceso")
            return
        
        # Configurar headers con el token
        headers = {"Authorization": f"Bearer {token}"}
        
        # Consultar endpoints ADL
        endpoints = [
            "/api/v1/adl/commands",
            "/api/v1/adl/options",
            "/api/v1/adl/decorators",
            "/api/v1/adl/workflows"
        ]
        
        for endpoint in endpoints:
            print(f"\n=== Consultando {endpoint} ===")
            response = await client.get(endpoint, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(json.dumps(data, indent=2))
            else:
                print(f"Error {response.status_code}: {response.text}")

asyncio.run(check_endpoints())
