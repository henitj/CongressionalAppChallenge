#!/usr/bin/env python3
"""
Sign an APK with APK Signature Scheme v1 + v2 + v3.

Why all three:

  * Android 7.0+  → verifies v2, which covers the whole file (not just the
    individual entries), so an APK cannot be silently modified after signing.
  * Android 9.0+  → prefers v3, which enables signing-key rotation.
  * Android 11+   → a v1-only APK from an unknown source is exactly what Play
    Protect's "unsafe app blocked" heuristics are built to stop; Google's own
    release guidance is to sign with v1 + v2 (+ v3).

`apksigner` would do this, but it needs the Android SDK build-tools (~400 MB
plus a JDK). This script needs only `cryptography`, so the whole Android build
works from the apktool toolchain that `build.sh` already uses.

Usage:
    sign_apk.py <in.apk> <out.apk> <key.pem> <cert.pem>

The signature is verified afterwards by tools/validate_apk.py, which re-derives
every digest from the finished file.
"""

from __future__ import annotations

import hashlib
import sys
import zipfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization

import apksig

# RSA-PKCS#1 v1.5 with SHA-256: the most widely supported algorithm pair in
# every Android version that understands the APK Signature Block.
V2_ALGORITHMS = [apksig.SIG_RSA_PKCS1_SHA256]
V3_ALGORITHMS = [apksig.SIG_RSA_PKCS1_SHA256]

META_INF = "META-INF/"


# --------------------------------------------------------------------------- #
# v1 (JAR signature): MANIFEST.MF / CERT.SF / CERT.RSA
# --------------------------------------------------------------------------- #

def b64_sha256(data: bytes) -> str:
    import base64

    return base64.b64encode(hashlib.sha256(data).digest()).decode("ascii")


def wrap_line(line: bytes) -> bytes:
    """jarsigner-compatible line wrapping (70 bytes, single-space continuations)."""
    out = b""
    first = True
    while line:
        take = 70 if first else 69
        chunk, line = line[:take], line[take:]
        out += (b"" if first else b" ") + chunk + b"\r\n"
        first = False
    return out


def section(pairs) -> bytes:
    out = b""
    for key, value in pairs:
        out += wrap_line(key.encode("utf-8") + b": " + value.encode("utf-8"))
    return out + b"\r\n"


def build_v1_entries(entries: dict, key, certificate) -> dict:
    """Returns {name: bytes} for MANIFEST.MF, CERT.SF and CERT.RSA."""
    from cryptography.hazmat.primitives.serialization import pkcs7

    names = [name for name in entries if not name.upper().startswith(META_INF)]

    main = section([("Manifest-Version", "1.0"), ("Created-By", "EcoTrek build tools")])
    manifest = main
    sections = {}
    for name in names:
        entry = section([("Name", name), ("SHA-256-Digest", b64_sha256(entries[name]))])
        sections[name] = entry
        manifest += entry

    sf = section(
        [
            ("Signature-Version", "1.0"),
            ("Created-By", "EcoTrek build tools"),
            ("SHA-256-Digest-Manifest", b64_sha256(manifest)),
            ("SHA-256-Digest-Manifest-Main-Attributes", b64_sha256(main)),
        ]
    )
    for name in names:
        sf += section([("Name", name), ("SHA-256-Digest", b64_sha256(sections[name]))])

    rsa = (
        pkcs7.PKCS7SignatureBuilder()
        .set_data(sf)
        .add_signer(certificate, key, hashes.SHA256())
        .sign(
            serialization.Encoding.DER,
            [
                pkcs7.PKCS7Options.DetachedSignature,
                pkcs7.PKCS7Options.NoAttributes,
                pkcs7.PKCS7Options.Binary,
            ],
        )
    )
    return {
        "META-INF/MANIFEST.MF": manifest,
        "META-INF/CERT.SF": sf,
        "META-INF/CERT.RSA": rsa,
    }


def write_v1_signed_zip(in_path: str, out_path: str, signature_entries: dict) -> None:
    with zipfile.ZipFile(in_path) as zin, zipfile.ZipFile(out_path, "w") as zout:
        for name, data in signature_entries.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            zout.writestr(info, data)
        for info in zin.infolist():
            if info.filename.endswith("/") or info.filename.upper().startswith(META_INF):
                continue
            new_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            # Android 11+ cannot install an APK whose resource table is
            # compressed, so force it stored no matter what the build produced.
            new_info.compress_type = (
                zipfile.ZIP_STORED if info.filename == "resources.arsc" else info.compress_type
            )
            new_info.external_attr = info.external_attr
            new_info.internal_attr = info.internal_attr
            new_info.create_system = info.create_system
            zout.writestr(new_info, zin.read(info.filename))


