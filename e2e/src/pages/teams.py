from datetime import datetime

from playwright.sync_api import Page

from src.util.constants import APP_URL


class TeamsPage:
    def __init__(self, page: Page):
        self.page = page
        self.import_team_button = page.get_by_role(
            "button", name="plus-circle Import team"
        )
        self.row_action_edit_button = page.get_by_role("menuitem", name="Edit")
        self.row_action_delete_button = page.get_by_role("menuitem", name="Delete")

        self.team_modal = {
            "name": self.page.get_by_role("textbox", name="Name"),
            "description": self.page.get_by_role("textbox", name="Description"),
            "format": self.page.get_by_role("textbox", name="Format"),
            "season": self.page.get_by_label("Import new team").get_by_text(
                str(datetime.now().year)
            ),
            "data": self.page.get_by_role("textbox", name="Data"),
            "tags": self.page.get_by_role("combobox", name="Tags"),
            "submit_button": self.page.get_by_role("button", name="Submit"),
            "save_changes_button": self.page.get_by_role("button", name="Save changes"),
            "cancel_changes_button": self.page.get_by_role("button", name="Cancel"),
        }

    def navigate(self):
        self.page.goto(f"{APP_URL}/home/teams")

    def row_actions_button(self, name: str):
        return self.page.get_by_role("row", name=name).get_by_role("button")

    def row_link(self, name: str):
        return self.page.get_by_role("link", name=name)

    def modal_season_option(self, year: str):
        return self.page.get_by_title(year)
