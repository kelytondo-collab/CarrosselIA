#!/bin/bash
# Deploy carrossel-api to VPS
# Usage: bash deploy.sh

set -e

VPS="root@72.62.14.50"
VPS_PATH="/var/www/apps/carrossel-api"

echo "=== Compilando TypeScript ==="
cd "$(dirname "$0")"
npx tsc

echo "=== Empacotando ==="
tar czf /tmp/carrossel-api-deploy.tar.gz --exclude='node_modules' --exclude='.git' --exclude='src' .

echo "=== Criando pastas na VPS ==="
ssh $VPS "mkdir -p $VPS_PATH/data $VPS_PATH/uploads"

echo "=== Enviando para VPS ==="
scp /tmp/carrossel-api-deploy.tar.gz $VPS:/tmp/

echo "=== Descompactando na VPS ==="
ssh $VPS "cd $VPS_PATH && tar xzf /tmp/carrossel-api-deploy.tar.gz && rm /tmp/carrossel-api-deploy.tar.gz"

echo "=== Instalando dependencias ==="
ssh $VPS "cd $VPS_PATH && npm install --production"

echo "=== Configurando PM2 ==="
ssh $VPS "cd $VPS_PATH && pm2 delete carrossel-api 2>/dev/null; pm2 start dist/index.js --name carrossel-api && pm2 save"

echo "=== Verificando ==="
ssh $VPS "pm2 status carrossel-api"

echo ""
echo "=== Deploy completo! ==="
echo "Health check: curl https://carrossel-api.kellytondo.com/health"
