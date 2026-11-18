/**
 * Maccabi Haifa FC — Head Coach Search Live Newsroom
 * Handles:
 * 1. Dynamic GitHub Repository URL resolution (auto-detects username & repo when hosted on GitHub Pages)
 * 2. Loading and filtering twice-daily dispatches & candidate matrices from data/news.json
 * 3. Live countdown timer to the next twice-daily update slot (08:00 IST & 20:00 IST)
 * 4. On-demand live RSS wire supplement check for breaking Maccabi Haifa head coach headlines
 */

const DEFAULT_REPO_SLUG = 'anton/maccabi-haifa-coach-tracker';

let newsData = null;
let activeCandidateFilter = 'all';
let activeSlotFilter = 'all';

/**
 * Auto-detects the GitHub repository URL if hosted on *.github.io,
 * or uses the configured repository URL, and updates all GitHub links on the website.
 */
function configureGitHubRepoLinks() {
  let repoUrl = `https://github.com/${DEFAULT_REPO_SLUG}`;
  let displaySlug = `github.com/${DEFAULT_REPO_SLUG}`;

  const host = window.location.hostname;
  const pathParts = window.location.pathname.split('/').filter(Boolean);

  if (host.endsWith('.github.io')) {
    const username = host.replace('.github.io', '');
    const repoName = pathParts.length > 0 ? pathParts[0] : `${username}.github.io`;
    repoUrl = `https://github.com/${username}/${repoName}`;
    displaySlug = `github.com/${username}/${repoName}`;
  } else if (window.GITHUB_REPO_URL) {
    repoUrl = window.GITHUB_REPO_URL;
    displaySlug = repoUrl.replace(/^https?:\/\//, '');
  }

  const headerLink = document.getElementById('header-github-link');
  const cardLink = document.getElementById('card-github-link');
  const footerLink = document.getElementById('footer-github-link');
  const repoDisplay = document.getElementById('repo-url-display');
  const footerRepoText = document.getElementById('footer-repo-text');

  if (headerLink) headerLink.href = repoUrl;
  if (cardLink) cardLink.href = repoUrl;
  if (footerLink) footerLink.href = repoUrl;
  if (repoDisplay) repoDisplay.textContent = displaySlug;
  if (footerRepoText) footerRepoText.textContent = `Repository: ${displaySlug}`;
}

/**
 * Computes countdown to next 08:00 or 20:00 Israel Time (UTC+2) twice-daily update slot.
 */
function updateTwiceDailyCountdown() {
  const now = new Date();
  // Convert current time to Israel Standard Time (UTC+2)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istNow = new Date(utcMs + 2 * 3600000);

  const hours = istNow.getHours();
  const nextTarget = new Date(istNow);

  let nextSlotName = 'Morning Edition (08:00 IST)';
  if (hours < 8) {
    nextTarget.setHours(8, 0, 0, 0);
    nextSlotName = 'Morning Edition (08:00 IST)';
  } else if (hours < 20) {
    nextTarget.setHours(20, 0, 0, 0);
    nextSlotName = 'Evening Edition (20:00 IST)';
  } else {
    nextTarget.setDate(nextTarget.getDate() + 1);
    nextTarget.setHours(8, 0, 0, 0);
    nextSlotName = 'Morning Edition (08:00 IST)';
  }

  const diffMs = nextTarget - istNow;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMinutes = Math.floor((diffMs % 3600000) / 60000);
  const diffSeconds = Math.floor((diffMs % 60000) / 1000);

  const timerEl = document.getElementById('next-sync-countdown');
  if (timerEl) {
    const h = String(diffHours).padStart(2, '0');
    const m = String(diffMinutes).padStart(2, '0');
    const s = String(diffSeconds).padStart(2, '0');
    timerEl.textContent = `${h}h ${m}m ${s}s (${nextSlotName.split(' ')[0]})`;
  }

  // Highlight active slot in the schedule box
  const morningSlot = document.getElementById('slot-morning');
  const eveningSlot = document.getElementById('slot-evening');
  if (morningSlot && eveningSlot) {
    if (hours >= 8 && hours < 20) {
      morningSlot.classList.add('active-slot');
      eveningSlot.classList.remove('active-slot');
    } else {
      eveningSlot.classList.add('active-slot');
      morningSlot.classList.remove('active-slot');
    }
  }
}

/**
 * Renders the Candidate Contender cards
 */
function renderCandidates(candidates) {
  const container = document.getElementById('candidates-container');
  if (!container) return;

  const filtered = candidates.filter((c) => {
    if (activeCandidateFilter === 'all') return true;
    return c.type.toLowerCase().includes(activeCandidateFilter.toLowerCase());
  });

  container.innerHTML = filtered
    .map(
      (c, idx) => `
    <article class="candidate-card ${idx === 0 && activeCandidateFilter === 'all' ? 'frontrunner' : ''}">
      <div>
        <div class="candidate-top">
          <div>
            <h3 class="candidate-name">${c.name}</h3>
            <p class="candidate-role">${c.role} • ${c.nationality}</p>
          </div>
          <span class="tier-badge">${c.tier}</span>
        </div>

        <div class="prob-bar-wrap" style="margin-top: 14px;">
          <div class="prob-header">
            <span class="prob-status">${c.status}</span>
            <span class="prob-pct">${c.probability}% Probability</span>
          </div>
          <div class="prob-track">
            <div class="prob-fill" style="width: ${c.probability}%"></div>
          </div>
        </div>

        <p class="candidate-summary" style="margin-top: 14px;">${c.summary}</p>
      </div>

      <div class="candidate-terms">
        <strong>Contract / Status Note:</strong> ${c.contractTerms}
      </div>
    </article>
  `
    )
    .join('');
}

/**
 * Renders the Twice-Daily News Dispatches
 */
function renderDispatches(dispatches) {
  const container = document.getElementById('dispatches-container');
  if (!container) return;

  const filtered = dispatches.filter((d) => {
    if (activeSlotFilter === 'all') return true;
    return d.slot === activeSlotFilter;
  });

  container.innerHTML = filtered
    .map((d) => {
      const isEvening = d.slot.toLowerCase().includes('evening');
      const detailsHtml = (d.details || [])
        .map((item) => `<li>${item}</li>`)
        .join('');

      return `
      <article class="dispatch-card ${isEvening ? 'evening-slot' : 'morning-slot'}">
        <div class="dispatch-meta">
          <span class="slot-badge">${d.slot.toUpperCase()} • ${d.time}</span>
          <span class="dispatch-date">${d.date}</span>
          <span class="dispatch-tag">${d.tag}</span>
          <span class="dispatch-tag">${d.tier}</span>
        </div>
        <h3 class="dispatch-title">${d.title}</h3>
        <p class="dispatch-excerpt">${d.excerpt}</p>
        ${detailsHtml ? `<ul class="dispatch-details">${detailsHtml}</ul>` : ''}
        <div class="dispatch-footer">
          <span>Via: <strong>${d.source}</strong></span>
          <a href="${d.sourceUrl}" target="_blank" rel="noopener noreferrer" class="dispatch-source-link">
            Source Reference ↗
          </a>
        </div>
      </article>
    `;
    })
    .join('');
}

/**
 * Loads `data/news.json` and populates the dashboard
 */
async function loadNewsData() {
  try {
    const response = await fetch(`data/news.json?t=${Date.now()}`);
    if (!response.ok) throw new Error('Failed to load news.json');
    newsData = await response.json();

    const editionPill = document.getElementById('current-edition-pill');
    const updatedStamp = document.getElementById('last-updated-stamp');
    const stageVal = document.getElementById('stage-val');
    const leadVal = document.getElementById('lead-candidate-val');

    if (editionPill && newsData.editionSlot) {
      editionPill.textContent = newsData.editionSlot.toUpperCase();
    }
    if (updatedStamp && newsData.lastUpdated) {
      const dt = new Date(newsData.lastUpdated);
      updatedStamp.textContent = `Last Synced: ${dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })} • ${newsData.editionSlot}`;
    }
    if (stageVal && newsData.statusSummary) {
      stageVal.textContent = newsData.statusSummary.stage;
    }
    if (leadVal && newsData.statusSummary) {
      leadVal.textContent = `${newsData.statusSummary.leadCandidate} (${newsData.statusSummary.probability}%)`;
    }

    renderCandidates(newsData.candidates || []);
    renderDispatches(newsData.dispatches || []);
  } catch (err) {
    console.error('Error loading news data:', err);
  }
}

/**
 * Optional client-side live RSS check via rss2json proxy to supplement the twice-daily static JSON
 */
async function checkLiveWireSupplement() {
  const btn = document.getElementById('refresh-feed-btn');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Syncing...';
  }

  await loadNewsData();

  try {
    const rssQuery = encodeURIComponent(
      'https://news.google.com/rss/search?q="Maccabi+Haifa"+coach+OR+"Ran+Ben+Shimon"+OR+"Refaelov"&hl=en-US&gl=US&ceid=US:en'
    );
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssQuery}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const container = document.getElementById('live-wire-container');
        const list = document.getElementById('live-wire-list');
        const ts = document.getElementById('live-wire-timestamp');
        if (container && list) {
          container.hidden = false;
          if (ts) ts.textContent = `Checked at ${new Date().toLocaleTimeString()}`;
          list.innerHTML = data.items
            .slice(0, 3)
            .map(
              (item) => `
              <div class="wire-item">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
                <span>${new Date(item.pubDate).toLocaleDateString()}</span>
              </div>
            `
            )
            .join('');
        }
      }
    }
  } catch (_) {
    // Offline or sandboxed environment: fallback gracefully to static data/news.json
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Synced ✓';
      setTimeout(() => {
        btn.querySelector('span').textContent = 'Check Update';
      }, 2200);
    }
  }
}

/**
 * Wire up interactive filters and periodic countdown
 */
document.addEventListener('DOMContentLoaded', () => {
  configureGitHubRepoLinks();
  loadNewsData();
  updateTwiceDailyCountdown();
  setInterval(updateTwiceDailyCountdown, 1000);

  // Candidate filter buttons
  const candidateBtns = document.querySelectorAll('#candidate-filters .filter-btn');
  candidateBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      candidateBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCandidateFilter = btn.getAttribute('data-filter') || 'all';
      if (newsData) renderCandidates(newsData.candidates || []);
    });
  });

  // Dispatch slot filter buttons
  const dispatchBtns = document.querySelectorAll('#dispatch-filters .filter-btn');
  dispatchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      dispatchBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeSlotFilter = btn.getAttribute('data-slot') || 'all';
      if (newsData) renderDispatches(newsData.dispatches || []);
    });
  });

  // Refresh button
  const refreshBtn = document.getElementById('refresh-feed-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', checkLiveWireSupplement);
  }
});
