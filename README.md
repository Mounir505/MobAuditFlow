 README - MobAuditFlow

Plateforme d’Audit Automatisé Mobile basée sur OWASP MASVS / MASTG et Intelligence Artificielle
===============================================================================================

# MobAuditFlow

<img width="1600" height="983" alt="System_architecture_and_workflow_diagram" src="https://github.com/user-attachments/assets/2fa895c1-9ede-4e83-8a75-de3bdde28e31" />



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

* * *

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



| Critère | Poids |
|---|---|
| **Criticité MobSF** | 40% |
| **Impact métier** | 25% |
| **Exploitabilité** | 20% |
| **Mapping MASVS** | 15% |

* * *

17\. Dockerisation
------------------

L’ensemble des composants est conteneurisé.

<img width="1880" height="272" alt="docker-containers" src="https://github.com/user-attachments/assets/569c4c0d-3492-4e8d-b775-b498d865171f" />

Figure 9 — Conteneurs Docker actifs.

* * *

18\. Exemple Docker Compose
---------------------------

| Service | Image Docker | Description |
|---|---|---|
| **n8n** | `n8nio/n8n` | Plateforme d’automatisation et d’orchestration des workflows. |
| **ollama** | `ollama/ollama` | Exécution locale des modèles d’intelligence artificielle. |
| **chromadb** | `chromadb/chroma` | Base vectorielle utilisée pour le système RAG. |
| **gotenberg** | `gotenberg/gotenberg` | Conversion des rapports HTML en fichiers PDF. |

* * *

19\. Analyse MobSF
------------------

MobSF constitue le moteur principal d’analyse statique.

<img width="2843" height="1524" alt="mobsf-dashboard" src="https://github.com/user-attachments/assets/18d4e2e8-5f38-48a2-aaf2-87a61efe221c" />

Figure 10 — Dashboard MobSF.

* * *

20\. Vulnérabilités Détectées
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

21\. Réponses JSON
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

22\. Génération Automatique des Rapports
----------------------------------------

Le système génère automatiquement des rapports HTML puis PDF.

### 22.1 Couverture du Rapport

<img width="1583" height="1267" alt="report-cover-page" src="https://github.com/user-attachments/assets/6b976f3f-cbab-4818-adc1-92b120399f37" />

Figure 11 — Couverture du rapport.

### 22.2 Executive Summary

<img width="1289" height="1228" alt="report-executive-summary" src="https://github.com/user-attachments/assets/114e4197-a5fe-41c1-8dc0-e0396f90b683" />

Figure 12 — Résumé exécutif.

### 22.3 Détails des Vulnérabilités

<img width="1357" height="1314" alt="report-vulnerability-detail" src="https://github.com/user-attachments/assets/70226960-533c-413d-93ea-c7a63aee190b" />

Figure 13 — Détails des vulnérabilités.

* * *

23\. Envoi Automatique des Emails
---------------------------------

Le rapport final est automatiquement envoyé par email.

<img width="2730" height="1510" alt="automated-email-report" src="https://github.com/user-attachments/assets/e5929bfc-2cbb-4180-ac70-354c8733e4a4" />

Figure 14 — Email automatique contenant le rapport PDF.

* * *

24\. Cas d’Étude : OWASP UnCrackable-Level2
-------------------------------------------

Plusieurs APK vulnérables ont été utilisés.

Le principal APK testé est :

OWASP UnCrackable-Level2

### 24.1 Vulnérabilités Observées

*   Root Detection ;
*   Debug Detection ;
*   Hardcoded Secrets ;
*   Weak Cryptography ;
*   Anti-Tampering ;
*   Reverse Engineering Exposure.

* * *

25\. Reverse Engineering
------------------------

Le reverse engineering est effectué via JADX.

Les analyses permettent :

*   L’extraction du code ;
*   L’analyse des secrets ;
*   L’identification des protections ;
*   L’étude des mécanismes anti-debug.


* * *


26\. Interface Application Web (Web App Dashboard)**
-------------------------------------------------------
MobAuditFlow intègre une interface web personnalisée développée avec **React.js**, 
permettant de visualiser et interagir avec le pipeline de sécurité mobile en temps réel.

### Stack Technique

| Technologie | Rôle |
|---|---|
| **React.js** | Framework frontend — composants, routing, state management |
| **Next.js** | Rendu côté serveur et gestion des routes API |
| **Tailwind CSS** | Styling et design de l'interface |
| **WebSocket / Polling** | Suivi en temps réel des étapes du pipeline n8n |
| **Recharts** | Graphiques interactifs (Binary Analysis) |
| **Axios** | Communication avec le backend n8n et MobSF |

### Fonctionnement

