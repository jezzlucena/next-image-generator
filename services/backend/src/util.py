import random
from fastapi import WebSocket

class ConnectionManager:
    """Class that manages connection, disconnection, and broadcasting
    of messages to WebSocket clients"""
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

def random_dark_color():
    """Function that generates random dark colors.
    
    1 - It starts by instantiating 3 random integers, one from 0-50, 
    a second one from 0-150, and a 3rd one from 0-255. These represent
    the color intensity that we will give to each of the color components
    (red, green, and blue).

    2 - It then appends these integers to a list, each associated with a
    random float from 0-1 called sort_factor, that will be used later.

    3 - We sort the list created on our last step by the random sort_factor.

    4 - Assign red, green, and blue variables with the respective color 
    component at indices 0, 1, and 2 (in this order).

    5 - Return formatted string"""
    low = random.randint(0, 50)
    mid = random.randint(0, 150)
    high = random.randint(0, 255)

    components = [
        { 'value': low, 'sort_factor': random.random() },
        { 'value': mid, 'sort_factor': random.random() },
        { 'value': high, 'sort_factor': random.random() }
    ]

    components.sort(key=lambda x: x['sort_factor'])

    red = components[0]['value']
    green = components[1]['value']
    blue = components[2]['value']

    return f"rgb({red}, {green}, {blue})"