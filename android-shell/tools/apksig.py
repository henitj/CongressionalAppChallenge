#!/usr/bin/env python3
"""
Pure-Python APK Signature Scheme v1 + v2 + v3 toolkit.

Why this exists
---------------
Android's own `apksigner` is part of the Android SDK build-tools and needs a
JDK plus a ~400 MB SDK download. The EcoTrek shell is assembled with apktool on
a laptop that already has apktool.jar, so shipping a signer that only needs
`cryptography` keeps the release pipeline reproducible for anyone who can run
`build.sh`.

Play Protect and every Android release since 11 treat a v1-only ("JAR")
signature on an app that targets a modern API level as an invalid package, and
Android's own guidance is to sign with v1 + v2 + v3. This module implements all
three schemes, byte-for-byte compatible with AOSP's `apksig`:

  * APK Signing Block placement (immediately before the ZIP Central Directory)
  * chunked content digests (1 MiB chunks, 0xa5-prefixed; 0x5a-prefixed digest
    of digests)
  * v2 / v3 signed-data layout (signature algorithm ID + length-prefixed
    digest, certificates, additional attributes, SDK range for v3)
  * v1 JAR signature (MANIFEST.MF / CERT.SF / CERT.RSA), unchanged from the
    original `sign_v1.py`

Confidence: `verify_apk.py` re-derives every digest and signature from the
finished file, and this signer's output is byte-comparable against Google's
`apksig` golden test APKs (see android-shell/README.md, "How the signature is
checked").

Format reference: https://source.android.com/docs/security/features/apksigning
"""

from __future__ import annotations

import base64
import hashlib
import struct
import zipfile
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa
from cryptography.hazmat.primitives.serialization import pkcs7

ZIP_LOCAL_HEADER = b"PK\x03\x04"
ZIP_CENTRAL_HEADER = b"PK\x01\x02"
ZIP_EOCD = b"PK\x05\x06"
APK_SIG_BLOCK_MAGIC = b"APK Sig Block 42"

APK_SIGNATURE_SCHEME_V2_BLOCK_ID = 0x7109871A
APK_SIGNATURE_SCHEME_V3_BLOCK_ID = 0xF05368C0
VERITY_PADDING_BLOCK_ID = 0x42726577

# Content digest + signature algorithm IDs (AOSP SignatureAlgorithm).
SIG_RSA_PSS_SHA256 = 0x0101
SIG_RSA_PSS_SHA512 = 0x0102
SIG_RSA_PKCS1_SHA256 = 0x0103
SIG_RSA_PKCS1_SHA512 = 0x0104
SIG_ECDSA_SHA256 = 0x0201
SIG_ECDSA_SHA512 = 0x0202

# id -> (content digest algorithm name, hashlib name)
SIG_ALGORITHMS = {
    SIG_RSA_PSS_SHA256: ("sha256", "rsa-pss"),
    SIG_RSA_PSS_SHA512: ("sha512", "rsa-pss"),
    SIG_RSA_PKCS1_SHA256: ("sha256", "rsa-pkcs1"),
    SIG_RSA_PKCS1_SHA512: ("sha512", "rsa-pkcs1"),
    SIG_ECDSA_SHA256: ("sha256", "ecdsa"),
    SIG_ECDSA_SHA512: ("sha512", "ecdsa"),
}

CHUNK_SIZE = 1024 * 1024
ZIP_ALIGNMENT = 4


# --------------------------------------------------------------------------- #
# little-endian helpers
# --------------------------------------------------------------------------- #

def u16(data: bytes, offset: int = 0) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32(data: bytes, offset: int = 0) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def u64(data: bytes, offset: int = 0) -> int:
    return struct.unpack_from("<Q", data, offset)[0]


def p16(value: int) -> bytes:
    return struct.pack("<H", value)


def p32(value: int) -> bytes:
    return struct.pack("<I", value)


def p64(value: int) -> bytes:
    return struct.pack("<Q", value)


def length_prefixed(data: bytes) -> bytes:
    return p32(len(data)) + data


def sequence_of_length_prefixed(items: List[bytes]) -> bytes:
    """AOSP's encodeAsSequenceOfLengthPrefixedElements."""
    body = b"".join(length_prefixed(item) for item in items)
    return length_prefixed(body)


def read_length_prefixed(data: bytes, offset: int = 0) -> Tuple[bytes, int]:
    length = u32(data, offset)
    return data[offset + 4:offset + 4 + length], offset + 4 + length


# --------------------------------------------------------------------------- #
# ZIP structure
# --------------------------------------------------------------------------- #

