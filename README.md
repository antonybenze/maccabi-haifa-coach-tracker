# The Green Bench Watch — Maccabi Haifa FC Head Coach Search Tracker

A static newsroom and intelligence tracker covering **Maccabi Haifa FC's Head Coach Search Process**, automatically updated **twice a day** (**08:00 IST Morning Edition** & **20:00 IST Evening Edition**).

## Features

- **Twice-Daily Update Schedule (`08:00` & `20:00` IST)**:
  - Automated GitHub Actions cron workflow (`.github/workflows/update-news.yml`) runs at `06:00 UTC` and `18:00 UTC` every day to execute `scripts/update_news.py`, pull the latest Maccabi Haifa managerial search news, and commit updated dispatches to `data/news.json`.
  - Real-time client-side countdown timer to the next daily edition and live RSS wire check.
- **Lior Refaelov's Shortlist & Candidate Matrix**:
  - Tracks probability ratings, contract terms, and tier status for **Ran Ben Shimon**, **Edi Iordănescu**, **Omer Peretz**, **Barak Yitzhaki**, and **Sharon Mimar**.
- **Built-in GitHub Repository Links**:
  - The website includes prominent links to its own GitHub repository in the top navigation bar, the Twice-Daily Update Engine card, and the footer (and automatically adapts to your `https://<username>.github.io/<repo>/` URL once deployed on GitHub Pages).

## Project Structure

- `index.html` — Main static newsroom interface
- `styles.css` — Maccabi Haifa Emerald & Dark Slate responsive styling
- `app.js` — Client-side data loader, filter logic, countdown timer, and dynamic GitHub repository link resolver
- `data/news.json` — Twice-daily structured dispatches and candidate matrix
- `scripts/update_news.py` — Python updater executed twice daily by GitHub Actions
- `.github/workflows/update-news.yml` — Twice-daily cron job (`0 6,18 * * *`)
- `.github/workflows/deploy-pages.yml` — Automated GitHub Pages deployment on every push
