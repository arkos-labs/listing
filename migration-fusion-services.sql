-- ============================================================================
-- Migration: Fusion de tous les services hospitaliers
-- Généré le 2026-09-11
--
-- Cette migration fusionne les variantes de services (EFS, PHARMACIE, etc.)
-- pour chaque hôpital/clinique/labo vers un nom canonique unique.
-- Le tarif (qte_bon) n'est PAS modifié — seul le nom du lieu change.
-- Exception: MONDOR BIOCHIMIE reste séparé (tarif +40%).
--
-- IMPORTANT: Les DELETE passent AVANT les UPDATE pour éviter les conflits
-- de contrainte unique sur le hash.
--
-- Doublons supprimés: 170
-- Lignes renommées: 349
-- Lignes restantes: 1595 (sur 1765)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTIE 1 : SUPPRESSION DES DOUBLONS (170 lignes)
-- Quand plusieurs lignes deviennent identiques après renommage,
-- on garde la plus ancienne et on supprime les autres.
-- ============================================================================

DELETE FROM reference_courses WHERE id IN (
  'af51f3b0-cd11-4563-94c1-0898dff9cb8d',
  '697e4045-7da0-4016-929d-46f8b72c3f32',
  '27bca80c-8436-47ec-9228-4b4e2cca7a0c',
  '03fd8390-5d5d-4e8d-b823-9918f112fc69',
  '3d8b51c7-697e-4628-aebc-70efdfc2e734',
  '1f6c7195-5d04-493e-a67b-abc915ca3d4c',
  '3eb1845b-a487-4115-9246-360e842961c0',
  'b155ffc2-695b-4f11-930a-511e1b06e34a',
  '242b7e68-c0d7-4be4-a6ee-9e9e11b4dfed',
  'f9ce68e0-b099-428a-99f3-5fe7e14c94c5',
  'afe9f554-4e91-4223-819d-d57b0d503b44',
  '271cedd2-c815-4d0d-ac39-d9e17d3402fb',
  '539e7e7b-d8c9-4d64-9987-3a720820d42e',
  '0b5c5fbf-8e2e-49c6-bb8b-0ac126422756',
  'd907fc85-63ee-4452-832c-ed80efa670d9',
  '1327591c-83c3-43e2-bc3d-3f39ce8cc9d7',
  'aaf7f9d6-d436-4c69-a15e-c8f196b1cdd9',
  'cddf9778-b93d-4c0f-839d-8d807d60e6d2',
  '47c130e0-8422-4682-a2ea-60124a3e9e57',
  'f7c7ae60-e13f-43d9-a1ce-279e5d8085f5',
  '25862c8e-6b40-486b-b75f-73a2725fbc0e',
  'a1208dab-0bf3-4fe3-a267-af361642cfa7',
  'e974ca98-979e-42cb-9c89-3083f41a03db',
  '79d89d46-c67d-4efc-bad9-ed4c56c3e4a1',
  'db1947af-25f0-45c8-b2b7-a172f0e2160c',
  '1e424fbe-95ed-44b0-aa04-21b81cdf2a4b',
  'bced7deb-0333-426c-baf7-e2a72e1ac1fa',
  '40e2e3c4-dfad-4541-8fa6-6c9d0624dc52',
  'd61de969-dcda-4664-87c6-6cc25b247187',
  '17930936-b438-43d6-a1ce-be75979842e5',
  'c9bc95ef-769d-497a-ae3d-ae5f9b29a5f7',
  '68c27d99-b3b5-42c6-893a-1aba710fa70f',
  '8fef3dd8-f162-4e42-b24c-c5b72f6a1d85',
  '618b20ad-7f54-4bbe-a27c-4f8f2df25ecb',
  '7843407e-c80d-42cd-9330-71c051d1168c',
  '875c8aba-cb35-4068-ad36-207e8a5baa66',
  '1f4472ca-9435-4f39-86c3-8fa35a5ffb98',
  '0eccf11e-6cd6-4d75-aefe-c52b991e6187',
  '4c6ed5a8-48ce-48f3-8ff1-1925e8297f02',
  '0d2368af-6e37-4eda-bb8e-10537d1fddde',
  'de4a72cc-1f85-4ab8-b28f-bc74caa5e98b',
  '30857e9e-b5af-4e1e-ba7c-b8d446ba3da3',
  '8738688b-a855-4fa0-8f3b-148efc6e0435',
  '6faf27b7-6cb0-40d9-b457-4e962e5c8b28',
  '449626a7-da07-4737-bb1b-0ec6523f6f48',
  '724c1efd-b6e6-4f80-9577-b9d8f4436e10',
  '6b9c9adb-9a91-4eaa-ae85-1143fba475d3',
  '932b114f-3145-4992-94e4-cdd1ee81bb85',
  'cdcc20c9-7a52-43d4-bbc3-b52ca32f7558',
  '90b14873-36da-40ce-ae01-38a3342cdfe0',
  '3e2f0326-757d-4fdd-b57c-8a5b6e0efdaa',
  '424089dd-2b07-41f4-a6b8-9ecbb226890c',
  'adffe14f-9397-4f1b-bc01-56314e7cd8c2',
  '9304da1f-30a6-410b-a6cb-89ec64ee82cb',
  'b80e1d25-0dfb-4179-a284-ec476be9fcc5',
  '934920cc-e3f7-4fb1-9231-a46fda7200d3',
  'e1dcbebd-d9c4-47a0-b44d-3472c67b8e52',
  '889c6fb1-cc7f-49b6-81cd-4edeebca2959',
  '7f99f77d-faef-407f-87f6-ee608ac8ab8e',
  'bcc14d76-9913-4da4-a052-9f2c78943c70',
  '41f41a80-0ac5-4265-87de-970c0e88e2fc',
  'd6c259de-3d87-4764-baf1-7c9773dbcfa8',
  '0c7a9c14-5172-4b2c-8652-deb883cb9394',
  '12877423-abea-464d-90d3-2e10c4f332ca',
  '7362d4f9-050d-4754-aa52-8f13fe20c214',
  '979bd9d3-7b29-46a0-a929-cc840f7ab8c3',
  '235f2b53-ad9d-4943-a5be-4ac45bba741a',
  'f92c746d-72b2-40a2-be28-ad8d00ed1e5b',
  '8bba46f8-263b-4dcb-bb72-35ac6d5e8758',
  'ab58a7e5-a150-4eb9-9509-346bc38d8a7f',
  '9c9f0c36-aa44-4e44-8c21-ec043ffc76cf',
  'c356580a-8e4c-4a7f-b1a2-9aa7b5f5abe1',
  'd5552cba-4585-4a9d-adea-7f3383a18d15',
  'f3b9b562-17ff-4789-8127-09efdde93856',
  '29874282-dd4f-479e-8eeb-4db2ab89b2f7',
  'e9caa105-40b9-4cd3-9ca5-8cbc12ee7483',
  '616c8270-6b8c-4cbf-8f64-d4e0cdf9e2bc',
  '8825c37a-6c9c-49ad-b29f-131354ad065a',
  '1d877cc2-8069-4812-a7e1-011a11f8431f',
  'daff44e7-47c4-4d2f-864e-2650a2fc7d0a',
  'b44ec474-ac53-4ba1-a740-cec76a2bbb39',
  '7e91d43c-d2e1-4062-9a0b-092c6f9af416',
  '3f2840f2-ae3e-4b9d-b306-e8e7d97b2a4f',
  '65355ab2-393d-43d0-a8db-ea67df4dbfa8',
  '03f935b4-abaf-4ba7-9a02-2ca52db85174',
  '9d85d448-5dcc-42be-9e5e-c633abace496',
  'cb0e44c2-692a-4fea-badb-5b9a70ca652a',
  '54a54a94-ca7c-4bac-b529-9f84e2922b07',
  '605fa446-b7a5-403b-852e-5681c66d669d',
  'ea20d2f2-d7f6-44b2-8ed0-bb2f10695107',
  '09856f53-e322-4898-bb56-90b2fe72908d',
  'd39805fa-975c-415b-90c1-220e825f136f',
  '1d55c53c-e451-4a81-bf2c-5d49e1678355',
  'dfa4a2f7-c36e-4193-a3bc-5618f593ed07',
  'b63ad51a-c1b8-4032-9604-4e10ad2789ff',
  '01999d45-8955-43b1-87f1-cfad6566e55d',
  'd4213b86-a7da-423f-9bb1-5164fc48a52c',
  '8858c2e7-ee28-479c-acc4-c5c13bf7fd9c',
  'e1d4694a-a9c3-4b68-b8b6-5804a83dcb0d',
  '326751ed-56d7-4925-a28f-1d04ce93ffec',
  '29b09155-bc5d-4cc3-930c-1f708e1a5ce8',
  'db596459-d8fa-420e-b6ee-64ea900b3adb',
  '873b2cbb-b86c-4e5b-8d63-a1a647ec254e',
  '788fa3f8-c600-4aa6-a63e-aa179ff324f8',
  '8a5c0715-5af6-4301-88b9-cebc7f33b0c9',
  '1cac976a-89f1-453b-8635-3e44979854e0',
  '6266dea3-a296-45fc-a583-64c7c11ef2e7',
  'ba7931e0-a12f-4246-954f-590544688e5d',
  '33ae736d-fa7d-4fe5-9c2f-7fbd63608957',
  '2bcc899f-e0c6-4f23-a1e2-89f1918a4486',
  '5a88fc3c-5e9e-463b-9296-8abb6cba3388',
  '6e41715e-63e6-43b4-a89b-d51f65d3312e',
  'db7b3a15-29c0-440c-baa2-b6bde357d9c0',
  '75d3f446-fe67-4ffa-ace7-b97989e97579',
  '885f8b72-5d36-4385-9c97-58f47ff7daf4',
  'ae31ddf9-07ad-4241-aa35-6d4450141abe',
  'b902e274-553c-4221-b5ff-fab2d394ec8a',
  '2513d244-84f3-45d3-9b44-e4d6c45f73ae',
  'dd151ee1-e7ac-425d-8f01-b51fd9b99b3a',
  'f3ede87c-929d-4edb-bfd3-57912c27feac',
  'eaf41098-9b5a-4558-a4d6-25cb63d1d661',
  'bee0b475-eb24-4fbe-8bc9-173b3b8b754c',
  '60e9518a-abf8-4123-bdd6-8d00c6ccb043',
  'cea8fbbe-e80b-4727-b282-e71d5527012c',
  '32f64475-3d64-4389-94ee-a43cd0801c3f',
  '5347497b-9139-4f9d-a264-5f890a9cb8f7',
  '607b0123-254f-4426-90c0-7a5bafcd6fc7',
  'b0457614-f7f2-408a-a039-1030fe02366b',
  'b66c8fa4-208e-4b24-a772-d66b695b8c81',
  '61dca1f0-d303-4f85-a46a-4b2ebcb4178f',
  '255cfb6c-88f2-4d8a-b76b-aff03cb85e8b',
  'a8e85620-9d2e-48bf-838e-288c683a9108',
  'b13e0f41-d40b-45d5-a61c-2e03ed4b48d9',
  '155eb8dd-764f-45a9-a44b-a4e66bcaab20',
  'c3cffc8a-94bf-4565-8537-f5addd2fd787',
  '60ed8d37-1338-4e23-90bb-07da7db07c42',
  '82c70d56-b99f-420d-8353-c9d6f499089b',
  '050c9b4c-6685-459c-9152-eb1242e529d5',
  'e96c2dab-fd2a-4537-bbdf-f4cb2607f9c4',
  '540f8b86-8451-42fe-b5cd-ae8e85b6a145',
  '0d1c4c02-6bcd-4470-b342-fd1ee592ffef',
  '37c9ebe7-e794-4b79-9260-39a8799c3cf5',
  'f4d5316c-8de3-4069-a1b8-9450ba710bfe',
  '7609f5eb-d19e-4ef4-ba5a-9939d349916d',
  'b60c882a-fb99-4970-b5f7-6192410ee3e3',
  '61ddef6c-36dd-4a6a-a79d-6340ef4cf685',
  'd34db48e-1031-4556-b305-0cd5ed961953',
  'ef00f0e3-77c3-4ae0-9322-48aad038a799',
  '9df1fb39-9d3a-4873-b31b-64d221ec6adf',
  '97076fbd-d758-40f7-9a8b-7d6fd1287b2c',
  '2f223fab-3056-458f-8cb0-b5bcac55e852',
  'a31ce027-2741-40a9-87ab-1b996b927c20',
  'aa212554-ad13-4f01-af50-a12e96d2c0f8',
  'a5f53ff4-22ad-40bf-8a95-51ea1284046e',
  '93d5ebfb-8592-46d8-ae91-8aca60c99349',
  '32dbd90c-2fb1-4195-933a-605b9e6f48f3',
  '8fdbafea-1ecf-4651-af8d-2968345f9849',
  '2504e5af-d86f-4a8e-8e95-441bc6636aed',
  'a52f650d-5c20-4906-b9b5-45744cde09e2',
  '4d1c062e-1af9-4b96-91cb-083fcb0619e4',
  'c9102606-cf1f-4cdf-9e8f-217e49403f89',
  '15fdf02b-bd34-4f29-9bcc-eab9bacd40e9',
  'de6a19b9-b495-4718-bbc6-3f3496770af3',
  '93f0478b-3d47-4885-83af-1d18c852410d',
  '89cb18f9-b738-4661-8a3c-79adc6f6f524',
  '7c5ae95c-7052-4ee5-a65a-2fba1271e49f',
  'f12efb5a-88d0-413c-b013-07ffabedeb7d',
  '08473c90-5072-4020-9507-60f37e638773',
  '33fe4c19-c902-43a0-8804-246f52c03acf',
  'ba81d32f-5767-4654-8fbd-69fcba976474'
);