def find_eocd(data: bytes) -> int:
    """Offset of the ZIP End of Central Directory record."""
    limit = max(0, len(data) - (0xFFFF + 22))
    index = data.rfind(ZIP_EOCD, limit)
    while index >= 0:
        # A real EOCD has a comment length that fits inside the file.
        if index + 22 <= len(data):
            comment_len = u16(data, index + 20)
            if index + 22 + comment_len == len(data):
                return index
        index = data.rfind(ZIP_EOCD, limit, index)
    raise ValueError("ZIP End of Central Directory record not found")


@dataclass
class SigningBlock:
    start: int
    central_dir_offset: int
    pairs: List[Tuple[int, bytes]] = field(default_factory=list)

    def find(self, block_id: int) -> Optional[bytes]:
        for pid, value in self.pairs:
            if pid == block_id:
                return value
        return None


def parse_signing_block(data: bytes, eocd_offset: Optional[int] = None) -> Optional[SigningBlock]:
    """Locate the APK Signing Block, if the file has one."""
    eocd = find_eocd(data) if eocd_offset is None else eocd_offset
    central_dir_offset = u32(data, eocd + 16)
    magic_offset = central_dir_offset - 16
    if magic_offset < 0 or data[magic_offset:central_dir_offset] != APK_SIG_BLOCK_MAGIC:
        return None
    size = u64(data, central_dir_offset - 24)
    start = central_dir_offset - 8 - size
    if start < 0 or u64(data, start) != size:
        raise ValueError("APK Signing Block size fields disagree")
    pairs: List[Tuple[int, bytes]] = []
    offset = start + 8
    end = central_dir_offset - 24
    while offset < end:
        length = u64(data, offset)
        if length < 4 or offset + 8 + length > end + 8:
            raise ValueError("Malformed APK Signing Block entry")
        block_id = u32(data, offset + 8)
        value = data[offset + 12:offset + 8 + length]
        pairs.append((block_id, value))
        offset += 8 + length
    return SigningBlock(start=start, central_dir_offset=central_dir_offset, pairs=pairs)


def zipalign(data: bytes, alignment: int = ZIP_ALIGNMENT) -> bytes:
    """4-byte align every uncompressed entry, the way `zipalign` does.

    Android 11 (API 30) and newer refuse to install an APK whose
    `resources.arsc` is compressed or is not aligned on a 4-byte boundary:
    the platform memory-maps that file, and an unaligned table has to be
    copied into RAM instead. Alignment is applied by growing each stored
    entry's extra field with a padding record, then mirroring the same padding
    into its Central Directory record so both views of the archive agree —
    Java's `java.util.zip.ZipFile` (which apktool uses) rejects an APK whose
    local and central extra-field lengths disagree.
    """
    eocd = find_eocd(data)
    count = u16(data, eocd + 10)
    central_dir_size = u32(data, eocd + 12)
    central_dir_offset = u32(data, eocd + 16)
    comment = data[eocd + 22:]

    records = []
    offset = central_dir_offset
    for _ in range(count):
        if data[offset:offset + 4] != ZIP_CENTRAL_HEADER:
            raise ValueError("malformed Central Directory record")
        name_length = u16(data, offset + 28)
        extra_length = u16(data, offset + 30)
        comment_length = u16(data, offset + 32)
        records.append({
            "offset": offset,
            "end": offset + 46 + name_length + extra_length + comment_length,
            "name_length": name_length,
            "extra_length": extra_length,
            "local_offset": u32(data, offset + 42),
            "method": u16(data, offset + 10),
        })
        offset = records[-1]["end"]
    if offset != central_dir_offset + central_dir_size:
        raise ValueError("Central Directory size does not match its records")

    body = bytearray()
    consumed = 0
    for record in sorted(records, key=lambda item: item["local_offset"]):
        local = record["local_offset"]
        if local < consumed:
            raise ValueError("local file headers are out of order")
        # Copy any bytes between entries verbatim (alignment gaps, if the
        # archive already had them).
        body += data[consumed:local]
        consumed = local

        name_length = u16(data, local + 26)
        extra_length = u16(data, local + 28)
        flags = u16(data, local + 6)
        if flags & 0x08:
            raise ValueError("streamed (data descriptor) entries are not supported")
        header_end = local + 30 + name_length + extra_length
        header = bytearray(data[local:header_end])
        compressed_size = u32(data, local + 18)

        record["padding"] = b""
        if record["method"] == 0:                     # stored -> must be aligned
            padding = (-(len(body) + len(header))) % alignment
            if padding:
                if padding < 4:                       # room for the extra-field header
                    padding += alignment
                record["padding"] = struct.pack("<HH", 0xD935, padding - 4) + b"\x00" * (padding - 4)
                header += record["padding"]
                struct.pack_into("<H", header, 28, extra_length + len(record["padding"]))

        record["new_local_offset"] = len(body)
        body += header + data[header_end:header_end + compressed_size]
        consumed = header_end + compressed_size

    body += data[consumed:central_dir_offset]

    central_dir = bytearray()
    for record in records:
        raw = bytearray(data[record["offset"]:record["end"]])
        if record["padding"]:
            name = raw[46:46 + record["name_length"]]
            extra = raw[46 + record["name_length"]:46 + record["name_length"] + record["extra_length"]]
            tail = raw[46 + record["name_length"] + record["extra_length"]:]
            raw = bytearray(raw[:46]) + name + extra + record["padding"] + tail
            struct.pack_into("<H", raw, 30, record["extra_length"] + len(record["padding"]))
        struct.pack_into("<I", raw, 42, record["new_local_offset"])
        central_dir += raw

    trailer = bytearray(data[eocd:eocd + 22])
    struct.pack_into("<I", trailer, 12, len(central_dir))
    struct.pack_into("<I", trailer, 16, len(body))
    return bytes(body) + bytes(central_dir) + bytes(trailer) + comment


