 README - MobAuditFlow

Plateforme d’Audit Automatisé Mobile basée sur OWASP MASVS / MASTG et Intelligence Artificielle
===============================================================================================

MobAuditFlow
------------

* * *

<img width="1194" height="687" alt="overview-banner" src="https://github.com/user-attachments/assets/af4819b9-d3f8-47ac-aa30-e07ef5526c80" />


* * *

1\. Présentation Générale du Projet
-----------------------------------

MobAuditFlow est une plateforme intelligente d’automatisation des audits de sécurité des applications mobiles Android.

La plateforme combine plusieurs technologies modernes afin de transformer des résultats techniques bruts en rapports de sécurité contextualisés et exploitables.

Le système repose principalement sur :

*   OWASP MASVS ;
*   OWASP MASTG ;
*   MobSF ;
*   n8n ;
*   Ollama ;
*   Gemini API ;
*   ChromaDB ;
*   Docker ;
*   Gotenberg.

L’objectif principal du projet est d’automatiser les tâches répétitives des audits de sécurité mobile.

La plateforme agit comme un pipeline intelligent capable de :

*   Analyser des APK Android ;
*   Interpréter les résultats MobSF ;
*   Effectuer un mapping MASVS ;
*   Générer automatiquement des recommandations ;
*   Produire des rapports PDF professionnels ;
*   Envoyer automatiquement les rapports.

* * *

2\. Contexte du Projet
----------------------

Les audits de sécurité mobiles sont généralement longs et complexes.

Les auditeurs doivent analyser manuellement :

*   Le manifest Android ;
*   Les permissions ;
*   Les endpoints réseau ;
*   Les certificats ;
*   Le code Java/Kotlin ;
*   Les bibliothèques natives ;
*   Les mécanismes anti-debug ;
*   Les systèmes anti-root ;
*   Les configurations de sécurité.

Cette charge de travail est souvent répétitive et chronophage.

MobAuditFlow a été conçu afin de réduire cette charge grâce à :

*   L’automatisation ;
*   L’intelligence artificielle ;
*   Le RAG ;
*   Les workflows low-code ;
*   L’orchestration distribuée.

* * *

3\. Objectifs du Projet
-----------------------

### 3.1 Objectifs Fonctionnels

*   Réception automatique des fichiers JSON MobSF ;
*   Analyse automatique des findings ;
*   Classification MASVS ;
*   Réduction des faux positifs ;
*   Génération des recommandations ;
*   Génération automatique des rapports ;
*   Envoi automatique par email.

### 3.2 Objectifs Techniques

*   Architecture distribuée ;
*   Pipeline IA multi-agents ;
*   IA locale via Ollama ;
*   Architecture RAG ;
*   Scalabilité ;
*   Isolation Docker ;
*   Automatisation complète.

* * *

4\. Architecture Générale
-------------------------

L’architecture suit un modèle modulaire.

Chaque composant possède une responsabilité spécifique.

<img width="2655" height="1214" alt="general-architecture" src="https://github.com/user-attachments/assets/b43b19b4-8310-43ca-9912-f5e1a04ac3ed" />


Figure 1 — Architecture générale de la plateforme MobAuditFlow.

* * *

5\. Description des Composants
------------------------------

| Composant | Description |
|---|---|
| **MobSF** | Analyse statique et dynamique des APK Android. |
| **n8n** | Orchestration complète des workflows. |
| **Ollama** | Exécution locale des modèles IA. |
| **Gemini API** | Analyse IA distante. |
| **ChromaDB** | Base vectorielle utilisée pour le RAG. |
| **Docker** | Conteneurisation des services. |
| **Gotenberg** | Conversion HTML vers PDF. |
| **Google Drive** | Point d’entrée des analyses. |

6\. Workflow Global du Système
------------------------------

```text
APK Upload
    ↓
MobSF Analysis
    ↓
JSON Export
    ↓
Google Drive Trigger
    ↓
n8n Workflow
    ↓
JavaScript Parsing
    ↓
AI Multi-Agents
    ↓
RAG MASVS Lookup
    ↓
Merge Results
    ↓
HTML Report
    ↓
PDF Conversion
    ↓
Email Delivery
```

* * *

7\. Workflow Principal n8n
--------------------------

Le workflow n8n constitue le cerveau opérationnel de la plateforme.

<img width="1408" height="768" alt="n8n-main-workflow" src="https://github.com/user-attachments/assets/b9c6e565-7d6c-49dc-9da9-abdc6bc7e631" />