-- ============================================================================
-- PARTIE 2 : RENOMMAGES (349 lignes)
-- ============================================================================

-- ANTOINE BECLERE
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'AMBROISE PARE', hash = '2d84882b_antoine_beclere___92140_clamart_ambroise' WHERE id = '243b0839-4a2a-401e-8fc5-9f5c00a2fbbb';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'AMBROISE PARE - 92100 BOULOGNE', hash = '04a8d8eb_antoine_beclere___92140_clamart_ambroise' WHERE id = 'b1165db8-b4e4-4397-94ff-baa72f3c0c3d';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'CCML - 92350 PLESSIS ROBINSON/LE', hash = '6891584b_antoine_beclere___92140_clamart_ccml___9' WHERE id = 'b3df343e-2552-4b01-8190-8c944a16a89b';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'CCML - 92350 PLESSIS ROBINSON/LE', hash = '80080dfb_antoine_beclere___92140_clamart_ccml___9' WHERE id = '63f6a69b-36da-4b44-a16a-aaed78088313';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'CCML - 92350 PLESSIS ROBINSON/LE', hash = '84f3cb7f_antoine_beclere___92140_clamart_ccml___9' WHERE id = 'c594ce79-5633-4cc5-9dda-3f7afce1b54f';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = 'a0035655_antoine_beclere___92140_clamart_gcs_seqo' WHERE id = '4c919a42-94e3-4bc3-aa72-668d08859a3c';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', hash = '20d79feb_antoine_beclere___92140_clamart_hopital_' WHERE id = '07c44c6f-9e16-439b-8610-32542ed2afbb';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', hash = '27141a5f_antoine_beclere___92140_clamart_hopital_' WHERE id = '61ef9fab-0192-4b6e-a5e0-d2860cff34bd';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', hash = '5c76be37_antoine_beclere___92140_clamart_hopital_' WHERE id = 'cfe92aa7-7b9e-4d4a-b76e-e0c931a0da48';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', hash = 'fc5eeeff_antoine_beclere___92140_clamart_hopital_' WHERE id = 'a655f481-1c82-4e57-af8e-a0d52b120cf2';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', hash = 'c54d7a9a_antoine_beclere___92140_clamart_hopital_' WHERE id = 'b697c905-8510-4321-8f14-cff2f10ef166';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', hash = 'b53f5236_antoine_beclere___92140_clamart_hopital_' WHERE id = 'a9a16ba3-2c51-449f-94e2-4f92bc546a49';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'NECKER - 75015 PARIS', hash = '0e4260f7_antoine_beclere___92140_clamart_necker__' WHERE id = 'c120e411-340e-481e-96f6-d2a3b52c09ed';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = 'e97cc880_antoine_beclere___92140_clamart_paul_bro' WHERE id = '73885728-8794-4a88-bf0e-d432fda4ca60';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'f40ab09a_antoine_beclere___92140_clamart_robert_d' WHERE id = '03220778-df11-4d4a-9ef4-9c72a974fdf6';
UPDATE reference_courses SET lieu_enlevement = 'ANTOINE BECLERE - 92140 CLAMART', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'b00ffec7_antoine_beclere___92140_clamart_robert_d' WHERE id = '5a909394-5c76-43db-89e5-134a8699ce13';

-- ARIANE/06 75 39 19 81
UPDATE reference_courses SET lieu_enlevement = 'ARIANE/06 75 39 19 81 - 91700 STE GENEVIEVE DES BOIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = 'f9d5434a_ariane_06_75_39_19_81___91700_ste_genevi' WHERE id = '62746072-130b-4169-b123-fb0730d767ba';

-- AVICENNE
UPDATE reference_courses SET lieu_enlevement = 'AVICENNE - 93000 BOBIGNY', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '612d0392_avicenne___93000_bobigny_gcs_seqoia___75' WHERE id = 'c8dd97ef-29b3-4db1-8fe4-31cd1b59b408';
UPDATE reference_courses SET lieu_enlevement = 'AVICENNE - 93000 BOBIGNY', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = 'f040c910_avicenne___93000_bobigny_paul_brousse___' WHERE id = 'a9bff1c2-f5b1-4bb4-ba57-9a1bc71430d9';
UPDATE reference_courses SET lieu_enlevement = 'AVICENNE - 93000 BOBIGNY', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '8b90d45d_avicenne___93000_bobigny_robert_debre___' WHERE id = '8e63d4c0-0b72-406b-bba2-5cdfd42cb910';
UPDATE reference_courses SET lieu_enlevement = 'AVICENNE - 93000 BOBIGNY', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '0af11680_avicenne___93000_bobigny_robert_debre___' WHERE id = 'fa84e340-2293-4f30-a093-7a787cdba0e7';
UPDATE reference_courses SET lieu_enlevement = 'AVICENNE - 93000 BOBIGNY', lieu_livraison = 'U.I.T.C - 94015 CRETEIL', hash = 'ad1f5af2_avicenne___93000_bobigny_u_i_t_c___94015' WHERE id = '57a787f1-9d71-4445-8ef2-2e9629f2bdc8';
UPDATE reference_courses SET lieu_enlevement = 'AVICENNE - 93000 BOBIGNY', lieu_livraison = 'U.I.T.C - 94015 CRETEIL', hash = 'e5089c81_avicenne___93000_bobigny_u_i_t_c___94015' WHERE id = '89b28c2b-66bd-41e2-849f-2942393231a5';

-- BEAUJON
UPDATE reference_courses SET lieu_enlevement = 'BEAUJON - 92110 CLICHY', lieu_livraison = 'BICHAT', hash = '7b5e8bb0_beaujon___92110_clichy_bichat_2_roues_pr' WHERE id = 'aa6b80c5-5a09-4c89-81a2-3158343556e2';
UPDATE reference_courses SET lieu_enlevement = 'BEAUJON - 92110 CLICHY', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '5616a880_beaujon___92110_clichy_robert_debre___75' WHERE id = '5273c88f-8876-4ca3-9035-cdea99c62198';

-- BICETRE
UPDATE reference_courses SET lieu_enlevement = 'BICETRE - 94270 KREMLIN BICETRE LE', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '3dca4ac7_bicetre___94270_kremlin_bicetre_le_igr__' WHERE id = 'c0df2942-0a2e-43c0-b9df-4dc91f2540d3';
UPDATE reference_courses SET lieu_enlevement = 'BICETRE - 94270 KREMLIN BICETRE LE', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '16e48bd2_bicetre___94270_kremlin_bicetre_le_igr__' WHERE id = '25795419-2c61-4e1a-96a1-e15671b1291f';
UPDATE reference_courses SET lieu_enlevement = 'BICETRE - 94270 KREMLIN BICETRE LE', lieu_livraison = 'MONDOR', hash = 'b74117a8_bicetre___94270_kremlin_bicetre_le_mondo' WHERE id = '78bf3a88-bd30-47c1-a7ac-889d416cc9fd';
UPDATE reference_courses SET lieu_enlevement = 'BICETRE - 94270 KREMLIN BICETRE LE', lieu_livraison = 'RAYMOND POINCARE', hash = '8727dbf1_bicetre___94270_kremlin_bicetre_le_raymo' WHERE id = '079d768b-042e-4c1a-9a25-6cafeec0a0eb';
UPDATE reference_courses SET lieu_enlevement = 'BICETRE - 94270 KREMLIN BICETRE LE', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'e1c9f629_bicetre___94270_kremlin_bicetre_le_rober' WHERE id = '8ff6e201-33dd-4357-99a4-e1e3bc202f69';
UPDATE reference_courses SET lieu_enlevement = 'BICETRE - 94270 KREMLIN BICETRE/LE', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'ac540add_bicetre___94270_kremlin_bicetre_le_igr__' WHERE id = '0167183d-806f-44c9-8175-723549bfe2cc';

-- BICHAT
UPDATE reference_courses SET lieu_enlevement = 'BICHAT - 75018 PARIS', lieu_livraison = 'AVICENNE', hash = '2d308658_bichat___75018_paris_avicenne_2_roues_pr' WHERE id = 'dbf95a9e-55ea-4c41-bf4a-8cdccd21c11c';
UPDATE reference_courses SET lieu_enlevement = 'BICHAT - 75018 PARIS', lieu_livraison = 'BRETONNEAU - 75018 PARIS', hash = 'ab01dc8c_bichat___75018_paris_bretonneau___75018_' WHERE id = '1f513b4f-ca4d-4ee7-93e3-613cb6005a82';
UPDATE reference_courses SET lieu_enlevement = 'BICHAT - 75018 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '4ee194c8_bichat___75018_paris_gcs_seqoia___75014_' WHERE id = '6157c6bd-e0d3-4ac8-8b6e-a873d2d61500';
UPDATE reference_courses SET lieu_enlevement = 'BICHAT - 75018 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '7cfa58da_bichat___75018_paris_robert_debre___7501' WHERE id = '889972e2-e5b2-4144-b6c9-07c8784e7e0b';

-- BOIS DE BONDY
UPDATE reference_courses SET lieu_enlevement = 'BOIS DE BONDY - 93140 BONDY', lieu_livraison = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', hash = 'ceda09f6_bois_de_bondy___93140_bondy_eps_evrard__' WHERE id = '5c47d885-8040-4b14-a8a1-e5deabfd44bc';

-- BRETONNEAU
UPDATE reference_courses SET lieu_enlevement = 'BRETONNEAU - 75018 PARIS', lieu_livraison = 'BEAUJON - 92110 CLICHY', hash = '502f57d6_bretonneau___75018_paris_beaujon___92110' WHERE id = '89f3be5c-4065-4933-8b5f-2f9d8eeb46af';
UPDATE reference_courses SET lieu_enlevement = 'BRETONNEAU - 75018 PARIS', lieu_livraison = 'BICHAT - 75018 PARIS', hash = '8d205f8c_bretonneau___75018_paris_bichat___75018_' WHERE id = '05521524-057f-4359-b371-7120414cc80d';
UPDATE reference_courses SET lieu_enlevement = 'BRETONNEAU - 75018 PARIS', lieu_livraison = 'BICHAT - 75018 PARIS', hash = 'd019b0f0_bretonneau___75018_paris_bichat___75018_' WHERE id = 'cb20928c-491a-4526-ab14-d8241ceb303d';
UPDATE reference_courses SET lieu_enlevement = 'BRETONNEAU - 75018 PARIS', lieu_livraison = 'HEGP', hash = '2753f459_bretonneau___75018_paris_hegp_break_expr' WHERE id = '0dccb179-8d80-44be-b4cd-05faabe33c9d';
UPDATE reference_courses SET lieu_enlevement = 'BRETONNEAU - 75018 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = 'b4d0434b_bretonneau___75018_paris_lariboisiere___' WHERE id = '951406a9-51eb-49c0-a592-5e6637fe68dc';
UPDATE reference_courses SET lieu_enlevement = 'BRETONNEAU - 75018 PARIS', lieu_livraison = 'LOUIS MOURIER - 92750 COLOMBES', hash = 'd870d022_bretonneau___75018_paris_louis_mourier__' WHERE id = '409767d8-598d-490e-aac9-86e25a388658';

-- BROCA
UPDATE reference_courses SET lieu_enlevement = 'BROCA - 75013 PARIS', lieu_livraison = 'COCHIN - 75014 PARIS', hash = 'be6d841c_broca___75013_paris_cochin___75014_paris' WHERE id = '01c5fcac-7665-4bca-ac5e-38d74f777097';
UPDATE reference_courses SET lieu_enlevement = 'BROCA - 75013 PARIS', lieu_livraison = 'COCHIN - 75014 PARIS', hash = '872122bc_broca___75013_paris_cochin___75014_paris' WHERE id = 'e7c405bd-9f4b-4514-ae1b-6ad475436c9d';
UPDATE reference_courses SET lieu_enlevement = 'BROCA - 75013 PARIS', lieu_livraison = 'COCHIN - 75014 PARIS', hash = '45fbfb60_broca___75013_paris_cochin___75014_paris' WHERE id = 'e21160d9-3262-484c-a9f3-b28d5f6811d5';
UPDATE reference_courses SET lieu_enlevement = 'BROCA - 75013 PARIS', lieu_livraison = 'COCHIN - 75014 PARIS', hash = 'b0f64669_broca___75013_paris_cochin___75014_paris' WHERE id = '75da22d7-d5a2-4302-9a1b-81bde162fdae';
UPDATE reference_courses SET lieu_enlevement = 'BROCA - 75013 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = 'fdcfaca2_broca___75013_paris_lariboisiere___75010' WHERE id = 'aaf60a2f-08c0-442c-911a-67edc177f4b2';
UPDATE reference_courses SET lieu_enlevement = 'BROCA - 75013 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = 'c22c2678_broca___75013_paris_lariboisiere___75010' WHERE id = '3e11b50f-9b83-452e-8861-da4cde4ea414';
UPDATE reference_courses SET lieu_enlevement = 'BROCA - 75013 PARIS', lieu_livraison = 'LOUIS MOURIER - 92750 COLOMBES', hash = '1d8da597_broca___75013_paris_louis_mourier___9275' WHERE id = '3b66b62c-5596-4f4b-9380-3978a08e210f';