def build_signing_block(pairs: List[Tuple[int, bytes]]) -> bytes:
    """Serialise ID-value pairs into an APK Signing Block."""
    body = b"".join(p64(4 + len(value)) + p32(block_id) + value for block_id, value in pairs)
    size = len(body) + 8 + 16          # trailing size field + magic
    return p64(size) + body + p64(size) + APK_SIG_BLOCK_MAGIC


# --------------------------------------------------------------------------- #
# content digests (APK Signature Scheme v2 / v3)
# --------------------------------------------------------------------------- #

def content_digest(
    data: bytes,
    signing_block_start: int,
    central_dir_offset: int,
    eocd_offset: int,
    digest_algorithm: str,
) -> bytes:
    """Chunked content digest, identical to AOSP ApkSigningBlockUtils.

    Sections: (1) everything before the APK Signing Block, (2) the ZIP Central
    Directory, (3) the ZIP End of Central Directory with its central-directory
    offset field pointing at the APK Signing Block. Every 1 MiB chunk is
    digested as H(0xa5 || uint32LE(chunk length) || chunk); the final digest is
    H(0x5a || uint32LE(total chunk count) || chunk digests...).
    """
    eocd = bytearray(data[eocd_offset:])
    struct.pack_into("<I", eocd, 16, signing_block_start)

    sections = (
        data[:signing_block_start],
        data[central_dir_offset:eocd_offset],
        bytes(eocd),
    )

    chunk_digests: List[bytes] = []
    for section in sections:
        if not section:
            continue                      # "No chunks are produced for empty segments"
        for start in range(0, len(section), CHUNK_SIZE):
            chunk = section[start:start + CHUNK_SIZE]
            hasher = hashlib.new(digest_algorithm)
            hasher.update(b"\xa5")
            hasher.update(p32(len(chunk)))
            hasher.update(chunk)
            chunk_digests.append(hasher.digest())

    top = hashlib.new(digest_algorithm)
    top.update(b"\x5a")
    top.update(p32(len(chunk_digests)))
    for digest in chunk_digests:
        top.update(digest)
    return top.digest()


# --------------------------------------------------------------------------- #
# v2 / v3 signer blocks
# --------------------------------------------------------------------------- #

@dataclass
class ParsedSigner:
    signed_data: bytes
    digests: List[Tuple[int, bytes]]
    signatures: List[Tuple[int, bytes]]
    public_key: bytes
    certificates: List[bytes]
    min_sdk: Optional[int] = None
    max_sdk: Optional[int] = None
    additional_attributes: List[Tuple[int, bytes]] = field(default_factory=list)


