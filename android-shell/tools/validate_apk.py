#!/usr/bin/env python3
"""
Validate the EcoTrek release APK's signatures.

Android's release tooling checks four independent things, so this script checks
all four rather than trusting a single "is it signed?" flag:

  1. APK Signature Scheme v1 (JAR): every entry listed in META-INF/MANIFEST.MF
     hashes to what the manifest claims, META-INF/CERT.SF hashes the manifest,
     and the PKCS#7 signature in META-INF/CERT.RSA verifies over CERT.SF.
  2. v2 (block 0x7109871a) is present, and every content digest inside it
     re-derives from the finished file (1 MiB chunking over [0, block start),
     the central directory, and the patched EOCD).
  3. v3 (block 0xf05368c0) is present with the same content digests, so the
     device can rotate signing keys without invalidating installs.
  4. The keys in v1 and v2/v3 agree, and the block covers the whole file with
     no stale blocks left over from an earlier build.

Usage:
    python3 tools/validate_apk.py downloads/ecotrek.apk
"""

from __future__ import annotations

import base64
import hashlib
import sys
import zipfile
from typing import Dict, List, Optional, Tuple

from asn1crypto import cms
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa

import apksig

PASS = "PASS"
FAIL = "FAIL"


class Report:
    def __init__(self) -> None:
        self.checks: List[Tuple[str, bool, str]] = []

    def add(self, name: str, ok: bool, detail: str = "") -> bool:
        self.checks.append((name, bool(ok), detail))
        return bool(ok)

    def print(self) -> None:
        for name, ok, detail in self.checks:
            status = PASS if ok else FAIL
            print(f"  [{status}] {name}")
            if detail:
                for line in detail.splitlines():
                    print(f"         {line}")

    @property
    def ok(self) -> bool:
        return all(ok for _, ok, _ in self.checks)


# --------------------------------------------------------------------------- #
# v1 (JAR signature)
# --------------------------------------------------------------------------- #

def parse_manifest(data: bytes) -> Dict[str, Dict[str, str]]:
    sections: Dict[str, Dict[str, str]] = {}
    current: Dict[str, str] = {}
    last_key: Optional[str] = None
    for raw_line in data.decode("utf-8", "replace").split("\n"):
        line = raw_line.rstrip("\r")
        if not line:
            if current:
                name = current.get("Name")
                if name:
                    sections[name] = current
                current = {}
                last_key = None
            continue
        if line.startswith(" ") and last_key:
            current[last_key] += line[1:]
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            last_key = key
            current[key] = value.lstrip(" ")
    if current:
        name = current.get("Name")
        if name:
            sections[name] = current
    return sections


def parse_sf(data: bytes) -> Dict[str, Dict[str, str]]:
    # CERT.SF is a manifest-style file whose top section holds manifest digests.
    result: Dict[str, Dict[str, str]] = {}
    current: Dict[str, str] = {}
    name: Optional[str] = None
    last_key: Optional[str] = None
    for raw_line in data.decode("utf-8", "replace").split("\n"):
        line = raw_line.rstrip("\r")
        if not line:
            if current:
                result[name or "-"] = current
                current = {}
                last_key = None
            continue
        if line.startswith(" ") and last_key:
            current[last_key] += line[1:]
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            last_key = key
            if key == "Name":
                if current:
                    result[name or "-"] = current
                    current = {}
                name = value.strip()
            current[key] = value.strip()
    if current:
        result[name or "-"] = current
    return result