-- CCML
UPDATE reference_courses SET lieu_enlevement = 'CCML - 92350 PLESSIS ROBINSON/LE', lieu_livraison = 'HEGP - 75015 PARIS', hash = '6ffd401c_ccml___92350_plessis_robinson_le_hegp___' WHERE id = '1ac330e4-20b8-45d6-9a4e-0edaa8d1c463';
UPDATE reference_courses SET lieu_enlevement = 'CCML - 92350 PLESSIS ROBINSON/LE', lieu_livraison = 'HEGP - 75015 PARIS', hash = '59cf9760_ccml___92350_plessis_robinson_le_hegp___' WHERE id = '87047404-5402-4f6a-8c4d-c891ce1ddb63';

-- CH ARPAJON
UPDATE reference_courses SET lieu_enlevement = 'CH ARPAJON - 91290 ARPAJON', lieu_livraison = 'CHSF CORBEIL - 91100 CORBEIL ESSONNES', hash = 'e751640d_ch_arpajon___91290_arpajon_chsf_corbeil_' WHERE id = 'fc3938f1-cb47-4979-9801-df8cee61e8c8';
UPDATE reference_courses SET lieu_enlevement = 'CH ARPAJON - 91290 ARPAJON', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '1033395f_ch_arpajon___91290_arpajon_robert_debre_' WHERE id = '60ac0270-ebfb-46be-ae95-a01743ca2359';

-- CIAPA
UPDATE reference_courses SET lieu_enlevement = 'CIAPA - 75018 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '09105caa_ciapa___75018_paris_sainte_anne___75014_' WHERE id = '9ec3c7c4-ebf4-4d9e-909f-f6db7bdbf1e2';
UPDATE reference_courses SET lieu_enlevement = 'CIAPA - 75018 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '8e9a36f0_ciapa___75018_paris_sainte_anne___75014_' WHERE id = 'dcbfc45c-be49-4053-b3b3-e131b18fde50';

-- CLINIQUE CLAUDE BERNARD
UPDATE reference_courses SET lieu_enlevement = 'CLINIQUE CLAUDE BERNARD - 95120 ERMONT', lieu_livraison = 'HOPITAL PRIVE ARMAND BRILLARD', hash = '5e718895_clinique_claude_bernard___95120_ermont_h' WHERE id = '96e8d855-dce0-402d-9aa1-38e4db8be6bd';

-- CLINIQUE DE LA MUETTE
UPDATE reference_courses SET lieu_enlevement = 'CLINIQUE DE LA MUETTE - 75016 PARIS', lieu_livraison = 'ST ANTOINE - 75012 PARIS', hash = 'db9c2e3b_clinique_de_la_muette___75016_paris_st_a' WHERE id = '68191c70-47e0-4f56-9e20-5138f774fa57';

-- CLINIQUE DE TURIN
UPDATE reference_courses SET lieu_enlevement = 'CLINIQUE DE TURIN - 75008 PARIS', lieu_livraison = 'HEGP - 75015 PARIS', hash = 'f140e905_clinique_de_turin___75008_paris_hegp___7' WHERE id = '09f6604a-33e5-4fcd-a03c-912dc32fc021';

-- Clinique Edouard Rist
UPDATE reference_courses SET lieu_enlevement = 'Clinique Edouard Rist - 75016 PARIS', lieu_livraison = 'MONDOR', hash = '0ec092de_clinique_edouard_rist___75016_paris_mond' WHERE id = 'e4182b22-b36d-4ec8-9bcd-757a5772cad5';

-- CLINIQUE MAUSSINS NOLLET
UPDATE reference_courses SET lieu_enlevement = 'CLINIQUE MAUSSINS NOLLET - 75019 PARIS', lieu_livraison = 'CROIX ST SIMON', hash = '2b52c197_clinique_maussins_nollet___75019_paris_c' WHERE id = 'dc2cb85e-c54e-4b6d-a3f8-c4c7c2b974e1';
UPDATE reference_courses SET lieu_enlevement = 'CLINIQUE MAUSSINS NOLLET - 75019 PARIS', lieu_livraison = 'CROIX ST SIMON - 75020 PARIS', hash = '1fbe7073_clinique_maussins_nollet___75019_paris_c' WHERE id = 'aefdd244-1589-4744-b02c-6ab2fcc9fa55';

-- CLINIQUE PARLY 2
UPDATE reference_courses SET lieu_enlevement = 'CLINIQUE PARLY 2 - 78150 CHESNAY LE', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = 'c367b2cf_clinique_parly_2___78150_chesnay_le_hopi' WHERE id = '3577a07d-d8ea-4a85-9fc6-c0f94bbf7fbe';

-- COCHIN
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'CORENTIN CELTON - 92130 ISSY LES', hash = 'e1ffed18_cochin___75014_paris_corentin_celton___9' WHERE id = '3bfaa452-c309-4fc6-b48d-0578eab6eaaa';
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = 'abc706d1_cochin___75014_paris_gcs_seqoia___75014_' WHERE id = '332c34dc-57d3-41a2-b695-a9653dae19ec';
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'HOTEL DIEU - 75004 PARIS', hash = 'd27a04d5_cochin___75014_paris_hotel_dieu___75004_' WHERE id = '1371ceef-eec4-4b01-98f8-4f08a35306d9';
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'HOTEL DIEU - 75004 PARIS', hash = '6d4765e0_cochin___75014_paris_hotel_dieu___75004_' WHERE id = '767d4015-e38f-484f-9761-6236fc8df22e';
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = '7330b3fd_cochin___75014_paris_paul_brousse___9480' WHERE id = '76569547-62f1-4093-aaaf-22e3746a9d21';
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'RAYMOND POINCARE', hash = '9fbb9476_cochin___75014_paris_raymond_poincare_2_' WHERE id = '55a12952-9d5d-472e-9bf5-9fd9b8ea25d5';
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '27b301c0_cochin___75014_paris_sainte_anne___75014' WHERE id = 'd22e5e4b-5ab6-4aa1-8f1e-e7bd9047ac8f';
UPDATE reference_courses SET lieu_enlevement = 'COCHIN - 75014 PARIS', lieu_livraison = 'SAINTE PERINE - 75016 PARIS', hash = '94a33605_cochin___75014_paris_sainte_perine___750' WHERE id = '62ef2eda-e3d4-48a3-9b32-6291381a0fb6';

-- CORENTIN CELTON
UPDATE reference_courses SET lieu_enlevement = 'CORENTIN CELTON - 92130 ISSY LES MOULINEAUX', lieu_livraison = 'LARIBOISIERE', hash = '9889ac14_corentin_celton___92130_issy_les_mouline' WHERE id = '88c634e5-5957-4ba0-b82f-391f7effa535';
UPDATE reference_courses SET lieu_enlevement = 'CORENTIN CELTON - 92130 ISSY LES MOULINEAUX', lieu_livraison = 'NECKER - 75015 PARIS', hash = 'ed343118_corentin_celton___92130_issy_les_mouline' WHERE id = 'e2fe9e55-15f6-47ef-bfb0-17b2534e8736';
UPDATE reference_courses SET lieu_enlevement = 'CORENTIN CELTON - 92130 ISSY LES MOULINEAUX', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '03a8f26d_corentin_celton___92130_issy_les_mouline' WHERE id = '7e1de455-5a4b-4624-9aba-36edb45b4f5d';

-- CROIX ST SIMON
UPDATE reference_courses SET lieu_enlevement = 'CROIX ST SIMON - 75020 PARIS', lieu_livraison = 'INSTITUT CURIE - 75005 PARIS', hash = '7911684b_croix_st_simon___75020_paris_institut_cu' WHERE id = '98b0d965-04df-410f-9012-1ca7a263366b';
UPDATE reference_courses SET lieu_enlevement = 'CROIX ST SIMON - 75020 PARIS', lieu_livraison = 'ST-LOUIS - 75010 PARIS', hash = '572dbb3d_croix_st_simon___75020_paris_st_louis___' WHERE id = 'be843832-faba-44e4-9d22-00447d006473';

-- CROZATIER
UPDATE reference_courses SET lieu_enlevement = 'CROZATIER - 75012 PARIS', lieu_livraison = 'U.I.T.C', hash = '47bba393_crozatier___75012_paris_u_i_t_c_2_roues_' WHERE id = '7ddc9583-fe34-4589-9f2a-69902c509939';
UPDATE reference_courses SET lieu_enlevement = 'CROZATIER - 75012 PARIS', lieu_livraison = 'U.I.T.C - 94015 CRETEIL', hash = '27a7eb87_crozatier___75012_paris_u_i_t_c___94015_' WHERE id = '03dfb252-c1af-4b4b-89ee-6776af026d7a';

-- DELAFONTAINE
UPDATE reference_courses SET lieu_enlevement = 'DELAFONTAINE - 93200 ST DENIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = '54d312c8_delafontaine___93200_st_denis_lariboisie' WHERE id = '9215d76f-691c-446b-9adf-a9d058a899ca';

-- EPS EVRARD
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93140 BONDY', lieu_livraison = 'DELAFONTAINE - 93200 ST DENIS', hash = 'f9367381_eps_evrard___93140_bondy_delafontaine___' WHERE id = 'f18da870-e7fa-4257-afca-726d798037ee';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93140 BONDY', lieu_livraison = 'DELAFONTAINE - 93200 ST DENIS', hash = 'ae6a02dd_eps_evrard___93140_bondy_delafontaine___' WHERE id = '1f9beb21-0109-4cf1-8e0d-6c80489f7947';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93200 ST DENIS', lieu_livraison = 'DELAFONTAINE - 93200 ST DENIS', hash = 'd30a3177_eps_evrard___93200_st_denis_delafontaine' WHERE id = 'c9723c39-3309-493a-a648-5852f76c7889';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93200 ST DENIS', lieu_livraison = 'DELAFONTAINE - 93200 ST DENIS', hash = 'd30a3176_eps_evrard___93200_st_denis_delafontaine' WHERE id = '8d246e42-547d-4f11-8246-86774a02d2e0';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'DELAFONTAINE - 93200 ST DENIS', hash = '5c953b89_eps_evrard___93330_neuilly_sur_marne_del' WHERE id = '56177710-dbeb-41ad-a7ff-4ac28c9b9b8d';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'EPS EVRARD', hash = 'c98a8ca2_eps_evrard___93330_neuilly_sur_marne_eps' WHERE id = '868b1126-8daf-4b5b-ae36-b396f6d11614';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'EPS EVRARD - 93140 BONDY', hash = 'f20aca2e_eps_evrard___93330_neuilly_sur_marne_eps' WHERE id = 'f48dba2d-82bf-4bb5-8b98-fcc9e615e416';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'EPS EVRARD - 93140 BONDY', hash = 'f20aca28_eps_evrard___93330_neuilly_sur_marne_eps' WHERE id = 'c2344b44-388f-4826-a529-9576a1613f61';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'EPS EVRARD - 93200 ST DENIS', hash = '404aaf7d_eps_evrard___93330_neuilly_sur_marne_eps' WHERE id = 'b2df5695-b375-4caf-a5db-0eef0789785a';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'EPS EVRARD - 93200 ST DENIS', hash = '2c374b05_eps_evrard___93330_neuilly_sur_marne_eps' WHERE id = 'd2fc19ae-d89e-42ef-8d55-85b720c49f31';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'EPS EVRARD - 93300 AUBERVILLIERS', hash = '5b4dd025_eps_evrard___93330_neuilly_sur_marne_eps' WHERE id = '67e14537-8dcd-4638-b8ec-3f993a5867bf';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'MONDOR - 94000 CRETEIL', hash = '51cdab37_eps_evrard___93330_neuilly_sur_marne_mon' WHERE id = '1a7a481d-c03e-4a1f-8ab7-91c69ac99907';
UPDATE reference_courses SET lieu_enlevement = 'EPS EVRARD - 93330 NEUILLY SUR MARNE', lieu_livraison = 'MONDOR - 94015 CRETEIL', hash = '0c985b93_eps_evrard___93330_neuilly_sur_marne_mon' WHERE id = '8d633bea-3f3d-4285-b34e-cba3bbc590e9';

