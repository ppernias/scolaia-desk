import requests
import json

def check_workflow_response():
    # Primero obtener un token de autenticación
    login_data = {
        'username': 'p.pernias@gmail.com',
        'password': 'TMm17ctsj.'  # Contraseña proporcionada por el usuario
    }
    
    login_response = requests.post('http://localhost:8000/api/v1/auth/login', data=login_data)
    
    if login_response.status_code != 200:
        print(f"Error de autenticación: {login_response.status_code}")
        print(login_response.text)
        return
    
    token_data = login_response.json()
    token = token_data.get("access_token")
    
    if not token:
        print("No se pudo obtener el token de acceso")
        return
    
    # Configurar headers con el token
    headers = {"Authorization": f"Bearer {token}"}
    
    # Acceder al endpoint con autenticación
    response = requests.get('http://localhost:8000/api/v1/adl/workflows', headers=headers)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print("\nResponse Data:")
            print(json.dumps(data, indent=2))
            
            # Verificar la estructura de la respuesta
            if 'workflows' in data:
                workflows = data['workflows']
                print(f"\nNúmero de workflows: {len(workflows)}")
                
                if len(workflows) > 0:
                    print("\nPrimer workflow:")
                    print(json.dumps(workflows[0], indent=2))
                    
                    # Verificar si tiene los campos necesarios
                    if isinstance(workflows[0], dict):
                        required_fields = ['id', 'display_name', 'description']
                        missing_fields = [field for field in required_fields if field not in workflows[0]]
                        
                        if missing_fields:
                            print(f"\nCampos faltantes en el workflow: {', '.join(missing_fields)}")
                        else:
                            print("\nEl workflow tiene todos los campos requeridos")
                    else:
                        print(f"\nEl workflow no es un objeto, es un {type(workflows[0])}")
            else:
                print("\nLa respuesta no contiene la propiedad 'workflows'")
                
        except json.JSONDecodeError:
            print("\nLa respuesta no es un JSON válido")
            print(f"Contenido: {response.text}")
    else:
        print(f"\nError: {response.text}")

if __name__ == "__main__":
    check_workflow_response()
