from datetime import datetime

from playwright.sync_api import Page

from src.util.constants import APP_URL


class MetagamePage:
    def __init__(self, page: Page):
        self.page = page
        self.analytics_tab = self.page.get_by_role("tab", name="Analytics")
        self.add_tournament_button = self.page.get_by_role(
            "button", name="plus-circle Add tournament"
        )
        self.add_tournament_modal = {
            "name": self.page.get_by_role("textbox", name="* Name :"),
            "format": self.page.get_by_role("textbox", name="Format"),
            "season": self.page.get_by_label("Import new team").get_by_text(
                str(datetime.now().year)
            ),
            "source": self.page.get_by_text("Pokedata"),
            "data": self.page.get_by_role("textbox", name="Data"),
            "submit_button": self.page.get_by_role("button", name="Submit"),
            "cancel_button": self.page.get_by_role("button", name="Cancel"),
        }

    def navigate(self):
        self.page.goto(f"{APP_URL}/home/metagame")

    def navigate_admin(self):
        self.page.goto(f"{APP_URL}/home/metagame/admin")

    def tournament_link(self, name: str):
        return self.page.get_by_role("link", name=name)

    def modal_source_option(self, option: str):
        return self.page.get_by_title(option)

    def delete_button(self, name: str):
        return self.page.get_by_role("row", name=name).get_by_role("button")
