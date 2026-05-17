Plateforme d’Audit Automatisé Mobile basée sur OWASP MASVS / MASTG et Intelligence Artificielle "MobAuditFlow"
==============================================================================================================

* * *

1\. Présentation Générale du Projet
-----------------------------------

Ce projet consiste en la conception et le développement d’une plateforme intelligente d’automatisation des audits de sécurité des applications mobiles Android en s’appuyant sur les standards OWASP MASVS (Mobile Application Security Verification Standard) et MASTG (Mobile Application Security Testing Guide).

L’objectif principal du projet est de réduire la charge de travail manuelle des auditeurs sécurité en automatisant plusieurs tâches complexes telles que :

*   L’analyse statique d’APK Android ;
*   La corrélation automatique des vulnérabilités ;
*   Le mapping automatique vers les contrôles MASVS ;
*   L’enrichissement des résultats à l’aide de modèles d’Intelligence Artificielle ;
*   La génération automatique de rapports professionnels PDF ;
*   L’orchestration complète du pipeline via n8n ;
*   L’utilisation de modèles IA locaux afin de préserver la confidentialité des analyses.

La plateforme agit comme un véritable système d’orchestration de cybersécurité capable de transformer des résultats techniques bruts provenant d’outils comme MobSF en rapports d’audit structurés, contextualisés et exploitables.

* * *

2\. Contexte et Motivation du Projet
------------------------------------

Les audits de sécurité mobiles sont généralement longs, répétitifs et nécessitent une expertise avancée en reverse engineering Android, analyse statique, analyse réseau et validation de conformité OWASP.

Dans un contexte académique et professionnel, plusieurs problèmes apparaissent :

*   Temps élevé nécessaire pour analyser les résultats de MobSF ;
*   Difficulté de mapper manuellement les findings vers MASVS ;
*   Présence importante de faux positifs ;
*   Production manuelle des rapports techniques ;
*   Manque d’automatisation dans les workflows de sécurité mobile.

Ce projet répond directement à ces limitations en proposant une architecture intelligente combinant :

*   Automatisation ;
*   Intelligence Artificielle ;
*   RAG (Retrieval-Augmented Generation) ;
*   Orchestration low-code ;
*   Analyse de sécurité mobile ;
*   Génération documentaire automatisée.

* * *

3\. Objectifs du Projet
-----------------------

### 3.1 Objectifs Fonctionnels

*   Recevoir automatiquement des fichiers JSON provenant de MobSF ;
*   Analyser automatiquement les vulnérabilités détectées ;
*   Interroger une base de connaissances MASVS/MASTG ;
*   Produire des recommandations de remédiation ;
*   Prioriser les vulnérabilités ;
*   Générer un rapport PDF complet ;
*   Envoyer automatiquement le rapport par email.

### 3.2 Objectifs Techniques

*   Concevoir un workflow distribué multi-agents ;
*   Utiliser n8n comme moteur d’orchestration ;
*   Intégrer des modèles IA locaux via Ollama ;
*   Créer un pipeline RAG basé sur ChromaDB ;
*   Permettre la scalabilité de la plateforme ;
*   Réduire la dépendance aux APIs cloud.

* * *

4\. Architecture Générale du Projet
-----------------------------------

L’architecture du projet suit un modèle modulaire et distribué dans lequel chaque composant possède une responsabilité précise.

Le moteur central du système est n8n, qui agit comme orchestrateur principal des traitements.

### 4.1 Vue Générale de l’Architecture

\[EMPLACEMENT SCREENSHOT — Architecture Générale du Projet\]

  
  
  
  
  

### 4.2 Description des Composants

Composant

Rôle

MobSF

Analyse statique et dynamique des APK Android

n8n

Orchestration des workflows

Ollama

Exécution locale des modèles IA

Gemini API

Analyse IA distante et contextualisation

ChromaDB

Base vectorielle pour le RAG

