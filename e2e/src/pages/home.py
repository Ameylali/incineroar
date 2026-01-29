from playwright.sync_api import Page

from src.util.constants import NEXT_PUBLIC_APP_URL


class HomePage:
    def __init__(self, page: Page):
        self.page = page
        self.teams_menu_item = self.page.get_by_role("menuitem", name="pokeball Teams")
        self.metagame_menu_item = self.page.get_by_role(
            "menuitem", name="dot-chart Metagame"
        )
        self.training_menu_item = self.page.get_by_role(
            "menuitem", name="reconciliation Training"
        )
        self.admin_menu_item = self.page.get_by_role("menuitem", name="file-done Admin")
        self.admin_subitems = {
            "metagame": self.page.get_by_role("menuitem", name="Metagame", exact=True),
        }
        self.sign_out_menu_item = self.page.get_by_role(
            "menuitem", name="logout Sign out"
        )

    def navigate(self):
        self.page.goto(f"{NEXT_PUBLIC_APP_URL}/home")
