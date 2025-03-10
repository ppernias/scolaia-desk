from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.crud import setting as setting_crud
from app.schemas.setting import SettingCreate
from openai import OpenAI
from app.schemas.assistant import AssistantList, AssistantCreate, Assistant
from app.core.openai_settings import get_openai_settings
from app.api.v1.endpoints.adl import get_value_from_path

router = APIRouter()

# Encabezado para la API v2 de Assistants
ASSISTANTS_V2_HEADERS = {"OpenAI-Beta": "assistants=v2"}

async def get_openai_client(db: AsyncSession) -> OpenAI:
    """
    Get OpenAI client with API key from settings
    """
    settings = await get_openai_settings(db)
    api_key = settings.get("OPENAI_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not found in settings"
        )
    
    # Crear el cliente OpenAI
    return OpenAI(api_key=api_key)

@router.get("/list", response_model=AssistantList)
async def list_assistants(
    limit: int = 20,
    db: AsyncSession = Depends(deps.get_db)
):
    """
    List existing assistants in the OpenAI account.
    """
    try:
        openai_client = await get_openai_client(db)
        response = openai_client.beta.assistants.list(
            order="desc",
            limit=limit,
            extra_headers=ASSISTANTS_V2_HEADERS
        )
        
        return {
            "data": [
                {
                    "id": assistant.id,
                    "name": assistant.name,
                    "model": assistant.model,
                    "created_at": assistant.created_at
                } for assistant in response.data
            ],
            "message": "Assistants listed successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing assistants: {str(e)}"
        )

@router.post("/create", response_model=Assistant)
async def create_assistant(
    yaml_data: Dict[Any, Any],
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Create a new assistant in OpenAI using the validated YAML data.
    """
    try:
        # Get OpenAI configuration
        settings = await get_openai_settings(db)
        
        # Check if model exists in settings
        model = settings.get("model")
        if not model:
            raise HTTPException(
                status_code=400,
                detail="OpenAI model not found in settings. Please configure the model in settings."
            )
        
        # Extract name and instructions from YAML
        try:
            # If data is wrapped in yaml_data, extract it
            if isinstance(yaml_data, dict) and "yaml_data" in yaml_data:
                yaml_data = yaml_data["yaml_data"]
            
            # Extract name using get_value_from_path
            try:
                name = get_value_from_path(yaml_data, "metadata.description.title")
            except HTTPException:
                raise KeyError("Assistant title not found in metadata.description.title")
                
            # Extract description using get_value_from_path
            try:
                description = get_value_from_path(yaml_data, "metadata.description.summary")
            except HTTPException:
                description = None  # Description is optional
            
            # Convert entire YAML to string for instructions
            import json
            instructions = json.dumps(yaml_data, ensure_ascii=False, indent=2)
            
        except KeyError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error in YAML structure: {str(e)}"
            )
        
        # Create the assistant
        create_params = {
            "instructions": instructions,
            "name": name,
            "tools": [{"type": "code_interpreter"}, {"type": "file_search"}],
            "model": model
            # Note: temperature is not supported in the Assistants API
        }
        
        # Add description only if present
        if description is not None:
            create_params["description"] = description
        
        # Create the assistant
        openai_client = await get_openai_client(db)
        assistant = openai_client.beta.assistants.create(
            **create_params,
            extra_headers=ASSISTANTS_V2_HEADERS
        )
        
        # Update assistant settings
        assistant_settings = [
            {
                "category": "OpenAI",
                "key": "assistant_id",
                "value": assistant.id,
                "is_encrypted": False
            },
            {
                "category": "OpenAI",
                "key": "assistant_name",
                "value": assistant.name,
                "is_encrypted": False
            },
            {
                "category": "OpenAI",
                "key": "assistant_model",
                "value": assistant.model,
                "is_encrypted": False
            }
        ]
        
        # Create or update each setting
        for setting_data in assistant_settings:
            existing_setting = await setting_crud.get_by_category_and_key(
                db, 
                category=setting_data["category"], 
                key=setting_data["key"]
            )
            
            if existing_setting:
                await setting_crud.update(
                    db,
                    db_obj=existing_setting,
                    obj_in={"value": setting_data["value"]}
                )
            else:
                await setting_crud.create(db, obj_in=SettingCreate(**setting_data))
        
        await db.commit()
        
        return {
            "id": assistant.id,
            "name": assistant.name,
            "model": assistant.model,
            "created_at": assistant.created_at,
            "message": f"✅ Assistant '{assistant.name}' created successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating assistant: {str(e)}"
        )

@router.put("/update/{assistant_id}", response_model=Assistant)
async def update_assistant(
    assistant_id: str,
    yaml_data: Dict[Any, Any],
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Update an existing assistant in OpenAI using the validated YAML data.
    """
    try:
        # If data is wrapped in yaml_data, extract it
        if isinstance(yaml_data, dict) and "yaml_data" in yaml_data:
            yaml_data = yaml_data["yaml_data"]
            
        # Extract name and instructions from YAML
        try:
            # Extract name using get_value_from_path
            try:
                name = get_value_from_path(yaml_data, "metadata.description.title")
            except HTTPException:
                raise KeyError("Assistant title not found in metadata.description.title")
                
            # Extract description using get_value_from_path
            try:
                description = get_value_from_path(yaml_data, "metadata.description.summary")
            except HTTPException:
                description = None  # Description is optional
            
            # Convert entire YAML to string for instructions
            import json
            instructions = json.dumps(yaml_data, ensure_ascii=False, indent=2)
            
        except KeyError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error in YAML structure: {str(e)}"
            )

        # Create parameters for the assistant
        update_params = {
            "name": name,
            "instructions": instructions,
            "model": "gpt-4-turbo-preview"  # Using the latest model
        }

        # Add description if present
        if description is not None:
            update_params["description"] = description

        # Update the assistant
        openai_client = await get_openai_client(db)
        assistant = openai_client.beta.assistants.update(
            assistant_id, 
            **update_params,
            extra_headers=ASSISTANTS_V2_HEADERS
        )
        
        # Update assistant settings
        assistant_settings = [
            {
                "category": "OpenAI",
                "key": "assistant_name",
                "value": assistant.name,
                "is_encrypted": False
            },
            {
                "category": "OpenAI",
                "key": "assistant_model",
                "value": assistant.model,
                "is_encrypted": False
            }
        ]
        
        # Update each setting
        for setting_data in assistant_settings:
            existing_setting = await setting_crud.get_by_category_and_key(
                db, 
                category=setting_data["category"], 
                key=setting_data["key"]
            )
            
            if existing_setting:
                await setting_crud.update(
                    db,
                    db_obj=existing_setting,
                    obj_in={"value": setting_data["value"]}
                )
        
        await db.commit()
        
        return {
            "id": assistant.id,
            "name": assistant.name,
            "model": assistant.model,
            "created_at": assistant.created_at,
            "message": f"✅ Assistant '{assistant.name}' updated successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating assistant: {str(e)}"
        )

