import 'package:flutter/material.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/legal_document_page.dart';

class PrivacyPage extends StatelessWidget {
  const PrivacyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalDocumentScaffold(document: privacyLegalDocumentZh);
  }
}
