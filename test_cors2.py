from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[], # NO WILDCARD!
    allow_origin_regex=r"https://.*\.(vercel\.app|onrender\.com)|http://localhost:[0-9]+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}

client = TestClient(app)
response = client.get("/api/health", headers={"Origin": "https://shilpsahayak-7dt92731m-ratanabhsharmas-projects.vercel.app"})
print("Status:", response.status_code)
print("Headers:", response.headers)
