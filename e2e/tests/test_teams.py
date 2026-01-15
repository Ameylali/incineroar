import re

import pytest
from playwright.sync_api import Page, Request, expect

from src.models.team import Team
from src.models.user import User
from src.pages.login import LoginPage
from src.pages.teams import TeamsPage
from tests.conftest import GetUser, MakeTeam


class TestTeams:
    username = "mewtwo"
    teams: list[Team]
    user: User

    @pytest.fixture(autouse=True, scope="class")
    def setup_data(self, get_user: GetUser, make_team: MakeTeam):
        self.__class__.user = get_user(self.username)
        self.__class__.teams = [
            make_team(self.user, Team("team 1", 2025, "reg f", "regirock")),
            make_team(self.user, Team("team 2", 2025, "reg h", "regice")),
            make_team(
                self.user,
                Team(
                    "team 3",
                    2025,
                    "reg j",
                    "registeel",
                    description="my test description",
                    tags=["tag1", "tag2"],
                ),
            ),
        ]

    @pytest.fixture(autouse=True)
    def setup(self, page: Page, get_user: GetUser):
        self.teams_page = TeamsPage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.teams_page.navigate()

    def test_import_team(self, page: Page):
        self.teams_page.import_team_button.click()
        self.teams_page.team_modal["name"].click()
        self.teams_page.team_modal["name"].fill("import test")
        self.teams_page.team_modal["name"].press("Tab")
        self.teams_page.team_modal["description"].fill("description test")
        self.teams_page.team_modal["season"].click()
        self.teams_page.modal_season_option("2026")
        self.teams_page.team_modal["format"].click()
        self.teams_page.team_modal["format"].fill("reg f")
        page.locator(".ant-select-selection-overflow").click()
        self.teams_page.team_modal["tags"].fill("tag1")
        self.teams_page.team_modal["tags"].press("Enter")
        self.teams_page.team_modal["tags"].fill("tag2")
        self.teams_page.team_modal["tags"].press("Enter")
        self.teams_page.team_modal["data"].fill("mimikyu")
        self.teams_page.team_modal["submit_button"].click()

        expect(self.teams_page.row_link("import test")).to_be_visible()

        self.teams_page.row_actions_button("import test").click()
        self.teams_page.row_action_edit_button.click()

        expect(self.teams_page.team_modal["name"]).to_have_value("import test")
        expect(self.teams_page.team_modal["description"]).to_have_value(
            "description test"
        )
        expect(page.get_by_title("2026")).to_be_visible()
        expect(self.teams_page.team_modal["format"]).to_have_value("reg f")
        expect(page.get_by_text("tag1")).to_be_visible()
        expect(page.get_by_text("tag2")).to_be_visible()
        expect(self.teams_page.team_modal["data"]).to_have_value("mimikyu")

        self.teams_page.team_modal["cancel_changes_button"].click()
        self.teams_page.row_actions_button("import test").click()
        self.teams_page.row_action_delete_button.click()

        expect(self.teams_page.row_link("import test")).not_to_be_visible()

    def test_edit_team(self):
        self.teams_page.row_actions_button("team 1").click()
        self.teams_page.row_action_edit_button.click()
        self.teams_page.team_modal["description"].dblclick()
        self.teams_page.team_modal["description"].fill("updated description")
        self.teams_page.team_modal["name"].click()
        self.teams_page.team_modal["name"].fill("updated team 1")
        self.teams_page.team_modal["save_changes_button"].click()

        expect(self.teams_page.row_link("updated team 1")).to_be_visible()

    def test_delete_team(self):
        self.teams_page.row_actions_button("team 2").click()
        self.teams_page.row_action_delete_button.click()

        expect(self.teams_page.row_link("team 2")).not_to_be_visible()

    def test_navigate_to_team(self, page: Page):
        self.teams_page.row_link("team 3").click()

        expect(page).to_have_url(re.compile(f"/teams/{self.teams[2].id}"))
        expect(page.get_by_text("registeel")).to_be_visible()
        expect(page.get_by_role("main")).to_contain_text("2025 - reg j")
        expect(page.get_by_role("main")).to_contain_text("my test description")
        expect(page.get_by_text("tag1")).to_be_visible()
        expect(page.get_by_text("tag2")).to_be_visible()
