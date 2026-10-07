"""Regression tests for the APK Signature Scheme v3 signer wire format."""

from __future__ import annotations

import struct
import sys
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import apksig  # noqa: E402
import sign_apk  # noqa: E402
import validate_apk  # noqa: E402
from cryptography import x509  # noqa: E402
from cryptography.hazmat.primitives import hashes, serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from cryptography.x509.oid import NameOID  # noqa: E402


class V3SigningFormatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "APK v3 test signer")])
        now = datetime.now(timezone.utc)
        cls.certificate = (
            x509.CertificateBuilder()
            .subject_name(name)
            .issuer_name(name)
            .public_key(cls.key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - timedelta(minutes=1))
            .not_valid_after(now + timedelta(days=1))
            .sign(cls.key, hashes.SHA256())
        )

    def _v3_block(self) -> bytes:
        algorithm = apksig.SIG_RSA_PKCS1_SHA256
        return apksig.build_signer_block_v3(
            {algorithm: bytes(32)},
            self.key,
            self.certificate,
            [algorithm],
            min_sdk_version=24,
            max_sdk_version=0x7FFFFFFF,
        )

    def test_sdk_range_is_present_inside_and_outside_signed_data(self) -> None:
        block = self._v3_block()
        signer_sequence, block_end = apksig.read_length_prefixed(block)
        self.assertEqual(block_end, len(block))
        signer, sequence_end = apksig.read_length_prefixed(signer_sequence)
        self.assertEqual(sequence_end, len(signer_sequence))

        signed_data, cursor = apksig.read_length_prefixed(signer)
        outer_range = struct.unpack_from("<II", signer, cursor)
        cursor += 8
        _signatures, cursor = apksig.read_length_prefixed(signer, cursor)
        _public_key, cursor = apksig.read_length_prefixed(signer, cursor)
        self.assertEqual(cursor, len(signer))

        _digests, signed_cursor = apksig.read_length_prefixed(signed_data)
        _certificates, signed_cursor = apksig.read_length_prefixed(signed_data, signed_cursor)
        signed_range = struct.unpack_from("<II", signed_data, signed_cursor)
        signed_cursor += 8
        _attributes, signed_cursor = apksig.read_length_prefixed(signed_data, signed_cursor)
        self.assertEqual(signed_cursor, len(signed_data))

        expected = (24, 0x7FFFFFFF)
        self.assertEqual(outer_range, expected)
        self.assertEqual(signed_range, expected)

        parsed = apksig.parse_signers(block, v3=True)[0]
        self.assertEqual((parsed.min_sdk, parsed.max_sdk), expected)
        self.assertEqual((parsed.signed_min_sdk, parsed.signed_max_sdk), expected)

    def test_validator_rejects_mismatched_outer_sdk_range(self) -> None:
        """The unauthenticated range must agree with the signed copy."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            unsigned_path = root / "unsigned.apk"
            signed_path = root / "signed.apk"
            tampered_path = root / "tampered.apk"
            key_path = root / "key.pem"
            cert_path = root / "cert.pem"

            with zipfile.ZipFile(unsigned_path, "w") as archive:
                archive.writestr("classes.dex", b"test dex payload")
            key_path.write_bytes(
                self.key.private_bytes(
                    serialization.Encoding.PEM,
                    serialization.PrivateFormat.PKCS8,
                    serialization.NoEncryption(),
                )
            )
            cert_path.write_bytes(self.certificate.public_bytes(serialization.Encoding.PEM))
            sign_apk.sign(str(unsigned_path), str(signed_path), str(key_path), str(cert_path))

            data = bytearray(signed_path.read_bytes())
            signing_block = apksig.parse_signing_block(data)
            self.assertIsNotNone(signing_block)
            assert signing_block is not None

            # Locate the v3 value within the APK Signing Block without relying
            # on signer parsing, then change only its outer (unsigned) minSdk.
            offset = signing_block.start + 8
            v3_value_offset = None
            v3_value_length = None
            while offset < signing_block.central_dir_offset - 24:
                pair_length = apksig.u64(data, offset)
                pair_id = apksig.u32(data, offset + 8)
                if pair_id == apksig.APK_SIGNATURE_SCHEME_V3_BLOCK_ID:
                    v3_value_offset = offset + 12
                    v3_value_length = pair_length - 4
                    break
                offset += 8 + pair_length
            self.assertIsNotNone(v3_value_offset)
            self.assertIsNotNone(v3_value_length)

            v3_value = bytes(data[v3_value_offset:v3_value_offset + v3_value_length])
            signer_sequence, _ = apksig.read_length_prefixed(v3_value)
            signer, _ = apksig.read_length_prefixed(signer_sequence)
            _signed_data, sdk_offset = apksig.read_length_prefixed(signer)
            # The block value starts with the signer sequence length, then
            # the signer itself has another length prefix before its body.
            struct.pack_into("<I", data, v3_value_offset + 8 + sdk_offset, 25)
            tampered_path.write_bytes(data)

            report = validate_apk.Report()
            validate_apk.verify_scheme(
                str(tampered_path),
                report,
                bytes(data),
                apksig.APK_SIGNATURE_SCHEME_V3_BLOCK_ID,
                "v3",
            )
            result = next(
                (passed, detail)
                for name, passed, detail in report.checks
                if name == "v3: content digests + signatures verify"
            )
            self.assertFalse(result[0])
            self.assertIn("unsigned SDK range 25-2147483647 does not match signed range 24-2147483647", result[1])


if __name__ == "__main__":
    unittest.main()
