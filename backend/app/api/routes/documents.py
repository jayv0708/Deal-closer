import os
import shutil
from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.project import Document, Project, DocumentType, DocumentStatus
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.api.dependencies.auth import get_current_active_user
from ingestion.pipelines.main import DocumentIngestionPipeline

router = APIRouter()

UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: UUID = Form(...),
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Upload a new project document.
    """
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    filename = f"{project_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = Document(
        project_id=project_id,
        filename=file.filename or "unknown",
        document_type=document_type,
        storage_path=file_path,
        processing_status=DocumentStatus.UPLOADED
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    return doc

@router.post("/{document_id}/process", response_model=DocumentResponse)
async def process_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Trigger processing of a document.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalars().first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    pipeline = DocumentIngestionPipeline(db)
    await pipeline.process_document(document)
    
    return document

@router.get("/project/{project_id}", response_model=List[DocumentResponse])
async def get_project_documents(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get all documents for a project.
    """
    result = await db.execute(select(Document).where(Document.project_id == project_id))
    return result.scalars().all()
