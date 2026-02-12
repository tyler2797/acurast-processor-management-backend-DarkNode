# 📊 Guide - Obtenir les VRAIES Stats des Téléphones

## 🔴 Situation Actuelle

Les devices visibles dans l'interface sont les **check-ins que tu as envoyés depuis ton PC**, avec des valeurs **simulées/statiques**. Ce ne sont **PAS les vraies données** des téléphones Android.

### Ce que tu vois maintenant:
```
Source:      PC (curl/toolkit)
Batterie:    ❌ Aléatoire (70-100%)
Température: ❌ Simulée (random)
Network:     ❌ Fixe (wifi + Tyler5)
Charging:    ❌ Random (true/false)
```

**Ces données ne reflètent PAS l'état réel des téléphones!**

---

## ✅ Comment Obtenir les VRAIES Stats?

### Option 1: Interface Web sur Téléphones 🌐

**Avantages:**
- ✅ Facile et rapide (2 minutes)
- ✅ Pas besoin de configuration complexe
- ✅ Fonctionne sur n'importe quel téléphone Android

**Limitations:**
- ⚠️ Température: Simulée (pas d'API web pour sensors)
- ⚠️ Nécessite navigateur ouvert pour auto check-in

**Instructions:**

1. **Sur chaque téléphone Android:**
   ```
   Ouvrir navigateur → http://192.168.1.225:8888/android-checkin.html
   ```

2. **Remplir le formulaire:**
   - Device Address: `5AndroidPhone001111111111111111111111111111` (unique)
   - SSID: `Tyler5` (pré-rempli)

3. **Envoyer check-in:**
   - Cliquer "🚀 SEND CHECK-IN"
   - Message vert si succès

4. **Activer auto check-in (optionnel):**
   - Cliquer "▶️ START AUTO CHECK-IN"
   - Envoie toutes les 60 secondes
   - Garder navigateur ouvert

**Stats obtenues:**
```
Batterie:    ✅ VRAIE (Battery API du navigateur)
Température: ⚠️  SIMULÉE (pas accessible via web)
Network:     ✅ VRAI (WiFi/Cellular detection)
Charging:    ✅ VRAI (Battery API)
```

---

### Option 2: App Acurast Native 📱

**Avantages:**
- ✅ TOUTES les stats sont réelles
- ✅ Température CPU/GPU/batterie vraies
- ✅ Pas besoin de navigateur ouvert
- ✅ Check-ins automatiques en arrière-plan

**Prérequis:**
- App Acurast installée sur les téléphones

**Instructions:**

1. **Ouvrir l'app Acurast** sur le téléphone

2. **Aller dans Settings/Configuration**

3. **Modifier les paramètres:**
   ```
   Backend URL: http://192.168.1.225:8002
   Check-in Endpoint: /processor/check-in
   Signature Mode: DISABLED
   (ou ne pas envoyer le header X-Device-Signature)
   ```

4. **Sauvegarder et redémarrer l'app**

5. **Vérifier les logs** pour confirmer check-ins

**Stats obtenues:**
```
Batterie:    ✅ VRAIE (System API)
Température: ✅ VRAIE (CPU/GPU/Battery sensors)
Network:     ✅ VRAI (NetworkInfo API)
Charging:    ✅ VRAI (BatteryManager API)
```

---

### Option 3: Script ADB depuis PC 💻

**Avantages:**
- ✅ TOUTES les stats réelles
- ✅ Contrôle depuis PC
- ✅ Bon pour tester avant déploiement

**Prérequis:**
- ADB installé sur PC: `sudo apt install adb`
- USB Debugging activé sur téléphones
- Téléphones connectés via USB

**Instructions:**

1. **Activer USB Debugging sur téléphone:**
   ```
   Settings → About phone → Tap "Build number" 7 fois
   Settings → Developer Options → USB Debugging → ON
   ```

2. **Connecter téléphone via USB au PC**

3. **Vérifier connexion:**
   ```bash
   adb devices
   ```
   Devrait afficher: `List of devices attached` + serial number

4. **Lancer le script:**
   ```bash
   cd /home/tyler/acurast-darknode-backend
   ./get-real-phone-stats.sh 5AndroidPhone001111111111111111111111111111
   ```

5. **Script va automatiquement:**
   - Lire batterie via `dumpsys battery`
   - Lire température via sensors
   - Lire réseau WiFi/Cellular
   - Envoyer check-in au backend

**Stats obtenues:**
```
Batterie:    ✅ VRAIE (dumpsys battery)
Température: ✅ VRAIE (thermal sensors)
Network:     ✅ VRAI (dumpsys wifi)
Charging:    ✅ VRAI (dumpsys battery)
```

---

## 📊 Comparaison des Options

| Feature | Interface Web | App Acurast | Script ADB |
|---------|---------------|-------------|------------|
| **Facilité** | ⭐⭐⭐⭐⭐ Très facile | ⭐⭐⭐ Moyen | ⭐⭐ Technique |
| **Batterie réelle** | ✅ Oui | ✅ Oui | ✅ Oui |
| **Température réelle** | ❌ Non | ✅ Oui | ✅ Oui |
| **Network réel** | ✅ Oui | ✅ Oui | ✅ Oui |
| **Auto check-in** | ⚠️ Browser ouvert | ✅ Background | ❌ Manuel |
| **Setup time** | 2 min | 5 min | 10 min |

---

## 🎯 Recommandation

### Pour Tests Rapides:
**→ Option 1: Interface Web** (http://192.168.1.225:8888/android-checkin.html)

### Pour Production/Long Terme:
**→ Option 2: App Acurast Native** (vraies stats complètes + background)

### Pour Debug/Développement:
**→ Option 3: Script ADB** (contrôle depuis PC)

---

## 🔍 Vérifier les Stats Réelles

Une fois les téléphones configurés, vérifier dans:

**Interface Web:**
```
http://192.168.1.225:8002/processor/web/list
```

**Monitor Script:**
```bash
cd /home/tyler/acurast-darknode-backend
./monitor-devices.sh
```

**Logs Backend:**
```bash
docker logs -f acurast-darknode-backend-app-1
```

---

## ❓ FAQ

### Q: Comment savoir si ce sont les vraies stats?

**A:** Compare les valeurs:
- **Stats simulées**: Batterie toujours autour de 80-90%, températures fixes
- **Vraies stats**: Batterie varie selon usage réel, températures changent

### Q: Puis-je mélanger options (web + app)?

**A:** Oui! Chaque device peut utiliser sa propre méthode. Utilise juste des Device Addresses différentes.

### Q: Les températures sont importantes?

**A:** Oui pour monitoring intensif. Si tu veux juste voir si les téléphones sont connectés, l'interface web suffit.

### Q: Auto check-in fonctionne en arrière-plan?

**A:**
- Interface web: ❌ Nécessite navigateur ouvert
- App Acurast: ✅ Fonctionne en background

---

## 📞 Support

**Problème: Interface web ne détecte pas batterie**
- Solution: Utiliser HTTPS (ou localhost) pour Battery API
- Alternative: Utiliser app Acurast native

**Problème: ADB "device unauthorized"**
- Solution: Accepter le prompt "Allow USB debugging" sur téléphone
- Relancer: `adb kill-server && adb start-server`

**Problème: App Acurast ne se connecte pas**
- Vérifier URL: `http://192.168.1.225:8002` (pas https)
- Vérifier WiFi: Téléphone sur Tyler5
- Vérifier logs: `docker logs acurast-darknode-backend-app-1`

---

✅ **Maintenant tu sais comment obtenir les VRAIES stats des téléphones!**

Choisis l'option qui te convient et configure les téléphones. 🚀
