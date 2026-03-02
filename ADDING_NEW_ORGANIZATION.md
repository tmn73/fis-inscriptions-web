# Guide : Ajouter une nouvelle organisation

Ce document décrit les étapes nécessaires pour ajouter une nouvelle fédération/organisation au système (exemple : RFEDI pour l'Espagne).

## Prérequis

- Avoir accès à la base de données en production
- Connaître les informations de la nouvelle organisation
- Avoir les accès aux variables d'environnement

## Étapes à suivre

### 1. 📊 Collecte des informations

Rassemblez les informations suivantes pour la nouvelle organisation :

**Informations de base :**
- `code` : Code de l'organisation (ex: "RFEDI")
- `name` : Nom complet (ex: "Real Federación Española de Deportes de Invierno")
- `country` : Code pays ISO (ex: "ESP")
- `baseUrl` : URL de base de l'application (ex: "https://inscripciones-rfedi.es")
- `fromEmail` : Email d'envoi (ex: "Inscripciones RFEDI <noreply@inscripciones-rfedi.es>")
- `logo` : URL du logo (optionnel)

**Emails de notification :**
```json
{
  "all_races": [
    {"email": "contact@rfedi.es", "name": "Contact RFEDI", "reason": "Automatique RFEDI"}
  ],
  "women": [
    {"email": "femmes@rfedi.es", "name": "Responsable Femmes", "reason": "Courses Femmes"}
  ],
  "men": [
    {"email": "hommes@rfedi.es", "name": "Responsable Hommes", "reason": "Courses Hommes"}
  ]
}
```

**Contacts officiels :**
```json
{
  "responsible_for_entry": {
    "address": "Adresse complète avec code postal et ville",
    "men": {
      "name": "Nom Responsable Hommes",
      "phone": "+34 XXX XXX XXX",
      "email": "responsable-hommes@rfedi.es"
    },
    "women": {
      "name": "Nom Responsable Femmes",
      "phone": "+34 XXX XXX XXX",
      "email": "responsable-femmes@rfedi.es"
    }
  },
  "signature": {
    "name": "Nom Signataire",
    "title": "Titre/Fonction"
  }
}
```

**Templates d'email (optionnel mais recommandé) :**
```json
{
  "inscription_pdf": {
    "subject_prefix": "Spanish 🇪🇸",
    "contact_email": {
      "men": "responsable-hommes@rfedi.es",
      "women": "responsable-femmes@rfedi.es"
    },
    "signature_urls": {
      "men": "https://i.imgur.com/signature-men.png",
      "women": "https://i.imgur.com/signature-women.png"
    }
  },
  "new_inscription": {
    "recipients": ["contact@rfedi.es"]
  },
  "daily_recap": {
    "recipients": ["contact@rfedi.es", "admin@rfedi.es"],
    "cc": []
  }
}
```

### 2. 🗃️ Base de données

**Ajouter l'organisation dans la table `organizations` :**

```sql
INSERT INTO "organizations" ("code", "name", "country", "base_url", "from_email", "emails", "contacts", "email_templates") VALUES (
  'RFEDI',
  'Real Federación Española de Deportes de Invierno',
  'ESP',
  'https://inscripciones-rfedi.es',
  'Inscripciones RFEDI <noreply@inscripciones-rfedi.es>',
  '{"all_races": [{"email": "contact@rfedi.es", "name": "Contact RFEDI", "reason": "Automatique RFEDI"}], "women": [], "men": []}',
  '{"responsible_for_entry": {"address": "Adresse complète avec code postal et ville", "men": {"name": "Nom Responsable Hommes", "phone": "+34 XXX XXX XXX", "email": "responsable-hommes@rfedi.es"}, "women": {"name": "Nom Responsable Femmes", "phone": "+34 XXX XXX XXX", "email": "responsable-femmes@rfedi.es"}}, "signature": {"name": "Nom Signataire", "title": "Directeur Sportif"}}',
  '{"inscription_pdf": {"subject_prefix": "Spanish 🇪🇸", "contact_email": {"men": "responsable-hommes@rfedi.es", "women": "responsable-femmes@rfedi.es"}, "signature_urls": {"men": "https://i.imgur.com/signature-men.png", "women": "https://i.imgur.com/signature-women.png"}}, "new_inscription": {"recipients": ["contact@rfedi.es"]}, "daily_recap": {"recipients": ["contact@rfedi.es", "admin@rfedi.es"], "cc": []}}'
);
```

### 3. 🏗️ Nouveau schema PostgreSQL

**Créer le schema pour la nouvelle organisation :**

```sql
CREATE SCHEMA IF NOT EXISTS rfedi;
```

### 4. 📁 Création des tables

**Option A : Copier depuis un schema existant (recommandé)**
```sql
-- Copier la structure depuis le schema FFS
CREATE TABLE rfedi.inscriptions (LIKE ffs.inscriptions INCLUDING ALL);
CREATE TABLE rfedi.competitors (LIKE ffs.competitors INCLUDING ALL);
CREATE TABLE rfedi.inscription_competitors (LIKE ffs.inscription_competitors INCLUDING ALL);
CREATE TABLE rfedi.inscription_coaches (LIKE ffs.inscription_coaches INCLUDING ALL);

-- Copier les enums
CREATE TYPE rfedi.status AS ENUM ('open', 'validated', 'email_sent', 'cancelled');
CREATE TYPE rfedi.coach_gender AS ENUM ('M', 'W', 'BOTH');

-- Recréer les contraintes de foreign key
ALTER TABLE rfedi.inscription_competitors
ADD CONSTRAINT inscription_competitors_inscription_id_fkey
FOREIGN KEY (inscription_id) REFERENCES rfedi.inscriptions(id) ON DELETE CASCADE;

ALTER TABLE rfedi.inscription_competitors
ADD CONSTRAINT inscription_competitors_competitor_id_fkey
FOREIGN KEY (competitor_id) REFERENCES rfedi.competitors(competitorid) ON DELETE CASCADE;

ALTER TABLE rfedi.inscription_coaches
ADD CONSTRAINT inscription_coaches_inscription_id_fkey
FOREIGN KEY (inscription_id) REFERENCES rfedi.inscriptions(id) ON DELETE CASCADE;
```

**Option B : Migration automatisée avec Drizzle**
```bash
# Créer une nouvelle migration
bun drizzle-kit generate --config=drizzle-inscriptions.ts --custom
```

### 5. 📦 Import des données compétiteurs

**Importer la liste FIS pour le nouveau pays :**

```bash
# Exemple pour l'Espagne
curl "https://api.fis-ski.com/competitors?nation=ESP" |
jq '.data[] | {listid, listname, competitorid, firstname, lastname, nationcode: "ESP", gender, birthdate, skiclub}' > esp_competitors.json

# Insérer en base via script ou API
```

### 6. 🔧 Mise à jour du code

**Mettre à jour le helper `getDbTables()` :**

```typescript
// Dans app/lib/getDbTables.ts
import { createInscriptionsSchema } from "../../drizzle/schemaInscriptionsFactory";

export const getDbTables = async (organizationCode?: string): Promise<DbTables> => {
  // Auto-detect basé sur l'user ou contexte
  const orgCode = organizationCode || await getCurrentOrganizationCode();

  switch(orgCode) {
    case 'FFS':
      return ffsSchema;
    case 'RFEDI':
      return createInscriptionsSchema('rfedi');
    default:
      throw new Error(`Unknown organization: ${orgCode}`);
  }
};
```

### 7. 🌐 Frontend - Variables hardcodées

**Remplacer les valeurs hardcodées par des valeurs dynamiques :**

Fichiers à vérifier/mettre à jour :
- `app/api/competitors/route.ts` : Remplacer `eq(competitors.nationcode, "FRA")` par valeur dynamique
- `app/inscriptions/[id]/pdf/components/RecipientManager.tsx` : Emails prédéfinis
- `app/inscriptions/[id]/pdf/components/NationalAssociationBlock.tsx` : Informations officielles
- `app/inscriptions/[id]/pdf/components/ResponsibleForEntryBlock.tsx` : Contact responsable

### 8. 🧪 Tests

**Vérifier que tout fonctionne :**

```bash
# Build
bun run build

# Tests
bun run test

# Test manuel des endpoints critiques :
# - GET /api/competitors?search=test&gender=M
# - POST /api/inscriptions
# - GET /api/config/organization
```

### 9. 🚀 Déploiement

1. **Backup de la prod** (obligatoire)
2. **Appliquer les migrations SQL**
3. **Deploy du code**
4. **Import des données compétiteurs**
5. **Tests fonctionnels**

---

## Checklist de validation

- [ ] ✅ Organisation ajoutée dans la table `organizations`
- [ ] ✅ Nouveau schema PostgreSQL créé
- [ ] ✅ Tables créées dans le nouveau schema
- [ ] ✅ Données compétiteurs importées
- [ ] ✅ `getDbTables()` mis à jour pour supporter la nouvelle organisation
- [ ] ✅ Valeurs hardcodées remplacées par des valeurs dynamiques
- [ ] ✅ Tests passent
- [ ] ✅ Build réussi
- [ ] ✅ Déployé en production
- [ ] ✅ Tests fonctionnels validés

---

## Notes importantes

- **Toujours faire un backup avant les modifications de production**
- **Tester d'abord en développement/staging**
- **Les emails de notification doivent être valides**
- **Vérifier les contraintes de foreign key après création des tables**
- **S'assurer que les données FIS sont à jour pour le nouveau pays**