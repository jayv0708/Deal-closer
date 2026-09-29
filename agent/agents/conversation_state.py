from typing import List, Optional
from pydantic import BaseModel

class ConversationState(BaseModel):
    customer_name: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    preferred_location: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    purpose: Optional[str] = None
    timeline: Optional[str] = None
    financing_required: Optional[bool] = None
    selected_project: Optional[str] = None
    selected_property: Optional[str] = None
    objections: List[str] = []
    questions: List[str] = []
    intent: Optional[str] = None
    lead_score: Optional[int] = None
    
    def update(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self, key) and value is not None:
                setattr(self, key, value)