def verify_pkcs7_signature(p7_der: bytes, content: bytes) -> Tuple[bool, str]:
    content_info = cms.ContentInfo.load(p7_der)
    signed_data = content_info["content"]
    signer_info = signed_data["signer_infos"][0]

    certificate_choice = signed_data["certificates"][0]
    cert = x509.load_der_x509_certificate(certificate_choice.chosen.dump())

    digest_algorithm = signer_info["digest_algorithm"]["algorithm"].native
    signature_bytes = signer_info["signature"].native

    signed_attrs = signer_info["signed_attrs"]
    if signed_attrs.native is not None:
        # signedAttrs is defined as [0] IMPLICIT SET OF Attribute; the signature
        # covers the DER encoding with the universal SET tag.
        encoded = signed_attrs.dump()
        encoded = b"\x31" + encoded[1:]
    else:
        encoded = content

    # The digest of the content must appear as a messageDigest attribute.
    expected_digest: Optional[bytes] = None
    for attribute in signed_attrs:
        if attribute["type"].native == "message_digest":
            expected_digest = attribute["values"][0].native
    if expected_digest is not None:
        actual = hashlib.new(digest_algorithm, content).digest()
        if actual != expected_digest:
            return False, "messageDigest attribute does not match the signed content"

    hash_algorithm = hashes.SHA256() if digest_algorithm == "sha256" else hashes.SHA512()
    public_key = cert.public_key()
    try:
        if isinstance(public_key, rsa.RSAPublicKey):
            public_key.verify(signature_bytes, encoded, padding.PKCS1v15(), hash_algorithm)
        elif isinstance(public_key, ec.EllipticCurvePublicKey):
            public_key.verify(signature_bytes, encoded, ec.ECDSA(hash_algorithm))
        else:
            return False, "unsupported v1 signing key type"
    except Exception as error:  # noqa: BLE001 - report any verification failure
        return False, str(error)
    return True, f"{cert.subject.rfc4514_string()} / {digest_algorithm}"


def verify_v1(apk_path: str, report: Report) -> Optional[bytes]:
    """Returns the DER of the v1 signing certificate, if v1 verified."""
    with zipfile.ZipFile(apk_path) as archive:
        names = set(archive.namelist())
        if "META-INF/MANIFEST.MF" not in names:
            report.add("v1: META-INF/MANIFEST.MF present", False)
            return None
        manifest_bytes = archive.read("META-INF/MANIFEST.MF")
        sf_name = next((n for n in names if n.upper().endswith(".SF")), None)
        rsa_name = next((n for n in names if n.upper().endswith((".RSA", ".DSA", ".EC"))), None)
        sf_bytes = archive.read(sf_name) if sf_name else b""
        p7_bytes = archive.read(rsa_name) if rsa_name else b""

        manifest = parse_manifest(manifest_bytes)
        report.add("v1: manifest lists APK entries", len(manifest) > 0, f"{len(manifest)} entries")

        # Entry digests: signing a stored/deflated entry means hashing the
        # uncompressed bytes, which is what zipfile.read() returns.
        mismatches = []
        for name, attributes in manifest.items():
            digest_value = attributes.get("SHA-256-Digest")
            if name.startswith("META-INF/"):
                continue
            if name not in names:
                mismatches.append(f"{name}: listed but missing from archive")
                continue
            actual = base64.b64encode(hashlib.sha256(archive.read(name)).digest()).decode()
            if digest_value is None or actual != digest_value:
                mismatches.append(f"{name}: content hash differs from manifest")
        report.add(
            "v1: manifest hashes match archive contents",
            not mismatches,
            "\n".join(mismatches[:5]),
        )

        # CERT.SF hashes the manifest.
        sf = parse_sf(sf_bytes)
        header = sf.get("-", {})
        digest_manifest = header.get("SHA-256-Digest-Manifest")
        actual_manifest = base64.b64encode(hashlib.sha256(manifest_bytes).digest()).decode()
        report.add(
            "v1: CERT.SF hashes MANIFEST.MF",
            digest_manifest == actual_manifest,
            f"manifest sha-256 {actual_manifest[:16]}...",
        )

        if not p7_bytes:
            report.add("v1: PKCS#7 signature present", False)
            return None
        ok, detail = verify_pkcs7_signature(p7_bytes, sf_bytes)
        report.add("v1: PKCS#7 signature verifies over CERT.SF", ok, detail)

        try:
            content_info = cms.ContentInfo.load(p7_bytes)
            certificate_choice = content_info["content"]["certificates"][0]
            return certificate_choice.chosen.dump()
        except Exception:  # noqa: BLE001
            return None


