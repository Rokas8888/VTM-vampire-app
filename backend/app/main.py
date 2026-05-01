import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, game_data, characters, groups, monsters, admin, dice, conditions, notes, npcs, resonance, portraits, scenes, messages

app = FastAPI(title="VTM-GG API", version="1.0.0")

# Allow the frontend (running on port 5173) to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth.router)
app.include_router(game_data.router)
app.include_router(characters.router)
app.include_router(groups.router)
app.include_router(monsters.router)
app.include_router(admin.router)
app.include_router(dice.router)
app.include_router(conditions.router)
app.include_router(notes.router)
app.include_router(npcs.router)
app.include_router(resonance.router)
app.include_router(portraits.router)
app.include_router(scenes.router)
app.include_router(messages.router)

# Serve uploaded portraits as static files
_uploads_dir = "/app/uploads"
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")


@app.get("/")
def root():
    return {"message": "VTM-GG API is running"}
