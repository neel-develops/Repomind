import pytest
import math
from datetime import datetime, timezone, timedelta

# Simple replica of scoring formulas from pipeline.py for offline testing
def calculate_popularity(stars: int, forks: int, watchers: int) -> int:
    pop_score = 12 * math.log1p(stars) + 8 * math.log1p(forks) + 4 * math.log1p(watchers)
    return min(100, max(0, int(round(pop_score))))

def calculate_activity(recent_commits: int, recent_prs: int, days_since_update: int) -> int:
    s_updates = max(0, 100 - (days_since_update * 3))
    s_commits = min(100, recent_commits * 2)
    s_prs = min(100, recent_prs * 4)
    return min(100, max(0, int(round(0.4 * s_commits + 0.3 * s_prs + 0.3 * s_updates))))

def calculate_health(closed_issues: int, open_issues: int, closed_prs: int, open_prs: int, days_since_update: int, has_license: bool, contributors_count: int) -> int:
    total_issues = open_issues + closed_issues
    s_issue_res = (closed_issues / total_issues * 100) if total_issues > 0 else 100.0
    
    total_prs = open_prs + closed_prs
    s_pr_res = (closed_prs / total_prs * 100) if total_prs > 0 else 100.0
    
    s_updates_health = max(0, 100 - (days_since_update * 2))
    
    s_license = 50 if has_license else 0
    s_contribs_count = min(50, contributors_count * 2.5)
    s_community = s_license + s_contribs_count
    
    return min(100, max(0, int(round(0.4 * s_issue_res + 0.3 * s_pr_res + 0.15 * s_updates_health + 0.15 * s_community))))

# Test cases
def test_popularity_bounds():
    # Massive project (e.g. React level)
    p_large = calculate_popularity(stars=224000, forks=45000, watchers=224000)
    assert p_large == 100
    
    # Zero metrics
    p_zero = calculate_popularity(0, 0, 0)
    assert p_zero == 0
    
    # Small growing project
    p_small = calculate_popularity(100, 10, 5)
    assert 0 < p_small < 100

def test_activity_decay():
    # Freshly active repo
    a_active = calculate_activity(recent_commits=50, recent_prs=25, days_since_update=0)
    assert a_active == 100
    
    # Inactive/decayed repo
    a_stale = calculate_activity(recent_commits=0, recent_prs=0, days_since_update=40)
    assert a_stale == 0
    
    # Moderately active
    a_med = calculate_activity(recent_commits=10, recent_prs=5, days_since_update=5)
    assert 0 < a_med < 100

def test_health_metrics():
    # Perfect health repo
    h_perfect = calculate_health(
        closed_issues=10, open_issues=0, 
        closed_prs=5, open_prs=0, 
        days_since_update=0, has_license=True, 
        contributors_count=20
    )
    assert h_perfect == 100
    
    # Poor health repo (unresolved issues, no license, single contributor, stale)
    h_poor = calculate_health(
        closed_issues=0, open_issues=10, 
        closed_prs=0, open_prs=5, 
        days_since_update=60, has_license=False, 
        contributors_count=1
    )
    assert h_poor < 30
