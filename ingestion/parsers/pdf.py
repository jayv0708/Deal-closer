from pypdf import PdfReader
from typing import Dict, Any

class PDFParser:
    def parse(self, file_path: str) -> str:
        """
        Parse a PDF file and extract its text content.
        """
        text = ""
        with open(file_path, "rb") as file:
            reader = PdfReader(file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