@router.delete("/delete/{assistant_id}")
async def delete_assistant(
    assistant_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
):
    """
    Delete an assistant from OpenAI and remove its settings
    """
    try:
        # Verificar que tenemos las credenciales de OpenAI
        settings = await get_openai_settings(db)
        if not settings.get("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not found in settings"
            )

        # Try to delete from OpenAI, but don't fail if it doesn't exist
        try:
            openai_client = await get_openai_client(db)
            response = openai_client.beta.assistants.delete(
                assistant_id,
                extra_headers=ASSISTANTS_V2_HEADERS
            )
        except Exception as e:
            # Si el error es que no se encuentra el asistente, continuamos
            if "No assistant found" in str(e):
                pass
            else:
                # Si es otro tipo de error, lo propagamos
                raise HTTPException(
                    status_code=500,
                    detail=f"Error deleting assistant from OpenAI: {str(e)}"
                )

        # Always clean up our local settings
        assistant_settings = [
            {'category': 'OpenAI', 'key': 'assistant_id'},
            {'category': 'OpenAI', 'key': 'assistant_name'},
            {'category': 'OpenAI', 'key': 'assistant_model'},
        ]
        for setting in assistant_settings:
            setting_obj = await setting_crud.get_by_category_and_key(db, category=setting['category'], key=setting['key'])
            if setting_obj:
                await setting_crud.remove(db, id=setting_obj.id)

        return {
            "message": "Assistant deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting assistant: {str(e)}"
        )

@router.delete("/purge-assistant-settings")
async def purge_assistant_settings(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Purge all assistant-related settings from the database
    """
    try:
        from sqlalchemy import and_, or_
        from sqlalchemy.future import select
        from app.models.setting import Setting
        
        # Crear condición OR para todos los settings a borrar
        conditions = []
        assistant_settings = [
            {'category': 'OpenAI', 'key': 'assistant_id'},
            {'category': 'OpenAI', 'key': 'assistant_name'},
            {'category': 'OpenAI', 'key': 'assistant_model'},
            {'category': 'System', 'key': 'Assistant ADL'}
        ]
        
        for setting in assistant_settings:
            conditions.append(
                and_(
                    Setting.category == setting['category'],
                    Setting.key == setting['key']
                )
            )
        
        # Buscar todos los settings que coincidan
        result = await db.execute(
            select(Setting).where(or_(*conditions))
        )
        settings = result.scalars().all()
        
        # Borrar los settings encontrados
        settings_removed = []
        for setting in settings:
            settings_removed.append(f"{setting.category}.{setting.key}")
            await db.delete(setting)
        
        await db.commit()
        
        if settings_removed:
            return {
                "message": f"Successfully removed settings: {', '.join(settings_removed)}"
            }
        else:
            return {
                "message": "No assistant settings found to remove"
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error purging assistant settings: {str(e)}"
        )

@router.delete("/flush-assistant-settings")
async def flush_assistant_settings(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Flush all assistant-related settings from the database, including System settings
    """
    try:
        from sqlalchemy import and_, or_
        from sqlalchemy.future import select
        from app.models.setting import Setting
        
        # Crear condición OR para todos los settings a borrar
        conditions = []
        assistant_settings = [
            {'category': 'OpenAI', 'key': 'assistant_id'},
            {'category': 'OpenAI', 'key': 'assistant_name'},
            {'category': 'OpenAI', 'key': 'assistant_model'},
            {'category': 'System', 'key': 'Assistant ADL'}
        ]
        
        for setting in assistant_settings:
            conditions.append(
                and_(
                    Setting.category == setting['category'],
                    Setting.key == setting['key']
                )
            )
        
        # Buscar todos los settings que coincidan
        result = await db.execute(
            select(Setting).where(or_(*conditions))
        )
        settings = result.scalars().all()
        
        # Borrar los settings encontrados
        settings_removed = []
        for setting in settings:
            settings_removed.append(f"{setting.category}.{setting.key}")
            await db.delete(setting)
        
        await db.commit()
        
        if settings_removed:
            return {
                "message": f"Successfully removed settings: {', '.join(settings_removed)}"
            }
        else:
            return {
                "message": "No assistant settings found to remove"
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error flushing assistant settings: {str(e)}"
        )