Gotenberg

Conversion HTML vers PDF

Docker

Conteneurisation des services

Google Drive

Point d’entrée des scans et fichiers

* * *

5\. Architecture du Workflow n8n
--------------------------------

Le workflow n8n constitue le cerveau opérationnel de la plateforme.

Il orchestre toutes les étapes depuis l’ingestion des données jusqu’à la génération finale du rapport.

### 5.1 Workflow Principal

\[EMPLACEMENT SCREENSHOT — Workflow n8n Complet\]

  
  
  
  
  

### 5.2 Déclenchement Automatique

Le workflow démarre automatiquement lorsqu’un fichier JSON issu de MobSF est ajouté dans Google Drive.

Le système télécharge automatiquement le fichier puis l’envoie dans la chaîne de traitement.

### 5.3 Parsing et Nettoyage des Données

Un nœud JavaScript spécialisé est utilisé afin de :

*   Filtrer les findings inutiles ;
*   Supprimer les doublons ;
*   Réduire le bruit ;
*   Uniformiser les structures JSON ;
*   Préparer les données pour les agents IA.

### 5.4 Architecture Multi-Agents

La plateforme utilise plusieurs agents IA spécialisés fonctionnant en parallèle.

Agent IA

Responsabilité

Agent Manifest

Analyse AndroidManifest.xml

Agent Réseau/API

Analyse TLS, endpoints et APIs

Agent Reverse Engineering

Analyse des secrets hardcodés et obfuscation

Agent MASVS

Mapping OWASP MASVS

Agent Ollama

Analyse locale hors cloud

### 5.5 Synchronisation des Agents

Un nœud Merge est utilisé afin de synchroniser les réponses des différents agents IA.

Ce nœud doit impérativement être configuré en mode :

Wait for all inputs to arrive

Cette configuration est critique afin d’éviter les incohérences dans les rapports générés.

* * *

6\. Intégration du RAG (Retrieval-Augmented Generation)
-------------------------------------------------------

Le système utilise une architecture RAG afin d’enrichir les réponses IA avec les documents officiels OWASP.

Les fichiers MASVS et MASTG sont indexés dans ChromaDB sous forme d’embeddings vectoriels.

### 6.1 Pipeline RAG

*   Téléchargement des documents OWASP ;
*   Découpage des documents ;
*   Création des embeddings ;
*   Stockage dans ChromaDB ;
*   Recherche contextuelle par similarité ;
*   Injection du contexte dans les prompts IA.

### 6.2 Avantages du RAG

*   Réduction des hallucinations IA ;
*   Réponses contextualisées ;
*   Références exactes aux contrôles MASVS ;
*   Recommandations techniques pertinentes.

* * *

7\. Déploiement Docker
----------------------

L’ensemble de la plateforme est conteneurisé via Docker afin de simplifier le déploiement.

### 7.1 Architecture Docker

\[EMPLACEMENT SCREENSHOT — Docker Containers Running\]

  
  
  
  
  

### 7.2 Exemple Docker Compose

version: '3'

services:

  n8n:
    image: n8nio/n8n

  ollama:
    image: ollama/ollama

  chromadb:
    image: chromadb/chroma

  gotenberg:
    image: gotenberg/gotenberg

* * *

8\. Exemples de Résultats JSON
------------------------------

Cette section présente quelques exemples de résultats JSON générés après traitement des analyses MobSF.

\[EMPLACEMENT SCREENSHOT — Réponses JSON MobSF\]

  
  
  
  
  

* * *

9\. Génération Automatique des Rapports
---------------------------------------

Après corrélation des analyses IA, la plateforme génère automatiquement un rapport HTML professionnel converti ensuite en PDF via Gotenberg.

### 9.1 Contenu du Rapport

*   Résumé exécutif ;
*   Informations sur l’APK ;
*   Liste des vulnérabilités ;
*   Mapping MASVS ;
*   Niveau de criticité ;
*   Impact métier ;
*   Recommandations ;
*   Conclusion de sécurité.

