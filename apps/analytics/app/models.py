from pydantic import BaseModel, Field


class LensRequest(BaseModel):
    coin_id: str = Field(..., description="Coin identifier")
    lens_id: str = Field(..., description="Lens profile identifier")


class LensResult(BaseModel):
    coin_id: str
    lens_id: str
    probability: float
    confidence: str
    sample_size: int
