# 📱 Configuration Android Phones - Check-in Sans Signature

## ✅ Backend Status

- **Backend URL**: `http://192.168.1.225:8002`
- **Mode**: Bypass signature (DEV MODE - aucune signature requise)
- **WiFi**: Tyler5
- **Status**: ✅ Opérationnel et testé

---

## 🚀 Méthode 1: Interface Web (RECOMMANDÉE)

### Sur chaque Android phone:

1. **Ouvrir le navigateur** (Chrome, Firefox, etc.)

2. **Aller à l'URL**:
   ```
   http://192.168.1.225:8888/android-checkin.html
   ```

3. **Remplir les champs**:
   - **Backend URL**: `http://192.168.1.225:8002` (pré-rempli)
   - **Device Address**: Générer ou utiliser une adresse SS58 unique
     - Format: `5XXX...` (51 caractères)
     - Exemple: `5AndroidPhone001111111111111111111111111111`
   - **WiFi SSID**: `Tyler5` (pré-rempli)

4. **Cliquer sur "🚀 SEND CHECK-IN"**
   - ✅ Si succès: Message vert "✅ Check-in SUCCESS"
   - ❌ Si erreur: Message rouge avec détails

5. **Activer auto check-in** (optionnel):
   - Cliquer sur "▶️ START AUTO CHECK-IN"
   - Envoie automatiquement toutes les 60 secondes
   - Laisser le navigateur ouvert en arrière-plan

---

## 📋 Méthode 2: App Acurast (si installée)

### Configuration dans l'app:

1. **Ouvrir l'app Acurast**

2. **Aller dans Settings/Configuration**

3. **Modifier les paramètres**:
   ```
   Backend URL: http://192.168.1.225:8002
   Check-in Endpoint: /processor/check-in
   Signature Mode: DISABLED (ou ne pas envoyer X-Device-Signature header)
   ```

4. **Sauvegarder et redémarrer l'app**

5. **Vérifier les logs** pour voir si check-ins sont envoyés

---

## 🔍 Vérification des Check-ins

### Depuis n'importe quel navigateur:

1. **Interface Web**:
   ```
   http://192.168.1.225:8002/processor/web/list
   ```
   - Liste tous les devices enregistrés
   - Affiche battery, network, timestamp

2. **API Status**:
   ```
   http://192.168.1.225:8002/processor/api/status
   ```
   - JSON avec tous les statuses

3. **Logs Backend** (depuis terminal):
   ```bash
   docker logs -f acurast-darknode-backend-app-1
   ```
   - Voir les check-ins en temps réel

---

## 📱 Générer des Device Addresses Uniques

### Option A: Utiliser un pattern simple
```
Device 1: 5AndroidPhone001111111111111111111111111111
Device 2: 5AndroidPhone002222222222222222222222222222
Device 3: 5AndroidPhone003333333333333333333333333333
...
```

### Option B: Générer avec acurast-toolkit.js (depuis PC)
```bash
cd /home/tyler/acurast-darknode-backend
node acurast-toolkit.js generate 10
```
- Génère 10 keypairs avec addresses SS58 valides
- Noter les addresses et les assigner aux phones
- Sauvegarder le fichier JSON généré

---

## 🔧 Troubleshooting

### ❌ "Network Error" dans l'interface web

**Solution:**
- Vérifier que le phone est sur WiFi Tyler5
- Vérifier que le phone peut ping `192.168.1.225`:
  ```
  ping 192.168.1.225
  ```
- Vérifier firewall sur le PC backend

### ❌ Check-in rejected (HTTP 403)

**Solution:**
- Whitelist est peut-être activée
- Vérifier `.env`:
  ```
  PROCESSOR_WHITELIST=""  # Doit être vide
  ```

### ❌ Check-in rejected (HTTP 401)

**Solution:**
- Signature verification est activée
- S'assurer que le header `X-Device-Signature` n'est PAS envoyé
- Vérifier logs backend pour voir "[DEBUG] No signature provided - SKIPPING VERIFICATION"

### ✅ Check-in accepted mais device invisible

**Solution:**
- Check-in est accepté et enregistré dans DB
- Problem d'affichage dans l'interface (processorAddress null)
- Vérifier avec API:
  ```
  curl http://192.168.1.225:8002/processor/api/status
  ```

---

## 📊 Format du Check-in Request

### Body JSON (envoyé sans signature):
```json
{
  "deviceAddress": "5AndroidPhone001111111111111111111111111111",
  "platform": 0,
  "timestamp": 1770882835,
  "batteryLevel": 85.5,
  "isCharging": false,
  "batteryHealth": "good",
  "temperatures": {
    "battery": 30.0,
    "cpu": 42.0,
    "gpu": 38.5,
    "ambient": 24.0
  },
  "networkType": "wifi",
  "ssid": "Tyler5"
}
```

### Headers:
```
Content-Type: application/json
(PAS de X-Device-Signature header)
```

---

## 🎯 Quick Test avec curl (depuis PC)

```bash
curl -X POST http://192.168.1.225:8002/processor/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "deviceAddress": "5TestDevice12345678901234567890123456789012",
    "platform": 0,
    "timestamp": '$(date +%s)',
    "batteryLevel": 88.0,
    "isCharging": false,
    "batteryHealth": "good",
    "temperatures": {
      "battery": 28.0,
      "cpu": 40.0,
      "gpu": 37.0,
      "ambient": 23.0
    },
    "networkType": "wifi",
    "ssid": "Tyler5"
  }'
```

**Expected response:**
```json
{"success":true,"refreshIntervalInSeconds":60}
```

---

## ⚠️ Important Notes

1. **Mode DEV uniquement**: Le bypass signature est ACTIF seulement en mode DEV
   - Ne PAS utiliser en production
   - Réactiver signature verification après tests

2. **Device Addresses**: Doivent être uniques par device
   - Format SS58 valide recommandé
   - Sinon, pattern simple avec prefix identifiable

3. **Batterie**: L'interface web détecte automatiquement la batterie du phone
   - Nécessite HTTPS ou localhost pour Battery API
   - Sinon, valeurs simulées

4. **Auto check-in**: Si activé dans l'interface web
   - Garder le navigateur ouvert
   - Ne pas mettre le phone en veille profonde (désactiver économie d'énergie)

---

## 📞 Support

Si problèmes persistent:
1. Vérifier logs backend: `docker logs acurast-darknode-backend-app-1`
2. Vérifier connectivity: `ping 192.168.1.225` depuis phone
3. Tester avec curl depuis PC d'abord
4. Vérifier que backend est bien sur port 8002 (pas 9001)

---

✅ **Backend ready** - Les devices peuvent maintenant s'enregistrer sans signature!
