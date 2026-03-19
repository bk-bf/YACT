from fastapi import FastAPI

from .models import LensRequest, LensResult

app = FastAPI(title="YACT Analytics API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/lenses/evaluate", response_model=LensResult)
def evaluate_lens(payload: LensRequest) -> LensResult:
    # Stub response for T-001 bootstrap; full logic lands in later roadmap tasks.
    return LensResult(
        coin_id=payload.coin_id,
        lens_id=payload.lens_id,
        probability=0.5,
        confidence="low",
        sample_size=0,
    )
