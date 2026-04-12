import re
from datetime import datetime

import pytest
from playwright.sync_api import Page, expect

from src.models.tournament import Tournament
from src.models.user import User
from src.pages.login import LoginPage
from src.pages.metagame import MetagamePage
from src.util.names import prefixed_name
from tests.conftest import MakeTournament

TOURNAMENT_RAW_DATA = """
[
  {
    "name": "user 1",
    "decklist": [
      {
        "id": "10233",
        "name": "Typhlosion [Hisuian Form]",
        "teratype": "Fire",
        "ability": "Blaze",
        "item": "Choice Specs",
        "badges": [
          "Eruption",
          "Shadow Ball",
          "Heat Wave",
          "Overheat"
        ]
      },
      {
        "id": "547",
        "name": "Whimsicott",
        "teratype": "Ghost",
        "ability": "Prankster",
        "item": "Babiri Berry",
        "badges": [
          "Moonblast",
          "Sunny Day",
          "Encore",
          "Tailwind"
        ]
      },
      {
        "id": "727",
        "name": "Incineroar",
        "teratype": "Water",
        "ability": "Intimidate",
        "item": "Safety Goggles",
        "badges": [
          "Flare Blitz",
          "Knock Off",
          "Parting Shot",
          "Fake Out"
        ]
      },
      {
        "id": "10272",
        "name": "Ursaluna [Bloodmoon]",
        "teratype": "Normal",
        "ability": "Mind’s Eye",
        "item": "Life Orb",
        "badges": [
          "Earth Power",
          "Blood Moon",
          "Hyper Voice",
          "Protect"
        ]
      },
      {
        "id": "981",
        "name": "Farigiraf",
        "teratype": "Water",
        "ability": "Armor Tail",
        "item": "Sitrus Berry",
        "badges": [
          "Psychic",
          "Night Shade",
          "Helping Hand",
          "Trick Room"
        ]
      },
      {
        "id": "973",
        "name": "Flamigo",
        "teratype": "Fighting",
        "ability": "Scrappy",
        "item": "Focus Sash",
        "badges": [
          "Close Combat",
          "Feint",
          "Wide Guard",
          "Detect"
        ]
      }
    ]
  },
  {
    "name": "user2",
    "decklist": [
      {
        "id": "10272",
        "name": "Ursaluna [Bloodmoon]",
        "teratype": "Water",
        "ability": "Mind’s Eye",
        "item": "Leftovers",
        "badges": [
          "Blood Moon",
          "Earth Power",
          "Yawn",
          "Protect"
        ]
      },
      {
        "id": "727",
        "name": "Incineroar",
        "teratype": "Grass",
        "ability": "Intimidate",
        "item": "Sitrus Berry",
        "badges": [
          "Fake Out",
          "Parting Shot",
          "Knock Off",
          "Flare Blitz"
        ]
      },
      {
        "id": "903",
        "name": "Sneasler",
        "teratype": "Flying",
        "ability": "Unburden",
        "item": "Grassy Seed",
        "badges": [
          "Swords Dance",
          "Acrobatics",
          "Protect",
          "Close Combat"
        ]
      },
      {
        "id": "812",
        "name": "Rillaboom",
        "teratype": "Fire",
        "ability": "Grassy Surge",
        "item": "Assault Vest",
        "badges": [
          "Fake Out",
          "Wood Hammer",
          "Grassy Glide",
          "High Horsepower"
        ]
      },
      {
        "id": "149",
        "name": "Dragonite",
        "teratype": "Steel",
        "ability": "Multiscale",
        "item": "Loaded Dice",
        "badges": [
          "Scale Shot",
          "Tailwind",
          "Haze",
          "Protect"
        ]
      },
      {
        "id": "1000",
        "name": "Gholdengo",
        "teratype": "Water",
        "ability": "Good as Gold",
        "item": "Life Orb",
        "badges": [
          "Make It Rain",
          "Nasty Plot",
          "Shadow Ball",
          "Protect"
        ]
      }
    ]
  }
]
"""

TOURNAMENT_URL = (
    "https://www.pokedata.ovh/standingsVGC/0000162/masters/0000162_Masters.json"
)


class TestBaseMetagame:
    user: User
    admin_user: User
    tournaments: list[Tournament]
    prefix: str


@pytest.fixture(autouse=True, scope="module")
def test_data(random_user: User, random_admin: User, test_prefix: str, make_tournament: MakeTournament):
    admin_user = random_admin
    user = random_user
    prefix = test_prefix
    tournaments = [
        make_tournament(
            admin_user,
            Tournament(
                prefixed_name("test tournament 1"),
                2025,
                "reg h",
                TOURNAMENT_RAW_DATA,
                source="pokedata",
            ),
        ),
        make_tournament(
            admin_user,
            Tournament(
                prefixed_name("test tournament 2"),
                2025,
                "reg j",
                TOURNAMENT_RAW_DATA,
                source="pokedata",
            ),
        ),
    ]

    yield admin_user, user, tournaments, prefix


