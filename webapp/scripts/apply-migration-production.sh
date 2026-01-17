#!/bin/bash
# Script pour appliquer la migration geminiApiKey en production
# Usage: ./scripts/apply-migration-production.sh

set -e

echo "================================================"
echo "Application de la migration geminiApiKey"
echo "================================================"
echo ""

# Vérifier que les variables sont définies
if [ -z "$VERCEL_APP_URL" ]; then
    echo "ERREUR: VERCEL_APP_URL n'est pas défini"
    echo ""
    echo "Usage:"
    echo "  export VERCEL_APP_URL='https://votre-app.vercel.app'"
    echo "  export INIT_DB_SECRET='votre-secret'"
    echo "  ./scripts/apply-migration-production.sh"
    echo ""
    exit 1
fi

if [ -z "$INIT_DB_SECRET" ]; then
    echo "ERREUR: INIT_DB_SECRET n'est pas défini"
    echo ""
    echo "Le secret doit correspondre à INIT_DB_SECRET configuré dans Vercel"
    echo "Vous pouvez le trouver dans Vercel > Settings > Environment Variables"
    echo ""
    exit 1
fi

echo "[INFO] URL de l'application: $VERCEL_APP_URL"
echo "[INFO] Application de la migration..."
echo ""

# Appeler l'endpoint de migration
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$VERCEL_APP_URL/api/db/migrate-gemini?secret=$INIT_DB_SECRET" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "[INFO] Code HTTP: $HTTP_CODE"
echo "[INFO] Réponse:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "================================================"
    echo "SUCCES: Migration appliquée avec succès"
    echo "================================================"
    exit 0
else
    echo "================================================"
    echo "ERREUR: La migration a échoué (code: $HTTP_CODE)"
    echo "================================================"
    exit 1
fi
