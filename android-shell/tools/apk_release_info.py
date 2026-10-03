#!/usr/bin/env python3
"""
Write the release facts of a finished APK.

`downloads/ecotrek-apk.json` is what the website reads: version, size, SHA-256
and the signing certificate's fingerprint. Publishing those next to the
download is what lets a visitor verify the file they just installed instead of
trusting the page.

The values are read from the *shipped* APK — including its binary
AndroidManifest.xml, so the version and the SDK levels reported are the ones
actually inside the file — plus the release certificate.

Usage:
    apk_release_info.py <apk> <out.json> <cert.pem> [sha256-file]
"""

from __future__ import annotations

import hashlib
import json
import struct
import sys
import zipfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes

import apksig

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ATTRS = {
    "versionCode": 0x0101021B,
    "versionName": 0x0101021C,
    "minSdkVersion": 0x0101020C,
    "targetSdkVersion": 0x01010270,
    "compileSdkVersion": 0x01010572,
}


# --------------------------------------------------------------------------- #
# minimal binary AndroidManifest.xml reader
# --------------------------------------------------------------------------- #

class StringPool:
    def __init__(self, data: bytes, offset: int):
        header_size, self.size = struct.unpack_from("<HH", data, offset + 2)
        string_count, style_count, flags, strings_start, _styles_start = struct.unpack_from(
            "<IIIII", data, offset + 8
        )
        self.utf8 = bool(flags & 0x100)
        self.strings = []
        offset_table = offset + header_size
        for index in range(string_count):
            string_offset = struct.unpack_from("<I", data, offset_table + index * 4)[0]
            self.strings.append(self._read(data, offset + strings_start + string_offset))

    def _read(self, data: bytes, position: int) -> str:
        if not self.utf8:
            length = struct.unpack_from("<H", data, position)[0]
            start = position + 2
            return data[start:start + length * 2].decode("utf-16-le", "replace")
        length = data[position]
        position += 1
        if length & 0x80:
            length = ((length & 0x7F) << 8) | data[position]
            position += 1
        byte_length = data[position]
        position += 1
        if byte_length & 0x80:
            byte_length = ((byte_length & 0x7F) << 8) | data[position]
            position += 1
        return data[position:position + byte_length].decode("utf-8", "replace")


def read_manifest_attributes(manifest_bytes: bytes) -> dict:
    """Return the android: attributes of the manifest, uses-sdk and application."""
    if struct.unpack_from("<H", manifest_bytes, 0)[0] != 0x0003:
        raise ValueError("not a binary AndroidManifest.xml")
    found: dict = {}
    offset = struct.unpack_from("<H", manifest_bytes, 2)[0]
    total = len(manifest_bytes)
    while offset + 8 <= total:
        chunk_type, header_size, chunk_size = struct.unpack_from("<HHI", manifest_bytes, offset)
        if chunk_size <= 0:
            break
        if chunk_type == 0x0001:  # string pool
            pool = StringPool(manifest_bytes, offset)
        elif chunk_type == 0x0102:  # start element
            # layout: type(2) headerSize(2) chunkSize(4) lineNumber(4) comment(4)
            #         namespace(4) name(4) attributeStart(2) attributeSize(2)
            #         attributeCount(2) idIndex(2) classIndex(2) styleIndex(2)
            name_index, attribute_start, attribute_size, attribute_count = struct.unpack_from(
                "<IHHH", manifest_bytes, offset + 20
            )
            element = pool.strings[name_index] if name_index < len(pool.strings) else ""
            # attributeStart is measured from the ResXMLTree_attrExt structure,
            # which begins after the 16-byte node header.
            base = offset + 16 + attribute_start
            element_attributes = {}
            for index in range(attribute_count):
                position = base + index * attribute_size
                namespace_index, name = struct.unpack_from("<II", manifest_bytes, position)
                data_type = manifest_bytes[position + 15]
                data_value = struct.unpack_from("<I", manifest_bytes, position + 16)[0]
                namespace = (
                    pool.strings[namespace_index]
                    if namespace_index < len(pool.strings)
                    else ""
                )
                attribute = pool.strings[name] if name < len(pool.strings) else ""
                if namespace != ANDROID_NS:
                    continue
                if data_type == 0x03:  # string
                    element_attributes[attribute] = pool.strings[data_value]
                elif data_type in (0x10, 0x11, 0x12):  # int / hex / boolean
                    element_attributes[attribute] = data_value
            if element == "manifest":
                found.update(element_attributes)
            elif element == "uses-sdk":
                found.update(element_attributes)
            elif element == "application":
                found.setdefault("application", {})
                found["application"] = element_attributes
            # resource ids are alternates when the name pool is missing
            for attribute, resource_id in ATTRS.items():
                if attribute in found:
                    continue
                for index in range(attribute_count):
                    position = base + index * attribute_size
                    _ns, name = struct.unpack_from("<II", manifest_bytes, position)
                    data_type = manifest_bytes[position + 15]
                    data_value = struct.unpack_from("<I", manifest_bytes, position + 16)[0]
                    if name == resource_id and data_type in (0x10, 0x11, 0x12):
                        found[attribute] = data_value
        offset += chunk_size
    return found


# --------------------------------------------------------------------------- #

def main(argv: list) -> int:
    if len(argv) < 4:
        print(__doc__.strip())
        return 2
    apk_path, out_path, cert_path = argv[1], argv[2], argv[3]
    sha_path = argv[4] if len(argv) > 4 else None

    data = open(apk_path, "rb").read()
    with zipfile.ZipFile(apk_path) as archive:
        manifest = read_manifest_attributes(archive.read("AndroidManifest.xml"))

    certificate = x509.load_pem_x509_certificate(open(cert_path, "rb").read())
    certificate_sha256 = certificate.fingerprint(hashes.SHA256()).hex()
    digest = hashlib.sha256(data).hexdigest()

    block = apksig.parse_signing_block(data)
    schemes = []
    if block is not None:
        if block.find(apksig.APK_SIGNATURE_SCHEME_V2_BLOCK_ID) is not None:
            schemes.append("v2")
        if block.find(apksig.APK_SIGNATURE_SCHEME_V3_BLOCK_ID) is not None:
            schemes.append("v3")
    schemes.append("v1")  # every APK we ship carries the JAR signature too

    info = {
        "versionName": manifest.get("versionName", ""),
        "versionCode": manifest.get("versionCode", 0),
        "minSdkVersion": manifest.get("minSdkVersion", 0),
        "targetSdkVersion": manifest.get("targetSdkVersion", 0),
        "bytes": len(data),
        "sha256": digest,
        "schemes": sorted(set(schemes)),
        "signingCertificateSubject": certificate.subject.rfc4514_string(),
        "signingCertificateSha256": certificate_sha256,
        "signingCertificateValidUntil": certificate.not_valid_after_utc.strftime("%Y-%m-%d"),
    }

    with open(out_path, "w") as handle:
        json.dump(info, handle, indent=2, sort_keys=True)
        handle.write("\n")
    if sha_path:
        with open(sha_path, "w") as handle:
            handle.write(f"{digest}  ecotrek.apk\n")

    released = ", ".join(info["schemes"])
    print(f"  version       {info['versionName']} (code {info['versionCode']})")
    print(f"  android       minSdk {info['minSdkVersion']}, targetSdk {info['targetSdkVersion']}")
    print(f"  size          {info['bytes']:,} bytes")
    print(f"  sha-256       {info['sha256']}")
    print(f"  signatures    {released}")
    print(f"  certificate   {info['signingCertificateSubject']}")
    print(f"                sha-256 {certificate_sha256}")
    print(f"  wrote         {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