# --------------------------------------------------------------------------- #
# v2 / v3 (APK Signing Block)
# --------------------------------------------------------------------------- #

def add_signing_block(unsigned_apk: bytes, pairs) -> bytes:
    block = apksig.build_signing_block(pairs)
    eocd = apksig.find_eocd(unsigned_apk)
    central_dir_offset = apksig.u32(unsigned_apk, eocd + 16)

    before = unsigned_apk[:central_dir_offset]
    after = bytearray(unsigned_apk[central_dir_offset:])
    # The Central Directory moves to the end of the signing block, so its new
    # offset is recorded in the EOCD that follows it.
    struct_offset = len(after) - (len(unsigned_apk) - eocd) + 16
    new_central_dir_offset = central_dir_offset + len(block)
    after[struct_offset:struct_offset + 4] = apksig.p32(new_central_dir_offset)
    return before + block + bytes(after)


def sign(in_path: str, out_path: str, key_path: str, cert_path: str) -> None:
    with open(key_path, "rb") as handle:
        key = serialization.load_pem_private_key(handle.read(), password=None)
    with open(cert_path, "rb") as handle:
        certificate = x509.load_pem_x509_certificate(handle.read())

    with zipfile.ZipFile(in_path) as archive:
        entries = {
            info.filename: archive.read(info.filename)
            for info in archive.infolist()
            if not info.filename.endswith("/")
        }

    # 1. v1 signature — the scheme Android 6 and older use, and the one that
    #    makes the APK installable everywhere.
    v1_entries = build_v1_entries(entries, key, certificate)
    v1_path = out_path + ".v1"
    write_v1_signed_zip(in_path, v1_path, v1_entries)
    with open(v1_path, "rb") as handle:
        signed_v1 = apksig.zipalign(handle.read())

    # 2. v2 + v3 — digest the *v1-signed* file: what gets hashed is exactly
    #    what ships on the device, META-INF and all.
    eocd = apksig.find_eocd(signed_v1)
    central_dir_offset = apksig.u32(signed_v1, eocd + 16)
    block_start = central_dir_offset          # no signing block yet

    digests = {
        algorithm: apksig.content_digest(signed_v1, block_start, central_dir_offset, eocd, apksig.SIG_ALGORITHMS[algorithm][0])
        for algorithm in sorted(set(V2_ALGORITHMS) | set(V3_ALGORITHMS))
    }

    v2_block = apksig.build_signer_block_v2(digests, key, certificate, V2_ALGORITHMS)
    v3_block = apksig.build_signer_block_v3(digests, key, certificate, V3_ALGORITHMS, min_sdk_version=24)
    pairs = [
        (apksig.APK_SIGNATURE_SCHEME_V2_BLOCK_ID, v2_block),
        (apksig.APK_SIGNATURE_SCHEME_V3_BLOCK_ID, v3_block),
    ]

    final = add_signing_block(signed_v1, pairs)
    with open(out_path, "wb") as handle:
        handle.write(final)

    import os

    os.remove(v1_path)

    print(f"align  resources.arsc + stored entries on 4-byte boundaries")
    print(f"v1  MANIFEST.MF {len(v1_entries['META-INF/MANIFEST.MF']):,} bytes, "
          f"CERT.SF {len(v1_entries['META-INF/CERT.SF']):,} bytes, "
          f"CERT.RSA {len(v1_entries['META-INF/CERT.RSA']):,} bytes")
    print(f"v2  block {len(v2_block):,} bytes, algorithms "
          f"{', '.join(hex(a) for a in V2_ALGORITHMS)}")
    print(f"v3  block {len(v3_block):,} bytes, algorithms "
          f"{', '.join(hex(a) for a in V3_ALGORITHMS)}, minSdk 24")
    print(f"signed {out_path} ({len(final):,} bytes)")


def main(argv) -> int:
    if len(argv) != 5:
        print(__doc__.strip())
        return 2
    sign(argv[1], argv[2], argv[3], argv[4])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
