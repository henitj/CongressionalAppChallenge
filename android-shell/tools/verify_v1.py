#!/usr/bin/env python3
"""Independent v1 (JAR) signature verifier, mirroring Android's V1SchemeVerifier."""
import base64, hashlib, sys, zipfile

from asn1crypto import cms
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography import x509


def parse_manifest(data: bytes):
    """Split into (main_section_bytes, {name: (attrs, section_bytes)}) like Android does."""
    # Sections are separated by blank lines; continuation lines start with a space.
    chunks = []
    start = 0
    i = 0
    lines = data.split(b'\r\n')
    # Rebuild chunk boundaries byte-accurately.
    pos = 0
    section_start = 0
    sections = []
    while pos < len(data):
        nl = data.find(b'\r\n', pos)
        if nl == -1:
            break
        line = data[pos:nl]
        if line == b'':
            sections.append(data[section_start:nl + 2])
            section_start = nl + 2
        pos = nl + 2
    if section_start < len(data):
        sections.append(data[section_start:])

    def attrs_of(section: bytes):
        out = {}
        logical = []
        for raw in section.split(b'\r\n'):
            if raw.startswith(b' '):
                logical[-1] += raw[1:]
            elif raw:
                logical.append(raw)
        for l in logical:
            k, _, v = l.partition(b': ')
            out[k.decode()] = v.decode()
        return out

    main = sections[0]
    named = {}
    for s in sections[1:]:
        if not s.strip():
            continue
        a = attrs_of(s)
        if 'Name' in a:
            named[a['Name']] = (a, s)
    return main, attrs_of(main), named


def b64sha256(b: bytes) -> str:
    return base64.b64encode(hashlib.sha256(b).digest()).decode()


def main(path: str) -> int:
    z = zipfile.ZipFile(path)
    mf = z.read('META-INF/MANIFEST.MF')
    sf = z.read('META-INF/CERT.SF')
    rsa = z.read('META-INF/CERT.RSA')

    errors = []

    # 1. CMS signature over CERT.SF
    ci = cms.ContentInfo.load(rsa)
    signed = ci['content']
    signer = signed['signer_infos'][0]
    cert_der = signed['certificates'][0].chosen.dump()
    cert = x509.load_der_x509_certificate(cert_der)
    sig = signer['signature'].native
    digest_alg = signer['digest_algorithm']['algorithm'].native
    assert digest_alg == 'sha256', digest_alg
    has_attrs = signer['signed_attrs'] is not None and signer['signed_attrs'].native
    assert not has_attrs, 'expected no signed attributes'
    try:
        cert.public_key().verify(sig, sf, padding.PKCS1v15(), hashes.SHA256())
        print('OK  CMS signature over CERT.SF verifies')
    except Exception as e:
        errors.append(f'CMS signature invalid: {e}')

    # 2. SF: digest of whole manifest + main attributes
    sf_main_bytes, sf_attrs, sf_named = parse_manifest(sf)
    if sf_attrs.get('SHA-256-Digest-Manifest') == b64sha256(mf):
        print('OK  SHA-256-Digest-Manifest matches MANIFEST.MF')
    else:
        errors.append('SHA-256-Digest-Manifest mismatch')

    mf_main_bytes, mf_attrs, mf_named = parse_manifest(mf)
    exp = sf_attrs.get('SHA-256-Digest-Manifest-Main-Attributes')
    if exp and exp != b64sha256(mf_main_bytes):
        errors.append('Main-Attributes digest mismatch')

    # 3.每 SF section digests its MF section
    for name, (attrs, _) in sf_named.items():
        mf_sec = mf_named.get(name)
        if not mf_sec:
            errors.append(f'{name}: in SF but not MF')
            continue
        if attrs.get('SHA-256-Digest') != b64sha256(mf_sec[1]):
            errors.append(f'{name}: SF section digest mismatch')

    # 4. MF entries digest actual file contents; all files covered
    covered = set()
    for name, (attrs, _) in mf_named.items():
        try:
            data = z.read(name)
        except KeyError:
            errors.append(f'{name}: in MF but not in zip')
            continue
        if attrs.get('SHA-256-Digest') != b64sha256(data):
            errors.append(f'{name}: content digest mismatch')
        covered.add(name)
    for info in z.infolist():
        n = info.filename
        if n.endswith('/') or n.upper().startswith('META-INF/'):
            continue
        if n not in covered:
            errors.append(f'{n}: not covered by manifest')

    if errors:
        print('FAIL')
        for e in errors:
            print('  -', e)
        return 1
    print(f'OK  all {len(covered)} entries digest-verified; v1 signature is valid')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
