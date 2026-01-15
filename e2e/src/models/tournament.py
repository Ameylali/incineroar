from dataclasses import dataclass, field
from typing import Optional, Union


@dataclass
class TournamentTeam:
    player: str
    data: str


@dataclass
class Tournament:
    name: str
    season: int
    format: str
    data: str
    id: Union[str, None] = None
    teams: list[TournamentTeam] = field(default_factory=list)
    source: Optional[str] = None
