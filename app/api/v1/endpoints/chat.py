"""
Chat Endpoints Module

This module implements the chat functionality using OpenAI's API, providing endpoints for
thread management, message handling, and file processing. It integrates with OpenAI's
assistant API to provide intelligent responses and document analysis capabilities.

The module implements proper error handling, rate limiting awareness, and secure
file processing for various document types.
"""

from typing import Any, Optional, Dict, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import time
import json
import asyncio
import openai
import tempfile
import os
import textract
from pathlib import Path

from app.api import deps
from app.models.user import User
from app.schemas.chat import ChatMessage, ChatResponse, Thread
from app.core.openai_client import get_openai_client
from app.core.openai_settings import get_openai_settings
from app.crud.crud_setting import setting as setting_crud

router = APIRouter()

async def get_assistant_adl(db: AsyncSession) -> Optional[str]:
    """
    Gets the ADL (Assistant Definition Language) of the assistant from the database.
    
    Args:
        db: Database session
        
    Returns:
        str: The assistant's ADL or None if not configured
    """
    adl_setting = await setting_crud.get_by_category_and_key(db, category="System", key="Assistant ADL")
    return adl_setting.value if adl_setting else None

@router.post("/thread", response_model=Thread)
async def create_thread(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new chat thread for conversation management.

    This endpoint initializes a new thread in the OpenAI API for maintaining
    conversation context and history.

    Args:
        db: Database session for settings and user management
        current_user: Authenticated user making the request

    Returns:
        Thread: New thread object containing id and metadata

    Raises:
        HTTPException:
            - 401 for invalid API key
            - 429 for rate limit exceeded
            - 500 for unexpected errors

    Notes:
        - Each thread maintains its own conversation context
        - Threads are persistent in OpenAI's system
        - Rate limits apply to thread creation
    """
    try:
        client = await get_openai_client(db)
        thread = await client.ChatCompletion.create()
        return Thread(
            id=thread.id,
            created_at=thread.created_at,
            metadata=thread.metadata
        )
    except openai.AuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Invalid OpenAI API key"
        )
    except openai.RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="OpenAI API rate limit exceeded"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating thread: {str(e)}"
        )

@router.post("/message", response_model=ChatResponse)
async def send_message(
    *,
    db: AsyncSession = Depends(deps.get_db),
    thread_id: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Send a message to the chat assistant and receive a response.

    This endpoint handles the core chat functionality, managing message threads,
    assistant interactions, and response processing.

    Args:
        db: Database session for settings and user management
        thread_id: ID of the thread to send the message to
        message: Chat message content
        file: Uploaded file object
        current_user: Authenticated user making the request

    Returns:
        ChatResponse: Assistant's response including message content and metadata

    Raises:
        HTTPException:
            - 400 if no assistant is configured
            - 401 for authentication errors
            - 429 for rate limit exceeded
            - 500 for processing errors or timeouts

    Notes:
        - Creates a new thread if thread_id is not provided
        - Implements timeout after 30 seconds of waiting
        - Handles various assistant run statuses
        - Maintains conversation context within threads
    """
    try:
        client = await get_openai_client(db)
        settings = await get_openai_settings(db)
        assistant_id = settings.get("assistant_id")
        
        if not assistant_id:
            raise HTTPException(
                status_code=400,
                detail="No assistant configured"
            )

        # Process the file if it exists
        file_content = None
        if file:
            try:
                # Create a temporary directory if it does not exist
                temp_dir = Path("/tmp/scolaia")
                temp_dir.mkdir(exist_ok=True)
                
                # Save the file temporarily
                temp_file_path = temp_dir / file.filename
                try:
                    content = await file.read()
                    temp_file_path.write_bytes(content)
                    
                    # Extract text using textract
                    text = textract.process(str(temp_file_path)).decode('utf-8')
                    # Clean the text
                    text = text.strip()
                    if text:
                        file_content = f"text to analyze[\n{text}\n]"
                    else:
                        raise ValueError("Could not extract text from the file")
                        
                finally:
                    # Clean up the temporary file
                    if temp_file_path.exists():
                        temp_file_path.unlink()
                        
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error processing the file: {str(e)}"
                )

        # Create thread if not provided
        if not thread_id:
            thread = await client.ChatCompletion.create()
            thread_id = thread.id

        # Create the message with the file content if it exists
        message_content = message or ""
        if file_content:
            message_content = f"{message_content}\n\n{file_content}".strip()
            
        if not message_content:
            raise HTTPException(
                status_code=400,
                detail="A message or a file with extractable content is required"
            )

        # Add the message to the thread
        await client.ChatCompletion.create(
            thread_id=thread_id,
            role="user",
            content=message_content
        )

        # Run the assistant
        run = await client.ChatCompletion.create(
            thread_id=thread_id,
            assistant_id=assistant_id
        )

        # Wait for the run to complete
        max_attempts = 60  # 30 seconds maximum
        for _ in range(max_attempts):
            run_status = await client.ChatCompletion.retrieve(
                thread_id=thread_id,
                run_id=run.id
            )
            if run_status.status == "completed":
                break
            elif run_status.status in ["failed", "cancelled", "expired"]:
                raise HTTPException(
                    status_code=500,
                    detail=f"Assistant run failed with status: {run_status.status}"
                )
            await asyncio.sleep(0.5)
        else:
            raise HTTPException(
                status_code=504,
                detail="Assistant response timeout"
            )

        # Get the latest message
        messages = await client.ChatCompletion.list(thread_id=thread_id)
        if not messages.data:
            raise HTTPException(
                status_code=500,
                detail="No response received from assistant"
            )

        latest_message = messages.data[0]
        if not latest_message.content:
            raise HTTPException(
                status_code=500,
                detail="Empty response from assistant"
            )

        return ChatResponse(
            thread_id=thread_id,
            response=latest_message.content[0].text.value,
            status="completed"
        )

    except openai.AuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Invalid OpenAI API key"
        )
    except openai.RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="OpenAI API rate limit exceeded"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing message: {str(e)}"
        )

