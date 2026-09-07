from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


KNOWLEDGE_BASE_PATH = Path(__file__).resolve().parent.parent / "knowledge_base"

# Minimum similarity required to consider a KB article relevant.
# This prevents unrelated articles from being returned.
MIN_RELEVANCE_SCORE = 0.05


def load_knowledge_base():
    documents = []

    for file_path in KNOWLEDGE_BASE_PATH.glob("*.txt"):
        content = file_path.read_text(encoding="utf-8")

        if content.strip():
            documents.append({
                "filename": file_path.name,
                "content": content
            })

    return documents


def retrieve_relevant_content(query: str, top_k: int = 3):
    documents = load_knowledge_base()

    if not documents:
        return []

    texts = [doc["content"] for doc in documents]

    vectorizer = TfidfVectorizer(stop_words="english")
    vectors = vectorizer.fit_transform(texts + [query])

    similarities = cosine_similarity(
        vectors[-1],
        vectors[:-1]
    ).flatten()

    ranked_indexes = similarities.argsort()[::-1][:top_k]

    results = []

    for index in ranked_indexes:

        score = float(similarities[index])

        # Ignore weak/unrelated matches
        if score >= MIN_RELEVANCE_SCORE:
            results.append({
                "filename": documents[index]["filename"],
                "content": documents[index]["content"],
                "score": round(score, 3)
            })

    return results