import math
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

GITHUB_API_URL = "https://api.github.com"

class GithubRepoModel(BaseModel):
    fullName: str
    name: str
    owner: str
    ownerAvatarUrl: str
    description: Optional[str] = None
    stars: int
    forks: int
    watchers: int
    openIssues: int
    defaultBranch: str
    primaryLanguage: Optional[str] = None
    license: Optional[str] = None
    createdDate: str
    lastUpdatedDate: str

class ScoreModel(BaseModel):
    popularity: int
    activity: int
    health: int

class ContributorModel(BaseModel):
    login: str
    contributions: int

class AnalyticsResult(BaseModel):
    repository: GithubRepoModel
    scores: ScoreModel
    technology: Dict[str, float]
    contributors: Dict[str, Any]

# Custom Exceptions
class GithubAPIError(Exception):
    def __init__(self, message: str, status_code: int = 500, reset_time: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.reset_time = reset_time
        super().__init__(self.message)

async def make_github_request(url: str, token: Optional[str] = None, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
        
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=10.0)
        except httpx.RequestError as e:
            raise GithubAPIError(f"Network error communicating with GitHub: {str(e)}", status_code=503)
            
        # Check Rate Limit
        if response.status_code == 403 and "X-RateLimit-Remaining" in response.headers:
            if response.headers.get("X-RateLimit-Remaining") == "0":
                reset_timestamp = response.headers.get("X-RateLimit-Reset")
                reset_time_str = ""
                if reset_timestamp:
                    try:
                        reset_dt = datetime.fromtimestamp(int(reset_timestamp), tz=timezone.utc)
                        reset_time_str = reset_dt.isoformat()
                    except ValueError:
                        pass
                raise GithubAPIError("GitHub API rate limit exceeded.", status_code=403, reset_time=reset_time_str)
                
        if response.status_code == 404:
            raise GithubAPIError("Repository not found on GitHub.", status_code=404)
        elif response.status_code != 200:
            raise GithubAPIError(f"GitHub API returned error code {response.status_code}", status_code=response.status_code)
            
        return response.json()

async def run_intelligence_pipeline(full_name: str, token: Optional[str] = None) -> AnalyticsResult:
    # 1. Validation Layer
    parts = full_name.split("/")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise GithubAPIError("Invalid repository name format. Use owner/repo (e.g. facebook/react)", status_code=400)
        
    owner, repo = parts[0], parts[1]
    repo_url = f"{GITHUB_API_URL}/repos/{owner}/{repo}"
    
    # 2. Fetching Raw Data
    repo_raw = await make_github_request(repo_url, token)
    
    # Fetch languages
    languages_url = f"{repo_url}/languages"
    languages_raw = await make_github_request(languages_url, token)
    
    # Fetch contributors (limit to 30)
    contrib_url = f"{repo_url}/contributors"
    contrib_raw = []
    try:
        contrib_raw = await make_github_request(contrib_url, token, params={"per_page": 30})
    except Exception:
        # Gracefully handle contributor list errors (e.g. empty repos)
        pass

    # Fetch recent commits (last 30 days)
    since_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    commits_url = f"{repo_url}/commits"
    recent_commits_count = 0
    try:
        commits_raw = await make_github_request(commits_url, token, params={"since": since_date, "per_page": 100})
        recent_commits_count = len(commits_raw)
    except Exception:
        pass
        
    # Fetch issues and pull requests stats (we retrieve the last 100 issues/PRs to inspect state)
    issues_url = f"{repo_url}/issues"
    issues_raw = []
    try:
        # state=all retrieves open and closed issues/PRs
        issues_raw = await make_github_request(issues_url, token, params={"state": "all", "per_page": 100})
    except Exception:
        pass

    # 3. Transformation Layer
    license_info = repo_raw.get("license")
    license_name = license_info.get("spdx_id") or license_info.get("name") if license_info else None
    
    repo_model = GithubRepoModel(
        fullName=repo_raw.get("full_name"),
        name=repo_raw.get("name"),
        owner=repo_raw.get("owner", {}).get("login"),
        ownerAvatarUrl=repo_raw.get("owner", {}).get("avatar_url"),
        description=repo_raw.get("description"),
        stars=repo_raw.get("stargazers_count", 0),
        forks=repo_raw.get("forks_count", 0),
        watchers=repo_raw.get("watchers_count", 0),
        openIssues=repo_raw.get("open_issues_count", 0),
        defaultBranch=repo_raw.get("default_branch", "main"),
        primaryLanguage=repo_raw.get("language"),
        license=license_name,
        createdDate=repo_raw.get("created_at"),
        lastUpdatedDate=repo_raw.get("pushed_at") or repo_raw.get("updated_at")
    )
    
    # 4. Analytics & Technology Layer
    total_lang_bytes = sum(languages_raw.values())
    languages_percent = {}
    if total_lang_bytes > 0:
        for lang, byte_count in languages_raw.items():
            languages_percent[lang] = round((byte_count / total_lang_bytes) * 100, 1)
            
    # Contributor distributions
    top_contributors = []
    total_contributions = 0
    for c in contrib_raw:
        if isinstance(c, dict):
            login = c.get("login")
            contribs = c.get("contributions", 0)
            if login:
                top_contributors.append({"login": login, "contributions": contribs})
                total_contributions += contribs
                
    # 5. Scoring Engine Layer
    # A. Popularity Score (Logarithmic distribution capped at 100)
    stars = repo_model.stars
    forks = repo_model.forks
    watchers = repo_model.watchers
    
    pop_score = 12 * math.log1p(stars) + 8 * math.log1p(forks) + 4 * math.log1p(watchers)
    popularity = min(100, max(0, int(round(pop_score))))
    
    # B. Activity Score (last 30 days)
    # Calculate days since last update
    last_update_dt = datetime.fromisoformat(repo_model.lastUpdatedDate.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    days_since_update = (now - last_update_dt).days
    
    s_updates = max(0, 100 - (days_since_update * 3))
    s_commits = min(100, recent_commits_count * 2)
    
    # Parse PR activity in last 100 entries (PRs contain "pull_request" key in issues response)
    recent_prs = [i for i in issues_raw if "pull_request" in i]
    recent_prs_count = len(recent_prs)
    s_prs = min(100, recent_prs_count * 4)
    
    activity = int(round(0.4 * s_commits + 0.3 * s_prs + 0.3 * s_updates))
    activity = min(100, max(0, activity))
    
    # C. Health Score
    # Issue resolution in last 100 issues (excluding PRs)
    pure_issues = [i for i in issues_raw if "pull_request" not in i]
    closed_issues = sum(1 for i in pure_issues if i.get("state") == "closed")
    total_issues = len(pure_issues)
    s_issue_res = (closed_issues / total_issues * 100) if total_issues > 0 else 100.0
    
    # PR resolution (merged or closed vs total PRs)
    closed_prs = sum(1 for p in recent_prs if p.get("state") == "closed")
    total_prs = len(recent_prs)
    s_pr_res = (closed_prs / total_prs * 100) if total_prs > 0 else 100.0
    
    # Update recency health decay (slower decay for health than activity)
    s_updates_health = max(0, 100 - (days_since_update * 2))
    
    # Community factors
    s_license = 50 if repo_model.license else 0
    s_contribs_count = min(50, len(contrib_raw) * 2.5)
    s_community = s_license + s_contribs_count
    
    health = int(round(0.4 * s_issue_res + 0.3 * s_pr_res + 0.15 * s_updates_health + 0.15 * s_community))
    health = min(100, max(0, health))
    
    return AnalyticsResult(
        repository=repo_model,
        scores=ScoreModel(popularity=popularity, activity=activity, health=health),
        technology=languages_percent,
        contributors={
            "totalCount": len(contrib_raw),
            "topContributors": top_contributors
        }
    )