# --------------------------------------------------------------------------- #
# v2 / v3 (APK Signing Block)
# --------------------------------------------------------------------------- #

def verify_scheme(apk_path: str, report: Report, data: bytes, block_id: int, label: str) -> Optional[bytes]:
    block = apksig.parse_signing_block(data)
    if block is None or block.find(block_id) is None:
        report.add(f"{label}: signing block present", False, "no APK Signing Block entry")
        return None

    eocd = apksig.find_eocd(data)
    signers = apksig.parse_signers(block.find(block_id), v3=(block_id == apksig.APK_SIGNATURE_SCHEME_V3_BLOCK_ID))

    failures: List[str] = []
    first_certificate: Optional[bytes] = None
    for index, signer in enumerate(signers):
        tag = f"signer {index + 1}"

        # Every digest must re-derive from the APK bytes.
        for algorithm, expected in signer.digests:
            if algorithm not in apksig.SIG_ALGORITHMS:
                failures.append(f"{tag}: unsupported digest algorithm {hex(algorithm)}")
                continue
            digest_algorithm = apksig.SIG_ALGORITHMS[algorithm][0]
            actual = apksig.content_digest(data, block.start, block.central_dir_offset, eocd, digest_algorithm)
            if actual != expected:
                failures.append(f"{tag}: content digest mismatch for {hex(algorithm)}")

        certificates = [x509.load_der_x509_certificate(der) for der in signer.certificates]
        if not certificates:
            failures.append(f"{tag}: no certificate in signed data")
            continue
        certificate = certificates[0]
        first_certificate = first_certificate or signer.certificates[0]

        encoded_public_key = apksig.encode_public_key(certificate.public_key())
        if encoded_public_key != signer.public_key:
            failures.append(f"{tag}: embedded public key does not match the certificate")

        for algorithm, signature in signer.signatures:
            if algorithm not in apksig.SIG_ALGORITHMS:
                failures.append(f"{tag}: unsupported signature algorithm {hex(algorithm)}")
                continue
            digest_algorithm, signature_kind = apksig.SIG_ALGORITHMS[algorithm]
            hash_algorithm = hashes.SHA256() if digest_algorithm == "sha256" else hashes.SHA512()
            public_key = certificate.public_key()
            try:
                if signature_kind == "rsa-pkcs1":
                    public_key.verify(signature, signer.signed_data, padding.PKCS1v15(), hash_algorithm)
                elif signature_kind == "rsa-pss":
                    public_key.verify(
                        signature,
                        signer.signed_data,
                        padding.PSS(mgf=padding.MGF1(hash_algorithm), salt_length=hash_algorithm.digest_size),
                        hash_algorithm,
                    )
                elif signature_kind == "ecdsa":
                    public_key.verify(signature, signer.signed_data, ec.ECDSA(hash_algorithm))
                else:
                    failures.append(f"{tag}: unsupported key type")
            except Exception as error:  # noqa: BLE001
                failures.append(f"{tag}: signature does not verify ({error})")

    detail = f"{len(signers)} signer(s)"
    if signers and signers[0].min_sdk is not None:
        detail += f", SDK range {signers[0].min_sdk}-{signers[0].max_sdk}"
    report.add(f"{label}: content digests + signatures verify", not failures, "\n".join(failures) or detail)
    return first_certificate


# --------------------------------------------------------------------------- #