L'interface React communique directement avec le workflow **n8n** via des appels HTTP. 
Lorsqu'un APK est déposé, l'application envoie le fichier vers **Google Drive**, 
déclenche automatiquement le pipeline n8n, puis interroge le backend en temps réel 
pour afficher la progression de chaque nœud — Upload, MobSF Scanner, AI Agents, 
et génération PDF via Gotenberg.

Les résultats de l'analyse sont récupérés et affichés dans des vues dédiées : 
permissions du Manifest, findings binaires, résultats IA avec mapping MASVS, 
et téléchargement du rapport PDF final.

MobAuditFlow intègre une interface web personnalisée permettant de lancer des scans APK, suivre le pipeline n8n en temps réel, consulter les résultats enrichis par l'IA, et télécharger le rapport PDF final — le tout directement depuis le navigateur, sans outil externe.

----

### 26.1 Vue Manifest & Permissions

L'onglet **Manifest** liste toutes les permissions déclarées dans `AndroidManifest.xml` avec leur niveau de criticité (info / medium / high). Le **Raw Manifest** est affiché en JSON pour une inspection technique complète.

<img width="1311" height="768" alt="webapp-pipeline-detail" src="https://github.com/user-attachments/assets/b3bee430-b4ea-4936-82ef-b3ab0af54e8d" />

*Figure 16 —Vue Manifest & Permissions : liste des permissions avec leur criticité et Raw Manifest JSON.* 

---

### 26.2 Suivi du Pipeline n8n — Vue Détaillée

Une fois le scan lancé, l'interface affiche l'avancement de chaque étape avec un panneau **Live Logs** en direct.

| Étape | Description |
|---|---|
| **Upload APK** | Envoi du fichier APK vers Google Drive |
| **MobSF Scanner** | Lancement de l'analyse statique |
| **AI Agents (Parallel)** | Analyse multi-agents IA en parallèle |
| **Merge, PDF (Gotenberg)** | Génération et envoi automatique du rapport |

<img width="1282" height="680" alt="webapp-manifest-permissions" src="https://github.com/user-attachments/assets/d7609e0f-fb26-4705-ac37-726b12c4e241" />

*Figure 15 — Suivi du pipeline n8n (vue compacte) — Upload APK terminé, étapes suivantes en attente.*  

     

---

### 26.3 Suivi du Pipeline n8n — Vue Compacte

Vue compacte du pipeline montrant l'état de chaque nœud (En cours / En attente / Terminé).

<img width="1234" height="642" alt="webapp-pipeline-compact" src="https://github.com/user-attachments/assets/975fadc7-3e28-4a35-9119-62c8d4c23f98" />

*Figure 17 — Suivi du pipeline n8n avec Live Logs — statut global : running, progression : 25%.*

---

### 26.4 Page d'Accueil — Upload APK

L'utilisateur dépose ou sélectionne un fichier APK via glisser-déposer ou le bouton **"Sélectionner un fichier"**. Le scan est lancé via **"Lancer le scan"**.

<img width="1600" height="932" alt="webapp-overview-results" src="https://github.com/user-attachments/assets/b22ad6dc-adc2-4b3e-9634-aa911cf5832b" />

*Figure 19 — Page d'accueil MobAuditFlow — zone de dépôt APK et déclenchement du scan.*


---

### 26.5 Vue Résultats — Overview

Une fois le scan terminé, la page affiche :
- Le **package** de l'application analysée
- La **version** et le **score de sécurité global** (72 / 100)
- Les **permissions sensibles** détectées
- Le **résumé des résultats** : état, rapport PDF, taille d'analyse

<img width="1286" height="690" alt="webapp-home-upload" src="https://github.com/user-attachments/assets/d52bb3d3-0ceb-4c61-bd88-92b785ecd3da" />

*Figure 18 — Vue Overview : tableau de bord des résultats avec score de sécurité global.*


---

### 26.6 Vue AI Findings

L'onglet **AI Findings** affiche les résultats enrichis par les agents IA :
- Mapping automatique vers les contrôles **OWASP MASVS**
- Niveau de sévérité par finding (High / Medium / Low)
- Recommandations de remédiation contextualisées

<img width="1600" height="878" alt="webapp-ai-findings" src="https://github.com/user-attachments/assets/63757d76-a43a-4ac1-ab2b-bf1eae560de3" />

*Figure 20 — Vue AI Findings : résultats enrichis par les agents IA avec mapping MASVS automatique.*

---

### 26.7 Vue Binary Analysis

L'onglet **Binary** présente une analyse visuelle des findings binaires par niveau de criticité sous forme de graphique à barres.

<img width="1600" height="742" alt="webapp-binary-analysis" src="https://github.com/user-attachments/assets/b8cc702a-d8ab-4f03-8557-888200e8486a" />

