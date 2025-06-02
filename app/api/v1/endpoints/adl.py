from typing import Any, Dict, List, Union
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
import yaml
import re

from app.crud.crud_setting import setting
from app.api import deps
from app.models.user import User

router = APIRouter()

def get_value_from_path(data: dict, path: str) -> Union[str, list, dict]:
    """
    Get a value from a nested dictionary using a dot-separated path.
    Handles special characters in keys by treating the entire segment as a key.
    """
    try:
        current = data
        # Split the path into parts, but keep everything after a '/' together
        parts = []
        current_path = ""
        
        # Use regex to split only on dots that are not preceded by '/'
        for part in re.split(r'(?<!/)\.', path):
            if current_path:
                # If we have a current_path, this part belongs to it
                current_path += "." + part
            elif "/" in part:
                # If this part contains a '/', start collecting a special path
                current_path = part
            else:
                # Normal part
                parts.append(part)
                
            # If we have a complete command path (no more dots expected)
            if current_path and not path.startswith(current_path + "."):
                parts.append(current_path)
                current_path = ""
                
        # Add any remaining path
        if current_path:
            parts.append(current_path)

        # Navigate through the dictionary
        for part in parts:
            current = current[part]
        return current
    except (KeyError, TypeError):
        raise HTTPException(
            status_code=404,
            detail=f"Path '{path}' not found in ADL configuration"
        )

