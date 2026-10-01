#!/usr/bin/env python3
"""
JAR (v1) signer for APKs, implemented with `cryptography`.

Produces MANIFEST.MF / CERT.SF / CERT.RSA exactly the way jarsigner does:
  - SHA-256 digests, base64
  - 72-byte line wrapping with single-space continuations (CRLF endings)
  - CERT.SF digests each MANIFEST.MF section's exact bytes
  - CERT.RSA is a detached PKCS#7/CMS signature over CERT.SF (no signed
    attributes, like jarsigner's historical output)

v1-only signing is valid for APKs with targetSdkVersion <= 29 on every
Android version.

Usage: sign_v1.py <in.apk> <out.apk> <key.pem> <cert.pem>
"""
import base64
import hashlib
import sys
import zipfile

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography import x509


def b64_sha256(data: bytes) -> str:
    return base64.b64encode(hashlib.sha256(data).digest()).decode('ascii')


def wrap_line(line: bytes) -> bytes:
    """Wrap a header line to 70 content bytes + CRLF, continuations with a space."""
    out = b''
    first = True
    while line:
        take = 70 if first else 69
        chunk, line = line[:take], line[take:]
        out += (b'' if first else b' ') + chunk + b'\r\n'
        first = False
    return out


def section(pairs) -> bytes:
    out = b''
    for k, v in pairs:
        out += wrap_line(k.encode('utf-8') + b': ' + v.encode('utf-8'))
    return out + b'\r\n'


def sign(in_path: str, out_path: str, key_path: str, cert_path: str) -> None:
    with open(key_path, 'rb') as f:
        key = serialization.load_pem_private_key(f.read(), password=None)
    with open(cert_path, 'rb') as f:
        cert = x509.load_pem_x509_certificate(f.read())

    zin = zipfile.ZipFile(in_path, 'r')
    names = [i.filename for i in zin.infolist()
             if not i.filename.endswith('/') and not i.filename.upper().startswith('META-INF/')]

    # ---- MANIFEST.MF -------------------------------------------------------
    main = section([('Manifest-Version', '1.0'),
                    ('Created-By', 'EcoTrek build tools')])
    sections = {}
    manifest = main
    for name in names:
        sec = section([('Name', name),
                       ('SHA-256-Digest', b64_sha256(zin.read(name)))])
        sections[name] = sec
        manifest += sec

    # ---- CERT.SF -----------------------------------------------------------
    sf = section([('Signature-Version', '1.0'),
                  ('Created-By', 'EcoTrek build tools'),
                  ('SHA-256-Digest-Manifest', b64_sha256(manifest)),
                  ('SHA-256-Digest-Manifest-Main-Attributes', b64_sha256(main))])
    for name in names:
        sf += section([('Name', name),
                       ('SHA-256-Digest', b64_sha256(sections[name]))])

    # ---- CERT.RSA (detached CMS over CERT.SF) ------------------------------
    rsa = (
        pkcs7.PKCS7SignatureBuilder()
        .set_data(sf)
        .add_signer(cert, key, hashes.SHA256())
        .sign(serialization.Encoding.DER,
              [pkcs7.PKCS7Options.DetachedSignature,
               pkcs7.PKCS7Options.NoAttributes,
               pkcs7.PKCS7Options.Binary])
    )

    # ---- output zip --------------------------------------------------------
    with zipfile.ZipFile(out_path, 'w') as zout:
        # Signature files first, like jarsigner.
        zout.writestr('META-INF/MANIFEST.MF', manifest, zipfile.ZIP_DEFLATED)
        zout.writestr('META-INF/CERT.SF', sf, zipfile.ZIP_DEFLATED)
        zout.writestr('META-INF/CERT.RSA', rsa, zipfile.ZIP_DEFLATED)
        for info in zin.infolist():
            if info.filename.endswith('/') or info.filename.upper().startswith('META-INF/'):
                continue
            data = zin.read(info.filename)
            ni = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            ni.compress_type = info.compress_type
            ni.external_attr = info.external_attr
            zout.writestr(ni, data)
    zin.close()
    print(f'signed {out_path}')


if __name__ == '__main__':
    sign(*sys.argv[1:5])