-- EVRY
UPDATE reference_courses SET lieu_enlevement = 'EVRY - 91000 EVRY', lieu_livraison = 'CH ARPAJON - 91290 ARPAJON', hash = 'f124538e_evry___91000_evry_ch_arpajon___91290_arp' WHERE id = 'eff2e532-316a-4c04-bf92-5b0f799031d2';
UPDATE reference_courses SET lieu_enlevement = 'EVRY - 91000 EVRY', lieu_livraison = 'CH ARPAJON - 91290 ARPAJON', hash = '5d6d45b2_evry___91000_evry_ch_arpajon___91290_arp' WHERE id = '59feab87-b247-44fe-a463-ea9045822e1e';
UPDATE reference_courses SET lieu_enlevement = 'EVRY - 91000 EVRY', lieu_livraison = 'JOFFRE DUPUYTREN - 91210 DRAVEIL', hash = '96a3f69c_evry___91000_evry_joffre_dupuytren___912' WHERE id = '585e5159-3894-42bd-8a31-92024830a128';
UPDATE reference_courses SET lieu_enlevement = 'EVRY - 91000 EVRY', lieu_livraison = 'JOFFRE DUPUYTREN - 91210 DRAVEIL', hash = '8ae87a88_evry___91000_evry_joffre_dupuytren___912' WHERE id = '8d6459ac-2ec4-47d2-9a3b-c24dde9d4c29';

-- FERNAND WIDAL
UPDATE reference_courses SET lieu_enlevement = 'FERNAND WIDAL - 75010 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = '2b386d43_fernand_widal___75010_paris_lariboisiere' WHERE id = '46f98b34-0a9f-497d-a73e-da49a6b03efa';
UPDATE reference_courses SET lieu_enlevement = 'FERNAND WIDAL - 75010 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = '971a459f_fernand_widal___75010_paris_lariboisiere' WHERE id = '6d2069e3-a42a-4324-bc43-d7b217a0a6cc';

-- FOCH
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92150 SURESNES', lieu_livraison = 'HOPITAL MIGNOT - 78150 CHESNAY LE', hash = '21162289_foch___92150_suresnes_hopital_mignot___7' WHERE id = '9fa51257-e6b8-4eea-a814-12a814810785';
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92150 SURESNES', lieu_livraison = 'HOPITAL MIGNOT - 78150 CHESNAY LE', hash = 'cfbe8ad5_foch___92150_suresnes_hopital_mignot___7' WHERE id = '0a31bc7d-0150-4b12-bfd5-b30918c7221e';
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92150 SURESNES', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '8836aebe_foch___92150_suresnes_igr___94800_villej' WHERE id = '00fc7afa-cf77-4789-a656-3780695c1796';
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92150 SURESNES', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = '531e10cb_foch___92150_suresnes_lariboisiere___750' WHERE id = '0e1bd912-926a-4cbe-b5d6-a2545ea39e0b';
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92150 SURESNES', lieu_livraison = 'NANTERRE', hash = '327afa23_foch___92150_suresnes_nanterre_2_roues_e' WHERE id = '078faeef-c011-4481-b8ef-4deffba903a8';
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92150 SURESNES', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = 'ed2a75e5_foch___92150_suresnes_paul_brousse___948' WHERE id = '5c4e0c9a-b85a-4293-bdf4-d53c93e6a38e';
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92150 SURESNES', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'f85365f0_foch___92150_suresnes_robert_debre___750' WHERE id = '4dddbe14-9009-41c0-8ee8-b8cb973ea59d';
UPDATE reference_courses SET lieu_enlevement = 'FOCH - 92400 COURBEVOIE', lieu_livraison = 'FOCH', hash = '508fc2ec_foch___92400_courbevoie_foch_2_roues_exp' WHERE id = '0aaa0e60-0ada-4d09-9351-bf8ac4d403c0';

-- GCS SEQOIA
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'ANTOINE BECLERE', hash = '75881602_gcs_seqoia___75014_paris_antoine_beclere' WHERE id = '93a19cec-d454-495f-810d-dccea7ada01a';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'BICHAT', hash = '9ca55247_gcs_seqoia___75014_paris_bichat_2_roues_' WHERE id = '5d1dedc3-e417-4f0a-9fb3-b056590aad93';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'COCHIN', hash = 'afd7b232_gcs_seqoia___75014_paris_cochin_2_roues_' WHERE id = '15e51683-ce19-4e92-9270-ca68e6f037de';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'COCHIN - 75014 PARIS', hash = '6087d9b1_gcs_seqoia___75014_paris_cochin___75014_' WHERE id = '8d519a2a-76b0-4ab4-a6dc-0a9d66d9d468';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'Hôpital Européen Georges Pompidou - AGEB - 75015 PARIS', hash = 'dcb67064_gcs_seqoia___75014_paris_h_pital_europ_e' WHERE id = '17eaf96c-6bf7-42f6-bf73-48fa69e1b78a';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'hôpital pitié salpêtrière - cardiogenet - 75013 PARIS', hash = '3a5f1b11_gcs_seqoia___75014_paris_h_pital_piti__s' WHERE id = 'a9f584c1-fd63-4d9a-a8d3-ca04ccd611d2';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'Hôpital Robert Debré - 75019 PARIS', hash = '71c04064_gcs_seqoia___75014_paris_h_pital_robert_' WHERE id = '9b488b40-a4ff-4a51-a565-3c49110d9264';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'Hôpital Robert Debré - Bâtiment Bingen - 75019 PARIS', hash = 'd8b6d97a_gcs_seqoia___75014_paris_h_pital_robert_' WHERE id = '983a647f-cffd-478d-af37-6458fe044e07';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '6f492d60_gcs_seqoia___75014_paris_igr___94800_vil' WHERE id = '803b8f33-316f-47ba-b904-48aa760b1e30';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'La Pitié Salpêtrière - Bâtiment Montyon - 75013 PARIS', hash = '48b99800_gcs_seqoia___75014_paris_la_piti__salp_t' WHERE id = '8c852ab5-c816-4a3c-8471-e291e2f96f9d';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'La Pitié-Salpêtrière - Bâtiment Pharmacie - 75013 PARIS', hash = 'ba2a5485_gcs_seqoia___75014_paris_la_piti__salp_t' WHERE id = '9e5ac309-1179-413f-ae60-b927f03160b7';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'MONDOR - 94015 CRETEIL', hash = 'fc1a23cf_gcs_seqoia___75014_paris_mondor___94015_' WHERE id = 'f2dd0a88-fce7-4f98-a01d-a77032282793';
UPDATE reference_courses SET lieu_enlevement = 'GCS SEQOIA - 75014 PARIS', lieu_livraison = 'NECKER - 75015 PARIS', hash = '3b7a0c84_gcs_seqoia___75014_paris_necker___75015_' WHERE id = '4f0a62df-bc0f-4d8f-924c-8ba91195441e';

-- HAD
UPDATE reference_courses SET lieu_enlevement = 'HAD - 94220 CHARENTON LE PONT', lieu_livraison = 'PAUL BROUSSE', hash = '87cf147a_had___94220_charenton_le_pont_paul_brous' WHERE id = '92c2f801-702d-477d-98fa-871ae6618d78';
UPDATE reference_courses SET lieu_enlevement = 'HAD - 94220 CHARENTON LE PONT', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = 'b855ab68_had___94220_charenton_le_pont_paul_brous' WHERE id = '44c9cadd-dc88-4f4c-9cc7-b424f401df0c';
UPDATE reference_courses SET lieu_enlevement = 'HAD - 94220 CHARENTON LE PONT', lieu_livraison = 'ROBERT DEBRE - 93310 PRE ST', hash = '36000663_had___94220_charenton_le_pont_robert_deb' WHERE id = '266c9ec0-bc92-4d24-8ae2-6f87a9606b27';
UPDATE reference_courses SET lieu_enlevement = 'HAD - 94220 CHARENTON LE PONT', lieu_livraison = 'ROBERT DEBRE - 93310 PRE ST GERVAIS/LE', hash = '822f5a5b_had___94220_charenton_le_pont_robert_deb' WHERE id = '6b366ae8-1cc9-476e-aeb2-db49123cd78a';
UPDATE reference_courses SET lieu_enlevement = 'HAD - 94220 CHARENTON LE PONT', lieu_livraison = 'ROBERT DEBRE - 93310 PRE ST GERVAIS/LE', hash = '822f5a58_had___94220_charenton_le_pont_robert_deb' WHERE id = 'cf6167c3-8b83-42bb-bcaa-7f8517421c71';

-- HEGP
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = 'e4001a4d_hegp___75015_paris_antoine_beclere___921' WHERE id = '12fcf18c-e09d-4144-8430-c3bda91e8baa';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = '1483e67d_hegp___75015_paris_antoine_beclere___921' WHERE id = 'f5768fe8-acce-437c-a52a-40254eec6e39';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = '29d71db9_hegp___75015_paris_antoine_beclere___921' WHERE id = 'db17fcac-c8eb-4f16-bc13-30e681730647';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'CCML - 92350 PLESSIS', hash = '8dd15024_hegp___75015_paris_ccml___92350_plessis_' WHERE id = 'd93d642e-5d27-487c-a2b3-e88b10b7e7a8';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'CCML - 92350 PLESSIS', hash = 'cbd8ad30_hegp___75015_paris_ccml___92350_plessis_' WHERE id = '50d0cafa-7d56-4666-a125-9ed87c0e50e5';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'CCML - 92350 PLESSIS ROBINSON/LE', hash = '941b2748_hegp___75015_paris_ccml___92350_plessis_' WHERE id = '84d4b51a-4576-4b03-a625-cb7c59360eb3';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'CCML - 92350 PLESSIS ROBINSON/LE', hash = '05cec29c_hegp___75015_paris_ccml___92350_plessis_' WHERE id = '4d938ace-ab87-42ac-861d-980f61d429d2';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'CCML - 92350 PLESSIS ROBINSON/LE', hash = 'a31a0f09_hegp___75015_paris_ccml___92350_plessis_' WHERE id = 'f2b7befd-5282-4923-b742-d6e225360176';
UPDATE reference_courses SET lieu_enlevement = 'HEGP - 75015 PARIS', lieu_livraison = 'INSTITUT PASTEUR - 75015 PARIS', hash = '53abf6c1_hegp___75015_paris_institut_pasteur___75' WHERE id = '1952a9f5-69c7-41bb-aab6-0931005076f5';

-- HOPITAL DE FONTAINEBLEAU
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL DE FONTAINEBLEAU - 77300 FONTAINEBLEAU', lieu_livraison = 'CHSF CORBEIL - 91100 CORBEIL', hash = 'cee33c48_hopital_de_fontainebleau___77300_fontain' WHERE id = 'd433c3a1-8dd9-4024-9bfd-885287915b85';

-- Hôpital Européen Georges Pompidou
UPDATE reference_courses SET lieu_enlevement = 'Hôpital Européen Georges Pompidou - AGEB - 75015 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '03b766a4_h_pital_europ_en_georges_pompidou___ageb' WHERE id = '492390a4-3ccb-4069-86db-eb0d96ec9d40';

-- HOPITAL HENRI EY
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL HENRI EY - 75013 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '7cbbdbd8_hopital_henri_ey___75013_paris_sainte_an' WHERE id = '0757352e-098d-475e-bea5-1b7c4fc5571f';

-- HOPITAL LES PEUPLIERS
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL LES PEUPLIERS - 75013 PARIS', lieu_livraison = 'HOPITAL PRIVE ARMAND BRILLARD', hash = '60f36aa7_hopital_les_peupliers___75013_paris_hopi' WHERE id = '3ab06704-3d73-402e-9dcf-ff88d71e7646';
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL LES PEUPLIERS - 75013 PARIS', lieu_livraison = 'HOPITAL PRIVE ARMAND BRILLARD', hash = 'bbef0fd6_hopital_les_peupliers___75013_paris_hopi' WHERE id = '241b239b-d753-4ad9-a4ed-eb0a649832c5';
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL LES PEUPLIERS - 75013 PARIS', lieu_livraison = 'ST ANTOINE - 75012 PARIS', hash = 'efc1a7e6_hopital_les_peupliers___75013_paris_st_a' WHERE id = '10b8c1ab-d88d-482c-bca1-4ad66c858661';

-- HOPITAL MIGNOT
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL MIGNOT - 78150 CHESNAY LE', lieu_livraison = 'CENTRE HOSPITALIER VICTOR DUPOUY - 95100', hash = '693aced4_hopital_mignot___78150_chesnay_le_centre' WHERE id = '0173f884-9a26-4b39-9d14-0aa6f723d009';
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL MIGNOT - 78150 CHESNAY LE', lieu_livraison = 'CENTRE HOSPITALIER/ PHARMACIE - 95100', hash = '43895b4b_hopital_mignot___78150_chesnay_le_centre' WHERE id = 'e14ddb19-703a-47ee-be1c-06a815af63b0';