*Figure 21 — Vue Binary Analysis : distribution des findings par criticité (High / Medium / Low).*

---

### 26.8 Sélection du Fichier APK

L'interface propose un sélecteur de fichiers natif. Plusieurs APK de test sont supportés : `UnCrackable-Level1.apk`, `DivaApplication.apk`, `UnCrackable-Level3.apk`.

<img width="1600" height="831" alt="webapp-apk-selector" src="https://github.com/user-attachments/assets/7da5d5c9-5a9b-4892-981f-dc401948b241" />

*Figure 22 — Sélecteur de fichiers APK — choix de l'application à analyser.*

---

### 26.9 Vue PDF Report — Téléchargement

L'onglet **PDF Report** permet de télécharger le rapport PDF généré automatiquement par **Gotenberg**.

<img width="1600" height="781" alt="webapp-pdf-download" src="https://github.com/user-attachments/assets/36fa9956-c1bf-4747-9fa4-0c3aaf7fd8a5" />

*Figure 23 — Vue PDF Report : téléchargement du rapport d'audit PDF généré par Gotenberg.*

---

### 26.10 Résumé des Fonctionnalités Web

| Fonctionnalité | Description |
|---|---|
| **Upload APK** | Glisser-déposer ou sélection manuelle du fichier APK |
| **Lancer le scan** | Déclenchement automatique du pipeline n8n complet |
| **Suivi en temps réel** | Progression par étape + Live Logs remontés par n8n |
| **Overview** | Score de sécurité global, permissions sensibles, résumé |
| **Manifest** | Permissions détaillées par criticité + Raw Manifest JSON |
| **Binary Analysis** | Graphique des findings binaires par criticité |
| **AI Findings** | Résultats enrichis par les agents IA + mapping MASVS |
| **PDF Report** | Téléchargement du rapport PDF final généré par Gotenberg |

* * *

27\. Organisation des Dossiers
------------------------------



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

28\. Gestion des Prompts IA
---------------------------

Les prompts sont contextualisés avec :

*   Les findings MobSF ;
*   Le contexte MASVS ;
*   Les documents RAG ;
*   Les recommandations OWASP.

Analyze the following Android vulnerability
and map it to OWASP MASVS controls.

* * *

29\. Analyse des Performances
-----------------------------

| Étape | Temps moyen |
|---|---|
| **MobSF Scan** | 2 min |
| **IA Analysis** | 30 sec |
| **PDF Generation** | 10 sec |
| **Email Delivery** | 5 sec |

30\. Comparaison Avant / Après Automatisation
---------------------------------------------

| Processus | Manuel | Automatisé |
|---|---|---|
| **Mapping MASVS** | 30 min | 10 sec |
| **Rapport PDF** | 1h | 20 sec |
| **Analyse Findings** | 45 min | 15 sec |

* * *

31\. Sécurité de la Plateforme
------------------------------

*   Isolation Docker ;
*   IA locale ;
*   Réduction dépendance cloud ;
*   Confidentialité des analyses ;
*   Segmentation des services.

* * *

32\. Difficultés Rencontrées
----------------------------

*   Synchronisation IA ;
*   Quotas Gemini ;
*   Consommation RAM ;
*   Faux positifs MobSF ;
*   Complexité MASVS ;
*   Normalisation JSON.

* * *

33\. Perspectives Futures
-------------------------

*   Support iOS ;
*   Burp Suite ;
*   Dashboard temps réel ;
*   CI/CD Security ;
*   Scoring CVSS ;
*   Support multi-utilisateurs ;
*   SIEM Integration.

* * *

34\. Pipeline CI/CD Futur
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

35\. Glossaire
--------------

| Terme | Définition |
|---|---|
| **RAG** | Retrieval-Augmented Generation |
| **MASVS** | Mobile Application Security Verification Standard |
| **APK** | Android Package |
| **SAST** | Static Application Security Testing |

* * *

36\. Répartition des Tâches
---------------------------



| Membre | Responsabilités |
|---|---|
| **BELKHO Malak** | Analyse APK et MobSF |
| **ZARRI Yousra** | RAG et IA |
| **MERGHICH Mounir** | n8n et orchestration |
| **LAZZOUZI Hiba** | QA et reporting |

* * *

37\. Technologies Utilisées
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

38\. Références
---------------

*   OWASP MASVS ;
*   OWASP MASTG ;
*   MobSF Documentation ;
*   n8n Documentation ;
*   Ollama Documentation ;
*   Docker Documentation ;
*   ChromaDB Documentation.

* * *

39\. Conclusion
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
## 40. Démonstration Vidéo de la Plateforme

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

* * *
Projet académique réalisé dans le cadre d’un système intelligent d’automatisation des audits de sécurité mobile.
