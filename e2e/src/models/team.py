from dataclasses import dataclass, field
from typing import List, Union


@dataclass
class Team:
    name: str
    season: int
    format: str
    data: str
    id: Union[str, None] = None
    description: str = ""
    tags: list[str] = field(default_factory=list)