Figure 2 — Workflow principal n8n.

* * *

8\. Déclenchement Automatique via Google Drive
----------------------------------------------

Le workflow démarre automatiquement lorsqu’un nouveau fichier JSON MobSF est détecté.

<img width="2782" height="1401" alt="n8n-drive-trigger" src="https://github.com/user-attachments/assets/e74178cc-50c7-4d46-81ff-d1bf457266c0" />

Figure 3 — Déclencheur Google Drive.

* * *

9\. Parsing et Nettoyage des Données
------------------------------------

Un nœud JavaScript spécialisé permet :

*   La suppression des doublons ;
*   Le filtrage des findings ;
*   La réduction du bruit ;
*   La normalisation JSON ;
*   La préparation des prompts IA.

<img width="2790" height="1406" alt="n8n-js-parser" src="https://github.com/user-attachments/assets/9fb09fe8-12f9-44d8-85e7-973d8194fffa" />

Figure 4 — Nœud JavaScript de parsing.

* * *

10\. Architecture Multi-Agents IA
---------------------------------

La plateforme utilise plusieurs agents IA spécialisés.

| Agent | Responsabilité |
|---|---|
| **Manifest Agent** | Analyse `AndroidManifest.xml`. |
| **API Agent** | Analyse réseau et endpoints. |
| **Reverse Agent** | Analyse reverse engineering. |
| **MASVS Agent** | Classification MASVS. |
| **Ollama Agent** | Analyse locale. |
* * *

11\. Agent Gemini
-----------------

<img width="2796" height="1399" alt="n8n-gemini-agent" src="https://github.com/user-attachments/assets/45fb32f7-e68f-4950-b1e0-4b0735e170e2" />

Figure 5 — Agent Gemini utilisé pour l’analyse contextuelle.

* * *

12\. Agent Ollama Local
-----------------------

<img width="2791" height="1416" alt="n8n-ollama-node" src="https://github.com/user-attachments/assets/abe1980a-ee80-4b8e-a628-1725554ec525" />

Figure 6 — Nœud Ollama local.

* * *

13\. Synchronisation des Agents
-------------------------------

Les réponses des agents IA sont synchronisées via un nœud Merge.

Configuration critique :

Wait for all inputs to arrive

<img width="2794" height="1413" alt="n8n-merge-node" src="https://github.com/user-attachments/assets/f4d37cfe-0162-4f01-9ac7-afe89cf1690a" />

Figure 7 — Nœud Merge de synchronisation.

* * *

14\. Architecture RAG
---------------------

Le système utilise une architecture Retrieval-Augmented Generation.

Les documents OWASP sont indexés dans ChromaDB.

### 14.1 Pipeline RAG

*   Téléchargement des documents ;
*   Découpage des chunks ;
*   Création des embeddings ;
*   Stockage vectoriel ;
*   Recherche par similarité ;
*   Injection dans les prompts.

### 14.2 Embeddings Utilisés

nomic-embed-text
mxbai-embed-large

* * *

15\. Réponse IA Enrichie
------------------------

<img width="875" height="1129" alt="ai-masvs-response" src="https://github.com/user-attachments/assets/4afa775d-5177-4d2a-ba69-bbbf79119758" />

Figure 8 — Réponse IA enrichie avec références MASVS.

* * *

16\. Réduction des Faux Positifs
--------------------------------

MobSF génère souvent des findings non pertinents.

L’IA aide à :

*   Corréler les findings ;
*   Éliminer les doublons ;
*   Réduire les faux positifs ;
*   Prioriser les risques.

* * *

| Critère | Poids |
|---|---|
| **Criticité MobSF** | 40% |
| **Impact métier** | 25% |
| **Exploitabilité** | 20% |
| **Mapping MASVS** | 15% |

* * *

18\. Dockerisation
------------------

L’ensemble des composants est conteneurisé.

<img width="1880" height="272" alt="docker-containers" src="https://github.com/user-attachments/assets/569c4c0d-3492-4e8d-b775-b498d865171f" />

Figure 9 — Conteneurs Docker actifs.

* * *

19\. Exemple Docker Compose
---------------------------

| Service | Image Docker | Description |
|---|---|---|
| **n8n** | `n8nio/n8n` | Plateforme d’automatisation et d’orchestration des workflows. |
| **ollama** | `ollama/ollama` | Exécution locale des modèles d’intelligence artificielle. |
| **chromadb** | `chromadb/chroma` | Base vectorielle utilisée pour le système RAG. |
| **gotenberg** | `gotenberg/gotenberg` | Conversion des rapports HTML en fichiers PDF. |

