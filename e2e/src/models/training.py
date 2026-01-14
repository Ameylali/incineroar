from dataclasses import dataclass, field
from typing import Union

from src.models.team import Team


@dataclass
class Action:
    index: int
    name: str
    type: str
    user: str
    targets: list[str] = field(default_factory=list)
    player: Union[str, None] = None


@dataclass
class Turn:
    index: int
    actions: list[Action]


@dataclass
class Battle:
    name: str
    notes: str
    season: Union[int, None] = None
    format: Union[str, None] = None
    team: Union[Team, None] = None
    team_id: Union[str, None] = None
    id: Union[str, None] = None
    turns: list[Turn] = field(default_factory=list)


@dataclass
class Training:
    name: str
    season: Union[int, None] = None
    format: Union[str, None] = None
    team: Union[Team, None] = None
    team_id: Union[str, None] = None
    is_default: bool = False
    id: Union[str, None] = None
    battles: list[Battle] = field(default_factory=list)