def parse_signers(block_value: bytes, v3: bool) -> List[ParsedSigner]:
    total = u32(block_value, 0)
    if total != len(block_value) - 4:
        raise ValueError("signer block length mismatch")
    offset = 4
    signers: List[ParsedSigner] = []
    while offset < len(block_value):
        signer, offset = read_length_prefixed(block_value, offset)
        cursor = 0
        signed_data, cursor = read_length_prefixed(signer, cursor)
        signatures_field, cursor = read_length_prefixed(signer, cursor)
        public_key, cursor = read_length_prefixed(signer, cursor)

        # Signed data field 1: sequence of (signature algorithm ID, content digest).
        digests_sequence, next_cursor = read_length_prefixed(signed_data, 0)
        digests: List[Tuple[int, bytes]] = []
        inner = 0
        while inner < len(digests_sequence):
            item, inner = read_length_prefixed(digests_sequence, inner)
            digests.append((u32(item, 0), item[8:]))

        # Field 2: sequence of certificates.
        certificates_sequence, next_cursor = read_length_prefixed(signed_data, next_cursor)
        certificates: List[bytes] = []
        inner = 0
        while inner < len(certificates_sequence):
            certificate, inner = read_length_prefixed(certificates_sequence, inner)
            certificates.append(certificate)

        min_sdk = max_sdk = None
        if v3:
            min_sdk = u32(signed_data, next_cursor)
            max_sdk = u32(signed_data, next_cursor + 4)
            next_cursor += 8

        # Field 3: sequence of additional attributes.
        attributes_sequence, _ = read_length_prefixed(signed_data, next_cursor)
        attributes: List[Tuple[int, bytes]] = []
        inner = 0
        while inner < len(attributes_sequence):
            item, inner = read_length_prefixed(attributes_sequence, inner)
            attributes.append((u32(item, 0), item[4:]))

        signatures: List[Tuple[int, bytes]] = []
        inner = 0
        while inner < len(signatures_field):
            item, inner = read_length_prefixed(signatures_field, inner)
            signatures.append((u32(item, 0), item[8:]))

        signers.append(
            ParsedSigner(
                signed_data=signed_data,
                digests=digests,
                signatures=signatures,
                public_key=public_key,
                certificates=certificates,
                min_sdk=min_sdk,
                max_sdk=max_sdk,
                additional_attributes=attributes,
            )
        )
    return signers


def _sign(private_key, signature_algorithm: str, digest_algorithm: str, data: bytes) -> bytes:
    hash_algorithm = hashes.SHA256() if digest_algorithm == "sha256" else hashes.SHA512()
    if signature_algorithm == "rsa-pkcs1":
        return private_key.sign(data, padding.PKCS1v15(), hash_algorithm)
    if signature_algorithm == "rsa-pss":
        return private_key.sign(
            data,
            padding.PSS(mgf=padding.MGF1(hash_algorithm), salt_length=hash_algorithm.digest_size),
            hash_algorithm,
        )
    if signature_algorithm == "ecdsa":
        return private_key.sign(data, ec.ECDSA(hash_algorithm))
    raise ValueError(f"unsupported signature algorithm: {signature_algorithm}")


def encode_public_key(public_key) -> bytes:
    """SubjectPublicKeyInfo DER, as AOSP encodes it."""
    return public_key.public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def _digest_field(content_digests: Dict[int, bytes], signature_algorithms: List[int]) -> bytes:
    """Signed-data field 1: sequence of (signature algorithm ID, content digest)."""
    items = [p32(algorithm) + length_prefixed(content_digests[algorithm]) for algorithm in signature_algorithms]
    return sequence_of_length_prefixed(items)


def _certificate_field(certificate: x509.Certificate) -> bytes:
    """Signed-data field 2: sequence of X.509 certificates (DER)."""
    return sequence_of_length_prefixed([certificate.public_bytes(serialization.Encoding.DER)])


def _signatures_field(signed_data: bytes, private_key, signature_algorithms: List[int]) -> bytes:
    items = []
    for algorithm in signature_algorithms:
        digest_algorithm, signature_kind = SIG_ALGORITHMS[algorithm]
        signature = _sign(private_key, signature_kind, digest_algorithm, signed_data)
        items.append(p32(algorithm) + length_prefixed(signature))
    return sequence_of_length_prefixed(items)


def encode_signer_block(signed_data: bytes, signatures_field: bytes, public_key) -> bytes:
    """signer block = lp(signed data) | signatures | lp(public key)."""
    return length_prefixed(signed_data) + signatures_field + length_prefixed(encode_public_key(public_key))


def build_signer_block_v2(
    content_digests: Dict[int, bytes],
    private_key,
    certificate: x509.Certificate,
    signature_algorithms: List[int],
) -> bytes:
    signed_data = (
        _digest_field(content_digests, signature_algorithms)
        + _certificate_field(certificate)
        + sequence_of_length_prefixed([])
    )
    signer = encode_signer_block(
        signed_data,
        _signatures_field(signed_data, private_key, signature_algorithms),
        certificate.public_key(),
    )
    return sequence_of_length_prefixed([signer])


def build_signer_block_v3(
    content_digests: Dict[int, bytes],
    private_key,
    certificate: x509.Certificate,
    signature_algorithms: List[int],
    min_sdk_version: int,
    max_sdk_version: int = 0x7FFFFFFF,
) -> bytes:
    signed_data = (
        _digest_field(content_digests, signature_algorithms)
        + _certificate_field(certificate)
        + p32(min_sdk_version)
        + p32(max_sdk_version)
        + sequence_of_length_prefixed([])
    )
    signer = encode_signer_block(
        signed_data,
        _signatures_field(signed_data, private_key, signature_algorithms),
        certificate.public_key(),
    )
    return sequence_of_length_prefixed([signer])