* * *

20\. Analyse MobSF
------------------

MobSF constitue le moteur principal d’analyse statique.

<img width="2843" height="1524" alt="mobsf-dashboard" src="https://github.com/user-attachments/assets/18d4e2e8-5f38-48a2-aaf2-87a61efe221c" />

Figure 10 — Dashboard MobSF.

* * *

21\. Vulnérabilités Détectées
-----------------------------

*   Hardcoded Secrets ;
*   Weak Cryptography ;
*   Root Detection ;
*   Debug Detection ;
*   Certificate Validation Issues ;
*   Insecure Storage ;
*   Cleartext Traffic ;
*   Reverse Engineering Exposure.

* * *

22\. Réponses JSON
------------------

Les résultats MobSF sont traités sous forme JSON.

```json
{
  "title": "Hardcoded API Key",
  "severity": "high",
  "masvs": "MASVS-STORAGE-1"
}
```
* * *

23\. Génération Automatique des Rapports
----------------------------------------

Le système génère automatiquement des rapports HTML puis PDF.

### 23.1 Couverture du Rapport

<img width="1583" height="1267" alt="report-cover-page" src="https://github.com/user-attachments/assets/6b976f3f-cbab-4818-adc1-92b120399f37" />

Figure 11 — Couverture du rapport.

### 23.2 Executive Summary

<img width="1289" height="1228" alt="report-executive-summary" src="https://github.com/user-attachments/assets/114e4197-a5fe-41c1-8dc0-e0396f90b683" />

Figure 12 — Résumé exécutif.

### 23.3 Détails des Vulnérabilités

<img width="1357" height="1314" alt="report-vulnerability-detail" src="https://github.com/user-attachments/assets/70226960-533c-413d-93ea-c7a63aee190b" />

Figure 13 — Détails des vulnérabilités.

* * *

24\. Envoi Automatique des Emails
---------------------------------

Le rapport final est automatiquement envoyé par email.

<img width="2730" height="1510" alt="automated-email-report" src="https://github.com/user-attachments/assets/e5929bfc-2cbb-4180-ac70-354c8733e4a4" />

Figure 14 — Email automatique contenant le rapport PDF.

* * *

25\. Cas d’Étude : OWASP UnCrackable-Level2
-------------------------------------------

Plusieurs APK vulnérables ont été utilisés.

Le principal APK testé est :

OWASP UnCrackable-Level2

### 25.1 Vulnérabilités Observées

*   Root Detection ;
*   Debug Detection ;
*   Hardcoded Secrets ;
*   Weak Cryptography ;
*   Anti-Tampering ;
*   Reverse Engineering Exposure.

* * *

26\. Reverse Engineering
------------------------

Le reverse engineering est effectué via JADX.

Les analyses permettent :

*   L’extraction du code ;
*   L’analyse des secrets ;
*   L’identification des protections ;
*   L’étude des mécanismes anti-debug.

* * *

* * *

27. Interface Application Web (Web App Dashboard)
--------------------------------------------------

Pour démocratiser l'accès au pipeline d'audit et offrir une expérience utilisateur moderne et fluide, **MobAuditFlow** intègre une application web (Frontend) au design épuré *Cybersecurity-ready*. Conçue en mode sombre, cette interface unifiée sert de tour de contrôle asynchrone permettant aux auditeurs et aux développeurs d'interagir directement avec la plateforme sans aucune manipulation de scripts en ligne de commande.

### 27.1 Architecture et Cinématique des Données