@router.get("/value/{path:path}")
async def get_adl_value(
    *,
    db: AsyncSession = Depends(deps.get_db),
    path: str,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get a specific value from the ADL configuration using a dot-separated path.
    For example: 
    - assistant_instructions.style_guidelines.tone
    - assistant_instructions.tools.commands./DAFO
    - assistant_instructions.tools.commands./DAFO.description
    """
    # Obtener el ADL de la base de datos
    settings = await setting.get_multi(db)
    adl_setting = next((s for s in settings if s.key == 'Assistant ADL'), None)
    
    if not adl_setting or not adl_setting.value:
        raise HTTPException(
            status_code=404,
            detail="ADL configuration not found"
        )
    
    try:
        # Parsear el YAML
        adl_data = yaml.safe_load(adl_setting.value)
        
        # Obtener el valor específico usando el path
        result = get_value_from_path(adl_data, path)
        
        return {
            "path": path,
            "value": result
        }
        
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing ADL configuration: {str(e)}"
        )

@router.get("/commands")
async def list_commands(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    format: str = Query("full", description="Format of the response. Can be 'full', 'simple', or 'names'")
) -> Any:
    """
    List all available commands in the ADL.
    format can be:
    - 'full': Returns complete command information
    - 'simple': Returns command name and description
    - 'names': Returns only command names
    """
    # Obtener el ADL de la base de datos
    settings = await setting.get_multi(db)
    adl_setting = next((s for s in settings if s.key == 'Assistant ADL'), None)
    
    if not adl_setting or not adl_setting.value:
        raise HTTPException(
            status_code=404,
            detail="ADL configuration not found"
        )
    
    try:
        # Parsear el YAML
        adl_data = yaml.safe_load(adl_setting.value)
        
        # Obtener los comandos
        commands = get_value_from_path(adl_data, "assistant_instructions.tools.commands")
        
        if format == "names":
            return {
                "commands": list(commands.keys())
            }
        elif format == "simple":
            return {
                "commands": {
                    name: {
                        "display_name": cmd["display_name"],
                        "description": cmd["description"]
                    }
                    for name, cmd in commands.items()
                }
            }
        else:  # full
            return {
                "commands": commands
            }
        
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing ADL configuration: {str(e)}"
        )

@router.get("/options")
async def list_options(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    format: str = Query("full", description="Format of the response. Can be 'full', 'simple', or 'names'")
) -> Any:
    """
    List all available options in the ADL.
    format can be:
    - 'full': Returns complete option information
    - 'simple': Returns option name and description
    - 'names': Returns only option names
    """
    # Obtener el ADL de la base de datos
    settings = await setting.get_multi(db)
    adl_setting = next((s for s in settings if s.key == 'Assistant ADL'), None)
    
    if not adl_setting or not adl_setting.value:
        raise HTTPException(
            status_code=404,
            detail="ADL configuration not found"
        )
    
    try:
        # Parsear el YAML
        adl_data = yaml.safe_load(adl_setting.value)
        
        # Obtener las opciones
        try:
            options = get_value_from_path(adl_data, "assistant_instructions.tools.options")
        except HTTPException:
            # Si no se encuentra la ruta, devolver un objeto vacío
            return {"options": {}}
        
        if format == "names":
            return {
                "options": list(options.keys())
            }
        elif format == "simple":
            return {
                "options": {
                    name: {
                        "description": opt.get("description", "No description available")
                    }
                    for name, opt in options.items()
                }
            }
        else:  # full
            return {
                "options": options
            }
        
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing ADL configuration: {str(e)}"
        )

@router.get("/decorators")
async def list_decorators(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    format: str = Query("full", description="Format of the response. Can be 'full', 'simple', or 'names'")
) -> Any:
    """
    List all available decorators in the ADL.
    format can be:
    - 'full': Returns complete decorator information
    - 'simple': Returns decorator name and description
    - 'names': Returns only decorator names
    """
    # Obtener el ADL de la base de datos
    settings = await setting.get_multi(db)
    adl_setting = next((s for s in settings if s.key == 'Assistant ADL'), None)
    
    if not adl_setting or not adl_setting.value:
        raise HTTPException(
            status_code=404,
            detail="ADL configuration not found"
        )
    
    try:
        # Parsear el YAML
        adl_data = yaml.safe_load(adl_setting.value)
        
        # Obtener los decoradores
        try:
            decorators = get_value_from_path(adl_data, "assistant_instructions.tools.decorators")
        except HTTPException:
            # Si no se encuentra la ruta, devolver un objeto vacío
            return {"decorators": {}}
        
        if format == "names":
            return {
                "decorators": list(decorators.keys())
            }
        elif format == "simple":
            return {
                "decorators": {
                    name: {
                        "description": dec.get("description", "No description available")
                    }
                    for name, dec in decorators.items()
                }
            }
        else:  # full
            return {
                "decorators": decorators
            }
        
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing ADL configuration: {str(e)}"
        )

@router.get("/workflows")
async def list_workflows(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    format: str = Query("full", description="Format of the response. Can be 'full', 'simple', or 'names'")
) -> Any:
    """
    List all available workflows in the ADL.
    format can be:
    - 'full': Returns complete workflow information
    - 'simple': Returns workflow name and description
    - 'names': Returns only workflow names
    """
    # Obtener el ADL de la base de datos
    settings = await setting.get_multi(db)
    adl_setting = next((s for s in settings if s.key == 'Assistant ADL'), None)
    
    if not adl_setting or not adl_setting.value:
        raise HTTPException(
            status_code=404,
            detail="ADL configuration not found"
        )
    
    try:
        # Parsear el YAML
        adl_data = yaml.safe_load(adl_setting.value)
        
        # Obtener los workflows
        try:
            workflows = get_value_from_path(adl_data, "assistant_instructions.tools.workflows")
        except HTTPException:
            # Si no se encuentra la ruta, devolver un objeto vacío
            return {"workflows": []}
        
        # Convertir workflows a una lista si es un diccionario
        if isinstance(workflows, dict):
            workflows = [
                {
                    "id": key,
                    "display_name": workflow.get("display_name", key),
                    "description": workflow.get("description", "No description available"),
                    "sequence": workflow.get("sequence", [])
                }
                for key, workflow in workflows.items()
            ]
        elif not isinstance(workflows, list):
            workflows = []
        
        if format == "names":
            return {
                "workflows": [workflow.get("display_name") for workflow in workflows]
            }
        elif format == "simple":
            return {
                "workflows": [
                    {
                        "id": i,
                        "display_name": workflow.get("display_name", f"Workflow {i}"),
                        "description": workflow.get("description", "No description available")
                    }
                    for i, workflow in enumerate(workflows)
                ]
            }
        else:  # full
            return {
                "workflows": [
                    {
                        "id": i,
                        "display_name": workflow.get("display_name", f"Workflow {i}"),
                        "description": workflow.get("description", "No description available"),
                        "sequence": workflow.get("sequence", [])
                    }
                    for i, workflow in enumerate(workflows)
                ]
            }
        
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing ADL configuration: {str(e)}"
        )

@router.get("/download", response_class=Response)
async def download_adl_yaml(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Download the Assistant ADL configuration as a YAML file.
    """
    try:
        # Buscar la configuración ADL
        settings_list = await setting.get_multi(db)
        adl_setting = next((s for s in settings_list if s.key == "Assistant ADL"), None)
        
        if not adl_setting or not adl_setting.value:
            raise HTTPException(
                status_code=404,
                detail="Assistant ADL configuration not found"
            )
        
        # Obtener el contenido YAML
        yaml_content = adl_setting.value
        
        # Crear una respuesta con el contenido YAML
        response = Response(
            content=yaml_content,
            media_type="text/yaml"
        )
        
        # Intentar extraer el título del YAML para usarlo como nombre de archivo
        # Si no se puede, usar un nombre predeterminado
        try:
            yaml_data = yaml.safe_load(yaml_content)
            title = yaml_data.get("metadata", {}).get("description", {}).get("title", "assistant")
            sanitized_title = "".join(c if c.isalnum() else "_" for c in title).lower()
            filename = f"{sanitized_title}.yaml"
        except Exception:
            filename = "assistant.yaml"
        
        # Establecer el encabezado Content-Disposition para la descarga
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        
        # Agregar cabeceras de seguridad para prevenir el almacenamiento en caché
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error downloading ADL configuration: {str(e)}"
        )