### 9.2 Exemples de Pages du Rapport

\[EMPLACEMENT SCREENSHOT — Rapport PDF Page 1\]

  
  
  
  
  

\[EMPLACEMENT SCREENSHOT — Rapport PDF Page 2\]

  
  
  
  
  

* * *

10\. Envoi Automatique des Rapports par Email
---------------------------------------------

Une fois le rapport généré, celui-ci est automatiquement envoyé au destinataire via le nœud Email de n8n.

\[EMPLACEMENT SCREENSHOT — Email Envoyé\]

  
  
  
  
  

* * *

11\. Cas d’Étude : OWASP UnCrackable Level 1
--------------------------------------------

Afin de tester la plateforme, plusieurs APK vulnérables ont été utilisés comme jeux de test.

Le principal APK utilisé est :

OWASP UnCrackable-Level1

### 11.1 Vulnérabilités Détectées

*   Root Detection ;
*   Debug Detection ;
*   Hardcoded Secrets ;
*   Weak Cryptography ;
*   Certificate Validation Issues ;
*   Insecure Storage ;
*   Reverse Engineering Exposure.

### 11.2 Captures d’Analyse

\[EMPLACEMENT SCREENSHOT — Analyse MobSF UnCrackable-Level1\]

  
  
  
  
  

\[EMPLACEMENT SCREENSHOT — Reverse Engineering JADX\]

  
  
  
  
  

* * *

12\. Répartition des Tâches de l’Équipe
---------------------------------------

Membre

Responsabilités

P1 — Lead Sécurité

Analyse APK, MobSF, Reverse Engineering

P2 — Architecte IA

RAG, prompts, embeddings, ChromaDB

P3 — Développeur n8n

Orchestration et automatisation

P4 — QA & Reporting

Validation des rapports et tests

* * *

13\. Difficultés Rencontrées
----------------------------

*   Synchronisation des agents IA ;
*   Gestion des quotas Gemini ;
*   Normalisation des JSON ;
*   Faux positifs MobSF ;
*   Temps de réponse des modèles locaux ;
*   Gestion mémoire de Docker ;
*   Complexité du mapping MASVS.

* * *

14\. Perspectives Futures
-------------------------

*   Support iOS ;
*   Analyse dynamique avancée ;
*   Intégration Burp Suite ;
*   Scoring CVSS automatique ;
*   Dashboard temps réel ;
*   Support multi-utilisateurs ;
*   Intégration SIEM/SOC ;
*   IA spécialisée cybersécurité.

* * *

15\. Conclusion
---------------

Cette plateforme représente une approche moderne de l’automatisation des audits de sécurité mobiles combinant intelligence artificielle, orchestration low-code et standards OWASP.

Le projet démontre qu’il est possible de transformer des tâches traditionnellement manuelles et complexes en pipelines intelligents capables de produire des analyses cohérentes, contextualisées et professionnelles.

L’architecture modulaire adoptée permet également une grande évolutivité et ouvre la voie à la création de futures plateformes de cybersécurité assistées par IA.

* * *

16\. Annexes
------------

### 16.1 Screenshots à Ajouter

*   Architecture générale ;
*   Workflow n8n ;
*   Nœuds IA ;
*   Docker Desktop ;
*   Réponses JSON ;
*   Rapports PDF ;
*   Emails envoyés ;
*   Analyse MobSF ;
*   Reverse Engineering JADX ;
*   OWASP UnCrackable-Level1.

### 16.2 Technologies Utilisées

*   n8n
*   MobSF
*   Ollama
*   Gemini API
*   ChromaDB
*   Docker
*   Gotenberg
*   JavaScript
*   Node.js
*   Google Drive API

* * *

Projet académique réalisé dans le cadre d’un système intelligent d’automatisation des audits de sécurité mobile.
