# Incineroar E2E Test Suite

End-to-end testing suite for the Incineroar Next.js application using Python, Pytest, and Playwright.

## Overview

This test suite provides comprehensive end-to-end testing for the Incineroar application, covering user workflows across different features including authentication, team management, tournaments, training, and metagame analysis.

## Prerequisites

Before running the e2e tests, ensure you have:

- **Python 3.10+** - [Download Python](https://www.python.org/downloads/)
- **uv** (Python package manager) - [Install uv](https://docs.astral.sh/uv/getting-started/installation/)
- **Playwright browsers** - Will be installed automatically
- **Running Incineroar application** - The main Next.js app should be running

## Installation

1. **Install uv** (if not already installed)
   ```bash
   # macOS and Linux
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # Windows
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
   
   # Alternative: using pip
   pip install uv
   ```

2. **Install dependencies**
   ```bash
   cd e2e
   uv sync
   ```

3. **Install Playwright browsers**
   ```bash
   uv run playwright install
   ```