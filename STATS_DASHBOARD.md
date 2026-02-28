# Stats Dashboard - Documentation

## Vue d'ensemble

Un dashboard complet de statistiques pour analyser les inscriptions FIS avec des filtres personnalisables et export CSV.

## 🎯 Fonctionnalités

### 1. API Endpoint `/api/stats`

#### Query Parameters

- `startDate` (YYYY-MM-DD): Filtrer par date de début
- `endDate` (YYYY-MM-DD): Filtrer par date de fin
- `status` (comma-separated): Filtrer par status (open,validated,email_sent,etc.)
- `discipline` (comma-separated): Filtrer par discipline (DH,SL,GS,SG,AC)
- `country` (comma-separated): Filtrer par pays organisateur
- `metrics` (comma-separated): Métriques à retourner (défaut: all)

#### Métriques disponibles

- `totalInscriptions`: Nombre total d'inscriptions
- `totalCompetitors`: Nombre de coureurs uniques
- `totalIndividualRegistrations`: Nombre total d'inscriptions individuelles (coureur × événements)
- `avgCompetitorsPerInscription`: Moyenne de coureurs par inscription
- `byStatus`: Breakdown par status
- `byGender`: Breakdown par genre
- `byDiscipline`: Breakdown par discipline
- `byCountry`: Breakdown par pays
- `timeline`: Timeline mensuelle des inscriptions
- `topCompetitors`: Top 20 coureurs par nombre d'inscriptions
- `competitorsList`: Liste complète des coureurs avec leur nombre d'inscriptions (pour export)

#### Exemple d'utilisation

```bash
# Toutes les stats
GET /api/stats

# Stats filtrées
GET /api/stats?startDate=2026-01-01&discipline=DH,SL&status=open,validated

# Export des coureurs uniquement
GET /api/stats?metrics=competitorsList
```

#### Exemple de réponse

```json
{
  "totalInscriptions": 150,
  "totalCompetitors": 450,
  "totalIndividualRegistrations": 1200,
  "avgCompetitorsPerInscription": 8.5,
  "byStatus": [
    { "status": "open", "count": 45 },
    { "status": "email_sent", "count": 85 },
    { "status": "validated", "count": 20 }
  ],
  "byGender": [
    { "gender": "M", "count": 650 },
    { "gender": "W", "count": 550 }
  ],
  "byDiscipline": [
    { "discipline": "DH", "count": 35 },
    { "discipline": "SL", "count": 48 },
    { "discipline": "GS", "count": 42 }
  ],
  "topCompetitors": [
    {
      "competitorid": 12345,
      "firstname": "John",
      "lastname": "Doe",
      "nationcode": "FRA",
      "gender": "M",
      "registration_count": 15
    }
  ],
  "competitorsList": [
    {
      "competitorId": 12345,
      "fisCode": "1234567",
      "firstName": "John",
      "lastName": "Doe",
      "nationCode": "FRA",
      "gender": "M",
      "birthDate": "2000-01-01",
      "registrationCount": 15
    }
  ]
}
```

### 2. Page Dashboard `/stats`

#### Interface utilisateur

**Cartes de statistiques principales:**
- Total Inscriptions
- Total Competitors (coureurs uniques)
- Individual Registrations (coureur × événements)
- Moyenne de coureurs par inscription

**Filtres interactifs:**
- Date de début / Date de fin
- Disciplines (badges cliquables)
- Status (badges cliquables)
- Bouton "Clear Filters"

**Graphiques visuels:**
- Breakdown par status (barres horizontales)
- Breakdown par genre (barres colorées: bleu pour hommes, rose pour femmes)
- Breakdown par discipline (barres multicolores selon la discipline)
- Timeline mensuelle (barres indigo)

**Top Competitors:**
- Liste des 20 coureurs les plus actifs
- Affiche: Nom, pays, genre, nombre d'inscriptions

**Export CSV:**
- Bouton en haut à droite
- Exporte la liste complète des coureurs avec leur nombre d'inscriptions
- Nom du fichier: `competitors-export-YYYY-MM-DD.csv`

#### Navigation

Le lien "Statistiques" / "Statistics" est disponible dans le header:
- Desktop: Navigation complète visible
- Tablet: Navigation condensée
- Mobile: Menu hamburger

## 🎨 Design

- Utilise les composants UI existants (Card, Button, Badge)
- Style cohérent avec le reste de l'application
- Graphiques créés avec CSS pur (pas de bibliothèque externe)
- Responsive: fonctionne sur mobile, tablet et desktop

## 🔒 Permissions

Aucune restriction d'accès n'est actuellement configurée. Pour ajouter des restrictions:

1. Ajouter un check de rôle dans la page:
```tsx
const role = useRole()
if (!isAdminRole(role)) {
  return <div>Access denied</div>
}
```

2. Masquer le lien dans le header pour les non-admins

## 🚀 Améliorations futures possibles

1. **Graphiques avancés avec Recharts:**
   - Installer: `pnpm add recharts`
   - Remplacer les barres CSS par des vraies charts

2. **Filtres supplémentaires:**
   - Par saison
   - Par catégorie
   - Par organisation

3. **Export Excel:**
   - Installer: `pnpm add xlsx`
   - Ajouter un bouton "Export Excel" à côté du CSV

4. **Cache et performance:**
   - Ajouter React Query avec cache de 5 minutes
   - Index de base de données sur les colonnes fréquemment filtrées

5. **Comparaisons:**
   - Comparer deux périodes
   - Voir l'évolution année par année

6. **Tableaux de bord sauvegardés:**
   - Permettre de sauvegarder des configurations de filtres
   - Partager des URLs avec filtres pré-appliqués

## 📝 Tests

Pour tester manuellement:

1. Démarrer le serveur de dev: `pnpm dev`
2. Aller sur `/stats`
3. Tester les filtres
4. Vérifier l'export CSV
5. Tester sur mobile

Pour des tests automatisés, créer:
- Tests d'intégration pour l'API avec Vitest
- Tests de composants pour la page avec Testing Library

## 🐛 Dépannage

**L'API retourne une erreur 500:**
- Vérifier que la base de données est accessible
- Vérifier les logs serveur
- Vérifier que les tables existent (inscriptions, competitors, inscription_competitors)

**Les filtres ne fonctionnent pas:**
- Ouvrir la console du navigateur
- Vérifier la requête réseau dans l'onglet Network
- Vérifier que les paramètres sont correctement passés

**L'export CSV est vide:**
- Vérifier qu'il y a des données qui matchent les filtres
- Essayer sans filtres pour voir toutes les données
