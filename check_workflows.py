import yaml
import asyncio
from app.db.session import AsyncSessionLocal
from app.crud import setting

async def get_adl():
    async with AsyncSessionLocal() as db:
        settings = await setting.get_multi(db)
        adl_setting = next((s for s in settings if s.key == 'Assistant ADL'), None)
        
        if adl_setting and adl_setting.value:
            adl_data = yaml.safe_load(adl_setting.value)
            workflows = adl_data.get('assistant_instructions', {}).get('tools', {}).get('workflows', {})
            print('Workflows encontrados:', len(workflows))
            print(yaml.dump(workflows, default_flow_style=False))
        else:
            print('No se encontró configuración ADL')

asyncio.run(get_adl())
