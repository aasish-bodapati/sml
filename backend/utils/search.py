from ddgs import DDGS

def search_nutrition(query: str) -> str:
    """
    Run a DuckDuckGo text search for a nutrition query.
    Returns a concise snippet (max 400 chars) for the LLM to use.
    """
    full_query = f"{query} nutrition facts calories protein fat carbs"
    
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(full_query, max_results=2))
            
        if not results:
            return "No nutrition information found. Make an educated guess based on the ingredients."
            
        # Combine snippets
        snippet = " | ".join(r.get("body", "") for r in results)
        return snippet[:400]
    except Exception as e:
        print(f"Search failed for {query}: {e}")
        return "Search failed. Make an educated guess."
