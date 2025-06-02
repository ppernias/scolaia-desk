import yaml
import asyncio
from app.db.session import AsyncSessionLocal
from app.crud import setting

async def check_adl_structure():
    async with AsyncSessionLocal() as db:
        settings = await setting.get_multi(db)
        adl_setting = next((s for s in settings if s.key == 'Assistant ADL'), None)
        
        if not adl_setting or not adl_setting.value:
            print("ADL configuration not found")
            return
        
        try:
            # Parsear el YAML
            adl_data = yaml.safe_load(adl_setting.value)
            
            # Verificar la estructura completa
            print("Estructura del ADL:")
            print(yaml.dump(adl_data, default_flow_style=False))
            
            # Verificar si existe la ruta assistant_instructions.tools.workflows
            try:
                if 'assistant_instructions' in adl_data and \
                   'tools' in adl_data['assistant_instructions'] and \
                   'workflows' in adl_data['assistant_instructions']['tools']:
                    
                    workflows = adl_data['assistant_instructions']['tools']['workflows']
                    print("\nWorkflows encontrados:")
                    print(yaml.dump(workflows, default_flow_style=False))
                    
                    if isinstance(workflows, list):
                        print(f"\nNu00famero de workflows (como lista): {len(workflows)}")
                    elif isinstance(workflows, dict):
                        print(f"\nNu00famero de workflows (como diccionario): {len(workflows)}")
                        print("Claves del diccionario de workflows:")
                        print(list(workflows.keys()))
                    else:
                        print(f"\nWorkflows es de tipo: {type(workflows)}")
                else:
                    print("\nNo se encontru00f3 la ruta 'assistant_instructions.tools.workflows' en el ADL")
                    
                    # Verificar si existen otras rutas
                    if 'assistant_instructions' in adl_data:
                        if 'tools' in adl_data['assistant_instructions']:
                            print("\nClaves disponibles en 'assistant_instructions.tools':")
                            print(list(adl_data['assistant_instructions']['tools'].keys()))
                        else:
                            print("\nNo existe 'tools' en 'assistant_instructions'")
                    else:
                        print("\nNo existe 'assistant_instructions' en el ADL")
            except Exception as e:
                print(f"\nError al verificar la estructura: {str(e)}")
                
        except yaml.YAMLError as e:
            print(f"Error parsing ADL configuration: {str(e)}")

asyncio.run(check_adl_structure())