-- HOPITAL PARIS SACLAY
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL PARIS SACLAY - 91400 ORSAY', lieu_livraison = 'CHSF CORBEIL - 91100 CORBEIL', hash = '06dd4b38_hopital_paris_saclay___91400_orsay_chsf_' WHERE id = '511ebf2b-073d-4878-999f-a79770ee1571';

-- hôpital pitié salpêtrière
UPDATE reference_courses SET lieu_enlevement = 'hôpital pitié salpêtrière - Institut d Neurologie - 75013 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '1c5e316d_h_pital_piti__salp_tri_re___institut_d_n' WHERE id = 'b43b3e8a-e75a-42d4-a163-28921b8d2800';

-- HOPITAL PRIVE D ANTONY
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', lieu_livraison = 'HOPITAL PRIVE ARMAND BRILLARD', hash = 'cc85d274_hopital_prive_d_antony___92160_antony_ho' WHERE id = 'a512bffb-27d6-4eb6-81e5-7882e7f63394';
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL PRIVE D ANTONY - 92160 ANTONY', lieu_livraison = 'MONDOR BIOCHIMIE - 94015 CRETEIL', hash = 'f65dbe16_hopital_prive_d_antony___92160_antony_mo' WHERE id = 'c79adb4a-d7f2-446a-beae-215656f6166a';

-- HOPITAL PRIVE DE L OUEST PARISIEN
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL PRIVE DE L OUEST PARISIEN - 78190 TRAPPES', lieu_livraison = 'HOPITAL MIGNOT - 78150 CHESNAY LE', hash = '62d5f3f1_hopital_prive_de_l_ouest_parisien___7819' WHERE id = '1c8d2112-8f5e-4240-9442-dee5b7f93710';

-- HOPITAL PRIVE JACQUES CARTIER
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL PRIVE JACQUES CARTIER - 91300 MASSY', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = '163bc1c6_hopital_prive_jacques_cartier___91300_ma' WHERE id = '8304cbe2-805b-4a3f-8929-a5019ff35bd0';

-- Hôpital Robert Debré
UPDATE reference_courses SET lieu_enlevement = 'Hôpital Robert Debré - PEMR - 75019 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '2d868003_h_pital_robert_debr____pemr___75019_pari' WHERE id = '48a394d3-b873-49b8-93a0-017c18f6949c';

-- HOPITAL SAINT CAMILLE
UPDATE reference_courses SET lieu_enlevement = 'HOPITAL SAINT CAMILLE - 94360 BRY SUR MARNE', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'ce417584_hopital_saint_camille___94360_bry_sur_ma' WHERE id = '4165d469-10b0-4ded-96d7-85c43dea91d4';

-- HOTEL DIEU
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'AMBROISE PARE - 92100 BOULOGNE', hash = '472db193_hotel_dieu___75004_paris_ambroise_pare__' WHERE id = 'd7e4ac26-34f9-49bf-922d-e2985b758555';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'BICETRE - 94270 KREMLIN BICETRE/LE', hash = 'fbe437d0_hotel_dieu___75004_paris_bicetre___94270' WHERE id = 'e285883a-67f1-4437-b77e-09aa7c5a3d51';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'CHSF CORBEIL - 91100 CORBEIL', hash = 'ebdb27a3_hotel_dieu___75004_paris_chsf_corbeil___' WHERE id = '6cd1e1ac-2d71-4d12-9ea4-c629d8454473';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'CLINIQUE GASTON METIVET - 94100 ST MAUR DES', hash = '0af087c2_hotel_dieu___75004_paris_clinique_gaston' WHERE id = '3f873b89-0031-4097-8b87-d6523c7ff5eb';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'COCHIN - 75014 PARIS', hash = 'd2f66ea0_hotel_dieu___75004_paris_cochin___75014_' WHERE id = '82555861-2bdd-42c0-8824-74508af4b8b7';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = 'b18afede_hotel_dieu___75004_paris_lariboisiere___' WHERE id = '68261df5-0a94-41c2-ac29-074a8fc6154e';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'NECKER - 75015 PARIS', hash = '7fc8ef55_hotel_dieu___75004_paris_necker___75015_' WHERE id = '3e2d7a4d-aa7b-4655-8a5d-fd7bb84f18f1';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'RENE MURET - 93270 SEVRAN', hash = 'c117a9d7_hotel_dieu___75004_paris_rene_muret___93' WHERE id = '0ade5c69-614b-48a5-806f-f28e1ac61bc8';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'SAINTE PERINE - 75016 PARIS', hash = 'c7713563_hotel_dieu___75004_paris_sainte_perine__' WHERE id = 'f7c7f10f-f252-4f33-998a-f8477fd4acdf';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'ST-LOUIS - 75010 PARIS', hash = 'a3a15742_hotel_dieu___75004_paris_st_louis___7501' WHERE id = '65cdfda9-e2a3-4ba8-ae0f-f461086c3974';
UPDATE reference_courses SET lieu_enlevement = 'HOTEL DIEU - 75004 PARIS', lieu_livraison = 'TROUSSEAU - 75012 PARIS', hash = 'bca5c98b_hotel_dieu___75004_paris_trousseau___750' WHERE id = '0e85c14b-32ec-4a98-9428-65c3f22a8853';

-- IGR
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'CENTRE HOSPITALIER VICTOR DUPOUY - 95100', hash = '34de21e6_igr___94800_villejuif_centre_hospitalier' WHERE id = 'bd3258d8-cae4-4380-855a-42ab7e1023f6';
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '2d722160_igr___94800_villejuif_gcs_seqoia___75014' WHERE id = '2bcee3ec-e0ca-4f9c-95c6-774b8991a1a9';
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'HOPITAL SAINT CAMILLE', hash = '84fd71d1_igr___94800_villejuif_hopital_saint_cami' WHERE id = '8a778ba2-0fc8-4caa-ba26-22733b26eaa7';
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'INSTITUT CURIE', hash = 'c0025f40_igr___94800_villejuif_institut_curie_2_r' WHERE id = 'dc7e543b-a8b1-4478-9b01-b30cc3d3c592';
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'INSTITUT CURIE - 75005 PARIS', hash = '8d21b6e3_igr___94800_villejuif_institut_curie___7' WHERE id = 'e8edcde9-c710-4166-90f3-9a1c410cc192';
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'PITIE SALPETRIERE - 75013 PARIS', hash = '53b24f73_igr___94800_villejuif_pitie_salpetriere_' WHERE id = '72ace461-a618-4a4b-b097-3ab5b3aed7c0';
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'PITIE SALPETRIERE - 75013 PARIS', hash = '06793c47_igr___94800_villejuif_pitie_salpetriere_' WHERE id = '9ab7a272-d6c8-4dcb-8acf-68b13524be7f';
UPDATE reference_courses SET lieu_enlevement = 'IGR - 94800 VILLEJUIF', lieu_livraison = 'ST ANTOINE - 75012 PARIS', hash = '43c3e9d4_igr___94800_villejuif_st_antoine___75012' WHERE id = 'ca88c81a-b4ee-4cc6-aa28-5d2961cc7715';

-- INSTITUT CURIE
UPDATE reference_courses SET lieu_enlevement = 'INSTITUT CURIE - 75005 PARIS', lieu_livraison = 'COCHIN', hash = 'fa3077d1_institut_curie___75005_paris_cochin_2_ro' WHERE id = '781cbbfc-49ce-4af4-a0fc-f4552b0b1962';
UPDATE reference_courses SET lieu_enlevement = 'INSTITUT CURIE - 75005 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = 'e2a2adf0_institut_curie___75005_paris_gcs_seqoia_' WHERE id = '9d01dda0-becf-4d4c-aaa8-0c5a2457535d';
UPDATE reference_courses SET lieu_enlevement = 'INSTITUT CURIE - 75005 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'ba0a6fa3_institut_curie___75005_paris_igr___94800' WHERE id = 'a3524488-0085-4875-9a16-2b0280a3be93';
UPDATE reference_courses SET lieu_enlevement = 'INSTITUT CURIE - 92210 ST CLOUD', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '18175439_institut_curie___92210_st_cloud_gcs_seqo' WHERE id = '3baf7cd7-5000-4177-a34a-886b2c3ded63';

-- INSTITUT MONTSOURIS
UPDATE reference_courses SET lieu_enlevement = 'INSTITUT MONTSOURIS - 75014 PARIS', lieu_livraison = 'INSTITUT CURIE', hash = 'a4209a21_institut_montsouris___75014_paris_instit' WHERE id = 'bd10caff-b6a6-46a2-8108-79d40b09f969';
UPDATE reference_courses SET lieu_enlevement = 'INSTITUT MONTSOURIS - 75014 PARIS', lieu_livraison = 'INSTITUT DE RECHERCHE ET DEV SERVIER - 91190 GIF', hash = 'eddb872d_institut_montsouris___75014_paris_instit' WHERE id = 'b04e303b-0d9b-4241-a135-ad98c4addf99';

-- JEAN VERDIER
UPDATE reference_courses SET lieu_enlevement = 'JEAN VERDIER - 93140 BONDY', lieu_livraison = 'QUINZE VINGT - 75012 PARIS', hash = '04186cf6_jean_verdier___93140_bondy_quinze_vingt_' WHERE id = '918c6e07-2d24-41f6-b121-929ee19b78d6';
UPDATE reference_courses SET lieu_enlevement = 'JEAN VERDIER - 93140 BONDY', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'f715454b_jean_verdier___93140_bondy_robert_debre_' WHERE id = 'bb99cf46-292e-4ace-821c-e0979e811a9d';
UPDATE reference_courses SET lieu_enlevement = 'JEAN VERDIER - 93140 BONDY', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '117bc716_jean_verdier___93140_bondy_robert_debre_' WHERE id = 'a96cce4c-f446-415d-908b-90332e5c6f1f';
UPDATE reference_courses SET lieu_enlevement = 'JEAN VERDIER - 93140 BONDY', lieu_livraison = 'ST ANTOINE', hash = '1b97e13c_jean_verdier___93140_bondy_st_antoine_2_' WHERE id = '1333268f-66b6-4bfb-bb8c-82107cf612d8';
UPDATE reference_courses SET lieu_enlevement = 'JEAN VERDIER - 93140 BONDY', lieu_livraison = 'TENON', hash = '4214a453_jean_verdier___93140_bondy_tenon_2_roues' WHERE id = '58501029-39df-4bcb-99e4-cb033f73c0c9';

-- JOFFRE DUPUYTREN
UPDATE reference_courses SET lieu_enlevement = 'JOFFRE DUPUYTREN - 91210 DRAVEIL', lieu_livraison = 'EVRY - 91000 EVRY', hash = '9d431668_joffre_dupuytren___91210_draveil_evry___' WHERE id = '56fbda2b-1d52-4ecc-b5ae-b58beaa5656f';
UPDATE reference_courses SET lieu_enlevement = 'JOFFRE DUPUYTREN - 91210 DRAVEIL', lieu_livraison = 'MONDOR - 94015 CRETEIL', hash = '3f4495a2_joffre_dupuytren___91210_draveil_mondor_' WHERE id = 'cb3c031e-b6e0-450c-9892-5b7aa915632d';
UPDATE reference_courses SET lieu_enlevement = 'JOFFRE DUPUYTREN - 91210 DRAVEIL', lieu_livraison = 'MONDOR - 94015 CRETEIL', hash = '77e819f4_joffre_dupuytren___91210_draveil_mondor_' WHERE id = '006c83aa-adf4-497a-8f91-2bc384309bdd';
UPDATE reference_courses SET lieu_enlevement = 'JOFFRE DUPUYTREN - 91210 DRAVEIL', lieu_livraison = 'MONDOR - 94015 CRETEIL', hash = '77e819f8_joffre_dupuytren___91210_draveil_mondor_' WHERE id = '1d068ef8-c70e-443f-b5f0-a34dcc8e644a';
UPDATE reference_courses SET lieu_enlevement = 'JOFFRE DUPUYTREN - 91210 DRAVEIL', lieu_livraison = 'MONDOR BIOCHIMIE - 94015 CRETEIL', hash = 'da51b487_joffre_dupuytren___91210_draveil_mondor_' WHERE id = '4ebbdc1c-a748-4c21-ba60-81384238de05';

-- La Pitié Salpêtrière
UPDATE reference_courses SET lieu_enlevement = 'La Pitié Salpêtrière - Bâtiment Montyon - 75013 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = 'd1afb5c0_la_piti__salp_tri_re___b_timent_montyon_' WHERE id = '11178b1e-a0a5-49c0-94ed-aa06f53efefc';

-- LA ROSERAIE
UPDATE reference_courses SET lieu_enlevement = 'LA ROSERAIE - 93330 NEUILLY SUR MARNE', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = 'f90e6478_la_roseraie___93330_neuilly_sur_marne_sa' WHERE id = '9acce136-304e-4065-877a-b5147f008804';

