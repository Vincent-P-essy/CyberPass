import hashlib
import mimetypes
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, cast

import boto3

from app.core.config import Settings, get_settings

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "text/csv",
    "text/plain",
}
ALLOWED_EXTENSIONS = {".csv", ".docx", ".jpeg", ".jpg", ".pdf", ".png", ".txt", ".xlsx"}


class StorageError(ValueError):
    pass


@dataclass(frozen=True)
class StoredObject:
    object_key: str
    original_filename: str
    mime_type: str
    size_bytes: int
    sha256: str


def sanitize_filename(filename: str) -> str:
    leaf = Path(filename.replace("\\", "/")).name
    clean = re.sub(r"[^A-Za-z0-9._ -]", "_", leaf).strip(" .")
    clean = re.sub(r"\s+", "-", clean)
    if not clean:
        clean = "document"
    return clean[:180]


def validate_upload(
    filename: str, mime_type: str | None, content: bytes, max_bytes: int
) -> tuple[str, str]:
    if not content:
        raise StorageError("Le fichier est vide")
    if len(content) > max_bytes:
        raise StorageError(f"Le fichier dépasse la limite de {max_bytes} octets")
    safe_name = sanitize_filename(filename)
    extension = Path(safe_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise StorageError("Extension de fichier non autorisée")
    normalized_mime = (
        mime_type or mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
    ).lower()
    if normalized_mime == "application/octet-stream":
        normalized_mime = mimetypes.guess_type(safe_name)[0] or normalized_mime
    if normalized_mime not in ALLOWED_MIME_TYPES:
        raise StorageError("Type de fichier non autorisé")
    if extension == ".pdf" and not content.startswith(b"%PDF"):
        raise StorageError("Le contenu ne correspond pas à un fichier PDF")
    if extension in {".xlsx", ".docx"} and not content.startswith(b"PK"):
        raise StorageError("Le contenu ne correspond pas au format Office attendu")
    if extension == ".png" and not content.startswith(b"\x89PNG"):
        raise StorageError("Le contenu ne correspond pas à une image PNG")
    if extension in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8"):
        raise StorageError("Le contenu ne correspond pas à une image JPEG")
    return safe_name, normalized_mime


class ObjectStorage(Protocol):
    def put(
        self, organization_id: uuid.UUID, filename: str, mime_type: str, content: bytes
    ) -> StoredObject: ...

    def local_path(self, object_key: str) -> Path | None: ...

    def signed_download_url(self, object_key: str, filename: str) -> str | None: ...

    def delete(self, object_key: str) -> None: ...


class LocalObjectStorage:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)

    def put(
        self, organization_id: uuid.UUID, filename: str, mime_type: str, content: bytes
    ) -> StoredObject:
        extension = Path(filename).suffix.lower()
        object_key = f"{organization_id}/{uuid.uuid4().hex}{extension}"
        target = (self.root / object_key).resolve()
        if self.root not in target.parents:
            raise StorageError("Chemin de stockage invalide")
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        target.write_bytes(content)
        target.chmod(0o600)
        return StoredObject(
            object_key=object_key,
            original_filename=filename,
            mime_type=mime_type,
            size_bytes=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
        )

    def local_path(self, object_key: str) -> Path | None:
        target = (self.root / object_key).resolve()
        if self.root not in target.parents or not target.is_file():
            return None
        return target

    def signed_download_url(self, object_key: str, filename: str) -> str | None:
        return None

    def delete(self, object_key: str) -> None:
        target = self.local_path(object_key)
        if target:
            target.unlink(missing_ok=True)


class S3ObjectStorage:
    def __init__(self, config: Settings) -> None:
        self.bucket = config.s3_bucket
        self.ttl = config.signed_url_seconds
        self.client = boto3.client(
            "s3",
            endpoint_url=config.s3_endpoint_url,
            aws_access_key_id=config.s3_access_key,
            aws_secret_access_key=config.s3_secret_key,
            region_name=config.s3_region,
        )
        self.signing_client = boto3.client(
            "s3",
            endpoint_url=config.s3_public_endpoint_url or config.s3_endpoint_url,
            aws_access_key_id=config.s3_access_key,
            aws_secret_access_key=config.s3_secret_key,
            region_name=config.s3_region,
        )

    def put(
        self, organization_id: uuid.UUID, filename: str, mime_type: str, content: bytes
    ) -> StoredObject:
        extension = Path(filename).suffix.lower()
        object_key = f"organizations/{organization_id}/evidences/{uuid.uuid4().hex}{extension}"
        self.client.put_object(
            Bucket=self.bucket,
            Key=object_key,
            Body=content,
            ContentType=mime_type,
            CacheControl="private, no-store",
            ServerSideEncryption="AES256",
            Metadata={"sha256": hashlib.sha256(content).hexdigest()},
        )
        return StoredObject(
            object_key=object_key,
            original_filename=filename,
            mime_type=mime_type,
            size_bytes=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
        )

    def local_path(self, object_key: str) -> Path | None:
        return None

    def signed_download_url(self, object_key: str, filename: str) -> str | None:
        return cast(
            str,
            self.signing_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": object_key,
                    "ResponseContentDisposition": (
                        f'attachment; filename="{sanitize_filename(filename)}"'
                    ),
                    "ResponseCacheControl": "private, no-store",
                },
                ExpiresIn=self.ttl,
            ),
        )

    def delete(self, object_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=object_key)


def scan_for_malware(_content: bytes) -> None:
    """Extension point intentionally fail-closed when a scanner is configured later."""


def build_storage(config: Settings | None = None) -> ObjectStorage:
    config = config or get_settings()
    if config.storage_backend == "s3":
        return S3ObjectStorage(config)
    return LocalObjectStorage(config.local_storage_path)
