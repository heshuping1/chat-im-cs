# LPP Mobile Full Regression

- Started: 2026-06-06 02:54:01 +0800
- Repeat: 1
- Flutter test concurrency: 1
- Flutter test target: ../scripts/mobile/test/flutter
- Report directory: /Users/treesoft/Downloads/lpp-flutte/lpp/reports/mobile/full-regression/20260606_025401
- S3 configfile URL: (not set)

| Iteration | Step | Status | Seconds | Log |
| --- | --- | --- | ---: | --- |
| 1 | docs check | FAIL(1) | 0 | [iteration-1/01_docs.log](iteration-1/01_docs.log) |
| 1 | flutter pub get | PASS | 2 | [iteration-1/02_pub_get.log](iteration-1/02_pub_get.log) |
| 1 | flutter analyze | PASS | 4 | [iteration-1/03_analyze.log](iteration-1/03_analyze.log) |
| 1 | flutter test | FAIL(1) | 48 | [iteration-1/04_flutter_test.log](iteration-1/04_flutter_test.log) |
| 1 | flutter build apk debug | PASS | 36 | [iteration-1/05_build_debug_apk.log](iteration-1/05_build_debug_apk.log) |
| 1 | adb install debug apk | FAIL(1) | 8 | [iteration-1/07_adb_install.log](iteration-1/07_adb_install.log) |
| 1 | adb launch smoke | PASS | 1 | [iteration-1/08_adb_launch.log](iteration-1/08_adb_launch.log) |
| 1 | adb process check | PASS | 0 | [iteration-1/09_adb_pid_check.log](iteration-1/09_adb_pid_check.log) |

- Finished: 2026-06-06 02:55:42 +0800
- Total seconds: 101
- Overall: FAIL