@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Process and extract text content from uploaded files.

    This endpoint handles file uploads, processes various document types,
    and extracts their text content for analysis.

    Args:
        file: Uploaded file object
        db: Database session for settings and user management
        current_user: Authenticated user making the request

    Returns:
        dict: Extracted text content and processing metadata

    Raises:
        HTTPException:
            - 400 for unsupported file types
            - 500 for file processing errors

    Notes:
        - Supports multiple document formats via textract
        - Implements secure temporary file handling
        - Processes files asynchronously when possible
        - Cleans up temporary files after processing
    """
    allowed_extensions = {
        '.txt', '.pdf', '.doc', '.docx', '.ppt', '.pptx',
        '.py', '.js', '.java', '.cpp', '.c', '.cs', '.php',
        '.rb', '.go', '.rs', '.swift', '.kt', '.ts', '.html',
        '.css', '.sql'
    }
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            
            # Extract text based on file type
            try:
                if file_ext in ['.py', '.js', '.java', '.cpp', '.c', '.cs', '.php', 
                              '.rb', '.go', '.rs', '.swift', '.kt', '.ts', '.html',
                              '.css', '.sql', '.txt']:
                    # For text files, read directly
                    with open(temp_file.name, 'r', encoding='utf-8') as f:
                        text = f.read()
                else:
                    # For binary files, use textract
                    text = textract.process(temp_file.name).decode('utf-8')
                
                return {"text": text}
            
            finally:
                # Clean up temp file
                os.unlink(temp_file.name)
                
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@router.post("/extract-text")
async def extract_text(
    files: list[UploadFile] = File(..., alias="files[]"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Extract text from uploaded files
    """
    try:
        # Verify that the user is approved
        if not current_user.is_approved:
            raise HTTPException(
                status_code=403,
                detail="Your account is pending approval. Please wait for administrator approval."
            )
        
        all_text = ""
        file_names = []
        
        for file in files:
            print(f"Processing file: {file.filename}, content_type: {file.content_type}")
            file_names.append(file.filename)
            
            # Verify the file type
            allowed_types = [
                "application/pdf", 
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain",
                "application/octet-stream"  # For files without a specific type
            ]
            
            content_type = file.content_type
            print(f"File content type: {content_type}")
            
            # If it's text/plain or doesn't have a specific type, process it directly
            if content_type == "text/plain" or content_type == "application/octet-stream":
                content = await file.read()
                try:
                    text = content.decode("utf-8")
                except UnicodeDecodeError:
                    # Try with other encodings if utf-8 fails
                    try:
                        text = content.decode("latin-1")
                    except:
                        text = content.decode("utf-8", errors="ignore")
                
                print(f"Extracted text directly from {file.filename}")
                all_text += f"\n\n--- Content from {file.filename} ---\n{text}"
            
            # For other file types, use textract
            elif content_type in allowed_types:
                # Save the file temporarily
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                    content = await file.read()
                    temp_file.write(content)
                    temp_path = temp_file.name
                    print(f"Saved temporary file at: {temp_path}")
                
                try:
                    # Extract text from the document using textract
                    print(f"Extracting text from {temp_path} using textract")
                    text = textract.process(temp_path).decode("utf-8", errors="ignore")
                    print(f"Successfully extracted text from {file.filename}")
                    
                    # Clean up the temporary file
                    os.unlink(temp_path)
                    
                    all_text += f"\n\n--- Content from {file.filename} ---\n{text}"
                except Exception as e:
                    print(f"Error extracting text with textract: {str(e)}")
                    # Clean up the temporary file in case of error
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                    
                    # If textract fails, try reading the file as plain text
                    try:
                        with open(temp_path, "rb") as f:
                            content = f.read()
                        text = content.decode("utf-8", errors="ignore")
                        print(f"Fallback: extracted text as plain text")
                        all_text += f"\n\n--- Content from {file.filename} ---\n{text}"
                    except Exception as fallback_error:
                        print(f"Fallback error: {str(fallback_error)}")
                        raise HTTPException(
                            status_code=500,
                            detail=f"Error extracting text from document: {str(e)}"
                        )
            else:
                print(f"Unsupported file type: {content_type}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {content_type}. Only PDF, DOCX, and TXT files are supported."
                )
        
        return {"filename": ", ".join(file_names), "text": all_text}
            
    except Exception as e:
        print(f"General error in extract_text: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@router.post("/message", response_model=ChatResponse)
async def create_message(
    message: ChatMessage,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new message and get a response from the AI assistant.
    
    This endpoint processes a user message, sends it to the OpenAI API,
    and returns the assistant's response.
    """
    try:
        # Obtener el cliente de OpenAI
        client = await get_openai_client(db)
        settings = await get_openai_settings(db)
        
        # Obtener configuración del asistente
        model = settings.get("model", "gpt-3.5-turbo")
        
        # Obtener el ADL del asistente si está disponible, de lo contrario usar prompt predeterminado
        assistant_adl = await get_assistant_adl(db)
        system_prompt = assistant_adl or "You are a helpful AI assistant named PatricIA. Provide detailed and accurate information to help users with their questions."
        
        # Preparar los mensajes para la llamada a la API
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message.content}
        ]
        
        # Crear una respuesta de chat con OpenAI
        response = await client.chat.completions.create(
            model=model,
            messages=messages
        )
        
        # Extraer la respuesta del asistente
        assistant_response = response.choices[0].message.content
        
        return {
            "response": assistant_response,
            "model": model
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing message: {str(e)}"
        )

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, db: AsyncSession = Depends(deps.get_db)):
    """
    WebSocket endpoint for real-time chat communication with the AI assistant.
    
    This endpoint establishes a persistent WebSocket connection with the client,
    processes incoming messages, and streams AI responses token by token for a
    more interactive chat experience.
    
    Args:
        websocket: WebSocket connection object
        db: Database session for retrieving settings and configurations
        
    Notes:
        - Implements token-by-token streaming for natural response delivery
        - Uses the Assistant Definition Language (ADL) for system instructions
        - Handles connection lifecycle (accept, process, disconnect)
        - Provides real-time error feedback to the client
        - Maintains conversation context across multiple messages
    """
    await websocket.accept()
    
    # Initialize message history for this connection
    message_history = []
    
    try:
        while True:
            # Receive message from the client
            data = await websocket.receive_json()
            
            if not data or "content" not in data:
                await websocket.send_json({"error": "Invalid message format. 'content' field is required."})
                continue
                
            try:
                # Get the OpenAI client with API key from settings
                client = await get_openai_client(db)
                settings = await get_openai_settings(db)
                
                # Get the assistant configuration from settings
                assistant_model = settings.get("assistant_model", "gpt-3.5-turbo")
                
                # Get the chat history limit from settings
                max_history_messages = int(settings.get("max_history_messages", "10"))
                
                # Get the ADL of the assistant if available, otherwise use default prompt
                assistant_adl = await get_assistant_adl(db)
                system_prompt = assistant_adl or "You are a helpful AI assistant named PatricIA. Provide detailed and accurate information to help users with their questions."
                
                # Send the initial processing status to the client
                await websocket.send_json({"status": "processing", "message": "Processing your message..."})
                
                # Add the user message to the history
                message_history.append({"role": "user", "content": data["content"]})
                
                # Prepare messages for the API call, including system prompt and message history
                messages = [{"role": "system", "content": system_prompt}]
                
                # Add message history, but limit to the configured number of messages to avoid token limits
                # This can be adjusted based on the model's context window
                messages.extend(message_history[-max_history_messages:])
                
                # Create a streaming chat completion with OpenAI
                stream = await client.chat.completions.create(
                    model=assistant_model,
                    messages=messages,
                    stream=True,
                )
                
                # Initialize the response accumulator
                full_response = ""
                
                # Process and stream each token as it arrives
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        
                        # Send each token individually to enable real-time display
                        await websocket.send_json({
                            "type": "token",
                            "content": content,
                            "full_response": full_response
                        })
                        
                        # Add a small delay to simulate natural writing pace
                        await asyncio.sleep(0.01)
                
                # Add the assistant's response to the message history
                message_history.append({"role": "assistant", "content": full_response})
                
                # Send the completion message with the full response
                await websocket.send_json({
                    "type": "complete",
                    "full_response": full_response
                })
                    
            except Exception as e:
                # Handle and communicate any errors during processing
                error_msg = f"Error during processing: {str(e)}"
                await websocket.send_json({"type": "error", "error": error_msg})
                
    except WebSocketDisconnect:
        # Handle client disconnection
        pass
