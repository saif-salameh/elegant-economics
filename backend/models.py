from typing import List, Optional
from pydantic import BaseModel


class Concept(BaseModel):
    id: str
    title: str
    summary: str
    definition: str = ""
    overview: str = ""
    highlights: List[str]
    source_id: str
    category: str = ""
    category_name: str = ""
    source_title: str = ""
    chapter: str = ""
    has_interactive: bool = False
    widget: Optional[str] = None
    related_concepts: List[str] = []
    notes: Optional[str] = None


class Source(BaseModel):
    id: str
    title: str
    status: str
    caveats: List[str]
    category: str
    whole_source_summary: str = ""
    key_points: List[str] = []
    consulted: List[str] = []
    further_reading_leads: List[str] = []


class Category(BaseModel):
    id: str
    name: str
    track: str
    description: str = ""
    source_ids: List[str] = []


class EconomicsData(BaseModel):
    concepts: List[Concept]
    sources: List[Source]
    categories: List[Category]
