from typing import List

class TextChunker:
    def __init__(self, chunk_size: int = 1000, overlap: int = 200):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks of approximately `chunk_size` characters.
        """
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + self.chunk_size
            
            if end >= text_length:
                chunks.append(text[start:])
                break
                
            # Try to find a nice breaking point (newline or space) near the end
            split_point = text.rfind("\n", start, end)
            if split_point == -1 or split_point < start + self.chunk_size // 2:
                split_point = text.rfind(" ", start, end)
            
            if split_point != -1 and split_point > start:
                end = split_point
                
            chunks.append(text[start:end])
            start = end - self.overlap
            
            # Avoid getting stuck
            if start <= chunks[-1].__len__() - self.chunk_size:
                start = end
                
        return [c.strip() for c in chunks if c.strip()]
