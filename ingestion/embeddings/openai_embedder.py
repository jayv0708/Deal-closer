import os
from typing import List
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class OpenAIEmbedder:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("LLM_API_KEY"))
        self.model = "text-embedding-3-small"

    async def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single piece of text.
        """
        response = await self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return response.data[0].embedding
        
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a batch of texts.
        """
        if not texts:
            return []
            
        response = await self.client.embeddings.create(
            input=texts,
            model=self.model
        )
        return [data.embedding for data in response.data]
