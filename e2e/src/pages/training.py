from typing import Union

from playwright.sync_api import Page

from src.util.constants import NEXT_PUBLIC_APP_URL


class TrainingsPage:
    def __init__(self, page: Page):
        self.page = page
        self.add_training_button = self.page.get_by_role(
            "button", name="plus-circle Add training"
        )
        self.new_battle_button = self.page.get_by_role(
            "button", name="plus-circle New battle"
        )
        self.row_action_edit_button = self.page.get_by_role("menuitem", name="Edit")
        self.row_action_delete_button = self.page.get_by_role("menuitem", name="Delete")
        self.training_modal = {
            "name": self.page.get_by_role("textbox", name="Name"),
            "format": self.page.get_by_role("textbox", name="Format"),
            "season": self.page.locator("#createTraining_season"),
            "season-edit": self.page.locator("#editTraining_season"),
            "team": self.page.get_by_role("combobox", name="Team :"),
            "description": self.page.get_by_role("textbox", name="Description"),
            "submit": self.page.get_by_role("button", name="Submit"),
            "update": self.page.get_by_role("button", name="Update"),
            "cancel": self.page.get_by_role("button", name="Cancel"),
        }

    def navigate(self):
        return self.page.goto(f"{NEXT_PUBLIC_APP_URL}/home/training")

    def training_link(self, name: str):
        return self.page.get_by_role("link", name=name)

    def row_actions_button(self, name: str):
        return self.page.get_by_role("row", name=name).get_by_role("button")

    def modal_season_option(self, year: int):
        return self.page.get_by_title(str(year))

    def modal_team_option(self, name: str):
        return self.page.get_by_text(name)

    def modal_season_item(self, value: str):
        return self.page.get_by_label("Edit training").get_by_title(value)

    def modal_team_item(self, value: str):
        return self.page.get_by_title(value)


class DetailedTrainingPage:
    def __init__(self, page: Page):
        self.page = page
        self.add_battle_button = self.page.get_by_role(
            "button", name="plus-circle New battle"
        )
        self.import_battle_button = self.page.get_by_role(
            "button", name="plus-circle Import battle"
        )
        self.analyze_button = self.page.get_by_role(
            "button", name="radar-chart Analyze"
        )
        self.edit_button = self.page.get_by_role("button", name="edit Edit")
        self.training_tab = self.page.get_by_role("tab", name="Training")
        self.edit_action_button = self.page.get_by_role("menuitem", name="Edit")
        self.delete_action_button = self.page.get_by_role("menuitem", name="Delete")
        self.training_modal = {
            "name": self.page.get_by_role("textbox", name="Name"),
            "format": self.page.get_by_role("textbox", name="Format"),
            "season": self.page.locator("#createTraining_season"),
            "season-edit": self.page.locator("#editTraining_season"),
            "description": self.page.get_by_role("textbox", name="Description"),
            "update": self.page.get_by_role("button", name="Update"),
        }
        self.import_modal = {
            "username": self.page.get_by_role("textbox", name="Username"),
            "file-picker": self.page.get_by_role(
                "button", name="inbox Click or drag files to"
            ),
            "import": self.page.get_by_role("button", name="Import", exact=True),
        }

    def navigate(self, training_id: str):
        self.page.goto(f"{NEXT_PUBLIC_APP_URL}/home/training/{training_id}")

    def battle_link(self, name: str):
        return self.page.get_by_role("link", name=name)

    def row_actions_button(self, name: str):
        return self.page.get_by_role("row", name=name).get_by_role("button")


class AnalyzeTrainingPage:
    def __init__(self, page: Page):
        self.page = page
        self.matchups_tab = self.page.get_by_role("tab", name="Matchups")
        self.pokemon_tab = self.page.get_by_role("tab", name="Pokemon")
        self.key_actions_tab = self.page.get_by_role("tab", name="Key Actions")
        self.all_matches_tab = self.page.get_by_role("tab", name="Matchups")
        self.openings_tab = self.page.get_by_role("tab", name="Openings")
        self.usage_tab = self.page.get_by_role("tab", name="Usage")
        self.moves_tab = self.page.get_by_role("tab", name="Moves")
        self.kos_tab = self.page.get_by_role("tab", name="KOs")
        self.faints_tab = self.page.get_by_role("tab", name="Faints")
        self.switches_tab = self.page.get_by_role("tab", name="Switches")
        self.my_poke_key_actions_tab = self.page.get_by_role(
            "tab", name="My pokemon key actions"
        )
        self.rival_poke_key_actions_tab = self.page.get_by_role(
            "tab", name="Rival pokemon key actions"
        )

    def navigate(self, training_id: str):
        self.page.goto(f"{NEXT_PUBLIC_APP_URL}/home/training/{training_id}/analyze")

    def expand_row(self, name: str):
        return self.page.get_by_role("row", name=name).get_by_label("Expand row")


class BattlePage:
    def __init__(self, page: Page):
        self.page = page
        self.edit_button = self.page.get_by_role("button", name="edit")

        # Form fields
        self.battle_form = {
            "name": self.page.get_by_role("textbox", name="Name"),
            "result": self.page.get_by_role("combobox", name="result input"),
            "season": self.page.get_by_role("combobox", name="season select"),
            "format": self.page.get_by_role("textbox", name="format input"),
            "teams": self.page.get_by_role("combobox", name="teams select"),
            "notes": self.page.get_by_role("textbox", name="Notes"),
            "save": self.page.get_by_role("button", name="Save"),
        }

        # Turn and action controls
        self.add_tab_button = self.page.get_by_role("button", name="Add tab")
        self.add_action_button = self.page.get_by_role("button", name="plus Add action")

    def navigate(self, training_id: str, battle_id: str):
        self.page.goto(f"{NEXT_PUBLIC_APP_URL}/home/training/{training_id}/{battle_id}")

    def select_option(self, title: str, nth: Union[int, None] = None):
        selector = self.page.get_by_title(title)
        if nth is not None:
            selector = selector.nth(nth)
        return selector

    def get_action_field(self, turn_index: int, action_index: int, field: str):
        return self.page.locator(
            f"#editBattle_turns_{turn_index}_actions_{action_index}_{field}"
        )

    def get_action_player_field(self, turn_index: int, action_index: int):
        return self.get_action_field(turn_index, action_index, "player")

    def get_action_targets_field(self, turn_index: int, action_index: int):
        return self.get_action_field(turn_index, action_index, "targets")

    def get_action_combobox(self, name: str):
        return self.page.get_by_role("combobox", name=f"{name} input")

    def get_turn_action_type(self, label_name: str = "Turn"):
        return self.page.get_by_label(label_name).get_by_text("move")