-- Laboratoire SEQOIA
UPDATE reference_courses SET lieu_enlevement = 'Laboratoire SEQOIA - 75014 PARIS', lieu_livraison = 'BICHAT', hash = '70c647a6_laboratoire_seqoia___75014_paris_bichat_' WHERE id = '9016b747-b037-469d-a42a-0e4f51534f17';

-- LARIBOISIERE
UPDATE reference_courses SET lieu_enlevement = 'LARIBOISIERE - 75009 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '2abdfa95_lariboisiere___75009_paris_robert_debre_' WHERE id = 'c09a10a8-3419-42f5-8a98-90216b9c8685';
UPDATE reference_courses SET lieu_enlevement = 'LARIBOISIERE - 75010 PARIS', lieu_livraison = 'NANTERRE', hash = '6a03b932_lariboisiere___75010_paris_nanterre_2_ro' WHERE id = '470aa2a3-2c4e-4229-bf2f-54c7abbe3bc0';
UPDATE reference_courses SET lieu_enlevement = 'LARIBOISIERE - 75010 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'b02d09bd_lariboisiere___75010_paris_robert_debre_' WHERE id = '80179188-10fa-425f-90ea-cb73873d1b61';

-- LOUIS MOURIER
UPDATE reference_courses SET lieu_enlevement = 'LOUIS MOURIER - 92750 COLOMBES', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = '6a761818_louis_mourier___92750_colombes_paul_brou' WHERE id = '459b07ed-10c3-4af3-a864-c866ab109605';
UPDATE reference_courses SET lieu_enlevement = 'LOUIS MOURIER - 92750 COLOMBES', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '5712cf88_louis_mourier___92750_colombes_robert_de' WHERE id = '6ad77d95-b4b0-4998-9b5e-aa6a6608f122';
UPDATE reference_courses SET lieu_enlevement = 'LOUIS MOURIER - 92750 COLOMBES', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '31c26139_louis_mourier___92750_colombes_robert_de' WHERE id = '3e9841a6-3081-4158-a404-a1233b82e987';
UPDATE reference_courses SET lieu_enlevement = 'LOUIS MOURIER - 92750 COLOMBES', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '7361d57c_louis_mourier___92750_colombes_robert_de' WHERE id = '9664e029-ef19-4e2f-943a-dea37ce35d32';

-- MAISON BLANCHE
UPDATE reference_courses SET lieu_enlevement = 'MAISON BLANCHE - 75010 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '1dcf0fa0_maison_blanche___75010_paris_sainte_anne' WHERE id = '083e13b0-96bf-4360-9066-fa4aff975b10';
UPDATE reference_courses SET lieu_enlevement = 'MAISON BLANCHE - 75018 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = 'cdbaafa8_maison_blanche___75018_paris_sainte_anne' WHERE id = '14d38a89-e003-440a-9b33-d34c2ed52cbd';
UPDATE reference_courses SET lieu_enlevement = 'MAISON BLANCHE - 75018 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '58eaee9d_maison_blanche___75018_paris_sainte_anne' WHERE id = '332bc72d-145a-4c95-bb7c-fb8bac626c78';
UPDATE reference_courses SET lieu_enlevement = 'MAISON BLANCHE - 75018 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '584388a7_maison_blanche___75018_paris_sainte_anne' WHERE id = '9366d512-67fb-433a-b262-cec3253b8ea7';
UPDATE reference_courses SET lieu_enlevement = 'MAISON BLANCHE - 75019 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '39040ba9_maison_blanche___75019_paris_sainte_anne' WHERE id = '29ea97c4-c962-43e0-a197-d400b874bad9';
UPDATE reference_courses SET lieu_enlevement = 'MAISON BLANCHE - 75020 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = 'd1393103_maison_blanche___75020_paris_sainte_anne' WHERE id = 'e38ee1b6-5761-498c-8784-3a4c463ca9d3';
UPDATE reference_courses SET lieu_enlevement = 'MAISON BLANCHE - 75020 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '3ab89fdf_maison_blanche___75020_paris_sainte_anne' WHERE id = '970d5933-9f03-404e-a721-62591c310f8c';

-- MARMOTANT
UPDATE reference_courses SET lieu_enlevement = 'MARMOTANT - 75017 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '2958ce8c_marmotant___75017_paris_sainte_anne___75' WHERE id = 'f12a62bb-05a4-4a8e-b8d1-f29ee386d24b';

-- MONDOR
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'HOPITAL PRIVE ARMAND BRILLARD', hash = '92c53e5f_mondor___94015_creteil_hopital_prive_arm' WHERE id = '1c841601-f339-4f62-96e6-69085b00fb08';
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'HOPITAL PRIVE ARMAND BRILLARD', hash = '590e3402_mondor___94015_creteil_hopital_prive_arm' WHERE id = '2a365472-9bd4-4bce-9125-0d6e7add2648';
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'HOPITAL PRIVE PAUL D EGINE', hash = '11c35d88_mondor___94015_creteil_hopital_prive_pau' WHERE id = '1ead6950-2dac-4449-938b-e5167a9e6dfb';
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'HOPITAL PRIVE PAUL D EGINE - 94500 CHAMPIGNY', hash = 'c5cc958e_mondor___94015_creteil_hopital_prive_pau' WHERE id = 'af6cff94-a43a-44a1-903b-f245f9f86fe1';
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'ec7f7015_mondor___94015_creteil_igr___94800_ville' WHERE id = '2a753cba-6d21-4ca8-9d4d-621b6df7ea35';
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '27debc7d_mondor___94015_creteil_robert_debre___75' WHERE id = '7b34bc72-4db8-410e-98fc-ce435fcd139b';
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = '4a68c34d_mondor___94015_creteil_rungis___94514_ru' WHERE id = '677a2325-3242-4194-aebb-55aa786656ad';
UPDATE reference_courses SET lieu_enlevement = 'MONDOR - 94015 CRETEIL', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = 'b8a311cb_mondor___94015_creteil_rungis___94514_ru' WHERE id = 'f994b2f6-f585-4658-89ee-3bb3cc1186dd';

-- NANTERRE
UPDATE reference_courses SET lieu_enlevement = 'NANTERRE - 92000 NANTERRE', lieu_livraison = 'HOPITAL SIMONE VEIL', hash = 'e45b706d_nanterre___92000_nanterre_hopital_simone' WHERE id = 'b6be0efd-619f-4869-87c7-c9279d176ba9';
UPDATE reference_courses SET lieu_enlevement = 'NANTERRE', lieu_livraison = 'CORENTIN CELTON - 92130 ISSY LES', hash = 'fe2d44f8_nanterre_corentin_celton___92130_issy_le' WHERE id = 'b9a7e278-5ee6-44cb-97a9-a83fe1257343';
UPDATE reference_courses SET lieu_enlevement = 'NANTERRE', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'db382339_nanterre_robert_debre___75019_paris_brea' WHERE id = '10caa219-5191-45f2-905c-5e48e32ebc5f';
UPDATE reference_courses SET lieu_enlevement = 'NANTERRE', lieu_livraison = 'SAINTE PERINE - 75016 PARIS', hash = '016e713f_nanterre_sainte_perine___75016_paris_bre' WHERE id = '284710d2-1bac-4267-a9f6-fdf033a8b98e';

-- NECKER
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = 'ec2ab166_necker___75015_paris_antoine_beclere___9' WHERE id = '97cb9944-14da-4d66-9843-cb87b4c6379e';
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'COCHIN', hash = 'e0f6a390_necker___75015_paris_cochin_2_roues_expr' WHERE id = '11f8b26d-aca7-425f-b024-050147c54911';
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'CORENTIN CELTON - 92130 ISSY LES', hash = '3f69444d_necker___75015_paris_corentin_celton___9' WHERE id = 'aec4d823-f1d9-453e-9957-4f3b18585e30';
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'INSTITUT CURIE', hash = '3e0cc6e4_necker___75015_paris_institut_curie_2_ro' WHERE id = '10fb49a4-05e1-4912-91f5-2ff644133490';
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'f0183896_necker___75015_paris_robert_debre___7501' WHERE id = '1db169f1-38b8-41b4-acc4-348f334bbb2a';
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'a9f1c283_necker___75015_paris_robert_debre___7501' WHERE id = 'aa1648ca-ac87-49c8-b636-874d499eb5ec';
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '8b101e63_necker___75015_paris_robert_debre___7501' WHERE id = '72e6d453-ab9c-4f38-8f33-145aa032ea1e';
UPDATE reference_courses SET lieu_enlevement = 'NECKER - 75015 PARIS', lieu_livraison = 'SAINTE ANNE - 75014 PARIS', hash = '7ee47113_necker___75015_paris_sainte_anne___75014' WHERE id = 'e451e85f-8fd5-4d71-98e1-b357ac1b4d04';

-- OCP
UPDATE reference_courses SET lieu_enlevement = 'OCP - 93400 ST OUEN', lieu_livraison = 'INSTITUT CURIE', hash = 'd5589b91_ocp___93400_st_ouen_institut_curie_2_rou' WHERE id = 'c4bc7d9b-deeb-455f-95e7-617d91dee387';

-- PAUL BROUSSE
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = '39af4720_paul_brousse___94800_villejuif_antoine_b' WHERE id = '7c6d6c9e-ea73-433b-b472-a898f756baeb';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'BICETRE - 94270 KREMLIN', hash = '21a5b8af_paul_brousse___94800_villejuif_bicetre__' WHERE id = 'e825c206-7e6f-4eba-b4b3-93c6788386fd';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'BICETRE - 94270 KREMLIN BICETRE/LE', hash = 'cfc2ef27_paul_brousse___94800_villejuif_bicetre__' WHERE id = '821c25ac-6feb-4cbc-908f-75963857e5f3';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'BICETRE - 94270 KREMLIN BICETRE/LE', hash = '2b9a7216_paul_brousse___94800_villejuif_bicetre__' WHERE id = '9b36cf45-ca1a-4d03-ac96-573334c9a797';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'BICETRE - 94270 KREMLIN BICETRE/LE', hash = '7adc92ca_paul_brousse___94800_villejuif_bicetre__' WHERE id = '6da81a4d-4abb-4c57-b36b-add9fcb28149';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'CHARLES FOIX - 94200 IVRY SUR SEINE', hash = 'c5307172_paul_brousse___94800_villejuif_charles_f' WHERE id = '150e9f8a-ed82-4ce0-a6ed-b9ce81011ff4';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'COCHIN - 75014 PARIS', hash = '7b03424c_paul_brousse___94800_villejuif_cochin___' WHERE id = '54bde82d-ab5e-4cf4-a98e-88a8f5f8f954';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'CTSA CLAMART - 92140 CLAMART', hash = '76fc46b9_paul_brousse___94800_villejuif_ctsa_clam' WHERE id = '4f41284d-c0a8-4575-abc2-2a11422711b6';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'HEGP - 75015 PARIS', hash = '42ea4a97_paul_brousse___94800_villejuif_hegp___75' WHERE id = '829784b8-aa63-4919-a615-9ee195ccbd85';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'INRAE /PLATEFORME SAMBO - 78350 JOUY EN JOSAS', hash = 'e8e14478_paul_brousse___94800_villejuif_inrae__pl' WHERE id = '0ce3b47a-c447-4d73-af9f-196fd422e149';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = '30488c72_paul_brousse___94800_villejuif_lariboisi' WHERE id = '1b2463b7-0558-484d-ad29-4fe3ad07670d';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'PITIE SALPETRIERE - 75013 PARIS', hash = 'bfbdcc1c_paul_brousse___94800_villejuif_pitie_sal' WHERE id = '0434a63a-e09f-46ed-a28c-44278cbb4b7a';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'PITIE SALPETRIERE - 75013 PARIS', hash = 'ef6cc9f9_paul_brousse___94800_villejuif_pitie_sal' WHERE id = '894fa663-b2c7-470a-95c4-1aecbf60fb44';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'PITIE SALPETRIERE - 75013 PARIS', hash = '4246a360_paul_brousse___94800_villejuif_pitie_sal' WHERE id = 'ac9fec6c-957f-47e6-9d31-76d6ed7df6f6';
UPDATE reference_courses SET lieu_enlevement = 'PAUL BROUSSE - 94800 VILLEJUIF', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'dfb6a7c9_paul_brousse___94800_villejuif_robert_de' WHERE id = 'df86764a-872c-440f-b690-9fbc71464b21';

