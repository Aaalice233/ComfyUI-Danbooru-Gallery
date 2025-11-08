"""
Danbooru tag fetcher
Fetches hot tags from Danbooru API with rate limiting and retry mechanism
"""

import aiohttp
import asyncio
import time
from typing import List, Dict, Optional, Callable
from pathlib import Path

# Logger导入
from ...utils.logger import get_logger
logger = get_logger(__name__)


class DanbooruTagFetcher:
    """Fetch tags from Danbooru API"""

    # Danbooru API endpoint
    API_BASE = "https://danbooru.donmai.us"

    # Category mapping
    CATEGORIES = {
        0: "general",
        1: "artist",
        3: "copyright",
        4: "character",
        5: "meta"
    }

    def __init__(self, rate_limit: float = 2.0):
        """
        Initialize fetcher

        Args:
            rate_limit: Requests per second (default 2 to respect Danbooru limits)
        """
        self.rate_limit = rate_limit
        self.last_request_time = 0
        self.session = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session

    async def close(self):
        """Close HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None

    async def _rate_limit_wait(self):
        """Wait to respect rate limit"""
        if self.rate_limit > 0:
            min_interval = 1.0 / self.rate_limit
            elapsed = time.time() - self.last_request_time
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
        self.last_request_time = time.time()

    async def _fetch_with_retry(self, url: str, params: Dict,
                                max_retries: int = 3,
                                backoff_factor: float = 2.0) -> Optional[List[Dict]]:
        """
        Fetch URL with exponential backoff retry

        Args:
            url: URL to fetch
            params: Query parameters
            max_retries: Maximum number of retries
            backoff_factor: Backoff multiplier

        Returns:
            List of tag dictionaries or None on failure
        """
        session = await self._get_session()

        for attempt in range(max_retries):
            try:
                await self._rate_limit_wait()

                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 429:  # Rate limited
                        wait_time = backoff_factor ** (attempt + 1)
                        logger.warning(f"⚠️ Rate limited, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                    elif response.status == 404:
                        # No more results
                        return []
                    else:
                        logger.warning(f"⚠️ HTTP {response.status}, retry {attempt + 1}/{max_retries}")
                        await asyncio.sleep(backoff_factor ** attempt)

            except asyncio.TimeoutError:
                logger.warning(f"⚠️ Timeout, retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(backoff_factor ** attempt)

            except aiohttp.ClientError as e:
                logger.warning(f"⚠️ Network error: {e}, retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(backoff_factor ** attempt)

            except Exception as e:
                logger.error(f"❌ Unexpected error: {e}")
                break

        return None

    async def fetch_tags_page(self, page: int, limit: int = 1000,
                             min_post_count: Optional[int] = None) -> Optional[List[Dict]]:
        """
        Fetch one page of tags

        Args:
            page: Page number (1-indexed)
            limit: Tags per page (max 1000)
            min_post_count: Minimum post count filter

        Returns:
            List of tag info dictionaries
        """
        url = f"{self.API_BASE}/tags.json"
        params = {
            "search[order]": "count",
            "search[hide_empty]": "true",
            "limit": min(limit, 1000),
            "page": page
        }

        if min_post_count is not None:
            params["search[post_count]"] = f">={min_post_count}"

        tags = await self._fetch_with_retry(url, params)

        if tags is None:
            return None

        # Extract relevant information
        results = []
        for tag in tags:
            results.append({
                "tag": tag.get("name", "").lower(),
                "category": tag.get("category", 0),
                "post_count": tag.get("post_count", 0),
                # Danbooru API doesn't provide translation directly
                # Will be added later from translation system
                "translation_cn": None
            })

        return results

    async def fetch_hot_tags(self,
                            max_tags: int = 100000,
                            min_post_count: int = 100,
                            progress_callback: Optional[Callable[[int, int, int], None]] = None,
                            start_page: int = 1) -> List[Dict]:
        """
        Fetch hot tags from Danbooru

        Args:
            max_tags: Maximum number of tags to fetch
            min_post_count: Minimum post count threshold
            progress_callback: Callback(current_page, total_pages, fetched_count)
            start_page: Starting page (for resume)

        Returns:
            List of tag dictionaries
        """
        all_tags = []
        tags_per_page = 1000
        estimated_pages = (max_tags + tags_per_page - 1) // tags_per_page

        logger.info(f"📥 Starting to fetch {max_tags} hot tags (min_count={min_post_count})...")

        page = start_page
        consecutive_empty = 0

        while len(all_tags) < max_tags:
            # Fetch one page
            tags = await self.fetch_tags_page(page, tags_per_page, min_post_count)

            if tags is None:
                logger.error(f"❌ Failed to fetch page {page}, stopping...")
                break

            if not tags or len(tags) == 0:
                consecutive_empty += 1
                if consecutive_empty >= 2:
                    logger.info(f"✓ No more tags available (page {page})")
                    break
            else:
                consecutive_empty = 0

            # Filter out tags below threshold
            valid_tags = [t for t in tags if t['post_count'] >= min_post_count]
            all_tags.extend(valid_tags)

            # Progress callback
            if progress_callback:
                progress_callback(page, estimated_pages, len(all_tags))
            else:
                logger.info(f"📥 Page {page}/{estimated_pages} | "
                      f"Fetched: {len(all_tags)}/{max_tags} tags")

            # Check if we have enough
            if len(all_tags) >= max_tags:
                all_tags = all_tags[:max_tags]
                break

            page += 1

            # Safety limit: don't go beyond 200 pages
            if page > 200:
                logger.warning(f"⚠️ Reached page limit (200), stopping...")
                break

        logger.info(f"✅ Fetched {len(all_tags)} tags successfully!")
        return all_tags

    async def fetch_tag_details(self, tag_name: str) -> Optional[Dict]:
        """
        Fetch details for a specific tag

        Args:
            tag_name: Tag name to fetch

        Returns:
            Tag info dictionary or None
        """
        url = f"{self.API_BASE}/tags.json"
        params = {
            "search[name]": tag_name,
            "limit": 1
        }

        tags = await self._fetch_with_retry(url, params)

        if tags and len(tags) > 0:
            tag = tags[0]
            return {
                "tag": tag.get("name", "").lower(),
                "category": tag.get("category", 0),
                "post_count": tag.get("post_count", 0),
                "translation_cn": None
            }

        return None

    async def incremental_update(self,
                                 existing_tags: List[str],
                                 update_count: int = 10000,
                                 progress_callback: Optional[Callable[[int, int], None]] = None) -> List[Dict]:
        """
        Incrementally update existing tags

        Args:
            existing_tags: List of existing tag names
            update_count: Number of top tags to update
            progress_callback: Callback(current, total)

        Returns:
            List of updated tag dictionaries
        """
        logger.info(f"🔄 Incremental update: checking top {update_count} tags...")

        # Fetch top N tags
        updated_tags = []
        page = 1
        tags_per_page = 1000

        while len(updated_tags) < update_count:
            tags = await self.fetch_tags_page(page, tags_per_page)

            if tags is None or len(tags) == 0:
                break

            updated_tags.extend(tags)

            if progress_callback:
                progress_callback(len(updated_tags), update_count)
            else:
                logger.info(f"🔄 Checked {len(updated_tags)}/{update_count} tags")

            if len(updated_tags) >= update_count:
                updated_tags = updated_tags[:update_count]
                break

            page += 1

        # Count new tags
        existing_set = set(existing_tags)
        new_tags = [t for t in updated_tags if t['tag'] not in existing_set]

        logger.info(f"✅ Incremental update complete!")
        logger.info(f"Total checked: {len(updated_tags)}")
        logger.info(f"New tags: {len(new_tags)}")
        logger.info(f"Updated: {len(updated_tags) - len(new_tags)}")

        return updated_tags


async def test_fetcher():
    """Test the fetcher"""
    fetcher = DanbooruTagFetcher()

    try:
        # Test fetching one page
        logger.info("Testing single page fetch...")
        tags = await fetcher.fetch_tags_page(1, limit=10)
        if tags:
            logger.info(f"✓ Fetched {len(tags)} tags")
            for tag in tags[:3]:
                logger.info(f"  - {tag['tag']} (count: {tag['post_count']}, category: {tag['category']})")

        # Test fetching specific tag
        logger.info("\nTesting specific tag fetch...")
        tag = await fetcher.fetch_tag_details("1girl")
        if tag:
            logger.info(f"✓ Found tag: {tag}")

    finally:
        await fetcher.close()


if __name__ == "__main__":
    asyncio.run(test_fetcher())
