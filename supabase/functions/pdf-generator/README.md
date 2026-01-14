# Générateur de Rapports PDF - MayFin

Ce module génère des rapports d'analyse de financement professionnels conformes aux standards bancaires MayFin.

## 📋 Prérequis

```bash
pip install reportlab==4.0.7 python-dateutil==2.8.2
```

## 🚀 Usage

### Mode Test (avec données d'exemple)

```bash
cd supabase/functions/pdf-generator
python generate_mayfin_report.py
```

Génère `rapport_analyse_mayfin.pdf` avec les données Quadra Terra.

### Mode CLI (avec données JSON)

```bash
python generate_mayfin_report.py input.json output.pdf
```

### Mode Programmable

```python
from generate_mayfin_report import MayFinReportGenerator

data = {
    'entreprise': 'Mon Entreprise',
    'score': 75,
    # ... voir structure JSON complète
}

generator = MayFinReportGenerator(filename="mon_rapport.pdf")
generator.build(data)
```

## 📊 Structure du Rapport (8 pages)

1. **Page de couverture** - Score global, informations clés
2. **Synthèse exécutive** - Décision, points forts/alertes
3. **Identification du porteur** - Profil et expérience
4. **Présentation du projet** - Activité et localisation
5. **Analyse financière** - Plan de financement, prévisionnels, ratios
6. **Analyse sectorielle** - Contexte, risques, opportunités
7. **Recommandation** - Produit bancaire et conditions
8. **Annexes** - Méthodologie, sources, mentions légales

## 🎨 Identité Visuelle

| Élément | Couleur |
|---------|---------|
| Vert MayFin | `#00915A` |
| Gris foncé | `#2C2C2C` |
| Gris clair | `#F5F5F5` |
| Alerte rouge | `#D32F2F` |
| Succès vert | `#388E3C` |
| Warning orange | `#F57C00` |

## 📐 Formatage

### Nombres

- Espaces insécables : `105 507 €` (U+00A0)
- Virgule française pour décimales

### Pourcentages

- Format : `23,70 %` (virgule française)

### Dates

- Format français : `14/01/2026`

## 📝 Structure JSON d'Entrée

```json
{
  "entreprise": "string",
  "type_projet": "string",
  "score": 0-100,
  "client": {
    "nom": "string",
    "date_naissance": "DD/MM/YYYY",
    "situation_familiale": "string",
    "experience": "string",
    "formation": "string"
  },
  "projet": {
    "enseigne": "string",
    "type": "string",
    "forme_juridique": "string",
    "date_creation": "YYYY",
    "localisation": "string",
    "activites": "string"
  },
  "montant_finance": 0,
  "apport_client": 0,
  "taux_apport": 0,
  "mensualite": 0,
  "financement": {
    "investissements": 0,
    "bfr": 0,
    "total_besoins": 0,
    "apport": 0,
    "emprunt": 0,
    "autres": 0,
    "total_ressources": 0
  },
  "previsionnels": {
    "annee1": { "ca": 0, "charges_var": 0, "marge": 0, "charges_fixes": 0, "ebitda": 0, "rex": 0, "rnet": 0 },
    "annee2": { ... },
    "annee3": { ... }
  },
  "ratios": {
    "taux_apport": 0,
    "taux_endettement": 0,
    "capacite_remb": 0,
    "dscr": "1.51",
    "marge_brute": 0
  },
  "secteur": {
    "contexte": "string",
    "risques": [{ "titre": "string", "description": "string", "impact": "élevé|moyen|faible" }],
    "opportunites": ["string"]
  },
  "recommendation": {
    "decision": "FAVORABLE|À ÉTUDIER AVEC RÉSERVES|DÉFAVORABLE",
    "produit": { "nom": "string", "type": "string", "duree": "string", "montant": 0, "avantages": ["string"] },
    "conditions": ["string"],
    "decision_justification": "string"
  },
  "points_forts": ["string"],
  "alertes": ["string"],
  "sources": ["string"]
}
```

## 📸 Exemples de Sortie

Voir les captures d'écran dans `/docs/`:

- `pdf_sample_cover.jpg` - Page de couverture
- `pdf_sample_executive.jpg` - Synthèse exécutive
- `pdf_sample_financial.jpg` - Analyse financière
- `pdf_sample_identification.jpg` - Identification
- `pdf_sample_sectoral.jpg` - Analyse sectorielle

## 🔗 Intégration Edge Function

Pour intégrer dans une Edge Function Supabase, voir le handler TypeScript dans `analyze-documents/index.ts`.

---

**Version** : 2.0  
**Date** : Janvier 2026  
**Auteur** : MayFin Digital