-- PITIE SALPETRIERE
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'CLINIQUE GEOFFROY SAINT HILAIRE', hash = '7cadaab3_pitie_salpetriere___75013_paris_clinique' WHERE id = 'b67efe5f-e27d-4469-a3d1-a16120993536';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'COCHIN', hash = '9ef06280_pitie_salpetriere___75013_paris_cochin_2' WHERE id = '6aa46a80-1751-4956-bbd0-015385adf294';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'ce0415a4_pitie_salpetriere___75013_paris_igr___94' WHERE id = '0a801191-752d-4a06-9c9b-b57697e5e198';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '829bb007_pitie_salpetriere___75013_paris_igr___94' WHERE id = '31472593-ae2a-4a5a-abb3-9e96c79f5e3d';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '6ab36b33_pitie_salpetriere___75013_paris_igr___94' WHERE id = '7e5afa7a-acaa-4a3a-9556-ec1448490ad9';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'INSTITUT CURIE', hash = 'deac0781_pitie_salpetriere___75013_paris_institut' WHERE id = 'e275c849-0a76-40ad-be9e-656ae648673e';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'NECKER - 75015 PARIS', hash = '98d09a59_pitie_salpetriere___75013_paris_necker__' WHERE id = 'bd180c04-a9ed-4809-b92b-d2fdbb754260';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = '589039bc_pitie_salpetriere___75013_paris_paul_bro' WHERE id = '5abeb7c6-88fe-48fb-92d1-45498499ab03';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'PAUL BROUSSE - 94800 VILLEJUIF', hash = '781c4228_pitie_salpetriere___75013_paris_paul_bro' WHERE id = 'a3e94af2-fd80-470c-bd49-af77a3b72a07';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'c400f846_pitie_salpetriere___75013_paris_robert_d' WHERE id = '9b855168-2bac-4675-a7b0-de4c2bec4a78';
UPDATE reference_courses SET lieu_enlevement = 'PITIE SALPETRIERE - 75013 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '99da1473_pitie_salpetriere___75013_paris_robert_d' WHERE id = '10f1f023-e29f-4074-8cc5-448351b56e77';

-- PONTOISE
UPDATE reference_courses SET lieu_enlevement = 'PONTOISE - 95300 PONTOISE', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'a6fe4bb7_pontoise___95300_pontoise_igr___94800_vi' WHERE id = '895e43df-2b1e-45b7-972d-ada2914dbcce';
UPDATE reference_courses SET lieu_enlevement = 'PONTOISE - 95300 PONTOISE', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '7964eba3_pontoise___95300_pontoise_igr___94800_vi' WHERE id = '89aabf1c-de5c-4124-822e-311f58e10534';
UPDATE reference_courses SET lieu_enlevement = 'PONTOISE - 95300 PONTOISE', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = '6672cbef_pontoise___95300_pontoise_rungis___94514' WHERE id = 'bbc79251-cb9d-4ac8-b25a-6a28e7c7e2e0';
UPDATE reference_courses SET lieu_enlevement = 'PONTOISE', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'b75d32ab_pontoise_robert_debre___75019_paris_2_ro' WHERE id = '8fc2c8c5-2cac-4f6e-b541-4b70b51df074';

-- PORT ROYAL
UPDATE reference_courses SET lieu_enlevement = 'PORT ROYAL - 75014 PARIS', lieu_livraison = 'ST ANTOINE - 75012 PARIS', hash = '33908ec1_port_royal___75014_paris_st_antoine___75' WHERE id = '28c5d765-afc3-4ddc-b832-1480ea12070f';

-- QUINZE VINGT
UPDATE reference_courses SET lieu_enlevement = 'QUINZE VINGT - 75012 PARIS', lieu_livraison = 'CLINIQUE GEOFFROY SAINT HILAIRE - 75005 PARIS', hash = 'ad310b98_quinze_vingt___75012_paris_clinique_geof' WHERE id = 'c081afaf-8f2f-49bd-b01e-d94cb2056a5f';
UPDATE reference_courses SET lieu_enlevement = 'QUINZE VINGT - 75012 PARIS', lieu_livraison = 'CLINIQUE JOUVENET - 75016 PARIS', hash = 'b1777fdc_quinze_vingt___75012_paris_clinique_jouv' WHERE id = '78b85f36-23e2-49d5-b248-7055e5f97438';

-- RAYMOND POINCARE
UPDATE reference_courses SET lieu_enlevement = 'RAYMOND POINCARE - 92380 GARCHES', lieu_livraison = 'CHSF CORBEIL - 91100 CORBEIL ESSONNES', hash = 'df149701_raymond_poincare___92380_garches_chsf_co' WHERE id = '20ce6377-4bcc-481b-8e7f-0b7b4f442fea';

-- RENE MURET
UPDATE reference_courses SET lieu_enlevement = 'RENE MURET - 93270 SEVRAN', lieu_livraison = 'AVICENNE - 93000 BOBIGNY', hash = 'abb198cf_rene_muret___93270_sevran_avicenne___930' WHERE id = '27cc9903-2234-4794-9ac0-072c36328e12';
UPDATE reference_courses SET lieu_enlevement = 'RENE MURET - 93270 SEVRAN', lieu_livraison = 'AVICENNE - 93000 BOBIGNY', hash = 'abb198c8_rene_muret___93270_sevran_avicenne___930' WHERE id = 'ecb8d0ff-7853-41a0-88a3-8c8aedbc2b8a';
UPDATE reference_courses SET lieu_enlevement = 'RENE MURET - 93270 SEVRAN', lieu_livraison = 'AVICENNE - 93000 BOBIGNY', hash = 'c6b4c173_rene_muret___93270_sevran_avicenne___930' WHERE id = '8f86b366-00b2-4198-ad78-7df50e1216eb';
UPDATE reference_courses SET lieu_enlevement = 'RENE MURET - 93270 SEVRAN', lieu_livraison = 'AVICENNE - 93000 BOBIGNY', hash = 'c6b4c174_rene_muret___93270_sevran_avicenne___930' WHERE id = 'fd6eb2b1-0caa-41e9-9835-7e1f5197698e';
UPDATE reference_courses SET lieu_enlevement = 'RENE MURET - 93270 SEVRAN', lieu_livraison = 'ST-LOUIS - 75010 PARIS', hash = '3f84e752_rene_muret___93270_sevran_st_louis___750' WHERE id = '41594398-f803-4a24-a162-a3ebdd993520';

-- ROBERT DEBRE
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = '7e609567_robert_debre___75019_paris_antoine_becle' WHERE id = '4891a82e-ce72-4244-b966-8e4c4b0c1445';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = '8f190b53_robert_debre___75019_paris_antoine_becle' WHERE id = 'f71d747e-6449-42e8-8f55-c85775ae1dbb';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'AVICENNE - 93000 BOBIGNY', hash = 'b9b97b71_robert_debre___75019_paris_avicenne___93' WHERE id = '072abaea-2eb7-4dc4-a973-270c8c646fb1';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'BICETRE - 94270 KREMLIN BICETRE/LE', hash = 'e97542e6_robert_debre___75019_paris_bicetre___942' WHERE id = '2f062447-aea2-4e8e-9ff1-381d6636f680';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'CH FRANCOIS QUESNAY - 78200 MANTES LA JOLIE', hash = '3232b513_robert_debre___75019_paris_ch_francois_q' WHERE id = '16ccd3e6-b3d6-4118-b7a4-745559b49b47';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'COCHIN - 75013 PARIS', hash = 'f7d1e124_robert_debre___75019_paris_cochin___7501' WHERE id = 'ac4c008d-5b45-4c61-851a-71479d6e5e53';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'FOCH - 92150 SURESNES', hash = '7ba6dcc5_robert_debre___75019_paris_foch___92150_' WHERE id = '50218597-c66c-4bd6-a871-a98f2b688384';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'FOCH - 92150 SURESNES', hash = 'c46021f0_robert_debre___75019_paris_foch___92150_' WHERE id = '11ca2b79-33e3-4126-8006-576a43d1c90a';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'HAD - 94220 CHARENTON LE PONT', hash = 'f1b159d8_robert_debre___75019_paris_had___94220_c' WHERE id = '43bb6248-f139-4b72-854e-33f22f11806c';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'INSTITUT CURIE', hash = 'b5c50454_robert_debre___75019_paris_institut_curi' WHERE id = '53ec5394-42f3-4d39-8a28-e7ad256f34e5';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = '7a081bdd_robert_debre___75019_paris_lariboisiere_' WHERE id = 'e9a2eaac-9799-48c9-9e69-957cb657df4f';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'LOUIS MOURIER', hash = 'f4538afb_robert_debre___75019_paris_louis_mourier' WHERE id = 'd7fbbb8a-1fd1-4348-aecd-80f3a453556e';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'LOUIS MOURIER - 92750 COLOMBES', hash = 'db4ee7e8_robert_debre___75019_paris_louis_mourier' WHERE id = '1aa34bc7-a9f3-43c9-ba02-2005e582a823';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'MONDOR - 94015 CRETEIL', hash = '4d896669_robert_debre___75019_paris_mondor___9401' WHERE id = 'e49ac359-a8db-4776-a9dd-b3d24eeb87b8';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'PONTOISE - 95300 PONTOISE', hash = '4e8c033e_robert_debre___75019_paris_pontoise___95' WHERE id = 'ab3c9549-15fc-4e66-9797-6eb3e08d39c7';
UPDATE reference_courses SET lieu_enlevement = 'ROBERT DEBRE - 75019 PARIS', lieu_livraison = 'SAINTE PERINE - 75016 PARIS', hash = 'faa6c680_robert_debre___75019_paris_sainte_perine' WHERE id = '1f6ed6f9-e28f-487b-9d67-ff3dc7efd21f';

-- RUNGIS
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94150 RUNGIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'ec321fe6_rungis___94150_rungis_igr___94800_villej' WHERE id = '6f84af83-f562-421f-a988-2c4d9c1305f6';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'AVICENNE - 93000 BOBIGNY', hash = 'a4643ed5_rungis___94514_rungis_avicenne___93000_b' WHERE id = 'e292e085-e131-43af-9d31-8466c7e95e28';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'AVICENNE - 93000 BOBIGNY', hash = '8ef13a53_rungis___94514_rungis_avicenne___93000_b' WHERE id = '27b364f5-7b3a-448f-a17b-2890fd3f12b3';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'CAMPUS EFS - 93200 ST DENIS', hash = '2d62b7a2_rungis___94514_rungis_campus_efs___93200' WHERE id = '45adb6e5-cf9e-4398-b021-a0ecc0f87a5a';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'CAMPUS EFS - 93200 ST DENIS', hash = '2d62b7a1_rungis___94514_rungis_campus_efs___93200' WHERE id = 'c98f8ce4-aa6c-4587-a5dd-7756b5ee873f';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'INSTITUT CURIE', hash = '03128ede_rungis___94514_rungis_institut_curie_2_r' WHERE id = 'bee38eda-6578-4fa0-8139-760d2af7ea38';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'PONTOISE - 95300 PONTOISE', hash = 'a3ceb6a9_rungis___94514_rungis_pontoise___95300_p' WHERE id = 'd02a5b97-2323-4bfe-b7cd-1bdd68e17eae';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '758c876c_rungis___94514_rungis_robert_debre___750' WHERE id = '4f51bbc5-f027-4f8a-a568-48119249b56a';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'VERSAILLES - 78150 CHESNAY LE', hash = '39c888a5_rungis___94514_rungis_versailles___78150' WHERE id = '8a161a6d-194d-4f82-98ff-e7b4016a5581';
UPDATE reference_courses SET lieu_enlevement = 'RUNGIS - 94514 RUNGIS', lieu_livraison = 'VERSAILLES - 78150 CHESNAY LE', hash = 'f0f3f3e4_rungis___94514_rungis_versailles___78150' WHERE id = 'd61584a9-a0ce-46bb-8345-1cf620617e53';

-- SAINTE ANNE
UPDATE reference_courses SET lieu_enlevement = 'SAINTE ANNE - 75014 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '8582e291_sainte_anne___75014_paris_gcs_seqoia___7' WHERE id = '21a47d7a-eb0e-40b5-9762-e7d210d079a9';
UPDATE reference_courses SET lieu_enlevement = 'SAINTE ANNE - 75014 PARIS', lieu_livraison = 'Laboratoire SEQOIA - 75014 PARIS', hash = '20903dd0_sainte_anne___75014_paris_laboratoire_se' WHERE id = 'f06610a6-cbe3-4ac6-8b82-a5c74fdf3917';

-- SAINTE PERINE
UPDATE reference_courses SET lieu_enlevement = 'SAINTE PERINE - 75016 PARIS', lieu_livraison = 'AMBROISE PARE - 92100 BOULOGNE', hash = '0e11c3f9_sainte_perine___75016_paris_ambroise_par' WHERE id = 'bff660af-07aa-44fd-8a33-41b478098449';
UPDATE reference_courses SET lieu_enlevement = 'SAINTE PERINE - 75016 PARIS', lieu_livraison = 'AMBROISE PARE - 92100 BOULOGNE BILLANCOURT', hash = 'c8f39db1_sainte_perine___75016_paris_ambroise_par' WHERE id = 'dc47a8d4-2c8b-4cdb-8d9f-ce6c4729a805';
UPDATE reference_courses SET lieu_enlevement = 'SAINTE PERINE - 75016 PARIS', lieu_livraison = 'AMBROISE PARE - 92100 BOULOGNE BILLANCOURT', hash = 'd0416f6d_sainte_perine___75016_paris_ambroise_par' WHERE id = 'f0e0349e-dd9a-4b24-a006-02e3e41a3233';
UPDATE reference_courses SET lieu_enlevement = 'SAINTE PERINE - 75016 PARIS', lieu_livraison = 'HEGP - 75015 PARIS', hash = 'cae12b5e_sainte_perine___75016_paris_hegp___75015' WHERE id = '6f049b2f-734a-4812-9d1b-80948a275beb';

