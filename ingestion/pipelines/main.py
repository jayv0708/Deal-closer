import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Document, DocumentStatus
from app.models.knowledge import KnowledgeChunk
from ingestion.parsers.pdf import PDFParser
from ingestion.chunking.text import TextChunker
from ingestion.embeddings.openai_embedder import OpenAIEmbedder

class DocumentIngestionPipeline:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.parser = PDFParser()
        self.chunker = TextChunker()
        self.embedder = OpenAIEmbedder()

    async def process_document(self, document: Document):
        """
        Process a single document: parse -> chunk -> embed -> store
        """
        try:
            document.processing_status = DocumentStatus.PROCESSING
            self.db.add(document)
            await self.db.commit()

            # 1. Parse
            if not os.path.exists(document.storage_path):
                raise FileNotFoundError(f"File not found: {document.storage_path}")
                
            text = self.parser.parse(document.storage_path)
            
            # 2. Chunk
            chunks = self.chunker.chunk(text)
            
            # 3. Embed and 4. Store
            # Process in batches to avoid API limits and memory issues
            batch_size = 100
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                embeddings = await self.embedder.embed_batch(batch_chunks)
                
                for j, (chunk_text, embedding) in enumerate(zip(batch_chunks, embeddings)):
                    knowledge_chunk = KnowledgeChunk(
                        project_id=document.project_id,
                        document_id=document.id,
                        content=chunk_text,
                        embedding=embedding,
                        page_number=None, # PDFParser needs enhancement to return page numbers
                        metadata_={"source": document.filename, "chunk_index": i + j}
                    )
                    self.db.add(knowledge_chunk)
                    
            document.processing_status = DocumentStatus.COMPLETED
            self.db.add(document)
            await self.db.commit()
            
        except Exception as e:
            document.processing_status = DocumentStatus.FAILED
            self.db.add(document)
            await self.db.commit()
            raise e