L'application web ne se contente pas d'être une simple vitrine graphique ; elle agit comme un client réactif synchronisé par événements avec le serveur d'orchestration n8n.
[Utilisateur] --- (Dépose l'APK) ---> [Frontend Dropzone]
|
(Requête POST HTTP)
v
[Dashboard Live] <-- (Callback State) <-- [Webhook n8n]
Lorsqu'une analyse est lancée, l'interface orchestre les flux suivants :
1. **Payload Transmission :** Le fichier binaire `.apk` est intercepté par le client et poussé de manière sécurisée vers l'infrastructure de stockage (Google Drive API).
2. **Session Initialization :** Un identifiant unique de session de scan (UUID) est généré en corrélation directe avec l'ID d'exécution du workflow n8n.
3. **Event Polling / Callbacks :** Le frontend se met à l'écoute des points d'entrée (Webhooks) de n8n. À chaque fois qu'un agent IA ou qu'un scanner termine une sous-tâche, le backend émet un événement `POST update-status` intercepté dynamiquement par le tableau de bord.

### 27.2 Fonctionnalités Principales détaillées

* **Zone de Dépôt Intuitive (Drag & Drop UI) :** Une zone de téléversement réactive dotée de contrôles de types de fichiers. Elle rejette instantanément les extensions non conformes à la volée et passe au statut visuel « Prêt à scanner » dès la validation du binaire Android.
* **Pipeline de Suivi Granulaire :** Une barre de progression globale (`25%`, `50%`, `75%`, `100%`) couplée à un suivi de statut pas-à-pas pour isoler l'état de chaque composant du pipeline :
  * `Upload APK` : Suivi du transfert initial vers l'environnement d'automatisation.
  * `MobSF Scanner` : Phase d'analyse statique et d'extraction du manifeste.
  * `AI Agents (Parallel)` : Phase de traitement cognitif et d'audit de code par l'essaim d'agents.
  * `Merge PDF (Gotenberg)` : Compilation finale des rapports d'audit en un livrable unique.
* **Console de Logs Asynchrones (Live Logging Engine) :** Une boîte de dialogue intégrée qui affiche en temps réel les journaux d'activité bruts du serveur (horodatés au format ISO 8601). Cela permet à l'auditeur de valider les étapes d'interception et de déboguer les flux n8n directement depuis l'interface web.

### 27.3 Captures d'Écran et Expérience Utilisateur

Voici le parcours utilisateur type au sein de l'application web de **MobAuditFlow** :

#### A. Écran d'accueil et Hub de dépôt
L'interface d'accueil invite l'utilisateur à initier l'analyse dans un environnement sécurisé et épuré.
<div align="center">
  <img width="90%" alt="MobAuditFlow - Formulaire d'upload et Hub de Scan" src="https://github.com/user-attachments/assets/1a89a798-039d-489e-8895-44ae68e611cb" />
  <p><em>Figure 15 — Interface principale sécurisée pour le dépôt et l'initialisation des fichiers APK.</em></p>
</div>

<br>

#### B. Sélection du package binaire cible
Sélection à chaud d'une application Android vulnérable (ex: *UnCrackable-Level3.apk* ou *DivaApplication.apk*) avant soumission au pipeline.
<div align="center">
  <img width="90%" alt="MobAuditFlow - Boîte de dialogue de sélection de l'APK" src="https://github.com/user-attachments/assets/e44a09ea-4e80-4557-b247-ca3420264916" />
  <p><em>Figure 16 — Sélection locale de l'application cible via le gestionnaire de fichiers intégré.</em></p>
</div>

<br>

#### C. Console de supervision et d'écoute en direct
Supervision active d'une session d'audit (UUID de workflow visible). On y observe la progression fixée à 25% lors de l'upload et le stream de logs interceptant le callback de n8n.
<div align="center">
  <img width="90%" alt="MobAuditFlow - Suivi dynamique du pipeline et console de logs" src="https://github.com/user-attachments/assets/a76744de-85a8-496a-a405-9639e13c8e69" />
  <p><em>Figure 17 — Console d'exécution en temps réel traquant l'état d'avancement et la réception des notifications asynchrones.</em></p>
</div>

### 27.4 Stack Technique du Frontend

Pour garantir des performances optimales et une réactivité instantanée, la couche Frontend repose sur les technologies suivantes :

* **Framework principal :** React.js / Next.js (Architecture basée sur les composants) configuré nativement en mode sombre (*Dark Mode*) pour un confort visuel typique des outils SecOps.
* **Moteur de Style :** Tailwind CSS pour une interface entièrement *responsive*, s'adaptant de manière fluide aux écrans de monitoring comme aux ordinateurs portables d'ingénieurs.
* **Gestionnaire d'Upload :** Composant Dropzone doué d'écouteurs d'événements JavaScript natifs (`DragOver`, `Drop`) interfaçé de façon transparente avec l'API Google Drive pour la persistance immédiate du fichier.
* **Couche Réseau :** Client asynchrone basé sur l'API Fetch / Axios gérant les requêtes non-bloquantes vers les points d'entrée de n8n et mettant à jour dynamiquement le cycle de vie de l'UI selon les états reçus (`running`, `success`, `error`).
28\. Organisation des Dossiers
------------------------------

## 28. Organisation des Dossiers

```text
/project
│
├── docs/
├── workflows/
├── reports/
├── rag/
├── prompts/
├── docker/
├── parsers/
├── scripts/
└── outputs/
```

* * *

29\. Gestion des Prompts IA
---------------------------

Les prompts sont contextualisés avec :

*   Les findings MobSF ;
*   Le contexte MASVS ;
*   Les documents RAG ;
*   Les recommandations OWASP.

Analyze the following Android vulnerability
and map it to OWASP MASVS controls.

* * *

30\. Analyse des Performances
-----------------------------

| Étape | Temps moyen |
|---|---|
| **MobSF Scan** | 2 min |
| **IA Analysis** | 30 sec |
| **PDF Generation** | 10 sec |
| **Email Delivery** | 5 sec |

31\. Comparaison Avant / Après Automatisation
---------------------------------------------

| Processus | Manuel | Automatisé |
|---|---|---|
| **Mapping MASVS** | 30 min | 10 sec |
| **Rapport PDF** | 1h | 20 sec |
| **Analyse Findings** | 45 min | 15 sec |

* * *

32\. Sécurité de la Plateforme
------------------------------

*   Isolation Docker ;
*   IA locale ;
*   Réduction dépendance cloud ;
*   Confidentialité des analyses ;
*   Segmentation des services.

* * *

33\. Difficultés Rencontrées
----------------------------

*   Synchronisation IA ;
*   Quotas Gemini ;
*   Consommation RAM ;
*   Faux positifs MobSF ;
*   Complexité MASVS ;
*   Normalisation JSON.

* * *

34\. Perspectives Futures
-------------------------

*   Support iOS ;
*   Burp Suite ;
*   Dashboard temps réel ;
*   CI/CD Security ;
*   Scoring CVSS ;
*   Support multi-utilisateurs ;
*   SIEM Integration.

* * *

35\. Pipeline CI/CD Futur
-------------------------

```text
GitHub Actions
↓
APK Build
↓
MobAuditFlow
↓
Security Analysis
↓
PDF Report
↓
Deployment Validation
```
* * *

36\. Glossaire
--------------

| Terme | Définition |
|---|---|
| **RAG** | Retrieval-Augmented Generation |
| **MASVS** | Mobile Application Security Verification Standard |
| **APK** | Android Package |
| **SAST** | Static Application Security Testing |

* * *

37\. Répartition des Tâches
---------------------------



| Membre | Responsabilités |
|---|---|
| **BELKHO Malak** | Analyse APK et MobSF |
| **ZARRI Yousra** | RAG et IA |
| **MERGHICH Mounir** | n8n et orchestration |
| **LAZZOUZI Hiba** | QA et reporting |

* * *

38\. Technologies Utilisées
---------------------------

*   n8n ;
*   MobSF ;
*   Ollama ;
*   Gemini API ;
*   Docker ;
*   ChromaDB ;
*   JavaScript ;
*   Node.js ;
*   Google Drive API ;
*   Gotenberg.

* * *

39\. Références
---------------

*   OWASP MASVS ;
*   OWASP MASTG ;
*   MobSF Documentation ;
*   n8n Documentation ;
*   Ollama Documentation ;
*   Docker Documentation ;
*   ChromaDB Documentation.

* * *

40\. Conclusion
---------------

MobAuditFlow démontre qu’il est possible d’autatiser une grande partie des audits de sécurité mobiles grâce à l’intelligence artificielle et l’orchestration low-code.

La plateforme permet :

*   La standardisation des audits ;
*   La réduction du temps humain ;
*   L’amélioration de la contextualisation ;
*   La génération automatique de rapports ;
*   L’intégration future dans des pipelines DevSecOps.

Le projet constitue une base solide pour le développement futur de plateformes avancées de cybersécurité assistées par IA.

* * *
## 17. Démonstration Vidéo de la Plateforme

Cette démonstration vidéo présente le fonctionnement global de la plateforme intelligente **MobAuditFlow**.

La vidéo illustre les différentes étapes du pipeline :

- Détection automatique des scans MobSF ;
- Déclenchement automatique du workflow n8n ;
- Parsing et nettoyage des données JSON ;
- Analyse multi-agents IA ;
- Mapping OWASP MASVS ;
- Génération automatique des rapports ;
- Envoi automatique par email ;
- Analyse d’exemple sur OWASP UnCrackable-Level1.

---



https://github.com/user-attachments/assets/5ba25bdb-37fd-4192-9755-ba010d06180e





---

### Emplacement du fichier vidéo

```text
docs/
└── demo/
    └── demo.mp4
```


Projet académique réalisé dans le cadre d’un système intelligent d’automatisation des audits de sécurité mobile.