-- SCIENCES POLITIQUE
UPDATE reference_courses SET lieu_enlevement = 'SCIENCES POLITIQUE - 75007 PARIS', lieu_livraison = 'HOTEL DIEU - 75004 PARIS', hash = '79066ad6_sciences_politique___75007_paris_hotel_d' WHERE id = 'b08c8f3d-ed92-46d1-ba73-086a36c31196';

-- ST ANTOINE
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = 'f3b4c095_st_antoine___75012_paris_antoine_beclere' WHERE id = '969793b2-0c31-40b6-a1d4-0c700bc3e259';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = '673d9586_st_antoine___75012_paris_gcs_seqoia___75' WHERE id = 'af53ad93-5636-4b2d-8125-b5e3759ac635';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'baffbf80_st_antoine___75012_paris_igr___94800_vil' WHERE id = '2342e77a-aedb-4d5b-a526-e1bf6b219bc9';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = 'ae54dcd4_st_antoine___75012_paris_igr___94800_vil' WHERE id = '52c3e4c6-ef97-4fea-86d3-363d9adb5288';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '32ae3894_st_antoine___75012_paris_robert_debre___' WHERE id = '134d7d77-d745-4278-a056-e625a4df5121';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'a0413ac1_st_antoine___75012_paris_robert_debre___' WHERE id = 'bacef41a-9860-4d98-b72b-e8c9b58bdb8a';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = '78840cde_st_antoine___75012_paris_rungis___94514_' WHERE id = '358d2335-7966-4a75-8add-8bf9c2425f7a';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = 'e2ba9713_st_antoine___75012_paris_rungis___94514_' WHERE id = 'be49188f-3219-4126-86c5-263da7364963';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = '72ed214a_st_antoine___75012_paris_rungis___94514_' WHERE id = 'ad5d27cd-758b-4478-a4be-3d79b46e8f90';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'U.I.T.C - 94015 CRETEIL', hash = 'b5ccb3b9_st_antoine___75012_paris_u_i_t_c___94015' WHERE id = '5c3b5507-ad26-49a8-9621-4b7b89c4f82e';
UPDATE reference_courses SET lieu_enlevement = 'ST ANTOINE - 75012 PARIS', lieu_livraison = 'U.I.T.C - 94015 CRETEIL', hash = 'be6e8d3f_st_antoine___75012_paris_u_i_t_c___94015' WHERE id = 'fa6b8040-f07d-41f7-94b6-d3ec2be0fce4';

-- ST-LOUIS
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'FOCH', hash = 'c30896bf_st_louis___75010_paris_foch_2_roues_expr' WHERE id = 'ad50ad11-99ca-4a4a-9780-192f86155092';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = 'aa096333_st_louis___75010_paris_gcs_seqoia___7501' WHERE id = '28a87fc5-5d43-46c5-94bd-5316cefcaf5e';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'INSTITUT CURIE', hash = 'dd5ae689_st_louis___75010_paris_institut_curie_2_' WHERE id = 'ab37ad36-ac57-4e55-9920-6d02a4a84810';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'INSTITUT PASTEUR - 75015 PARIS', hash = '2125198d_st_louis___75010_paris_institut_pasteur_' WHERE id = '4d5947ce-245b-4082-ae20-b381c363fe79';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'LARIBOISIERE', hash = '635aa55d_st_louis___75010_paris_lariboisiere_2_ro' WHERE id = 'a62531e3-6207-461f-90d0-3e3b6ca9d1f1';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'MONDOR', hash = '78724a0e_st_louis___75010_paris_mondor_2_roues_ex' WHERE id = '4aa7f4e7-5309-487c-9ffc-214086cf03a8';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'PITIE SALPETRIERE', hash = '4e90f8f0_st_louis___75010_paris_pitie_salpetriere' WHERE id = 'e905647d-569a-4890-901c-c60ee0a60291';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'RAYMOND POINCARE', hash = '4be48f54_st_louis___75010_paris_raymond_poincare_' WHERE id = '7e9e5a6a-a8eb-453c-9f21-f7ed103be033';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'ROBERT DEBRE - 75010 PARIS', hash = '558e3b68_st_louis___75010_paris_robert_debre___75' WHERE id = '4de3bb79-6d12-4839-9e41-17eef3a5fce3';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '125b66a1_st_louis___75010_paris_robert_debre___75' WHERE id = '74d5df26-c0f4-4414-940e-8e283d908827';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'fc940ad4_st_louis___75010_paris_robert_debre___75' WHERE id = 'e6cb5d6f-9c50-4f1f-946b-94d81017948c';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '3edfbee8_st_louis___75010_paris_robert_debre___75' WHERE id = '1479fc56-1443-4543-9060-f2562181e786';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = '55034a4b_st_louis___75010_paris_rungis___94514_ru' WHERE id = 'b16d3470-7d39-4f1a-8859-6433900f2a21';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = 'cac971ff_st_louis___75010_paris_rungis___94514_ru' WHERE id = 'a91ae741-3566-4b38-a96e-29eda2f4a3dd';
UPDATE reference_courses SET lieu_enlevement = 'ST-LOUIS - 75010 PARIS', lieu_livraison = 'RUNGIS - 94514 RUNGIS', hash = '7fb91bcd_st_louis___75010_paris_rungis___94514_ru' WHERE id = 'd870da52-5a78-4d69-9bff-55a4f4c1e879';

-- TENON
UPDATE reference_courses SET lieu_enlevement = 'TENON - 75020 PARIS', lieu_livraison = 'CHARLES FOIX - 94200 IVRY SUR SEINE', hash = 'bd03e03a_tenon___75020_paris_charles_foix___94200' WHERE id = '4d7e8029-fdfa-47ba-8a39-2b087ec1e0b9';
UPDATE reference_courses SET lieu_enlevement = 'TENON - 75020 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = 'de3ed4a0_tenon___75020_paris_lariboisiere___75010' WHERE id = 'bc795c0a-8c15-4c69-9849-960107b3311b';
UPDATE reference_courses SET lieu_enlevement = 'TENON - 75020 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'fbe9987a_tenon___75020_paris_robert_debre___75019' WHERE id = 'e0f664cd-d972-43f2-ac81-d83fcc48084e';

-- TOURET MEDICAL
UPDATE reference_courses SET lieu_enlevement = 'TOURET MEDICAL - 92110 CLICHY', lieu_livraison = 'CLINIQUE DES FRANCISCAINES', hash = '94998d7f_touret_medical___92110_clichy_clinique_d' WHERE id = '083a93d9-0b47-4282-a45f-0089e223a431';

-- TRINITE
UPDATE reference_courses SET lieu_enlevement = 'TRINITE - 75009 PARIS', lieu_livraison = 'INSTITUT CURIE', hash = 'f28f9271_trinite___75009_paris_institut_curie_bre' WHERE id = '17a4ab02-50df-4385-aa01-5314552dc123';
UPDATE reference_courses SET lieu_enlevement = 'TRINITE - 75009 PARIS', lieu_livraison = 'RARECELLS - 75015 PARIS', hash = '6e80f0ff_trinite___75009_paris_rarecells___75015_' WHERE id = 'f7feb6d4-a7df-468b-9782-20d907144ff3';
UPDATE reference_courses SET lieu_enlevement = 'TRINITE - 75009 PARIS', lieu_livraison = 'VERSAILLES', hash = 'f1362673_trinite___75009_paris_versailles_2_roues' WHERE id = '3417614f-e0bf-4df2-bb19-2adb79e35485';

-- TROUSSEAU
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'GCS SEQOIA - 75014 PARIS', hash = 'cf086f3a_trousseau___75012_paris_gcs_seqoia___750' WHERE id = '8c437a82-c1b5-4896-b9e5-957a1867886e';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'IGR - 94800 VILLEJUIF', hash = '6d136f7c_trousseau___75012_paris_igr___94800_vill' WHERE id = 'fee9cee8-6daf-421c-9d3c-0fb292023fe2';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'INSTITUT CURIE - 75005 PARIS', hash = '97365eb9_trousseau___75012_paris_institut_curie__' WHERE id = 'f3eb89dc-3c4d-4847-9181-4a70d9d337c3';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'INSTITUT PASTEUR - 75015 PARIS', hash = '6b2586c4_trousseau___75012_paris_institut_pasteur' WHERE id = '8a981373-77dd-472c-8f30-e9f72cfbdf77';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'LARIBOISIERE - 75010 PARIS', hash = '21ad6c0f_trousseau___75012_paris_lariboisiere___7' WHERE id = 'cf5030e3-74d8-4e27-9854-c4ac9e42f31b';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'RAYMOND POINCARE', hash = 'fb67c769_trousseau___75012_paris_raymond_poincare' WHERE id = '39a2fa48-9195-4ecc-b46c-65968b89a64f';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = '00237da8_trousseau___75012_paris_robert_debre___7' WHERE id = '484feaac-aee2-4c3b-b985-3afe89e69254';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'ROBERT DEBRE - 75019 PARIS', hash = 'de31e9bd_trousseau___75012_paris_robert_debre___7' WHERE id = '2134beb5-f614-46d8-ad23-aca1765ee9b2';
UPDATE reference_courses SET lieu_enlevement = 'TROUSSEAU - 75012 PARIS', lieu_livraison = 'ST ANTOINE', hash = 'ed5fc86a_trousseau___75012_paris_st_antoine_2_rou' WHERE id = '9ca0ccf2-766c-41a3-8a7f-d0ac6b14d299';

-- U.I.T.C
UPDATE reference_courses SET lieu_enlevement = 'U.I.T.C - 94015 CRETEIL', lieu_livraison = 'ST ANTOINE', hash = '164644da_u_i_t_c___94015_creteil_st_antoine_2_rou' WHERE id = 'c03e1dbf-0f46-4d8b-8cbd-e8b81acff2bc';
UPDATE reference_courses SET lieu_enlevement = 'U.I.T.C - 94015 CRETEIL', lieu_livraison = 'ST ANTOINE - 75012 PARIS', hash = 'bd1c71eb_u_i_t_c___94015_creteil_st_antoine___750' WHERE id = '5183d9b6-e735-4d9c-a45e-b05a0caed37c';
UPDATE reference_courses SET lieu_enlevement = 'U.I.T.C - 94015 CRETEIL', lieu_livraison = 'TENON - 75020 PARIS', hash = '8d995c57_u_i_t_c___94015_creteil_tenon___75020_pa' WHERE id = 'bfdd811a-246e-4839-91bc-7fcf826f16a0';

-- VERSAILLES
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78000 VERSAILLES', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = '7203f9b1_versailles___78000_versailles_antoine_be' WHERE id = '8c1cbd34-91a6-46f6-86b5-4c36b0e1d2ab';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78000 VERSAILLES', lieu_livraison = 'CLINIQUE DES FRANCISCAINES', hash = '07f1559f_versailles___78000_versailles_clinique_d' WHERE id = '94a9b2ec-42ae-486a-86bb-e71398d27085';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78000 VERSAILLES', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = 'c51498f4_versailles___78000_versailles_hopital_pr' WHERE id = 'd6198755-234e-4c3e-90bb-08927e6a23d1';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78000 VERSAILLES', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = 'c9cf4368_versailles___78000_versailles_hopital_pr' WHERE id = '093feea1-2dd2-4e77-bfda-f5ba01639a16';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78000 VERSAILLES', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = '8bd69d99_versailles___78000_versailles_hopital_pr' WHERE id = 'b1bc7f52-b73f-4740-92cc-13a8b367dc66';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78000 VERSAILLES', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = '56837931_versailles___78000_versailles_hopital_pr' WHERE id = '150e0766-4ac5-4d0e-9250-27002e0a7530';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78000 VERSAILLES', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = '2638d8e1_versailles___78000_versailles_hopital_pr' WHERE id = 'e810ff87-b99c-4f8a-babd-1d7593094e7c';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78150 CHESNAY LE', lieu_livraison = 'ANTOINE BECLERE - 92140 CLAMART', hash = '74884c4f_versailles___78150_chesnay_le_antoine_be' WHERE id = '5f8d046d-3fa8-4467-9f4e-25f07cf3fd54';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78150 CHESNAY LE', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = '4cbf00a7_versailles___78150_chesnay_le_hopital_pr' WHERE id = '4dac57cc-b87e-42a1-b907-fcdf032c4172';
UPDATE reference_courses SET lieu_enlevement = 'VERSAILLES - 78150 CHESNAY LE', lieu_livraison = 'HOPITAL PRIVE DE L OUEST PARISIEN', hash = 'cc05c9be_versailles___78150_chesnay_le_hopital_pr' WHERE id = '2aa23ea2-18fe-42bf-bb9f-2b691369e181';

COMMIT;

-- Vérification après migration:
-- SELECT COUNT(*) FROM reference_courses;  -- devrait retourner NaN
