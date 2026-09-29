from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.knowledge import KnowledgeChunk
from ingestion.embeddings.openai_embedder import OpenAIEmbedder

class RAGRetriever:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.embedder = OpenAIEmbedder()

    async def retrieve(self, project_id: UUID, query: str, limit: int = 5) -> List[KnowledgeChunk]:
        """
        Retrieve relevant knowledge chunks for a project based on a query.
        """
        # 1. Embed the query
        query_embedding = await self.embedder.embed_text(query)
        
        # 2. Search using pgvector cosine distance (<=>)
        stmt = (
            select(KnowledgeChunk)
            .where(KnowledgeChunk.project_id == project_id)
            .order_by(KnowledgeChunk.embedding.cosine_distance(query_embedding))
            .limit(limit)
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
