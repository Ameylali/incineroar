"""
API wrapper for the NextJS Incineroar API using the requests library.

This module provides a convenient interface to interact with all the API endpoints
available in the application, including authentication, user management, teams,
trainings, and tournaments.
"""

import json
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.models.team import Team
from src.models.tournament import Tournament, TournamentTeam
from src.models.training import Action, Battle, Training, Turn
from src.models.user import User
from src.util.constants import APP_URL


class APIError(Exception):
    """Custom exception for API-related errors."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class IncineroarAPI:
    """
    API wrapper for the Incineroar NextJS application.

    This class provides methods to interact with all available API endpoints
    including authentication, user management, teams, trainings, and tournaments.
    """

    def __init__(self, base_url: str = APP_URL, timeout: int = 30):
        """
        Initialize the API client.

        Args:
            base_url: The base URL of the API (defaults to APP_URL from constants)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self._jwt_token: Optional[str] = None

        # Setup retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        )

    def _get_url(self, endpoint: str) -> str:
        """Construct the full URL for an endpoint."""
        return urljoin(f"{self.base_url}/", f"api/{endpoint.lstrip('/')}")

    def _set_auth_header(self) -> None:
        """Set the Authorization header with the JWT token."""
        if self._jwt_token:
            self.session.headers.update({"Authorization": f"Bearer {self._jwt_token}"})

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        auth_required: bool = True,
    ) -> Dict[str, Any]:
        """
        Make an HTTP request to the API.

        Args:
            method: HTTP method (GET, POST, DELETE, etc.)
            endpoint: API endpoint
            data: Request payload for POST/PUT requests
            params: Query parameters
            auth_required: Whether authentication is required for this endpoint

        Returns:
            JSON response as a dictionary

        Raises:
            APIError: If the request fails
        """
        if auth_required:
            self._set_auth_header()

        url = self._get_url(endpoint)

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if data is not None else None,
                params=params,
                timeout=self.timeout,
            )

            # Try to parse JSON response
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                response_data = {"message": response.text or "No response content"}

            if not response.ok:
                error_message = response_data.get(
                    "message", f"HTTP {response.status_code}"
                )
                raise APIError(
                    message=error_message,
                    status_code=response.status_code,
                    response=response_data,
                )

            return response_data

        except requests.RequestException as e:
            raise APIError(f"Request failed: {str(e)}")

    # Helper methods for model serialization/deserialization

    def _dict_to_team(self, data: Dict[str, Any]) -> Team:
        """Convert dictionary to Team instance."""
        return Team(
            name=data["name"],
            season=data["season"],
            format=data["format"],
            data=data["data"],
            id=data.get("id"),
            description=data.get("description", ""),
            tags=data.get("tags", []),
        )

    def _team_to_dict(self, team: Team) -> Dict[str, Any]:
        """Convert Team instance to dictionary."""
        result = {
            "name": team.name,
            "season": team.season,
            "format": team.format,
            "data": team.data,
            "description": team.description,
            "tags": team.tags,
        }
        if team.id is not None:
            result["id"] = team.id
        return result

    def _dict_to_tournament_team(self, data: Dict[str, Any]) -> TournamentTeam:
        """Convert dictionary to TournamentTeam instance."""
        return TournamentTeam(player=data["player"], data=data["data"])

    def _tournament_team_to_dict(self, team: TournamentTeam) -> Dict[str, Any]:
        """Convert TournamentTeam instance to dictionary."""
        return {"player": team.player, "data": team.data}

    def _dict_to_tournament(self, data: Dict[str, Any]) -> Tournament:
        """Convert dictionary to Tournament instance."""
        teams = [
            self._dict_to_tournament_team(team_data)
            for team_data in data.get("teams", [])
        ]
        return Tournament(
            name=data["name"],
            season=data["season"],
            format=data["format"],
            data=data.get("data", ""),
            id=data.get("id"),
            teams=teams,
        )

    def _tournament_to_dict(self, tournament: Tournament) -> Dict[str, Any]:
        """Convert Tournament instance to dictionary."""
        result = {
            "name": tournament.name,
            "season": tournament.season,
            "format": tournament.format,
            "data": tournament.data,
            "teams": [self._tournament_team_to_dict(team) for team in tournament.teams],
        }
        if tournament.id is not None:
            result["id"] = tournament.id
        return result

    def _dict_to_action(self, data: Dict[str, Any]) -> Action:
        """Convert dictionary to Action instance."""
        return Action(
            index=data["index"],
            name=data["name"],
            type=data["type"],
            user=data["user"],
            targets=data.get("targets", []),
            player=data.get("player"),
        )

    def _action_to_dict(self, action: Action) -> Dict[str, Any]:
        """Convert Action instance to dictionary."""
        result = {
            "index": action.index,
            "name": action.name,
            "type": action.type,
            "user": action.user,
            "targets": action.targets,
        }
        if action.player is not None:
            result["player"] = action.player
        return result

    def _dict_to_turn(self, data: Dict[str, Any]) -> Turn:
        """Convert dictionary to Turn instance."""
        actions = [
            self._dict_to_action(action_data) for action_data in data.get("actions", [])
        ]
        return Turn(index=data["index"], actions=actions)

    def _turn_to_dict(self, turn: Turn) -> Dict[str, Any]:
        """Convert Turn instance to dictionary."""
        return {
            "index": turn.index,
            "actions": [self._action_to_dict(action) for action in turn.actions],
        }

    def _dict_to_battle(self, data: Dict[str, Any]) -> Battle:
        """Convert dictionary to Battle instance."""
        turns = [self._dict_to_turn(turn_data) for turn_data in data.get("turns", [])]
        team = None
        if data.get("team"):
            team = self._dict_to_team(data["team"])

        return Battle(
            name=data["name"],
            notes=data["notes"],
            season=data.get("season"),
            format=data.get("format"),
            team=team,
            team_id=data.get("team_id"),
            id=data.get("id"),
            turns=turns,
        )

    def _battle_to_dict(self, battle: Battle) -> Dict[str, Any]:
        """Convert Battle instance to dictionary."""
        result = {
            "name": battle.name,
            "notes": battle.notes,
            "turns": [self._turn_to_dict(turn) for turn in battle.turns],
        }
        if battle.season is not None:
            result["season"] = battle.season
        if battle.format is not None:
            result["format"] = battle.format
        if battle.team is not None:
            result["team"] = self._team_to_dict(battle.team)
        if battle.team_id is not None:
            result["team_id"] = battle.team_id
        if battle.id is not None:
            result["id"] = battle.id
        return result

    def _dict_to_training(self, data: Dict[str, Any]) -> Training:
        """Convert dictionary to Training instance."""
        battles = [
            self._dict_to_battle(battle_data) for battle_data in data.get("battles", [])
        ]
        team = None
        if data.get("team"):
            team = self._dict_to_team(data["team"])

        return Training(
            name=data["name"],
            season=data.get("season"),
            format=data.get("format"),
            team=team,
            team_id=data.get("team_id"),
            is_default=data.get("is_default", False),
            id=data.get("id"),
            battles=battles,
        )

    def _training_to_dict(self, training: Training) -> Dict[str, Any]:
        """Convert Training instance to dictionary."""
        result = {
            "name": training.name,
            "is_default": training.is_default,
            "battles": [self._battle_to_dict(battle) for battle in training.battles],
        }
        if training.season is not None:
            result["season"] = training.season
        if training.format is not None:
            result["format"] = training.format
        if training.team is not None:
            result["team"] = self._team_to_dict(training.team)
        if training.team_id is not None:
            result["team_id"] = training.team_id
        if training.id is not None:
            result["id"] = training.id
        return result

    def _dict_to_user(self, data: Dict[str, Any]) -> User:
        """Convert dictionary to User instance."""
        return User(
            username=data["username"],
            role=data["role"],
            password=data.get(
                "password", ""
            ),  # Password might not be returned from API
        )

    # Authentication methods

    def authenticate(self, username: str, password: str) -> str:
        """
        Authenticate with the API and store the JWT token.

        Args:
            username: User's username
            password: User's password

        Returns:
            JWT token string

        Raises:
            APIError: If authentication fails
        """
        data = {"username": username, "password": password}

        response = self._make_request(
            method="POST", endpoint="auth", data=data, auth_required=False
        )

        self._jwt_token = response["jwt"]
        return self._jwt_token

    def set_token(self, token: str) -> None:
        """
        Set the JWT token manually.

        Args:
            token: JWT token string
        """
        self._jwt_token = token

    def clear_auth(self) -> None:
        """Clear the stored authentication token."""
        self._jwt_token = None
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]

    # User methods

    def get_current_user(self) -> User:
        """
        Get the current authenticated user's information.

        Returns:
            User instance
        """
        response = self._make_request("GET", "user/me")
        return self._dict_to_user(response["user"])

    def delete_current_user(self):
        self._make_request("DELETE", "user/me")

    # Team methods

    def create_team(
        self,
        data: str,
        name: str,
        description: str,
        season: int,
        format: str,
        tags: Optional[List[str]] = None,
    ) -> Team:
        """
        Create a new team for the authenticated user.

        Args:
            data: Team data (typically in a specific format)
            name: Team name
            description: Team description
            season: Season number
            format: Format string
            tags: Optional list of tags

        Returns:
            Created Team instance
        """
        payload = {
            "data": data,
            "name": name,
            "description": description,
            "season": season,
            "format": format,
            "tags": tags or [],
        }

        response = self._make_request("POST", "user/team", data=payload)
        return self._dict_to_team(response["team"])

    def create_team_from_model(self, team: Team) -> Team:
        """
        Create a new team for the authenticated user using a Team model instance.

        Args:
            team: Team model instance

        Returns:
            Created Team instance with ID
        """
        return self.create_team(
            data=team.data,
            name=team.name,
            description=team.description,
            season=team.season,
            format=team.format,
            tags=team.tags,
        )

    def get_team_by_id(self, team_id: str) -> Team:
        """
        Get a specific team by ID for the authenticated user.

        Args:
            team_id: Team ID

        Returns:
            Team instance
        """
        response = self._make_request("GET", f"user/team/{team_id}")
        return self._dict_to_team(response["team"])

    def delete_team(self, team_id: str) -> bool:
        """
        Delete a specific team by ID for the authenticated user.

        Args:
            team_id: Team ID

        Returns:
            True if successful
        """
        response = self._make_request("DELETE", f"user/team/{team_id}")
        return response.get("success", False)

    # Training methods

    def get_trainings(self) -> List[Training]:
        """
        Get all trainings for the authenticated user.

        Returns:
            List of Training instances
        """
        response = self._make_request("GET", "user/training")
        return [
            self._dict_to_training(training_data)
            for training_data in response["trainings"]
        ]

    def create_training(self, **training_data) -> Training:
        """
        Create a new training for the authenticated user.

        Args:
            **training_data: Training data fields

        Returns:
            Created Training instance
        """
        response = self._make_request("POST", "user/training", data=training_data)
        return self._dict_to_training(response["training"])

    def create_training_from_model(self, training: Training) -> Training:
        """
        Create a new training for the authenticated user using a Training model instance.

        Args:
            training: Training model instance

        Returns:
            Created Training instance with ID
        """
        training_dict = self._training_to_dict(training)
        return self.create_training(**training_dict)

    def get_training_by_id(self, training_id: str) -> Training:
        """
        Get a specific training by ID.

        Args:
            training_id: Training ID

        Returns:
            Training instance
        """
        response = self._make_request("GET", f"user/training/{training_id}")
        return self._dict_to_training(response["training"])

    def delete_training(self, training_id: str) -> bool:
        """
        Delete a specific training by ID.

        Args:
            training_id: Training ID

        Returns:
            True if successful
        """
        response = self._make_request("DELETE", f"user/training/{training_id}")
        return response.get("success", False)

    def get_training_analysis(self, training_id: str) -> Dict[str, Any]:
        """
        Get analysis for a specific training.

        Args:
            training_id: Training ID

        Returns:
            Training analysis data
        """
        response = self._make_request("GET", f"user/training/{training_id}/analyze")
        return response["analysis"]

    # Battle methods

    def get_training_battles(self, training_id: str) -> List[Battle]:
        """
        Get all battles for a specific training.

        Args:
            training_id: Training ID

        Returns:
            List of Battle instances
        """
        response = self._make_request("GET", f"user/training/{training_id}/battle")
        return [
            self._dict_to_battle(battle_data)
            for battle_data in response.get("battles", [])
        ]

    def create_training_battle(self, training_id: str, **battle_data) -> Battle:
        """
        Create a new battle for a specific training.

        Args:
            training_id: Training ID
            **battle_data: Battle data fields

        Returns:
            Created Battle instance
        """
        response = self._make_request(
            "POST", f"user/training/{training_id}/battle", data=battle_data
        )
        return self._dict_to_battle(response["battle"])

    def create_training_battle_from_model(
        self, training_id: str, battle: Battle
    ) -> Battle:
        """
        Create a new battle for a specific training using a Battle model instance.

        Args:
            training_id: Training ID
            battle: Battle model instance

        Returns:
            Created Battle instance with ID
        """
        battle_dict = self._battle_to_dict(battle)
        return self.create_training_battle(training_id, **battle_dict)

    def get_battle_by_id(self, training_id: str, battle_id: str) -> Battle:
        """
        Get a specific battle by ID within a training.

        Args:
            training_id: Training ID
            battle_id: Battle ID

        Returns:
            Battle instance
        """
        response = self._make_request(
            "GET", f"user/training/{training_id}/battle/{battle_id}"
        )
        return self._dict_to_battle(response["battle"])

    def delete_battle(self, training_id: str, battle_id: str) -> bool:
        """
        Delete a specific battle by ID within a training.

        Args:
            training_id: Training ID
            battle_id: Battle ID

        Returns:
            True if successful
        """
        response = self._make_request(
            "DELETE", f"user/training/{training_id}/battle/{battle_id}"
        )
        return response.get("success", False)

    # Tournament methods

    def get_tournaments(self) -> List[Tournament]:
        """
        Get all tournaments.

        Returns:
            List of Tournament instances
        """
        response = self._make_request("GET", "tournament")
        return [
            self._dict_to_tournament(tournament_data)
            for tournament_data in response["tournaments"]
        ]

    def create_tournament(
        self, name: str, season: int, format: str, source: str, data: str
    ) -> Tournament:
        """
        Create a new tournament (admin only).

        Args:
            name: Tournament name
            season: Season number
            format: Format string
            source: Data source type ('pokedata' or 'pokedata_url')
            data: Tournament data (JSON string if source='pokedata', URL if source='pokedata_url')

        Returns:
            Created Tournament instance
        """
        if source not in ["pokedata", "pokedata_url"]:
            raise ValueError("source must be either 'pokedata' or 'pokedata_url'")

        payload = {
            "name": name,
            "season": season,
            "format": format,
            "source": source,
            "data": data,
        }

        response = self._make_request("POST", "tournament", data=payload)
        return self._dict_to_tournament(response["tournament"])

    def create_tournament_from_model(self, tournament: Tournament) -> Tournament:
        """
        Create a new tournament (admin only) using a Tournament model instance.

        Args:
            tournament: Tournament model instance

        Returns:
            Created Tournament instance with ID
        """
        return self.create_tournament(
            name=tournament.name,
            season=tournament.season,
            format=tournament.format,
            source=tournament.source or "pokedata",
            data=tournament.data,
        )

    def get_tournament_by_id(self, tournament_id: str) -> Tournament:
        """
        Get a specific tournament by ID.

        Args:
            tournament_id: Tournament ID

        Returns:
            Tournament instance with optional analysis
        """
        response = self._make_request("GET", f"tournament/{tournament_id}")
        # Assuming the response contains tournament data directly or under a 'tournament' key
        tournament_data = response.get("tournament", response)
        return self._dict_to_tournament(tournament_data)

    def delete_tournament(self, tournament_id: str) -> bool:
        """
        Delete a specific tournament by ID (admin only).

        Args:
            tournament_id: Tournament ID

        Returns:
            True if successful
        """
        response = self._make_request("DELETE", f"tournament/{tournament_id}")
        return response.get("success", False)


# Convenience functions for common operations


def create_authenticated_api(
    username: str, password: str, base_url: str = APP_URL
) -> IncineroarAPI:
    """
    Create and authenticate an API client in one step.

    Args:
        username: User's username
        password: User's password
        base_url: API base URL

    Returns:
        Authenticated IncineroarAPI instance
    """
    api = IncineroarAPI(base_url)
    api.authenticate(username, password)
    return api


def create_api_with_token(token: str, base_url: str = APP_URL) -> IncineroarAPI:
    """
    Create an API client with a pre-existing JWT token.

    Args:
        token: JWT token string
        base_url: API base URL

    Returns:
        IncineroarAPI instance with token set
    """
    api = IncineroarAPI(base_url)
    api.set_token(token)
    return api
