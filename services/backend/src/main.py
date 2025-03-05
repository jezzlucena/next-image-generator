import base64
import json
from typing import List
from .constants import DEVICE, MODEL_NAME, INITIAL_COLOR
from .models import ChatImage, ChatbotState
from .util import ConnectionManager, random_dark_color
from diffusers import StableDiffusionPipeline, EulerDiscreteScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from io import BytesIO
from pydantic import BaseModel
from torch import float16

chat_images: List[ChatImage] = []
"""List of messages currently on the server. Messages
are not persisted, so this list is cleaned after every
reboot of the backend service"""

colors: List[str] = [INITIAL_COLOR]
"""List of random CSS colors, generated by :func:`random_dark_color`,
formatted as rgb(0-255, 0-255, 0-255)"""

color_index = 0
"""Current index of the color we will send next time a
user connects. Warning: this CAN be out of boundaries of
:var:`random_colors` by 1, in which case we generate
a new random color, return it, and increment this"""

is_locked = False
"""State variable that controls whether the chatbot's UI
is locked for the user. This is used whenever the assistant
is generating/streaming a message, to avoid messes (e.g.
simultaneous generation of tokens)"""

class PromptDict(BaseModel):
    prompt: str

# Use the Euler scheduler here instead
scheduler = EulerDiscreteScheduler.from_pretrained(
    MODEL_NAME,
    subfolder="scheduler"
)
"""Scheduler used on the Stable Diffusion pipeline below"""

pipe = StableDiffusionPipeline.from_pretrained(
    MODEL_NAME,
    scheduler=scheduler,
    torch_dtype=float16
).to(DEVICE)
"""Instance of the Stable Diffusion pipeline, properly configured
to use the available device (e.g. cuda, cpu)"""

app = FastAPI()
"""FastAPI Instance"""

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8085", "https://image-generator.jezzlucena.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
"""CORS middleware, used to accept HTTP requests only from
allowed origins"""

manager = ConnectionManager()
"""Singleton instance of ConnectionManager"""

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Async function that serves as an endpoint for WebSocket
    connections."""

    global is_locked
    global color_index
    """Use global directive to let the python interpreter
    know we are referring to variables instantiated in a
    global scope"""

    await manager.connect(websocket)
    """Start by accepting the user's connection and adding a
    reference to the ConnectionManager instance"""

    try:
        if (color_index >= len(colors)):
            colors.append(random_dark_color())
        await websocket.send_text(json.dumps({
            'type': "color",
            'content': colors[color_index]
        }))
        color_index += 1
        """Send a designated color for the user that just connected,
        generating a random color if needed."""

        while True:
            """WebSocket message loop, here's where most of the
            computation happens."""

            text = await websocket.receive_text()
            """Wait for the user to send a chat message or a command"""
            
            if (is_locked):
                """If the app is locked (e.g. because the assistant is
                currently broadcasting a message to the clients), ignore
                any other messages to avoid inconsistencies."""
                continue
            data = json.loads(text)
            """Parse the text received from the client into a dict"""

            match data['type']:
                case 'reset':
                    """Reset messages and generated random colors,
                    broadcast to all clients"""
                    del chat_images [:]
                    del colors [:]
                    colors.append(INITIAL_COLOR)
                    color_index = 0
                    await manager.broadcast(json.dumps({ 'type': "reset" }))
                case 'prompt':
                    """
                    1 - Append the new image to the list.
                    2 - Broadcast the message with the appropriate color
                    to all clients.
                    3 - Lock the app.
                    """
                    chat_images.append({ 'caption': data['content'], 'color': data['color'] })

                    await manager.broadcast(json.dumps({
                        'type': "prompt",
                        'content': data['content'],
                        'color': data['color']
                    }))

                    is_locked = True

                    """4 - Add interaction to conversation history preemptively"""
                    response = { "caption": data['content'], 'color': data['color'] }
                    chat_images.append(response)

                    """
                    5 - Generate image using the Stable Diffuser pipeline
                    6 - Convert image to base64 string
                    """
                    image: bytes = pipe(prompt=data['content']).images[0]
                    image_io = BytesIO()
                    image.save(image_io, format="PNG")
                    base64_encoded = base64.b64encode(image_io.getvalue())
                    base64_string = base64_encoded.decode('utf-8')

                    response['base64'] = base64_string

                    await manager.broadcast(json.dumps({
                        'type': "image",
                        'content': base64_string
                    }))

                    is_locked = False
                case 'typing':
                    """Simply broadcast to all clients that one of them
                    is typing, informing their respective color."""
                    await manager.broadcast(json.dumps({
                        'type': "typing",
                        'color': data['color']
                    }))
    except WebSocketDisconnect:
        """Disconnect client in case of exception"""
        manager.disconnect(websocket)

@app.get("/state")
def get_state() -> ChatbotState:
    """Returns the current state of the app (e.g. all messages
    currently in session, if the app is locked)."""
    return {
        'images': chat_images,
        'is_locked': is_locked
    }