class TestMetagame(TestBaseMetagame):
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_data):
        admin_user, user, tournaments, prefix = test_data
        self.admin_user = admin_user
        self.user = user
        self.tournaments = tournaments
        self.prefix = prefix
        self.metagame_page = MetagamePage(page)
        login_page = LoginPage(page)
        login_page.login(self.user)

        expect(page).to_have_url(re.compile("/home"))

        self.metagame_page.navigate()

    def test_go_to_tournament(self, page: Page):
        t_name = self.tournaments[0].name
        self.metagame_page.tournament_link(t_name).click()

        expect(page).to_have_url(re.compile(f"/home/metagame/{self.tournaments[0].id}"))
        expect(page.locator("h2")).to_contain_text(t_name)
        expect(page.get_by_role("main")).to_contain_text("2025 - reg h")
        expect(page.locator("tbody")).to_contain_text("user 1")

    def test_tournament_analytics(self, page: Page):
        t_name = self.tournaments[0].name
        self.metagame_page.tournament_link(t_name).click()
        expect(page).to_have_url(re.compile(f"/home/metagame/{self.tournaments[0].id}"))

        self.metagame_page.analytics_tab.click()

        expect(page.get_by_label("Analytics").get_by_role("tablist")).to_contain_text(
            "Pokemon"
        )
        for i in range(2, 6):
            expect(
                page.get_by_label("Analytics").get_by_role("tablist")
            ).to_contain_text(f"Cores of {i}")


class TestAdminMetagame(TestBaseMetagame):
    @pytest.fixture(autouse=True)
    def setup(self, page: Page, test_data):
        admin_user, user, tournaments, prefix = test_data
        self.admin_user = admin_user
        self.user = user
        self.tournaments = tournaments
        self.prefix = prefix
        self.metagame_page = MetagamePage(page)
        login_page = LoginPage(page)
        login_page.login(self.admin_user)

        expect(page).to_have_url(re.compile("/home"))

        self.metagame_page.navigate_admin()

    def test_add_tournament_raw_data(self, page: Page):
        add_raw_name = prefixed_name("test add raw")
        self.metagame_page.add_tournament_button.click()
        self.metagame_page.add_tournament_modal["name"].fill(add_raw_name)
        self.metagame_page.add_tournament_modal["format"].fill("reg h")
        self.metagame_page.add_tournament_modal["data"].fill(TOURNAMENT_RAW_DATA)
        self.metagame_page.add_tournament_modal["submit_button"].click()

        expect(page.locator("tbody")).to_contain_text(add_raw_name)

        self.metagame_page.tournament_link(add_raw_name).click()

        expect(page.locator("h2")).to_contain_text(add_raw_name)
        expect(page.get_by_role("main")).to_contain_text(
            f"{datetime.now().year} - reg h"
        )
        expect(page.locator("tbody")).to_contain_text("user 1")

        self.metagame_page.navigate_admin()
        self.metagame_page.delete_button(add_raw_name).click()

        expect(page.locator("tbody")).not_to_contain_text(add_raw_name)

    def test_add_tournament_link(self, page: Page):
        add_url_name = prefixed_name("test add url")
        self.metagame_page.add_tournament_button.click()
        self.metagame_page.add_tournament_modal["name"].fill(add_url_name)
        self.metagame_page.add_tournament_modal["format"].fill("reg h")
        self.metagame_page.add_tournament_modal["source"].click()
        self.metagame_page.modal_source_option("Pokedata URL").click()
        self.metagame_page.add_tournament_modal["data"].fill(TOURNAMENT_URL)
        self.metagame_page.add_tournament_modal["submit_button"].click()

        expect(page.locator("tbody")).to_contain_text(add_url_name, timeout=15000)

        self.metagame_page.tournament_link(add_url_name).click()

        expect(page.locator("h2")).to_contain_text(add_url_name)
        expect(page.get_by_role("main")).to_contain_text(
            f"{datetime.now().year} - reg h"
        )

        self.metagame_page.navigate_admin()
        self.metagame_page.delete_button(add_url_name).click()

        expect(page.locator("tbody")).not_to_contain_text(add_url_name)

    def test_delete_tournament(self, page: Page):
        expect(page.locator("tbody")).to_contain_text(self.tournaments[1].name)

        self.metagame_page.delete_button(self.tournaments[1].name).click()

        expect(page.locator("tbody")).not_to_contain_text(self.tournaments[1].name)