def verify_web_assets(apk_path: str, report: Report) -> None:
    """Every image/font URL the web bundle asks for must exist in the APK.

    The shell serves `assets/` at the virtual origin https://appassets.ecotrek.app,
    and the bundle refers to its files with root-absolute URLs such as
    `/assets/assets/logo.png`. A missing file is a silent blank icon on the
    device, which is exactly the kind of bug nobody notices until a user does.
    """
    import re

    with zipfile.ZipFile(apk_path) as archive:
        names = set(archive.namelist())
        bundles = [n for n in names if n.startswith("assets/_expo/static/js/web/") and n.endswith(".js")]
        if not bundles:
            report.add("web bundle present in the APK", False)
            return
        urls = set()
        for name in bundles:
            source = archive.read(name).decode("utf-8", "replace")
            urls.update(re.findall(r'"(/assets/[A-Za-z0-9@._/\[\]#+-]+)"', source))
        # The shell maps a request for URL path P to the APK asset P[1:], and
        # AssetManager paths are relative to the APK's assets/ directory — so
        # URL /assets/x.png must exist as the zip entry assets/assets/x.png.
        missing = sorted(url for url in urls if f"assets/{url.lstrip('/')}" not in names)
        report.add(
            "web assets referenced by the bundle are bundled",
            not missing,
            "\n".join(missing[:6]) if missing else f"{len(urls)} URLs checked",
        )


def main(argv: List[str]) -> int:
    apk_path = argv[1] if len(argv) > 1 else "downloads/ecotrek.apk"
    data = open(apk_path, "rb").read()
    report = Report()

    print(f"Validating {apk_path} ({len(data):,} bytes)")

    v1_certificate = verify_v1(apk_path, report)
    block = apksig.parse_signing_block(data)
    if block is None:
        report.add("APK Signing Block present", False, "v2/v3 signatures are missing (v1-only APK)")
    else:
        stale = [
            hex(pid) for pid, _ in block.pairs
            if pid not in (
                apksig.APK_SIGNATURE_SCHEME_V2_BLOCK_ID,
                apksig.APK_SIGNATURE_SCHEME_V3_BLOCK_ID,
                apksig.VERITY_PADDING_BLOCK_ID,
            )
        ]
        report.add("APK Signing Block present", True, f"starts at byte {block.start}")
        report.add("no unexpected blocks in the signing block", not stale, ", ".join(stale))

    v3_certificate = verify_scheme(
        apk_path, report, data, apksig.APK_SIGNATURE_SCHEME_V3_BLOCK_ID, "v3"
    )
    v2_certificate = verify_scheme(
        apk_path, report, data, apksig.APK_SIGNATURE_SCHEME_V2_BLOCK_ID, "v2"
    )

    if v1_certificate and v2_certificate:
        report.add("v1 and v2/v3 are signed by the same key", v1_certificate == v2_certificate)
    if v2_certificate and v3_certificate:
        report.add("v2 and v3 certificates agree", v2_certificate == v3_certificate)

    # Android 7.0+ needs v2; Android 9+ prefers v3; v1 covers older devices.
    report.add("v1 + v2 + v3 all present (Android's recommended combination)", bool(
        v1_certificate and v2_certificate and v3_certificate
    ))

    verify_web_assets(apk_path, report)

    # Android 11+ (API 30) refuses to install an APK whose resource table is
    # compressed or not 4-byte aligned; every uncompressed entry must be aligned.
    with zipfile.ZipFile(apk_path) as archive:
        misaligned = []
        for info in archive.infolist():
            if info.compress_type != zipfile.ZIP_STORED:
                continue
            local = info.header_offset
            name_length = apksig.u16(data, local + 26)
            extra_length = apksig.u16(data, local + 28)
            data_offset = local + 30 + name_length + extra_length
            if data_offset % 4:
                misaligned.append(f"{info.filename} at {data_offset}")
        report.add("uncompressed entries are 4-byte aligned (zipalign)", not misaligned, "\n".join(misaligned))
        report.add(
            "resources.arsc is stored uncompressed",
            archive.getinfo("resources.arsc").compress_type == zipfile.ZIP_STORED,
        )

    print()
    report.print()
    print()
    if report.ok:
        print("Result: all signature checks passed.")
        return 0
    print("Result: SIGNATURE CHECKS FAILED.")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
