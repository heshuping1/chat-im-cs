# LPP Mobile Scripts

These scripts are local development helpers. They are not part of the Flutter
app runtime.

## Layout

- `dev/` - API verification, tenant debugging, login checks, and local probes
- `package/` - Android debug and production APK build entrypoints
- `test/` - repeatable automated test entrypoints for business and platform regression
- `test/flutter/` - Flutter automated test files
- `test-data/` - scripts that create or reset tenants, users, and staff data
- `test-data/test_accounts.md` - shared test account reference
- `e2e/` - Python end-to-end checks

Many scripts may depend on local credentials, test accounts, or a specific
backend environment. Review a script before running it.

Run mobile scripts from the Flutter project root unless the script itself says
otherwise:

```bash
cd lpp/lpp_mobile
sh ../scripts/mobile/dev/verify_api.sh
```

## Build Entrypoints

Run from `lpp/lpp_mobile`:

```bash
../scripts/mobile/package/build_debug_apk.sh
../scripts/mobile/package/build_release_apk.sh
../scripts/mobile/package/create_android_signing_keys.sh --print-template
```

Useful options:

```bash
../scripts/mobile/package/build_debug_apk.sh --clean
../scripts/mobile/package/build_release_apk.sh --split-per-abi
../scripts/mobile/package/build_release_apk.sh --dart-define=JPUSH_APP_KEY=your_key
../scripts/mobile/dev/install_all_ios_devices.sh --device=00008110-000858580E9A801E
../scripts/mobile/dev/install_all_ios_devices.sh --no-build --device=Tangming
../scripts/mobile/package/create_android_signing_keys.sh --config=android-signing.local.env
```

Release signing uses the existing `android/key.properties` Gradle configuration
when present; the build scripts do not create or modify signing files.
Use `create_android_signing_keys.sh --print-template` to create a local signing
parameter file first. The signing script asks for passwords locally and writes
ignored key files such as `android/key.properties`; do not commit generated keys
or passwords.

## Repeatable Test Entrypoints

Run from `lpp/lpp_mobile`:

```bash
../scripts/mobile/test/run_full_regression.sh
../scripts/mobile/test/run_automated_tests.sh
../scripts/mobile/test/run_android_tests.sh
../scripts/mobile/test/run_ios_tests.sh
../scripts/mobile/test/run_platform_tests.sh --android
```

Recommended complete local regression:

```bash
../scripts/mobile/test/run_full_regression.sh --repeat=1
```

Repeat the complete suite to catch flakes:

```bash
../scripts/mobile/test/run_full_regression.sh --repeat=3 --continue-on-fail
```

Run a fast targeted regression with the same reporting format:

```bash
../scripts/mobile/test/run_full_regression.sh \
  --no-docs --no-pub-get --no-analyze --no-build \
  --test-target=../scripts/mobile/test/flutter/core/network/site_line_manager_test.dart
```

When validating line switching with a real fallback configfile, pass:

```bash
../scripts/mobile/test/run_full_regression.sh \
  --s3-configfile-url=https://example.com/config.json
```

Reports are written to `reports/mobile/full-regression/<timestamp>/` by default,
with one log per step and a `summary.md` overview.

Platform scripts share the same baseline checks: `flutter analyze` with
non-fatal warnings/infos and `flutter test ../scripts/mobile/test/flutter`.
Each platform script then runs its own mobile build or smoke test. PC regression
now lives in the independent `lpp_pc_client` project.
